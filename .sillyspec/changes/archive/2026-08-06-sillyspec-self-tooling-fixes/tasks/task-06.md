---
id: task-06
title: 文档同步（file-lifecycle + prompt + skills + 模块文档）
title_zh: 文档同步（file-lifecycle + prompt + skills + 模块文档）
author: qinyi
created_at: 2026-08-06T09:42:00+08:00
priority: P1
depends_on: [task-01, task-02, task-03, task-04]
blocks: [task-07]
requirement_ids: [FR-01, FR-02, FR-03, FR-04]
decision_ids: [D-01@v1, D-02@v1, D-03@v1, D-04@v1]
allowed_paths:
  - docs/sillyspec/file-lifecycle.md
  - docs/prompt/
  - .claude/skills/
  - .sillyspec/docs/sillyspec/modules/
goal: |
  同步 task-01~04 行为变更到文档：filterDeliverableFiles 行为（docs/ 纳入交付物）入
  file-lifecycle.md；核实 docs/prompt/（坑2 warning 在 stage-contract.js 校验逻辑非 prompt
  源，预计不动）；apply/archive/verify 相关 skill 同步；模块文档 runtime/stages/cli-entry/worktree 同步。
implementation: |
  - docs/sillyspec/file-lifecycle.md：更新头部 updated_at 时间戳；新增 filterDeliverableFiles
    行为说明段（.sillyspec/docs/ 纳入交付物 apply 回主仓，changes/+.runtime/+quicklog/ 排除）。
  - docs/prompt/：跑 node docs/prompt/_extract.mjs 核实——坑2 warning 在 stage-contract.js
    校验逻辑（非 stages/*.js prompt 源），预计无 diff；若 _extracted.json 无变化则跳过。
  - .claude/skills/：若 task-03（worktree apply）/ task-04（archive git add）/ task-01（gate marker）
    触及对应 skill 行为描述则同步。
  - .sillyspec/docs/sillyspec/modules/：runtime/stages/cli-entry/worktree 模块文档按
    task-01~04 行为同步。
acceptance: |
  - docs/sillyspec/file-lifecycle.md updated_at 更新 + filterDeliverableFiles 行为说明。
  - docs/prompt/ 无 diff（坑2 非 prompt 源，跳过）或按 _extract.mjs 输出同步。
  - .claude/skills/ 触及 apply/archive/verify 则同步。
  - 模块文档 runtime/stages/cli-entry/worktree 同步。
verify: |
  git diff docs/ 核对（updated_at + filterDeliverableFiles 段）
constraints: |
  - 不臆造文档变更（docs/prompt 以 _extract.mjs 输出为准，无 diff 不强改）。
  - 坑2 warning 在 stage-contract.js 校验逻辑非 prompt 源，docs/prompt 预计不动。
  - file-lifecycle updated_at 必更（CLAUDE.md 文件生命周期文档同步铁律）。
  - 仅同步 task-01~04 已落定的行为变更，不预告 task-05（ROADMAP）。
---

# task-06: 文档同步

task-01~04 行为变更落地后同步文档。重点：filterDeliverableFiles 行为变更入
file-lifecycle.md；docs/prompt 经 _extract.mjs 核实（预计无 diff，坑2 非 prompt 源）。

## 依据
- CLAUDE.md「文件生命周期文档同步」+「提示词文档同步」铁律
- design.md §6 文件变更清单（file-lifecycle.md / docs/prompt/* / .claude/skills/）
- 数据源关系：docs/prompt 唯一数据源 = src/stages/*.js + src/run/prompt.js；坑2 在
  stage-contract.js 校验逻辑非 prompt 源，预计 _extract.mjs 无 diff。
