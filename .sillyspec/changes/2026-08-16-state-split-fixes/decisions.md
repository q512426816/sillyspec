---
author: qinyi
created_at: 2026-08-16T23:10:00+08:00
updated_at: 2026-08-16T23:10:00+08:00
---

# Decisions：2026-08-16-state-split-fixes

## D-001@v1: marker 写入点完整清单与分层 fail 语义
- type: consistency
- priority: P1
- status: accepted
- source: design-grill
- question: design 原方案只列三处 marker 写入点且统一上抛——Grill 实证有第 4 处主写入点（stage.js:96-112）且统一上抛与 generateTaskReviewDrafts 的 fail-open 契约冲突（throw 被调用方 catch 吞成 warn）
- answer: 四处全覆盖（stage.js 主写入点 + gates/prompt/task-review 三处 fallback）；失败语义按调用方分层——stage 主点 throw（启动即失败）、gates gate 内 throw（外层 fail-closed）、prompt console.error 降级（防炸渲染）、task-review 去静默保 fail-open 契约
- normalized_requirement: 不变量"marker 在则 execute-runs/<runId>/tasks/ 在"对四处写入点均成立；任一写入点失败至少 console.error 留痕
- impacts: [design.md #1 方案与文件清单, task-01, test/execute-run-dir-fail-loud.test.mjs]
- evidence: Grill 1b/1c；stage.js:96-112 / task-review.js:763 注释 / complete.js:260 / index.js:511

## D-002@v1: 预对齐候选集口径 + dirty 保护
- type: feasibility
- priority: P1（Grill 定 P2，主会话升级——dirty 覆盖是数据丢失风险）
- status: accepted
- source: design-grill
- question: 预对齐过滤集用 result.changedFiles（工作区口径，含未提交）有缝隙；git checkout main -- file 会覆盖 worktree 工作区未提交内容
- answer: 候选集显式钉死为 `git diff <baseHash>..<baselineCommit>` 已提交口径 ∩ main 已推进集，减去分支上已变更文件；预对齐前逐文件查工作区 dirty，dirty 则跳过该文件走降级
- normalized_requirement: 预对齐只动"baseline 携带 + main 已推进 + 分支无变更 + 工作区干净"四条件全满足的文件
- impacts: [design.md #2 方案, task-02, test/worktree-merge-baseline-align.test.mjs]
- evidence: Grill 2d/P2-2；worktree-apply.js:717-739 沙箱复现
