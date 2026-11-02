# 决策记录

## D-001@v1 self 集 leave-one-out 落地为 name-only/motivation-only 对照而非字面剔除索引
状态：implemented
变更：2026-11-02-knowledge-eval
锚点：eval/knowledge/run.mjs:88
理由：字面剔除自身知识后期望集类别为空、无法度量；对照口径（仅变更名 vs 完整 input 的 own 命中差）能直接量化同文泄漏且零额外标注成本，leak_gap 进 baseline 不进质量指标。

## D-002@v1 评测工具项目中立：仓由 --repo 路径解析、代码禁止枚举具体项目
状态：implemented
变更：2026-11-02-knowledge-eval
锚点：eval/knowledge/lib/repos.mjs:1
理由：用户会话纠正——sillyspec 是通用工具，评测面不得把自家两仓写进默认路径（SILLYSPEC_EVAL_PLATFORM_ROOT 与仓表硬编码是工具中立性违例）。修正为 --repo <path|label:path> 任意仓解析、缺省当前仓、重复标签显式报错；并以 smoke 测试扫描工具源码断言不出现具体项目名/项目特定 env（机制化防回归，不依赖口头纪律）。
