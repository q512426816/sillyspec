---
author: flow-machine-draft
created_at: 2026-11-04T23:19:09.910Z
---
# 需求规格（Requirements）— 2026-11-05-knowledge-search-observability

## 功能需求

### FR-01: VECTOR_TIMEOUT_MS 缺省 3000→5000 且 env SILLYSPEC_KNOWLEDGE_VECTOR_TIMEOUT_MS 可调（非法值回落缺省）

- `platformVectorRecall` 的超时预算**必须**由 `resolveVectorTimeoutMs()` 单源解析：缺省 5000ms（覆盖平台 embedding worker 冷启 1~3s + 查询嵌入——2026-11-05 平台修复变更 design.md 留痕的独立议题）；env `SILLYSPEC_KNOWLEDGE_VECTOR_TIMEOUT_MS` 为正整数时覆盖缺省；非法值（非数字/≤0/NaN）**必须**回落缺省不抛错。

#### 场景：env 覆盖与非法值

- Given 未设 env → 预算 = 5000
- Given env="8000" → 预算 = 8000
- Given env="abc" 或 "0" 或 "-1" → 预算 = 5000（回落不抛）

### FR-02: 向量 decisionHits 按 (anchor,change) 去重保最高分（跨文件副本不再挤占 top-k）

- `buildResultFromPlatform` 产出的 decisionHits **必须**按 `(id, change)` 键去重（同键多副本保 score 最高一条）；去重**必须**发生在 score 排序与 top-20 截断之前；无 change 的同号条目（跨变更同号是既有诚实形态）**不得**被误并（change 缺省以空串入键）。

#### 场景：跨文件同条目副本

- Given 平台返回同一 (anchor, change) 在两个文件的副本（score 0.61/0.58）
- When buildResultFromPlatform 解析
- Then decisionHits 中该键仅 1 条（score=0.61），另一文件的副本不占 top-k 槽位

### FR-03: search 面向量通道透出真实余弦分（不再恒 0）

- search 面（`buildSearchMatches`）对 channel=vector 的条目**必须**展示平台真实余弦分（buildResultFromPlatform 在文件级 entry 上挂 `vectorScore`=该文件命中最高分；search 面有 vectorScore 时以其替代 keywords∩query 计数）；非 vector 通道 score 口径**不变**（既有 keywords 命中计数零回归）。

#### 场景：向量命中查询

- Given 向量召回文件级 entry 携带 vectorScore=0.665
- When knowledge search 渲染 matches
- Then 该条目 score=0.665（而非 0）；routing/fallback 条目 score 仍为关键词命中数

### FR-04: inject 遥测记 channel（routing/vector/fallback/scope）；thin-start 零命中落盘（zeroHit 标记，matchedFiles 空不污染 stats 文件矩阵）

- thin-start（flow.js）与 execute（stages/execute.js）的 inject 遥测**必须**携带 `channel` 字段（由 `resultChannel(result)` 单源判定：json.fallback→'fallback'、json.vector→'vector'、scope 专属标记→'scope'、否则 'routing'）；thin-start 真零命中（无命中/无否决/无 scope）时**必须**落一条 `zeroHit:true, matchedFiles:[]` 的 inject 记录；stats 现有聚合**必须**零回归（空 matchedFiles 对文件命中矩阵零贡献，stats 按 type 过滤不受新字段影响）。

#### 场景：零命中注入

- Given thin-start 查询零命中（matched=false 且 rejected/scope 皆空）
- When flow start 注入段执行
- Then hits.jsonl 落一条 type=inject、zeroHit=true、matchedFiles=[]、channel=<实际通道> 记录

### FR-05: knowledge search 面新增 type=search 遥测（query/matched/channel/entry_count；stats 现有聚合零回归）

- `cmdSearch` **必须**对每次有效查询落一条 `{type:'search', query, matched, channel, entry_count, matchedFiles(帽12)}` 遥测（fail-soft：落盘失败不影响检索输出）；knowledge-stats 现有聚合**必须**零回归（stats 按 type==='inject'/'classify'/fr-* 过滤，type='search' 天然不进既有视图）。

#### 场景：显式检索落遥测

- Given knowledge search "worktree 接管" 命中 routing
- Then hits.jsonl 落一条 type=search、channel=routing、matched=true、entry_count=N 记录

### FR-06: 两个污染测试改用 tmpdir 隔离 specBase，跑测试不再写真实仓遥测

- `test/knowledge-inject-ranking.test.mjs` 与 `test/knowledge-gate-denoise.test.mjs` 中以真实仓 `.sillyspec` 为 specBase 的用例**必须**改为 tmpdir 隔离环境（语料/运行态自备），跑测试套件**禁止**向真实仓 `.sillyspec/.runtime/knowledge-hits.jsonl` 写入任何行；两文件其余用例行为不变。

#### 场景：跑测试零污染

- Given 临时 clone 的干净测试运行
- When 全量跑上述两个测试文件
- Then 真实仓 knowledge-hits.jsonl 行数不变

### FR-07: 既有测试面全绿 + 新增用例覆盖上述行为

- 上述各 FR 行为**必须**有对应新增/改写用例（timeout 解析三分支、去重、vectorScore 透出、channel 判定、零命中遥测、search 遥测、污染隔离），本变更测试面与受影响既有面全绿；lint 走仓门。

#### 场景：回归

- Given 本变更合入后
- When 跑本变更测试 ∪ 受影响既有测试
- Then 全绿

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/knowledge-vector-observability.test.mjs「resolveVectorTimeoutMs：缺省/env 覆盖/非法回落」
FR-02: test/knowledge-vector-observability.test.mjs「buildResultFromPlatform 跨文件同键去重保最高分」
FR-03: test/knowledge-vector-observability.test.mjs「search 面向量通道透出真实余弦分」
FR-04: test/knowledge-vector-observability.test.mjs「inject 遥测记 channel + 零命中落盘 zeroHit」
FR-05: test/knowledge-vector-observability.test.mjs「cmdSearch 落 type=search 遥测」
FR-06: test/knowledge-inject-ranking.test.mjs「⑤ 真实库 digest 钉子（tmpdir 隔离 + 真实仓遥测零写入自动断言）」+ test/knowledge-gate-denoise.test.mjs「② 真实库 digest（tmpdir 隔离 + 真实仓遥测零写入自动断言）」
FR-07: test/knowledge-vector-observability.test.mjs（全文件）+ 受影响既有面回归
