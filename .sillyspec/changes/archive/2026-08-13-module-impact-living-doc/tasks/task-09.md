---
id: task-09
title: .claude/skills 同步 module-impact 要点（plan/execute/verify/archive）
title_zh: skills 同步 module-impact 各阶段要点
author: qinyi
created_at: 2026-08-13 10:29:11
priority: P0
depends_on: []
blocks: []
requirement_ids: []
decision_ids: []
allowed_paths:
  - .claude/skills/sillyspec-plan/SKILL.md
  - .claude/skills/sillyspec-execute/SKILL.md
  - .claude/skills/sillyspec-verify/SKILL.md
  - .claude/skills/sillyspec-archive/SKILL.md
goal: >
  plan/execute/verify/archive 四个 skill 的 SKILL.md 补 module-impact 各阶段要点（plan review_plan 生成首版 / execute 主代理 Wave 后汇总 / verify 核对 / archive step2 终审），让 agent 读 skill 时知道新行为。
implementation:
  - sillyspec-plan/SKILL.md：review_plan 步骤说明加「生成 module-impact.md 首版（large）」
  - sillyspec-execute/SKILL.md：Wave 说明加「主代理 Wave 后汇总更新 module-impact」
  - sillyspec-verify/SKILL.md：输出报告说明加「核对 module-impact」
  - sillyspec-archive/SKILL.md：extract-module-impact 步骤改为「最终确认 module-impact」
acceptance:
  - 4 个 SKILL.md 含 module-impact 各阶段要点
verify:
  - grep 4 个 SKILL.md 含 module-impact
constraints:
  - skill 对外纯净（无内部 docs 路径/源码符号/D 编号——SKILL 进 npm + init 复制到用户项目）
  - 不破坏 skill 既有结构
---
