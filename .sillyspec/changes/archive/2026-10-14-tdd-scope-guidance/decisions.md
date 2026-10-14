---
author: flow-machine-draft
created_at: 2026-10-14T01:19:56.123Z
---
# 决策记录（Decisions）— 2026-10-14-tdd-scope-guidance

## D-001@v1: 风险与死路（design 槽4 收割）
- 类型：process
- 状态：confirmed
- 答案：最大风险：措辞过宽导致 agent 把「样式不写」误推到「前端不写」——用一句话判据收口判断，行为契约层明示组件/API 皆然。试过放弃：改 src/flow.js 测试门逻辑（按层机器豁免测试面）——放弃，层归属需人判，机器判会误伤（quick-audit 既有「0 测试改动」advisory 已覆盖提示职责）；本变更只动引导不动门。
