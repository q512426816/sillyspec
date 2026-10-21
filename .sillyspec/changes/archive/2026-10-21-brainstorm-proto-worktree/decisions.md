---
author: flow-machine-draft
created_at: 2026-10-21T06:16:30.693Z
---
# 决策记录（Decisions）— 2026-10-21-brainstorm-proto-worktree

## D-001@v1: 设计期风险与放弃方案（底稿）
- 类型：process
- 状态：confirmed
- 答案：最大风险：豁免面覆盖 verify 阶段——「verify 只审查不改码」的软约束在 worktree 内被放开。判定：可接受。Bash 侧对 worktree 内 cwd 本就无条件放行（echo > 即可写文件），Write/Edit 门与 Bash 门不一致才是现状异常；隔离区内改动不进主树、apply 有 allowlist 门把交付面，风险有双层兜底。 放弃案①：按变更活跃态收窄（仅 DB status='active' 的变更 worktree 放行）——放弃：hook 无法知道当前 agent 属于哪个 change，只能按路径判；且归档残留 worktree 的可写性与 Bash 侧对齐更可预期，引入 DB 活跃态判断反而制造两门不一致窗口。 放弃案②：给 brainstorm 加专用声明（如 proto-worktree flag/mode）——放弃：多一层声明状态要维护，收益只是名义上的「阶段纯度」；位置豁免一条规则覆盖全部非 execute 阶段，且与 Bash 侧策略同构。 放弃案③：只改 STAGE_HINTS 指引不动豁免（纯文档）——放弃：hooked harness 里 agent 被拦后按指引进了 worktree 仍被 :808 阶段门拦死，指引成死路，问题没解。
