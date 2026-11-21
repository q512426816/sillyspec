---
author: t
created_at: 2026-11-21 23:35:00
---

# 任务清单（Tasks）

- [x] task-01: discoverModuleDependentTests 新增 withAttribution 归因出参——两条命中路径（无参字符串路径+symMap 两阶段）产出 attribution/hitCountBySrc，缺省返回形态逐字不变。验证：test/verify-gate-lean-scope.test.mjs「归因出参结构」「opt-in 零回归」用例跑绿
- [x] task-02: runVerifyTestCheck 组装段阻断面/间接面拆分——枢纽判定（hitCountBySrc>DEPS_SYMBOL_NARROW_HUB_MIN）、gate_scope 两态（lean 缺省收窄/legacy 三源全阻断面逐字对齐）。验证：test/verify-gate-lean-scope.test.mjs「缺省阻断面=自身∪非枢纽命中」「legacy 恢复旧行为」用例跑绿
- [x] task-03: 间接面披露行+ledger 留痕——披露行含自身/依赖直接/间接各源文件数+总时长+「归 pre-push」去向；ledger 新增 indirectFace 字段。验证：test/verify-gate-lean-scope.test.mjs「披露行构成与 ledger 留痕」用例跑绿
- [x] task-04: 时长护栏两态——timeout 到期且 isTimeoutOnlyTestFailure 命中时 degrade（缺省）改判 degraded-timeout 不阻断+loud 披露+ledger degradedTimeout 留痕；block 回超时=失败阻断旧行为；预算沿用 TEST_TIMEOUT_MS。验证：test/verify-gate-lean-scope.test.mjs「护栏 degrade 与 block 两态」用例跑绿
- [x] task-05: config-schema 新增 verify.gate_scope / verify.timeout_policy 两键（缺省值+文案，producer=local.yaml 解析→consumer=verify-postcheck 读取的数据流）。验证：config-schema 相关既有测试跑绿+新键三态（缺省/显式/坏值）断言
- [x] task-06: 受影响既有面对齐——verify-deps-auto-default.test.mjs 等既有缺省行为断言按收窄后语义更新（非测试逻辑迁就：既有断言锚定的是被有意改变的缺省行为，属「测试锚定对象有意演进」）。验证：变更测试面（新增测试∪受影响既有面）全绿
