---
author: flow-machine-draft
created_at: 2026-10-14T05:35:20.439Z
---
# 需求规格（Requirements）— 2026-10-14-gate-verify-apiface-preflight

## 功能需求

### FR-01: facts 无 apiFace（--init 后形态）时，gate 口径校验 design接口表# 锚点不再恒空指：经实况解析注入后命中 design.md 表格端点（与 backfill 产物同形同源：同一 parseDesignApiTable 单一产物源）

- gate/derive 的 verify 产物校验在 facts.apiFace 缺席时，必须以实况解析面（同一 parseDesignApiTable 解析 changeDir/design.md 的产物，含 endpoints/declared/writeEndpoints 三字段，与 backfill 落盘的 facts.apiFace 同形同源）作为 design接口表# 锚点的解析产出集，使锚点命中 design.md 接口段表格端点，禁止恒报「空指」。

#### 场景：主路径（--init 后首次 gate 预检）

Given verify-facts.json 为 --init 后形态（无 apiFace 键）且 design.md 接口段表格含 GET /api/x，verify-result.md 覆盖矩阵行证据为 design接口表#GET /api/x
When 走 validateApiCoverageMatrix（注入实况解析面）
Then 零空指错误且判定 ok=true

### FR-02: facts.apiFace 过期（design.md 已改）时，注入的实况解析面优先生效，预检与 --done backfill 后判定一致（预检过=必过）

- context 注入的实况解析面在场时必须优先于 facts.apiFace 作为解析产出集（预检与 --done backfill 后判定同因一致）；未注入时行为必须与现状完全一致（纯 facts 口径，不回归既有判定）。

#### 场景：主路径（design.md 改后、facts 未回填）

Given facts.apiFace 为旧端点集、design.md 已新增端点、矩阵锚点指向新端点
When 注入实况解析面
Then 新端点锚点命中放行
When 不注入（现状对照）
Then 空指打回

### FR-03: gate 保持零落盘（D-002 只读契约不破）；解析异常 fail-soft 退回 facts 口径

- gate/derive 路径必须零落盘（实况解析为进程内纯读，禁写 facts.json 或任何文件）；design.md 缺失或解析抛异常时必须 fail-soft 不注入、不阻断、不外泄异常，退回 facts 口径（现状行为）。

#### 场景：主路径（design.md 缺失/异常）

Given changeDir/design.md 缺失（或读取解析抛异常）
When 实况解析面计算
Then 返回空面/不注入且不抛出、零文件写入，校验按 facts 口径继续

### FR-04: 既有回归全绿（api-coverage-matrix / pass-eligibility 等）

- 改动落盘后既有测试套件必须零失败：api-coverage-matrix、pass-eligibility、acceptance-matrix-gate 等矩阵/资格面用例全量重跑通过，lint 绿。

#### 场景：主路径（收口实测对账）

Given 三处 src 改动与新测试落盘
When 跑项目测试命令与 lint
Then 零失败零新增告警

## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）

FR-01: test/api-coverage-matrix.test.mjs「9. gate 预检注入：facts 无 apiFace（--init 后形态）→ 实况面命中锚点不再恒空指」
FR-02: test/api-coverage-matrix.test.mjs「9b. 注入优先于过期 facts.apiFace（预检过=必过）；不注入保持现状空指对照」
FR-03: test/api-coverage-matrix.test.mjs「9c. computeApiFaceFromDesign 与 backfill 落盘产物同形同源；design.md 缺失 → 空面 fail-soft 不抛」
FR-04: test/api-coverage-matrix.test.mjs「既有 1~8 组全量重跑零失败（含 8d backfill 复用同源 helper 的结构性证据）」
