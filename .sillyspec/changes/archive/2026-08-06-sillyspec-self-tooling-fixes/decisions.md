---
author: qinyi
created_at: 2026-08-06T09:08:11
---

# 决策台账 — 2026-08-06-sillyspec-self-tooling-fixes

本变更的决策台账（非长期术语表）。每条有稳定版本 ID，Design Grill 修正则升 vN + supersedes。

## D-01@v1
- **type**: approach（修复点选择）
- **status**: accepted
- **source**: brainstorm step4 方案对比 + AskUserQuestion 用户选「全改代码确定性修复」
- **question**: 坑1（execute 批量完成 marker 缺失）在何处兜底自动生成 stage review marker？
- **answer**: 在 `src/run/gates.js:276` stage review gate 分支，`tier=independent` 且 marker 缺失时 `generateStageReviewRunId()` + 写 marker + mkdir。
- **normalized_requirement**: FR-01（marker 自动落盘，gate 错误路径从 execute-null 变 execute-review-<id>）
- **impacts**: src/run/gates.js（+import generateStageReviewRunId/stageReviewMarkerPath）；test/stage-review-marker-auto.test.mjs
- **evidence**: 根因 `src/run/complete.js:540-568` detectExecuteBatchFinish 批量推进跳过 prompt 渲染；marker 写入点在 `src/run/prompt.js` 渲染 {REVIEW_TIER}；gate 读 marker `gates.js:276` getLatestStageReviewRunId 无 fallback；复用 `stage-review.js:233,250` 已 export 函数。否决 detectExecuteBatchFinish 内预生成（不感知 tier，增耦合）+ 不批量完成 acceptance（破坏设计）。
- **priority**: P0

## D-02@v1
- **type**: approach（遵已有决策 + 错误可执行化）
- **status**: accepted（Grill B-002 修正：从 hint 字段改为 stage-contract.js 早期 warning）
- **source**: brainstorm step5 查最新源码发现 `6417a27` 已否决 body 扫描；AskUserQuestion 用户选「错误可执行化引导」；step7 Grill B-002 发现 hint 字段冗余
- **question**: 坑2（detectChangeRisk 否定语境误判）剩余痛点（agent 不知加 frontmatter）怎么修？
- **answer**: 在 `src/stage-contract.js:448` 附近（detectChangeRisk 调用后、evidence gate 前），`level ∈ {integration,deployment}-critical && !explicit` 时 `warnings.push` 一条**无条件** frontmatter 覆盖指引（不依赖 conclusion/evidence）。走既有 warnings 数组，无需新渲染点。不改 detectChangeRisk 返回值、不改判级逻辑、不改 frontmatter 优先级。
- **normalized_requirement**: FR-02（错误可执行化引导，遵 6417a27）
- **impacts**: src/stage-contract.js（:448 附近 +5 行）；test/stage-contract.test.mjs（断言 warning 出现）
- **evidence**: `6417a27`（2026-07-28）注释明写"与其在正则层做脆弱的否定识别，不如给显式可审计覆盖通道"——body 扫描被项目否决。**Grill B-002**：detectChangeRisk 唯一生产调用点 stage-contract.js:443 的返回值已被 evidence gate（:448-487）消费，原方案"加 hint 字段"无新渲染点=死字段；现有 :481"出路③"已有 frontmatter 覆盖指引但触发条件 `requiresEvidence && !evidenceCheck.ok`（仅 PASS/PASS WITH NOTES 缺证据），FAIL 或早期不透出。改为早期 warning 补全覆盖。memory 坑 [[sillyspec-improvement-check-debt-doc]] + [[sillyspec-verify-risk-level-override]]。否决 body 扫描（违逆 6417a27）+ hint 字段（Grill B-002 死字段）+ prompt 提示（软约束）。
- **priority**: P1

## D-03@v1
- **type**: approach（filter 策略）
- **status**: accepted
- **source**: brainstorm step4 方案对比 + AskUserQuestion 用户选「全改代码确定性修复」
- **question**: 坑3（worktree apply 排除 .sillyspec/ 漏模块文档）filterDeliverableFiles 怎么精细化？
- **answer**: 保留 `.sillyspec/docs/`（交付物），仅排 `.sillyspec/changes/` + `.sillyspec/.runtime/` + `.sillyspec/quicklog/`（worktree 专属/运行时）+ `meta.json`。
- **normalized_requirement**: FR-03（模块文档 apply 回主仓，不再手动 git show）
- **impacts**: src/worktree-apply.js（:48-50）；src/verify-postcheck.js（:798-799 内联副本同步，优先 import 去双写，见 D-04/R-04）；src/index.js（:787 注释）；test/worktree-apply-meta-exclude.test.mjs
- **evidence**: 根因 `worktree-apply.js:48-50` 一刀切 `!f.startsWith('.sillyspec/')`；`verify-postcheck.js:797-799` 内联副本；`index.js:787` 注释。否决全保留 .sillyspec/（污染主仓）+ 黑名单只排 changes/（.runtime/quicklog 性质不同）。
- **priority**: P0

## D-04@v1
- **type**: approach（CLI 下沉 vs prompt 驱动）
- **status**: accepted
- **source**: brainstorm step4 方案对比 + AskUserQuestion 用户选「全改代码确定性修复」
- **question**: 坑4（archive git add 漏 archive/ 子目录）怎么确定性暂存？
- **answer**: `src/run/complete-handlers.js:137` archiveChangeDirectory unregisterChange 后 CLI 下沉 `safeGit(cwd, ['add','--','.sillyspec/changes/archive/'])` + `safeGit(cwd, ['add','--','.sillyspec/docs/'])`。step5 prompt git add 保留作幂等兜底。
- **normalized_requirement**: FR-04（archive/ 确定性进 git index）
- **impacts**: src/run/complete-handlers.js（:137 后 +6 行）；test/archive-cli-git-add.test.mjs
- **evidence**: 根因 `complete-handlers.js:95-150` archiveChangeDirectory 不更新 git index；`archive.js:160` step5 prompt git add 驱动不可靠（实测漏 archive/）。safeGit 已 import :26。POSIX 路径跨平台。否决 prompt 文案改（不可靠）。
- **priority**: P0

## D-05@v1
- **type**: scope（架构级延后）
- **status**: deferred（入 ROADMAP）
- **source**: brainstorm step5 评估 + AskUserQuestion 用户选「坑5 入 ROADMAP」
- **question**: 坑5（多代理并行中间态 import 链污染）本 change 修吗？
- **answer**: 不修，入 ROADMAP。架构级（需 worktree-per-task 或 import 沙箱），超出本 change「确定性缺陷局部修复」范围。
- **normalized_requirement**: 非目标（§3）
- **impacts**: .sillyspec/ROADMAP.md（登记条目）
- **evidence**: 本流程 task-06 中间态 plan-postcheck.js SyntaxError 被 task-04/task-08 交叉发现自修。根因多代理并发改 src 无隔离。本 change 4 坑都是 ≤6 文件局部修复，与架构级 import 隔离不同规模。
- **priority**: P2

## D-06@v1
- **type**: approach（显式遵已有决策，防复读）
- **status**: accepted
- **source**: brainstorm step5 发现 `6417a27` 决策
- **question**: 是否需要在文档显式记录"body 扫描被否决"防后续 agent 复读？
- **answer**: 是。design §3 非目标 + §决策 D-06 + 本台账显式记录"`6417a27` 否决 body 扫描，本 change 遵此"。
- **normalized_requirement**: 流程卫生（防改进建议复读）
- **impacts**: design.md §3 / §决策；本台账
- **evidence**: memory 坑 [[sillyspec-improvement-check-debt-doc]]——"改进点先查债单，多数新发现已是 done/defer 决策"。本次坑2 的 body 扫描正是此类（已被 6417a27 否决）。
- **priority**: P2
