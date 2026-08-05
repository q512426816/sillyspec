---
id: task-07
title: acceptance 审查清单 + best-effort 字段 grep
title_zh: plan 审查对 acceptance/schema 对齐做软约束 + postcheck 兜底
author: qinyi
created_at: 2026-08-05 22:13:45
priority: P1
depends_on: []
blocks: []
requirement_ids: [FR-05]
decision_ids: [D-05@v1]
allowed_paths:
  - src/stages/plan.js
  - src/stages/plan-postcheck.js
---

## goal
plan 审查清单加 acceptance 核验条（prompt 层软约束）；plan-postcheck 加 best-effort 字段 grep 兜底，对 acceptance 提到但源文件找不到的标识符给 warning（不阻断），给 LLM 审查提线索。

## implementation
- plan.js：`stepReviewPlan`（308-341）的「审查清单」（318-326）末尾追加一条：
  「acceptance 字段必须对照 allowed_paths 指向的实际 schema/类型源文件核验字段存在性与形态，不凭 design.md 文字臆断；臆断 = execute 阶段返工」。
- plan-postcheck.js：`validatePlanFeasibility`（497-611）循环体内在 `hasAcceptance`（565）/ `hasAcceptanceCriteria`（87-93）命中后追加启发式——
  从 acceptance 段落文本里提取 `snake_case` / `camelCase` 标识符（正则 `(?<![A-Za-z])[a-z]+(?:_[a-z]+)+|(?<![A-Za-z])[a-z]+(?:[A-Z][a-z]+)+`），
  对每个标识符 grep `allowed_paths` 指向的源文件（`readFileSync` + `includes`），找不到则 `warnings.push(`${taskId}: acceptance 提到 ${ident} 但 allowed_paths 源文件未命中`)`，**只 warning 不 push error**。
  标识符规则只取 snake_case/camelCase，显式跳过命令式 token / 路径段 / 中文，避免噪声。

## acceptance
- plan.js 审查清单（318-326）含 acceptance 核验条，文案明确「对照源文件核验、不臆断」。
- plan-postcheck 对 acceptance 提到、allowed_paths 源文件找不到的 snake_case/camelCase 标识符，返回 warning（不进 errors，`ok` 不被它翻 false）。

## verify
- `node test/plan-postcheck-crlf.test.mjs`（新增 best-effort grep warning 用例：构造 acceptance 提及源文件不存在的标识符，断言 `warnings` 含命中、`ok===true`）。
- `grep` 确认 `stepReviewPlan` prompt 含新审查条关键词（如「schema/类型源文件核验」）。
- 回归 `test/plan-optimization.test.mjs`（若其中含 `stepReviewPlan` prompt 断言则同步快照）。

## constraints
- 软约束（prompt 劝说 + warning）不硬阻断 execute；best-effort 标识符规则只取 snake_case/camelCase，避开命令/路径/中文，宁漏不噪。
- 改 plan.js `stepReviewPlan.prompt` 触发 docs/prompt 同步（task-10 负责跑 `node docs/prompt/_extract.mjs` + 刷新 `docs/prompt/plan.md`），本 task 不动 docs。
- 不改 feasibility 硬校验契约（errors 仍由现有字段/依赖/连续性检查决定）。

## related_tests
- test/plan-postcheck-crlf.test.mjs（增 best-effort grep warning 用例 + 跳过命令/路径/中文的负例）
- test/plan-optimization.test.mjs（若含 stepReviewPlan prompt 断言则同步）
