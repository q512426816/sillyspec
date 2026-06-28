---
author: qinyi
created_at: 2026-06-04 16:25:42
updated_at: 2026-06-28
---

# Worktree 与 Hook 门禁

## 命令入口

`src/index.js` 暴露：

```text
sillyspec worktree create <change-name> [--base <branch>]
sillyspec worktree apply <change-name> [--check-only]
sillyspec worktree list
sillyspec worktree cleanup <change-name>
```

实现分别调用：

- `WorktreeManager.create()`
- `applyWorktree()`
- `WorktreeManager.list()`
- `WorktreeManager.cleanup()`

## `create`

默认路径：

```text
.sillyspec/.runtime/worktrees/<change-name>/
```

默认分支：

```text
sillyspec/<change-name>
```

关键校验与分支：

1. `changeName` 不能为空，不能包含 `..`、`/`、`\`。
2. 如果当前目录是 git submodule，直接报错。
3. 如果当前目录已经是 linked worktree，创建 `native-worktree` meta，复用当前目录。
4. 普通主工作区必须先确认 `.sillyspec/.runtime/worktrees` 被 `.gitignore` 忽略，否则报错。
5. 如果 worktree 目录存在但没有 `meta.json`，视为幽灵目录并自动删除。
6. 如果目标 branch 已存在，报错。
7. 默认 base 是当前 `HEAD`；传 `--base` 时使用指定 ref。
8. `git worktree add` 失败时：
   - 如果 git 版本低于 2.15 或不可用，报错。
   - 其他失败降级为 `in-place-fallback`，在主工作区记录 meta。
9. 创建普通 worktree 后，会 best-effort `fetch origin` 并尝试 fast-forward 到默认远端分支。
10. 主工作区已有 staged/unstaged/untracked 变更时，会 overlay 到 worktree，并创建 baseline checkpoint commit。
11. **依赖供给**（change `2026-06-28-worktree-deps-provision`）：baseline overlay 后调用 `provisionDeps(worktreePath, mainCwd)`（`src/worktree-deps.js`）——lockfile 一致时 junction/symlink 主 checkout 的 `node_modules`（瞬时零网络），否则按 `local.yaml` 的 `project.type` + lockfile 推断并执行 install。结果写入 meta（`depsStatus` 等字段）。**供给失败不阻断 create**，只记 `depsStatus=failed`，交由 execute 验证硬门阻断。

## `meta.json`

普通 worktree 的 `meta.json` 位于 worktree 目录内：

```text
.sillyspec/.runtime/worktrees/<change>/meta.json
```

`native-worktree` 和 `in-place-fallback` 下，meta 仍写到 `.sillyspec/.runtime/worktrees/<change>/meta.json`，其中 `worktreePath` 可能指向当前工作目录。

主要字段：

| 字段 | 说明 |
|---|---|
| `changeName` | 变更名 |
| `branch` | worktree 分支 |
| `baseBranch` | 基准分支或 ref |
| `baseHash` | 创建时基准 commit |
| `actualBaseHash` | worktree 当前 HEAD |
| `createdAt` | 创建时间 |
| `worktreePath` | 实际执行目录 |
| `mode` | `worktree` / `native-worktree` / `in-place-fallback` |
| `baselineFiles` | 从主工作区 overlay 的未提交文件 |
| `baselineCommit` | baseline checkpoint commit |
| `baselineHash` | execute 前主工作区 dirty baseline hash |
| `depsStatus` | 依赖供给状态：`linked` / `installed` / `n/a` / `failed` / `missing` / `stale`（provisionDeps 写入） |
| `depsMethod` | 供给机制：`junction` / `symlink` / `install` / `null` |
| `depsSource` | 依赖来源：`main-checkout` / `install` / `null` |
| `depsLockHash` | 供给时 lockfile/package.json 的 sha256 前 16 位 |
| `depsCheckedAt` | 上次供给时间（ISO8601） |
| `depsError` | 仅 `depsStatus=failed` 时填，install/junction 失败信息 |

## `apply`

`applyWorktree(changeName, { checkOnly })` 的真实流程：

1. 读取 `meta.json`。
2. diff base 使用 `baselineCommit || baseHash`。
3. 收集 tracked diff 和 untracked 新文件。
4. 从 `.sillyspec/changes/<change>/design.md` 解析“文件变更清单”作为 allow list。
5. 如果 allow list 非空，要求 changed files 都在清单内。
6. 如果 meta 有 `baselineHash`，重新计算主工作区 dirty hash；不同则拒绝 apply。
7. 检查主工作区和 apply 文件有无未提交冲突。
8. 比较主工作区 `HEAD` 与 worktree `baseHash` 的目标文件 blob。
9. `--check-only` 到这里返回。
10. 生成临时 patch。
11. 在主工作区执行 `git apply --check`。
12. 执行 `git apply --3way`。
13. 成功后自动调用 `WorktreeManager.cleanup()`。

无变更时，如果不是 check-only，也会 cleanup。

## `cleanup`

`cleanup(changeName, { force })`：

| mode | 非 force 行为 |
|---|---|
| `worktree` | 尝试 `git worktree remove --force`，删除目录，删除分支，删除 meta 目录 |
| `native-worktree` | 抛错，避免删除用户自己的 worktree |
| `in-place-fallback` | 返回 `skipped` |
| 无 meta 且目录不存在 | 返回 `skipped` |

如果 `git worktree remove` 失败但目录可删，结果是 `force-cleaned`。

## execute 阶段

`execute.js` 的固定前缀第 3 步是“创建 worktree”，prompt 要求运行：

```text
sillyspec worktree create <change-name>
```

后续 Wave prompt 要求把子代理 cwd 设置为 worktree 路径。完成确认 step 根据 mode 分别处理：

- `worktree`：check-only，用户确认后 apply，再 cleanup。
- `native-worktree`：可以 apply，但不要 cleanup。
- `in-place-fallback`：跳过 apply/cleanup。
- 无 worktree：只展示 diff 摘要。

注意：`buildExecuteSteps()` 有 `noWorktree` 参数，但当前 `runCommand()` 没有解析 `--no-worktree` flag，CLI help 也没有列出该 flag。文档不要把 `--no-worktree` 写成已接通的公开流程。

### execute 依赖验证硬门（change `2026-06-28-worktree-deps-provision`）

`run.js completeStep` 在 execute 分支标记 step done **之前**调用 `enforceDepsGate()`：

1. 读 `meta.depsStatus`：∈ `{linked, installed, n/a}` 放行。
2. 否则判断 wave 级 opt-out（`isCurrentWaveAllNoDepsVerify`）：仅当前 wave（如 `Wave 2 执行`）内**全部** task 的 `tasks/task-NN.md` frontmatter `no_deps_verify: true` 才跳门。非 wave 步骤（确认执行范围/acceptance/suffix）恒过门。
3. 不达标 → step 置 `blocked` + `process.exit(1)` 拒绝 `--done`，提示 `sillyspec worktree doctor --fix` 或手动 install。

execute **入口自检**：已存在 worktree（`create()` short-circuit 不供给）时，入口校验 `depsStatus` 缺失 / `node_modules` 丢失（missing）/ `lockfileHash` 变化（stale）→ 触发 `provisionDeps` 重供给并更新 meta，再交门判定。

## quick 阶段

quick 当前不创建 worktree。

`quick.js` 第 2 步明确写的是“直接在主工作区实现任务”。`worktree-guard.js` 在 stage 为 `quick` 时，对 Write/Edit/MultiEdit 直接放行；Bash 仅拦截危险命令。quick 作为辅助阶段完成后，`run.js` 会重置 quick 步骤并清空 `currentStage`，从而删除 gate 状态。

因此旧文档中“quick 创建 worktree/meta.json”的描述不符合当前代码。

## Hook 门禁

入口：`src/hooks/claude-pre-tool-use.cjs`

输入：Claude Code PreToolUse hook 的 JSON。它只映射这些工具：

- `Write`
- `Edit`
- `MultiEdit`
- `Bash`

实际判断：`src/hooks/worktree-guard.js`

### 文件白名单

以下写入直接放行：

- 路径中包含 `.sillyspec`，但 `.sillyspec/.runtime/worktrees/` 例外
- 路径中包含 `.git`
- 扩展名为 `.md`
- 文件名为 `package.json`、`tsconfig.json`、`local.yaml`、`local.yml`

`.sillyspec/.runtime/worktrees/` 下的写入不会仅因路径包含 `.sillyspec` 而放行；它必须命中当前 gate 中 active change 对应的 `meta.json.worktreePath`。

### 阶段门禁

阶段读取顺序：

1. `.sillyspec/.runtime/gate-status.json`
2. `sqlite3` CLI 查询 `.sillyspec/.runtime/sillyspec.db`

只有 `execute` 和 `quick` 被视为允许源码写入的阶段。

### execute 写入

execute 阶段的源码写入必须位于已登记 worktree 内：

1. hook 读取 `.sillyspec/.runtime/gate-status.json` 或 SQLite，得到当前 active changes。
2. 对每个 active change 读取 `.sillyspec/.runtime/worktrees/<change>/meta.json`。
3. 只有目标路径位于 `meta.json.worktreePath` 内时才允许写入。

这意味着随便构造一个包含 `.sillyspec/.runtime/worktrees/` 字符串的路径不会被放行。主工作区写源码仍会被拦截。

### quick 写入

quick 阶段写文件直接放行，不要求 worktree。

### Bash 命令

- 已登记 worktree 内 cwd：全部 Bash 放行。
- 非 execute/quick：只读白名单放行。
- quick：危险黑名单拦截，其余放行。
- execute 主工作区：危险黑名单拦截；只读白名单放行；其他不确定命令当前放行。

`worktree-guard.js` 的本地扩展白名单优先读取 `.sillyspec/local.yaml` / `.sillyspec/local.yml`，并兼容项目根 `local.yaml` / `local.yml`。
