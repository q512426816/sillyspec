---
author: flow-machine-draft
created_at: 2026-10-15T02:40:39.716Z
---
# 提案书（Proposal）— 2026-10-15-graph-registry-domain-split

## 动机

任务原话转写：效果评估实证：图簇 _unmapped 大簇 2183 个文件节点是伪信号——本 spec 树管理多仓（projects/ 登记 backend/frontend/sillyhub-daemon/SillyHub 等）而模块卡单仓，跨仓交付路径（frontend/** 491、backend/** 470、sillyhub-daemon/** 206 等 1220 个）与 本仓 test 面 421 个无模块卡可挂，全被塞进 _unmapped 掩盖真缺口。修法：graphNodeDomain 增两级归属——登记仓前缀（projects/*.yaml name 字段，最长前缀+大小写不敏感，SillyHub 登记名 vs sillyhub/ 路径实证）归登记仓簇、本仓 test/tests/ 面归 _tests；残余 _unmapped 只剩真无归属（真图 2183→761，全是 module-map 覆盖可行动缺口）。同变更留痕 C5/D3 缓办裁决（decisions/unmapped.md 285KB 拆分=决策 id 寻址键全体漂移的 renumber 级风险 vs 只读稳定池；fr-unmapped 存量退休在 L3 冻结后无消费方）入 known-issues。

成功标准：
- projects/ 登记仓名前缀（含大小写异形）归属登记仓簇；test 面归 _tests；无登记目录 fail-soft 原行为
- 真图 _unmapped 2183→761（frontend/backend/sillyhub-daemon/SillyHub 簇浮出），图谱既有 13 测试零回归
- 新增四态归簇测试全绿；C5/D3 缓办裁决入 known-issues 且 validate 绿

## 变更范围

按成功标准机械推导，共 3 条验收面：
1. projects/ 登记仓名前缀（含大小写异形）归属登记仓簇；test 面归 _tests；无登记目录 fail-soft 原行为
2. 真图 _unmapped 2183→761（frontend/backend/sillyhub-daemon/SillyHub 簇浮出），图谱既有 13 测试零回归
3. 新增四态归簇测试全绿；C5/D3 缓办裁决入 known-issues 且 validate 绿

## 成功标准（可验证）

1. projects/ 登记仓名前缀（含大小写异形）归属登记仓簇；test 面归 _tests；无登记目录 fail-soft 原行为
2. 真图 _unmapped 2183→761（frontend/backend/sillyhub-daemon/SillyHub 簇浮出），图谱既有 13 测试零回归
3. 新增四态归簇测试全绿；C5/D3 缓办裁决入 known-issues 且 validate 绿
