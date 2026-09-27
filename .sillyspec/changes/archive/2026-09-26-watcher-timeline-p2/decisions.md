---
author: flow-machine-draft
created_at: 2026-09-26T07:37:56.632Z
---
# 决策记录（Decisions）— 2026-09-26-watcher-timeline-p2

## D-001@v1: 风险与死路（design 槽4 收割）
- 类型：process
- 状态：confirmed
- 答案：最大风险=语义修正引发回归——主变更有用例钉住旧「尾部标 broken」行为，需同步改期望（该用例钉的正是误标行为，改期望即清偿本体）。放弃的方案：inferFlipTimes 直接收 tasks 勾选态做尾部判断——把渲染关注度混进纯计数函数层次更脏；按层分责（计数函数管链、渲染层管已勾缺时刻）更清晰。
