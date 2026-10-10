---
author: flow-machine-draft
created_at: 2026-10-10T00:51:47.219Z
---
# 决策记录（Decisions）— 2026-10-10-brainstorm-skill-title

## D-001@v1: 风险与死路（design 槽4 收割）
- 类型：process
- 状态：confirmed
- 答案：最大风险：指引与 CLI 实际提取规则不一致（如 agent 误以为 brainstorm 另有 --title 参数）。对策：文案锚定真实机制（H1 前缀剥除后取简述），并保留 design.md 固定格式 `# 设计文档（Design）— <简述>` 的既有 CLI 强制要求不重复改写。放弃方案：改 src/stages/brainstorm.js 的 step prompt 同步加字数口径——用户诉求限定在 skill 层，CLI prompt 层不在本变更面（后续需要可另起变更）。
