# 符号影响面报告（symbol-impact）

变更：2026-08-20-task-truth-unify ｜ 扫描时间：2026-08-20 12:30 ｜ 扫描方式：逐卡修改文件 × class 构造参数/interface/DTO/API 签名四类变更检查

| task | 修改文件 | 签名级变更 | 影响符号 | 消费方与适配 |
|---|---|---|---|---|
| task-01 | （无 src 改动，分析型） | 无 | — | — |
| task-02 | src/stages/execute.js | **有**：`validatePlanForExecute(planContent)` → `validatePlanForExecute(tasksContent, planContent)`，返回结构扩展 `{tasks[{id,name,done,model,dependsOn}], waves}` | validatePlanForExecute | 唯一运行时调用方 src/run/gates.js（同卡迁移）；test/ 既有引用该函数的测试（task-04 适配） |
| task-02 | src/run/gates.js | 无（内部函数签名不动，仅数据源迁移） | extractTaskIdsFromPlan / isCurrentWaveAllNoDepsVerify / enforceReviewJsonGate | 卡内适配 |
| task-02 | src/run/complete.js | 无（函数签名不动，写入目标迁移） | autoCheckPlanFromReviews / detectExecuteBatchFinish | 卡内适配；锁文件名 .plan.md.lock→.tasks.md.lock |
| task-03 | 九文件（task-review/progress/doctor-diagnostics/taskcard/contract-matrix/run-prompt/shared/plan-postcheck/plan.js） | 无（导出签名均不动，仅解析源迁移） | parseTaskIdsFromPlan / countPlanCheckboxes / readPlanCheckboxStatus / alignExecuteToPlan / parseTaskDependencies / parseTaskCount / parseTaskNames 等 | 各文件既有测试（task-04/06 回归） |
| task-04 | test/ | 无（测试文件） | — | — |
| task-05 | 六 stages 文件 | 无（提示词字符串，无代码符号） | — | docs/prompt 镜像再生（task-06） |
| task-06 | docs/.claude/skills/模块文档 | 无（纯文档） | — | — |

结论：唯一签名级变更为 validatePlanForExecute 参数与返回结构（task-02），消费方唯一（gates.js:355）+ 测试引用（task-04 适配），无跨模块隐式消费。
