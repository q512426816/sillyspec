---
author: flow-machine-draft
created_at: 2026-10-15T04:29:32.251Z
---
# 需求规格（Requirements）— 2026-10-15-vector-switch-discoverability

## 功能需求

### FR-01: config schema 注册 knowledge.vector_search 且 renderExample 含 knowledge 段（防漂耦合测试绿）

- `knowledge.vector_search` 必须注册为 config-schema live 键（readers 指向 knowledge-vector.js，desc 含收紧语义 on|auto 显式开启/off·未写键关/env 覆盖），renderExample 模板必须含 knowledge 段（`vector_search: on` 可抄形态+开启前置说明）；config schema CLI 必须可查该键；既有防漂耦合测试必须零失败。

#### 场景：主路径

- When `sillyspec config schema` 输出与 renderExample 求值，Then 键行在、example knowledge 段在（测试 config-schema 542 断言零失败佐证）。

### FR-02: vectorSwitchHint 三态：平台未连接空串/已连接未开提示/已开空串

- vectorSwitchHint(cwd) 必须实现三态：平台未配置 → 空串（零噪音）；平台已配置且开关未开 → 提示含可执行配置形态（`vector_search: on`）与缺省关注记；已开启 → 空串。文案单源（双消费面共用）。

#### 场景：主路径

- When 三态 fixture 各调一次，Then 空串/提示/空串（测试①组）。

### FR-03: search 输出 hint 键（未开+已连接时）；flow 注入零命中时追加提示行（已开或未连接零新增）

- knowledge search JSON 输出在提示非空时必须带 hint 键（含未命中与命中两路径），提示为空时必须无 hint 键；flow start 注入零命中（`!km.matched && rejected 空`）时必须追加提示行，有命中/已开启/未连接必须零新增。

#### 场景：主路径

- When cmdSearch 与 flowKnowledgeDigest 各跑两态，Then hint 键/提示行的在场与缺席精确（测试②③组）。

### FR-04: 新增测试全绿+既有 vector/schema 测试零回归

- test/vector-switch-hint.test.mjs（三组）必须全绿；knowledge-vector-recall（缺省关契约）/knowledge-inject/thin-inject-telemetry/thin-query-slim/config-schema 既有测试必须零失败。

#### 场景：主路径

- When 六测试文件全跑，Then 零失败。

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/config-schema.test.mjs（防漂耦合组——live 键 example 必现）+ `sillyspec config schema` CLI 实测留档
FR-02: test/vector-switch-hint.test.mjs「① vectorSwitchHint 三态：未连接空串/已连接未开提示/已开空串」
FR-03: test/vector-switch-hint.test.mjs「② knowledge search：未开+已连接输出 hint 键；未连接无 hint 键」「③ flow 注入零命中：已连接未开追加提示行；已开零新增」
FR-04: test/vector-switch-hint.test.mjs（全文件）+ test/knowledge-vector-recall.test.mjs + test/knowledge-inject.test.mjs + test/thin-inject-telemetry.test.mjs + test/thin-query-slim.test.mjs（零回归）
