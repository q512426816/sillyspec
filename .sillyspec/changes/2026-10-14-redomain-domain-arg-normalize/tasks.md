---
author: flow-machine-draft
created_at: 2026-10-14T02:59:54.447Z
---
# 任务注册表（Tasks）— 2026-10-14-redomain-domain-arg-normalize

- [x] task-01: redomain.js 新增导出归一化函数（trim + 剥前导 fr/ + 剥尾随 .md），redomainFrEntries 与 planRedomain 入参防御性归一
- [x] task-02: CLI --from/--to 经同一归一化后透传，回显与报错统一显示裸域名
- [x] task-03: --from fr/auto-backend 与 --from auto-backend 干跑预览、--write 迁移结果完全一致；剥完为空（如只传 fr/）按既有用法错误拒绝且无半态写盘
- [x] task-04: test 覆盖：fr/ 前缀形态、.md 后缀形态、裸名原样、fr/ 剥空拒绝、归一化幂等
- [x] task-05: npm test 与 npm run lint 全绿
