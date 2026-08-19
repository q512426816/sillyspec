---
schema_version: 1
doc_type: module-card
module_id: progress
author: qinyi
created_at: 2026-08-16T19:05:00+08:00
updated_at: 2026-08-19T09:03:14+08:00
---

# progress

## 定位

进度恢复管理（W6 重构产物）：`src/progress.js` ProgressManager facade + `src/progress/` 四个职责子模块 + 共享常量。管理项目全局数据与变更级进度（stages / steps / batch_progress），全部状态经 DB（`src/db.js`）持久化到 `.sillyspec/.runtime/sillyspec.db`。对外 ProgressManager API 不变，内部按组 delegate 到子模块（构造注入 pm 引用，组内互调保持 this.X 同 class 语义）。

## 契约摘要

| 文件 | 职责 |
|------|------|
| `src/progress.js` | ProgressManager facade：对外方法全部保留；持久化核心（`_ensureDB`/`read`/`_write`/`_changePath`/`_ensureRuntimeDir`/`_runtimePath`/`readGlobal`）本体留 facade，stage/step/变更注册/一致性检查组方法 delegate 到子模块 |
| `src/progress/stage-machine.js` | 阶段状态机（W6 Step9d）：completeStage/reopen/reset/validate/show/status + 产物校验门 + 下游级联；completeStage 五层（resolve/validate/force/tx/history/print）整体搬迁不拆流水线 |
| `src/progress/step-store.js` | 阶段/步骤/批量进度管理（W6 Step9c）：stages + steps + batch_progress 三表读写（setStage/addStep/updateStep/batch 读写）；纯 SQL + 常量，无 fs/path 依赖 |
| `src/progress/change-registry.js` | 变更注册表（W6 Step9b）：changes 表生命周期——注册/注销/重命名/隔离状态/平台同步戳/审批状态 |
| `src/progress/consistency-doctor.js` | 状态一致性检查与修复（W6 Step9a）：Revision v1 一致性检查 + `--force` 审计日志（`.runtime/audit.log`），doctor 阶段核心实现 |
| `src/progress/shared.js` | 共享常量（W6 Step9）：STAGE_ORDER / MAIN_FLOW_ORDER / VALID_STAGES / STAGE_LABELS / SPEC_DIR_NAME / CURRENT_VERSION / emptyStage，破 facade↔子模块循环引用 |

## 关键逻辑

- 历史迁移：v1/v2 使用 progress.json 文件，v3 起全部迁移至 SQLite；worktree-guard hook 直读 sillyspec.db（gate-status.json 双源已废）
- facade 只留持久化核心 + 子模块装配（`new StageMachine(this)` 等构造注入）；run.js / index.js / hooks 等调用方零感知
- **reopen --done stale 回填需 --confirm（W1，reopen-stale-confirm，2026-08-19）**：`--reopen --from-step N` 后 `--done` 无 `--confirm`：不回填 stale、阶段不完成，指引两条路（带 `--confirm` 回填 / 继续 `--done` 跳过 stale）；带 `--confirm`：回填 stale→completed + audit log（action=reopen-stale-backfill）。全 completed+stale 时 `--done --confirm` 走「首个 stale 拉回完成管线」逃生门。completeStage 存在 stale 步骤时拒绝（`--force` 逃生门，审计含 stale 步骤名）；stale 门位于产物校验门之前（`src/progress/stage-machine.js` ~78-108，`src/run/complete.js` ~303-343）。
- **execute 批量完成 blockedTasks 复核（W2，execute-batch-blocked-tasks，2026-08-19）**：`shouldAutoCheckTask` 加可选 ctx（自动草稿需 changedFiles 非空且实测 diff 非空才勾选）；`detectExecuteBatchFinish` 批量放行前逐 task 复核，blockedTasks（review 缺失或草稿零 diff）阻断批量完成。

## 依赖关系

- 内部依赖：src/db.js（DB）、src/fs-atomic.js（writeAtomicSync）、src/stage-contract.js（runValidators 产物校验）、src/task-review.js（summarizeTaskCompletion）
- 外部依赖：fs、path、os（tmpdir）

## 变更索引

- 2026-06-03 | 初始文档
- 2026-08-16 | W6 重构：facade + 4 子模块
- ql-20260819-012-66fc | updateStep completed_at 条件化 + waitAnswers JSON 损坏诊断 + 清理 makeInitialProgress/makeInitialGlobal/VALID_STAGE_STATUSES 死代码
