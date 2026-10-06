---
author: flow-machine-draft
created_at: 2026-10-06T14:23:44.799Z
---
# 决策记录（Decisions）— 2026-10-06-status-multi-active-list

## D-001@v1: 风险与死路（design 槽4 收割）
- 类型：process
- 状态：confirmed
- 答案：最大风险：幽灵行刷屏——DB 残留大量 status='active' 但目录早已不在的行时，清单较长且多数标「本地无目录」。可接受：这正是 DB 真相，且 doctor --cleanup-remnant 是既有清幽灵通道，本分支只负责如实展示。放弃的方案：①在 listChanges（库函数）里过滤无目录行——污染库语义，DB 行与目录存在性是两个真相层，别处依赖 DB 口径；②改 read() 让多活跃返回特殊值——动核心推导语义，调用方十余处，风险与收益不成比例；③清单截断加「其余 N 个略」——现实活跃数是个位数到两位数，截断只省屏幕不省正确性，反藏信息。
