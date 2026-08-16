---
author: qinyi
created_at: 2026-08-16 15:41:20
---

# Decisions — 状态机 fail-open 组修复

## D-001@v1 — 方案选型：统一辅助阶段语义（方案 B）

- **type**: architecture
- **status**: decided
- **source**: brainstorm step4 方案对比（方案A 分点最小修复 / 方案B 统一辅助阶段语义 / 方案C fail-closed 全面收紧）
- **question**: 4 项 fail-open 缺陷如何组织修复？
- **answer**: 选方案 B——constants 定义 read-only/working 辅助分类；auxiliary 统一不写 currentStage；read-only 不 initChange；--done 统一查 checkTransition；A5 exitCode 直接修。
- **normalized_requirement**: 同一变更内统一 auxiliary 语义并补 --done 守卫，治类不治实例。
- **impacts**: src/constants.js、src/run/{stage,command,gates}.js；否决方案 A（只治实例）、方案 C（多重硬门破坏工作流）。
- **evidence**: 审计锚点 B6/B7/B8 同属 fail-open 类；方案 A 不治「auxiliary 写 currentStage」这类类缺陷。
- **priority**: P1

## D-002@v1 — gate 失败退出码用 process.exitCode=1，落点 rollbackCompletionAndReturn

- **type**: implementation
- **status**: superseded（被 D-002@v2 取代——Grill 发现 scan 非平台 failed_post_check 直返路径漏设，v2 改消费侧统一设码）
- **source**: A5 锚点（complete.js:328-329 gate 早退 return 不设 exit code）
- **question**: --done 产物 gate 失败后进程退出码如何设置？
- **answer**: 在 `rollbackCompletionAndReturn`（gates.js:242-248，gate 失败唯一出口）设 `process.exitCode = 1`；用 exitCode 非 `process.exit(1)`，让回滚落盘跑完自然退出。
- **normalized_requirement**: 所有 gate 失败回滚路径 exit code = 1，对齐 quick 审计 blocked→exit 1（complete-handlers.js:803）。
- **impacts**: src/run/gates.js；不改 machine-interface（A4 另批）。
- **evidence**: rollbackCompletionAndReturn 全仓 10+ 调用点均为 gate 失败分支；quick 审计 blocked→exit 1 为同仓惯例。
- **priority**: P1

## D-003@v1 — auxiliary 不写 currentStage（选「不写」非「写了还原」）

- **type**: semantics
- **status**: decided
- **source**: B6 锚点（stage.js:128-133 所有阶段写 currentStage）
- **question**: auxiliary 阶段执行后 currentStage 怎么处理？
- **answer**: 仅非 auxiliary 阶段写 currentStage；auxiliary 执行后 currentStage 保持原值。否决「写前备份写后还原」（并发下 last-writer-wins 恢复错误）。
- **normalized_requirement**: currentStage 语义收窄为「主流程当前阶段」，auxiliary 不参与。
- **impacts**: src/run/stage.js:128-133；gates.js:730 auxiliary 重置分支幂等保留。
- **evidence**: AUXILIARY_STAGES = [scan, quick, explore, archive, status, doctor]；status/doctor 为查询型不应改状态。
- **priority**: P1

## D-004@v1 — --done 补 checkTransition，与 runStage 同源，--skip-approval 可绕过

- **type**: semantics
- **status**: decided
- **source**: B6 锚点（command.js:903-906 --done 直接 completeStep 不查转换守卫）
- **question**: --done 完成阶段是否需校验阶段转换合法性？
- **answer**: 需要。--done 分支调用 completeStep 前补 `checkTransition(progress.currentStage || '', stageName)`，与 runStage（stage.js:36）同源；不合法 exit 1，--skip-approval 可绕过（对齐 runStage 行为）。
- **normalized_requirement**: --done 与 run 共享同一转换守卫；未合法到达的阶段不可被 --done 静默推进。
- **impacts**: src/run/command.js；依赖 D-003（currentStage 不被 auxiliary 污染后守卫才有意义）。
- **evidence**: 审计实测「brainstorm 仓 run verify --done 无拦截」；checkTransition 对 auxiliary toStage 一律放行不影响辅助 --done。
- **priority**: P1

## D-005@v1 — status/doctor 查询只读，写操作靠显式 flag

- **type**: semantics
- **status**: superseded（被 D-005@v2 取代——Grill 发现 v1 只覆盖 !progress 分支，v2 把只读短路置顶到 registerChange/ensureStageSteps 之前）
- **source**: B7/8b 锚点（command.js:687-712 auxiliary fallback initChange 建 default 行）
- **question**: status/doctor 何时允许写 progress？
- **answer**: 无显式写 flag（doctor 的 --fix/--cleanup-remnant --confirm）时零副作用：不 initChange、不建 default 行、不写 currentStage、不刷新 lastActive；目标 progress 不存在则打印「未找到进度（只读查询不建变更）」exit 0。
- **normalized_requirement**: READONLY_AUXILIARY_STAGES = [status, doctor]；查询模式零写。
- **impacts**: src/constants.js、src/run/command.js；新项目首跑 status 不再建 changes/default/（治 8b）。
- **evidence**: SKILL「status 只读」声明 vs 实际写库矛盾（审计 B7）；多 agent 并发 lastActive 互相覆盖。
- **priority**: P1

## D-006@v1 — brainstorm auto-create 仅限 0 活跃变更仓

- **type**: behavior
- **status**: decided
- **source**: B8 锚点（command.js:717-731 无条件 initChange）
- **question**: run brainstorm 无 --change 时能否 auto-create 变更？
- **answer**: 仅当无已存在活跃变更时允许 auto-create new-change-&lt;hex&gt;（新项目便利）；多活跃变更仓 → `process.exit(2)` + 引导「--change &lt;名&gt; 指定变更 / 或 change-rename」。
- **normalized_requirement**: 多活跃变更仓强制 --change，消除幽灵变更。
- **impacts**: src/run/command.js；0 活跃变更新项目路径不变。
- **evidence**: DB 实锤 08-15 一小时 4 个 *-new-change-* 活跃行；审计代理自身触发一次。
- **priority**: P1

## D-002@v2 — gate 失败退出码设于消费侧 stageCompleted===false（supersedes: D-002@v1）

- **type**: implementation
- **status**: decided
- **source**: Design Grill step7 发现——scan 非平台 failed_post_check 直返（complete-handlers.js:1228 `{stageCompleted:false}`）不经 rollbackCompletionAndReturn，D-002@v1 落点漏设
- **question**: --done 产物 gate 失败后进程退出码如何设置才覆盖全部路径？
- **answer**: 改在 completeStageGates 的 3 处消费点（complete.js:328 completeStep / complete.js:810 continueStep / stage.js:377 noAI），返回对象 `stageCompleted === false` 时设 `process.exitCode = 1`。统一覆盖 rollbackCompletionAndReturn 回滚（9 处调用点）+ scan 非平台 failed_post_check 直返两条路径。
- **normalized_requirement**: 所有 --done gate 失败（含 scan post-check 非平台）exit code = 1，对齐 quick 审计 blocked→exit 1。
- **impacts**: src/run/complete.js + src/run/stage.js（消费侧）；不改 gates.js 的 rollbackCompletionAndReturn。
- **evidence**: complete-handlers.js:1213-1228 非平台 failed_post_check 直返 stageCompleted:false 不经 rollback；completeStageGates 消费点 grep 仅 3 处。
- **priority**: P1

## D-005@v2 — status/doctor 查询只读短路置顶（supersedes: D-005@v1）

- **type**: semantics
- **status**: decided
- **source**: Design Grill step7 发现——D-005@v1 只覆盖 !progress 分支，已有 progress 的 status/doctor 仍经 registerChange（command.js:765）/ensureStageSteps（command.js:871-876）写 steps/status + autoDetectChange 刷 lastActive
- **question**: status/doctor 查询的零副作用如何保证？
- **answer**: 只读短路置顶在 runCommand 的 registerChange/ensureStageSteps 之前：READONLY_AUXILIARY_STAGES 且无显式写 flag（progress doctor 写操作 = --cleanup-remnant/--align-execute-progress 配 --confirm）时，progress 不存在 → 打印提示 exit 0 不建 default；存在 → 只读展示不 seed steps 不刷 lastActive。
- **normalized_requirement**: READONLY_AUXILIARY_STAGES = [status, doctor]；查询模式零副作用（不 initChange、不建 default 行、不写 currentStage、不 seed steps、不刷新 lastActive）。
- **impacts**: src/constants.js、src/run/command.js（短路点前置）；治 8b + 多 agent 并发 lastActive 互相覆盖。
- **evidence**: command.js:765 registerChange / :871-876 ensureStageSteps 对已有 progress 的 auxiliary 仍写库；SKILL「status 只读」声明 vs 实际矛盾。
- **priority**: P1
