---
author: flow-machine-draft
created_at: 2026-09-27T11:58:27.480Z
---
# 决策记录（Decisions）— 2026-09-27-redomain

## D-001@v1: 风险与死路（design 槽4 收割）
- 类型：process
- 状态：confirmed
- 答案：最大风险：ID 前缀与域不符的历史痕迹（FR-auto-backend-019 住 platform-sync.md）——有意取舍：换号会断绑定/supersede/最近确认三条寻址链，痕迹只影响美观；INDEX 路由按域文件而非 ID 前缀，注入/rot 查询全按文件域走。次风险：syncIndexRoutingLines 全目录同步在 INDEX 手改杂行时的行为——既有函数幂等语义（既有行 no-op），风险承袭不新增。放弃方案：迁域换号+三链改写——身份重写面太大且易漏，违背 D-001 单一身份。
