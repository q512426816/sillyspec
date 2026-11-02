---
author: flow-machine-draft
created_at: 2026-11-02T02:07:32.486Z
---
# 设计记录（Design Record）— 2026-11-02-knowledge-eval

## 做法概述

本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。

新建独立评测工具 `eval/knowledge/`（与 A/B 流程评测 `eval/` 分离，不复用其 SQLite 与 results 目录）。核心是「三源数据集 + 分面 runner + 缺陷探针」：

- **organic**：从 `.sillyspec/.runtime/state/knowledge-hits.jsonl` 抽取 inject 事件的 query 字段，按 `(change, query)` 去重成分层池（本仓约 110、平台约 548），分层抽样后人工标注 anchor 级期望命中，落 `datasets/organic.jsonl`。数据集一旦提交即冻结，不随遥测增长漂移（抽样种子与 case 列表固定）。
- **self**：runner 现场解析归档 `changes/archive/<name>/flow-state.yaml` 的 `input` 字段（本仓约 211 条，平台为 0 故自动跳过），以该 input 回放检索、期望命中该变更自己蒸馏出的 FR/决策；leave-one-out 口径下只作「蒸馏→检索链路是否连通」的 smoke，禁止进质量指标（子代理实测：input 与决策标题重叠 p50=0.00，自产自测会系统性偏差）。
- **probes**：六类缺陷各一个最小合成知识库 fixture（tmp 目录：INDEX.md + decisions/ + fr/ + 手工文档 + known-issues），runner 对每个 fixture 调真实引擎函数并断言正反例。

引擎适配层只 import `src/` 现有导出（`matchByRouting`、`parseDecisionEntries`、`scopeRecall`、`buildKnowledgeGraph`、`readActiveFrDigest`），不复制解析逻辑；指标计算为纯函数放 `lib/metrics.mjs` 并单独单测。

## 接口契约

动了哪些函数/端点/命令/文件格式？对外可见的签名或行为变化是什么（含「无」的说明）？

新增文件：`eval/knowledge/run.mjs`（CLI 入口）、`eval/knowledge/lib/{dataset,engine,metrics,snapshot,report}.mjs`、`eval/knowledge/datasets/organic.jsonl`、`eval/knowledge/fixtures/*`、`eval/knowledge/baseline.json`、`eval/knowledge/README.md`。

CLI 参数：`--repo sillyspec|platform|all`（仓根取自项目注册表或默认两仓绝对路径）、`--face entries|decisions|search|scope|all`、`--set-baseline`、`--json`、`--smoke`（零数据依赖的冒烟）。默认行为 = 读取 baseline 并对比输出。

`baseline.json` 结构（键序固定）：
```
{ "version": 1, "snapshot": { "head": "<sha>", "knowledge_hash": "<sha256>" },
  "cases": { "organic": N, "self": N, "probes": N },
  "metrics": { "<face>": { "top1": x, "top3": x, "mrr": x, "n": N } },
  "probes": { "<defect>": { "pass": bool, "detail": "" } } }
```

不新增 CLI 子命令、不改任何 `src/` 运行时行为（纯只读 import）；`package.json` 新增 `eval:knowledge` 脚本。无对外端点变化。

## 边界与并发（盲维四问——每问必答，答不了即设计缺口）

1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？

成立。数据集按行序与 case id 稳定排序，指标只依赖 case 集合本身；遥测 query 抽取按 `(change, query)` 去重后排序取前 N，不依赖事件到达顺序；self 集按归档目录名排序。同一条 query 的重复注入事件折叠为一个 case。

2. 并发写：两个执行体同时操作同一数据/文件会发生什么？

runner 只写 `eval/knowledge/baseline.json`（仅 `--set-baseline`，单写者约定）与 `mkdtemp` 临时目录；临时目录 finally 清理。两仓并行跑时各自进程独立、无共享写点；probes fixture 每次新 mkdtemp，不落仓。

3. 切换/生命周期：会话、请求或变更中途切换/中断时状态是否安全？

knowledge 目录在评测期间变化会使 self/organic 的期望与现场不一致——每次运行计算快照指纹并与 baseline 比对，不一致显式输出 `snapshot_mismatch` 而不静默覆盖；中断重跑无残留（临时目录由 mkdtemp 隔离）。

4. 作用域：跨工作区/跨仓/多实例时数据会不会串台？

不会。`--repo` 显式指定仓根，两仓绝不共享解析缓存或基线；快照 hash 按仓独立计算；平台仓无 input 时 self 面自动降级为 0 case 并披露，不报错。

## 风险与死路

本方案最大的风险是什么？试过但放弃的方案及放弃理由？

**风险**：① 人工标签成本被低估——用 30 条起步 + 分层抽样，标注单位统一为 `file#anchor` 或 D-id，宁少勿滥；② organic 池来自遥测，平台仓 548 条去重对的成分未知，可能偏某几个高频变更——抽样按 change 分层并限制单变更上限 3 条；③ 探针 fixture 与真实知识库形态漂移——fixture 只固定缺陷语义，不锁定真实数据；④ self 集时间漂移——只作 smoke 且输出中标注 case 数，不参与基线验收。

**放弃的方案**：① 用历史遥测 `matchedFiles` 作标签——被旧版本代码污染（同一查询旧版命中 76 条、当前 5 条），不可复现；② 用归档 input 作主 ground truth——平台仓 0 条、本仓仅 211/805 且集中在 2026-10 轻量道，分布偏置；③ 把评测做成 `sillyspec knowledge eval` 子命令——与 `eval/` A/B 评测概念混淆且扩大 CLI 面，独立脚本足够；④ 复用 `flowKnowledgeDigest`/`buildKnowledgeInjection` 做评测入口——它们内部写遥测并触发平台直报，违反零副作用。

## 文件变更清单

| 操作 | 路径 | 说明 |
|---|---|---|
| 新增 | eval/knowledge/run.mjs | 评测 CLI 入口与分面调度 |
| 新增 | eval/knowledge/lib/dataset.mjs | 三源数据集加载、校验、抽样冻结 |
| 新增 | eval/knowledge/lib/engine.mjs | 只读适配 src 检索引擎 |
| 新增 | eval/knowledge/lib/metrics.mjs | Top-k/MRR/precision 纯函数 |
| 新增 | eval/knowledge/lib/snapshot.mjs | git HEAD + knowledge 树 hash |
| 新增 | eval/knowledge/lib/report.mjs | 控制台表与 baseline diff |
| 新增 | eval/knowledge/datasets/organic.jsonl | 人工标注的 organic 评测集 |
| 新增 | eval/knowledge/fixtures/ | 六类缺陷探针 fixture |
| 新增 | eval/knowledge/baseline.json | 可提交基线 |
| 新增 | eval/knowledge/README.md | 用法与指标说明 |
| 新增 | test/eval-knowledge-*.test.mjs | 五条 FR 的测试绑定 |
| 修改 | package.json | 新增 eval:knowledge 脚本 |
