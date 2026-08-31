---
id: task-06
title: 文档同步（file-lifecycle / modules / skills）
author: qinyi
created_at: 2026-07-07T07:43:24
priority: P1
depends_on: [task-01, task-02, task-03, task-04]
blocks: []
requirement_ids: [NFR-03]
decision_ids: []
allowed_paths:
  - docs/sillyspec/file-lifecycle.md
  - .sillyspec/docs/sillyspec/modules/runtime.md
  - .sillyspec/docs/sillyspec/modules/worktree.md
  - .claude/skills/sillyspec-doctor/SKILL.md
goal: >
  按 CLAUDE.md 强制同步规则，把 doctor --align-execute-progress flag、新诊断项、progress.js 新方法、门控诊断分支同步到生命周期/模块/skills 文档。
implementation:
  - docs/sillyspec/file-lifecycle.md：在 doctor --cleanup-remnant 段（line 124-125）后补 doctor --align-execute-progress [--confirm] [--change <name>] 条目（基于 plan.md 全勾对齐 execute 派生戳；默认 dry-run、--confirm 才写）；在"核心修正"列表补 execute-progress-plan-mismatch 诊断项（只读，safe_action 建议）；更新头部 updated_at 为 2026-07-07
  - .sillyspec/docs/sillyspec/modules/runtime.md：progress.js 模块卡片补新方法 alignExecuteToPlan(cwd, changeName, specBase)（读 plan.md checkbox 全勾判定 + 补 execute step 戳 + 显式置 stage status + dry-run/--confirm）+ 辅助 readPlanCheckboxStatus
  - .sillyspec/docs/sillyspec/modules/worktree.md：补 enforceDepsGate 诊断分支说明（worktreeGone 基于 !existsSync(getWorktreePath(...))，终态指向 doctor 对齐/worktree create，非终态维持 --fix；门核心放行标准不变）
  - .claude/skills/sillyspec-doctor/SKILL.md：doctor 特有命令区补 sillyspec doctor --align-execute-progress --change <name> [--confirm]（默认 dry-run，按 plan.md 声明对齐 execute 进度，信任声明、verify 兜底）
acceptance:
  - AC-08：文档同步完成（file-lifecycle / modules / skills 均含新 flag + 新诊断项 + 新方法 + 门控分支）
verify:
  - npm test（确保文档改动未误碰源码/测试，语法不破、全量通过）
  - 人工核对四个目标文件存在且含新增条目（grep align-execute-progress / execute-progress-plan-mismatch / alignExecuteToPlan / 诊断分支）
constraints:
  - 更新 file-lifecycle.md 头部 updated_at 时间戳为 2026-07-07
  - 文档面向用户（agent）的中文约定不变（与现有段落语言、术语一致：派生戳、真相源、fail-closed）
  - 不编造未实现的 flag 或行为——只记录 task-01~task-04 实际落地的内容（以 design.md §5-§7 + 文件变更清单为准）
  - 不改 sillyspec.db schema 描述（本变更不动 schema）
  - 不写文档正文内容到本 TaskCard（只列改哪几处、改什么），正文在执行阶段填入目标文件
---
