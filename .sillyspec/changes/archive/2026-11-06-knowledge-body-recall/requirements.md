---
author: qinyi
created_at: 2026-11-06 23:52:57
generated_by: sillyspec-fourpiece-init
---
# 需求规格（Requirements）

## 角色
| 角色 | 说明 |
|---|---|
| agent（检索消费方） | 经 matchKnowledgeHybrid 的五个消费面（search 命令 / flow 注入 / complete 门 / prompt 决策块 / brainstorm 防复潮检索）消费知识命中的 agent |

## 功能需求

### FR-01: 正文词片兜底——普通知识文件正文段落锚点级可召回
- 必须实现 `fallbackByBodyShingles`：INDEX 引用的普通知识文件（排除 decisions/fr 路由行与停车场文件）按 `##` 段落建立检索语料，查询词片（queryShingles 既有产出）覆盖段落数落在窗 `[2, max(2, ceil(8% × 该文件段落总数))]` 内时，该段落以锚点级 entry 命中（与路由结果同构，`json.bodyFallback: true`）；无可命中段落必须返回 null 保持零命中语义。

Given INDEX 引用的普通知识文件某 `##` 段落正文含查询词片且词片覆盖段落数落在段落覆盖窗内
When 路由零命中的查询经 `fallbackByBodyShingles` 检索
Then 该段落以锚点级 entry 命中（`{file, anchor, keywords:[落窗词片], display:"<标题>（正文词片命中）", category}`，与路由结果同构），`json.bodyFallback: true`；无可命中段落返回 null 保持零命中语义。

### FR-02: 弱命中并联——路由命中时 body 兜底结果追加不重排、零网络
- 路由命中路径必须并联调用 body 兜底：命中 entries 按 `file+anchor` 键去重后追加到顶层 `result.entries` 尾部（禁止重排路由命中原序；`json.entries` 不同步——全仓零消费点），且该路径禁止发起任何网络请求（既有「路由命中零网络」契约保持，承接 FR-core-engine-211）。

Given 路由层弱命中（泛词 tag 撞词）已返回结果
When `matchKnowledgeHybrid` 路由命中路径执行
Then 并联调用 body 兜底，命中的 entries 按 `file+anchor` 键去重后**追加**到顶层 `result.entries` 尾部（路由命中原序不动；`json.entries` 不同步——全仓零消费点），且该路径**不发起任何网络请求**（既有「路由命中零网络」契约保持，承接 FR-core-engine-211）。

### FR-03: 既有四通道零回归
- 既有路由 / 平台向量 / scope / decisions 词片回退四通道的函数签名、输出结构、行为必须逐字段不变（`fallbackByQueryShingles` 必须原样保留；向量门行为不变，承接 FR-core-engine-211/212）。

Given 既有路由 / 平台向量 / scope / decisions 词片回退四通道
When 本变更合入后按既有测试面运行
Then 四通道函数签名、输出结构、行为逐字段不变（`fallbackByQueryShingles` 原样保留；向量门行为不变，承接 FR-core-engine-211/212）。

### FR-04: 窗判定与已修复段落过滤
- 覆盖段落数超出窗上限的泛在词片必须排除出命中；含 `- 状态：已修复/已解决/已退役` 状态行的段落必须跳过（口径对齐 isResolvedRoute 正文状态行判据）。

Given 词片覆盖段落数超出窗上限（泛在词，如本仓实测「目录」19.3%、「会话」11.9%）或段落含已修复状态行
When body 兜底检索执行
Then 泛在词片不参与命中；已修复段落被跳过（口径对齐 isResolvedRoute 正文状态行判据）。

## 非功能需求
- 兼容性：无配置面、无 env 键、无 CLI 参数面变化；CLI 命令面、knowledge 目录格式、遥测文件格式零变化（纯检索函数新增与编排追加）。
- 性能：路由命中并联路径全语料分段扫描毫秒级（测试面耗时护栏 <100ms 量级）。

## 决策覆盖矩阵（如存在 decisions.md）
| 决策 ID | 覆盖的 FR | 说明 |
|---|---|---|
| D-001@v1 | FR-01（零命中链）、FR-02（弱命中并联） | 方案范围 1+2 组合，用户裁定 |
| D-002@v1 | FR-01、FR-04 | 窗参数=段落覆盖数口径 8%，bigram-stats.log 数据锚定 |
| D-003@v1 | 非功能需求 | 非目标：向量语料扩展/入库词表派生不做 |
| D-004@v1 | FR-03 | fallbackByQueryShingles 零改动（实现形态 B） |
| D-005@v1 | —（rejected 防复潮留痕） | 落选：扩展现有函数 |
| D-006@v1 | —（rejected 防复潮留痕） | 落选：预建索引 |

## 测试绑定（每条 FR 至少一行：`FR-NN: test/路径「用例名」`；不适用要写理由；flow done 空行拒收）

FR-01: test/knowledge-body-recall.test.mjs「T1: 正文词片主路径锚点级命中」
FR-02: test/knowledge-body-recall.test.mjs「T4: 弱命中并联追加不重排+零网络」「T5: 去重无重复键」
FR-03: test/knowledge-body-recall.test.mjs「T6: decisions 通道与向量门零回归对照」
FR-04: test/knowledge-body-recall.test.mjs「T2: 段落覆盖窗泛在排除/稀有落窗」「T3: 已修复段落跳过」
