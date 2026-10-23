---
author: flow-machine-draft
created_at: 2026-10-23T13:32:47.476Z
---
# 提案书（Proposal）— 2026-10-23-push-review-debt

## 动机

任务原话转写：清偿push评审三发现：守卫测试与警示

上变更 2026-10-23-push-squash 独立评审留档 2×P2+1×P3：①FR-04 的区间含已推送提交/merge commit 两个守卫场景有代码无测试锚；②design 承诺的签名/tag warning 未实现——签名提交会被静默重写为无签名、tag 静默指向旧提交；③push 失败报错不含 pre-push hook stderr，要二跑定位。本变更只清偿这三项，不扩 scope。成功标准来自评审留档（review.json findings）与上变更 design 承诺原文转写，非推断。

成功标准：
- push-cli 新增「区间含已推送提交拒绝」「merge commit 拒绝」两个真仓守卫用例并绿
- tag 指向压扁区间时计划输出 warning；全无签名提交时不产生签名 warning；签名检测逻辑有纯函数测试锚
- pre-push hook 失败时 human 模式实时透传 hook 输出（报错一次给全），--json 模式错误信息含 stderr；git-helper 注释与实现对齐
- lint 绿、变更面测试绿

## 变更范围

按成功标准机械推导，共 4 条验收面：
1. push-cli 新增「区间含已推送提交拒绝」「merge commit 拒绝」两个真仓守卫用例并绿
2. tag 指向压扁区间时计划输出 warning；全无签名提交时不产生签名 warning；签名检测逻辑有纯函数测试锚
3. pre-push hook 失败时 human 模式实时透传 hook 输出（报错一次给全），--json 模式错误信息含 stderr；git-helper 注释与实现对齐
4. lint 绿、变更面测试绿

## 成功标准（可验证）

1. push-cli 新增「区间含已推送提交拒绝」「merge commit 拒绝」两个真仓守卫用例并绿
2. tag 指向压扁区间时计划输出 warning；全无签名提交时不产生签名 warning；签名检测逻辑有纯函数测试锚
3. pre-push hook 失败时 human 模式实时透传 hook 输出（报错一次给全），--json 模式错误信息含 stderr；git-helper 注释与实现对齐
4. lint 绿、变更面测试绿
