---
author: qinyi
created_at: 2026-05-29T23:05:00+08:00
id: task-10
title: 降级与逃生逻辑
priority: P0
estimated_hours: 2h
depends_on: [task-05, task-06]
blocks: [task-11]
allowed_paths:
  - src/hooks/worktree-guard.js (修改)
  - src/stages/execute.js (修改)
---

# task-10: 降级与逃生逻辑

## 修改文件（必填）
- 修改 `src/hooks/worktree-guard.js`（task-05 产出）
- 修改 `src/stages/execute.js`（task-06 产出）

## 实现要求
1. git worktree 不可用时的降级：检测 git 版本，不支持的版本输出警告
2. 提供 `--no-worktree` 标志跳过隔离
3. 确认"没有降级到放行"的设计原则：降级只意味着更严格（无 worktree = 无法写源码）
4. `SILLYSPEC_DISABLE_HOOKS=1` 环境变量已在 task-05 实现，本任务确保 execute 阶段正确处理

## 接口定义（代码类任务必填）

```javascript
// 1. 新增 git 版本检测函数（放在 src/worktree.js 中更合适，或作为工具函数）
export function isGitWorktreeSupported(cwd = process.cwd()) {
  // 返回 { supported: boolean, version: string, reason?: string }
}

// 2. execute.js 的「创建 worktree」步骤中增加降级处理：
// if (!isGitWorktreeSupported()):
//   → 输出警告："git worktree not supported (version < 2.15)"
//   → 提示用户使用 --no-worktree 或升级 git
//   → 默认行为：停止执行（更严格）
//
// 3. --no-worktree 标志处理：
// sillyspec run execute --change xxx --no-worktree
// → 跳过 worktree 创建步骤
// → hook 的 stageGate 仍然为 true（execute 阶段）
// → 但 locationGate 为 false（无 worktree）
// → 源码写入被 hook 拦截
// → 除非同时设置 SILLYSPEC_DISABLE_HOOKS=1
```

### 控制流伪代码
```
isGitWorktreeSupported(cwd):
  try:
    version = execSync('git --version', { cwd }).toString().trim()
    match = version.match(/git version (\d+)\.(\d+)/)
    if match:
      major = parseInt(match[1])
      minor = parseInt(match[2])
      if major > 2 || (major === 2 && minor >= 15):
        return { supported: true, version }
      else:
        return { supported: false, version, reason: 'git version < 2.15' }
    else:
      return { supported: false, version, reason: 'cannot parse version' }
  catch:
    return { supported: false, version: null, reason: 'git not found' }

execute.js 「创建 worktree」步骤 prompt 调整：
  ### 操作
  1. 检查 git worktree 支持：运行 `git --version`
  2. 如果版本 < 2.15 → 输出警告，停止执行
  3. 如果传入了 --no-worktree 标志 → 跳过创建，记录"无 worktree 模式"
  4. 正常情况：运行 `sillyspec worktree create <change-name>`

  ### 输出
  worktree 路径 + 分支名（或"无 worktree 模式"）
```

## 边界处理（必填）
- git 命令不存在 → isGitWorktreeSupported 返回 `{ supported: false, reason: 'git not found' }`
- `--no-worktree` + `SILLYSPEC_DISABLE_HOOKS=1` → 无隔离但 hook 也被禁用（等于完全开放，用户明确选择）
- `--no-worktree` 但未禁用 hook → hook 拦截源码写入（更严格模式）
- execute 的「创建 worktree」步骤被跳过 → 后续 Wave 步骤的 worktreePath 为 null（兼容）
- 不修改传入参数

## 非目标（本任务不做的事）
- 不实现"降级到放行"的路径（这是设计决策，不是 bug）
- 不修改 applyWorktree 内部逻辑（task-03 负责）
- 不修改 quick 阶段的降级逻辑（task-09 中已处理）

## 参考
- design.md §3.4 — 降级机制
- requirements.md FR-6 — 降级兼容需求

## TDD 步骤
1. 验证 isGitWorktreeSupported 在 git >= 2.15 时返回 supported: true
2. 验证 isGitWorktreeSupported 在 git < 2.15 时返回 supported: false
3. 验证 --no-worktree 标志跳过 worktree 创建
4. 验证 --no-worktree + hook 启用时源码写入被拦截

## 验收标准
| # | 验证步骤 | 通过标准 |
|---|---|---|
| AC-01 | git >= 2.15 | isGitWorktreeSupported 返回 supported: true |
| AC-02 | git < 2.15（模拟） | isGitWorktreeSupported 返回 supported: false + reason |
| AC-03 | `sillyspec run execute --change xxx --no-worktree` | 跳过 worktree 创建步骤 |
| AC-04 | --no-worktree + hook 启用 | hook 拦截主工作区源码写入 |
| AC-05 | --no-worktree + SILLYSPEC_DISABLE_HOOKS=1 | 完全开放模式 |
| AC-06 | git 不存在 | 报错并停止，提示安装 git |
