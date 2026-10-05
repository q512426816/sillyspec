---
author: flow-machine-draft
created_at: 2026-10-05T13:57:42.846Z
---
# 决策记录（Decisions）— 2026-10-05-tests-confirm-hint

## D-001@v1: 风险与死路（design 槽4 收割）
- 类型：process
- 状态：confirmed
- 答案：最大风险：提示语与实现将来再度漂移（实现改形态而提示没跟）——已加源级回归测试锁定形态一致性，漂移即测试红。放弃的方案：index.js 兼容子命令形态（解析 tests 后首个位置参数 confirm）——双形态长期并存扩大漂移面，且与既有 fail 文案（教 flag 形态）冲突。已弃。
