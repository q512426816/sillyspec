---
author: flow-machine-draft
created_at: 2026-09-29T05:15:34.163Z
---
# 任务注册表（Tasks）— 2026-09-29-rot-retire-inject-cap

> 机器预填草稿（成功标准逐条镜像）——任务面归 agent：按实际实现路径覆写本文件（保持 checkbox 行形态），验收锚在 requirements；
> 默认 thin：无任务卡文件，收口=flow done 唯一裁决。
> ✅ 边干边勾（2026-09-26-tick-loop-nudge，OS Guardrails 同款纪律）：完成一条 = 实现到位 + 相关测试跑绿 → 立即勾 `[x]`，勿攒到收口一把勾（勾选是进度锚与哨兵证据面）。本文件收口前随交付显式 pathspec 提交。

- [x] task-01: 拆消费先行——flow.js 注入排序/⚠️ 渲染去掉 needsReview、prompt.js digest 渲染去 ⚠️ 后缀（避免中间态读 undefined）
- [x] task-02: 拆写入与设施——flow.js rotSuspectFlow 停止打标（保留计算/advisory/遥测，返回值去 marked）、run/shared.js auditQuickCompletion 打标拆除、fr-index.js 删 markFrNeedsReview/cleanupStaleReviewMarks/FR_NEEDS_REVIEW_PREFIX/indexRequirements 待复核 filter 项/readActiveFrDigest.needsReview 字段
- [x] task-03: knowledge-digest 去 rot 臂（needsReview 解析、totals.rot、>100 信号、底数行段）
- [x] task-04: 修注入——prompt.js {FR_INDEX_DIGEST} 滤 unmapped+top-8 截断+指针行+unmapped-only 空态（抽 buildFrIndexDigestSection 可单测），遥测加 rendered/truncated/unmappedFiltered；stage-contract.js 软门补 unmapped 过滤
- [x] task-05: 剥数据——九个 fr 域文件「^待复核：」行一次性剥除（实际 471 条，比预估 371 多——剥离时点他会话运行又添标；剥后 grep 为零）
- [x] task-06: 测试适配与新增——quick-asset-tail（拆除断言钉+承接回归钉）/thin-fr-inject-parity（排序改索引序+不落盘钉）/fr-rot-precision（删清理套件）/knowledge-digest（去 rot 臂）/fr-index 10e/11（真域夹具，unmapped 不再进软门与注入——旧断言正是 bug 微缩形态）；新增 test/fr-inject-cap.test.mjs 四面
- [x] task-07: 全量验证——flow 系测试与 npm run test:core 全绿；collectFrLinkedTests 相关既有测试零回归
