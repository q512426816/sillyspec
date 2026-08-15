---
author: qinyi
created_at: 2026-08-15 16:20:00
change: 2026-08-15-docs-check-productize
---

# 模块影响分析（Module Impact）— docs-check 产品化

## 变更范围

新增 `sillyspec docs check` CLI 子命令：src/docs-check.js 新模块（两层文档引用校验 + glob walker）+ src/index.js 命令注册 + src/config-schema.js 配置段 + 两件测试（新增/迁移）+ 3 份文档同步。6 task，4 Wave。dogfood 自身迁移（test/doc-ref-check.test.mjs 改调 runDocsCheck）后检测力不降级。

## 模块影响矩阵

| 模块 | 影响类型 | 相关文件 | 更新内容摘要 | needs_review |
|------|----------|----------|-------------|--------------|
| CLI 入口 | 接口变更（新增子命令） | src/index.js | 新增 docs 命令组 check 子命令（--paths/--json/exit 0-1-2） | false |
| 配置 | 数据结构变更 | src/config-schema.js | 新增 docs-check 段（paths/skip/keywordAssert）+ renderExample 同步 | false |
| 测试 | 新增 + 迁移 | test/docs-check.test.mjs, test/doc-ref-check.test.mjs | 新单测覆盖 FR-006；旧私有测试迁移调 runDocsCheck（两层全开） | false |
| 文档 | 文档同步 | docs/sillyspec/file-lifecycle.md, docs/sillyspec/interface-contract.md, docs/sillyspec/doc-consistency-debt.md | 新命令生命周期/CLI 契约/D-6 销账 | false |

## 未匹配文件

无。src/docs-check.js（新增模块本体）归 CLI 入口模块线，见上表第一行。

## 更新结果

| 模块文档 | 操作 | 状态 |
|----------|------|------|
| docs/sillyspec/file-lifecycle.md | 补 docs check 命令行为与配置 | done |
| docs/sillyspec/interface-contract.md | 补 CLI 接口契约段（§1.3） | done |
| docs/sillyspec/doc-consistency-debt.md | D-6 销账 | done |
