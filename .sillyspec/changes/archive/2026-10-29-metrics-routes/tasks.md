---
author: flow-machine-draft
created_at: 2026-10-28T23:16:47.116Z
---
# 任务注册表（Tasks）— 2026-10-29-metrics-routes

- [x] task-01: verify-postcheck.js 新增 extractMetricsRoutes（modules 块同风格：inline flow/子块展开/任意非零缩进，paths 支持引号数组与逗分裸串）+ runVerifyMetricsRoutesCheck（段全等前缀路由、逐 gate 注入命中子集 SILLYSPEC_CHANGE_FILES、gate 超时链 timeout_sec>metrics_timeout_sec>env>180s、CNF 逐 gate 降档、串行执行）——验证：quick-metrics-gate 新增路由单元用例（命中/段全等边界/部分失败/零命中/超时/CNF）绿
- [x] task-02: quick-audit.js 与 verify-quality-scan.js 双道挂载（单命令 metrics 之后执行路由、failed 归并 'metrics' 一次、gate.metrics 证据链并存、printQuickTestLintGate 逐 gate 呈现）+ persistLintResult 路由对象落盘（kind: 'routes' + gates 数组）——验证：共存/归并/证据落盘集成用例 + 既有 quick-metrics-gate/quick-test-gate 回归绿
- [x] task-03: config-schema.js 注册 metrics_routes.<name>.paths/.command/.timeout_sec 三 parametrized 键（modules 先例形态）+ renderExample 注释态路由示例（多语言 monorepo 形态）+ templates/agents-instruction.md 规则 4 补路由提及 + 路由留痕文案引导句——验证：config-schema 测试扩展 + 引导面断言绿
- [x] task-04: 回归收束——全部新用例 + 既有 quick-metrics-gate/quick-test-gate/config-schema/verify-quality-scan 相关面全绿 + lint 绿 + package.json dependencies 零变化核对
