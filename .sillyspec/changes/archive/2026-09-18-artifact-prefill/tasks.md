---
author: qinyi
created_at: 2026-09-19 00:02:00
generated_by: agent
change: 2026-09-18-artifact-prefill
---

# 任务清单（Tasks）

- [x] task-01: 新建 src/prefill.js——三纯函数（prefillFileChangeList/prefillDecisionTable/prefillCardIds）+hasUnconfirmedPrefill 注检测+runPrefillRefresh（已确认跳过）；来源注协议「(预填：核对后删本注)」
- [x] task-02: 生成器接线（src/index.js）——design-init 决策追踪表用 prefillDecisionTable；taskcard ids 占位用 prefillCardIds；prefill-refresh 命令路由 (depends_on: task-01)
- [x] task-03: 门禁梯度（src/run/gates.js + src/verify-probes.js）——--done 预填注未删 advisory；归档前注清零 error（探针面）；定向回归 (depends_on: task-01)
- [x] task-04: NEW:test/prefill.test.mjs——三槽直测+refresh 幂等+已确认跳过+注清零+定向生成器回归；全量绿 (depends_on: task-01, task-02, task-03)
