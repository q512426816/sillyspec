---
author: qinyi
created_at: 2026-08-08T13:05:00+08:00
type: decisions
---

# 决策追踪（Design Grill 2026-08-08）

来源：brainstorm Step 7 Design Grill 独立子代理审查（review-run-id `review-2026-08-08-130229`，specVerdict/qualityVerdict 均 pass，无 P0）。以下 8 条为子代理发现的设计精度问题，**每条均已确定解决方案（normalized_requirement）并 accepted**，在 plan/execute 落实，不属于需回 brainstorm 返工的未决项。

## P1（plan 必须落实，影响 v1 核心 use case 噪音质量）

### D-001@v1: quick ownFiles 须并入 baselineFiles
- type: feasibility
- priority: P1
- status: accepted
- source: design-grill CC-03
- question: §5/§10 ownFiles=`review.changedFiles` 是否真代表「本会话改动」？
- answer: 否。`review.changedFiles`（shared.js:507 push）在 shared.js:505 `if (isBaselineFile(file)) continue` 处排除了 baseline 文件——而多 agent 脏工作树起 quick 时，baselineFiles 正是本会话预存改动。仅用 changedFiles 会把自身预存文件误报为他者（§1 core 场景直接失效）。
- normalized_requirement: quick 钩子 ownFiles = `review.changedFiles ∪ guard.baselineFiles`（`mergedGuard.baselineFiles` 在 `if(guard)` 块内可用）。
- impacts: [design §5/§10 R-02, plan task-03, test 多-agent-dirty-worktree 场景]

### D-002@v1: execute ownFiles 源优先级链 + in-place 噪音决策
- type: feasibility
- priority: P1
- status: accepted
- source: design-grill CC-09
- question: execute ownFiles「取不到则空」在 in-place 模式（默认无 worktree）下是否可接受？
- answer: 不可接受「空」。in-place 模式（`meta.mode==='in-place-fallback'`，gates.js:744 / complete-handlers.js:744）下主仓 git status 含本会话 src/ 交付文件，空 ownFiles 会把自身交付全报他者。worktree 模式下主仓看不见交付文件，空 ownFiles 无害。
- normalized_requirement: execute ownFiles 源优先级链 = worktree applied 文件 > plan allowed_paths > design §6 文件清单 > 空（仅 worktree 模式允许空）。plan 钉死取值顺序与 in-place 兜底（至少用 design §6 / plan allowed_paths）。
- impacts: [design §5/§10, plan task-04, test in-place 场景]

### D-003@v1: quick 钩子 review=null brownfield 兜底
- type: consistency
- priority: P1
- status: accepted
- source: design-grill CC-10
- question: §5 quick ownFiles=review.changedFiles 在 review=null 时如何？
- answer: complete-handlers.js:576 `let review = null`，仅 `if(guard)` 内赋值。brownfield 无 guard 时 review=null → `review.changedFiles` 抛 TypeError。design §5 只给 execute「取不到则空」兜底，quick 缺。
- normalized_requirement: quick 钩子钉死在 `:588` 之后、`if(guard)` 块内（review 必非 null）；或显式 `ownFiles = review?.changedFiles ?? []` 兜底。
- impacts: [design §5, plan task-03]

## P2（plan 应纳入实现细节，不阻断）

### D-004@v1: detectConcurrentChanges 强制 safeGit trim:false
- type: feasibility
- priority: P2
- status: accepted
- source: design-grill CC-11
- normalized_requirement: detectConcurrentChanges 内调 safeGit 必传 `{ trim: false }`（shared.js:448 注释：porcelain 首行前导空格是状态码一部分，trim 削掉致 parsePorcelainPath 丢首字符）。测试覆盖首行 `??` 未跟踪文件。
- impacts: [plan task-01, test]

### D-005@v1: 「活跃变更目录」术语澄清
- type: definition
- priority: P2
- status: accepted
- source: design-grill CC-08
- normalized_requirement: design/warn 文案的「活跃变更目录」易与 DB active changes（progress.listChanges）混淆；实际口径=「git status 里脏的 change 目录」。warn 文案显式注「git-dirty」或改名「脏变更目录」。

### D-006@v1: 措辞「写操作前预检」vs 实际「完成时报告」
- type: consistency
- priority: P2
- status: accepted
- source: design-grill CC-12
- normalized_requirement: 钩子实际落在 step 已完成、产物已落盘之后（gates.js:495-496 docstring），非「写前」。价值=下次写前 agent 可见 warn。验收文案改「完成时报告」或注明时机。

### D-007@v1: verify/archive --done 排除理由
- type: boundary
- priority: P2
- status: accepted
- source: design-grill CC-13
- normalized_requirement: 本变更 scope = quick+execute --done（用户决策① + 债单原文）。verify/archive --done 虽也写产物，但 verify 产物校验本身 fail-closed、archive 是移目录低频操作，留 fast-follow，不在本变更扩 scope。

### D-008@v1: changes/ 路径解析抽共享 helper
- type: consistency
- priority: P2
- status: deferred（v1 内联本地副本 + 注释指向，避免碰 shared.js 保 design §6 准确）
- source: design-grill CC-02
- normalized_requirement: v1 在 concurrent-detect.js 内联本地 `extractChangeDir(path)`（3 行 regex，与 isQuickMetadata 的 `^\.sillyspec\/changes\/([^/]+)(\/|$)` 同语义）+ 注释标明「与 isQuickMetadata 同源，改其一改其二」。v2 再抽 shared.js 共享 helper（届时同步 design §6 + docHash）。drift 风险=低（regex 简单 + 注释锚定）。
- impacts: [plan task-01]

## 裁决
无 P0，specVerdict=pass / qualityVerdict=pass。D-001/002/003（P1）+ D-004~008（P2）全部 status=accepted（方案已定，待 plan/execute 落实），不属于未决项，不触发「回 Grill」路径。otherActiveChanges 信号不受 ownFiles 问题影响、始终可靠，feature 核心价值成立。
