---
author: qinyi
created_at: 2026-08-16 16:02:14
plan_level: light
---

# 轻量计划（Light Plan）：状态机 fail-open 组修复（--done 守卫 / auxiliary 只读 / 幽灵变更 / exit code）

## 来源

直接引用 brainstorm 结论（design.md + decisions.md + requirements.md），不重新扩写。变更 `2026-08-16-state-machine-fail-open` 修复 self-audit-2026-08-16 批次②四项状态机 fail-open 缺陷：A5（--done gate 失败 exit 0）/ B6（--done 绕转换守卫 + auxiliary 污染 currentStage）/ B7（status/doctor 写库）/ B8（brainstorm 幽灵变更），8b 随 B7 覆盖。

## 范围

- **涉及文件**：src/constants.js、src/run/stage.js、src/run/command.js、src/run/complete.js、test/state-machine-guards.test.mjs（4 改 1 新增）
- **涉及模块**：cli-entry（run 状态机）/ runtime（constants/stage）
- **方案**：方案 B「统一辅助阶段语义」（design.md「决策与方案选择」节，D-001@v1）
- **无 schema/DB/接口变更**（纯内部状态机语义，design.md 兼容策略）

## Tasks

## Wave 1（常量 + stage 语义，无共享文件）
- [x] task-01: src/constants.js 新增 `READONLY_AUXILIARY_STAGES = ['status', 'doctor']`（覆盖：FR-04, D-005@v2）
- [x] task-02: src/run/stage.js :128-133 仅非 auxiliary 阶段写 currentStage（覆盖：FR-03, D-003@v1）

## Wave 2（command 守卫 + complete 消费点，stage.js 跨 Wave 共享为串行安全 warning）
- [x] task-03: src/run/command.js --done 补 checkTransition（含 fromStageData，FR-02, D-004@v1）+ read-only auxiliary 置顶短路于 registerChange/ensureStageSteps 前（FR-04, D-005@v2）+ brainstorm auto-create 按活跃变更数 gating（FR-05, D-006@v1）
- [x] task-04: src/run/complete.js :328/:810 与 src/run/stage.js :377 三处 completeStageGates 消费点：gate 失败结果（返回 stageCompleted=false）统一置进程退出码 1（对齐 quick 审计 blocked→exit 1；覆盖 rollback 回滚与 scan 非平台 failed_post_check 直返两条失败路径）（覆盖：FR-01, D-002@v2）

## Wave 3（回归测试收尾）
- [x] task-05: test/state-machine-guards.test.mjs 子进程驱动回归测试（FR-07, FR-06）+ 全量 npm test / lint 验证。既有受影响测试逐案定性：cli-top-level-aliases / run-complete-step-* / doctor-*（consistency-doctor-lost-update / doctor-align-execute-progress / worktree-doctor）/ sync-conflict-statemachine / audit-quick-completion——区分合法收紧（守卫拦未先建 currentStage 的 --done）与误伤

## 验收

- **AC-01**：`READONLY_AUXILIARY_STAGES` 定义 + 新项目 `run status` 不建 `changes/default/`、已有变更 `run status` 不改 DB（steps/lastActive/currentStage）
- **AC-02**：auxiliary 阶段（status/doctor/scan/quick）执行后 `progress.currentStage` 保持主流程阶段不变
- **AC-03**：brainstorm 态直跑 `verify --done` 被拦（exit 1，--skip-approval 可绕过）；多活跃变更仓 `run brainstorm` 无 --change → exit 2 引导；0 活跃变更仓 auto-create 保留
- **AC-04**：构造 gate 失败（缺产物 + scan 非平台 failed_post_check），`--done` 后进程 exit code = 1 且进度回滚 pending
- **AC-05**：全量 npm test EXIT=0、lint 通过；test/state-machine-guards.test.mjs 新增断言全绿

## 覆盖矩阵

| ID | 覆盖任务 | 验收证据 |
|---|---|---|
| D-001@v1 | task-01..05 | AC-01..AC-05 |
| D-002@v2 | task-04 | AC-04 |
| D-003@v1 | task-02 | AC-02 |
| D-004@v1 | task-03 | AC-03 |
| D-005@v2 | task-01, task-03 | AC-01, AC-03 |
| D-006@v1 | task-03 | AC-03 |
