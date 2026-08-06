---
id: task-04
title: 文档同步（file-lifecycle + 模块卡 + prompt/skills 复核）
title_zh: 文档同步（file-lifecycle + 模块卡 + prompt/skills 复核）
author: qinyi
created_at: 2026-08-06T14:07:40+08:00
priority: P1
depends_on: [task-01, task-02]
blocks: [task-05]
requirement_ids: [NFR-04]
decision_ids: [D-06]
allowed_paths:
  - docs/sillyspec/file-lifecycle.md
  - .sillyspec/docs/sillyspec/modules/runtime.md
  - .sillyspec/docs/sillyspec/modules/worktree.md
  - .sillyspec/docs/sillyspec/modules/cli-entry.md
provides:
  - contract: docsSynced
    fields: [fileLifecycleUpdated, moduleCardsUpdated, promptSkillsVerified]
    desc: "file-lifecycle.md execute-runs/stage-reviews 落点改 + updated_at；模块卡关键逻辑补；docs/prompt 与 .claude/skills 经核实（预期不改 prompt 正文只改 runtimeRoot 解析则跳过）"
expects_from:
  task-01:
    - contract: resolveRuntimeRoot
      needs: [platformOpts, localSpecBase, returnType]
  task-02:
    - contract: allRuntimeRootSitesResolved
      needs: [sitesCount]
goal: |
  CLAUDE.md「文件生命周期文档同步」铁律：改动触及 runtimeRoot 解析（影响文件落点），同步 file-lifecycle.md
  + 相关模块卡；docs/prompt 与 .claude/skills 经核实（路径解析逻辑变，非 prompt 文案变，预期跳过）。
implementation: |
  - docs/sillyspec/file-lifecycle.md：
    更新头部 updated_at 为当前日期；
    execute-runs / stage-reviews 落点说明改为「drift 场景（agent cd worktree 跑 plan/execute/verify/archive）
    落主仓 .sillyspec/.runtime/（specDriftAnchor 锚定），不随 worktree cleanup 消失」；
    补 resolveRuntimeRoot 新公式说明（三级优先级 runtimeRoot > specDriftAnchor > 本地兜底）。
  - .sillyspec/docs/sillyspec/modules/runtime.md：关键逻辑补 resolveRuntimeRoot 工具函数（统一 .runtime 根解析）+
    specDriftAnchor 字段语义（仅参与 runtimeRoot 解析，不触发平台 sentinel）。
  - .sillyspec/docs/sillyspec/modules/worktree.md：补「cleanup 整目录删不再威胁 execute-runs/stage-reviews
    （方案 A 落主仓 .runtime，design §5.D 9 cleanup 调用点无需改）」。
  - .sillyspec/docs/sillyspec/modules/cli-entry.md：补 drift 守卫 producer 字段（command.js:540 specDriftAnchor）。
  - docs/prompt/（D-06 复核）：本变更不改 prompt 正文（src/stages/*.js definition.steps[].prompt 不动），
    只改 src/run/prompt.js 内 runtimeRoot 解析（marker 路径解析逻辑）；预期 docs/prompt/ 不需同步。
    若 execute 核实发现 prompt.js 改动意外影响注入文本，跑 node docs/prompt/_extract.mjs 复核。
  - .claude/skills/（若触及 stage-review marker 路径描述）：本变更不改 marker 路径格式
    （current-execute-run-id-<change> / stage-reviews/<stage>-<runId>/ 不变），只改 runtimeRoot 解析；
    预期 .claude/skills/ 不需同步。execute 核实。
acceptance: |
  - file-lifecycle.md updated_at 刷新 + execute-runs/stage-reviews 落点说明含「drift 场景落主仓」。
  - 模块卡 runtime.md / worktree.md / cli-entry.md 关键逻辑补充 resolveRuntimeRoot + specDriftAnchor。
  - docs/prompt/ 与 .claude/skills/ 经核实：预期不改（只改 runtimeRoot 解析非 prompt 文案/路径格式），
    若需改则在 task body 记录决定。
verify: |
  head -5 docs/sillyspec/file-lifecycle.md（updated_at 刷新）
  grep -n "specDriftAnchor\|resolveRuntimeRoot" docs/sillyspec/file-lifecycle.md .sillyspec/docs/sillyspec/modules/runtime.md
constraints: |
  - 不改 prompt 正文（src/stages/*.js definition.steps[].prompt 不动；docs/prompt/ 预期跳过，D-06）。
  - 不改 marker 路径格式（路径解析逻辑变，非路径模板变；.claude/skills/ 预期跳过）。
  - 文档中文，必要专业术语除外。
related_tests: []
---

# task-04: 文档同步（file-lifecycle + 模块卡 + prompt/skills 复核）

CLAUDE.md「文件生命周期文档同步」铁律：runtimeRoot 解析改动影响文件落点，同步 file-lifecycle.md + 模块卡；prompt 文案与 marker 路径格式不变则 docs/prompt + .claude/skills 跳过（D-06）。

## 依据
- design.md §12 D-06（文档同步：file-lifecycle + prompt 复核）/ 文件变更清单（docs/sillyspec/file-lifecycle.md）
- requirements.md NFR-04（文档同步）
- CLAUDE.md「文件生命周期文档同步」检查清单（file-lifecycle.md 与代码一致 + updated_at 时间戳）
