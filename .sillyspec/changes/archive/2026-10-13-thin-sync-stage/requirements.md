---
author: flow-machine-draft
created_at: 2026-10-13T04:30:15.384Z
---
# 需求规格（Requirements）— 2026-10-13-thin-sync-stage

## 功能需求

### FR-01: serializeForSync 对 tier=thin 且 changes 行 status=active 的变更，上行 current_stage 投影为 thin（readFlowState 单一源上移叶子模块 flow-state.js，flow.js re-export 保持既有引用面）

- serializeForSync 构造 changes[0] 时必须读取该变更目录的 flow-state.yaml（readFlowState 单一源）：当 `tier === 'thin'` 且本地 changes 行 `status === 'active'` 时，上行载荷的 `current_stage` 必须覆写为 `'thin'`。覆写仅作用于上行载荷——本地 DB 行值禁止改动（本地展示零变化）。

#### 场景：thin 活跃变更推送

- Given 变更目录含 flow-state.yaml（tier: thin）、changes 行 status=active、current_stage=brainstorm（出生值）
- When serializeForSync(cwd, changeName)
- Then 载荷 changes[0].current_stage === 'thin'，且本地 DB changes 行 current_stage 仍为 'brainstorm'（只改载荷不落库）

#### 场景：flow-state 缺失或损坏

- Given 变更目录无 flow-state.yaml，或该文件 YAML 损坏
- When serializeForSync(cwd, changeName)
- Then readFlowState 返回 null → 不覆写，current_stage 按 DB 行值上行（现状行为）

### FR-02: 归档（status=archived）、升厚（tier=thick）、无 flow-state 的变更上行 stage 不受影响（现状回归）

- 归档（status=archived / 行 current_stage=archive）、升厚（flow-state tier=thick，含 born_face: thin 已升厚）、以及无 flow-state 的厚流程变更，上行 current_stage 必须保持既有取值不变；覆写禁止在 `tier==='thin' && status==='active'` 双条件之外触发。

#### 场景：归档 thin 变更

- Given flow-state.yaml 仍在（tier: thin）但 changes 行 status=archived、current_stage=archive
- When serializeForSync(cwd, changeName)
- Then changes[0].current_stage === 'archive'（终态投影走既有链，不覆写）

#### 场景：升厚变更

- Given flow-state.yaml tier=thick（born_face: thin）、行 status=active、current_stage=brainstorm
- When serializeForSync(cwd, changeName)
- Then changes[0].current_stage === 'brainstorm'（tier 非 thin 不覆写）

### FR-03: 新增测试覆盖 thin active 覆写、归档不覆写、升厚不覆写、无 flow-state 不覆写四形态；相关既有套件零回归

- 新增测试必须覆盖四形态（thin active 覆写 / 归档不覆写 / 升厚不覆写 / 无 flow-state 不覆写）；serializeForSync 既有套件（serialization / import / archive-final-state）与 flow.js 的 flow-protocol 套件必须零回归。

#### 场景：四形态断言

- Given 临时 fixture 分别构造四种变更形态
- When 逐一 serializeForSync
- Then 断言各自 current_stage 取值（thin / archive / brainstorm / brainstorm）

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/platform-sync-thin-stage.test.mjs「thin 活跃变更上行 current_stage 投影为 thin；flow-state 缺失不覆写」
FR-02: test/platform-sync-thin-stage.test.mjs「归档/升厚/无 flow-state 三形态上行 stage 不受影响」
FR-03: test/platform-sync-thin-stage.test.mjs「四形态全覆盖」+ 既有套件 platform-sync-serialization / platform-sync-import / platform-sync-archive-final-state / flow-protocol 零回归
