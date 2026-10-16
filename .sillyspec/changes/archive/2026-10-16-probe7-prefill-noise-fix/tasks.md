---
author: flow-machine-draft
created_at: 2026-10-16T07:44:31.079Z
---
# 任务注册表（Tasks）— 2026-10-16-probe7-prefill-noise-fix

- [x] task-01: 命中分级实现——buildAcceptanceHints 加 nameAnchors（测试名行判定 + 测试名提取），删 anchors；prefillMatrixCells 七级判定链重写（FR-02/FR-05）
- [x] task-02: 归属源收窄实现——全 non-testable 卡跳过 FR 池注入；>5 帽（PROBE7_CANDIDATE_CAP）跳过 hints + unattributable 判定；归属列折叠文案（FR-01/FR-04）
- [x] task-03: 同波次提升信号——readReviewChangedTestFiles wide 选项 + 逐卡 waveFiles 收集（含下游卡）+ 第⑥级 lift 预填（FR-03）
- [x] task-04: 段头预填说明与口径注记文案更新（渲染面）
- [x] task-05: 测试面——改写 acceptance-matrix-probe（注释级命中断言→新契约）与 testpath-anchor；新增 test/probe7-prefill-noise.test.mjs 六用例；probe7-fr-prefill 加 P4；pitfall-noise 补 >5 判定断言；全量回归绿
