---
author: qinyi
created_at: 2026-06-28T15:57:22
---

# Decisions: 2026-06-28-worktree-deps-provision

> 本次变更的决策台账。每条有稳定版本 ID，被 design.md §11 引用。

## D-001@v1: 复用现有 `blocked` step status，不新增状态机
- type: architecture
- status: accepted
- source: code
- question: deps 门阻断 task 时用什么状态/机制？是否新增 step status？
- answer: 不新增。`progress.js:41` 的 `VALID_STATUSES` 已含 `blocked`，`run.js:406/458` 已有 `result.status='blocked'` 范式。deps 门复用它：标 step `blocked` + `process.exit(1)` 拒绝 `--done`。
- normalized_requirement: completeStep execute 分支在标记 done 前，若 `meta.depsStatus` 不达标且 task 非 `no_deps_verify`，将 step 置 `blocked` 并 exit(1)。
- impacts: [Phase 3 硬门, FR-gate]
- evidence: `src/progress.js:41`、`src/run.js:406`、`src/run.js:458`
- priority: P0
- note: 避免与 `2026-06-09-waiting-state-machine` 变更的状态机改动冲突。

## D-002@v1: meta 向后兼容——缺 depsStatus 时入口触发供给
- type: compatibility
- status: accepted
- source: code
- question: 现有 worktree（meta 无 depsStatus 字段）如何处理？`create()` 对已存在 worktree short-circuit 不会供给。
- answer: 在 execute **入口**加自检——meta 缺 `depsStatus` / `node_modules` 被清 / lockfile hash 变化 → 当场触发 `provisionDeps` 补全/重供给，再交门判定。
- normalized_requirement: execute 入口对当前 change worktree 校验 `(node_modules 存在) AND (lockfileHash==meta.depsLockHash) AND (depsStatus 已知)`，任一不符触发重供给。
- impacts: [Phase 4 入口自检, FR-selfcheck]
- evidence: `src/worktree.js:208`（已存在 worktree short-circuit）
- priority: P0

## D-003@v1: 门仅作用于 execute
- type: boundary
- status: accepted
- source: code
- question: verify 阶段是否也走 deps 门？
- answer: 否。`WORKTREE_STAGES=['execute']`（`worktree-guard.js:17`），verify 在主工作区跑（已有 node_modules），不受影响。门仅植入 execute 的 `completeStep` + execute 入口。
- normalized_requirement: deps 门仅在 execute 阶段生效；verify/其它阶段不引入。
- impacts: [Phase 3 门作用域]
- evidence: `src/hooks/worktree-guard.js:17`
- priority: P1

## D-004@v1: monorepo 在 worktree 根安装
- type: boundary
- status: accepted
- source: design
- question: monorepo（daemon 是 workspace 子包）在哪装依赖？
- answer: 在 worktree **根目录**执行 install/junction。pnpm/npm workspaces 自身处理子包链接与 hoisting，工具层不做拓扑编排。
- normalized_requirement: `provisionDeps` 在 `worktreePath` 根执行，不针对单个子包。
- impacts: [Phase 1 供给]
- evidence: pnpm/npm workspaces 通用约定
- priority: P1

## D-005@v1: 方案 A——创建时供给 + completeStep 硬门
- type: architecture
- status: accepted
- source: user
- question: 供给时机与门位置（对比方案 A 创建时供给+completeStep门 / B 惰性供给+postcheck门 / C 分离provision命令+completeStep门）。
- answer: 方案 A。供给挂 `worktree.create()` 的 baseline overlay 后（atomic、立即可用）；门在 `run.js completeStep` execute 分支（与 requiresWait/scan-postcheck 同范式，覆盖所有 --done 路径）。
- normalized_requirement: `provisionDeps` 由 `create()` 调用；门由 `completeStep` 执行。
- impacts: [§5 Phase 1, Phase 3]
- evidence: 用户在 brainstorm step 8 选定方案 A
- priority: P0
- note: 否决 B（惰性让首次 execute 慢、违背立即可用）、C（provision 子命令 YAGNI，doctor --fix 已可重跑）。

## D-006@v1: 全量门 + `no_deps_verify` opt-out
- type: boundary
- status: superseded（见 D-006@v2，粒度修正）
- source: user
- question: 门作用域（Q1）+ 纯文档 task 跳门机制（Q2）。
- answer: Q1=A 全量门——所有 execute task 无 deps 一律 block；但无 install 命令/generic 项目自动判 `depsStatus='n/a'` 门跳过。Q2=A task 级 flag——task-NN.md frontmatter `no_deps_verify: true` 跳门。
- normalized_requirement: 门放行 `{linked, installed, n/a}`；task card `no_deps_verify===true` 时门整体跳过该 task。
- impacts: [Phase 3 门逻辑, execute.js frontmatter 读取]
- evidence: 用户在 brainstorm step 6 选定 Q1=A, Q2=A
- priority: P0
- note: 否决优先级门（P2 放行不安全，P2 代码 task 同样需要类型检查）；否决 local.yaml 路径豁免（路径白名单易误判，不如 task 级精确）。

## D-006@v2: opt-out 粒度=wave 级（Design Grill X-1 修正）
- type: boundary
- status: accepted
- supersedes: D-006@v1
- source: design-grill
- question: execute 步骤按 Wave 生成（execute.js:592 `buildExecuteSteps`），门在 completeStep 是 per-wave 触发；但 `no_deps_verify` 是 task-NN.md 的 per-task frontmatter。一个 wave 含多 task，opt-out 粒度不匹配怎么办？
- answer: opt-out 升为 **wave 级**——仅当当前 wave 内**所有** task 都声明 `no_deps_verify: true` 时，该 wave 的门才跳过。非 wave 步骤（`确认执行范围` 前缀/acceptance/suffix）门恒触发（前缀 fail-fast、acceptance 无 per-task opt-out）。
- normalized_requirement: completeStep 解析当前 step 的 wave 序号 → 读 plan.md 该 wave 的 task 列表 → 读各 task-NN.md frontmatter，全部 `no_deps_verify===true` 才 `waveAllOptOut=true`。
- impacts: [Phase 3 门逻辑, 新增 isCurrentWaveAllNoDepsVerify 辅助函数]
- evidence: `src/stages/execute.js:592`（buildExecuteSteps 按 wave 生成步骤）、execute 已有 allowed_paths frontmatter 解析先例
- priority: P1

## D-007@v1: junction 快路径 + install 兜底
- type: architecture
- status: accepted
- source: design
- question: 依赖供给用 junction/symlink 还是每次 install？
- answer: 快路径优先——`mainCwd/node_modules` 存在且 `lockfileHash(main)==lockfileHash(worktree)` 时 junction（Win `mklink /J`）/symlink（POSIX），瞬时零网络；否则执行 install。junction 失败（跨盘符/权限）回退 install。
- normalized_requirement: `provisionDeps` 先判 lockfile 一致性走 link，否则 install；`depsMethod` 记录 `junction|symlink|install`。
- impacts: [Phase 1 供给]
- evidence: tsc 只读类型定义不执行 native，junction 安全；lockfile 一致率高（worktree 刚 ff-merge 自同 base）
- priority: P1
