---
author: flow-machine-draft
created_at: 2026-10-15T09:40:04.345Z
---
# 任务注册表（Tasks）— 2026-10-15-plan-review-focus

- [x] task-01: plan_level=light 与 full 的 plan.md 模板均含「Review Focus 盲区清单」节要求（≤5 条、按最可能坑到人排序、每条=输入/条件+合理人预期行为+承接 task 的 acceptance/测试落点；写不出显式写「已检查，无」而非留空）；plan_level=none 不含（轻量占位不加厚）
- [x] task-02: 生成分级计划步的约束含比例自检（计划产物与 spec/design 相称；implementation 塞整段可粘贴代码=转录不是计划，签名+测试断言+规格精确值承载决策）
- [x] task-03: 审查计划步 prompt 含补充复查三项：Review Focus 每行有承接测试、比例自检、共享面预扫留表（每对共享文件/契约链/依赖边的任务逐对核产出vs消费、每卡自洽；核验表进审查输出，无行的 clean 不算扫过）
- [x] task-04: docs/prompt/plan.md 派生件经提取管线同步（_extract→_sync→_verify 无新增 miss）
- [x] task-05: 变更自身测试面跑绿，lint 通过
