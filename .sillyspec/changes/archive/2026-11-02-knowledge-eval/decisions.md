# 决策记录

## D-001@v1 self 集 leave-one-out 落地为 name-only/motivation-only 对照而非字面剔除索引
状态：implemented
变更：2026-11-02-knowledge-eval
锚点：eval/knowledge/run.mjs:88
理由：字面剔除自身知识后期望集类别为空、无法度量；对照口径（仅变更名 vs 完整 input 的 own 命中差）能直接量化同文泄漏且零额外标注成本，leak_gap 进 baseline 不进质量指标。

## D-002@v1 评测工具不写死具体仓路径、缺省当前仓（用户原话：这工具是给无限制的项目使用的）
状态：implemented
变更：2026-11-02-knowledge-eval
锚点：eval/knowledge/lib/repos.mjs:1
理由：用户原话纠正——「这个为什么限定平台仓啊？咱这个工具是给无限制的项目使用的！而不是仅仅我们这两个项目！」初版把自家两仓写进默认路径（SILLYSPEC_EVAL_PLATFORM_ROOT + 仓表硬编码）是违规。修正为 --repo <path|label:path> 任意仓解析、缺省当前仓、重复标签显式报错；测试断言名用任务词汇「不含具体项目名 / 不含项目特定 env / 不硬编码仓表」而非政策词「工具中立性」，并扫描工具源码防回归。
落地层：测试（test/eval-knowledge-smoke.test.mjs「工具中立法」源码扫描断言）+ 接口（--repo 缺省当前仓）。
用户原话保留：AGENTS.md 规约 00 只占权威一条（政策措辞 + 注入远离动作），具体纠正三性质全占（权威/临近/任务词汇）——抽象规约需附任务词汇反例才弥合词汇失配。
