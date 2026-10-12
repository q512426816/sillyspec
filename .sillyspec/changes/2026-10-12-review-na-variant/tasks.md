---
author: flow-machine-draft
created_at: 2026-10-12T01:32:18.864Z
---
# 任务注册表（Tasks）— 2026-10-12-review-na-variant

- [x] task-01: test/flow-review.test.mjs 新增「盲维不适用变体」三组用例（变体豁免/逐问混合仍升级/既有口径回归），实现前定向跑确认新用例红
- [x] task-02: src/flow-review.js 实现 NA_ANSWER_RE 窄口径判定（单一 helper，v1 槽3/v2 节两分支同源），定向用例转绿
- [x] task-03: 全量测试 node test/run-tests.mjs 零失败
- [x] task-04: 显式 pathspec 提交交付面（src/flow-review.js + test/flow-review.test.mjs），提交消息带 task-NN 勾选证据
