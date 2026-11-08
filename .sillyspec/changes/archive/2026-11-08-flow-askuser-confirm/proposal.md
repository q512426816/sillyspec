---
author: flow-machine-draft
created_at: 2026-11-08T03:17:55.344Z
---
# 提案书（Proposal）— 2026-11-08-flow-askuser-confirm

## 动机

任务原话转写：轻量变更确认环节改用工具问询

用户反馈：轻量变更 flow start 后的确认/批准环节，agent 用纯文字提问让用户回复，未触发 AskUserQuestion 工具。完整流程 wait 机制已有结构化问询（run --wait --json），轻量变更缺同款约束。改为在 CLI 输出与 sillyspec-flow skill 中明确要求：向用户确认/选择时使用 AskUserQuestion 呈现选项。

成功标准：
- flow start 输出的断点①（批准）提示明确要求用 AskUserQuestion 呈现摘要与选项，而非纯文字等回复
- 三断点纪律（①批准 / ②执行 / ③归档）均写明用 AskUserQuestion 征询用户
- sillyspec-flow SKILL.md 断点①段落写明 AskUserQuestion 用法（批准/需要调整/否决选项）
- test/flow-order-canon.test.mjs 与 test/flow-checkpoints.test.mjs 全绿

## 变更范围

按成功标准机械推导，共 4 条验收面：
1. flow start 输出的断点①（批准）提示明确要求用 AskUserQuestion 呈现摘要与选项，而非纯文字等回复
2. 三断点纪律（①批准 / ②执行 / ③归档）均写明用 AskUserQuestion 征询用户
3. sillyspec-flow SKILL.md 断点①段落写明 AskUserQuestion 用法（批准/需要调整/否决选项）
4. test/flow-order-canon.test.mjs 与 test/flow-checkpoints.test.mjs 全绿

## 成功标准（可验证）

1. flow start 输出的断点①（批准）提示明确要求用 AskUserQuestion 呈现摘要与选项，而非纯文字等回复
2. 三断点纪律（①批准 / ②执行 / ③归档）均写明用 AskUserQuestion 征询用户
3. sillyspec-flow SKILL.md 断点①段落写明 AskUserQuestion 用法（批准/需要调整/否决选项）
4. test/flow-order-canon.test.mjs 与 test/flow-checkpoints.test.mjs 全绿
