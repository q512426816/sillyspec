# 知识检索评测面（eval/knowledge）

为 SillySpec 知识库存取提供**可复跑、分消费面、带缺陷探针**的评测尺子。
与 `eval/`（A/B 流程评测）独立：这里测的是「检索能否把对的知识送到 agent」，不是「流程是否提升任务通过率」。

## 用法

```bash
node eval/knowledge/run.mjs                     # 两仓全量，读取 baseline 并对比
node eval/knowledge/run.mjs --repo sillyspec    # 单仓
node eval/knowledge/run.mjs --face entries      # 单面
node eval/knowledge/run.mjs --json              # 机器可读
node eval/knowledge/run.mjs --set-baseline      # 写入 baseline.json（提交入库）
node eval/knowledge/run.mjs --smoke             # 零数据依赖冒烟（六类探针 + baseline 往返）
npm run eval:knowledge                          # 等价于全量
```

平台仓路径默认 `C:/Users/qinyi/IdeaProjects/multi-agent-platform`，可用环境变量
`SILLYSPEC_EVAL_PLATFORM_ROOT` 覆盖；仓不存在时该仓自动跳过并披露。

## 三个数据源

| 源 | 内容 | 用途 |
|---|---|---|
| `datasets/organic.jsonl` | 遥测 inject query 抽样 + 人工 anchor 级标签（已冻结，不随遥测漂移） | **主质量指标** |
| self（现场构建） | 归档 `flow-state.input` → 该变更蒸馏决策的映射 | 仅链路 smoke（自产自测偏差，禁入质量指标） |
| `fixtures/index.mjs` | 六类缺陷的最小合成知识库 | 缺陷探针（pass=修复后期望） |

organic 字段：`id / repo / face(entries|decisions|search|scope) / query / expected[] / scope_files?`。
`expected` 含 `#` 为精确 `file#anchor`；不含 `#` 为文件级前缀匹配。空 `expected` 的 case 计入
`skipped_cases` 并披露，绝不静默当零命中。

## 四个消费面与指标

| 面 | 真实入口 | rendered 口径 | k |
|---|---|---|---|
| entries | `matchByRouting().entries`（flow 📚 行） | 前 3（不去重） | 3 |
| decisions | `matchByRouting().decisionHits`（rejected/死路优先） | 前 5 | 5 |
| search | `cmdSearch` 镜像（`searchView`，file 级） | limit 10 | 10 |
| scope | `scopeRecall` 图遍历 | entry 3 + decision 20 | 3/20 |

每面同时输出 **raw**（引擎全量命中序）与 **rendered**（消费面实际切片）两套 Top-1/Top-3/MRR。
`truncated` = raw 命中而 rendered 未呈现的 case——用于区分「引擎没召回」与「召回了但被截断」。

## 六类缺陷探针（probe RED = 缺陷仍在）

| 探针 | 检测对象 |
|---|---|
| score-contract | search 视图 score 必须等于实际命中标签数（现状 `score=keywords.length`） |
| word-boundary | `_` / `-` 是词字符：`node` 不得命中 `node_modules`、`worktree` 不得命中 `worktree_apply` |
| route-rows | entries 不得含 `fr/`、`decisions/` 路由行（各有专用通道） |
| scope-manual | scope 图遍历必须能返回手工文档条目（手工知识不被第一层短路） |
| fixed-entries | known-issues「已修复/已解决」条目默认不进 entries |
| linkage | 语料健康：决策条目总数 / 有锚点 / 有文件字段 / 任一关联 |

探针按「修复后的期望」断言：当前代码带缺陷时 RED 是**正确检出**；修复后转 GREEN。
`linkage` 是工具自身健康报告，当前应为 GREEN。

## self smoke 与泄漏对照

self 集只报三个数：`own_hit_top3`（查询命中自身蒸馏决策的比例）、`name_only_top3`
（仅变更名作查询的对照）、`leak_gap = own − name_only`。leak_gap 接近 0 表示命中主要靠
变更名同文泄漏，查询内容贡献小（D-001：leave-one-out 落地为对照而非字面剔除索引）。

## 基线与快照指纹

- `baseline.json` 可提交可 diff；键序固定、浮点 4 位小数。
- 每仓记录快照指纹 `{head, knowledge_hash, knowledge_files}`；指纹不一致时输出
  `snapshot_mismatch` 并同时给两套指标，禁止静默覆盖。

## 零副作用

runner 强制 `SILLYSPEC_KNOWLEDGE_VECTOR=off`、`SILLYSPEC_HITS_PUSH=0`，只调纯读引擎；
不写 `knowledge-hits.jsonl`、不发平台请求、不写平台能力缓存。唯一写点：`--set-baseline`
的 baseline.json 与图派生缓存（`<specRoot>/.runtime/cache/`，可再生、非遥测）。

## 当前基线（2026-11-02，首次落盘）

- sillyspec：entries raw top3 0.1667（n=12）、decisions top3 0.3333（n=3）、scope top3 0.2（n=5）、
  self own_hit 0.0291 / leak_gap 0。
- platform：entries raw top3 0.6667（n=15）、self own_hit 0.0245 / leak_gap 0.0183。
- 探针：5 类 RED（缺陷仍在）、linkage GREEN。

后续变更（排序降噪、scope 两跳、融合）以本 baseline 为对照，验收看各面 raw/rendered 变化
与对应探针翻转，目标 entries/search Top-3 ≥ 0.8。
