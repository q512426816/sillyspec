---
id: task-02
title: machine-interface.js — derive 四个 facet 实现
author: qinyi
created_at: 2026-07-09 19:58:30
priority: P0
depends_on: [task-01]
blocks: [task-03]
allowed_paths:
  - src/machine-interface.js
expects_from:
  task-01:
    - contract: machine-interface-module
      needs: [buildEnvelope, EXIT_OK, EXIT_BLOCKED, EXIT_UNKNOWN]
provides:
  - contract: derive-api
    fields: [runDerive, FACETS]
goal: |
  在 machine-interface.js 中实现 runDerive(facet, changeName, {cwd})：单项事实核验，
  facet ∈ {execute-evidence, verify-test, task-reviews, artifacts}。
implementation: |
  在 src/machine-interface.js 追加（复用 task-01 的 buildEnvelope/退出码/输出纪律）：
  1. export const FACETS = ['execute-evidence','verify-test','task-reviews','artifacts']
  2. runDerive(facet, changeName, {cwd})：
     - 非法 facet / 变更不存在 → exitCode 2
     - execute-evidence → checkExecuteCodeEvidence(cwd, changeName)：
       data={status, detail}；status==='changed' → ok:true(0)，'unchanged' → ok:false(1)，
       'unknown' → ok:true + warning（无法判定不等于失败，与 validateExecuteOutputs 语义一致）
     - verify-test → runVerifyTestCheck({cwd, specBase, changeName})：
       data={status, exitCode, durationMs, resultPath}；passed/skipped→0，failed→1
     - task-reviews → validateTaskReviews(changeDir, {gitDir 优先 worktree meta})：ok→0，否则 1
     - artifacts → runValidators(currentStage, cwd, changeName, context)：ok→0，否则 1
  3. envelope 的 command:'derive'、facet 字段填充，stage 为 null（或 artifacts 时填 currentStage）。
acceptance: |
  - 四个 facet 各返回结构化 data 且退出码语义符合上述映射
  - 非法 facet → exit 2，errors 说明合法枚举
  - 调用前后 sillyspec.db 内容不变
verify: |
  task-07 覆盖四 facet + 非法 facet；实现时先对 execute-evidence 写红测试再实现。
constraints: |
  - 只改 src/machine-interface.js；不重写被调模块的校验逻辑
  - verify-test 真实执行测试命令（慢命令，D-009@v1 接受），不做结果缓存
---

# task-02: derive 四个 facet

## 目标

见 frontmatter goal（design.md §3.2 表）。

## 实现蓝图

见 frontmatter implementation。

## 验收标准

见 frontmatter acceptance（3 条）。

## TDD/验证

见 frontmatter verify。
