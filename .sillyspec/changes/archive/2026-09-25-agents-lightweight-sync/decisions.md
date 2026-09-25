---
author: flow-machine-draft
created_at: 2026-09-25T09:33:26.335Z
---
# 决策记录（Decisions）— 2026-09-25-agents-lightweight-sync

## D-001@v1: 风险与死路（design 槽4 收割）
- 决策：最大风险：同步时误伤其余条目，或写入与 CLI 实际行为不符的描述（指引比 CLI 更危险）。对冲：FR-04 约束其余逐字不动并以 git diff 核对；文案引用的每个 flag/默认值逐一 grep 源码验证在场。放弃的方案：用模板整体覆盖 AGENTS.md——放弃理由：本仓 AGENTS.md 含本仓专属积累（第 18 条 git 纪律详版实证、第 19 条会话身份纪律），模板无这些内容，覆盖会丢失。
