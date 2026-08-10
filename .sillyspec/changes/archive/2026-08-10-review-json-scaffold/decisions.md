---
author: qinyi
created_at: 2026-08-10 12:08:03
---

# decisions：register-stage-review 命令

> 本次变更的决策台账。每条含稳定版本 ID（D-xxx@vN），Grill 修正用 @v2 + supersedes。

## D-001@v1: C1 范围 = 仅 stage 级 register-stage-review
- type: boundary
- status: accepted
- source: user + code（Explore agent 报告 §3/§7）
- question: C1 覆盖 stage+task 两级 scaffold，还是仅 stage 级？
- answer: 仅 stage 级。task 级已有 backfill-reviews（index.js:423）+ generateTaskReviewDrafts（task-review.js:658）完整解决，不动。
- normalized_requirement: C1 只新增 stage 级 review.json scaffold 命令；不改 backfill-reviews / generateTaskReviewDrafts / task-review.js。
- impacts: [design §3/§4/§6, test 范围]
- evidence: Explore agent 报告 §3（register-stage-review 源码不存在）+ §7（task 级 backfill-reviews 已存在）；用户 AskUserQuestion 确认「仅 stage 级」。
- priority: P0

## D-002@v1: 命令名 = register-stage-review
- type: architecture
- status: accepted
- source: docs（prompt-control-debt.md:146 exec-d 契约）+ user
- question: stage 级 scaffold 命令叫什么？
- answer: register-stage-review（exec-d/债单原名），非 review scaffold（任务备注提议）/ backfill-stage-review。
- normalized_requirement: CLI 命令 `sillyspec register-stage-review --change <名> --stage <brainstorm|plan|execute> [--from <file>]`。
- impacts: [design §5.1, index.js case 名, 测试文件名]
- evidence: prompt-control-debt.md:146 原始契约；用户 AskUserQuestion 确认。
- priority: P1

## D-003@v1: scaffold 自动算 docHash（部分实现已 defer 的 P6.1b）
- type: premise（翻 defer）
- status: accepted
- source: user + code（stage-review.js:96 computeDocHash）
- question: scaffold 填 docHash 还是留占位让 agent/CLI 后填？
- answer: scaffold（CLI 命令）直接 computeDocHash(mainDocPath) 填入；--from adopt 模式重算覆盖 agent 草稿 docHash。仅 scaffold 这条路径确定性。
- normalized_requirement: registerStageReview 调 computeDocHash 算 docHash；不改现有 agent 手算+CLI 重算 enforcement（agent 自写 review.json 仍需算 hash，gate 仍重算比对）。
- impacts: [design §5.2 步骤5, reconcile P6.1b defer（prompt-control-debt.md:73）]
- evidence: stage-review.js:96-100 computeDocHash；prompt-control-debt.md:73 P6.1b defer 记录；用户 AskUserQuestion 确认「scaffold 自动算」。
- priority: P1
- note: 与 P6.1b defer 不冲突——P6.1b 是「agent 写 hash 链路全交 CLI」的大改（defer），本决策只给 scaffold 这条新路径确定性，不改 agent 现有路径。

## D-004@v1: 仅手动触发，不集成 execute --done
- type: boundary
- status: accepted
- source: user
- question: 触发方式：手动命令 vs 集成进 execute --done 自动补骨架？
- answer: 仅手动命令。不改 execute --done gate 语义、不动 Stage Review Gate / complete.js 链路。
- normalized_requirement: register-stage-review 是独立手动 CLI；gates.js / complete.js / prompt.js 零改动。
- impacts: [design §3 非目标 / §5, G-7]
- evidence: 用户 AskUserQuestion 确认「仅手动命令」。
- priority: P1

## D-005@v1: verdict 默认 cannot_verify（schema 强制）
- type: code-forced
- status: accepted
- source: code（task-review.js:24 VALID_VERDICTS）
- question: 骨架 verdict 默认值？（任务备注提 cannot_verify/needs_review）
- answer: cannot_verify。VALID_VERDICTS=['pass','fail','cannot_verify'] 无 needs_review；cannot_verify 必须带非空 requiredEvidence（schema 反逃逸）。
- normalized_requirement: 骨架 specVerdict/qualityVerdict='cannot_verify' + 非空 requiredEvidence boilerplate + reviewerNotes 标骨架来源。
- impacts: [design §5.2 骨架]
- evidence: task-review.js:24 VALID_VERDICTS；stage-review.js:136-140 cannot_verify+requiredEvidence 规则。
- priority: P2

## D-006@v1: --stage→reviewType/mainDoc 复用 STAGE_REVIEW_TYPE/STAGE_MAIN_DOC
- type: code-forced
- status: accepted
- source: code（stage-review.js:29-31）
- question: --stage 如何映射到 reviewType 和主文档？
- answer: 复用 stage-review.js 常量：brainstorm→design/design.md，plan→plan/plan.md，execute→acceptance/design.md。
- normalized_requirement: registerStageReview 用 STAGE_REVIEW_TYPE[stage] / STAGE_MAIN_DOC[stage]，不另写映射表。
- impacts: [design §5.2 步骤3, §4 复用表]
- evidence: stage-review.js:29-31。
- priority: P2

## D-007@v1: 保留 --from adopt 模式
- type: accepted
- status: accepted
- source: docs（prompt-control-debt.md:146 exec-d 契约）
- question: 是否支持 adopt agent 已写草稿？
- answer: 保留 --from <file>：读 agent 草稿 → schema 校验 → 保留 verdict/checklist/reviewerNotes → 覆盖 docHash 为真实值 + 规范化 reviewedFiles[0] → 写 canonical run dir + marker + 自检。
- normalized_requirement: --from 模式不丢 agent 审查内容，仅修 mechanics（docHash/marker/run dir）。
- impacts: [design §5.1 / §5.2]
- evidence: prompt-control-debt.md:146 exec-d 契约含 --from。
- priority: P1

## D-008@v1: 复用原料函数不另写字段表
- type: code-forced
- status: accepted
- source: code（stage-review.js 单源原则）
- question: 骨架字段表是 registerStageReview 内自写还是复用？
- answer: 复用 generateStageReviewRunId/stageReviewMarkerPath/validateStageReview/computeDocHash + 常量（REVIEW_SCHEMA_VERSION/VALID_VERDICTS/STAGE_REVIEW_TYPES/STAGE_MAIN_DOC/STAGE_REVIEW_TYPE），不另写字段表。
- normalized_requirement: 事前给==事后查 —— CLI 写的骨架用同源常量，必过 CLI 校验。
- impacts: [design §4 复用表, §11 自审]
- evidence: stage-review.js:33-42 注释（renderReviewJsonContract 与 validateStageReviewSchema 同源常量）。
- priority: P1

## D-009@v1: 代码组织 = 方案 B（函数入 stage-review.js）
- type: architecture
- status: accepted
- source: user + CONVENTIONS
- question: register-stage-review 逻辑放哪里？（A index.js 内联 / B 抽函数入 stage-review.js / C 新建独立模块）
- answer: 方案 B。registerStageReview() 函数入 src/stage-review.js，index.js 加 case 薄包装。
- normalized_requirement: 与 task 级 generateTaskReviewDrafts（task-review.js）+ backfill-reviews（index.js case）严格对称；可单测；index.js 不膨胀；零新文件。
- impacts: [design §4 / §6 文件清单]
- evidence: 用户 AskUserQuestion 确认「方案B」；CONVENTIONS kebab-case/命名导出；task 级对称模式。
- priority: P1
