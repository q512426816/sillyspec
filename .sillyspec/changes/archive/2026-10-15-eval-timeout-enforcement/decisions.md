---
author: flow-machine-draft
created_at: 2026-10-15T15:38:17.778Z
---
# 决策记录（Decisions）— 2026-10-15-eval-timeout-enforcement

## D-001@v1: 设计期风险与放弃方案（底稿）
- 类型：process
- 状态：confirmed
- 答案：- 风险：强制 settle 后 stdout 尾部内容可能缺失（孤儿还在写）——接受：timeout 语义下输出本就不完整，timedOut=true 让消费方按失败处理。 - 次风险：spawnSync taskkill 在极少数权限形态下失败——child.kill 兜底 + 宽限强制 settle 双保险保证绑定上界。 - 死路：仅靠 fire-and-forget taskkill（现行实现）——实测树存活 10 分钟，证伪。 - **收口前零回归实测回填（task-03 证据）**：dry-run 管道 --force 全量重跑 10 臂全绿（5 任务 × 2 臂，含 runner verify 走 spawnCapture 的修复面）：A 臂 5/5、B 臂 3/5（mixed 形态与 004/005 奇偶规则一致）、hash=d400e749d374 不变；npm run lint 1007 文件绿；变更自身测试 2/2。
