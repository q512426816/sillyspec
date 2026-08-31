---
id: task-02
title: doctor-diagnostics 新增 execute-progress-plan-mismatch 只读诊断项
author: qinyi
created_at: 2026-07-07T07:43:24
priority: P0
depends_on: []
blocks: []
requirement_ids: [FR-04]
decision_ids: [D-001@v2]
allowed_paths:
  - src/doctor-diagnostics.js
goal: >
  在 runDoctorDiagnostics 的 dimensions 中新增只读维度 execute-progress-plan-mismatch，检测 execute 阶段 status≠completed 但 plan.md 所有 task checkbox 全勾的不一致，并在 safe_actions 建议显式对齐命令，绝不写 db。
implementation:
  - 在 doctor-diagnostics.js 新增维度检测函数，判定 execute 阶段 status≠completed 且 plan.md 全勾 checkbox（回退 tasks.md），与现有 multi_db/pointer_health/changes_split/change_db_consistency 维度同构产出 {name,label,pass,severity,findings,safe_actions}
  - severity 用 CHECK_SEVERITY.WARNING（advisory 不阻断），findings 描述 plan.md 声明全完成但 execute 派生戳未对齐
  - safe_actions 建议条目 action 形如 sillyspec doctor --align-execute-progress --change <name>，risk:'low'，rationale 说明 doctor 信任 plan.md 声明、对齐由 --confirm 显式触发
  - 在 runDoctorDiagnostics 主入口解析权威 changes 目录、逐个 change 跑该维度（或在 change_db_consistency 同层补一个 execute 维度，需 progress 只读读取 execute stage status），把结果 push 进 dimensions 数组
  - formatDoctorJson 会自动聚合新维度的 safe_actions（无需改 formatter 逻辑，确认维度形状与既有维度一致即可被 collect 到顶层 safe_actions）
acceptance:
  - 维度名固定为 execute-progress-plan-mismatch
  - 仅当 execute status≠completed 且 plan.md checkbox 全勾时触发；plan 未全勾或 execute 已 completed 时不告警
  - safe_action 中 action 文本含 --align-execute-progress --change <name>
verify:
  - npm test
constraints:
  - runDoctorDiagnostics 保持只读、绝不写回 db 文件（doctor-diagnostics.js line 12-18 硬约束），新增维度不得调用任何写/export/迁移/删文件操作
  - 诊断项仅 advisory（CHECK_SEVERITY.WARNING 级 safe_action 建议），不阻断任何流程，不影响 overall_status 的 critical 判定
  - 读 plan.md checkbox 复用与 task-01 alignExecuteToPlan 相同的真相源语义（- [ ]/- [x] task-NN，回退 tasks.md），不重新发明判定
  - 不改 sillyspec.db schema，不调用 ProgressManager 写方法（写操作是 task-01/task-03 的职责，本 task 只报告）
provides: []
expects_from: []
---
