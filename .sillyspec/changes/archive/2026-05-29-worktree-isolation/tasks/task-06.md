---
author: qinyi
created_at: 2026-05-29T23:05:00+08:00
id: task-06
title: execute 阶段前缀步骤改造
priority: P0
estimated_hours: 2h
depends_on: [task-03, task-04]
blocks: [task-07]
allowed_paths:
  - src/stages/execute.js (修改)
---

# task-06: execute 阶段前缀步骤改造

## 修改文件（必填）
- 修改 `src/stages/execute.js`

## 实现要求
1. 在 `fixedPrefix` 数组的「加载上下文」后、「确认执行范围」前插入「创建 worktree」步骤
2. 步骤 prompt 指导 AI 创建 worktree 并记录路径
3. 创建失败时报错停止（不降级到无隔离模式）
4. 将 worktree 路径注入到后续 Wave 步骤的上下文

## 接口定义（代码类任务必填）

```javascript
// 在 fixedPrefix 数组中插入新步骤（位置：索引 2，在「加载上下文」后）

// 同时需要修改 buildWavePrompt 函数，接受 worktreePath 参数
// （详见 task-07 的接口定义）

// buildExecuteSteps 函数需要修改：
// 解析 plan.md 获取 waves 后，从前缀步骤的 output 中提取 worktreePath
// 传递给 buildWavePrompt
```

### 控制流伪代码
```
fixedPrefix 修改为:
  [0] 状态检查
  [1] 加载上下文
  [2] 创建 worktree [新增]
  [3] 确认执行范围

步骤[2] prompt 内容:
  为本次执行创建隔离的 git worktree。

  ### 操作
  1. 运行 `sillyspec worktree create <change-name>`
  2. 记录输出的 worktree 路径
  3. 后续所有子代理的 cwd 设为该 worktree 路径
  4. 如果创建失败 → 报错并停止（不要在无隔离状态下继续）

  ### 输出
  worktree 路径 + 分支名

  ### 完成后执行
  sillyspec run execute --done --output "worktree 路径 + 分支名"
```

## 边界处理（必填）
- worktree 创建失败 → prompt 中明确要求"报错并停止"，不继续执行
- changeName 不存在 → progress.json 中应已有 change 名，从 _updateGateStatus 读取
- 前缀步骤的 output 不含 worktree 路径 → Wave 步骤降级为不注入 worktree 路径（兼容性）
- 不修改传入参数

## 非目标（本任务不做的事）
- 不修改 buildWavePrompt 的内容注入逻辑（task-07 负责）
- 不修改后缀步骤（task-08 负责）
- 不修改 quick 阶段（task-09 负责）

## 参考
- `src/stages/execute.js` — fixedPrefix 数组定义（约第 20-60 行）
- design.md §4.1 — 前缀步骤调整设计

## TDD 步骤
1. 启动 execute 阶段，确认步骤列表中包含「创建 worktree」
2. 手动验证 worktree 创建成功后，Wave 步骤可以获取 worktree 路径

## 验收标准
| # | 验证步骤 | 通过标准 |
|---|---|---|
| AC-01 | `sillyspec run execute --status` 步骤列表 | 在「加载上下文」后包含「创建 worktree」步骤 |
| AC-02 | 执行到「创建 worktree」步骤 | 输出 prompt 包含 `sillyspec worktree create` 指令 |
| AC-03 | worktree 创建成功后继续 | 进入「确认执行范围」步骤 |
| AC-04 | 已有步骤顺序不变 | 状态检查 → 加载上下文 → 创建 worktree → 确认执行范围 |
