---
plan_level: full
author: qinyi
created_at: 2026-06-28T17:08:42
---

# 实现计划：Worktree 依赖供给 + 验证硬门

> 任务编号与 tasks/task-NN.md 一致（按 Wave 顺序）。

## Wave 1（并行，基础 + 硬门，无依赖）

- [x] task-01: 依赖供给引擎 provisionDeps + lockfileHash（覆盖：FR-01, FR-02, FR-03, FR-05, D-005@v1, D-007@v1）
- [x] task-02: completeStep execute 验证硬门 + isCurrentWaveAllNoDepsVerify（覆盖：FR-04, FR-05, FR-06, D-001@v1, D-003@v1, D-006@v2）
- [x] task-03: local.yaml commands.install/typecheck + scan-postcheck 适配（覆盖：FR-02, D-004@v1）
- [x] task-04: 文档同步（CLAUDE.md 要求）（覆盖：D-002@v1 文档化）

## Wave 2（依赖 Wave 1）

- [x] task-05: create() 集成 provisionDeps + meta 字段合并（覆盖：FR-01, D-005@v1）
- [x] task-06: execute 入口自检 missing/stale/缺字段重供给（覆盖：FR-07, D-002@v1）
- [x] task-07: worktree doctor deps 三类检查 + --fix 重供给（覆盖：FR-08, D-001@v1）

## Wave 3（依赖 Wave 1 + Wave 2）

- [x] task-08: 测试 worktree-deps-provision（覆盖：FR-01~FR-08, D-001@v1~D-007@v1）

## 任务总表

| 编号 | 任务 | Wave | 优先级 | 依赖 | 覆盖 FR/D | 说明 |
|---|---|---|---|---|---|---|
| task-01 | 依赖供给引擎 provisionDeps + lockfileHash | W1 | P0 | — | FR-01/02/03/05, D-005@v1, D-007@v1 | 新增 src/worktree-deps.js，junction 快路径 + install 兜底 + 多语言推断；generic→n/a |
| task-02 | completeStep execute 验证硬门 | W1 | P0 | — | FR-04/05/06, D-001@v1, D-003@v1, D-006@v2 | run.js completeStep execute 分支，blocked + exit(1)；n/a 放行 + wave 级 opt-out |
| task-03 | local.yaml + scan-postcheck 适配 | W1 | P1 | — | FR-02, D-004@v1 | local.yaml schema + scan-postcheck 仅校验 test/lint/build（X-3） |
| task-04 | 文档同步 | W1 | P1 | — | D-002@v1 | worktree.md 修脱节、_module-map 注册、file-lifecycle 同步 |
| task-05 | create() 集成 provisionDeps | W2 | P0 | task-01 | FR-01, D-005@v1 | worktree.js create() baseline overlay 后调 provisionDeps，结果合并 meta |
| task-06 | execute 入口自检 | W2 | P0 | task-01 | FR-07, D-002@v1 | run.js runStage execute 分支，stale/missing/缺字段触发重供给 |
| task-07 | worktree doctor deps 检查 | W2 | P1 | task-01 | FR-08, D-001@v1 | worktree.js doctor() + index.js 输出，deps-missing/stale/failed |
| task-08 | 测试 | W3 | P0 | task-01~07 | FR-01~08, D-001~007 | 新增 test/worktree-deps-provision.test.mjs |

## 关键路径

task-01 → task-05 → task-08（最长路径：引擎 → 创建集成 → 集成测试，决定交付周期）

并行优化：task-02（硬门）、task-03（配置）、task-04（文档）与 task-01 在 Wave 1 并行；task-06/07 在 Wave 2 与 task-05 并行。硬门（task-02）作为止血点独立成立，即使 task-01/05 未完成，门也会安全阻断（depsStatus 缺失即 block）。

## 全局验收标准

（下列为验收条目，非任务）

- 新建 worktree（主 checkout 有 node_modules 且 lockfile 一致）→ junction、depsStatus=linked、tsc 可跑
- lockfile 不一致 → install、depsStatus=installed
- install 失败/超时 → depsStatus=failed、execute --done 被门拒绝、step=blocked、worktree 不删
- generic/无 install 项目 → depsStatus=n/a、门跳过
- wave 内全部 task no_deps_verify:true → 该 wave 门跳过
- 旧 worktree resume → 入口自检触发供给补全
- sillyspec worktree doctor 检出 deps-missing/stale/failed；--fix 重供给成功
- 既有项目（无 commands.install）行为等价于改造前
- npm test（28 既有测试）全绿 + 新增 worktree-deps 测试通过
- （brownfield）未配置新功能时行为不变

## 覆盖矩阵（decisions.md）

| ID | 覆盖任务 | 验收证据 |
|---|---|---|
| D-001@v1 | task-02, task-07, task-08 | AC: 门复用 blocked status；doctor 报 deps 状态 |
| D-002@v1 | task-04, task-06, task-08 | AC: 入口自检补供给；meta 字段文档化 |
| D-003@v1 | task-02, task-08 | AC: 门仅 execute |
| D-004@v1 | task-03, task-08 | AC: monorepo 根安装；scan-postcheck 不误校验 install |
| D-005@v1 | task-01, task-05, task-08 | AC: 方案 A 创建时供给 |
| D-006@v2 | task-02, task-08 | AC: wave 级 opt-out（supersedes v1） |
| D-007@v1 | task-01, task-08 | AC: junction 快路径 + install 兜底 |
