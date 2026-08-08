---
id: task-10
title: 废 gate-status.json——删 progress.js `_updateGateStatus`+`_write` 末尾调用、worktree-guard.js `readGateStatus` 优先+墓碑机制；`readCurrentStage`/`isNoWorktreeMode` 改直读 DB。显式承接 6 个依赖 sql.js/gate-status 的测试重写归属（db-atomic-write、worktree-guard、worktree-guard-db-fallback、machine-interface、quick-session-isolation、runtime-cleanup-keeps-worktree——删除或改 better-sqlite3 行为/改直读 DB 断言，具体归属 task-14）。完成标准：全 src 无 gate-status.json 写点；worktree-guard 无 readGateStatus；6 个测试在 task-14 内承接（B2）
title_zh: 废除 gate-status.json 双源——hook 门禁改直读 DB
author: qinyi
created_at: 2026-08-09 00:32:15
priority: P0
depends_on: [task-07]
blocks: [task-11, task-16]
requirement_ids: [FR-05]
decision_ids: [D-02]
allowed_paths:
  - src/progress.js
  - src/hooks/worktree-guard.js
goal: >
  废除 gate-status.json 双源（FR-05/D-02，根除 H3 stale 快照打穿 hook 守卫）：删 progress.js
  `_updateGateStatus` 及 `_write` 末尾调用，删 worktree-guard.js `readGateStatus` 优先分支与墓碑机制，
  `readCurrentStage`/`isNoWorktreeMode`/`isInsideRegisteredWorktree` 全部改直读 DB。
implementation:
  - progress.js：删除 `_updateGateStatus` 方法（677-741 行，含 SQL 查询、墓碑写、writeAtomicSync 写）与 `_write` 末尾 `await this._updateGateStatus(cwd);`（475 行），同步清理文件头 gate-status 注释（:8）
  - worktree-guard.js：删除 `readGateStatus` 函数（228-240）及其 JSDoc；`readCurrentStage`（288-296）删「gate-status.json 优先」分支（289-291），只经 `queryDbFirstCell` 直读 DB
  - `isNoWorktreeMode`（303-310）同删 readGateStatus 分支（305-306），只经 queryDbFirstCell 直读 DB（`SELECT no_worktree FROM changes WHERE status='active' AND current_stage IN ('execute','quick') LIMIT 1`）
  - `isInsideRegisteredWorktree`（317-329）：`gateStatus.changes` 依赖改掉——从 DB 读 active changes（`SELECT name FROM changes WHERE status='active'`）或扫描 `.runtime/worktrees/` 目录 + `readWorktreeMeta` 判定（queryDbFirstCell 单行单列，多行读取需目录扫描兜底或等 task-11 多行子进程，本 task 不碰 queryDbFirstCell 子进程实现）
  - `findProjectRoot`（:92）删 gate-status.json 存在性检查行（保留 sillyspec.db / local.yaml 判定）
  - 顺带修正 worktree-guard.js 头部注释（:8）与 :664 的 gate-status 措辞、progress.js 文件头（:8）
  - 本 task 不写不改测试文件；6 个依赖 sql.js/gate-status 的测试重写归 task-14（plan 审查 B2 承接）
acceptance:
  - src/progress.js 无 `_updateGateStatus` 定义与调用（含 `_write` 末尾 475 行调用删除）
  - src/hooks/worktree-guard.js 无 `readGateStatus` 函数与任何调用（grep 计数归零）
  - `readCurrentStage`/`isNoWorktreeMode` 无 readGateStatus 分支，queryDbFirstCell 直读 DB 为唯一路径
  - `isInsideRegisteredWorktree` 不引用 gateStatus.changes，active changes 来自 DB 查询或目录扫描
  - `findProjectRoot` 不再把 gate-status.json 当项目根判据
  - 全 src 无 gate-status.json 写点（writeAtomicSync/writeFileSync 目标无 gate-status）
  - 6 个测试文件（db-atomic-write、worktree-guard、worktree-guard-db-fallback、machine-interface、quick-session-isolation、runtime-cleanup-keeps-worktree）本 task 不触碰，重写归属 task-14（B2 闭环）
verify:
  - grep -n "_updateGateStatus" src/progress.js（期望 0 命中）
  - grep -n "readGateStatus" src/hooks/worktree-guard.js（期望 0 命中）
  - grep -rn "gate-status.json" src/（期望无写语句；残留仅限可接受的注释级引用，逐个核对）
  - grep -nE "writeAtomicSync|writeFileSync" src/progress.js（期望无 gate-status 目标）
constraints:
  - allowed_paths 仅 src/progress.js 与 src/hooks/worktree-guard.js 两个文件；design §5.2 Phase 3 提及的 init.js:19/28 清理白名单删 gate-status 项、index.js:711/715 过时注释、fs-atomic.js:52 / worktree.js:650 / machine-interface.js:10,324 注释顺带修正均超本 task 范围，不在 allowed_paths 内修改
  - 本 task depends_on task-07（PM 同步化）：`_write` 的 async→sync 改造归 task-07，本 task 只删 `_updateGateStatus` 调用，不重构 `_write` 事务逻辑
  - 本 task 在 task-11（queryDbFirstCell 改 better-sqlite3）之前执行：isInsideRegisteredWorktree 的多行 active changes 读取不得依赖 task-11 未落地能力，目录扫描方案须兼容 Windows 分隔符（isPathInside）
  - 已落盘的陈旧 gate-status.json 残留文件：本 task 不负责删除（findProjectRoot 不再依赖它即不产生错误）；删除/断言归 task-14 测试承接
  - 不写测试文件；execute 期 worktree-guard 守卫边界用例归 task-16
---
