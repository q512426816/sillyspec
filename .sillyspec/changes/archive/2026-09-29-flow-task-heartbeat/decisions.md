---
author: flow-machine-draft
created_at: 2026-09-29T06:48:55.777Z
---
# 决策记录（Decisions）— 2026-09-29-flow-task-heartbeat

## D-001@v1: 风险与死路（design 槽4 收割）
- 类型：process
- 状态：confirmed
- 答案：最大风险：心跳仍被 agent 无视（不轮询 status 直接干完）——与 openspec 同款的软约束边界，诚实披露：openspec 的剧本约束同样不强制（其 skill 文本也只是指令）；缓解=三处协议文案钉死+AGENTS.md 常驻面+哨兵硬门兜底真伪。弃案1：把「逐个勾」升为 flow done 时序硬门（勾选时刻与证据时刻配对核验）——误伤合法场景（一提交携带多 task token 是规范动作，时序配对会把正常批量提交判假）；逐 task 证据哨兵已存在故不再加码。弃案2：新增独立 flow next 子命令——与 status 职责重叠，AGENTS.md/恢复简报已统一指 status，多一个入口徒增记忆面。
