---
author: qinyi
created_at: 2026-06-01T09:05:00
---

# worktree
> 最后更新：2026-06-28
> 最近变更：2026-06-28-worktree-deps-provision（修路径/分支脱节 + 补依赖供给）
> 模块路径：src/worktree.js, src/worktree-apply.js, src/worktree-deps.js

## 职责
Git worktree 的创建、管理、变更应用与依赖供给 — 为 SillySpec 提供隔离且立即可构建的开发环境。

## 当前设计

worktree 模块提供基于 git worktree 的分支隔离机制，让每个变更在独立的工作树中开发，避免主工作区被污染。由三个文件组成：

**worktree.js** 核心是 `WorktreeManager` 类，管理 worktree 的完整生命周期。worktree 存放在 `.sillyspec/.runtime/worktrees/<change-name>/` 目录下，每个 worktree 对应一个 `sillyspec/<name>` 格式的分支。WorktreeManager 提供创建（create）、列出（list）、清理（cleanup）、查询元数据（getMeta）、健康检查（doctor）等操作。每个 worktree 附带一个 meta.json 文件记录分支名、基础提交、创建时间、依赖供给状态等元信息。

**worktree-apply.js** 提供 `applyWorktree()` 函数，负责将 worktree 中的变更安全地应用回主工作区。它执行冲突检测（检查主工作区和 worktree 是否修改了相同文件），支持仅检查模式（checkOnly）和实际应用模式。应用时使用 `git diff` 生成补丁并通过 `git apply` 应用。

**worktree-deps.js** 提供 `provisionDeps()` 依赖供给引擎。在 `create()` 的 baseline overlay 之后调用，让 worktree 立即可构建/测试：lockfile 一致时 junction/symlink 主 checkout 的 node_modules（瞬时零网络），否则按 `local.yaml` 的 `project.type` + lockfile 推断并执行 install。供给结果（depsStatus 等）写入 meta.json，供 execute 阶段的验证硬门读取。供给可失败，但失败状态可观测、可由 doctor 重试。

## 对外接口（表格）

### src/worktree.js
| 函数/常量 | 说明 | 参数 |
|-----------|------|------|
| `isGitWorktreeSupported(cwd?)` | 检测当前环境是否支持 git worktree | `cwd?`（默认 process.cwd） |
| `WorktreeManager` (class) | worktree 生命周期管理器 | `constructor({ cwd, worktreeDir? })` |
| `WorktreeManager.getWorktreePath(changeName)` | 获取指定变更的 worktree 路径 | `changeName` |
| `WorktreeManager.getMeta(changeName)` | 读取 worktree 元数据（meta.json） | `changeName` |
| `WorktreeManager.create(changeName, { base? })` | 创建 worktree — 建分支、checkout、fetch+merge、baseline overlay、**依赖供给**、写 meta.json | `changeName, { base? }` |
| `WorktreeManager.list()` | 列出所有 worktree 及其状态 | — |
| `WorktreeManager.cleanup(changeName)` | 清理 worktree — 删除分支和工作目录 | `changeName` |
| `WorktreeManager.doctor({ fix?, staleHours? })` | 健康检查（含 deps-missing/stale/failed）+ 可选修复 | `{ fix?, staleHours? }` |

### src/worktree-apply.js
| 函数/常量 | 说明 | 参数 |
|-----------|------|------|
| `applyWorktree(changeName, { cwd, checkOnly? })` | 将 worktree 变更应用到主工作区 | `changeName, { cwd, checkOnly? }` |

### src/worktree-deps.js
| 函数/常量 | 说明 | 参数 |
|-----------|------|------|
| `provisionDeps(worktreePath, mainCwd, opts?)` | 依赖供给：junction/symlink 快路径 + install 兜底，返回 deps 状态对象 | `worktreePath, mainCwd, { specBase?, timeout? }` |
| `lockfileHash(dir)` | 取首个命中 lockfile 的 sha256 前 16 位（无则 hash package.json） | `dir` |

## meta.json 依赖字段（provisionDeps 写入）

| 字段 | 取值 | 说明 |
|---|---|---|
| `depsStatus` | linked \| installed \| n/a \| failed \| missing \| stale | 依赖就绪状态 |
| `depsMethod` | junction \| symlink \| install \| null | 供给机制 |
| `depsSource` | main-checkout \| install \| null | 依赖来源 |
| `depsLockHash` | sha16 \| null | 供给时的 lockfile/package.json hash |
| `depsCheckedAt` | ISO8601 | 上次供给时间 |
| `depsError` | string? | 仅 failed 时填 |

execute 验证硬门（`run.js completeStep` execute 分支）读 `depsStatus`：非 `{linked, installed, n/a}` 且非 wave 级 `no_deps_verify` opt-out 时拒绝 `--done`（step 置 `blocked` + exit 1）。

## 关键数据流

1. **创建流**: WorktreeManager.create → 验证 changeName → 创建分支 → git worktree add → fetch origin → merge default branch → **baseline overlay** → **provisionDeps（依赖供给）** → 写 meta.json
2. **重入自检流**: execute 入口 → 读 meta → depsStatus 缺失/node_modules 丢失/lockfile 变化 → 触发 provisionDeps 重供给 → 更新 meta
3. **应用流**: applyWorktree → 检查 worktree 存在 → git diff 生成文件列表 → 冲突检测 → 生成补丁 → git apply → 处理未跟踪文件
4. **清理流**: WorktreeManager.cleanup → git worktree remove --force → git branch -D → rmSync 工作目录
5. **健康检查流**: WorktreeManager.doctor → 扫描 meta + 文件系统 → 检出 deps-missing/stale/failed（+ 孤儿/过期）→ --fix 时 provisionDeps 重供给

## 设计决策（表格）

| 决策 | 原因 | 替代方案 |
|------|------|----------|
| git worktree 而非 git stash/cherry-pick | 物理隔离，支持同时多变更并行 | git stash |
| meta.json 存储元数据（含 depsStatus） | 独立于 git，便于快速查询 | git config |
| sillyspec/ 前缀的分支命名 | 避免与功能分支冲突 | 无前缀 |
| 补丁方式应用而非 merge | 保持线性历史，避免合并提交 | git merge |
| cleanup 支持 force 参数 | worktree 可能处于异常状态 | 仅允许正常清理 |
| 依赖供给：junction 快路径 + install 兜底 | lockfile 一致时瞬时复用主 checkout 依赖，否则安装 | 每次全量 install / 只 warn |
| 验证硬门（blocked + exit 1） | 依赖未就绪不得声称 verified，靠代码级门保证 | prompt 软约束（已证失效） |

## 依赖关系
- 内部依赖：src/worktree.js（worktree-apply.js 导入 WorktreeManager；create/doctor 导入 worktree-deps.js 的 provisionDeps）、src/change-list.js（worktree-apply.js 导入 parseFileChangeList）
- 外部依赖：child_process（execSync）、fs、path、os（tmpdir）、crypto（createHash）

## 注意事项
- isGitWorktreeSupported 通过 `git worktree list` 检测支持性，需要在 git 仓库中调用
- create 方法会自动 fetch origin 并尝试 ff-only merge 默认分支，然后 baseline overlay + 依赖供给
- applyWorktree 在冲突时会报告冲突文件列表但不自动解决
- worktree 目录位于 `.sillyspec/.runtime/worktrees/`，需在 .gitignore 中配置
- cleanup 会强制删除 worktree 和对应分支，操作不可逆
- 依赖供给失败不阻断 create（只记 meta.depsStatus=failed），但 execute 验证硬门会阻断 --done

## 变更索引
| 日期 | 变更名 | 摘要 |
|------|--------|------|
| 2026-06-28 | 2026-06-28-worktree-deps-provision | 依赖供给 provisionDeps + execute 验证硬门 + doctor deps 检查；修路径/分支前缀脱节 |
