---
author: flow-machine-draft
created_at: 2026-11-13T13:36:46.471Z
---
# 提案书（Proposal）— 2026-11-13-brainstorm-solution-constraint-gate

## 动机

任务原话转写：头脑风暴方案须逐条满足约束，禁止凑数

动机与背景：头脑风暴「提出 2-3 种方案」步骤当前只要求列核心思路/优劣并给推荐，未要求每个候选方案满足前置阶段已确认的硬约束（[用户] 需求点、decisions.md 中 accepted 的 normalized_requirement、用户硬边界）。实证表现为备选方案像凑数、用户实际只能选推荐方案。本次在 prompt 中增加硬约束准入门槛、单方案如实上报规则与提交前自检表。

成功标准：
- src/stages/brainstorm.js「提出 2-3 种方案」步骤 prompt 新增硬约束准入门槛：每个候选方案必须逐条满足已确认需求点（[用户]）、decisions.md 中 status=accepted 的 normalized_requirement 与用户硬边界，不满足者不得列入对比表
- 仅 1 个方案满足全部硬约束时，如实只报 1 个并列出淘汰方案各自违反的约束编号，禁止凑数补到 2-3 个
- 约束间真实冲突时先提出冲突与取舍建议，禁止构造故意违反约束的假选项
- 新增提交前自检表（逐方案×逐约束打勾、取舍轴差异检查）
- node docs/prompt/_extract.mjs 刷新 _extracted.json，docs/prompt/brainstorm.md 镜像逐字同步
- 相关测试用例跑绿且覆盖上述新规则文案

## 变更范围

按成功标准机械推导，共 6 条验收面：
1. src/stages/brainstorm.js「提出 2-3 种方案」步骤 prompt 新增硬约束准入门槛：每个候选方案必须逐条满足已确认需求点（[用户]）、decisions.md 中 status=accepted 的 normalized_requirement 与用户硬边界，不满足者不得列入对比表
2. 仅 1 个方案满足全部硬约束时，如实只报 1 个并列出淘汰方案各自违反的约束编号，禁止凑数补到 2-3 个
3. 约束间真实冲突时先提出冲突与取舍建议，禁止构造故意违反约束的假选项
4. 新增提交前自检表（逐方案×逐约束打勾、取舍轴差异检查）
5. node docs/prompt/_extract.mjs 刷新 _extracted.json，docs/prompt/brainstorm.md 镜像逐字同步
6. 相关测试用例跑绿且覆盖上述新规则文案

## 成功标准（可验证）

1. src/stages/brainstorm.js「提出 2-3 种方案」步骤 prompt 新增硬约束准入门槛：每个候选方案必须逐条满足已确认需求点（[用户]）、decisions.md 中 status=accepted 的 normalized_requirement 与用户硬边界，不满足者不得列入对比表
2. 仅 1 个方案满足全部硬约束时，如实只报 1 个并列出淘汰方案各自违反的约束编号，禁止凑数补到 2-3 个
3. 约束间真实冲突时先提出冲突与取舍建议，禁止构造故意违反约束的假选项
4. 新增提交前自检表（逐方案×逐约束打勾、取舍轴差异检查）
5. node docs/prompt/_extract.mjs 刷新 _extracted.json，docs/prompt/brainstorm.md 镜像逐字同步
6. 相关测试用例跑绿且覆盖上述新规则文案
