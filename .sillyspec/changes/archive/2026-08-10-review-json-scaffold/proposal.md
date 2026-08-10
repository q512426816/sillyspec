---
author: qinyi
created_at: 2026-08-10 12:11:46
---

# 提案书（Proposal）

## 动机

SillySpec 的 tier=independent 变更在 brainstorm/plan/execute 阶段完成时，Stage Review Gate 硬校验一份**阶段级** `review.json`，要求由独立审查子代理产出。现状没有任何确定性 writer 会主动生成它——只有 schema 校验器 + 把契约渲染进 prompt 让子代理照抄。子代理照抄易错（漏 schemaVersion / docHash 用旧 sha256 / checklist 嵌套对象），且调度者手动派子代理时 marker 不写导致 gate 取错 run，反复摩擦。

对比之下，task 级已有完整解（`backfill-reviews` + `generateTaskReviewDrafts`）。stage 级是对称缺口。

## 提案

新增手动 CLI 命令 `sillyspec register-stage-review --change <名> --stage <brainstorm|plan|execute> [--from <review.json>]`：

- 确定性生成 stage 级 review.json（填对全部必填字段 + CLI 直接算 docHash + 写 canonical run 目录 + 写 marker + 自检通过）。
- `--from` adopt 模式：保留独立子代理写的 verdict/checklist，仅修正 mechanics（重算 docHash + 规范化路径 + 写 marker）。
- 治 marker 死锁（CLI 确定性写 marker，不依赖 prompt 渲染）。

实现：`registerStageReview()` 函数入 `src/stage-review.js`（复用已就绪的 computeDocHash/generateStageReviewRunId/stageReviewMarkerPath/validateStageReview + 常量），`src/index.js` 加薄 case（镜像 `backfill-reviews`）。纯增量、低风险、不动任何 gate 语义。

## 价值

- 消除 tier=independent 时 stage 级 review.json 手写 schema/docHash/marker 的反复摩擦（含 marker 死锁根因）。
- docHash 由 CLI 算（部分实现已 defer 的 P6.1b，仅 scaffold 路径确定性）。
- 与 task 级 backfill-reviews 严格对称，维护性一致。

## 不在范围内（Non-Goals）

- 不改 `enforceReviewJsonGate` marker fallback（2026-08-09 独立 defer 项）。
- 不集成进 `execute --done`（仅手动命令）。
- 不动 task 级 backfill-reviews / generateTaskReviewDrafts。
- 不改 agent 手算 docHash 的现有 enforcement（仅 scaffold 路径 CLI 算）。
- 不做统一 review scaffold 命令覆盖两级。
- 不引入 needs_review verdict（schema 只有 pass/fail/cannot_verify）。

## 风险摘要

- cannot_verify 骨架会过 Stage Review Gate schema——明确是「待审占位」，verdict 完整性靠 tier=independent 独立子代理流程（与现状一致，不引入新风险）。
- 重复跑建多个 run 目录（warn + 覆盖 marker，orphan 无害）。
