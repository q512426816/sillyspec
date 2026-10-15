---
author: flow-machine-draft
created_at: 2026-10-15T02:10:35.734Z
---
# 决策记录（Decisions）— 2026-10-15-supersedes-ghost-nodes

## D-001@v1: 风险与死路（design 槽4 收割）
- 类型：process
- 状态：confirmed
- 答案：最大风险：幽灵合成放宽跨变更同号引用=2026-10-14-supersedes-mislink 误连复活（换皮）——首版实现确实踩了此坑（无条件合成），被既有测试②「跨变更同号不建边」拦下后收紧为自身版本链口径；该防护测试零回归是本变更验收项。次风险：幽灵节点混入 nodes --search 结果被 agent 当真实条目消费——label 带「（已被 X 取代）」+status=superseded 双标识；幽灵无 anchors/FR 边不进 impact 的决策锚定面，只经 supersedes 传递边可达。放弃方案：①蒸馏保留旧版本段为 superseded 形态（改文件契约，全消费面重审——量级不成比例）；②只在 impact 查询时动态解析 supersedesText（闭包/summary/orphans 各消费点重复解析，不如建图时一次合成）；③把 supersedesText 引用当悬空注记显示（不建边则传递闭包/防复潮可达集全部受益为零，问题实质未解）。
