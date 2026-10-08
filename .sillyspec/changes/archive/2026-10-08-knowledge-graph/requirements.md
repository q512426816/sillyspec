---
author: t
created_at: 2026-10-08 14:20:00
---
# 需求规格（Requirements）— 2026-10-08-knowledge-graph

## 功能需求

### FR-01: 图引擎按本体契约解析九面知识为内存派生图

- buildKnowledgeGraph(specRoot) 必须聚合手册条目/决策库/FR 索引/模块图/模块卡/changelog/扫描文档/变更交付面/测试绑定九面，产出 10 类节点、16 类边、三档语义强度（strong 可传播 / medium 仅展示 / weak 仅展示与自检）的内存图；不落盘任何缓存文件。
- 决策节点去重键必须为 file+id+change 三元组（跨变更同号不折叠）；fr 版本链边必须采集自索引物化形态（superseded_by/取代链），不得依赖仅存归档 requirements.md 的承接原文。
- 图构建必须只读（不改任何知识文件）。

#### 场景：全形态解析

- Given 临时 fixture specRoot 含 decisions（含 rejected/死路注记/同号跨变更条目）、fr（含 superseded_by 与测试绑定子块）、INDEX 路由行、_module-map.yaml（paths/depends_on/doc）、模块卡（正文路径引用）、changelog（表格行/列表行/标题态三态）、扫描文档（正文路径引用）；When buildKnowledgeGraph 执行；Then 各面节点边按本体表落位、同号不同变更的两条决策各自成节点、不产生任何落盘文件。

#### 场景：坏行容忍

- Given changelog 含不可解析行与 fr 文件含坏 JSON 侧车缺省；When 构建；Then 坏行跳过计数不抛错（fail-soft）。

### FR-02: knowledge graph 查询面五子命令（文本与 --json 双出口）

- `sillyspec knowledge graph neighbors|path|impact|orphans|dangling` 必须可用，全部支持 `--json` 与 `--edges <边型>` 筛选。
- 遍历类查询（path/impact）必须只在强边子集上扩展；impact 闭包深度必须 ≤2（supersedes 与 module-dep 传递例外）；不可达必须显式判定返回而非空数组混淆。

#### 场景：impact 强边闭包

- Given fixture 图中 change 节点有 deliverables→file、file 有入边 anchors←decision、decision 有 supersedes 链；When impact(change)；Then 闭包含 file/decision/模块（belongs）且不含中弱边端点；防复潮计数返回 rejected 可达集。

#### 场景：边型筛选

- Given 图含 module-files 与 anchors 两类边；When neighbors(node, {edgeType:'module-files'})；Then 仅返回该型边端点。

### FR-03: doctor 六项图完整性检查（全 warning 不阻断）

- doctor 必须新增 graph-dangling-route（弱边悬空）/ graph-doc-dangling-ref（中边悬空）/ graph-dangling-anchor（强边锚点悬空）/ graph-orphan-entry（孤儿条目）/ graph-module-doc-gap（模块文档缺口）/ graph-changelog-dangling（changelog 行指向不存在变更或 ql）六检查项，全部 warning 级不改退出码语义。

#### 场景：断链命中

- Given fixture 含 INDEX 路由行指向不存在锚点、决策锚点指向不存在文件；When doctor 图检查执行；Then 两项各报一条 warning 且指向具体行/锚点。

#### 场景：干净面零告警

- Given 干净 fixture；When 检查执行；Then 六项零告警。

### FR-04: matchKnowledgeHybrid 新增 scope 遍历召回层（防复潮保底）

承接: FR-cli-entry-234

- matchKnowledgeHybrid 必须新增 opts.scopeFiles 参数（缺省/空数组 → 整层跳过）；层序必须为：路由 → 平台向量 → scope 遍历 → 本地词片 → 空。
- scope 遍历必须只走强边（scope files ←anchors← decision/fr + supersedes 一跳 + belongs-module），结果构造 matchKnowledge 同构返回（entries ≤3、decisionHits ≤20），rejected/deadPath 优先排序沿用。
- 防复潮保底：路由与向量双零命中时，scope 可达的 rejected/死路条目必须仍进 decisionHits。
- 消费方：flow 注入段传 touched 集（filesOverride ∪ design 交付表）；complete 门从 decisions.md「锚点：」字段提路径传入。

#### 场景：无 scope 与现状逐字节等价

- Given 同一 fixture 与查询；When 分别以无 opts.scopeFiles 与显式空数组调用 matchKnowledgeHybrid；Then 两返回与不携带该参数的旧行为逐字段一致（层序未插入任何命中）。

#### 场景：保底命中

- Given scope 文件上有 rejected 决策锚定、且查询词面三层全部零命中；When 携带该 scope 调用；Then decisionHits 含该 rejected 条目（matched=true）。

#### 场景：封顶

- Given scope 可达条目超 20；When 遍历召回；Then decisionHits 截断为 20 且 rejected/死路排前。

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/knowledge-graph.test.mjs「①解析全形态：节点边数与本体落位（含同号跨变更不折叠/不落盘）」
FR-01: test/knowledge-graph.test.mjs「②坏行容忍：changelog 三态坏行与侧车缺省 fail-soft」
FR-02: test/knowledge-graph.test.mjs「③查询面：impact 强边闭包深度与不可达判定 + 边型筛选」
FR-02: test/knowledge-graph.test.mjs「④CLI 分发：knowledge graph 子命令 --json/--edges 热测」
FR-03: test/knowledge-graph.test.mjs「⑤doctor 六检查：断链命中与干净面零告警」
FR-04: test/knowledge-graph.test.mjs「⑥召回接线：层序四层 + 无 scope 逐字节等价 + 保底命中 + 20/3 封顶」
FR-04: test/knowledge-graph.test.mjs「⑦消费方透传：flow touched 传递与 complete 锚点提取」
