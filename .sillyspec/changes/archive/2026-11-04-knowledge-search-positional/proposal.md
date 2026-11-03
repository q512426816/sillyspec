---
author: flow-machine-draft
created_at: 2026-11-03T16:19:02.103Z
---
# 提案书（Proposal）— 2026-11-04-knowledge-search-positional

## 动机

任务原话转写：knowledge search 支持位置参数形态

动机：平台仓反馈（2026-11-04）——AGENTS.md 写的用法是 sillyspec knowledge search "<关键词>"，但 CLI 实际要求 --query 显式 flag，文档与 CLI 不一致；且 AGENTS.md 由 init 分发、存量仓不随模板更新自动刷新，只改文档无法治愈存量仓。

成功标准：
- sillyspec knowledge search "关键词"（位置参数形态）与 --query "关键词" 等效可用
- --query 显式形态保持兼容，两形态并存时 --query 优先
- flag-as-value 防护语义保持（--query 后跟 flag 字面量仍按缺参处理）
- AGENTS.md 模板与 CLI help 的用法说明与实际行为一致

## 变更范围

按成功标准机械推导，共 4 条验收面：
1. sillyspec knowledge search "关键词"（位置参数形态）与 --query "关键词" 等效可用
2. --query 显式形态保持兼容，两形态并存时 --query 优先
3. flag-as-value 防护语义保持（--query 后跟 flag 字面量仍按缺参处理）
4. AGENTS.md 模板与 CLI help 的用法说明与实际行为一致

## 成功标准（可验证）

1. sillyspec knowledge search "关键词"（位置参数形态）与 --query "关键词" 等效可用
2. --query 显式形态保持兼容，两形态并存时 --query 优先
3. flag-as-value 防护语义保持（--query 后跟 flag 字面量仍按缺参处理）
4. AGENTS.md 模板与 CLI help 的用法说明与实际行为一致
