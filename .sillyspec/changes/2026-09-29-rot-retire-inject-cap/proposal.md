---
author: flow-machine-draft
created_at: 2026-09-29T05:15:34.162Z
---
# 提案书（Proposal）— 2026-09-29-rot-retire-inject-cap

## 动机
<!-- MACHINE-DRAFT:proposal-motivation:ccb006621d787331289a437f4469631046229437376c741053f094ec46186860:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-29-rot-retire-inject-cap 留痕重锚 -->
任务原话转写：动机：FR 腐烂待复核持久标记层零消费实证（371 条标记无一被复核行动，fr-rot-precision 评审曾误删 72 条无人发现）且信号饱和反噬注入排序；brainstorm step8 {FR_INDEX_DIGEST} 注入无上限且不滤 unmapped，遥测 11/11 次全量灌 723 条整池进 prompt。方案（三子代理核证过影响面）：一、删标记层——拆两处写入点（flow.js rotSuspectFlow 打标、run/shared.js auditQuickCompletion 打标）、readActiveFrDigest.needsReview 字段及两处消费（flow 注入排序置前、prompt.js digest 渲染）、markFrNeedsReview 与 cleanupStaleReviewMarks（死代码）、knowledge-digest rot 告警臂；剥除 knowledge/fr/*.md 全部 371 条「待复核：」行；保留 rotSuspectFlow 覆盖计算+收口 advisory+fr-rot-suspect 遥测（count=strong 不变）；勿动决策库 behind 复核与模块卡 needs_review 同名机制。二、修注入——prompt.js digest 滤 unmapped（unmapped-only 给专属空态）、top-8 截断+指针行（不伤尾部承接 blockquote）、遥测加 rendered/truncated；stage-contract.js 重复软门补 unmapped 过滤对齐 frDupGateFlow。

成功标准：
- 路由进 unmapped 的变更，{FR_INDEX_DIGEST} 注入段条目 <=8 且含「+N 条见」指针行，不再出现整池 723 条倾倒
- grep -c ^待复核： .sillyspec/knowledge/fr/*.md 全部为 0
- markFrNeedsReview/cleanupStaleReviewMarks/FR_NEEDS_REVIEW_PREFIX 从 src 消失，rotSuspectFlow 仍产出 fr-rot-suspect 遥测且 count=strong
- collectFrLinkedTests 测试门行为零变化（既有测试面全绿佐证）
- 标记相关旧用例删除/适配后 flow 系测试与 npm run test:core 全绿
<!-- MACHINE-DRAFT:proposal-motivation:end -->

<!--AGENT:槽1 动机例外裁决——例外裁决书写面（机器段之外合法） -->

## 变更范围
<!-- MACHINE-DRAFT:proposal-scope:a05854abb484853cd1090a9a0b2f379655604e19f514ddb503a14a388f4ab4b4:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-29-rot-retire-inject-cap 留痕重锚 -->
按成功标准机械推导，共 5 条验收面：
1. 路由进 unmapped 的变更，{FR_INDEX_DIGEST} 注入段条目 <=8 且含「+N 条见」指针行，不再出现整池 723 条倾倒
2. grep -c ^待复核： .sillyspec/knowledge/fr/*.md 全部为 0
3. markFrNeedsReview/cleanupStaleReviewMarks/FR_NEEDS_REVIEW_PREFIX 从 src 消失，rotSuspectFlow 仍产出 fr-rot-suspect 遥测且 count=strong
4. collectFrLinkedTests 测试门行为零变化（既有测试面全绿佐证）
5. 标记相关旧用例删除/适配后 flow 系测试与 npm run test:core 全绿
<!-- MACHINE-DRAFT:proposal-scope:end -->


## 成功标准（可验证）
<!-- MACHINE-DRAFT:proposal-criteria:e02e13a16334d09829cc190f3e908f86b362f573e607056ea0799039e94435db:begin 机器预填段——整段改写会被 flow done 拒收；确要修改：sillyspec flow amend-draft --change 2026-09-29-rot-retire-inject-cap 留痕重锚 -->
1. 路由进 unmapped 的变更，{FR_INDEX_DIGEST} 注入段条目 <=8 且含「+N 条见」指针行，不再出现整池 723 条倾倒
2. grep -c ^待复核： .sillyspec/knowledge/fr/*.md 全部为 0
3. markFrNeedsReview/cleanupStaleReviewMarks/FR_NEEDS_REVIEW_PREFIX 从 src 消失，rotSuspectFlow 仍产出 fr-rot-suspect 遥测且 count=strong
4. collectFrLinkedTests 测试门行为零变化（既有测试面全绿佐证）
5. 标记相关旧用例删除/适配后 flow 系测试与 npm run test:core 全绿
<!-- MACHINE-DRAFT:proposal-criteria:end -->

<!--AGENT:槽2 成功标准例外裁决（增删条目在此书写）——例外裁决书写面（机器段之外合法） -->
