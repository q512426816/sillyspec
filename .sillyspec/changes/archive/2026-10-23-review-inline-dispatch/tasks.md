---
author: flow-machine-draft
created_at: 2026-10-23T00:04:07.531Z
---
# 任务注册表（Tasks）— 2026-10-23-review-inline-dispatch

- [x] task-01: readFlowConfig 增 reviewInlineWaitSeconds（1-600 正整数，缺省/坏值 0=off）——验证：unit 三态
- [x] task-02: review-dispatch.js 新导出 runThinReviewInline（probe→create→dispatch→有界轮询+进度心跳→三通道提取→validateReviewJson→writeAtomicSync 落盘，reviewer=platform-inline）——验证：fake client unit 四态
- [x] task-03: flow.js review 缺席分支接 inline（成功同调用走共享登记块；任何失败一行留痕回退任务书面）＋登记块抽局部函数双路复用（子代理路径逐字不变）——验证：e2e 键未配置零回归＋flow-protocol ⑮⑯ 既有面回归
- [x] task-04: 新增 test/review-inline-dispatch.test.mjs（①成功回收 ②probe 不可用回退 ③超时回退 ④坏 JSON 回退 ⑤e2e 键未配置零回归＋键三态）全绿——验证：node --test 批跑
