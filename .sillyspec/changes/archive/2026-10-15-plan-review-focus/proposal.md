---
author: flow-machine-draft
created_at: 2026-10-15T09:40:04.344Z
---
# 提案书（Proposal）— 2026-10-15-plan-review-focus

## 动机

任务原话转写：计划盲区清单与比例自检——对照 Superpowers writing-plans 的 Review Focus 机制补齐 plan 阶段（只改 plan.js prompt 与模板文本，不动清单单一来源与门禁代码）

动机：obra/superpowers v6.4.1 的实证是「eval 里所有实现者都在规格隐含但从未具名的输入上交付了同一个崩溃」，于是 writing-plans 增加 Review Focus 节——列出规格隐含但没有任何任务测试覆盖的输入/失效模式并逐条钉到测试；v6.4.2 再加比例自检（计划比规格长数倍且代码块占主体=转录不是计划，砍掉后计划撰写时间降到 1/4、token 到 1/3 且质量探针不退化）。我们最近的实际故障形态（如 2026-10-15-module-path-glob-match：隐含行为在全部归属判定点恒不命中、无测试承接）正是「没人想到要声明的那一面」。plan 阶段现有验收→测试覆盖矩阵只覆盖已声明的 acceptance 承接面，缺隐含盲区清单；审查清单单一来源（stage-review-checklist.js）有快照测试钉死且有字面引用面，本变更不动它，复查项直接加进 plan.js 审查步 prompt 补充节。

成功标准：
- plan_level=light 与 full 的 plan.md 模板均含「Review Focus 盲区清单」节要求（≤5 条、按最可能坑到人排序、每条=输入/条件+合理人预期行为+承接 task 的 acceptance/测试落点；写不出显式写「已检查，无」而非留空）；plan_level=none 不含（轻量占位不加厚）
- 生成分级计划步的约束含比例自检（计划产物与 spec/design 相称；implementation 塞整段可粘贴代码=转录不是计划，签名+测试断言+规格精确值承载决策）
- 审查计划步 prompt 含补充复查三项：Review Focus 每行有承接测试、比例自检、共享面预扫留表（每对共享文件/契约链/依赖边的任务逐对核产出vs消费、每卡自洽；核验表进审查输出，无行的 clean 不算扫过）
- docs/prompt/plan.md 派生件经提取管线同步（_extract→_sync→_verify 无新增 miss）
- 变更自身测试面跑绿，lint 通过

## 变更范围

按成功标准机械推导，共 5 条验收面：
1. plan_level=light 与 full 的 plan.md 模板均含「Review Focus 盲区清单」节要求（≤5 条、按最可能坑到人排序、每条=输入/条件+合理人预期行为+承接 task 的 acceptance/测试落点；写不出显式写「已检查，无」而非留空）；plan_level=none 不含（轻量占位不加厚）
2. 生成分级计划步的约束含比例自检（计划产物与 spec/design 相称；implementation 塞整段可粘贴代码=转录不是计划，签名+测试断言+规格精确值承载决策）
3. 审查计划步 prompt 含补充复查三项：Review Focus 每行有承接测试、比例自检、共享面预扫留表（每对共享文件/契约链/依赖边的任务逐对核产出vs消费、每卡自洽；核验表进审查输出，无行的 clean 不算扫过）
4. docs/prompt/plan.md 派生件经提取管线同步（_extract→_sync→_verify 无新增 miss）
5. 变更自身测试面跑绿，lint 通过

## 成功标准（可验证）

1. plan_level=light 与 full 的 plan.md 模板均含「Review Focus 盲区清单」节要求（≤5 条、按最可能坑到人排序、每条=输入/条件+合理人预期行为+承接 task 的 acceptance/测试落点；写不出显式写「已检查，无」而非留空）；plan_level=none 不含（轻量占位不加厚）
2. 生成分级计划步的约束含比例自检（计划产物与 spec/design 相称；implementation 塞整段可粘贴代码=转录不是计划，签名+测试断言+规格精确值承载决策）
3. 审查计划步 prompt 含补充复查三项：Review Focus 每行有承接测试、比例自检、共享面预扫留表（每对共享文件/契约链/依赖边的任务逐对核产出vs消费、每卡自洽；核验表进审查输出，无行的 clean 不算扫过）
4. docs/prompt/plan.md 派生件经提取管线同步（_extract→_sync→_verify 无新增 miss）
5. 变更自身测试面跑绿，lint 通过
