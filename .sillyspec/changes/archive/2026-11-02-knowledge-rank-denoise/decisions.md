# 决策记录

## D-001@v1 DF 排序取命中数优先+Σ(1/DF) 破平+INDEX 行序兜底，非纯 DF
状态：implemented
变更：2026-11-02-knowledge-rank-denoise
锚点：src/knowledge-match.js:461
理由：子代理方案审查模拟显示纯 Σ(1/DF) 与「命中数优先+DF 破平」在 organic 12 条 case 上 top3 同为 0.5833，但后者 top1 更高且解释直观；INDEX 行序兜底保证同分确定性。泛词不主导由合成单测锁（5 条 sillyspec vs 1 条长尾词）。

## D-002@v1 thin-fr-inject-parity 行数断言过期属既有红，顺手同步非本变更引入
状态：implemented
变更：2026-11-02-knowledge-rank-denoise
锚点：test/thin-fr-inject-parity.test.mjs:131
理由：该测试断言 flowKnowledgeDigest 空态 lines.length===1，但内置规约 00 恒注入行（src/flow.js:310，2026-10-23 上线）使实际恒为 2 行——HEAD 版本即可复现（git show HEAD:src/flow.js 含恒注入行），属既有红非本变更引入。顺手改为健壮形态（≥1 行且折叠行在场，不锁总行数），避免恒注入面再扩展时误红。
