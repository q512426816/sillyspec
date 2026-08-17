---
id: task-05
title: 文档同步（file-lifecycle + prompt 镜像 + skill）
title_zh: 文档同步（file-lifecycle + prompt 镜像 + skill）
author: qinyi
created_at: 2026-08-17T09:45:00+08:00
priority: P1
depends_on: [task-03]
blocks: [task-06]
allowed_paths:
  - docs/sillyspec/file-lifecycle.md
  - docs/prompt/quick.md
  - docs/prompt/_extracted.json
  - .claude/skills/sillyspec-quick/SKILL.md
goal: |
  同步 quick 阶段生命周期文档与 prompt 镜像，确保 agent 可见的指引与代码一致。
implementation: |
  1. 修改 docs/sillyspec/file-lifecycle.md：在 quick 阶段生命周期段增加“--done 后自动关闭已完成关联变更”说明。
  2. 改 src/stages/quick.js 后运行 node docs/prompt/_extract.mjs，按 _extracted.json 更新 docs/prompt/quick.md。
  3. 检查 .claude/skills/sillyspec-quick/SKILL.md 是否需同步。
acceptance: |
  - file-lifecycle.md 与代码行为一致。
  - docs/prompt/quick.md 与 src/stages/quick.js 一致。
verify: |
  npm run lint
  目测文档一致性。
constraints: |
  - 禁止手改 docs/prompt/quick.md 的 prompt 原文（须由 extract 脚本生成）。
  - SKILL.md 保持对外纯净性，不写内部 docs 路径/D-编号。
---
# task-05: 文档同步
见 frontmatter。
