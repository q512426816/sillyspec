---
author: qinyi
created_at: 2026-08-15 16:10:00
change: 2026-08-15-docs-check-productize
---

# 任务清单（Tasks）

- [ ] task-01: 抽离校验核心 src/docs-check.js（collectDocRefs/validateRefLine/候选解析/关键词断言/glob walker，纯函数）
- [ ] task-02: CLI 注册 docs check 子命令（--paths/--json/exit code 三档）
- [ ] task-03: config-schema.js 加 docs-check 配置段 + renderExample 同步
- [ ] task-04: 新增 test/docs-check.test.mjs 单测（FR-006 全覆盖）
- [ ] task-05: 迁移 test/doc-ref-check.test.mjs 调 runDocsCheck（两层全开）
- [ ] task-06: 文档同步（file-lifecycle.md / interface-contract.md / SKILL）
