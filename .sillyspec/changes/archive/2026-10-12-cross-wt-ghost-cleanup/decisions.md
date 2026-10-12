---
author: flow-machine-draft
created_at: 2026-10-12T07:06:28.546Z
---
# 决策记录（Decisions）— 2026-10-12-cross-wt-ghost-cleanup

## D-001@v1: 风险与死路（design 槽4 收割）
- 类型：process
- 状态：confirmed
- 答案：最大风险：归档链新增跨仓兜底扩大了归档时的作用面——若 local.yaml 注册了路径失效的仓，归档会多出警告噪音（不阻断）。缓解：兜底对仓不可达/git 失败一律 fail-open 警告；清理对象仅限本变更名下可寻址的跨仓 worktree。 试过但放弃的方案： - 「归档链直接对 repos 各仓无条件 prune」——放弃：会把与 sillyspec 无关的用户自建 worktree 注册也纳入归档动作面，作用域过宽；收敛为只清本变更名下可寻址项 + doctor 提供全仓扫描（doctor 是显式诊断入口，作用面宽可接受，归档是热路径必须窄）。 - 「cleanupCrossWorktrees 里对 locked 条目自动 unlock 后强清」——放弃：locked 是用户显式保护（跨盘挂载场景防误删），自动解除违背保护意图；只提示，用户裁决。 - 「给 listCrossWorktreeMetas 增加无 meta 兜底枚举（目录已删也入列）」——放弃：迭代源三源都靠 meta/注册表键寻址，目录已删且键已回收时无锚可举；该形态只能从跨仓仓注册面反扫（doctor），与其在 cleanup 链加不可能完备的枚举，不如把 doctor 网做实。
