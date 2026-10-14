---
author: sillyspec-fr-index
created_at: 2026-10-14T06:33:52.447Z
---

# FR 索引 — machine-interface

> fr-index 从归档变更 requirements.md 幂等提炼（「最近确认」= 归档时 HEAD）。条目字段行为机械解析契约，勿手改。
> superseded 条目保留供取代链回溯；brainstorm 注入默认只给 active。
> 模块卡：modules/machine-interface.md（域=模块 id 同构；行为条目↔模块契约互跳）

## FR-machine-interface-001 facts 无 apiFace（--init 后形态）时，gate 口径校验 design接口表# 锚点不再恒空指：经实况解析注入后命中 design.md 表格端点（与 backfill 产物同形同源：同一 parseDesignApiTable 单一产物源）
变更：2026-10-14-gate-verify-apiface-preflight
状态：active
摘要：主路径（--init 后首次 gate 预检）
场景正文：
- 场景：主路径（--init 后首次 gate 预检） — Given verify-facts.json 为 --init 后形态（无 apiFace 键）且 design.md 接口段表格含 GET /api/x，verify-；When 走 validateApiCoverageMatrix（注入实况解析面）；Then 零空指错误且判定 ok=true
全文：.sillyspec/changes/archive/2026-10-14-gate-verify-apiface-preflight/requirements.md#FR-01
最近确认：30cdee45ba5f3c1a0ebc4c2d4672108a31282057

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-14-gate-verify-apiface-preflight:flow:测试绑定FR-01
  tests: test/api-coverage-matrix.test.mjs「9. gate 预检注入：facts 无 apiFace（--init 后形态）→ 实况面命中锚点不再恒空指」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-14-gate-verify-apiface-preflight
  status: active

## FR-machine-interface-002 facts.apiFace 过期（design.md 已改）时，注入的实况解析面优先生效，预检与 --done backfill 后判定一致（预检过=必过）
变更：2026-10-14-gate-verify-apiface-preflight
状态：active
摘要：主路径（design.md 改后、facts 未回填）
场景正文：
- 场景：主路径（design.md 改后、facts 未回填） — Given facts.apiFace 为旧端点集、design.md 已新增端点、矩阵锚点指向新端点；When 注入实况解析面 不注入（现状对照）；Then 新端点锚点命中放行 空指打回
全文：.sillyspec/changes/archive/2026-10-14-gate-verify-apiface-preflight/requirements.md#FR-02
最近确认：30cdee45ba5f3c1a0ebc4c2d4672108a31282057

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-14-gate-verify-apiface-preflight:flow:测试绑定FR-02
  tests: test/api-coverage-matrix.test.mjs「9b. 注入优先于过期 facts.apiFace（预检过=必过）；不注入保持现状空指对照」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-14-gate-verify-apiface-preflight
  status: active

## FR-machine-interface-003 gate 保持零落盘（D-002 只读契约不破）；解析异常 fail-soft 退回 facts 口径
变更：2026-10-14-gate-verify-apiface-preflight
状态：active
摘要：主路径（design.md 缺失/异常）
场景正文：
- 场景：主路径（design.md 缺失/异常） — Given changeDir/design.md 缺失（或读取解析抛异常）；When 实况解析面计算；Then 返回空面/不注入且不抛出、零文件写入，校验按 facts 口径继续
全文：.sillyspec/changes/archive/2026-10-14-gate-verify-apiface-preflight/requirements.md#FR-03
最近确认：30cdee45ba5f3c1a0ebc4c2d4672108a31282057

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-14-gate-verify-apiface-preflight:flow:测试绑定FR-03
  tests: test/api-coverage-matrix.test.mjs「9d. design.md 缺失 → helper 返 null 不注入，facts 口径继续（含 backfill 基线空面锁）」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-14-gate-verify-apiface-preflight
  status: active

## FR-machine-interface-004 既有回归全绿（api-coverage-matrix / pass-eligibility 等）
变更：2026-10-14-gate-verify-apiface-preflight
状态：active
摘要：主路径（收口实测对账）
场景正文：
- 场景：主路径（收口实测对账） — Given 三处 src 改动与新测试落盘；When 跑项目测试命令与 lint；Then 零失败零新增告警
全文：.sillyspec/changes/archive/2026-10-14-gate-verify-apiface-preflight/requirements.md#FR-04
最近确认：30cdee45ba5f3c1a0ebc4c2d4672108a31282057

测试绑定：
<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->
- row: 2026-10-14-gate-verify-apiface-preflight:flow:测试绑定FR-04
  tests: test/api-coverage-matrix.test.mjs「既有 1~8 组全量重跑零失败（含 8d backfill 复用同源 helper 的结构性证据）」
  reason: spec
  state: candidate
  discovery: machine
  confirmed_by: null
  confirmed_at: null
  source_change: 2026-10-14-gate-verify-apiface-preflight
  status: active
