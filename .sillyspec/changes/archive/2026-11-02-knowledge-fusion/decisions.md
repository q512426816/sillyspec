---
author: flow-machine-draft
created_at: 2026-11-02T06:55:19.943Z
---
# 决策记录（Decisions）— 2026-11-02-knowledge-fusion

## D-001@v1: 设计期风险与放弃方案（底稿）
- 类型：process
- 状态：confirmed
- 锚点：src/flow.js
- 答案：**风险**：① 热文件 scope 否决（本仓 src/flow.js 实测 15 条 rejected/deathPath，多为模板底稿）在 flow 反复出现——用独立小节 + ≤3 + 触达文件来源标注压噪，且不挤占路由 top-5；② 每消费面 45ms 图读取成本——路由命中才构建 + 进程级 memo（按 specRoot 缓存）；③ task 卡键形态杂（glob/目录）——graphPathCandidates 统一过滤，宁空不造。 **放弃的方案**：① 合并进 decisionHits 后统一 score 排序——跨通道尺度不可比（路由 Jaccard 0~1 vs scope 2/1），会让 scope 直连压掉查询相关条目；② 合并 entries 后 cap 3——路由 raw 被截断会回归 eval 与既有契约（cap 留渲染层）；③ buildKnowledgeInjection 改 async——连锁破既有同步测试与 Wave 孪生；④ cmdSearch --scope / {DECISION_HITS} 传 scope——无机器键，编造键违反 D-004；⑤ 路由命中后跑向量——破坏零网络约束与既有测试；⑥ 条件式「仅路由无 rejected 时跑 scope」——会漏「路由有 rejected 但热文件另有否决」形态且使 s-scope-03 类两跳期望消失。
