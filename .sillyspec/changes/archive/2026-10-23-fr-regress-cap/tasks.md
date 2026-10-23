---
author: flow-machine-draft
created_at: 2026-10-23T00:27:36.745Z
---
# 任务注册表（Tasks）— 2026-10-23-fr-regress-cap

- [x] task-01: verify-postcheck.js 新增 applyFrRegressCap 纯函数+readFrRegressCap 键读取（逐键正则 fail-soft）——验证：unit 四态+三态
- [x] task-02: 组面 fr 段施帽接线（帽后推导零第二口径+超帽/off 两形态披露行；缺省无键逐字一致）——验证：既有面回归零改动全绿
- [x] task-03: 本仓 local.yaml 落地 fr_regress_cap: 24——验证：本变更收口回执 fr 分量 ≤24 且披露行在场（自举）
- [x] task-04: 新增 test/fr-regress-cap.test.mjs（①applyFrRegressCap 四态 ②readFrRegressCap 三态 ③既有面零回归 ④本仓键在场）全绿——验证：node --test 批跑
