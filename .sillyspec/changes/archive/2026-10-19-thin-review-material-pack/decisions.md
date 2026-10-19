---
author: flow-machine-draft
created_at: 2026-10-19T08:28:44.966Z
---
# 决策记录（Decisions）— 2026-10-19-thin-review-material-pack

## D-001@v1: 设计期风险与放弃方案（底稿）
- 类型：process
- 状态：confirmed
- 答案：最大风险：评审员把包当证据用（锚定偏差）——靠段尾基准面语义行（包=定位索引、包外查证须列明、包不足 cannot_verify）与任务书既有「材料按需 Read」预算结构对冲。已知局限：收益不可机测（review.json 不记请求数），本变更不动 review.json schema，收益定性观察。已放弃方案：复用 review-material-pack.js 的 extractDiffSummary（从活 git 解 base，与护栏③冲突且引入 verify-postcheck 依赖面）；给 review.json 加 requestsUsed 字段（schema 变更，与本变更解耦另立）。
