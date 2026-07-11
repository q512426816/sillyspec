---
id: task-04
title: Wave 1 模块文档同步（stages）
author: qinyi
created_at: 2026-07-11T20:50:00
priority: P1
depends_on: [task-01]
blocks: []
allowed_paths:
  - .sillyspec/docs/sillyspec/modules/stages.md
---
> 同步 stages 模块文档，记录 execute.js prompt 路径占位符化（CLAUDE.md 强制：改 src/stages/ prompt 后同步文档）。

## implementation
- 读 .sillyspec/docs/sillyspec/modules/stages.md，定位 execute stage prompt 描述段
- 补注：execute prompt 中 review.json/endpoints.json 路径用 {SPEC_ROOT}/.runtime/ 占位符，平台模式由 run.js 重写到 specDir（坑 2 修复）
- 更新 frontmatter updated_at（ISO 精确到秒）

## acceptance
- stages.md 含 {SPEC_ROOT}/.runtime/ 占位符说明
- frontmatter updated_at 已更新
- 不引入与 design.md 冲突的描述

## verify
- `grep "{SPEC_ROOT}" .sillyspec/docs/sillyspec/modules/stages.md` 有命中
- 文档语法检查（markdown 无破损）

## constraints
- 仅 stages.md（file-lifecycle.md 由 task-08 统一处理，避免 allowed_paths 冲突）
- 不改其它模块文档
- 更新 updated_at 时间戳
