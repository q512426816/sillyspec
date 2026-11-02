---
author: flow-machine-draft
created_at: 2026-11-02T05:17:16.207Z
---
# 需求规格（Requirements）— 2026-11-02-knowledge-scope-recall

## 功能需求

### FR-01: A 段：entry 节点补 category/anchor/display；section 级 doc-refs 建边（extractFilePaths + normalizeAnchorForCompare 前缀容忍，保持 medium 强度不动 graphPath/impact）；scopeRecall 显式收 doc-refs entry 且 entries-only 返回非 null；GRAPH_CACHE_VERSION 1→2 且 fingerprint 含 INDEX 引用的手工文档 stat

图谱必须为 INDEX 手工条目建 section 级 doc-refs 边：按 `##` 标题切分文档，用 normalizeAnchorForCompare 匹配锚点（长度≥6 的前缀容忍），只对该 section 文本跑 extractFilePaths 建 entry→file 边（medium 强度，禁止改 strong）；entry 节点必须携带 category/anchor/display 属性。scopeRecall 必须显式收集 doc-refs 命中的 entry 节点，entries-only（无决策命中）时必须返回非 null。图缓存版本必须升 2 且 fingerprint 必须能感知 INDEX 引用的手工文档编辑。

#### 场景：section 级隔离

Given 同一文档两个 section，只有 A 节正文含 src/foo.js
When 对 src/foo.js 做 scope 遍历
Then 只有 A 节对应的 entry 可达，B 节不得串入

#### 场景：entries-only 不短路

Given scopeFiles 只命中手工文档 doc-refs、无任何决策锚点
When scopeRecall + buildScopeRecallResult
Then 必须返回 matched 结果（不得因 decisionHits 空而 null）

### FR-02: B 段：两跳 file→deliverables 反查 change→from-change 反查决策，只收 rejected/deathPath；排序 rejected/deathPath 优先→direct>two-hop→变更名日期→id；scope hit 设 score（direct=2/two-hop=1）保证渲染面过滤器可见；引擎 decision cap 保持 20

scopeRecall 必须支持反向两跳：scope file ←deliverables← change ←from-change← 决策，且两跳只收 rejected/deathPath 状态（禁止把 implemented 模板底稿灌入）；排序必须 rejected/deathPath 优先 → 直连节点优先于两跳 → 变更名日期降序 → id 字典序；每条 scope 决策命中必须带 score（direct=2/two-hop=1），使 flow/complete/prompt 的 `rejected && score>0` 过滤器可渲染；引擎 decision cap 必须保持 20。

#### 场景：两跳只收防复潮

Given 某文件被 100+ 变更交付过且两跳可达 144 条决策（139 implemented）
When scope 遍历
Then 输出只含 rejected/deathPath 条目，且 cap ≤20

#### 场景：渲染面可见

Given 两跳命中一条 rejected 决策
When 走 flow 防复潮过滤器（h.deathPath || (rejected && score>0)）
Then 该条目必须通过（score 在场）

### FR-03: C 段：平台 decisions 补 8~10 条（27 条非 parking rejected 中选、排除同文件重复 id、query 用「域关键词+标题」配方）；scope 面两侧各补 5~8 条带 scope_files 的 case（平台用 fetch-sse/auth_deps/main.py 三个真实 doc-refs 路径）；validateLabels 扩展 scope_files 存在性与 anchor heading 归一化校验 + scope-unreachable 静态可达性警告

数据集必须扩充：平台 decisions 面补 8~10 条（只从非停车场 rejected 中选、排除同文件重复 id、query 统一「域关键词+标题」配方）；scope 面两侧各补 5~8 条带 scope_files 的 case 且 scope_files 必须是目标仓真实存在路径。validateOrganicCase 必须校验 scope_files 类型；validateLabels 必须校验 scope_files 存在性、expected anchor 的 heading 归一化可达性，并对 scope 面输出 scope-unreachable 警告（不得静默 null 或删标签）。

#### 场景：停车 reject 不可选

Given 平台 rejected 中有 24 条位于 decisions/unmapped.md（停车场）
When 构造 decisions case
Then 禁止选用这些条目（结构性不可命中）

### FR-04: 探针：scope-manual GREEN（补 entries-only 正例与 section 隔离负例）；其余五类保持/转绿

scope-manual 探针必须转 GREEN，并新增两条断言：entries-only 正例（无决策锚点时手工条目仍可达）与 section 隔离负例（只给另一 section 的路径/裸文件名时不得召回该条目）。其余五类探针必须保持 GREEN。

#### 场景：探针升级

Given 修复后的图谱与 scopeRecall
When 跑六类探针
Then 六类全 GREEN（scope-manual 含新正负例）

### FR-05: 验收口径：原 5 条 scope 冻结子集单列如实报告（预计仍 0.2，不得用新增 case 掩盖）；新增 scope 子集单列 top3（平台 n≥6、本仓 n≥5）；entries/decisions/search/fr 旧 case 逐条 rank 不回归（平台 decisions n 扩大导致 top3 变化属预期）

评测输出必须按子集单列 scope 面指标：frozen（原 5 条，如实报告预计仍 0.2）与 added（新增 case，本仓 n≥5、平台 n≥6），禁止用新增 case 掩盖冻结子集结果；entries/decisions/search/fr 旧 case 必须逐条 rank 不回归。

#### 场景：子集单列

Given scope 面数据集含 frozen 与 added 两组 case
When 跑评测
Then 输出含 scope.subsets.frozen 与 scope.subsets.added 两套指标，且 details 可按子集追溯

### FR-06: 回归：knowledge 面全绿 + lint 绿；baseline 更新 version=1；organic 到每仓 50 推迟为独立数据变更

变更必须使 knowledge 面既有测试全绿、lint 通过、baseline 更新且 version 保持 1；图谱 doc-refs 引入的 doctor medium 悬空增量必须单列说明；organic 扩充到每仓 50 推迟为独立数据变更（本次不做）。

#### 场景：收口口径

Given 变更完成
When flow done
Then knowledge 面测试全绿 + lint 绿 + baseline version=1 + 悬空增量已单列说明

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/knowledge-graph.test.mjs「section 级 doc-refs 与 scopeRecall entry 收集」
FR-02: test/knowledge-graph.test.mjs「两跳 rejected/deathPath 与排序」
FR-03: test/eval-knowledge-dataset.test.mjs「scope_files 校验与 scope-unreachable」
FR-04: test/eval-knowledge-probes.test.mjs「scope-manual entries-only 正例与 section 负例」
FR-05: test/eval-knowledge-runner.test.mjs「scope 子集单列与 details」
FR-06: test/knowledge-hotpath-cache.test.mjs「手工文档编辑触发图缓存失效」+ test/knowledge-graph.test.mjs
