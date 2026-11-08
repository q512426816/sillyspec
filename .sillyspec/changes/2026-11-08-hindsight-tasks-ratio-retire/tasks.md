---
author: flow-machine-draft
created_at: 2026-11-08T03:50:26.627Z
---
# 任务注册表（Tasks）— 2026-11-08-hindsight-tasks-ratio-retire

- [x] task-01: src/route-hindsight.js 判定面退役（HINDSIGHT_THRESHOLDS 删 tasksRewriteRatio；markHindsight 删该路判定与 reasons；计算面零改动）
- [x] task-02: test/route-hindsight.test.mjs 改口径——阈值表删 tasks 行、单路不标记断言、组合超阈 reasons 只含 design、计算断言保留、旧标记兼容断言
- [x] task-03: test/prestage-consent-gate.test.mjs 门构造改 design 通路；test/flow-clarity-probe.test.mjs 实测断言改不再标记
- [x] task-04: 三测试文件合并跑 node --test 全绿，逐任务显式 pathspec 提交
