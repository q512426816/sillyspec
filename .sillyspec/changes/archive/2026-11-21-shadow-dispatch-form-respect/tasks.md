---
author: flow-machine-draft
created_at: 2026-11-21T15:51:52.927Z
---
# 任务注册表（Tasks）— 2026-11-21-shadow-dispatch-form-respect

- [x] task-01: 写 test/shadow-dispatch-form.test.mjs 形态门测试（TDD 先红）：review_force=false / turbo=true → skipped+form-review-exempt 留痕；flow-state 缺失 / review_force=true 放行既有链；tier-not-light 既有文案逐字不变（tmp fixture 直调 dispatchShadowReview，probe stub 注入）
- [x] task-02: src/review-dispatch.js dispatchShadowReview create 前置链最前插形态免评审 skip（readFlowState 判 review_force===false || turbo===true）——task-01 测试转绿
- [x] task-03: src/run/gates.js 影子挂点 fire-and-forget 改 await 同步（含测试：源码结构断言 await 语义、孤儿 .catch fire-and-forget 形态不存在）+ 跑本变更测试面全绿（node test/shadow-dispatch-form.test.mjs 与既有 ceremony-tier.test.mjs 回归）
