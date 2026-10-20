---
author: flow-machine-draft
created_at: 2026-10-20T02:06:01.406Z
---
# 提案书（Proposal）— 2026-10-20-thin-user-decision-record

## 动机

任务原话转写：轻量道执行期用户决策当场落盘提示

动机与背景：轻量道执行期用户口头给决策方向（方案取舍/否决/兼容性定调）时无任何落盘纪律——会话内容不可审计，漏记是静默价值漏损（防复潮资产丢失、跨变更复潮无防）。厚流程 brainstorm 有「方案选择必须随答随落盘」纪律，轻量道横幅与执行期触点均无对应提示。本变更把纪律前置到三个 agent 触点：start 横幅一行、断点②汇报对账半句、task tick 条件提示（decisions.md 缺席时）。任务原话：横幅一行 + 断点②半句 + tick 条件提示 + 对应测试。

成功标准：
- flow start 横幅含执行期用户决策落盘纪律行（含 decisions add 命令样例与承诺面同步提示）
- 断点②行含汇报对账半句（执行期用户决策随汇报对账，无则说明无）
- task tick 回显在 decisions.md 缺席时附落盘提示行，decisions.md 在场时零新增行（条件 gating，纯提示不阻断不改 exit code）
- 新增测试套件覆盖以上三面且全绿；既有 approve-gate-tick / task-tick / flow-checkpoints / flow-order-canon 套件零回归

## 变更范围

按成功标准机械推导，共 4 条验收面：
1. flow start 横幅含执行期用户决策落盘纪律行（含 decisions add 命令样例与承诺面同步提示）
2. 断点②行含汇报对账半句（执行期用户决策随汇报对账，无则说明无）
3. task tick 回显在 decisions.md 缺席时附落盘提示行，decisions.md 在场时零新增行（条件 gating，纯提示不阻断不改 exit code）
4. 新增测试套件覆盖以上三面且全绿；既有 approve-gate-tick / task-tick / flow-checkpoints / flow-order-canon 套件零回归

## 成功标准（可验证）

1. flow start 横幅含执行期用户决策落盘纪律行（含 decisions add 命令样例与承诺面同步提示）
2. 断点②行含汇报对账半句（执行期用户决策随汇报对账，无则说明无）
3. task tick 回显在 decisions.md 缺席时附落盘提示行，decisions.md 在场时零新增行（条件 gating，纯提示不阻断不改 exit code）
4. 新增测试套件覆盖以上三面且全绿；既有 approve-gate-tick / task-tick / flow-checkpoints / flow-order-canon 套件零回归
