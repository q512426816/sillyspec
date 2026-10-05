---
author: flow-machine-draft
created_at: 2026-10-05T00:53:11.072Z
---
# 决策记录（Decisions）— 2026-10-05-knowledge-stats-freshness

## D-001@v1: 风险与死路（design 槽4 收割）
- 类型：process
- 状态：confirmed
- 答案：最大风险：口径混淆——若 lastEventAt 误用窗口内记录（buildHitMatrix 的 records），`--since-days 7` 时「数据截至」会显示 7 天内最新而非全量最新，读数失真。对策：函数只收 runtimeDir 不收窗口参数，类型签名层面杜绝窗口口径混入。 试过放弃：复用 matrix[0].lastHitAt（最高命中文件的最近命中）——它是窗口内且按文件聚合的口径，最高命中文件未必是最近写入的文件，且窗口截断失真，放弃。
