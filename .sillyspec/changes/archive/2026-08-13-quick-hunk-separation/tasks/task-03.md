---
id: task-03
title: 文档同步 file-lifecycle + SKILL
title_zh: 同步 file-lifecycle + SKILL 文档
allowed_paths:
  - docs/sillyspec/file-lifecycle.md
  - .claude/skills/sillyspec-quick/SKILL.md
goal: 同步 guard allowedFilesHash schema + 同文件并发提示
implementation: |
  docs/sillyspec/file-lifecycle.md 的 guard.json schema 段加 allowedFilesHash 字段说明；.claude/skills/sillyspec-quick/SKILL.md 审计段补"同文件并发 → CLI warn + git add -p/patch 分离指引"。
acceptance: file-lifecycle + SKILL 同步新字段/提示
verify: 人工核对（文档无测试）
constraints: 文档头部 author/created_at + updated_at
depends_on:
  - task-01
  - task-02
---

# task-03: 文档同步 file-lifecycle + SKILL

file-lifecycle.md guard schema 加 allowedFilesHash；SKILL.md 审计段补同文件并发提示。
