---
author: flow-machine-draft
created_at: 2026-10-05T14:33:24.294Z
---
# 提案书（Proposal）— 2026-10-05-flow-help-status

## 动机

任务原话转写：flow --help 用法行只列 start/done 两个子命令，但 flow status 是实际存在的查看/恢复面（src/flow.js:1764），且 flow.js 多处输出引导用户使用它（如『随时可查进度：sillyspec flow status --change <名>』）。帮助面与实际能力不一致，新用户从帮助发现不了恢复入口。

成功标准：
- src/flow.js 的 flow 用法行包含 flow status --change <名> 子命令提示
- 测试断言用法行包含 flow status 提示
- 相关测试全部通过

## 变更范围

按成功标准机械推导，共 3 条验收面：
1. src/flow.js 的 flow 用法行包含 flow status --change <名> 子命令提示
2. 测试断言用法行包含 flow status 提示
3. 相关测试全部通过

## 成功标准（可验证）

1. src/flow.js 的 flow 用法行包含 flow status --change <名> 子命令提示
2. 测试断言用法行包含 flow status 提示
3. 相关测试全部通过
