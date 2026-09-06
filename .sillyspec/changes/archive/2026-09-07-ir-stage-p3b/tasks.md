---
author: qinyi
created_at: 2026-09-07T03:32:51+08:00
---

# 任务清单（Tasks）

- [x] task-01: verify-probes buildVerifyFacts + --init 落盘 verify-facts.json + 骨架层标注
- [x] task-02: verify-postcheck checkProbeConsistency 纯函数（重跑+子节定界锚点+分级判定+判别子）
- [x] task-03: gates.js verify 块一致性检查接线（reconcile 后，信封+落盘）(depends_on: task-02)
- [x] task-04: stages/verify.js Step 7 prompt 纪律两条
- [x] task-05: 测试套件 test/verify-probes-facts.test.mjs（底稿/幂等/round-trip/篡改/漂移/存量/HEAD 前进 + 既有骨架断言更新义务）(depends_on: task-01,task-02,task-03)
