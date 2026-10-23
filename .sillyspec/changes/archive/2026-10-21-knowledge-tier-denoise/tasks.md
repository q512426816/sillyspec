---
author: flow-machine-draft
created_at: 2026-10-21T03:59:03.756Z
---
# 任务注册表（Tasks）— 2026-10-21-knowledge-tier-denoise

- [x] task-01: 检索核心三路堵停车场——matchByRouting（entries 过滤 decisions/fr unmapped 路由行，decisionRoutes/decisionHits 随之免疫）+ fallbackByQueryShingles（byFile 跳过 unmapped）+ buildResultFromPlatform（spec_path 候选丢弃）+ stages/knowledge.js search 过滤致零时披露行；验证：test/knowledge-tier-denoise.test.mjs 三路过滤与披露行用例绿
- [x] task-02: 路由行去泛词——decision-distill 默认 makeLine 删 `|decision|决策`、fr-index FR 面 makeLine 删 `|FR|需求|承接`（auto- 分支同口径）、syncIndexRoutingLines 增 opts.stripTokens 幂等剥离存量行（四个调用方传参）、本仓 INDEX.md 手动执行一次 sync 即时清偿；验证：泛词剥离用例绿 + INDEX 实况不含共享泛词（grep 验证）
- [x] task-03: 新增 src/hot-cache.js 原子缓存工具 + quicklog 伪条目扫描缓存（parseFlowArchiveEntries，指纹=归档目录名列表+根 mtimeMs，坏缓存 fail-open）；验证：test/knowledge-hotpath-cache.test.mjs quicklog 面 命中等价/新增失效/坏缓存三态绿
- [x] task-04: knowledge-graph 构建缓存（粗粒度输入指纹 + TTL 10min + 版本键，序列化往返与全量构建逐字段等价）；验证：test/knowledge-hotpath-cache.test.mjs graph 面 等价/失效/TTL 用例绿
- [x] task-05: unmapped 批量清偿驱动（decisions 面按「文件：」锚 moduleOf 推断 / fr 面按来源变更覆盖面推断；dry-run/apply；冲突跳过、无锚留痕；挂 knowledge 子命令）；验证：test/redomain-unmapped-bulk.test.mjs 迁移/留痕/冲突/幂等用例绿
- [x] task-06: 本仓存量清偿执行——dry-run 报告留档变更目录（含 633+443 条去向与残量原因），人工过目后 apply；fr/unmapped 与 decisions/unmapped 降至有界残量；验证：清偿报告 + 两文件 `grep -c '^## '` 条目数前后留痕
- [x] task-07: 回归清偿——断言旧行为的既有测试随契约更新（knowledge-match/knowledge-vector/decision-distill/fr-index/knowledge-quicklog/knowledge-graph 相关面，改断言非删断言）；变更测试面全绿 + npm run lint 过
