---
author: flow-machine-draft
created_at: 2026-10-14T03:52:53.512Z
---
# 决策记录（Decisions）— 2026-10-14-redomain-domain-arg-normalize

## D-001@v1: 风险与死路（design 槽4 收割）
- 类型：process
- 状态：confirmed
- 答案：最大风险：真实域名以 `fr/` 开头被误剥——由作用域分析排除（裸名不含 `/`）。放弃方案 A（只改 `fr-index.js` 提示语为裸域名）：手工输入仍会带前缀（记忆惯性 + 历史文档/提示语已发出的前缀形态），且修的是提示不是根因；放弃方案 B（只在 CLI 端做字符串处理不进库）：平台「一键迁移」等未来调用方绕过 CLI 直接调库时缺口复现，库层防御缺失。
