---
schema_version: 1
doc_type: module-card
module_id: runtime
author: qinyi
created_at: 2026-06-03T07:42:00+08:00
---
# runtime

## 定位

SQLite 数据库层 + 进度管理 + 迁移。提供 `.sillyspec/.runtime/sillyspec.db` 作为权威状态源，管理项目、变更（change）、阶段（stage）、步骤（step）的全生命周期。不负责 CLI 解析、命令分发或阶段执行逻辑。

## 契约摘要

- **DB** (`src/db.js`) — 基于 sql.js 的内存 SQLite 封装，提供 `init()` / `transaction()` / `query()` / `getDb()` / `_save()`，自动 WAL 模式 + PRAGMA 管理，每次写操作后序列化到磁盘
- **ProgressManager** (`src/progress.js`) — 进度读写入口，通过 DB 实例操作 `project / changes / stages / steps / batch_progress / approvals` 六张表；支持 `read()` / `init()` / `initChange()` / `show()` / `validate()` / `reset()` / `_updatePlatformLastSync()` / `_updateApprovalStatus()` / `alignExecuteToPlan()` 等方法

### ProgressManager 对齐相关方法

| 方法 | 说明 | 参数 |
|------|------|------|
| `readPlanCheckboxStatus(changeDir)` | 只读解析 `plan.md`（回退 `tasks.md`）的 task checkbox 统计；仅匹配 `- [ ] task-NN` / `- [x] task-NN`（task- 前缀锚定，避免误捞非任务项）；返回 `{ total, checked }`（无文件返回 `{0,0}`） | `changeDir`（变更目录绝对路径） |
| `async alignExecuteToPlan(cwd, changeName, specBase, opts={})` | 按 `plan.md` 声明对齐 execute 阶段派生进度戳。仅当 `plan.md` 所有 task checkbox 全勾时，把 execute 阶段所有非 completed step 标 completed，**并显式置 `execute stageData.status='completed' + completedAt`**（绕过 `completeStep` 推导，D-003@v2），`pm._write` 落盘。信任声明、不复核代码（与 archive 同源，verify 兜底）。无 progress / 无 execute 阶段 / `plan.md` 无 checkbox / 未全勾 → `{ok:false, reason}`。`opts.confirm=false`（默认）只 dry-run 报告。返回 `{ ok, aligned, skipped, planTotal, planChecked, reason?, dryRun? }` | `cwd, changeName, specBase, { confirm? }` |
- **migrateDocs** (`src/migrate.js`) — 一次性迁移工具，将旧结构（`codebase/`、`specs/`、`changes/archive/`）迁移到统一的 `docs/<project>/` 布局（`scan/`、`archive/` 等）

## 关键逻辑

```
DB.init()
  → 检查 .db 文件存在 → 加载到 sql.js 内存 / 否则创建新库
  → _createSchema(): CREATE TABLE IF NOT EXISTS (project, changes, stages, steps, batch_progress, approvals)
  → 设置 PRAGMA (WAL, busy_timeout=5000, foreign_keys=ON, synchronous=NORMAL)

DB.transaction(fn)
  → BEGIN → fn(db) → COMMIT / ROLLBACK → _save()
  → _save(): db.export() → Buffer → writeFileSync → 重新设置 PRAGMA（export 会重置）

ProgressManager.read(cwd, changeName?)
  → 从 SQLite 加载指定变更的 stages + steps 状态
  → 从 SQL 合并 activeChanges 列表

ProgressManager._write(cwd, progress, changeName)
  → 写入 stages / steps / changes.current_stage
  → 更新 gate-status.json（execute / quick）
  → 辅助阶段完成后由 run.js 清空 currentStage，gate 随之删除

ProgressManager.alignExecuteToPlan(cwd, changeName, specBase, {confirm})
  → read(cwd, changeName) 取 execute stage + steps；无数据则拒绝
  → readPlanCheckboxStatus(changeDir) → {total, checked}；未全勾则拒绝（信任声明、verify 兜底）
  → 全勾：把 status≠completed 的 step 改 {status:'completed', completedAt} + 显式置 stageData.status='completed'
  → confirm=false：只返回将补的 aligned/skipped 计数（dry-run）；confirm=true：pm._write 落盘
  → 入口：sillyspec doctor --align-execute-progress [--confirm] [--change <name>]（index.js doctor flag 分支）
```

## 注意事项

- sql.js 是纯内存数据库，每次 `_save()` 都全量序列化；高频写入场景需注意性能
- `_save()` 后必须重新执行 `PRAGMA journal_mode = WAL`（sql.js export 会重置状态）
- `batch_progress` 和 `approvals` 表按 `change_id` UNIQUE，每个变更只能有一条记录
- 历史迁移：v1/v2 使用 `progress.json` 文件，v3 全部迁移至 SQLite（`CURRENT_VERSION = 3`）
- `db.js` DDL 默认 schema_version 仍是 4，但 `progress.js` 当前写入版本是 3；文档不要把 runtime 称为稳定 v4 schema
- `migrateDocs` 是一次性脚本，不会幂等运行；已存在的文件会被跳过

## 人工备注
<!-- MANUAL_NOTES_START -->
- ql-20260604-001-7a4c | 补齐平台 sync 时间与审批状态的本地写入方法，并记录 quick/archive gate 清理行为。
- ql-20260803-001-9c4e | 修 reopen --done 步骤状态不同步：complete.js 阶段完成分支回填 stale→completed，completeStage SQL 扩到 IN('pending','stale')。
- ql-20260804-003-e439 | _getNextSuggestion 遍历跳过 scan 且 upstream 排除 scan（根因修 plan→scan 回头路，prompt-control-debt plan-c）+ quicklog flipEntryInContent 单行四字段归一为多行（quick-①）。
- ql-20260804-004-3a24 | quicklog 单行四字段归一改 splitSingleLineFields 双级扫描（字段边界严格扫描 + 顺序扫描兜底）：字段正文引用标签字样（「结果：」/正则内嵌四标签）不再被 split 任意位置误断行（quick-① 残留补丁）。
<!-- MANUAL_NOTES_END -->
