---
author: t
created_at: 2026-10-10T19:15:00.000Z
---

# 决策记录（Decisions）

## D-001@v1: 跨仓 diff 正文收口冻结内嵌 change-patch.json（scopeAudit.repos[].patch）
- type: definition
- priority: P0
- status: accepted
- supersedes:
- source: user
- question: 跨仓变更收口后 change.patch / change-patch.json 只有主仓面，跨仓只冻计数与锚点哈希——B/C 档锚（最近提交/未提交窗口）的改动内容收口后永久不可复得，「审计真相 sha256 锚定」对跨仓面不成立（用户实证原话：跨仓时「change-patch.json 和 change.patch 只有本仓的变更……应该能展示全部的，不然这个就偏差了缺失了」）。
- answer: 收口时点（execute --done 与 flow done 两通道）按 repos[].anchor 窗口对每个已注册跨仓采集 diff 正文，内嵌 change-patch.json `scopeAudit.repos[].patch` + `patchSha256`（\n 归一 sha256）；不落独立文件族（方案 A，破单套两件纪律、读侧动面最大，记非目标）、不混单 change.patch（方案 C，git apply 必失效，否决）。
- normalized_requirement: 跨仓声明涉及的已注册仓，收口后 change-patch.json 必须含该仓实际改动 diff 正文与 sha256 锚；采集失败/空窗口必须 patch=null 不出伪件；顶级 files[]/totals/patchSha256/patchStatus 与单套两件纪律零回归。
- impacts: [FR-01, FR-02, FR-05, task-01]
- evidence: src/flow-parity.js:369（projectTraceFaceRows 显式滤 crossRepo 行「patch 不在主仓，均不入」）+ src/scope-audit.js:1367（frozenPatch 仅 numstatRoot 主仓）+ 2026-10-09-close-trace-single-set 单套两件决策
- 锚点: src/scope-audit.js:reconcileCrossRepoPlan
- 故障面: 大 patch 使 JSON 体积膨胀（R-01，binary 折叠+文件面过滤缓解，v1 接受）；B/C 档字面 ref 窗口漂移（R-02，采集与窗口判定同步段完成，anchor.label 诚实标注）
- 退役判据: 平台出现按仓 diff 独立展示/apply 需求时，升级方案 A 独立文件族（接口不锁死）

## D-002@v1: 跨仓对账集成段收敛单一导出函数，轻量道接入真实三态
- type: architecture
- priority: P0
- status: accepted
- supersedes:
- source: code
- question: 跨仓对账集成逻辑内联在 computeFullFlowAudit（scope-audit.js:1216-1310）heavy 独享，轻量道 flow done 跨仓声明行恒补 untouched ⊘——跨仓实际改了也显示「未动」（谎报），且两通道若各自实现必然口径漂移。
- answer: 内联段抽导出 `reconcileCrossRepoPlan`（scope-audit.js），heavy 改调用行为等价、thin（flow.js done 路径）同源接入；复用 collectRepoActual 共享内核（2026-09-20「单一真相源」哲学延续），跨仓行升级真实三态，降级仓诚实 ⊘+degradedReason。
- normalized_requirement: flow done 对带 repo 声明条目必须产出真实三态行（实 +/- 与 crossRepo 标记），禁止恒 ⊘；对账/采集异常必须 fail-soft 退 ⊘ 补行现行为；heavy/thin 消费同一导出函数，禁止两份口径实现。
- impacts: [FR-03, FR-04, task-02, task-03]
- evidence: src/flow-parity.js:348（buildThinSnapshotRows 恒 ⊘ 补行）+ src/cross-repo-reconcile.js 头注释（跨仓机器可见性分期哲学）+ computeFullFlowAudit 内联段实证
- 锚点: src/flow-parity.js:buildThinSnapshotRows
- 故障面: 轻量道新增跨仓 git 调用拉长 flow done 时延（R-03，仅有跨仓声明触发 + GIT_TIMEOUT 兜底 + fail-soft 不阻断）
- 退役判据: 跨仓对账内核升级（如 A 档锡点全量覆盖轻量道）时随内核自然演进，本函数仅组装层

## D-003@v1: patch 采集窗口与行数窗口同根同窗；顶级主仓投影面不动
- type: boundary
- priority: P1
- status: accepted
- supersedes:
- source: design
- question: 跨仓 patch 以什么为基点才能与既有审计面自洽？顶级 files[]/totals 是否顺势扩成全仓面？
- answer: patch 窗口 = 行数采集窗口（A/B' 档锚 hash 为 baseRef；B 档 HEAD~1 窗口用字面 HEAD~1、C 档未提交窗口用字面 HEAD，工作树口径含 untracked 自拼 hunk——buildFrozenPatch 既有形态），「与行数同根同锚」契约延续到正文粒度；顶级 files[]/totals 保持主仓实改投影（projectTraceFaceRows 不动，既有单测钉住），全景走 scopeAudit.rows（全三态）+ scopeAudit.repos[]（锚点/计数/正文）——展示面由平台读 scopeAudit 承接，「沉淀资产面 vs 对账面」双层架构（2026-10-07-unify-close-trace）不破。
- normalized_requirement: patch baseRef 必须取锚 hash（有则）或窗口字面 ref（降级档），禁止另造窗口；顶级 files[]/totals 与 change.patch 单件口径零变化；无跨仓声明变更收口行为零变化（scopeAudit 无 repos 键）。
- impacts: [FR-05, FR-06, task-01]
- evidence: src/scope-audit.js:1366（「与行数同根同锚」原注释）+ src/scope-audit.js:205（degradedStat null 降级档哲学）+ run/complete.js:1114（投影口径注释）
- 锚点: src/scope-audit.js:computeFullFlowAudit
- 故障面: 平台不读 scopeAudit.repos[] 时展示面仍只见主仓——本变更供数完整，展示承接是 SillyHub 侧一次读侧适配（跨仓协作边界，显式声明）
- 退役判据: 顶级面与对账面双层架构被平台统一读法取代时重估
