---
author: qinyi
created_at: 2026-08-15 21:18:00
change: 2026-08-15-docs-debt-inject
---

# 模块影响分析（Module Impact）— docs-debt 事实注入

## 变更范围

execute Wave 级 [docs-debt] 模块文档欠账事实注入：src/docs-debt.js 新模块（三级归属 + 双 commit 对账）+ modules.js CRLF 修复 + execute.js/prompt.js 占位符接线 + 单测 + 文档同步。5 task，4 Wave。

## 模块影响矩阵

| 模块 | 影响类型 | 相关文件 | 更新内容摘要 | needs_review |
|------|----------|----------|-------------|--------------|
| modules | bug 修复 | src/modules.js | parseModuleMapSimple 入口 CRLF 归一（激活本仓全部模块上下文注入——行为扩散） | true |
| runtime | 接口扩展 | src/run/prompt.js | outputStep 加 {DOCS_DEBT} 替换分支（KNOWLEDGE_HIT_REPORT 同范式） | false |
| stages | 模板改动 | src/stages/execute.js | Wave prompt 模板加 {DOCS_DEBT} 占位符一行 | false |
| 测试 | 新增 | test/docs-debt.test.mjs | FR-006 全场景 + 本仓 CRLF 实测 | false |

## 未匹配文件

无。src/docs-debt.js（新增）为独立信号源模块。

## 更新结果

| 模块文档 | 操作 | 状态 |
|----------|------|------|
| docs/sillyspec/file-lifecycle.md | execute 行注入说明 + CRLF 行为扩散 | done |
| docs/sillyspec/doc-consistency-debt.md | 第六节拼图登记 | done |
