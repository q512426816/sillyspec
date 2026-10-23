---
author: flow-machine-draft
created_at: 2026-10-23T15:51:32.800Z
---
# 决策记录（Decisions）— 2026-10-23-push-plan-anchor-batch-perf

## D-001@v1: 设计期风险与放弃方案（底稿）
- 类型：process
- 状态：confirmed
- 答案：- 最大风险：短哈希解析映射错位（批量回显的是完整 sha，输入是短哈希）——按输入序对齐而非按回显内容对齐，测试锚钉短哈希解析成功形态。 - 死路 1：用 `rev-list HEAD` 全集 + 本地 Set 判祖先——sound 性不足（topo 序不判传递闭包）或全集过大，且 is-ancestor 语义（相等=真）需特判，放弃；只批量化「可解析性」，祖先判定维持逐 live 锚 spawn（live 少，成本可忽略）。 - 死路 2：改 git-helper 的 batchCatFileExists 契约——它被归档锚点校验消费（按回显 sha 作键），改键序影响既有消费方；push.js 内做输入序对齐的本地批量，不动公共契约。
