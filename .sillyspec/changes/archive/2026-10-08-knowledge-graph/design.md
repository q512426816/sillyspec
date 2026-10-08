---
author: t
created_at: 2026-10-08 13:50:23
scale: small
---

# 设计文档（Design）— 2026-10-08-knowledge-graph

## 背景

本仓知识面（手册/决策库/FR 索引/模块卡与 changelog/扫描文档/变更档案/测试绑定）的字段契约里已经存在一张隐式图——9 类知识面 × 11 类关系全部是机器可解析、幂等机器写入的字段（`锚点：`/`变更：`/`supersedes：`/`承接：`/`_module-map.yaml` paths/depends_on/design 交付清单/测试绑定子块），但没有任何一处把它们 join 成整图，检索面是纯扁平三层（INDEX 关键词路由 → 平台向量 → 本地词片回退）。

实测代价有据：2026-09-28-knowledge-inject-ranking 立项根因是死路条目排 148/188 位永不回显（词面召回的结构性盲区）；2026-10-08-knowledge-inbox-triage 花整轮变更人肉清账 INDEX 断链与孤儿条目（图完整性无机器自检）。原型实测另坐实：轻量道归档的交付面只在 change-patch.json（design.md 无交付表），变更→文件边必须双源采集（D-005）。

本变更把既有字段聚合成**内存派生图**，交付三个机器面：查询 CLI、doctor 图完整性自检、检索第四层 scope 遍历召回（含防复潮保底）。md/yaml 真相源一字不动。

## 设计目标

1. **统一图模型**：`buildKnowledgeGraph(specRoot)` 聚合五个既有 parser（parseKnowledgeIndex / parseDecisionEntries / fr-index 读侧 / module-map 加载 / test-bindings 读侧），产出 10 类节点、16 类边、三档语义强度的 typed graph（本体表见总体方案）。
2. **查询面**：`sillyspec knowledge graph <子命令>`——neighbors / path / impact / orphans / dangling，全部带 `--json` 机器出口与 `--edges <边型>` 边型筛选。
3. **自检面**：doctor 新增图完整性检查项，人肉清账机器化。
4. **召回面**：`matchKnowledgeHybrid` 新增 scope 遍历层（向量之后、词片之前）；防复潮保底——scope 沿强边可达的 rejected/死路条目保底进场。
5. **入口键纪律**：图的查询键全部机器算（变更期 scope 文件集 / 需求期承接引用与模块域反查 / 手动 CLI 锚点），agent 不以自由文本为图查询键（D-004）。

## 非目标

- 不做平台侧（SillyHub graph-search 端点、stats 图维度指标、前端可视化页）——原型已预览形态，落地另立变更。
- 不引入图数据库、不落盘任何图缓存文件、不新增刷新机制（D-003 与 project-map 墓碑切割）。
- 不新增人读导航文档（module-map+模块卡已覆盖该职责）。
- 不建 keyword 节点（route 边的 INDEX 行不成为图节点，防图爆炸；route 边由 INDEX 文档节点挂接）。
- 不做 LLM 实体抽取管线（图边全部来自既有字段契约，写入方是幂等机器）。
- 不改 INDEX 路由行格式、不改 decisions/fr 条目字段契约（解析侧复用，不新增写入面）。

## 拆分判断

单变更收口：图引擎+查询 CLI+doctor+召回接线共一个上下文可吞吐（新模块约 500 行 + 五处既有文件小改 + 一个测试文件），无 Wave 并排需求、无多阶段治理。平台侧（非目标）若启动另立变更，以本变更加立的 `--json` 出口为契约面。规模评估：**small**（轻量道收编，`flow start` 续跑）。

## 总体方案

### 1. 本体表（核心契约——分档错误即召回漏/洪水，D-002）

**节点 10 类**：entry（手册条目）、decision（D-xxx@vN，file+id+change 三元组去重）、fr（FR-域-NNN）、module、file（代码文件）、test（测试文件）、change、ql（quicklog 条目）、doc（统一文档节点：kind ∈ scan | module-card | module-changelog | manual-index）、project。

**边 16 类**：

| 边 | 方向 | 强度 | 可传递 | 采集源 |
|---|---|---|---|---|
| anchors | decision/fr → file | 强 | 否（遍历入口） | `锚点：`/`文件：` 字段 + 路径 token 提取 |
| supersedes | decision→decision、fr→fr | 强 | 是（版本链） | decision：`supersedes：`（同域 D-id 解析）；fr：`superseded_by：`/`取代链：`（承接行经 fr-index 翻链后的索引物化形态——承接原文只存归档 requirements.md，fr-index.js:353 翻链写入索引） |
| from-change | decision/fr → change/ql | 强 | 否 | `变更：`/`来源：` |
| belongs-module | fr → module | 强 | 否 | fr 域文件名 |
| module-dep | module → module | 强 | 是（影响面闭包） | `_module-map.yaml` depends_on/used_by |
| module-files | module → file | 强 | 否 | `_module-map.yaml` paths |
| deliverables | change → file | 强 | 否 | design.md 交付表 ∪ change-patch.json files（D-005 双源） |
| change-modules | change → module | 强 | 否 | deliverables ∩ 模块 paths 最长前缀派生 |
| test-binding | fr/ql → test | 强 | 否 | 测试绑定子块 + quicklog/test-bindings.json 双真源 |
| describes | module-card → module | 强 | 否 | `_module-map.yaml` `doc:` 字段 |
| changelog-of | module-changelog → module | 强 | 否 | 文件名派生 |
| changelog-entry | module-changelog → change/ql | 强 | 否 | 机械表格行（`\| 日期 \| 变更名 \|`）∪ 列表行 ∪ 标题态（`## 日期 — 标题（变更名 task-NN）`——backend 侧 changelog 主形态）；三态坏行跳过不阻断 |
| doc-refs | module-card → file | 中 | 否 | 卡片正文路径 token（锚点提取器同款） |
| scan-refs | scan → file | 中 | 否 | 扫描文档正文路径 token |
| route | INDEX → entry | 弱 | 否 | INDEX.md 路由行 |
| entry-link | entry → entry | 弱 | 否 | 预留契约位（`关联：` 字段，本变更不启用写入） |

**推理规则**：遍历类查询（impact 闭包、召回传播、path 寻路）只在强边子集上扩展；中边（doc-refs/scan-refs 漂移引用）与弱边（route/entry-link）仅 neighbors 展示与 doctor 自检；可传递边仅 supersedes 与 module-dep。

### 2. 图引擎（src/knowledge-graph.js，新增）

- `buildKnowledgeGraph(specRoot)`：纯函数、解析时内存构建、随建随用（无缓存文件）；聚合五个既有 parser（import 复用不复制——test-bindings D-002 单点解析纪律同款）。决策去重键 file+id+change（跨变更同号不折叠，修复原型已知口径差）。
- 查询 API：`neighbors(anchor, {depth, edgeClass})`、`path(a, b)`（强边 BFS）、`impact(file|module|change)`（强边闭包深度≤2 + supersedes/module-dep 传递）、`orphans()`、`dangling()`；`--edges <type>` 边型筛选（原型轮用户确认入设计）。

### 3. CLI 子命令（src/index.js 注册）

`sillyspec knowledge graph neighbors|path|impact|orphans|dangling <参数> [--edges <型>] [--json]`。文本与 `--json` 两出口同构（平台侧未来消费 `--json`）。

### 4. doctor 检查项（src/doctor-diagnostics.js）

- `graph-dangling-route`：路由行指向不存在文件/锚点（弱边 → warning）
- `graph-doc-dangling-ref`：doc-refs/scan-refs 指向不存在文件（中边 → warning）
- `graph-dangling-anchor`：决策/FR 锚点指向不存在代码文件（强边 → warning 不阻断：并行变更可能正移动文件）
- `graph-orphan-entry`：条目零强边入度且无路由（→ warning）
- `graph-module-doc-gap`：模块有 map 条目但无卡片/changelog（→ warning）
- `graph-changelog-dangling`：changelog 行指向不存在变更/ql（→ warning）

### 5. 召回接线（scope 遍历层）

`matchKnowledgeHybrid` 层序调整为：路由 → 平台向量 → **scope 遍历** → 本地词片 → 空。

- 遍历路径：scope files ←anchors← decision/fr（+supersedes 一跳）→ belongs-module → 模块；深度≤2、只走强边（D-002/D-006）。
- 结果构造 matchKnowledge 同构返回（entries ≤3、decisionHits ≤20，rejected/deathPath 优先序沿用既有排序）。
- **防复潮保底**：complete 门与 flow 注入段的 decisionHits 获取路径上，scope 可达的 rejected/死路条目保底进场（路由与向量双零命中时仍注入）——修 148/188 沉底类盲区。
- **入口键（D-004）**：scope 文件集由调用方机器算（变更面调用方传 `resolveVerifyChangedFiles` 既有口径；CLI search 无 scope → 整层跳过）；需求期不新增入口（承接引用/模块域反查已有机制在 brainstorm 段，词面三层兜底照旧）。

## 文件变更清单

| 操作 | 文件路径 | 说明 |
|---|---|---|
| 新增 | NEW:src/knowledge-graph.js | 图引擎：buildKnowledgeGraph + 查询 API（本体表实现）+ scope 召回 + CLI 入口 |
| 修改 | src/stages/knowledge.js | 注册 graph 子命令（cmdKnowledge switch 懒加载——classify 同款；执行期落点修正：非 design 初稿所写 index.js） |
| 修改 | src/knowledge-vector.js | matchKnowledgeHybrid 增 opts.scopeFiles 参数与第三层遍历召回。数据流：producer=变更面调用方（flow.js 注入段 / run/complete.js knowledge-gate）传 scope 文件集 → hybrid 参数 → knowledge-graph.js 遍历 → consumer=decisionHits/entries（matchKnowledge 同构四键，封顶沿既有 20/3） |
| 修改 | src/knowledge-match.js | DECISION_FIELD_RE 增收 supersedes 字段（supersedesText）+ anchorFilePaths 导出（anchors 边采集复用）；同步入口 matchKnowledge 行为零变化 |
| 修改 | src/doctor-diagnostics.js | knowledge_graph_integrity 维度：六项图完整性检查（见总体方案 §4） |
| 修改 | src/flow.js | 注入段调用 hybrid 时传 scope 集（touched=filesOverride ∪ design 交付表既有变量） |
| 修改 | src/run/complete.js | knowledge-gate 防复潮保底：decisions.md「锚点：」提取 scope（scopeFromDecisionsMd）传入 hybrid |
| 修改 | src/run/prompt.js | ~~{DECISION_HITS} 消费点透传 scope~~ **执行期裁定：零改动**——该渲染点在 brainstorm Step2（tasks.md 尚未生成、decisions.md 未形成，src/run/prompt.js:1390 注释可证），时点上无结构键可传；维持既有词面行为（D-004 纪律反推：不以自由文本为图键） |
| 新增 | NEW:test/knowledge-graph.test.mjs | 七组用例（①解析②坏行③查询+本体钉子④CLI⑤doctor⑥接线⑦消费方）；执行期修正：扩展名按 test/ 目录 .test.mjs 既有约定（design 初稿误写 .js） |
| 修改 | test/decision-route-vocab.test.mjs | 预存红修复：钉子测试词面与 2026-10-08-knowledge-inbox-triage 归档后的 INDEX 新路由词（「拆分」）碰撞——查询二改用「误拆」保留回退层测试意图，注释留痕漂移来源 |
| 修改 | package.json | test:core 显式清单登记 test/knowledge-graph.test.mjs |
| 修改 | .sillyspec/docs/sillyspec/modules/_module-map.yaml | core-engine 模块 paths 补录 src/knowledge-graph.js（lint 模块归属盲区门） |

## 接口定义

```js
// src/knowledge-graph.js（新增导出）
buildKnowledgeGraph(specRoot) → { nodes: Map<id,Node>, edges: Map<type, Edge[]>, stats }
neighbors(graph, anchor, { depth=1, edgeClass='strong'|'all', edgeType }) → { nodes, edges }
path(graph, a, b) → { found, hops: Edge[] }   // 强边 BFS
impact(graph, key /* file|module|change id */) → { closure: Set<id>, modules, decisionsAndFrs, rejectedReachable }
orphans(graph) / dangling(graph) → Finding[]  // doctor 消费

// src/knowledge-vector.js（签名扩展，既有参数不变）
matchKnowledgeHybrid(indexDir, taskContext, opts = { cwd, limit, scopeFiles? })
// scopeFiles?: string[]——在场且非空时启用第三层遍历召回；缺省/空 → 整层跳过，行为与现状逐字节等价（回归钉死）
```

CLI：`sillyspec knowledge graph <neighbors|path|impact|orphans|dangling> <参数> [--edges <型>] [--json]`。

## 生命周期契约表

生命周期契约：无/N/A（本变更只消费 complete 门与注入段既有时机，不引入 session/lease/daemon 类事件；graph 为函数调用内对象，无状态转译）。

## 数据模型

无 schema 变更：不新增数据库表、不新增落盘文件格式；图为运行时内存结构（nodes/edges Map）。遥测面复用既有 knowledge-hits 六型事件，不新增事件类型。

## 兼容策略（brownfield 必填）

- **无 scope 零变化**：CLI `knowledge search` 等无变更面调用方走 hybrid 时 scopeFiles 缺省 → 遍历层跳过，四消费方行为与现状逐字节等价（回归测试钉死；承接 FR-cli-entry-234 的层序行为由新 FR 接管）。
- 同步入口 `matchKnowledge` 行为零变化（FR-cli-entry-235 语义延续，不承接不改写）。
- 平台向量开关/超时/降级纪律不变；遍历层位置在向量之后，不抢占既有三层任何命中。
- decisions 库/FR 索引/模块卡格式契约零改动——图只读。
- doctor 新检查项全部 warning 级，不改退出码语义（沿 apply_manifest_drift advisory 先例）。

## 风险登记

| 编号 | 风险 | 等级 | 应对策略 |
|---|---|---|---|
| R-01 | 注入洪水：遍历召回灌入不相关 rejected 决策 | P0 | 三闸（D-006）：scope 缺省/为空 → 整层跳过 / 只走强边 / decisionHits≤20、entries≤3 |
| R-02 | 锚点/引用漂移：文件移动后边悬空 | P1 | doctor warning 不阻断；scan/文档新鲜度维持 docs-debt/scan-staleness 既有机制，图只报告不重建 |
| R-03 | 四消费方回归：层序调整破坏既有注入 | P0 | 无 scope 路径与现状等价回归测试；遍历层仅在向量零命中后接管 |
| R-04 | 本体分档错误：错标弱漏召回 / 错标强放大洪水 | P1 | 分档表为本 design 定稿契约；doctor 按强度分级告警；退役判据见 D-002 |
| R-05 | changelog 行格式漂移（三态并存：表格行/列表行/标题态，backend 侧以标题态为主） | P2 | 表格行为主、列表行与标题态 best-effort、坏行跳过计数不阻断（hits 坏行容忍先例） |
| R-06 | 与 project-map 墓碑的边界侵蚀（未来有人往图上挂缓存/刷新） | P2 | D-003 裁定留痕 + 本设计非目标显式清单；doctor 不新增任何"自动重连"动作 |
| R-07 | 无长驻进程/外部资源，生命周期面不适用（图=函数内对象，doctor 检查为同步调用） | — | 显式留痕 |

## 决策追踪

| 决策 | 覆盖点 | 状态 |
|---|---|---|
| D-001@v1 | 总体方案全部 + 非目标（平台侧排除） | 已覆盖 |
| D-002@v1 | 总体方案 §1 本体表 + 遍历规则 + R-04 | 已覆盖 |
| D-003@v1 | 非目标三条 + 背景切割声明 + R-06 | 已覆盖 |
| D-004@v1 | 设计目标 5 + 总体方案 §5 入口键 + 接口定义 scopeFiles 契约 | 已覆盖 |
| D-005@v1 | 本体表 deliverables 行（双源） | 已覆盖 |
| D-006@v1 | 总体方案 §5 三闸 + R-01/R-03 | 已覆盖 |

无未解决决策；无组合约束裁定相互作用的死锁面（D-003 边界与 D-006 三闸互不作用）。

## 自审

- [x] 章节齐全（背景/设计目标/非目标/总体方案/文件变更清单/接口定义/风险登记）
- [x] frontmatter 字段齐全（author/created_at/scale=small）
- [x] 引用所有当前版本 D-xxx@v1（六条全覆盖，见决策追踪）
- [x] 生命周期关键词（complete）出现处已紧邻豁免短语「生命周期契约：无/N/A」
- [x] UI 原型分级核对：本变更为纯 CLI/后端（无界面变化，跳过档）；变更目录存 prototype-knowledge-graph.html 为**平台侧远期形态预览**（用户轮要求产出），不属本变更交付面——已在非目标声明
- [x] 知识门三命中回应：sillyspec-gotchas plan→execute contract 编号递增（本变更 scale=small 走轻量道，不产 plan contract，不适用）；testing-gotchas pytest patch 函数内导入（后端 Python 测试面，本变更纯 Node 不触及，不复潮）；decisions/change.md（读并确认无与本设计冲突的现行条目）
- [x] 承接声明：本设计改写 hybrid 层序行为（vector-recall FR-cli-entry-234 所述四消费方走三层 hybrid）→ requirements 新 FR 块须加承接行 `承接: FR-cli-entry-234`；FR-cli-entry-235（同步零变化）语义延续不承接
- [x] 无「⚠️ 自审存疑」项
