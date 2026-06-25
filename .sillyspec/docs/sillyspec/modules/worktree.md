---
author: qinyi
created_at: 2026-06-01T09:05:00
---

# worktree
> 最后更新：2026-06-01
> 最近变更：scan（初始生成）
> 模块路径：src/worktree.js, src/worktree-apply.js

## 职责
Git worktree 的创建、管理和变更应用 — 为 SillySpec 提供隔离的开发环境。

## 当前设计

worktree 模块提供基于 git worktree 的分支隔离机制，让每个变更在独立的工作树中开发，避免主工作区被污染。由两个文件组成：

**worktree.js** 核心是 `WorktreeManager` 类，管理 worktree 的完整生命周期。worktree 存放在 `.sillyspec/worktrees/<change-name>/` 目录下，每个 worktree 对应一个 `change/<name>` 格式的分支。WorktreeManager 提供创建（create）、列出（list）、清理（cleanup）、查询元数据（getMeta）等操作。每个 worktree 附带一个 meta.json 文件记录分支名、基础提交、创建时间等元信息。

**worktree-apply.js** 提供 `applyWorktree()` 函数，负责将 worktree 中的变更安全地应用回主工作区。它执行冲突检测（检查主工作区和 worktree 是否修改了相同文件），支持仅检查模式（checkOnly）和实际应用模式。应用时使用 `git diff` 生成补丁并通过 `git apply` 应用。

## 对外接口（表格）

### src/worktree.js
| 函数/常量 | 说明 | 参数 |
|-----------|------|------|
| `isGitWorktreeSupported(cwd?)` | 检测当前环境是否支持 git worktree | `cwd?`（默认 process.cwd） |
| `WorktreeManager` (class) | worktree 生命周期管理器 | `constructor({ cwd, worktreeDir? })` |
| `WorktreeManager.getWorktreePath(changeName)` | 获取指定变更的 worktree 路径 | `changeName` |
| `WorktreeManager.getMeta(changeName)` | 读取 worktree 元数据（meta.json） | `changeName` |
| `WorktreeManager.create(changeName, { base? })` | 创建 worktree — 建分支、checkout、fetch+merge | `changeName, { base? }` |
| `WorktreeManager.list()` | 列出所有 worktree 及其状态 | — |
| `WorktreeManager.cleanup(changeName)` | 清理 worktree — 删除分支和工作目录 | `changeName` |

### src/worktree-apply.js
| 函数/常量 | 说明 | 参数 |
|-----------|------|------|
| `applyWorktree(changeName, { cwd, checkOnly? })` | 将 worktree 变更应用到主工作区 | `changeName, { cwd, checkOnly? }` |

## 关键数据流

1. **创建流**: WorktreeManager.create → 验证 changeName → 创建分支 → git worktree add → fetch origin → merge default branch → 写 meta.json
2. **应用流**: applyWorktree → 检查 worktree 存在 → git diff 生成文件列表 → 冲突检测 → 生成补丁 → git apply → 处理未跟踪文件
3. **清理流**: WorktreeManager.cleanup → git worktree remove --force → git branch -D → rmSync 工作目录

## 设计决策（表格）

| 决策 | 原因 | 替代方案 |
|------|------|----------|
| git worktree 而非 git stash/cherry-pick | 物理隔离，支持同时多变更并行 | git stash |
| meta.json 存储元数据 | 独立于 git，便于快速查询 | git config |
| change/ 前缀的分支命名 | 避免与功能分支冲突 | 无前缀 |
| 补丁方式应用而非 merge | 保持线性历史，避免合并提交 | git merge |
| cleanup 支持 force 参数 | worktree 可能处于异常状态 | 仅允许正常清理 |

## 依赖关系
- 内部依赖：src/worktree.js（worktree-apply.js 导入 WorktreeManager）、src/change-list.js（worktree-apply.js 导入 parseFileChangeList）
- 外部依赖：child_process（execSync）、fs、path、os（tmpdir）

## 注意事项
- isGitWorktreeSupported 通过 `git worktree list` 检测支持性，需要在 git 仓库中调用
- create 方法会自动 fetch origin 并尝试 ff-only merge 默认分支
- applyWorktree 在冲突时会报告冲突文件列表但不自动解决
- worktree 目录位于 `.sillyspec/worktrees/`，需要在 .gitignore 中配置
- cleanup 会强制删除 worktree 和对应分支，操作不可逆

## 变更索引（表格，初始为空）
| 日期 | 变更名 | 摘要 |
|------|--------|------|
