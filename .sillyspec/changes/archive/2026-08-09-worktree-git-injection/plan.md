---
author: qinyi
created_at: 2026-08-09T11:08:44+08:00
plan_level: full
---

# 实现计划（Plan）— 统一 git 调用入口

依据 design.md（统一入口决策 B + 改动面精确界定）与 requirements.md（FR-01~FR-08）。

## Wave 1（公共入口 + worktree 链收口，task 间顺序但同 wave）

- [x] task-01: 新建 src/git-helper.js（safeGit 移入作单一实现 + 新增 git/gitQuiet，数组形式）+ src/run/shared.js safeGit 改 re-export（覆盖：FR-01, FR-02）
- [x] task-02: src/worktree.js 删本地 git/gitQuiet 改 import 公共入口，51 处 helper 调用点 + :63/:775/:1346 等含变量注入点改传数组（覆盖：FR-03, FR-06）
- [x] task-03: src/worktree-apply.js 删本地 git/gitQuiet 改 import 公共入口，26 处 helper 调用点 + :357/:369-372 裸 execSync 注入核心改传数组（覆盖：FR-04, FR-06）
- [x] task-04: src/index.js:859 worktree diff --base 改数组调用（覆盖：FR-05, FR-06）

## Wave 2（依赖 Wave 1，测试 + 验证）

- [x] task-05: 新增 test/git-helper-injection.test.mjs（空格不拆词 / $(touch) 副作用锚点证明不经 shell / 三语义回归 / grep 反向断言无 execSync(\`git 模板串）（覆盖：FR-07）
- [x] task-06: 全量 npm test（worktree/db 相关回归）+ npm run lint 全绿，grep 反向断言无残留字符串拼接 git（覆盖：FR-08）

## 任务总表

| 编号 | 任务 | Wave | 优先级 | 依赖 | 覆盖 FR | 说明 |
|---|---|---|---|---|---|---|
| task-01 | 公共入口 src/git-helper.js + safeGit re-export | W1 | P0 | — | FR-01, FR-02 | 单一真相源，run/ 层调用方行为不变 |
| task-02 | worktree.js 收口 + 51 调用点 + 含变量注入点数组化 | W1 | P0 | task-01 | FR-03, FR-06 | :63/:775/:1346 等按带变量点处理 |
| task-03 | worktree-apply.js 收口 + 26 调用点 + 裸 execSync 注入核心数组化 | W1 | P0 | task-01 | FR-04, FR-06 | :357/:369-372 files.join(' ') 产物是注入核心 |
| task-04 | index.js:859 --base 改数组 | W1 | P0 | task-01 | FR-05, FR-06 | 用户/agent 输入不再插值进 shell（与 task-02/03 注入点同质） |
| task-05 | 注入 + 空格回归测试 | W2 | P0 | task-02,03,04 | FR-07 | $(touch) 副作用锚点证明不经 shell |
| task-06 | 全量测试 + lint + 反向断言 | W2 | P0 | task-05 | FR-08 | 验收门禁 |

## 关键路径

task-01 → task-02 / task-03 → task-05 → task-06（task-01 是其余一切的依赖；task-02/03 可并行）

## 全局验收标准

- [x] grep 反向断言：src/ 全仓不再存在 `` execSync(`git `` 模板串与 `` `git ${`` 插值（白名单：无变量固定子命令）
- [x] 含 `$(touch <tmp>)` 文件名经数组调用后 `<tmp>` 副作用文件不存在（证明不经 shell）
- [x] 含空格文件名 apply 不漏文件（独立 argv 元素不拆词）
- [x] worktree-native-overlay / worktree-apply-incidental / db-concurrency 等 worktree 相关测试回归全绿
- [x] npm run lint 全绿；npm test 全绿

## 覆盖矩阵（FR → task）

| FR | 覆盖任务 | 验收证据 |
|---|---|---|
| FR-01 | task-01 | git-helper.js 存在、数组形式 |
| FR-02 | task-01 | run/ 层 safeGit 调用方行为不变 |
| FR-03 | task-02 | worktree.js 无本地 helper、无 execSync(\`git |
| FR-04 | task-03 | worktree-apply.js 无本地 helper、无 execSync(\`git |
| FR-05 | task-04 | index.js:859 数组调用 |
| FR-06 | task-02,03,04 | grep 反向断言无字符串拼接 git |
| FR-07 | task-05 | $(touch) 副作用不存在、空格不拆词 |
| FR-08 | task-06 | npm test + lint 全绿 |
