---
schema_version: 1
doc_type: module-card
module_id: progress
author: qinyi
created_at: 2026-08-16T19:05:00+08:00
updated_at: 2026-09-02T11:20:00+08:00
---

# progress

## 定位

进度恢复管理（W6 重构产物）：`src/progress.js` ProgressManager facade + `src/progress/` 四个职责子模块 + 共享常量。管理项目全局数据与变更级进度（stages / steps / batch_progress），全部状态经 DB（`src/db.js`）持久化到 `.sillyspec/.runtime/sillyspec.db`。对外 ProgressManager API 不变，内部按组 delegate 到子模块（构造注入 pm 引用，组内互调保持 this.X 同 class 语义）。

## 契约摘要

| 文件 | 职责 |
|------|------|
| `src/progress.js` | ProgressManager facade：对外方法全部保留；持久化核心（`_ensureDB`/`read`/`_write`/`_changePath`/`_ensureRuntimeDir`/`_runtimePath`/`readGlobal`）本体留 facade，stage/step/变更注册/一致性检查组方法 delegate 到子模块 |
| `src/progress/stage-machine.js` | 阶段状态机（W6 Step9d）：completeStage/reopen/reset/validate/show/status + 产物校验门 + 下游级联；completeStage 五层（resolve/validate/force/tx/history/print）整体搬迁不拆流水线；overview(cwd) 只读全局总览纯数据（2026-09-02，show 多变更汇总的机器版，供 machine-interface 包装；P2-2-① 起 show 汇总含未决同步冲突 🔴 标红 + overview 透出 pending_conflicts（_listPendingConflicts，与 sync.js listConflictFiles 同前缀同字段，fs-only 不引网络）） |
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

见 `progress.changelog.md`——历史条目已迁出；新条目直接追加 sidecar，勿写回本卡。

## getStageCompletedAt（2026-09-08-ir-verify-facts）

新只读访问器：DB stages.completed_at（change-registry 查询 + ProgressManager 委托；无行/读失败 null，调用方走 R-05 fallback）——verify 证据分类核验的 verifyStartAt 基准（execute 行完成时刻）。

## getStageStartedAt（2026-09-10 用户反馈②：evidence mtime 锚点放宽）

同族只读访问器：DB stages.started_at。gates verify 收尾接线改为 `getStageStartedAt('execute') || getStageCompletedAt('execute')`——证据合法产自 execute 或 verify 两窗口，锚「execute 完成时刻」会把 execute 期间产的证据判旧，逼出「先提交则 diff 空、不提交则 mtime 旧」的时序两难（PI 会话实证，只能 missing+豁免收口）。锚 started_at 后 execute/verify 两窗口证据均入窗，变更窗口外的陈旧证据照拦。

## change 所有权（2026-09-14-change-ownership-guards）

changes 表 v6 加 `owner_session` 列（NULL=无主——存量行迁移后任何会话可接管，向后兼容零行为变化；四处 schema 版本 bump 之一，版本口径见 runtime 卡）。owner 读写与判定 API（ProgressManager facade 转发 src/progress/change-registry.js）：

- `getChangeOwner(cwd, changeName)` — 只读容错（无行/未登记/读失败 → null）
- `claimChangeOwner(cwd, changeName, session)` — 认领：行不存在首建即得；他人已持有不覆盖（返回既有 owner，WHERE 守卫 + 单事务串行）；无主行（NULL）认领写入。run 链启动 claim 消费（run/command.js）
- `setChangeOwner(cwd, changeName, session)` — 接管无条件重写 + 同事务刷新 last_active（新 owner 心跳从接管时刻起算，否则接管后立即可被 takeover-stale 抢回）
- `assertChangeOwnership(cwd, changeName, opts)` — 所有权判定纯函数（**读行不写库**，判定与接管写分离，调用方锁内先判后写无 TOCTOU）五分支：`forced`（--takeover）→ takeover-forced 放行 / owner 为空 → no-owner 放行 / owner===selfSession → self 放行（本会话零路径变化）/ 他人且 now−last_active ≥ 心跳窗 → takeover-stale 放行（调用方重写 owner）/ 他人且活跃窗内 → blocked-active-owner 拒绝（结构化字段 owner+lastActive+heartbeatMs 供接线打指引）。last_active 缺失/不可解析按陈旧处理（逃生通道优先，不因时间戳损坏锁死）；心跳即既有 last_active（每次 CLI 写操作刷新），窗缺省 15 分钟（`change-ownership.heartbeat_minutes`，见 setup 卡）
- `resolveSessionIdentity({ flagSession, quickChangeName, cwd, warn })` — 会话标识三级解析（src/progress.js 导出）：`--session` flag > env `SILLYSPEC_SESSION_ID` > quick 会话名（quick-<8hex>，既有 sessionId 机制天然跨进程）> `anon@<host>` 机器级降级 + 一次性教学 warning（进程内 memo + 24h marker 文件双层降频，`.runtime/anon-session-warn.json`）；同机并行不设防是 R-01 明示局限（防线=显式标识铁律 + 归档收口 + --takeover 摩擦）
- `registerChange(cwd, changeName, { ownerSession })` — 首建者获得所有权（INSERT OR IGNORE 语义天然已有值不覆盖）

平台同步投影扩列（D-005@v1）：`serializeForSync` changes 投影加 `owner_session`（NULL=无主随 payload 带出，平台消费端不强制）；`import()` 侧回写容错（payload 含该列才写）。接线点（apply/cleanup/assess/归档/quick 链）归 cli-entry / runtime / worktree 卡登记。
