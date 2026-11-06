---
author: t
created_at: 2026-11-06 23:58:45
generated_by: sillyspec-design-init
scale: small  # Step 8 精判：3 文件单模块族、任务顺序依赖无真并行簇（反判据：跨多文件/顺序依赖非 large 依据）、单会话上下文可吞吐 → 收编轻量道（2026-09-29-brainstorm-exit-thin-default）
---

# 设计文档（Design）— 2026-11-06-knowledge-body-recall

## 背景

知识库检索对普通知识文件（conventions/patterns/known-issues/gotchas 等人工区）的**正文内容不可见**：检索主通道（INDEX 路由匹配，src/knowledge-match.js:484-486）只读条目行的手写关键词；零命中回退 `fallbackByQueryShingles`（src/knowledge-match.js:390）语料只有 decisions 域条目文本；向量层语料契约也仅决策条目（src/knowledge-vector.js:202）。叠加「路由弱命中即短路遮蔽深层通道」（src/knowledge-vector.js:294-299）——平台仓实证（2026-11-06）：查「会话重开/无工作目录/SESSION_NO_CWD」，正文写了相关内容的条目检索零命中，仅 5 条泛词 tag 撞词的弱相关条目接住查询。用户定性原话：「想查询信息时没能根据相关度和关键词匹配到对应条目；全文读取虽然范围大但能找到对应描述」。

双路子代理独立分析（2026-11-06 本会话）定稿根因与推荐方案；本变更实现用户裁定的「方案 1+2 组合」+「实现形态 B 新增独立函数」。

## 设计目标

- 正文含查询相关词的普通知识文件段落，在路由零命中与弱命中两种场景下都能被检索召回（锚点级精度）；
- 路由命中路径保持零网络请求（性能契约不变）；
- 五个消费面（search 命令 / flow 注入 / complete 门 / prompt 决策块 / brainstorm 防复潮检索）既有行为零破坏；
- 窗参数以语料统计数据锚定（D-002），不拍脑袋。

## 非目标

- 向量层语料扩展到全库知识文件（跨系统改动，D-003）；
- 入库侧 INDEX 词表自动派生（D-unmapped-197 否决面，D-003 回应）；
- queryShingles 短词门槛修复（≥4 降 ≥3 救 `cwd` 类短词——用户裁出范围，统计已留数据：`cwd` 在本仓 4 个段落含）；
- 知识内容质量治理（proposed 收口 / K 形态契约——问题 B 线独立立项）。

## 拆分判断

单一检索引擎变更（一个新函数 + 编排接线 + 测试/基线），无批量模式需求，不拆分。

## 总体方案

### Phase 1 — 正文词片兜底函数 `fallbackByBodyShingles`（src/knowledge-match.js）

- **语料**：INDEX.md 引用的普通知识文件（解析复用 `parseKnowledgeIndex`，排除 `decisions/`、`fr/` 前缀路由行与停车场文件——它们已有专用通道），每文件按 `## ` 切段，段落=命中单元（锚点级）。
- **词片**：复用已导出的 `queryShingles`（src/knowledge-match.js:308，CJK bigram + ≥4 字符 ASCII 词，无新分词逻辑）。既有语义边界如实声明：纯 ASCII 查询不产 CJK bigram 词片（queryShingles 既有行为）——body 兜底对纯英文查询可能零产出，与 decisions 回退同边界，属既有机制语义非本次缺口。
- **窗判定（段落覆盖数口径，D-002 数据锚定）**：词片覆盖的段落数 `n_segs ∈ [2, max(2, ceil(8% × 该文件段落总数))]` 才算「跨段复现且非泛在」。**不用** decisions 通道的绝对次数窗——本仓实测（.sillyspec/.runtime/logs/bigram-stats.log，2026-11-06）：5 文件 109 段，5% 次数窗上限全为 2，会把「问题」(4 次)/「匹配」(5 次) 误判泛在；覆盖率口径下泛在词（目录 19.3%、会话 11.9%）正确排除、稀有词（重开 1.8%、知识 2.8%、问题 3.7%、匹配 4.6%）正确落窗。8% 取泛在/稀有的实测分界带（工作 5.5% 边界词落窗，可接受）。
- **段落命中**：段落内含 ≥1 落窗词片 → 该段命中；`score = 落窗词片数`。产出与路由结果同构的锚点级 entries（`{file, anchor, keywords:[落窗词片], display:"<标题>（正文词片命中）", category}`），消费面无感。
- **已修复过滤**：段落内含 `- 状态：已修复/已解决/已退役` 状态行时跳过（口径对齐 `isResolvedRoute` 的正文状态行判据，src/knowledge-match.js:372）。

### Phase 2 — `matchKnowledgeHybrid` 编排接线（src/knowledge-vector.js:291-319）

- **弱命中并联**（D-001 ②）：路由命中后调用 body 兜底，命中的段落 entries 按 `file+anchor` 键去重后**追加**到结果尾部（不重排路由命中——对齐 `fuseBaseWithScope` 的「只追加不重排」先例，src/knowledge-vector.js:270）；**该路径不发任何网络请求**。追加仅写**顶层 `result.entries`**（消费面单源——execute 注入 src/stages/execute.js:91、search 面 src/stages/knowledge.js:195、flow 注入段 src/flow.js:353-402 均读顶层字段；`json.entries` 全仓零消费点，不同步，仅在 json 面加 `bodyFallback: true` 判定键）。
- **零命中链补跑**（D-001 ①）：现有链末端（`fallbackByQueryShingles` 之后）仍零命中时，body 兜底接管返回。
- **注入面控制**：body 命中排在路由命中之后，被各消费面既有 cap（search `--limit`、flow top-8/top-3）天然截住，无新增 token 膨胀通道。

### Phase 3 — 消费面回归与评测基线

- 五消费面零破坏回归：既有四通道（路由/向量/scope/decisions 词片）行为与输出结构零变化（`fallbackByQueryShingles` 零改动，D-004）。
- `eval/knowledge`：organic/snapshot 面按基线重打流程处理；**scope-manual 探针当前 RED**（「手工知识被第一层短路」登记在案缺陷）——弱命中并联后手工条目正文可浮出，预期转绿（验收项）。

### Phase 4 — 可观测

- 遥测 `resultChannel`（src/knowledge-match.js:295）：body 兜底命中标 `fallback` 复用通道值 + entries 附 `bodyFallback: true` 细分键（producer=matchKnowledgeHybrid → knowledge-hits 遥测落盘 → consumer=knowledge-stats 聚合面按既有 channel 过滤零回归，细分键仅新面消费）；不新增 channel 枚举值（下游 stats 兼容）。

## 文件变更清单

| 操作 | 文件路径 | 说明 |
|---|---|---|
| 修改 | src/knowledge-match.js | 新增导出函数 `fallbackByBodyShingles(indexDir, taskContext)`（语料解析+段落覆盖窗+锚点级 entries+已修复段落过滤）；`resultChannel` 不动 |
| 修改 | src/knowledge-vector.js | `matchKnowledgeHybrid` 两处接线（弱命中并联追加 / 零命中链末端补跑）；数据流：body entries（producer=knowledge-match.js）→ 去重追加进既有 result.entries → 五消费面按既有结构消费（consumer 零改动）；遥测细分键 bodyFallback → knowledge-hits 落盘 → stats 既有聚合零回归 |
| 新增 | NEW:test/knowledge-body-recall.test.mjs | 覆盖：body 兜底主路径（正文词片锚点级命中）/段落覆盖窗判定（泛在排除、稀有落窗）/已修复段落跳过/弱命中并联去重追加/零命中链补跑/路由命中路径零网络断言/decisions 通道零回归对照 |

## 接口定义

```js
// src/knowledge-match.js 新增导出（与 fallbackByQueryShingles 并列，形态对齐）
export function fallbackByBodyShingles(indexDir, taskContext)
// 返回：{ matched: boolean, entries: Array<{file, anchor, keywords, display, category}>, report: string, json: { matched, entry_count, fallback: true, bodyFallback: true, entries } }
// 无可命中段落时返回 null（保持调用方零命中语义，对齐 fallbackByQueryShingles 契约）
```

- 本变更无 HTTP 端点、无 CLI 参数面变化（search 子命令零改动）；无对外字段（entries 结构为既有形态复用）。

## 生命周期契约表

不涉及生命周期契约。

## 数据模型

无 schema 变更（纯检索函数与编排，无表/无存储格式新增；遥测细分键为 jsonl 行内字段，knowledge-hits 既有格式兼容）。

## 兼容策略（brownfield 必填）

- 既有四通道（路由/平台向量/scope/decisions 词片）函数签名、输出结构、行为零变化（D-004：`fallbackByQueryShingles` 原样保留）；
- 本变更无配置面/无 env 键（窗参数 8% 为数据锚定缺省值写死，YAGNI 不开调优键；调优需求出现时另立变更）；
- 不改变的 API / 表结构：CLI 命令面、knowledge 目录格式、遥测文件格式均零变化。

## 风险登记

| 编号 | 风险 | 等级 | 应对策略 |
|---|---|---|---|
| R-01 | 窗参数 8% 对其他仓语料失配（本仓 109 段锚定；平台仓 126 段人工区同量级，风险低；超小/超大库可能偏差） | P2 | 接受：数据锚定缺省 + bodyFallback 遥测可观测命中率，失配时按遥测数据另立调优变更 |
| R-02 | 弱命中并联使路由命中路径耗时增加（语料 ~10 文件实时分段扫描） | P2 | 实测本仓全语料分段扫描毫秒级；测试面加耗时护栏断言（<100ms 量级） |
| R-03 | 并联去重逻辑错误导致同条目重复注入 | P1 | file+anchor 键去重 + 测试断言（路由命中集 ∪ body 命中集无重复键） |
| R-04 | 泛在词穿透窗判定造成噪声注入 | P1 | 段落覆盖窗 + score 排序 + 既有 cap 三层截流；eval organic 面噪声率对照 |
| R-05 | eval 基线重打流程波及并行变更 | P2 | 基线重打独立提交，diff 留痕可回滚 |
| R-06 | 无长驻进程/外部资源，生命周期面不适用 | P2 | 显式留痕（纯同步函数调用，无进程/句柄/缓存新增） |

## 决策追踪

| 决策 | 覆盖点 | 状态 |
|---|---|---|
| D-001@v1 | 总体方案 Phase 1（零命中链）+ Phase 2（弱命中并联）；FR-01/FR-02 | 已覆盖 |
| D-002@v1 | Phase 1 窗判定（段落覆盖数口径 + 8% 数据锚定 + bigram-stats.log 依据）；FR-01 | 已覆盖 |
| D-003@v1 | 非目标节（向量语料扩展/入库词表派生不做）；FR-03 | 已覆盖 |
| D-004@v1 | Phase 1（fallbackByQueryShingles 零改动）+ 兼容策略节；FR-04 | 已覆盖 |
| D-005@v1 | 非目标节（rejected：不扩展现有函数，防复潮条目） | 已覆盖（rejected 留痕） |
| D-006@v1 | 非目标节（rejected：不预建索引，防复潮条目） | 已覆盖（rejected 留痕） |

无未解决决策；无组合约束裁定（D-001~D-004 相互独立无状态叉乘面）。

## 自审

- [x] 章节齐全（背景/设计目标/非目标/总体方案/文件变更清单/接口定义/风险登记）
- [x] frontmatter 字段齐全（author/created_at/scale——scale 留 Step 8 落值）
- [x] 引用所有当前版本 D-xxx@vN（D-001~D-006 全部入追踪表）
- [x] 生命周期关键词检测：不涉及生命周期契约（豁免短语已写）
- [x] UI 原型分级：跳过（纯后端 CLI 检索逻辑，无界面变化——Step 5 已声明并经用户确认）
- [x] 无「⚠️ 自审存疑」项
