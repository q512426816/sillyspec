---
author: flow-machine-draft
created_at: 2026-10-02T16:32:00.440Z
---
# 决策记录（Decisions）— 2026-10-03-fr-inject-relevance-rank

## D-001@v1: 风险与死路（design 槽4 收割）
- 类型：process
- 状态：confirmed
- 答案：最大风险：注入顺序变化改变 agent 看到的规格面，理论上可能让依赖「最老 8 条」心智的既有流程预期漂移——已用既有断言全绿对冲（fr-inject-cap ②④ 零回归，⑤⑥⑦ 新口径实证）。试过放弃的方案：① 给 readActiveFrDigest 加全局排序参数——污染两个非排序消费方（dup 门要全量、rot 要原序统计），放弃；② TierB 按「最近确认」commit 日期排——需批量 git log 查 hash 日期，I/O 重且 hash 可能不在本仓历史（平台仓实测抽样 3/3 查不到），改用来源变更名内嵌日期前缀（零 I/O）。splitGwtSeparator 已知残留：括号外的「则」嵌在词内（如「原则」）仍会切分——既有语义保留（不在本变更验收面），带护栏方案需要分词，成本不成比例。
