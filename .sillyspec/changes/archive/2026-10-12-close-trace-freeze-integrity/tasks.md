---
author: flow-machine-draft
created_at: 2026-10-12T07:30:47.669Z
---
# 任务注册表（Tasks）— 2026-10-12-close-trace-freeze-integrity

- [x] task-01: 轻量道收口冻结面剔除 .sillyspec/changes/ 全子树（含本变更目录的提交面与工作树件），保留 .sillyspec/docs/ 交付文档——与 execute --done 沉淀资产面口径对齐；交付面为空时保留显式空面提示
- [x] task-02: 会话专属 worktree 内 flow done：worktree 存在冻结面外的交付面增量（HEAD 祖先链之外的提交或未处置脏文件）时阻断收口并给出处置指引
- [x] task-03: worktree apply 重放后：归档 change-patch.json 的 baseline/head 与 scopeAudit.baseAnchor 回写为主仓可解析锚点，change.patch 以主仓锚点重冻结且 patchSha256 同步重锚
- [x] task-04: 既有测试面全绿，新增直测覆盖上述三组行为
