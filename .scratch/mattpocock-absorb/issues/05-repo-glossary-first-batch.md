# 05: 仓级词汇文件首批落盘

**What to build:** 本仓（dogfood）的词汇通道数据面首批落盘——`.sillyspec/knowledge/glossary.md` 写入本吸收会话实证过的 4 条域术语（吸收/批次/纪律原语/前沿），文件头注释说明用途与正文 40 行上限约定；随后端到端验证真实文件被阶段级与 Wave 级注入读取，并跑全量相关回归确认词汇文件进场零破坏。

**Blocked by:** 01, 02, 03, 04（词汇通道机制面全部就绪）.

**Status:** done

- [x] `.sillyspec/knowledge/glossary.md` 落盘：术语行式「术语：定义」首批 4 条，文件头注释说明用途与归一正文 ≤40 行（VOCAB_MAX_LINES）上限，归一 8 行不截断
- [x] 端到端验证：真实文件在场时阶段级（buildKnowledgeInjection / outputStep execute step0）与 Wave 级（buildWavePrompt）注入均带真实词汇段，vocab-inject 遥测落真实 .runtime（lines=8 truncated=false 无 matchedFiles）
- [x] 全量相关回归 42/42 绿：知识注入族（knowledge-inject/fusion/rank-denoise/vector-observability/inject-ranking/reason-overlap/vector-recall/gate-denoise/baseline/match/body-recall/scope-* 等）、fr-index + fr-index-l2、execute-testcase-design-include、prompt-golden/prompt-injection-gaps、knowledge-vocab-channel 十节——零红零断言修改（fr-index 族走 tmp fixture 不扫真实 knowledge 目录，glossary.md 未登记 INDEX 即零参与匹配层，无排除需求）
- [x] 金档再生 `node docs/prompt/_extract.mjs`：diff 仅 demo 目录绝对路径的 worktree 噪音，无 prompt 模板漂移，已 git checkout 还原
