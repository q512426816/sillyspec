---
author: flow-machine-draft
created_at: 2026-10-21T07:38:16.101Z
---
# 提案书（Proposal）— 2026-10-21-review-dispatch-answer-salvage

## 动机

任务原话转写：修独立评审回收链：answer 原文兜底

动机与背景：2026-10-20-session-page-dsh-alignment plan 阶段独立评审走 review-dispatch 平台通道，worker 实际把完整 review JSON 放在回答正文返回（平台 UI 可见），但 getWorkerResult 传输层丢弃 answer 字段、extractReviewFromArtifacts 只扫 artifacts，--status 误判「completed 但 artifacts 提取不到 review JSON」→ agent 按误导指引（--kill 降级混写）降级 self 自审。会话证据 dsh-session-f479c233（seq 628/667/847/1001）。修复五点：
1) sillyhub-mcp/client.js getWorkerResult 增返 answer/result 原文（向后兼容，不裁既有字段）
2) extractReviewFromArtifacts 增第三通道：从 answer 文本扫首个平衡 JSON
3) completed-no-artifact 失败文案改为「① --status --salvage 自动落 worker-answer.md 并提示 --from ②确无结果才降级」，删「--kill 降级」混写
4) reviewer 任务书产出段补「宿主不支持 artifacts 时把 JSON 放回答正文首个 ```json 块」
5) worker 终态原文落盘 .runtime/stage-reviews/<runId>/worker-answer.md

成功标准：
- worker 把 review JSON 放 answer 正文（artifacts 空/不可解析）时，--status 能经第三通道回收落盘 review.json（channel=platform 落款不变）
- getWorkerResult 返回值含 answer 原文且既有消费方零回归（既有测试全绿）
- completed-no-artifact 文案含 --salvage/--from 两步指引、不含「--kill 降级」
- --status --salvage 落盘 worker-answer.md 于 stage-reviews run 目录
- 任务书含 json 块指引；新增+受影响测试全绿 + lint 绿

## 变更范围

按成功标准机械推导，共 5 条验收面：
1. worker 把 review JSON 放 answer 正文（artifacts 空/不可解析）时，--status 能经第三通道回收落盘 review.json（channel=platform 落款不变）
2. getWorkerResult 返回值含 answer 原文且既有消费方零回归（既有测试全绿）
3. completed-no-artifact 文案含 --salvage/--from 两步指引、不含「--kill 降级」
4. --status --salvage 落盘 worker-answer.md 于 stage-reviews run 目录
5. 任务书含 json 块指引；新增+受影响测试全绿 + lint 绿

## 成功标准（可验证）

1. worker 把 review JSON 放 answer 正文（artifacts 空/不可解析）时，--status 能经第三通道回收落盘 review.json（channel=platform 落款不变）
2. getWorkerResult 返回值含 answer 原文且既有消费方零回归（既有测试全绿）
3. completed-no-artifact 文案含 --salvage/--from 两步指引、不含「--kill 降级」
4. --status --salvage 落盘 worker-answer.md 于 stage-reviews run 目录
5. 任务书含 json 块指引；新增+受影响测试全绿 + lint 绿
