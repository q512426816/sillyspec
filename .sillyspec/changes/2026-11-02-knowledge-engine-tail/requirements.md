---
author: flow-machine-draft
created_at: 2026-11-02T08:04:03.234Z
---
# 需求规格（Requirements）— 2026-11-02-knowledge-engine-tail

## 功能需求

### FR-01: FR-01 向量路径融合：matchKnowledgeHybrid 抽 fuseBaseWithScope 公共 helper（路由/向量两分支同源、catch 返回 base、scopeFiles 经 graphPathCandidates 规整）；测试钉 base 契约、去重、原序、json.vector 保留且 json.scope 不设、buildSearchMatches channel=vector、零额外网络

`matchKnowledgeHybrid` 必须把「base + scopeFiles → 融合结果」抽成单一 `fuseBaseWithScope(base)` 辅助，路由命中与向量命中两条路径必须共用同一实现（禁止只修路由侧）；scopeFiles 必须经 `graphPathCandidates` 规整；融合失败必须返回 base 原对象。测试必须钉死：base 契约（matched/entries/decisionHits）、scope 增量去重与原序、`json.vector` 保留且 `json.scope` 不设、`buildSearchMatches` 的 channel=vector、向量路径不额外发网络请求。

#### 场景：向量命中 + scope 独有

Given 路由零命中、向量命中一条决策、scopeFiles 指向热文件
When matchKnowledgeHybrid（VECTOR=on + mock 平台）
Then 结果保留向量 decisionHits 原序，scopeDecisionHits 含 scope 独有条目；不设 json.scope

#### 场景：向量路径失败降级

Given 向量命中但图构建/遍历抛错
When 融合
Then 返回向量 built 原对象（不降级词片、不丢已得结果）

### FR-02: FR-02 遥测 scope 可见性：flow/prompt/execute 三处注入点统一新增 scopeMatchedFiles（实际展示子集：rejected/deathPath top3 + scopeEntries top3，按 ref 去重）；matchedFiles 保持查询通道语义（entries+routeHits）；mentionedFiles 按实际展示集合构造；knowledge-stats 口径文档同步；standalone 与融合两形态不双记

三个注入点（flow.js、run/prompt.js、stages/execute.js）的遥测必须统一新增 `scopeMatchedFiles` 字段：只含实际展示的 scope 子集（rejected/deathPath top3 + scopeEntries top3，按 ref 去重）；`matchedFiles` 保持查询通道语义（entries + routeHits）不变；`mentionedFiles` 必须按实际展示集合（📚 entries top3 + 🧭 routeHits top3 + scope 否决 top3 + scopeEntries top3，去重）构造；standalone 形态的 scopeEntries 已经通过 entries 进入 matchedFiles，禁止在同一事件里双记；knowledge-stats 口径文档必须同步说明 scope 单列。

#### 场景：三处口径一致

Given 同一知识 fixture 分别走 flow/prompt/Wave 注入
When 读取 hits.jsonl
Then 三处事件都有 scopeMatchedFiles 且内容规则一致；matchedFiles 不含 scope 增量

#### 场景：不双记

Given standalone scope 命中（路由/向量零命中）
When 落遥测
Then matchedFiles 含 scopeEntries（经 entries），scopeMatchedFiles 不含重复项

### FR-03: FR-03 图卫生：sectionFilePaths 出口过滤「路径必须含 /」（只改 section 级 doc-refs，卡片/scan 不动）；GRAPH_CACHE_VERSION 3→4；删除 scopeRecall 的 frCount/frs 收集与测试字面量、注释改为 FR 召回由域路由 digest 承担；getKnowledgeGraph memo 只加注记（不统一 standalone）

section 级 doc-refs 必须在 `sectionFilePaths` 出口过滤「路径必须含 /」（裸文件名词如 Next.js/Node.js/local.yaml/model.py 不建边）；只改 section 级，模块卡与 scan 采集不动；`GRAPH_CACHE_VERSION` 必须升 4（构建输出变化，旧缓存必须失效）；`scopeRecall` 的 `frCount` 字段与 `frs` 收集必须删除（恒 0、无消费方），注释改为「FR 召回由域路由 digest 承担」；`getKnowledgeGraph` 的 memo 只在注释注明「长驻消费方需自行失效，当前仅 CLI 短进程」，禁止把 standalone 分支统一过去。

#### 场景：散文 token 不建边

Given section 正文含 Next.js、Node.js、local.yaml、model.py 与 src/a.js
When 建 section 级 doc-refs
Then 只对 src/a.js 建边（裸名词全部过滤）

#### 场景：旧缓存失效

Given 存量 cache 为 version 3
When 升级后首次构建
Then 不命中旧缓存（version 4 重建；边数按预期下降）

### FR-04: FR-04 测试：向量融合用例（mock fetch + 局仓 local.yaml platform + env on，未修复必红）、遥测两形态断言、doc-refs 过滤正反例（Next.js 不建边/src/a.js 建边）、frCount 删除后图谱测试全绿

测试必须先写后实现：向量融合用例（局仓 local.yaml platform + mock fetch + env on，未修复实现必红）、遥测 standalone/融合两形态断言（不双记）、section doc-refs 正反例、frCount 删除后的图谱测试适配；全部跑绿。

#### 场景：空实现判据

Given 把向量分支恢复为 `if (built) return built`
When 跑向量融合用例
Then 必须失败（测试不是空转）

### FR-05: FR-05 回归：145 测试全绿 + lint 绿 + eval 五面不回归 + 六探针 GREEN；向量路径 eval 不覆盖（VECTOR=off）写入 verify-result 交付说明

变更必须使知识面 145 测试全绿、lint 通过、eval 五面不回归、六探针 GREEN；向量路径不被 eval 覆盖（eval 强制 VECTOR=off）这一点必须写入 verify-result/交付说明，禁止用「eval 绿」冒充向量路径已验。

#### 场景：验收口径

Given 变更完成
When flow done
Then 测试全绿 + lint 绿 + eval 不回归 + 六探针 GREEN + 向量路径证据仅单测（已注明）

### FR-06: FR-06 数据规划记录（不占 FR）：design/README 记「下一轮数据扩容必须 flow 形态带 scope_files + fusion 子集升主刻度，并混入非标题复述查询」

design/README 必须记录数据规划注记：下一轮数据扩容（organic 到每仓 50）必须让 flow 形态 case 整体带 scope_files、fusion 子集升为主刻度，并混入非标题复述的真实查询；本变更不占代码 FR。

#### 场景：注记在场

Given 变更完成
When 读 design/README
Then 数据规划注记在场（可检索）

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/knowledge-fusion.test.mjs「向量路径融合对称（mock fetch + env on）」
FR-02: test/thin-inject-telemetry.test.mjs「scopeMatchedFiles 三处口径与不双记」
FR-03: test/knowledge-graph.test.mjs「section doc-refs 裸名词过滤 + frCount 删除 + 版本 4」
FR-04: test/knowledge-fusion.test.mjs「向量融合空实现判据」+ test/thin-inject-telemetry.test.mjs
FR-05: test/knowledge-graph.test.mjs + test/thin-inject-telemetry.test.mjs（回归面）
FR-06: 不适用：纯文档注记（design/README），无代码测试面
