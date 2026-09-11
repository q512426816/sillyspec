---
schema_version: 1
doc_type: module-card
module_id: runtime
author: qinyi
created_at: 2026-06-03T07:42:00+08:00
updated_at: 2026-09-11T10:30:00+08:00
---
# runtime

## 定位

SQLite 数据库层 + 进度管理 + 迁移。提供 `.sillyspec/.runtime/sillyspec.db` 作为权威状态源，管理项目、变更（change）、阶段（stage）、步骤（step）的全生命周期。不负责 CLI 解析、命令分发或阶段执行逻辑。

**附属纯函数模块 `src/facade-hint.js`**（2026-08-28 ql-20260828-004，坑 plan-facade-files-manual-backfill）：plan 完成门的「透传必经文件」候选预检（advisory，run/gates.js 接线）——以 apply Gate1 同源 allowed 集为基准，静态扫仓内 py/js/ts/java 的 import/require，亮 direct import / 同目录聚合 ≥2 两类候选，提示补 allowed_paths/design §6，防 execute 期撞 Gate1 手工回补；性能护栏（allowed > 100 或源码 > 5000 静默跳过）。

## 契约摘要

- **DB** (`src/db.js`) — 基于 Node.js 内置 `node:sqlite`（`DatabaseSync`，同步 API）经 `src/db-engine.js` 抽象层（方案 B，封装 DatabaseSync + 3 缺口 shim：pragma→exec / transaction→手写 SAVEPOINT / pluck→helper）绑定，提供 `init()` / `transaction()` / `getDb()` / `close()`；`init()` 经 `applyPragmas` 设 PRAGMA（journal_mode=WAL + busy_timeout=5000 + foreign_keys=ON + synchronous=NORMAL），主库→`.bak`→全新 逐级回退（`_openWithFallback`）；主库分支 tryOpen 撞并发 CHECKPOINT 瞬时失败时有限重试（复用 MAX_BUSY_RETRIES 递增退避，真损坏重试不过仍回落退/fail-loud，防吞进度语义零回归）；打开即持久化，事务提交直接落盘主库（WAL 侧车 `.db-wal`/`.db-shm`），无旧 WASM 引擎的「全库 load 到内存 → 序列化写回」模型，接口无 `query()` / `_save()`（progress.js 经 `getDb()` 拿原生 DatabaseSync 实例直接 `prepare/run`）
- **ProgressManager** (`src/progress.js`) — 进度读写入口，通过 DB 实例操作 `project / changes / stages / steps / batch_progress / approvals` 六张表；核心读写方法已同步化（`read`/`_write` 等不再 async），`read()` 每次经 `getDb()` 直查 DB 取最新不缓存快照；支持 `read()` / `init()` / `initChange()` / `show()` / `validate()` / `reset()` / `_updatePlatformLastSync()` / `_updateApprovalStatus()` / `alignExecuteToPlan()` 等方法
- **MultiRepoContext** (`src/run/multi-repo-context.js`) — 跨仓 task 支持的运行时多仓执行上下文（2026-08-12 新增）。进程级内存对象（随 CLI 进程生死，不入库不持久化，无状态机），`Map<repoKey, RepoEntry{repoKey,gitDir,worktreePath,projectRoot,isMain,resolveHead(),resolveBase(taskBaseCommit?)}>`。execute 启动由 `shared.js:getOrCreateMultiRepoContext` 构造一次贯穿 execute/apply/verify（D-013 G2），收口 7 单仓假设点（task-review/worktree-apply/verify-postcheck/gates/execute/index/machine-interface/complete 经 `ctx.resolve(repo)` 取 gitDir/base/head/projectRoot）。约束② fail-closed（未注册 repo / 跨仓 git 不可用抛错阻断 execute，不降级）。单仓 change 退化为 `{main:{...}}` 单值 map 零回归。head 经 resolveHead 实时 git rev-parse（不缓存）；task review 的 base/head 用 task 卡 base_commit/head_commit 双锡点（非 resolveHead）。declaredRepos 聚合双源：plan.md 内联 frontmatter 块 + tasks/task-NN.md 独立卡片（`collectTaskCardReposFallback` 兜底扫，坑7——plan.md 只留 checkbox 时跨仓仓仍注册进 ctx，不再误报 review 疑似伪造）

- **quick-audit.js**（`src/run/quick-audit.js`，W6 Step2 从 run.js 抽出）— quick 审计结论打印 + quick 多变更关联选择（resolveQuickLinkedChanges 动态 import quick-recommend.js 打分 + safeGit 脏文件信号，交互式 checkbox 默认勾选关联目标）+ **quick --done test+lint 硬门禁**（runQuickTestLintGate/printQuickTestLintGate，2026-09-02 P0-2：changedFiles 触及 src/test 才实测 local.yaml commands.test/lint（动态 import verify-postcheck，不进通用启动路径），未配置/doc-only/brownfield 自动跳过，fail 阻断 --done，env 逃生门 SILLYSPEC_QUICK_TEST_GATE=skip）
- **scan-profile.js**（`src/run/scan-profile.js`，W6 Step2 从 run.js 抽出）— scan profile 数据生成 + quick scan CLI preflight/postcheck（executeScanPostcheck 动态 import scan-postcheck.js 做 CLI 确定性校验，不依赖 agent 自检报告）
- **quick-recommend.js**（`src/quick-recommend.js`，根级文件归 runtime）— quick 阶段多变更关联推荐打分：「脏文件 + 任务描述」双信号推测当前 quick 改动最可能归属哪些活跃变更，供交互式多选默认勾选；纯函数 + 只读文件系统无副作用
- **friction-tally.js**（`src/friction-tally.js`，根级文件归 runtime，friction-signal-hint Phase 1）— 摩擦信号计数数据层：gate 失败回滚（rollbackCompletionAndReturn）/ verify test·lint 实测失败 / 审查打回三类摩擦事件计数（events 按 type 记 count/lastAt + history 截尾 20 条），quick/verify --done 收尾 `consumeFrictionHint` 计数非零才输出一行 advisory（提示后删计数文件清零，全零零输出、每次收尾最多一行）；落点红线（D-002）——计数文件只落 .runtime 树（quick 会话 `quick-sessions/<sessionId>/friction-tally.json`、真实变更 `<runtimeRoot>/friction-tally-<changeName>.json`，路径统一走 resolveRuntimeRoot/resolveQuickSessionsDir），永不落 changes/（目录上平台同步，本机计数污染他机即事故）；隐私红线（D-005）——落盘字段只含 count/lastAt/at/type/detail（type ∈ 三值枚举、detail ∈ 预定义标签集），永不接触提示词与对话原文；local.yaml `friction_hint.enabled` 默认 true（仅显式 false 关，缺键/读失败同默认开）；读写全程 try/catch 静默降级返回 null/空 hint，绝不反向阻断收尾（同 verify-lint-tally「计数器不许反向阻断」立场）

### ProgressManager 对齐相关方法

| 方法 | 说明 | 参数 |
|------|------|------|
| `readPlanCheckboxStatus(changeDir)` | 只读解析 `plan.md`（回退 `tasks.md`）的 task checkbox 统计；仅匹配 `- [ ] task-NN` / `- [x] task-NN`（task- 前缀锚定，避免误捞非任务项）；返回 `{ total, checked }`（无文件返回 `{0,0}`） | `changeDir`（变更目录绝对路径） |
| `async alignExecuteToPlan(cwd, changeName, specBase, opts={})` | 按 `plan.md` 声明对齐 execute 阶段派生进度戳。仅当 `plan.md` 所有 task checkbox 全勾时，把 execute 阶段所有非 completed step 标 completed，**并显式置 `execute stageData.status='completed' + completedAt`**（绕过 `completeStep` 推导，D-003@v2），`pm._write` 落盘。信任声明、不复核代码（与 archive 同源，verify 兜底）。无 progress / 无 execute 阶段 / `plan.md` 无 checkbox / 未全勾 → `{ok:false, reason}`。`opts.confirm=false`（默认）只 dry-run 报告。返回 `{ ok, aligned, skipped, planTotal, planChecked, reason?, dryRun? }` | `cwd, changeName, specBase, { confirm? }` |
- **migrateDocs** (`src/migrate.js`) — 一次性迁移工具，将旧结构（`codebase/`、`specs/`、`changes/archive/`）迁移到统一的 `docs/<project>/` 布局（`scan/`、`archive/` 等）

## 关键逻辑

```
DB.init()
  → node:sqlite DatabaseSync 同步打开/创建库（经 db-engine.openDatabase，主库 → .bak → 全新 逐级回退，_openWithFallback；主库 tryOpen 失败先有限重试消化并发 CHECKPOINT 竞争，再走 .bak）
  → 经 applyPragmas 设 PRAGMA (journal_mode=WAL, busy_timeout=5000, foreign_keys=ON, synchronous=NORMAL)
  → schema 版本戳（.db.schema-version）匹配则跳过建表，否则 _createSchema 落盘 DDL（project/changes/stages/steps/batch_progress/approvals + 索引 + 幂等 ALTER 加列）

DB.transaction(fn)
  → runTransaction(fn)（db-engine）手写 SAVEPOINT/RELEASE/ROLLBACK TO：fn 抛错自动回滚不吞错，嵌套调用自动形成 savepoint 栈
  → 提交即持久化（写主库 + WAL 侧车），无旧 WASM 引擎的全库 export / _save
  → SQLITE_BUSY 应用层有限重试（MAX_BUSY_RETRIES=3，退避 50/100/200ms；node:sqlite 错误码字段为 errcode=5 / code='ERR_SQLITE_ERROR' / message 含 'database is locked'），达上限 fail-loud

ProgressManager.read(cwd, changeName?)
  → 经 getDb() 拿原生 node:sqlite DatabaseSync 实例 prepare/get 直查最新（不缓存快照）
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

- 阶段完成原子性（2026-08-09-complete-gate-atomicity）：阶段完成 persist（`pm._write`+`triggerSync`）从 `completeStageGates` 调用前移到成功返回后（`complete.js` completeStep/continueStep + `stage.js` noAI 末步三处），消除"persist completed → 跑 gate 崩溃"窗口（DB 不留假 completed，gate 异常/失败 → `rollbackCompletionAndReturn` 回 in-progress 落盘）；`completeStageGates`(`run/gates.js:511`) 收尾段整体 try/catch，任一段抛非结构化异常 → catch → `rollbackCompletionAndReturn` 不冒顶 exit 1，`handleExecuteWorktreeCleanup` 在 try 外（副作用独立）。接口签名不变，仅收紧阶段完成状态机原子性。
- noAI 步骤 --done 硬门（2026-08-14 noai-done-bypass，ql-20260814-005-9fdd）：`completeStep`（`complete.js`）标记步骤 completed 前检测 `currentStepDef.noAI`——--done 落到 noAI step（planPostcheck/scanPreflight/scanPostcheck）时同样执行对应 `_cliAction` 的 CLI 确定性校验（分支对齐 `stage.js` 的 noAI 自动执行），校验 throw 则步骤保持 pending 不推进。此前 noAI 校验只在 `run <stage>` 推进路径自动执行，agent 对 noAI step 直接 `--done` 会静默标 completed 绕过校验（实证：multi-agent-platform `2026-08-13-spec-sync-visibility` tasks/ 从未生成但 plan 阶段 completed）。
- **noAI 步骤未知 cliAction fail-fast**（ql-20260819-012-66fc）：`stage.js`/`complete.js` 在 scanPreflight/scanPostcheck/planPostcheck 分支后加 `else throw`，防止新类型未注册时静默 completed。
- **change title 任意步骤持久化点刷新**（2026-08-19，ql-20260819-011-119b，`complete.js`）：`refreshChangeTitleFromArtifacts(pm, cwd, specBase, changeName)` 公共 helper（`deriveTitleFromLinkedChange` 提取 proposal/design 首个 `#` 标题中文描述 + `quick-<hex>` 守卫 + 失败静默），挂在四个持久化点——completeStep 单步完成分支、completeStep 阶段完成分支、continueStep wait 解除点、continueStep 阶段完成分支。此前只在阶段完成分支刷新，brainstorm 中途（step6 design.md 已落盘、step7/8 未完）`changes.title` 一直是启动时 `initChange` 的英文 autoName 兜底；现在单步 `--done` 即刷新为中文标题。
- node:sqlite（DatabaseSync，经 db-engine 抽象）是 Node.js 内置原生绑定，事务提交即持久化（WAL），无旧 WASM 引擎的全库 export 开销；旧「纯内存 + 每次 _save 全量序列化」模型已废；node:sqlite 仍发 ExperimentalWarning（v22.13+ 无需 --experimental-sqlite flag），engines.node >=22.13.0
- PRAGMA（WAL/busy_timeout/foreign_keys）在 `init()` 设一次持续生效，无旧 WASM 引擎 export 重置问题；`close()` 自动 WAL checkpoint 合并 -wal/-shm 回主库
- `batch_progress` 和 `approvals` 表按 `change_id` UNIQUE，每个变更只能有一条记录
- 历史迁移：v1/v2 使用 `progress.json` 文件，v3 全部迁移至 SQLite（`CURRENT_VERSION = 3`）
- `db.js` DDL `project.schema_version DEFAULT`、`DB_SCHEMA_VERSION`、`shared.js CURRENT_VERSION`、`progress._version` 四处 schema 版本应一致（当前 v5，title/quicklog_id 列）；改动加表/列/migration 时同步 bump 四处 + 测试断言
- `migrateDocs` 是一次性脚本，不会幂等运行；已存在的文件会被跳过
- **stage review gate marker 缺失自生**（坑1，`run/gates.js:241`）：tier=independent 且 `getLatestStageReviewRunId` 返回空时（execute 批量完成跳过 prompt 渲染等），gate 自身调 `generateStageReviewRunId()` + `stageReviewMarkerPath()` 写盘 + `mkdirSync`——错误路径从 `execute-null`（不可执行）变为 `execute-review-<id>`（可执行）。补充 prompt 渲染时落 marker（gap 6）的兜底：prompt 路径未走到时 gate 路径自生，marker 文件名/位置不变
- **brainstorm/verify 双占位符注入（fail-soft）**（2026-08-23-adopt-harness-practices，`src/run/prompt.js:429-464`）：brainstorm Step2 的 {DECISION_HITS} ← matchKnowledge decisionHits——命中 rejected 条目渲染「否决决策提示」段（ID/标题/否决理由/复潮条件），无命中替换空串零输出（不留残留占位符）；注入结果同步落 runtime JSON（.runtime/decision-hits.json，与 KNOWLEDGE_HIT_REPORT 落盘同口径）；advisory 展示不改步骤流程，异常单行说明不抛（全降级）。
  verify「运行测试和质量扫描」步的 {EVIDENCE_AUTO_RECOMMENDATION}（`src/run/prompt.js:719-746`）← resolveTestStrategy 的 evidence_auto_recommendation.summary 渲染进 step prompt——verify-postcheck 在 --done 事后才解析 evidence-auto，agent 写 verify-result.md 时看不到推荐无从否决，故在 prompt 时点注入（含推荐理由、降级注记与「可在 verify-result.md 否决并改跑全量」路径，FR-11）；同样 fail-soft（注入失败给读 local.yaml 确认 test_strategy 的指引，--done 仍按 resolveTestStrategy 实测对账）。
- **archive CLI 下沉 git add**（坑4，`run/complete-handlers.js:410`）：`unregisterChange` 后 CLI 确定性 `safeGit add -- .sillyspec/changes/archive/ + .sillyspec/docs/`，不靠 archive step5 prompt 驱动（step5 prompt 的 git add 保留作幂等兜底）；safeGit 失败不阻断归档（目录已移动 + change 已注销）
- **execute run marker 写入原子化 + 分层 fail**（2026-08-16-state-split-fixes #1，D-001@v1）：四处 marker 写入点（`run/stage.js` 主点 + `run/gates.js`/`run/prompt.js`/`task-review.js` 补写点）统一「mkdir `execute-runs/<runId>/tasks` 先于 marker」不变量——目录不再只随 review.json 写入创建，消除「有 marker 无目录」空 run 被 archive 完成度扫描误用。分层失败语义：stage 主点 throw（execute 启动 exit 1 + 修复指引）；gates 补写点异常直穿外层 catch fail-closed；prompt 渲染路径降级（console.error 留痕 + runId 仍注入）；task-review 去静默保 fail-open。测试 execute-run-dir-fail-loud.test.mjs（33 断言）。runId 同秒碰撞根治（2026-09-10 驾驭小结①，坑 exec-run-id-same-second-collision）：四处写入点在 mkdir 前先经 `claimExecuteRunId`（task-review.js，非递归 mkdir 排他认领，碰撞换随机短后缀）——并行会话（不同 change）同秒启动 execute 不再生成同一 runId 共享 run 目录互相覆盖 per-task review.json；分层 fail 语义不变。第三批①再加固：generateExecuteRunId 携 changeName 附 6 位 FNV 哈希段（exec-…-<hash>）——不同变更 runId 结构性不同，五处 generate 写入点全部传 changeName。第十二批：noAI 质量扫描步（executeVerifyQualityScan，verify 第一实测执行点）补接同款快照（第八批只接 gates.js verify 块——用户第三次撞上的真实来源）；两处 fallback 主仓时若非 .sillyspec 脏文件在场打 ⚠️ 口径可见提示（warnIfMainRepoDirtyForGate）。第八批：verify 实测门同款隔离（createVerifyGateSnapshot——resolveVerifyChangedFiles 变更文件集 + native worktree 时 overlay 源=worktree 根（--worktree 定向跑等价）+ 他者显式声明剔除 + 变更文档/local.yaml 随快照；gates.js verify 块 test/lint 快照内跑，fallback 主仓 + lint 阻断补污染归属提示，SILLYSPEC_VERIFY_GATE_SNAPSHOT_OFF 可关）。第六批：quick --done test+lint 门禁隔离快照（run/gate-snapshot.js createGateSnapshot——HEAD worktree + 会话文件 overlay + node_modules junction + local.yaml 复制，并行会话脏文件不参与本会话门禁判定；基建失败 fallback 主仓现行为；SILLYSPEC_QUICK_GATE_SNAPSHOT_OFF 可关）；taskcard --all 平台产物镜像主仓（mirrorPlatformArtifactToMainRepo 增 ensureParentDir——tasks/ 子目录在 changeDir 存在时自动建，index.js taskcard case pointer 态接线）。第五批①：自指平台指针警告跨进程 10min 窗口降频（warnSelfRefPointerOnce marker，writePlatformPointer 与 command.js 恢复链两处接线——daemon junction 形态下每命令重复告警的噪音闸）+ resolvePlatformSpecDir 对 pointer specRoot realpath 规范化（junction 坍缩为真实路径：design-init/endpoints 等落盘不再锚到 daemon junction 副本路径）。同批③：reapVerifyServices 改 killProcessTree 进程树击杀（win32 taskkill /PID <pid> /T /F；POSIX ps 递归枚举子进程后杀——坑 verify-service-process-leak 子进程泄漏：原 process.kill 只杀登记的 shell 包装 PID，python 服务本体成孤儿挂机；verify prompt 同步补「优先登记服务本体（叶子）PID」指引）。同批②：run/shared.js 新增 mirrorPlatformArtifactToMainRepo（平台模式产物双写镜像主仓 changeDir——design-init / verify-probes --init 在 pointer 态 agent 本地跑时不再单点依赖 spec-sync 回程；daemon 显式 --spec-dir / 本地无 changeDir / 路径同构跳过）。
- **`.runtime` 根解析统一 `resolveRuntimeRoot`**（坑 execute-runs-isolation，`run/shared.js`）：`.runtime` 根（含 `sillyspec.db` / execute-runs / stage-reviews / quick-sessions）由 `resolveRuntimeRoot(platformOpts, localSpecBase)` 统一解析，三级优先级 `platformOpts.runtimeRoot`（平台）> `platformOpts.specDriftAnchor`（drift 锚点）> `localSpecBase/.runtime`（本地兜底）。drift 守卫（`run/command.js`）命中时设 `specDriftAnchor = 主仓 specBase`（**不**设 `specRoot`/`runtimeRoot`——否则触发平台 sentinel，误跳 `triggerSync`/`checkApproval`、误进平台渲染分支）→ 下游 15 处站点解析落主仓 `.runtime`，execute-runs / stage-reviews 不随 worktree cleanup 整目录删消失，archive step1 完成度 gate 真相源（磁盘主仓 review.json）不再丢

- **--done 前非阻断并发预检 advisory**（`run/complete-handlers.js` quick 钩子 + `run/gates.js` execute 钩子 + `run/concurrent-detect.js`）：quick --done（`auditQuickCompletion` 后）与 execute --done（`completeStageGates` 入口 guard `stageName==='execute'`）完成前调 `detectConcurrentChanges()`（复用 `isQuickMetadata` 分类）扫工作树他者脏文件 + 他者活跃 change 目录，命中则 `console.warn` 多行 ⚠️（foreignFiles + otherActiveChanges + pathspec 提示），**绝不阻断**——不改 audit `result.status` / gate 通过性 / `isQuickMetadata` 语义（fail-open：`git status` 不可读时 `hasForeign=false` 不崩）。ownFiles 排除自身：quick 经 `resolveConcurrentAnchor`（concurrent-detect 纯函数，2026-08-18 误归属修复）——声明会话=`baselineFiles∪allowedFiles`（窗口 diff 含他者污染不再自吞），未声明会话维持旧口径 `changedFiles∪baselineFiles`；execute=design §6 交付文件（in-place 模式）或 `[]`（worktree 模式）
- **quick --done 同文件并发检测 advisory**（2026-08-13-quick-hunk-separation，`run/stage.js` + `run/shared.js`）：step1 启动将每个 allowedFile 内容 sha256 录 `guard.allowedFilesHash`（容错读，文件不存在/读失败跳过）；`auditQuickCompletion` 末尾检测——allowedFile 在 baseline（他者改过）且当前 hash ≠ 录入值（我也改了）→ 同文件并发，push reason + `console.warn` 给 `git add -p`/patch 分离指引（防 commit 整文件 pathspec 夹带他者 hunk），**advisory 不改 result.status**（与 detectConcurrentChanges 同族互补：后者检测他者脏文件，本检测 baseline 文件 hunk 混）。旧 guard 无该字段 → 可选链跳过，向后兼容。
- **safeGit 收口 src/git-helper.js**（2026-08-09-worktree-git-injection）：`run/shared.js` 原 safeGit 实现已移入根级 src/git-helper.js 作统一公共 git 调用入口（safeGit+git+gitQuiet，execFileSync 数组形式不经 shell），与 worktree 链共用消除口径分裂（原 safeGit vs worktree 本地 git/gitQuiet 双源）；run/shared.js 改 `import { safeGit } from '../git-helper.js'` + `export { safeGit }` 两段式（注：纯 `export { safeGit } from '...'` 不建本地词法绑定，内部 ancestorSpecDirs/auditQuickCompletion 等调用会 ReferenceError，故用 import+export 而非纯 re-export）；run/ 层调用方路径与行为不变

- **quick --done 归属切分（声明即归属）**（2026-08-18 误归属修复，ql-20260818-003 实证，`run/shared.js` + `run/complete-handlers.js`）：`auditQuickCompletion` 新增产出 `attributedFiles`（声明会话=窗口∩allowedFiles ∪ 同文件并发命中）与 `undeclaredFiles`（窗口−声明）；QUICKLOG「文件：」行回填改用 attributedFiles（经 `completeQuicklogEntry` 的 realFiles），他者/漏声明的窗口脏文件以「审计：⚖️ 归属切分」行落盘追溯不静默丢；未声明会话（allowedFiles 空）维持全量口径不回归。同文件并发检测的 `sameFileHits` 提升作用域供归属切分复用（baseline 声明文件被 `isBaselineFile` 跳过不进 changedFiles，靠 hash 差异并入）。
- **活文档漂移提示精度对齐 docs check**（2026-08-18，ql-20260818-009-9443，`run/shared.js` + `run/quick-audit.js`）：`livingDocDrift` 从路径级「被引用即提示」升级为复用 `runDocsCheck` 分层真校验（存在 + 行界 + 关键词窗口），只报「真失效且指向本次改动 src 文件」的引用——`drift.invalid` 逐条带 doc:line/ref/reason，打印列出（`printQuickAuditReview`），全过零输出（治「advisory 报漂移、docs check 全过」的结论不同步误报）。`matchLivingDocRefs` 降为预过滤（该文档不引用任何本次改动文件 → 跳过整档真校验省 IO），新增纯函数 `matchInvalidRefsToChanged`（invalid ref 剥尾部行号段后按三形态匹配改动文件，ref 空串的文档不存在条目跳过）。
- 2026-08-17-quick-close-linked-changes | complete-handlers.js 新增 closeQuickLinkedChanges（+isChangeTasksComplete/closeSingleQuickLinkedChange 辅助）——quick --done 在 completeQuicklogEntry 后、清理 session/注销 quick-<8hex> 前对 guard.linkedChanges 中 tasks.md 全勾选的真实变更执行轻量归档（unregisterChange + 目录移 changes/archive/<date>-<desc>/ + archiveWorktreeCleanup + safeGit add），跳过 plan.md/module-impact 硬校验，单变失败 warn 不阻断；过滤 quick-<8hex> sessionId；幂等跳过已归档目录；新增 test/quick-close-linked-changes.test.mjs（5 场景）+ quick-cli-managed-e2e 断言适配新契约。
- ql-20260817-005-4369 | plan-postcheck.js executePlanPostcheck 聚合 stage-contract validatePlanOutputs：在原有六检查之后动态 import 阶段产物契约校验，把 module-impact 缺失/entry-point-wiring 未覆盖等 stage gate 错误一轮暴露，避免「postcheck 通过 → stage gate 又报错」的修一层撞一层；循环依赖由运行时动态 import 打破，stage-contract.js 仍静态 import plan-postcheck.js 的 parseAllowedPaths 不变。
- ql-20260818-006-b5ae | quick QUICKLOG 文件行误归属修复（声明即归属）：auditQuickCompletion 产出 attributedFiles/undeclaredFiles（窗口∩声明∪同文件并发 / 窗口−声明），文件行回填改用 attributedFiles、未声明窗口脏文件进「审计：」行追溯；并发预检 ownFiles 锚点声明会话改 baseline∪allowed（治 changedFiles 污染自吞致预检失明，ql-20260818-003 实证）。
- ql-20260818-009-9443 | 活文档漂移提示精度对齐 docs check：路径级「被引用即提示」升级为 runDocsCheck 分层真校验，只报真失效引用（drift.invalid 逐条 doc:line/ref/reason），全过零输出；matchLivingDocRefs 降为预过滤 + 新增 matchInvalidRefsToChanged。
- ql-20260818-010-1197 | quick flag 级语义别名定向提示（F10b）：command.js 对 --title/--message/--summary/--result/--name/--session/--note/--notes/--desc/--description 等常见「不存在 flag」给定向指引，替代 did-you-mean 形近猜测（如 --title 不再误导猜 --files，而是指向 --output「需求：」自动提取 / --file-notes 文件括注）；test/run-exit-codes.test.mjs 加 3 条回归断言。
- ql-20260819-004-ce90 | quick 轻量归档阶段闸（防误归档中途变更）：closeQuickLinkedChanges 原判定只看 tasks.md 全勾选——execute 完成后 tasks.md 必然全勾而 verify 未跑，穿插 quick 关联即被绕过 verify/archive 校验归档注销；新增 ProgressManager.getChangeStage（change-registry+facade 转发，读失败抛给上层 fail-closed），归档前查 current_stage，仅无 DB 记录或停在 scan/brainstorm（d192f89 原始 small 逃生通道场景）放行，plan/execute/verify/archive 一律 skip 提示走原流程；quick.js step3 prompt + quick.md 镜像 + SKILL.md + file-lifecycle.md 同步；test/quick-close-linked-changes.test.mjs 补 6 场景 + 新增 progress-get-change-stage.test.mjs。
- 2026-08-19-reopen-and-execute-batch-guard | W1/W2：reopen --done stale 回填需 --confirm（complete.js ~303-343：无 --confirm 不回填、阶段不完成；带 --confirm 回填+audit；全 completed+stale 时走首个 stale 拉回完成管线）。completeStage 存在 stale 步骤时拒绝（stage-machine.js ~78-108，--force 逃生门）。execute 批量完成 blockedTasks 复核（shouldAutoCheckTask 加 ctx：自动草稿需 changedFiles 非空且 diff 非空；detectExecuteBatchFinish 逐 task 复核，review 缺失或草稿零 diff 阻断）。
- ql-20260819-011-119b | changes.title 单步持久化点刷新：complete.js 抽 refreshChangeTitleFromArtifacts 公共 helper 挂四点（completeStep 单步/阶段完成 + continueStep wait 解除/阶段完成），brainstorm step6 design.md 落盘后每次 --done 即把 changes.title 刷新为中文标题，治「brainstorm 全程 title 存英文 autoName 兜底」；test/run-complete-step-brainstorm.test.mjs 加单步刷新案例（先红后绿）。
- ql-20260819-012-66fc | noAI 未知 cliAction fail-fast（stage.js/complete.js 加 else throw）、waitAnswers JSON 损坏诊断（progress.js catch 加 warn）、completed_at 条件写入（step-store.js）。
- ql-20260819-014-0082 | autoCheckPlanFromReviews catch 加 warn 留痕（原静默返回假阴性）；prompt.js quicklog-id guard.json 读取失败加 warn（原空 catch 降级 (未分配) 无根因）。
- 2026-09-02 P0-2（跨 agent 工单） | quick --done 内置 test+lint 硬门禁：complete-handlers.js quick 收尾在边界审计后接 runQuickTestLintGate（quick-audit.js），changedFiles 触及 src/test 时复用 verify-postcheck 的 runVerifyTestCheck/runVerifyLintCheck 亲自实测（commands.test/lint，含 test_strategy/known_failures/超时语义），任一 failed → step 回 pending + exit 1（与边界审计同款阻断），修复重跑不丢进度；纯 doc/配置、未配置命令、brownfield 无清单自动跳过不阻断；env 逃生门 SILLYSPEC_QUICK_TEST_GATE=skip 留痕跳过。治「--done 前跑 test+lint」靠 agent 自律的 CLAUDE.md 规则 8。新增 test/quick-test-gate.test.mjs（8 组 21 断言）；本仓 local.yaml 补 commands.test/lint 启用自监管。

## 人工备注
<!-- MANUAL_NOTES_START -->
<!-- MANUAL_NOTES 区已迁出至 runtime.changelog.md（手工批次，2026-09-07）——新条目追加到 sidecar，勿写回本卡 -->
<!-- 2026-09-07-endpoint-baseline | （无 runtime 文件改动——指引在 stages/cli-entry 侧） -->
<!-- MANUAL_NOTES_END -->

## verify 收尾次序接线（2026-09-08-ir-verify-facts）

gates.js verify 完成门重排：前置 slot-backfill（verify-result.md 槽段固化进 verify-facts.json——只固化既有底稿）+ verifyStartAt（ProgressManager.getStageCompletedAt 读 DB stages.completed_at，新只读访问器，change-registry 同款容错）注入 runValidators context；test 实测后 tests 段二次回填；cannot_verify 硬门（runVerifyRequiredEvidenceCheck status=blocked → rollback，逐 item verification 明细 + 修复指引）。无槽存量 md 走 legacy 降级不阻断。
