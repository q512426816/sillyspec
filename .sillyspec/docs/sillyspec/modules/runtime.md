---
schema_version: 1
doc_type: module-card
module_id: runtime
author: qinyi
created_at: 2026-06-03T07:42:00+08:00
updated_at: 2026-08-09T15:10:00+08:00
---
# runtime

## 定位

SQLite 数据库层 + 进度管理 + 迁移。提供 `.sillyspec/.runtime/sillyspec.db` 作为权威状态源，管理项目、变更（change）、阶段（stage）、步骤（step）的全生命周期。不负责 CLI 解析、命令分发或阶段执行逻辑。

## 契约摘要

- **DB** (`src/db.js`) — 基于 better-sqlite3 的原生 SQLite 绑定（同步 API），提供 `init()` / `transaction()` / `getDb()` / `close()`；`init()` 设 PRAGMA（journal_mode=WAL + busy_timeout=5000 + foreign_keys=ON + synchronous=NORMAL），主库→`.bak`→全新 逐级回退（`_openWithFallback`）；打开即持久化，事务提交直接落盘主库（WAL 侧车 `.db-wal`/`.db-shm`），无旧 WASM 引擎的「全库 load 到内存 → 序列化写回」模型，接口无 `query()` / `_save()`（progress.js 经 `getDb()` 拿原生实例直接 `prepare/run`）
- **ProgressManager** (`src/progress.js`) — 进度读写入口，通过 DB 实例操作 `project / changes / stages / steps / batch_progress / approvals` 六张表；核心读写方法已同步化（`read`/`_write` 等不再 async），`read()` 每次经 `getDb()` 直查 DB 取最新不缓存快照；支持 `read()` / `init()` / `initChange()` / `show()` / `validate()` / `reset()` / `_updatePlatformLastSync()` / `_updateApprovalStatus()` / `alignExecuteToPlan()` 等方法

### ProgressManager 对齐相关方法

| 方法 | 说明 | 参数 |
|------|------|------|
| `readPlanCheckboxStatus(changeDir)` | 只读解析 `plan.md`（回退 `tasks.md`）的 task checkbox 统计；仅匹配 `- [ ] task-NN` / `- [x] task-NN`（task- 前缀锚定，避免误捞非任务项）；返回 `{ total, checked }`（无文件返回 `{0,0}`） | `changeDir`（变更目录绝对路径） |
| `async alignExecuteToPlan(cwd, changeName, specBase, opts={})` | 按 `plan.md` 声明对齐 execute 阶段派生进度戳。仅当 `plan.md` 所有 task checkbox 全勾时，把 execute 阶段所有非 completed step 标 completed，**并显式置 `execute stageData.status='completed' + completedAt`**（绕过 `completeStep` 推导，D-003@v2），`pm._write` 落盘。信任声明、不复核代码（与 archive 同源，verify 兜底）。无 progress / 无 execute 阶段 / `plan.md` 无 checkbox / 未全勾 → `{ok:false, reason}`。`opts.confirm=false`（默认）只 dry-run 报告。返回 `{ ok, aligned, skipped, planTotal, planChecked, reason?, dryRun? }` | `cwd, changeName, specBase, { confirm? }` |
- **migrateDocs** (`src/migrate.js`) — 一次性迁移工具，将旧结构（`codebase/`、`specs/`、`changes/archive/`）迁移到统一的 `docs/<project>/` 布局（`scan/`、`archive/` 等）

## 关键逻辑

```
DB.init()
  → better-sqlite3 同步打开/创建库（主库 → .bak → 全新 逐级回退，_openWithFallback）
  → 设 PRAGMA (journal_mode=WAL, busy_timeout=5000, foreign_keys=ON, synchronous=NORMAL)
  → schema 版本戳（.db.schema-version）匹配则跳过建表，否则 _createSchema 落盘 DDL（project/changes/stages/steps/batch_progress/approvals + 索引 + 幂等 ALTER 加列）

DB.transaction(fn)
  → better-sqlite3 db.transaction(fn) 包装：调用即 BEGIN/COMMIT，fn 抛错自动 ROLLBACK 不吞错
  → 提交即持久化（写主库 + WAL 侧车），无旧 WASM 引擎的全库 export / _save
  → SQLITE_BUSY 应用层有限重试（MAX_BUSY_RETRIES=3，退避 50/100/200ms），达上限 fail-loud

ProgressManager.read(cwd, changeName?)
  → 经 getDb() 拿原生 better-sqlite3 实例 prepare/get 直查最新（不缓存快照）
  → 合并指定变更的 stages + steps 状态 + activeChanges 列表

ProgressManager._write(cwd, progress, changeName)
  → 写入 stages / steps / changes.current_stage（经 DB.transaction 批量提交）
  → 阶段状态缓存文件双源已废（task-10）：execute/quick 阶段判定由 hook 直读 DB current_stage 完成
  → 辅助阶段完成后由 run.js 清空 currentStage

ProgressManager.alignExecuteToPlan(cwd, changeName, specBase, {confirm})
  → read(cwd, changeName) 取 execute stage + steps；无数据则拒绝
  → readPlanCheckboxStatus(changeDir) → {total, checked}；未全勾则拒绝（信任声明、verify 兜底）
  → 全勾：把 status≠completed 的 step 改 {status:'completed', completedAt} + 显式置 stageData.status='completed'
  → confirm=false：只返回将补的 aligned/skipped 计数（dry-run）；confirm=true：pm._write 落盘
  → 入口：sillyspec doctor --align-execute-progress [--confirm] [--change <name>]（index.js doctor flag 分支）
```

## 注意事项

- 阶段完成原子性（2026-08-09-complete-gate-atomicity）：阶段完成 persist（`pm._write`+`triggerSync`）从 `completeStageGates` 调用前移到成功返回后（`complete.js` completeStep/continueStep + `stage.js` noAI 末步三处），消除"persist completed → 跑 gate 崩溃"窗口（DB 不留假 completed，gate 异常/失败 → `rollbackCompletionAndReturn` 回 in-progress 落盘）；`completeStageGates`(`gates.js:549`) 收尾段整体 try/catch，任一段抛非结构化异常 → catch → `rollbackCompletionAndReturn` 不冒顶 exit 1，`handleExecuteWorktreeCleanup` 在 try 外（副作用独立）。接口签名不变，仅收紧阶段完成状态机原子性。
- better-sqlite3 是原生绑定，事务提交即持久化（WAL），无旧 WASM 引擎的全库 export 开销；旧「纯内存 + 每次 _save 全量序列化」模型已废
- PRAGMA（WAL/busy_timeout/foreign_keys）在 `init()` 设一次持续生效，无旧 WASM 引擎 export 重置问题；`close()` 自动 WAL checkpoint 合并 -wal/-shm 回主库
- `batch_progress` 和 `approvals` 表按 `change_id` UNIQUE，每个变更只能有一条记录
- 历史迁移：v1/v2 使用 `progress.json` 文件，v3 全部迁移至 SQLite（`CURRENT_VERSION = 3`）
- `db.js` DDL 默认 schema_version 仍是 4，但 `progress.js` 当前写入版本是 3；文档不要把 runtime 称为稳定 v4 schema
- `migrateDocs` 是一次性脚本，不会幂等运行；已存在的文件会被跳过
- **stage review gate marker 缺失自生**（坑1，`run/gates.js:276`）：tier=independent 且 `getLatestStageReviewRunId` 返回空时（execute 批量完成跳过 prompt 渲染等），gate 自身调 `generateStageReviewRunId()` + `stageReviewMarkerPath()` 写盘 + `mkdirSync`——错误路径从 `execute-null`（不可执行）变为 `execute-review-<id>`（可执行）。补充 prompt 渲染时落 marker（gap 6）的兜底：prompt 路径未走到时 gate 路径自生，marker 文件名/位置不变
- **archive CLI 下沉 git add**（坑4，`run/complete-handlers.js:137`）：`unregisterChange` 后 CLI 确定性 `safeGit add -- .sillyspec/changes/archive/ + .sillyspec/docs/`，不靠 archive step5 prompt 驱动（step5 prompt 的 git add 保留作幂等兜底）；safeGit 失败不阻断归档（目录已移动 + change 已注销）
- **`.runtime` 根解析统一 `resolveRuntimeRoot`**（坑 execute-runs-isolation，`run/shared.js`）：`.runtime` 根（含 `sillyspec.db` / execute-runs / stage-reviews / quick-sessions）由 `resolveRuntimeRoot(platformOpts, localSpecBase)` 统一解析，三级优先级 `platformOpts.runtimeRoot`（平台）> `platformOpts.specDriftAnchor`（drift 锚点）> `localSpecBase/.runtime`（本地兜底）。drift 守卫（`run/command.js`）命中时设 `specDriftAnchor = 主仓 specBase`（**不**设 `specRoot`/`runtimeRoot`——否则触发平台 sentinel，误跳 `triggerSync`/`checkApproval`、误进平台渲染分支）→ 下游 15 处站点解析落主仓 `.runtime`，execute-runs / stage-reviews 不随 worktree cleanup 整目录删消失，archive step1 完成度 gate 真相源（磁盘主仓 review.json）不再丢

- **--done 前非阻断并发预检 advisory**（`run/complete-handlers.js` quick 钩子 + `run/gates.js` execute 钩子 + `run/concurrent-detect.js`）：quick --done（`auditQuickCompletion` 后）与 execute --done（`completeStageGates` 入口 guard `stageName==='execute'`）完成前调 `detectConcurrentChanges()`（复用 `isQuickMetadata` 分类）扫工作树他者脏文件 + 他者活跃 change 目录，命中则 `console.warn` 多行 ⚠️（foreignFiles + otherActiveChanges + pathspec 提示），**绝不阻断**——不改 audit `result.status` / gate 通过性 / `isQuickMetadata` 语义（fail-open：`git status` 不可读时 `hasForeign=false` 不崩）。ownFiles 排除自身：quick=`review.changedFiles∪baselineFiles`，execute=design §6 交付文件（in-place 模式）或 `[]`（worktree 模式）
- **safeGit 收口 src/git-helper.js**（2026-08-09-worktree-git-injection）：`run/shared.js` 原 safeGit 实现已移入根级 src/git-helper.js 作统一公共 git 调用入口（safeGit+git+gitQuiet，execFileSync 数组形式不经 shell），与 worktree 链共用消除口径分裂（原 safeGit vs worktree 本地 git/gitQuiet 双源）；run/shared.js 改 `import { safeGit } from '../git-helper.js'` + `export { safeGit }` 两段式（注：纯 `export { safeGit } from '...'` 不建本地词法绑定，内部 ancestorSpecDirs/auditQuickCompletion 等调用会 ReferenceError，故用 import+export 而非纯 re-export）；run/ 层调用方路径与行为不变

## 人工备注
<!-- MANUAL_NOTES_START -->
- ql-20260604-001-7a4c | 补齐平台 sync 时间与审批状态的本地写入方法，并记录 quick/archive gate 清理行为。
- ql-20260803-001-9c4e | 修 reopen --done 步骤状态不同步：complete.js 阶段完成分支回填 stale→completed，completeStage SQL 扩到 IN('pending','stale')。
- ql-20260804-003-e439 | _getNextSuggestion 遍历跳过 scan 且 upstream 排除 scan（根因修 plan→scan 回头路，prompt-control-debt plan-c）+ quicklog flipEntryInContent 单行四字段归一为多行（quick-①）。
- ql-20260804-004-3a24 | quicklog 单行四字段归一改 splitSingleLineFields 双级扫描（字段边界严格扫描 + 顺序扫描兜底）：字段正文引用标签字样（「结果：」/正则内嵌四标签）不再被 split 任意位置误断行（quick-① 残留补丁）。
- ql-20260809-001-4846 | alignExecuteToPlan 去 async 残留彻底同步化（修复 doctor align 调用方 index.js:532 未 await 致 r.ok 恒 undefined、失败也误打印「已对齐」的逻辑 bug）+ 清 src/ 5 处 gate-status 活引用注释（fs-atomic/machine-interface×2/run/gates/index）。
<!-- MANUAL_NOTES_END -->
