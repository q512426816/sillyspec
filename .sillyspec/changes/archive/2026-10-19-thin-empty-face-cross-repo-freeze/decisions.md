---
author: flow-machine-draft
created_at: 2026-10-19T08:47:52.136Z
---
# 决策记录（Decisions）— 2026-10-19-thin-empty-face-cross-repo-freeze

## D-001@v1: 设计期风险与放弃方案（底稿）
- 类型：process
- 状态：confirmed
- 锚点：src/flow.js
- 答案：最大风险：JSON-only 形态对下游读方是新语义——若某读方仍假设「change.patch 必在场」会误判缺件；本次已同步改本仓存在性复查与 verify 回执，平台读侧由后续独立变更适配（消费 repos 元数据）。放弃方案：①把跨仓正文拼进 change.patch——混仓 diff 的 hunk 会按主仓路径解析，读方错位；②对「全规范跨仓标注+空面」直接阻断要求签收——该工作区跨仓交付是常态，阻断等于对常态路径收税，且不产生审计证据。 **已声明的边界（显式裁决面）**：冻结面归属是文件级而非 hunk 级——baseline..HEAD 中并行会话对同一文件的提交会以整文件 diff 混入本变更 change.patch（本仓本轮实证：2026-10-19-thin-order-canon 对 `src/flow.js` 的改动混入）。缓解：AGENTS.md 规则 11 的显式 pathspec 提交保证本变更自身提交只含自身 hunks；收口评审按 git log/show 核对归属。彻底修复（按归属提交逐笔生成 patch）会改变所有 thin 变更的冻结口径，需独立变更立项，不在本次范围。另：`change-patch.json` 损坏时即使 change.patch 在场也判缺件（元数据不可信 → 重冻结），JSON-only 重冻结会清理残留的旧 change.patch。
