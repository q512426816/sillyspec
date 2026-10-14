---
author: flow-machine-draft
created_at: 2026-10-14T05:35:20.439Z
---
# 提案书（Proposal）— 2026-10-14-gate-verify-apiface-preflight

## 动机

任务原话转写：gate verify 预检的接口锚点核对消费 facts.apiFace，但其唯一生产者是 run verify --done 收尾前置的 backfill（src/run/gates.js），gate 路径（machine-interface runGate）不回填、verify-probes --init 又故意不落键——facts.apiFace 缺席或过期时解析产出集为空/旧，任何 design接口表# 锚点恒报「空指」，预检必败而同状态的 verify --done 实际可通过（backfill 先行）。实证：multi-agent-platform 2026-10-14-deploy-release-notes 会话 6 轮 gate（每轮测试重跑 266-336s 全绿）全败在同一条锚点，三轮改写 design.md 格式无效。

成功标准：
- facts 无 apiFace（--init 后形态）时，gate 口径校验 design接口表# 锚点不再恒空指：经实况解析注入后命中 design.md 表格端点（与 backfill 产物同形同源：同一 parseDesignApiTable 单一产物源）
- facts.apiFace 过期（design.md 已改）时，注入的实况解析面优先生效，预检与 --done backfill 后判定一致（预检过=必过）
- gate 保持零落盘（D-002 只读契约不破）；解析异常 fail-soft 退回 facts 口径
- 既有回归全绿（api-coverage-matrix / pass-eligibility 等）

## 变更范围

按成功标准机械推导，共 4 条验收面：
1. facts 无 apiFace（--init 后形态）时，gate 口径校验 design接口表# 锚点不再恒空指：经实况解析注入后命中 design.md 表格端点（与 backfill 产物同形同源：同一 parseDesignApiTable 单一产物源）
2. facts.apiFace 过期（design.md 已改）时，注入的实况解析面优先生效，预检与 --done backfill 后判定一致（预检过=必过）
3. gate 保持零落盘（D-002 只读契约不破）；解析异常 fail-soft 退回 facts 口径
4. 既有回归全绿（api-coverage-matrix / pass-eligibility 等）

## 成功标准（可验证）

1. facts 无 apiFace（--init 后形态）时，gate 口径校验 design接口表# 锚点不再恒空指：经实况解析注入后命中 design.md 表格端点（与 backfill 产物同形同源：同一 parseDesignApiTable 单一产物源）
2. facts.apiFace 过期（design.md 已改）时，注入的实况解析面优先生效，预检与 --done backfill 后判定一致（预检过=必过）
3. gate 保持零落盘（D-002 只读契约不破）；解析异常 fail-soft 退回 facts 口径
4. 既有回归全绿（api-coverage-matrix / pass-eligibility 等）
