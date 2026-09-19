---
author: qinyi
created_at: 2026-09-19 16:20:00
change: 2026-09-19-review-material-cli-wiring
---

# 决策记录（Decisions）

<!-- 增量落盘：每解决一个有实现影响的问题当场追加一条；幂等按 D-xxx@vN 判重 -->

## D-001@v1: 接线点选 prompt.js tier 注入块（同链注入），不另立派发前置步
- type: architecture
- priority: P0
- status: accepted
- source: user
- question: 包组装接进 CLI 侧的注入点在哪——新增派发前置步骤，还是复用既有 {REVIEW_TIER} 注入链？
- answer: 复用 prompt.js 既有 tier 注入块（src/run/prompt.js:1378 起 `['brainstorm','plan','execute'].includes(stageName) && promptText.includes('{REVIEW_TIER}')` 分支）：{REVIEW_TIER}/{REVIEW_JSON_CONTRACT}/{PRIOR_REVIEW_FACTS} 已在此链机械填充，{REVIEW_MATERIALS} 同链同框架填充（stageName 分流三形态）。理由：①派发 prompt 本来就经此链渲染给主代理，槽位与既有占位符同址，主代理复制即得；②不新增步骤/状态机面；③降级分支（catch 内 join ''）同款容错沿用。
- normalized_requirement: prompt.js tier 注入块内按 stageName 组装材料包并 join 进 {REVIEW_MATERIALS}；三阶段模板加 {REVIEW_MATERIALS} 槽；降级分支 join('') 保持。
- impacts: [FR-01, FR-02]
- evidence: 用户移交指令（本变更入口）；src/run/prompt.js:1378-1483；归档 2026-09-19-review-material-pack/design.md Wave 1.1 槽位分权
- 故障面: 组装失败若不加兜底会让占位符残留——沿既有 catch 降级 join('') 消解
- 退役判据: 若材料包实测导致评审漏检率上升（P0/P1 逃逸到后续阶段），重审注入内容的下限构成

## D-002@v1: 混合组包边界——CLI 抽素材半边、主代理点名半边留位，不改 buildReviewMaterialPack schema
- type: architecture
- priority: P0
- status: accepted
- source: user
- question: 组装分工边界——CLI 机械抽取到哪一层，主代理半边（五交叉点/plan 差量判定）如何留位？
- answer: CLI 半边＝机械可抽取素材：grill-first 的 designDigest（章节行号索引＋背景/设计目标节体）与 fileList（design.md 文件变更清单表路径列）；plan-review 的 hardConstraints（design.md「## 全局硬约束」节行，缺节时 decisions.md P0/P1 条目标题兜底）；execute-qa 的 diffSummary（extractDiffSummary 委托 resolveVerifyChangedFiles）＋design 热区＋checklist（REVIEW_CHECKLISTS.execute）。主代理半边＝语义点名：五交叉点（grill）、planDelta 逐约束判定（plan-review）——不预填，包内对应节渲染既有「（无——主代理未点名…）」缺件提示，模板散文指示主代理派发前补该节（偷懒→评审者 cannot_verify 自检拦，R-04 兜底不变）。buildReviewMaterialPack 零 schema 改动（已归档契约不回改）。
- normalized_requirement: 新增组包装配函数（review-material-pack.js 内 assembleStageReviewMaterials）机械收集 CLI 半边并调 buildReviewMaterialPack；crossPoints/planDelta 恒不预填。
- impacts: [FR-01, FR-03]
- evidence: 用户移交指令「CLI 抽素材半边，点名留位」；src/review-material-pack.js:112-139（四形态 schema）；execute.js:979-1023（热区先例）
- 故障面: CLI 抽取源缺节/解析失败→包变薄——best-effort 降级为「（无）」行，评审者自检列缺件
- 退役判据: 若主代理补位率实测过低（点名半边长期空），评估把点名半边也机械化（如按 design 交叉点清单生成候选）

## D-003@v1: 非空注入以装配函数为可测单元，端到端以源码钉＋渲染断言双保险
- type: boundary
- priority: P1
- status: accepted
- source: code
- question: 「非空注入」怎么钉——outputStep 全链路跑通需 ProgressManager/db fixture（重），还是拆可测单元？
- answer: 拆两层：①assembleStageReviewMaterials 为导出纯装配函数（入参 stage/cwd/changeName/specBase，临时 fixture 可直接断言三形态非空）；②prompt.js 接线用源码断言钉（调用点在场＋join 非''字面量），既有测试组二的 joins≥2 断言保持绿。不在测试里跑 outputStep 全链（既有测试先例 worktree-execute-spec-drift.test.mjs 走子进程 runCommand 才隔离 exit，本变更不引入该重量）。
- normalized_requirement: test/review-material-pack.test.mjs 新增组四：装配函数三形态非空断言（fixture changeDir）＋ prompt.js 接线源码钉；既有组一/二/三断言零改动保持绿。
- impacts: [FR-03]
- evidence: test/review-material-pack.test.mjs:41-62（既有源码钉先例）；test/worktree-execute-spec-drift.test.mjs:1-20（子进程重量先例，不采用）
- 故障面: 源码钉只证调用在场不证运行时值——装配函数单测＋CLI 亲跑冒烟（本变更 dogfood 路径）补
