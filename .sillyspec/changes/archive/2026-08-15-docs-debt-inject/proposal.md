---
author: qinyi
created_at: 2026-08-15 21:12:00
change: 2026-08-15-docs-debt-inject
---

# 提案（Proposal）

## 问题

第六节愿景（CLI 算事实注入）缺核心拼图：execute 各 Wave 时 agent 看不到"本变更触及的模块文档欠了多久的账"。另有两个前置缺陷：parseModuleMapSimple 在 CRLF map 上整体解析为空（本仓即 CRLF，模块上下文注入全部哑掉）；v1 map 无 paths 归属字段。

## 方案

src/docs-debt.js：git 事实算模块文档欠账（changedFiles × paths||core_files 归属 + 双 commit 时间戳对账），经 outputStep 占位符链 {DOCS_DEBT} 注入 Wave prompt（无债零输出）；同修 CRLF。

## 不在范围内

- scan 增量刷新 CLI 化（第六节重设计长期项）
- verify/archive 硬门（D-1/D-5 已有）
