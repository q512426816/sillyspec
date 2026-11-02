---
author: flow-machine-draft
created_at: 2026-11-02T02:07:32.486Z
---
# 任务注册表（Tasks）— 2026-11-02-knowledge-eval

- [x] task-01: 搭 eval/knowledge 骨架与纯函数——lib/metrics.mjs（Top-k/MRR/precision、排序稳定）+ lib/snapshot.mjs（git HEAD + knowledge 树 sha256），配 test/eval-knowledge-runner.test.mjs 与 test/eval-knowledge-isolation.test.mjs 的纯函数用例并跑绿
- [x] task-02: 数据集层——lib/dataset.mjs 三源加载/校验（organic 冻结、self 现场构建 leave-one-out、probes fixture 枚举），从两仓遥测抽 organic 池并人工标注 ≥30 条落 datasets/organic.jsonl，配 test/eval-knowledge-dataset.test.mjs 并跑绿
- [x] task-03: 六类缺陷探针 fixture——fixtures/ 下 score-contract、word-boundary、route-rows、scope-manual、fixed-entries、linkage 六个最小合成知识库与断言，配 test/eval-knowledge-probes.test.mjs 并跑绿
- [x] task-04: 引擎适配与分面 runner——lib/engine.mjs 只读适配 matchByRouting/parseDecisionEntries/scopeRecall/buildKnowledgeGraph，run.mjs 输出 entries@3、decisionHits@5、search@10、scope@3/20 的 raw+rendered 与截断差异，零副作用控制（env + mkdtemp），配 runner 测试并跑绿
- [x] task-05: baseline 与出口——lib/report.mjs diff 输出、baseline.json 写入/对比与 snapshot_mismatch 告警、package.json 的 eval:knowledge 脚本、README、零网络 smoke test（test/eval-knowledge-smoke.test.mjs）并跑绿
- [ ] task-06: 两仓实跑落基线——--repo all 跑通并提交 baseline.json，跑变更测试面回归（knowledge/eval 相关既有测试）确认零回归
