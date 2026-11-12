---
author: t
created_at: 2026-11-12 16:56:37
---
# 需求规格（Requirements）— 2026-11-12-freeze-decision-recall

## 功能需求

### FR-01: 复潮条件作为独立入选判据

- `src/decision-distill.js` 的 `dispositionOf` 必须增加第二判据：条目 `revisitWhen` 非空且 status 为空或属 `KNOWLEDGE_STATUSES` 时入选；有 `rejectReason` 走 rejected 通道，否则走 implemented 通道。`superseded/proposed/draft` 必须仍被排除。

#### 场景：三条存量分流

Given 三条 type=scope 的归档决策（friction-signal-hint 无复潮条件、L3-adjudication 有复潮条件无否决理由、caliber-unify 有否决理由+复潮条件）
When 对各自跑 `dispositionOf`
Then 分别返回 null、'implemented'、'rejected'

### FR-02: implemented 条目渲染复潮条件行

- `src/decision-distill.js` 的条目渲染必须为 `revisitWhen` 非空的 implemented 条目输出「复潮条件：」行，使 `src/knowledge-match.js:175` 能解析回该字段。

#### 场景：入库后信号不丢

Given 一条 scope+revisitWhen+无否决理由的决策
When 蒸馏写入 knowledge/decisions/*.md
Then 该条目段内存在「复潮条件：」行，且 `parseDecisionEntries` 读出的 `revisitWhen` 非空

### FR-03: 四处防复潮过滤同步

- `src/flow.js:357`、`src/flow.js:379`、`src/run/prompt.js:1437`、`src/knowledge-graph.js:1102` 的过滤条件必须各自增加 `|| h.revisitWhen`，四处结果必须一致。

#### 场景：入口提示覆盖

Given 一个带复潮条件的 implemented 决策已入库
When 跑 flow start 或 brainstorm 渲染
Then 该决策出现在防复潮提示段中

### FR-04: 存量回填通道

- `src/archive-baseline-replay.js` 的 `applyBaselineReplay` 必须支持 `full: true`（完整蒸馏、跳过「已有基线」预筛）；`src/stages/knowledge.js` 必须提供 `distill-backfill` 子命令，缺省 dry-run、`--apply` 才落盘。

#### 场景：幂等回填

Given 归档目录含 3 条 scope 决策，其中一条已有基线但缺人工条目
When 连续跑两次 `knowledge distill-backfill --apply`
Then 第一次写入缺失条目，第二次零新增（幂等键 = 号 + 变更）

### FR-05: 本仓存量回填验证

- 必须对本仓执行一次回填，使 D-001@v1（「冻结 L3——活规格树不建」）出现在 `knowledge/decisions/` 中。

#### 场景：D-001 真的回来

Given 回填已执行
When `grep "活规格树" .sillyspec/knowledge/decisions/`
Then 命中 D-001@v1 条目

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/freeze-decision-recall.test.mjs「dispositionOf 复潮条件分流三态」
FR-02: test/freeze-decision-recall.test.mjs「implemented 条目渲染复潮条件行」
FR-03: test/freeze-decision-recall.test.mjs「四处防复潮过滤口径一致」
FR-04: test/freeze-decision-recall.test.mjs「full 模式跳过已有基线预筛且二次执行幂等」
FR-05: 不适用：一次性存量回填操作，验收靠 grep 知识库确认 D-001@v1 条目存在
