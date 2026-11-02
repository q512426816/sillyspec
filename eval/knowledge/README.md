# 知识检索评测面（eval/knowledge）

为 SillySpec 知识库存取提供**可复跑、分消费面、带缺陷探针**的评测尺子。
与 `eval/`（A/B 流程评测）独立：这里测的是「检索能否把对的知识送到 agent」，不是「流程是否提升任务通过率」。

## 用法

```bash
node eval/knowledge/run.mjs                     # 评当前仓（缺省），读取 baseline 并对比
node eval/knowledge/run.mjs --repo <path>       # 评任意仓（路径；可逗号分隔多个）
node eval/knowledge/run.mjs --repo <label>:<path>,<label>:<path>   # 显式仓标签（对齐数据集 repo 字段）
node eval/knowledge/run.mjs --face entries      # 单面
node eval/knowledge/run.mjs --json              # 机器可读
node eval/knowledge/run.mjs --set-baseline      # 写入 baseline.json（提交入库）
node eval/knowledge/run.mjs --smoke             # 零数据依赖冒烟（六类探针 + baseline 往返）
npm run eval:knowledge                          # 等价于评当前仓
```

**工具中立**：runner 不枚举任何具体项目——仓从 `--repo` 路径解析，缺省当前仓；
仓标签取 `label:` 显式值或路径 basename。`datasets/organic.jsonl` 里的 repo 字段只是标签，
与本仓的实例数据一起提交；换项目时替换数据集即可，工具代码零改动。

## 三个数据源

| 源 | 内容 | 用途 |
|---|---|---|
| `datasets/organic.jsonl` | 遥测 inject query 抽样 + 人工 anchor 级标签（已冻结，不随遥测漂移） | **主质量指标** |
| self（现场构建） | 归档 `flow-state.input` → 该变更蒸馏决策的映射 | 仅链路 smoke（自产自测偏差，禁入质量指标） |
| `fixtures/index.mjs` | 六类缺陷的最小合成知识库 | 缺陷探针（pass=修复后期望） |

organic 字段：`id / repo / face(entries|decisions|search|scope) / query / expected[] / scope_files?`。
`expected` 含 `#` 为精确 `file#anchor`；不含 `#` 为文件级前缀匹配。空 `expected` 的 case 计入
`skipped_cases` 并披露，绝不静默当零命中。

## 五个消费面与指标

| 面 | 真实入口 | rendered 口径 | k |
|---|---|---|---|
| entries | `matchKnowledgeHybrid` 的 entries（flow 📚 行） | 前 3（不去重） | 3 |
| decisions | `matchKnowledgeHybrid` 的 decisionHits（rejected/死路优先） | 前 5 | 5 |
| search | `cmdSearch` 等价（hybrid + `buildSearchMatches`，file 级） | limit 10 | 10 |
| scope | `scopeRecall` 图遍历（引擎内建 cap 3/20，raw==rendered，truncated 恒空） | entry 3 + decision 20 | 3/20 |
| fr | `readActiveFrDigest` + query×标题重叠（FR 索引 digest 通道） | 前 8 | 8 |

entries/decisions/search 与生产入口同源（hybrid 三层 + 生产构造单一源）；fr 面承载
「FR 条目能否被 query 找到」的刻度（生产按 design 交付清单路由域，此处以标题可达性近似）。
`file`/`fr`/`decisions` 期望在迁移后归位：entries 面只测手工知识条目，fr/decisions 文件期望
走各自专用面（2026-11-02 复核 P1-②——旧数据集把路由行期望挂在 entries 面，rank-denoise
的 route-rows 修复会让它们结构性 miss，数字会假性回退）。

每面同时输出 **raw**（引擎命中序）与 **rendered**（消费面实际切片）两套 Top-1/Top-3/MRR。
`truncated` = raw 命中而 rendered 未呈现的 case——用于区分「引擎没召回」与「召回了但被截断」。
`details` 记录每 case 的 raw_rank/rendered_rank（--json 输出）。

## 数据集标签自检

`validateLabels` 在每次运行校验 expected 的 file 存在性与 anchor 可达性（文件正文或 INDEX
含该锚点串），检出「结构性不可命中」标签（如 epoch 迁移后 D-id 换了域文件）并输出
`label_issues`——标签不会随知识库演化静默腐烂。

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

## 数据规划注记（2026-11-02-knowledge-engine-tail）

下一轮数据扩容（organic 到每仓 50）必须同时满足三条，否则尺子会重复打满：

1. **flow 形态带 scope_files**：生产 flow start 恒传 scopeFiles，而 eval 的 entries/decisions 常规
   case 目前测的是「无 scope 的 hybrid」——扩容时常规 case 整体带 scope_files，fusion 子集升为主刻度。
2. **fusion 子集升主刻度**：当前 fusion n=2、fr prod n=1，只能证明通道存在，不能证明生产效果。
3. **混入非标题复述查询**：现有有机 case 多为「域关键词+标题」公式化查询（平台 decisions 1.0 n=9
   已打满），扩容时纳入真实任务描述类查询，否则 decisions/entries 面失去分辨力。

## 当前基线（2026-11-02，数据集面归位后）

本仓的实例基线（两仓用 `--repo sillyspec:<本仓路径>,platform:<平台仓路径>` 生成；
仓标签与数据集 repo 字段对齐——换项目时基线与数据集一起替换）：

- sillyspec：entries top1/top3 1.0（n=7）、decisions 0.6（n=5）、search 1.0（n=7）、
  scope 0.2（n=5）、fr top3 0.3333（n=3）、self own_hit 0.0291 / leak_gap 0。
- platform：entries 0.5556/0.8889（n=9）、decisions 1.0（n=1）、fr top3 0.2（n=5）、
  scope n=0（未标注）、self own_hit 0.0274 / leak_gap 0.0213。
- 探针：score-contract / word-boundary / route-rows / fixed-entries 四类 GREEN（变更 1 修复），
  scope-manual 仍 RED（变更 2 范围）、linkage GREEN。标签自检 0 问题。

注意：entries/decisions 面的 n 较小（7/5/9/1），每个 case 摆动 ~10 个百分点；fr 面 top3 偏低
（0.2~0.33）是 FR 标题可达性的真实信号，留变更 2/3 评估。scope 面平台 n=0 待补标注。

后续变更（排序降噪、scope 两跳、融合）以本 baseline 为对照，验收看各面 raw/rendered 变化
与对应探针翻转，目标 entries/search Top-3 ≥ 0.8。
