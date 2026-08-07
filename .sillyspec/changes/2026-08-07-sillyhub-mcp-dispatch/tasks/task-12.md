---
id: task-12
title: sillyspec-execute skill sync
title_zh: execute skill 派发说明同步
author: qinyi
created_at: 2026-08-07 13:21:53
priority: P1
depends_on: [task-07]
blocks: []
requirement_ids: []
decision_ids: []
allowed_paths:
  - .claude/skills/sillyspec-execute/SKILL.md
goal: >
  更新 .claude/skills/sillyspec-execute/SKILL.md 同步 execute 派发说明，
  让 execute skill 反映经 dispatch hint 注入派发指令的新流程
implementation:
  - 读取 task-07 落地后的 execute 派发新流程
  - 在 SKILL.md 追加 dispatch hint 与一 Wave 一 mission 说明
  - 标注无 MCP 配置时行为不变 fallback Local
  - 不动其它阶段 skill 文件
acceptance:
  - SKILL.md 派发说明与 execute.js 新流程一致
  - 保留现状 fallback Local 描述
verify:
  - npm test
constraints:
  - 仅改 execute skill 不触及其它 skill 目录
  - 纯文档改动不触及 src 与 test
---
