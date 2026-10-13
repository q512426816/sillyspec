---
author: flow-machine-draft
created_at: 2026-10-13T08:19:02.460Z
---
# 决策记录（Decisions）— 2026-10-13-flow-diff-cmd

## D-001@v1: 风险与死路（design 槽4 收割）
- 类型：process
- 状态：confirmed
- 答案：最大风险：活跃态与归档态数字对不上造成困惑——活跃实时算含未提交 dirty 面，归档件只含冻结时点面，收口前后同命令数字必然不同。缓解：输出显式标 mode（active/archived）与 state（committed/dirty），dirty 面单列不混入合计口径歧义（合计含 dirty 并注明）。次风险：untracked 大文件按行数统计的 IO——单文件读行数成本可忽略，排除目录级扫描（只 stat porcelain 列出的文件）。试过放弃的方案：①复用 worktree diff 的通道——那是 worktree 元数据驱动的另一族（需 --base 手给），变更名直查语义不符；②活跃态也走冻结件（flow done 时预写轻量 json）——给只读查询加写面违背最小侵入，且收口前就要维护第二份真相源；③顺带做「计划外」verdict 对账（活跃态比 design 声明面）——有价值但属收口门职责（夹带嫌疑 advisory 已有），查询口不越权，留后续。均否。
