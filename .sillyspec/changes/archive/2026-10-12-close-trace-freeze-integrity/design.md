---
author: flow-machine-draft
created_at: 2026-10-12T07:30:47.669Z
---
# 设计记录（Design Record）— 2026-10-12-close-trace-freeze-integrity

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

平台仓 2026-10-12-ws-ref-ws-name 归档取证暴露收口留痕链三处缺陷，本变更一次清偿：工件入 patch（口径与全量道不一致+掩盖空面哨兵）、会话 worktree 孤儿提交漏冻、apply 后锚点悬空。方案：

①FR-01 收口冻结面收敛为交付面单口径——`filterCommittedFace` 基础过滤器剔除 ownPrefix 保留子句（`.sillyspec/` 只留 `docs/`），flow.js 删除 changeDir walk 与 ownFiles 并集，双口径冻结的工作树集只剩 `freeze.dirtyAdded`。工件的归档真相已在 `changes/archive/<变更>/` 目录本体（随归档提交入库），patch 再冻一份是冗余且污染 totals。空面哨兵因此恢复有效：工件-only 面在 FR-01 后为空 → 显式「可归属文件面为空（无交付面改动）」提示。

②FR-02 独占树完备性守卫——事故形态还原：实现提交在会话 worktree 内完成但不在 flow done 时点 HEAD 的祖先链（reset/detach/平行分支），`git diff baseline..HEAD` 与 `git status` 双面都看不到它，冻结面静默缺实现。守卫扫本 worktree HEAD reflog（linked worktree 的 HEAD reflog 会话独占，不污染），取不在 HEAD 祖先链的提交，patch-id 与 baseline..HEAD 各提交比对去重（amend/rebase 等价残留不误报），余者触及交付面文件即阻断（复用 dirty gate 的 reportMidFail('patch')+exit 1 断点续模式），三选一指引 + `--accept-orphan-face` 留痕放行。共享主仓路径禁止启用（reflog 混他侧会话操作，无法归属）。

③FR-03 锚点回写——新模块 `src/patch-reanchor.js`：`reAnchorChangePatch({ projectRoot, changeDir, changeName })` 先验证 head/baseline 在主仓可解析（幂等 no-op），不可解析时按「提交主题含变更名」归属约定（仓内提交规范 `(thin <变更名>)`/`(<变更名>)` 后缀，与 filterCommittedFace 的 commitAttribution 同一约定族）`git log --all --grep` 取归属提交链：head=末笔、baseline=首笔^，区间一致性校验（首笔^ 必须是 head 祖先、区间 diff 与留档 files[] 至少一文件重叠）不过即 fail-closed。回写 baseline/head/scopeAudit.baseAnchor、原锚降级为 worktreeBaseline/worktreeHead 溯源字段、按主仓区间重生成 change.patch、patchSha256 重锚（LF 归一）。挂点三处：worktree apply 成功尾声自动尝试（merge 路径即刻生效；patch 路径时点早于 agent 提交则 no-op 留给下一入口）、doctor detectArchiveIntegrity 新增锚点悬空 offender（doctor 只报不治，safe_actions 指路）、顶层命令 `sillyspec patch-reanchor --change <名>` 人工/回填入口（平台仓五个 ws-ref 归档用它清偿）。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

- `filterCommittedFace(committedRaw, ownPrefix, opts)`（src/flow-parity.js）：行为变更——ownPrefix 不再保留，`.sillyspec/` 只留 `docs/` 前缀；签名不变；归属切分（commitAttribution）逻辑不变仍需 ownPrefix 反解变更名。
- `cmdFlowDone({..., acceptOrphanFace })`（src/flow.js）：新增参数；`flow done --accept-orphan-face` 旗标解析（cmdFlow done 分发处）。
- 新增 `src/patch-reanchor.js` 导出 `reAnchorChangePatch({ projectRoot, changeDir, changeName })` → `{ ok, noop?, baseline?, head?, reason?, rewritten? }` 与 `locateChangeDir(specBase, changeName)`；纯 fs+git，无 CLI 依赖。
- `applyWorktree`（src/worktree-apply.js）：成功尾声（8.5 步）新增 best-effort 回写调用（不改返回契约，warnings 追加）。
- `detectArchiveIntegrity`（src/doctor-diagnostics.js）：新增锚点悬空检查项（offender + safe_actions 指路 patch-reanchor）。
- CLI 新增顶层命令 `sillyspec patch-reanchor --change <名> [--spec-dir <路径>] [--json]`。
- change-patch.json 格式增量：可选字段 `worktreeBaseline`/`worktreeHead`/`reanchoredAt`/`reanchorNote`/`acceptedOrphanFace`；顶级 baseline/head/scopeAudit.baseAnchor 语义不变（回写后指向主仓可解析锚）。平台读方（assets.py 等）按顶级字段消费，零适配。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？

FR-02 reflog 扫描对「先 reset 再补提交」的乱序形态仍成立（reflog 保留全部 HEAD 轨迹）；patch-id 去重在 rebase 冲突解算后内容微变时会漏判等价 → 残留误报 → --accept-orphan-face 放行（误报代价=一次显式确认，可接受）。已知边界：merge 形态孤儿提交自身经 combined diff 空面不判，但侧支成员提交若在 HEAD 轨迹上仍被捕获（钉行为测试在案）。FR-03 apply 尾声时 agent 未提交则归属提交不存在 → no-op，doctor/人工入口补位；多笔同名变更提交跨日共存时 --grep 命中面扩大，区间一致性校验兜底（首笔^ 非 head 祖先即 fail-closed 不改写）。

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？

change-patch.json 回写用原子写（writeAtomicSync 先临时后 rename）；apply 尾声与人工 patch-reanchor 并发=后者幂等 no-op 或先后覆盖同值。FR-01 只读面变更无并发写。本变更执行中实证：并行会话提交 d99dc401 卷走本变更 flow.js/flow-parity.js 首轮 hunks（共享主仓目录级 add 夹带），处置=追加真实收尾修正提交（flow.js 治理保留措辞同步 FR-01 新口径 + scanOrphanFace merge 边界 JSDoc 披露）使两文件重归本变更提交面，归属回正。

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？

FR-02 阻断停在 patch 子步标记之前（与 dirty gate 同款半态可重入）；FR-03 回写失败 fail-soft（apply 不受影响）/fail-closed（patch-reanchor 退出码≠0 并给原因，原文件不动）。

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？

FR-02 只在 `.sillyspec/.runtime/worktrees/<change>` 路径判定命中时启用（会话独占树），共享主仓明确禁止；FR-03 归属按提交主题变更名精确匹配（变更名全仓唯一，AGENTS.md 规则 8），跨仓仓提交不在主仓 --all 面内自然排除。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

最大风险：FR-01 是行为口径变更，存量读方若依赖 files[] 里的工件路径会静默变面——已核读方（fr-index/knowledge-graph/平台 assets.py）只消费顶级字段与交付行，scopeAudit.rows 口径本就不含工件；filter-committed-face 等四个测试文件钉旧行为需同步口径（测试对齐依据=本设计接口契约节）。放弃的方案：①thin 侧改为「工件保留但 totals 分列」——冗余不除、哨兵仍哑，弃；②FR-02 用 `rev-list --branches` 扫全分支——linked worktree 共享分支命名空间，主仓 main 分支推进会污染独占树判定（假阳阻断），改用本 worktree HEAD reflog；③FR-03 在 apply 内同步等待 agent 提交后回写——apply 无提交职责（pathspec 交给 agent），时序不可控，改多点幂等回写。

## 文件变更清单

| 操作 | 路径 | 说明 |
|---|---|---|
| 修改 | src/flow.js | FR-01 冻结面收敛 + FR-02 孤儿守卫 + acceptOrphanFace 旗标 + note 措辞 |
| 修改 | src/flow-parity.js | filterCommittedFace 口径 + scanOrphanFace 新增 |
| 新增 | src/patch-reanchor.js | FR-03 锚点回写核心 |
| 修改 | src/worktree-apply.js | apply 尾声回写挂点（8.5 步） |
| 修改 | src/doctor-diagnostics.js | 锚点悬空检查 |
| 修改 | src/index.js | patch-reanchor 命令注册 + 帮助行 |
| 新增 | test/close-trace-freeze-integrity.test.mjs | FR-01/FR-02 直测 7 例 |
| 新增 | test/patch-reanchor.test.mjs | FR-03 直测 4 例 |
| 修改 | test/filter-committed-face.test.mjs | 口径同步 |
| 修改 | test/commit-attribution-split.test.mjs | 口径同步 |
| 修改 | test/flowdone-disposition-drift.test.mjs | 口径同步（治理修复留档真相改归档目录本体） |
| 修改 | docs/sillyspec/platform-interface-map.md | 行号锚重锚（本变更加码漂移六处） |
| 修改 | .sillyspec/docs/sillyspec/modules/_module-map.yaml | patch-reanchor.js 模块登记（worktree 模块） |
| 修改 | .sillyspec/docs/sillyspec/modules/worktree.md | reAnchorChangePatch 接口行 + 应用流 8.5 步 |
| 修改 | .sillyspec/docs/sillyspec/modules/cli-entry.md | freeze-integrity 注记 |
