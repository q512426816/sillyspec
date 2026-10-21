---
author: flow-machine-draft
created_at: 2026-10-21T00:47:22.875Z
---
# 需求规格（Requirements）— 2026-10-21-overview-thin-stage

## 功能需求

### FR-01: progress show --json 对 tier=thin 且活跃变更报 current_stage='thin'、stage_label='◈ 轻量变更'

- `progress show --json` envelope 的 `data.changes[]` 条目，对本地 flow-state `tier: 'thin'` 的活跃变更**必须**投影 `current_stage='thin'`、`stage_label='◈ 轻量变更'`（与平台 sync 上行 2026-10-13-thin-sync-stage 同值域）；且**必须**仅覆写 envelope 载荷——本地 DB 行 `current_stage` 不得被改动（恒保持出生值 'brainstorm'，thin 不走阶段机）。

#### 场景：thin 活跃变更投影覆写

Given 本地进度库存在活跃变更 chg 且 `changes/chg/flow-state.yaml` 含 `tier: thin`
When 执行 `runStatusOverview`（`progress show --json` 数据源）
Then `data.changes` 中 chg 条目 `current_stage === 'thin'` 且 `stage_label === '◈ 轻量变更'`，且 DB 行 `current_stage` 仍为 'brainstorm'（仅载荷覆写不落库）。

### FR-02: tier=thick、无 flow-state、flow-state 损坏三种形态不覆写，维持行值 brainstorm（fail-open 同 sync 口径）

- overview 投影对非 thin 出身**必须**维持 DB 行值原样：`tier: 'thick'`（升厚）→ 报 'brainstorm'；无 flow-state 文件（厚流程）→ 报 'brainstorm'；flow-state 存在但损坏（`readFlowState` 返回 null）→ 报 'brainstorm'（fail-open 与 sync 上行同口径）。

#### 场景：三形态回归

Given 同一 fixture 形态分别改写 flow-state 为 `tier: thick` / 删除 flow-state / 写入损坏 YAML
When 分别执行 overview
Then 三者 `current_stage` 均 === 'brainstorm'、`stage_label` 均 === '🧠 需求探索'。

### FR-03: 归档行不出现在 overview（listChanges 活跃口径不变）

- overview **必须**沿用 `listChanges` 既有活跃口径（`WHERE status='active'`）——归档行（status='archived'）不得出现在 `data.changes[]`；本变更**禁止**改动 `listChanges` 语义与 `VALID_STAGES`/`STAGE_ORDER`/阶段表写入面。

#### 场景：归档行被排除

Given thin 活跃变更 chg 经 DB 直改 `status='archived'`
When 执行 overview
Then `data.changes` 不含 chg（active_changes 相应减一）。

### FR-04: 既有 platform-sync-thin-stage / change-birth-stage-brainstorm / quick-ghost-exclusion 测试零回归

- 本变更落地后，既有三套相关测试（platform-sync-thin-stage、change-birth-stage-brainstorm、quick-ghost-exclusion）**必须**全绿——sync 上行投影、出生阶段 DDL、quick ghost 豁免三个既有契约面不得被本变更扰动。

#### 场景：回归护栏

Given 本变更三文件改动落盘
When 运行上述三个既有测试文件
Then 全部通过、零失败。

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/overview-thin-stage.test.mjs「thin 活跃变更 overview 投影 thin + DB 行不动」
FR-02: test/overview-thin-stage.test.mjs「thick/无 flow-state/损坏三形态不覆写」
FR-03: test/overview-thin-stage.test.mjs「归档行不出现在 overview」
FR-04: test/platform-sync-thin-stage.test.mjs「thin 活跃变更上行阶段投影」（连带 change-birth-stage-brainstorm / quick-ghost-exclusion 由收口实测面回归覆盖）
