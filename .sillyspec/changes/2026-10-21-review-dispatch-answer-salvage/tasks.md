---
author: flow-machine-draft
created_at: 2026-10-21T07:38:16.101Z
---
# 任务注册表（Tasks）— 2026-10-21-review-dispatch-answer-salvage

- [x] task-01: client.js getWorkerResult 增返 answer 原文（answer 字段优先 / result 兜底 / 双缺 null；unavailable 三分支补 answer:null）；test/sillyhub-mcp-platform-fixes.test.mjs 既有 deepEqual 断言同步新 shape + 新增 answer 透传用例（FR-02）
- [x] task-02: extractReviewFromArtifacts 增可选第二参 answer + 第三通道（answer 文本扫首个平衡 JSON，扫描实现与通道②共用）；单测覆盖裸 JSON/```json 块/缺省参数向后兼容（FR-01）
- [ ] task-03: status 回收链接线：主线+影子链传 gr.answer；completed 终态 best-effort 落盘 worker-answer.md；CLI 增 --salvage flag（仅与 --status 组合）+ salvagePath/--from 指引；completed-no-artifact 与 bad-review 文案改两步口径、删 --kill 降级混写；e2e 测试：answer 正文回收 / 失败文案 / salvage 落盘（FR-01/FR-03/FR-04）
- [ ] task-04: buildReviewerTaskBook 产出段补「回答正文首个 ```json 块」兜底指引 + 任务书断言更新（FR-05）
- [ ] task-05: 全量对账：本变更测试面（review-dispatch + sillyhub-mcp-platform-fixes）+ FR 关联回归全绿 + lint 绿；spec 面与实现一致复核
