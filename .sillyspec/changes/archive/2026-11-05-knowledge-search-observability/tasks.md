---
author: flow-machine-draft
created_at: 2026-11-04T23:19:09.911Z
---
# 任务注册表（Tasks）— 2026-11-05-knowledge-search-observability

- [x] task-01: knowledge-vector.js——resolveVectorTimeoutMs（缺省 5000/env SILLYSPEC_KNOWLEDGE_VECTOR_TIMEOUT_MS 正整数覆盖/非法回落）接入 platformVectorRecall + resultChannel 单源导出（下沉 knowledge-match.js 叶子模块防 stages/index TDZ 环、vector 转发导出）；验证：timeout 三分支用例绿
- [x] task-02: buildResultFromPlatform——decisionHits 按 (id, change||'') 去重保 score 最高（排序/截断前）+ 文件级 entries 挂 vectorScore；验证：跨文件同键去重用例绿（副本 1 条保 0.61、同号不同 change 不误并）
- [x] task-03: stages/knowledge.js buildSearchMatches——vector 通道 score=vectorScore（其余通道口径不变）+ cmdSearch 落 type=search 遥测（fail-soft）；验证：分数透出与 search 遥测用例绿
- [x] task-04: flow.js thin-start 遥测点增 channel + 真零命中落盘（zeroHit:true, matchedFiles:[]）；stages/execute.js 遥测点增 channel（静态导入自叶子模块）；验证：channel 判定与零命中落盘用例绿 + knowledge-stats 回归绿
- [x] task-05: 两个污染测试（knowledge-inject-ranking⑤/knowledge-gate-denoise②）真实仓 specBase 改 tmpdir 语料拷贝隔离；验证：跑测试前后真实仓 knowledge-hits.jsonl 行数 984→984 零污染
- [x] task-06: 新增 test/knowledge-vector-observability.test.mjs 7 用例（FR-01~05）全绿 + 受影响面 10 文件全绿 + lint 1113 文件绿；套件 3 红（doc-ref-check/spec-dir-home-guard/runtime-relayout）经 stash 对照判存量非本变更引入，如实留痕
