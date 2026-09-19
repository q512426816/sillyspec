---
author: qinyi
created_at: 2026-06-04 16:55:00
---

# 未分类知识

> execute/quick 执行中发现的坑暂存于此，用户审阅后归类到对应文件并更新 INDEX.md。

## verify 报告探针预填段禁止摘要化改写（防篡改门按锚点对比）
写 verify-result.md 时把 CLI 预填的探针段（探针 1 未实现标记清单/探针 3 测试存在性/探针 5 parity 锚行等）改写成自己的语义总结，会触发「探针一致性抽查」ERROR 级阻断（重跑计数 vs 正文锚点不符，疑似篡改）——即使总结内容属实。正确姿势：预填段逐字保留，语义复核以 ℹ️ 注记行追加在段尾；想重新拿预填段须删文件重跑 `verify-probes --init`（已存在不覆盖）。另：agent 执行段（探针 2/4/7）才是自由填写面。（2026-09-19-review-material-cli-wiring verify 会话实证：3 次 gate 回滚其一）
