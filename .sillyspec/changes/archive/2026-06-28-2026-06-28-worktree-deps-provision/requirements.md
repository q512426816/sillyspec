---
author: qinyi
created_at: 2026-06-28 16:43:58
---

# Requirements: 2026-06-28-worktree-deps-provision

## 角色

| 角色 | 说明 |
|---|---|
| WorktreeManager | worktree 生命周期管理，创建时触发依赖供给 |
| provisionDeps | 供给引擎，判定并执行 junction/install，写入 depsStatus |
| completeStep 门 | execute 阶段 --done 前的验证硬门，读 depsStatus 决定放行/阻断 |
| execute 入口自检 | 进入 execute 时校验 deps 新鲜度，必要时重供给 |
| worktree doctor | 健康检查，发现 deps-missing/stale/failed 并可 --fix 重供给 |
| agent | 在 worktree 内执行 task 的执行者，受门约束不得在无 deps 时声称完成 |

## 功能需求

### FR-01: worktree 创建后自动供给依赖
覆盖决策：D-005, D-007
Given 主 checkout 存在且 `worktree.create()` 完成 baseline overlay
When create 进入 meta.json 写入前
Then 调用 `provisionDeps` 供给依赖，结果（depsStatus/depsMethod/depsSource/depsLockHash/depsCheckedAt/depsError?）合并进 meta
And 供给失败（junction/install）不抛错、不阻断 create，仅记 `depsStatus=failed` + depsError

### FR-02: 多语言 install 命令推断
覆盖决策：D-004
Given local.yaml 无 `commands.install`
When provisionDeps 解析项目类型
Then 按 `project.type` + lockfile 推断：nodejs+pnpm-lock→`pnpm install --frozen-lockfile`；nodejs+package-lock→`npm ci`；nodejs+yarn.lock→`yarn install --frozen-lockfile`；nodejs 无 lockfile→`npm install`（非 frozen）；maven→`mvn -o test`；gradle→`./gradlew test`；generic→无（n/a）
And `commands.install` 存在时优先使用用户配置

### FR-03: junction 快路径 + install 兜底
覆盖决策：D-007
Given install 命令非空（非 generic/n/a）
When `mainCwd/node_modules` 存在 且 `lockfileHash(main)==lockfileHash(worktree)`
Then 用 junction（Windows `mklink /J`）/ symlink（POSIX）链 `worktree/node_modules → main/node_modules`，`depsStatus='linked'`，`depsMethod='junction'|'symlink'`
When lockfile 不一致 或 main 无 node_modules 或 junction 失败
Then 执行 install 命令（超时 300s），成功 `depsStatus='installed'`，失败 `depsStatus='failed'`+depsError

### FR-04: execute 验证硬门
覆盖决策：D-001, D-003
Given execute 阶段某步骤 `--done`
When completeStep 标记 step done 前，读 `meta.depsStatus`
Then 若 depsStatus ∉ {linked, installed, n/a} 且该步骤非 wave 级 opt-out → step 置 `blocked`，`process.exit(1)` 拒绝 --done，输出修复指引（`sillyspec worktree doctor --fix` 或手动 install）
And 门仅作用于 execute 阶段（verify/其它阶段不引入）

### FR-05: 无依赖项目自动跳门
覆盖决策：D-006@v2
Given project.type=generic 或（无 lockfile 且无 commands.install）
When provisionDeps 判定
Then `depsStatus='n/a'`，execute 门对 n/a 放行

### FR-06: wave 级 no_deps_verify opt-out
覆盖决策：D-006@v2
Given 当前 execute step 是 wave 执行步骤
When completeStep 解析该 wave 内所有 task 的 task-NN.md frontmatter
Then 仅当该 wave **全部** task 声明 `no_deps_verify: true` 时，门对该 wave 跳过
And 非 wave 步骤（确认执行范围前缀/acceptance/suffix）恒过门

### FR-07: execute 入口自检重供给
覆盖决策：D-002
Given 已存在的 worktree（`create()` short-circuit 不供给）
When execute 入口对当前 change 的 worktree 自检
Then 满足任一即触发 `provisionDeps` 重供给并更新 meta：meta 缺 depsStatus / `node_modules` 不存在但 meta 说 linked-installed（missing）/ `lockfileHash(worktree)!=meta.depsLockHash`（stale）
And 重供给后再交 FR-04 门判定

### FR-08: worktree doctor deps 检查 + 重供给
Given `sillyspec worktree doctor`
When 扫描 worktree meta 与文件系统
Then 检出并报告三类：deps-missing（meta linked/installed 但 node_modules 不在）、deps-stale（lockfile hash 变化）、deps-failed（上次 failed）
And `--fix` 对上述三类调 `provisionDeps` 重供给

## 非功能需求

- **兼容性**：既有项目无 `commands.install` 走推断，generic 自动 n/a，与改造前等价；旧 worktree 由 FR-07 入口自检兜底，不破坏现有流程。
- **可回退**：junction 失败 → install；install 超时/失败 → failed + 门阻断（不删 worktree，doctor 可重试）；不改 DB schema（deps 态在 meta.json）。
- **可测试**：每个 FR 有独立 GWT；新增 `test/worktree-deps-provision.test.mjs` 覆盖快路径/兜底/门拒绝/opt-out/generic/resume/doctor。
- **平台无关**：depsStatus 枚举不含平台词，depsMethod 记录 junction/symlink 具体机制。
- **不撞并行变更**：复用已有 `blocked` status（不新增状态机，避开 waiting-state-machine 变更）。

## 决策覆盖矩阵

| 决策 ID | 覆盖的 FR | 说明 |
|---|---|---|
| D-001@v1 | FR-04 | 复用 blocked status，门阻断 |
| D-002@v1 | FR-07 | 旧 worktree 入口自检补供给 |
| D-003@v1 | FR-04 | 门仅 execute |
| D-004@v1 | FR-02 | monorepo 在 worktree 根安装 |
| D-005@v1 | FR-01 | 方案 A：创建时供给 |
| D-006@v2 | FR-05, FR-06 | 全量门 + wave 级 opt-out（supersedes v1） |
| D-007@v1 | FR-03 | junction 快路径 + install 兜底 |
