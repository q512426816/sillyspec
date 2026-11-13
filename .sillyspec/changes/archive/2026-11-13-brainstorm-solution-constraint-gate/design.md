---
author: flow-machine-draft
created_at: 2026-11-13T13:36:46.471Z
---
# 设计记录（Design Record）— 2026-11-13-brainstorm-solution-constraint-gate

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

只改 `src/stages/brainstorm.js` 中「提出 2-3 种方案」步骤的 `definition.steps[].prompt`：在「操作」开头新增第 0 步「先固守约束」——把前置阶段 `[用户]` 需求点、`decisions.md` 中 accepted 的 `normalized_requirement`、用户硬边界汇总为编号硬约束清单 C1..Cn，作为候选方案的准入门槛；补充单方案如实上报、约束冲突处理、提交前自检表三段规则。随后运行 `node docs/prompt/_extract.mjs` 刷新提取产物并逐字同步 `docs/prompt/brainstorm.md`，新增测试锁住新文案。不改 CLI 代码路径、不改步骤名/waitOptions/输出契约。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

无对外可见的函数签名、命令、文件格式变化。变化面仅限 `definition.steps[].prompt` 的提示词文本（同一 step 的 name / requiresWait / waitReason / waitOptions / outputHint 均保持不变）；`docs/prompt/_extract.mjs` 的输入输出结构不变。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？

成立。提示词本身无状态；重新进入本步骤时硬约束清单从当前 `decisions.md` 最新版本与需求清单重算，增量落盘规则保证已确认决策不因会话中断丢失。

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？

改动仅涉及文本文件；多会话各自变更目录隔离，`docs/prompt/*` 冲突时按最新源码重跑 `_extract.mjs` 再生，不手工合并。

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？

安全。会话中断后重入本步骤，按 `D-xxx@vN` 最新版本重算约束；已记 rejected 的落选方案不复活（复潮条件未满足时不得重新提出）。

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？

不会。纯提示词与仓内文档，无跨工作区/跨仓运行时数据，不涉及多实例串台。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

最大风险是方案步骤提示词变长导致模型注意力稀释，以及规则过严让方案讨论僵硬。缓解：新规则集中在同一节、措辞紧凑；保留「单方案如实上报」合法出口，避免为满足 2-3 个数量而造假；自检表用表格化短句。

放弃的方案：在 CLI 侧解析 agent 输出的方案对比表做硬校验——LLM 输出形态不稳定，解析脆弱、误报成本高，且本变更目标是流程约束而非产物格式强校验，故不采用。

## 文件变更清单

| 操作 | 路径 | 说明 |
|---|---|---|
| 修改 | src/stages/brainstorm.js | 「提出 2-3 种方案」prompt 增加硬约束准入、单方案上报、冲突处理、自检表 |
| 新增 | test/brainstorm-solution-constraint-gate.test.mjs | 断言新规则文案与镜像同步 |
| 修改 | docs/prompt/_extracted.json | 提取脚本再生的镜像数据 |
| 修改 | docs/prompt/brainstorm.md | 提示词正文逐字同步 |
