---
author: flow-machine-draft
created_at: 2026-10-23T06:43:07.486Z
---
# 决策记录（Decisions）— 2026-10-23-rename-platform-tombstone

## D-001@v1: 设计期风险与放弃方案（底稿）
- 类型：process
- 状态：confirmed
- 答案：- 最大风险：'deleted' 墓碑让平台旧名进入已删判据（`_change_key_deleted` 拒收复活）——日后若想复用旧名会 409。评估：自动建名含 4 字节随机 hex 撞名概率可忽略；「弃名不复活」正是本变更目的（对齐坑9 后平台已删 key 拒收先例）。 - 死路①：平台加 'renamed' 语义/端点——需跨仓（multi-agent-platform backend）改 `_apply_cli_tombstone` 与已删判据，收益仅是变更中心显示「已改名」而非「已删除」，放弃（最小修复、单仓闭环）。 - 死路②：renameChange 内直推平台 rename 载荷——库函数引入网络 IO 破坏分层（现有删除/归档也不直推，走 triggerSync 异步链），放弃。
