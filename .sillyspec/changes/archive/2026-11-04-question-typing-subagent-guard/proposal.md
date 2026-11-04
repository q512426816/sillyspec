---
author: flow-machine-draft
created_at: 2026-11-04T06:54:06.461Z
---
# 提案书（Proposal）— 2026-11-04-question-typing-subagent-guard

## 动机

任务原话转写：提问分型与子代理豁免两处提示词修正
头脑风暴提问规则一刀切（多选题优于开放式问题）会锚定用户意图表达，与 superpowers 7.0.2 盲测结论相悖（意图类给选项会诱导用户）；AGENTS.md 缺子代理豁免条款，被派发子代理可能自作主张跑流程命令（superpowers #2536 同型实证）。

成功标准：
- brainstorm.js 提问规则分型：意图/动机类开放式不附选项，决策类具名选项+必带推荐，原一刀切措辞移除
- 仓库 AGENTS.md 与 templates/agents-instruction.md 同步含子代理豁免条款（子代理不跑流程命令，状态归主会话）
- 既有测试面全绿

## 变更范围

按成功标准机械推导，共 3 条验收面：
1. brainstorm.js 提问规则分型：意图/动机类开放式不附选项，决策类具名选项+必带推荐，原一刀切措辞移除
2. 仓库 AGENTS.md 与 templates/agents-instruction.md 同步含子代理豁免条款（子代理不跑流程命令，状态归主会话）
3. 既有测试面全绿

## 成功标准（可验证）

1. brainstorm.js 提问规则分型：意图/动机类开放式不附选项，决策类具名选项+必带推荐，原一刀切措辞移除
2. 仓库 AGENTS.md 与 templates/agents-instruction.md 同步含子代理豁免条款（子代理不跑流程命令，状态归主会话）
3. 既有测试面全绿
