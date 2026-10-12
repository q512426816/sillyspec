---
author: flow-machine-draft
created_at: 2026-10-12T07:30:47.669Z
---
# 提案书（Proposal）— 2026-10-12-close-trace-freeze-integrity

## 动机

任务原话转写：平台仓 2026-10-12-ws-ref-ws-name 归档暴露收口留痕三缺陷（实证核查）：①轻量道 change.patch/change-patch.json 冻入变更工件——该变更 +137/-0 全是工件、0 行实现代码，与全量道 execute --done 沉淀资产面投影（治理工件目录不入）口径相悖，且工件喂饱冻结面掩盖了「可归属面为空」哨兵；②会话专属 worktree 内实现提交不在 baseline..HEAD 祖先链时漏出冻结面——4 个前端文件 +38/-10 实现完全未留痕；③worktree apply 重放改写 SHA 后不回写归档锚点——change-patch.json 的 baseline/head（c74958a1/40622e03）在主仓对象库悬空，git diff 不可解析，同日五个姊妹变更同病。

成功标准：
- 轻量道收口冻结面剔除 .sillyspec/changes/ 全子树（含本变更目录的提交面与工作树件），保留 .sillyspec/docs/ 交付文档——与 execute --done 沉淀资产面口径对齐；交付面为空时保留显式空面提示
- 会话专属 worktree 内 flow done：worktree 存在冻结面外的交付面增量（HEAD 祖先链之外的提交或未处置脏文件）时阻断收口并给出处置指引
- worktree apply 重放后：归档 change-patch.json 的 baseline/head 与 scopeAudit.baseAnchor 回写为主仓可解析锚点，change.patch 以主仓锚点重冻结且 patchSha256 同步重锚
- 既有测试面全绿，新增直测覆盖上述三组行为

## 变更范围

按成功标准机械推导，共 4 条验收面：
1. 轻量道收口冻结面剔除 .sillyspec/changes/ 全子树（含本变更目录的提交面与工作树件），保留 .sillyspec/docs/ 交付文档——与 execute --done 沉淀资产面口径对齐；交付面为空时保留显式空面提示
2. 会话专属 worktree 内 flow done：worktree 存在冻结面外的交付面增量（HEAD 祖先链之外的提交或未处置脏文件）时阻断收口并给出处置指引
3. worktree apply 重放后：归档 change-patch.json 的 baseline/head 与 scopeAudit.baseAnchor 回写为主仓可解析锚点，change.patch 以主仓锚点重冻结且 patchSha256 同步重锚
4. 既有测试面全绿，新增直测覆盖上述三组行为

## 成功标准（可验证）

1. 轻量道收口冻结面剔除 .sillyspec/changes/ 全子树（含本变更目录的提交面与工作树件），保留 .sillyspec/docs/ 交付文档——与 execute --done 沉淀资产面口径对齐；交付面为空时保留显式空面提示
2. 会话专属 worktree 内 flow done：worktree 存在冻结面外的交付面增量（HEAD 祖先链之外的提交或未处置脏文件）时阻断收口并给出处置指引
3. worktree apply 重放后：归档 change-patch.json 的 baseline/head 与 scopeAudit.baseAnchor 回写为主仓可解析锚点，change.patch 以主仓锚点重冻结且 patchSha256 同步重锚
4. 既有测试面全绿，新增直测覆盖上述三组行为
