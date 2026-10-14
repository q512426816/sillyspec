---
author: flow-machine-draft
created_at: 2026-10-14T02:59:54.447Z
---
# 提案书（Proposal）— 2026-10-14-redomain-domain-arg-normalize

## 动机

任务原话转写：flow done 收口提示的 FR 域迁移命令照抄必败：提示语给 --from fr/auto-backend 形态（fr-index.js 伪域告警块），而 redomain 实现按裸域名拼 fr/${from}.md，产生 fr/fr/auto-backend.md 双前缀报错；缺陷实录见 multi-agent-platform docs/sillyspec/tests-redomain-from-prefix-doubling.md。修法：入参归一化单源（剥前导 fr/ 与尾随 .md），CLI 与库函数双侧幂等，让两种形态等价而不是改提示语掐一头。

成功标准：
- redomain.js 新增导出归一化函数（trim + 剥前导 fr/ + 剥尾随 .md），redomainFrEntries 与 planRedomain 入参防御性归一
- CLI --from/--to 经同一归一化后透传，回显与报错统一显示裸域名
- --from fr/auto-backend 与 --from auto-backend 干跑预览、--write 迁移结果完全一致；剥完为空（如只传 fr/）按既有用法错误拒绝且无半态写盘
- test 覆盖：fr/ 前缀形态、.md 后缀形态、裸名原样、fr/ 剥空拒绝、归一化幂等
- npm test 与 npm run lint 全绿

## 变更范围

按成功标准机械推导，共 5 条验收面：
1. redomain.js 新增导出归一化函数（trim + 剥前导 fr/ + 剥尾随 .md），redomainFrEntries 与 planRedomain 入参防御性归一
2. CLI --from/--to 经同一归一化后透传，回显与报错统一显示裸域名
3. --from fr/auto-backend 与 --from auto-backend 干跑预览、--write 迁移结果完全一致；剥完为空（如只传 fr/）按既有用法错误拒绝且无半态写盘
4. test 覆盖：fr/ 前缀形态、.md 后缀形态、裸名原样、fr/ 剥空拒绝、归一化幂等
5. npm test 与 npm run lint 全绿

## 成功标准（可验证）

1. redomain.js 新增导出归一化函数（trim + 剥前导 fr/ + 剥尾随 .md），redomainFrEntries 与 planRedomain 入参防御性归一
2. CLI --from/--to 经同一归一化后透传，回显与报错统一显示裸域名
3. --from fr/auto-backend 与 --from auto-backend 干跑预览、--write 迁移结果完全一致；剥完为空（如只传 fr/）按既有用法错误拒绝且无半态写盘
4. test 覆盖：fr/ 前缀形态、.md 后缀形态、裸名原样、fr/ 剥空拒绝、归一化幂等
5. npm test 与 npm run lint 全绿
