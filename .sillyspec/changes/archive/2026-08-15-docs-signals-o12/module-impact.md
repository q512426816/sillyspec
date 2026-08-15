---
author: qinyi
created_at: 2026-08-15 23:12:00
change: 2026-08-15-docs-signals-o12
---

# 模块影响分析（Module Impact）— 欠账信号从有到准

## 变更范围

O-1 quick docSyncHint 模块归属 + O-2 [docs-debt] 内联建议行号 + F-1 docs check flag 白名单。6 task 4 Wave，7 文件（1 新增 6 修改）。

## 模块影响矩阵

| 模块 | 影响类型 | 相关文件 | 更新内容摘要 | needs_review |
|------|----------|----------|-------------|--------------|
| runtime | 接口扩展 | src/run/shared.js, src/run/quick-audit.js | docSyncHint.modules 字段（归属纯函数复用）+ 渲染 | false |
| docs-debt | 功能增强 | src/docs-debt.js | facts 内联卡片失效引用 + 建议行号 | false |
| cli-entry | bug 修复 + 行为收紧 | src/index.js | flag 白名单 + 未知 flag exit 2 + 💡 门控 | false |
| 测试 | 升级+新增 | test 三件 | D-8 断言升级 / O-2 场景 / CLI 子进程三场景 | false |

## 未匹配文件

无。

## 更新结果

| 模块文档 | 操作 | 状态 |
|----------|------|------|
| docs/sillyspec/file-lifecycle.md | quick/execute 行为同步 | done |
