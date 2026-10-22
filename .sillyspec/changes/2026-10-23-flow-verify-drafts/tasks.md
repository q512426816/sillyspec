---
author: flow-machine-draft
created_at: 2026-10-22T16:53:52.765Z
---
# 任务注册表（Tasks）— 2026-10-23-flow-verify-drafts

- [x] task-01: 抽 computeSpecFaceChecks 共享单一源（approve 校验块单一源化，approve 输出与退出码逐字不变）——验证：approve-gate-tick/approve-channel-attest 既有套件零改动全绿
- [x] task-02: 实现 cmdFlowVerifyDrafts（人类渲染+--json 双态、退出码 0/1/2、degraded 降级同 approve 口径）+ cmdFlow 子命令分发与 flow 用法行——验证：手工跑骨架未答/答齐两态
- [x] task-03: flow start 横幅断点① 增起草自查指引行——验证：fresh start 输出含指引行
- [x] task-04: 新增 test/flow-verify-drafts.test.mjs（①骨架未答 exit1 全列+零写盘 ②答齐 exit0 ③--json 同判定 ④missing/非法 exit2 ⑤横幅指引行）全绿——验证：node --test 该文件 + approve 既有套件回归
