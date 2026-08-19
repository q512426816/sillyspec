---
author: qinyi
created_at: 2026-08-19T10:55:23+08:00
---

# 决策台账 — 2026-08-19-reopen-and-execute-batch-guard

## D-001@v1: 选方案 B（状态机增强、保留便利）而非方案 A（全 fail-closed 删除）
- type: architecture
- status: accepted
- source: user
- question: 三个缺陷按何种力度修复——删除便利机制（A）还是加门控守卫（B）？
- answer: 用户在 AskUserQuestion 中选定方案 B：reopen 回填保留但 --confirm 门控；execute 批量完成保留草稿但零 diff 过滤；apply 锚点默认 merge-base、baseline 显式回退。
- normalized_requirement: FR-01（--confirm 门控）、FR-02（三层零 diff 守卫）、FR-03/FR-04（锚点 + 冲突列表）均不得以删除机制的方式实现。
- impacts: [FR-01, FR-02, FR-03, FR-04, W1 全部任务, W2 全部任务, W3 全部任务]
- evidence: 2026-08-19 brainstorm step 4 用户选择轮次。
- priority: P0

## D-002@v1: 草稿识别用 reviewerNotes 前缀，不新增 review.json schema 字段
- type: boundary
- status: accepted
- source: code
- question: 如何区分「CLI 自动生成的 cannot_verify 草稿」与「真实子代理/手写 review」？
- answer: 用 reviewerNotes 含 `auto-generated draft`（src/task-review.js:924 既有写入约定）识别；不新增字段、不动 schemaVersion。
- normalized_requirement: W2 三层守卫的草稿判定统一读 reviewerNotes；真实 pass/fail review 豁免一切新增校验。
- impacts: [FR-02, W2 全部任务]
- evidence: src/task-review.js:924（草稿 reviewerNotes 拼接处）。
- priority: P1

## D-003@v1: apply 双层锚点——交付集合锚 baselineCommit，patch 生成锚 merge-base
- type: architecture
- status: accepted
- source: docs
- question: diffBase 从 baselineCommit 改 merge-base 后，如何保住「只合子代理改动」语义（不把 baseline overlay 快照文件打进 patch）？
- answer: changedFiles 集合仍按 `git diff baselineCommit..tip` 判定（overlay 纯快照文件天然不在集合内）；仅 patch 的 preimage 锚点换 merge-base（占位文件呈"新建真实内容"，main 侧无 add/delete 假冲突）。
- normalized_requirement: FR-03 实现必须保持两层锚点分工；merge-base 计算失败回退现行锚点并 warn。
- impacts: [FR-03, W3 全部任务]
- evidence: debt 文档二实测（真实 merge-base ed45bf54 下 diff 干净直落）；worktree-apply.js:371 现状。
- priority: P0

## D-004@v1: 两条 debt 子项核证不复现，记非目标不修
- type: premise
- status: accepted
- source: code
- question: debt 文档一的「reopen 后进度显示清零 0/11」「waiting 态被静默消费」是否需要本变更修复？
- answer: 核证现行代码：reopenStage 对 fromIdx 之前步骤保持 completed（stage-machine.js:421-431）；continueStep 已有 waitAnswers 轮次审计（complete.js formatWaitHistory）。两条均不复现/已有机制，记非目标。
- normalized_requirement: 本变更不得为这两条扩 scope。
- impacts: [非目标章节]
- evidence: stage-machine.js:421-431、src/run/complete.js formatWaitHistory（本会话 Read 核证）。
- priority: P2

## D-005@v1: Grill 轮 1 三处 P0 判定为文档清晰度问题（非设计矛盾），以「现状→改动点」结构消除
- type: consistency
- status: accepted
- source: design-grill
- question: 独立审查子代理报 B-C1/B-C5/B-C6 三处 P0「design 与代码矛盾，无法判断是描述错误还是改动要求」——是否成立？
- answer: 三处均不构成设计矛盾：总体方案章节本就是目标态（改动要求），背景章节已核证现状；Grill 轮 1 specVerdict=fail 源于改动点未显式锚定导致误读。修正：W1/W2/W3 重构为「现状（已核证，改动对象）→ 改动点 N（file:line 锚点）」显式结构；同步补 D-C4（blockedTasks 返回值在改动点 4 引用接口定义）与 D-C7（ctx JSDoc 类型 + 构造示例，与 generateTaskReviewDrafts 同源）。
- normalized_requirement: design 总体方案各 Workstream 必须含「现状」与「改动点」两段，改动点带 file:line 锚点；后续 Grill 轮与 plan 拆解以此为唯一改动语义来源。
- impacts: [总体方案 W1/W2/W3, 接口定义, 自审第 8 项]
- evidence: Grill 轮 1 review（brainstorm-review-2026-08-19-105650，specVerdict=fail）；本会话对 complete.js/stage-machine.js/worktree-apply.js 的 Read 核证。
- priority: P1
