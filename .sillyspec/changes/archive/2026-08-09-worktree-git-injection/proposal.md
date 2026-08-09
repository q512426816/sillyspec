---
author: qinyi
created_at: 2026-08-09T10:52:00+08:00
---

# proposal.md — 统一 git 调用入口

## 背景

依据 `docs/sillyspec/review-2026-08-09.md` #1（4 子代理共识）。worktree 链路用 `execSync(\`git ${args}\`)` 字符串拼接执行 git，存在命令注入与空格拆词风险，且与 run/shared.js 的 safeGit 口径分裂。

## 目标

建立单一公共 git 调用入口（execFileSync 数组形式），worktree 链收口共用，消除注入 + 空格拆词 + 口径分裂。行为不变（git 语义不变，仅不经 shell）。

## 方案

新建 `src/git-helper.js`（safeGit 从 run/shared.js 移入作单一实现 + 新增抛错版 git / 静默版 gitQuiet），worktree.js / worktree-apply.js 删本地 helper 收口、调用点改传数组，index.js:859 改数组，run/shared.js safeGit 改 re-export，补注入 + 空格回归测试。详见 design.md（含注入面 vs 健壮面的改动面精确界定）。

## 不在范围内 / Non-Goals

- 不改 run/shared.js 其余杂烩（A #24 的其他关注点，独立项）
- 不改 worktree.js :758/:885 Windows rmdir junction 删除（属 #4 解链 race，独立项）
- 不解决 #2 persist/gate 窗口、#3 `_write` lost-update、架构债（属后续批次）
- 不统一 safeGit 之外的其他 execSync（如无变量固定子命令的健壮面按顺带处理，非强制目标）
