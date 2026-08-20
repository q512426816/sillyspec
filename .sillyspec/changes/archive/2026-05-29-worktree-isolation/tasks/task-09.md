---
author: qinyi
created_at: 2026-05-29T23:05:00+08:00
id: task-09
title: quick 阶段 worktree 集成
priority: P1
estimated_hours: 3h
depends_on: [task-03, task-04, task-05]
blocks: [task-10]
allowed_paths:
  - src/stages/quick.js (修改)
---

# task-09: quick 阶段 worktree 集成

## 修改文件（必填）
- 修改 `src/stages/quick.js`

## 实现要求
1. quick 阶段同样走 worktree 隔离流程
2. quick 开始时创建 worktree，结束时 apply + cleanup
3. hook 的 stageGate 同时放行 execute 和 quick
4. quick 没有 design.md 时，apply 跳过文件清单校验（无清单 = 允许所有）

## 接口定义（代码类任务必填）

```javascript
// 修改 quick.js 的步骤定义：

// 1. 在步骤开头添加「创建 worktree」步骤
// 2. 修改执行步骤，注入 worktree 路径
// 3. 在步骤末尾添加「apply 并 cleanup」步骤
```

### 控制流伪代码
```
quick.js 步骤调整为:
  [0] 状态检查（不变）
  [1] 加载上下文（不变）
  [2] 创建 worktree [新增，与 execute 类似]
      prompt: 运行 `sillyspec worktree create <change-name>`，记录路径
  [3] 执行任务（修改：注入 worktree 路径到 prompt）
      prompt 中加入: 子代理 cwd 设为 worktree 路径
  [4] apply 并 cleanup [新增]
      prompt:
      1. 运行 `sillyspec worktree apply --check-only <change-name>`
      2. 展示 diff 摘要
      3. 用户确认后 `sillyspec worktree apply <change-name>`
      4. 不想 apply → `sillyspec worktree cleanup <change-name>` 丢弃
```

### hook stageGate 调整
```
在 src/hooks/worktree-guard.js（task-05）中：
stageGate 的判断已包含 'quick'：
  gateStatus.stage in ['execute', 'quick']
  → 无需额外修改 task-05 的代码，但需确认 task-05 的实现已包含 'quick'
```

## 边界处理（必填）
- quick 阶段没有 design.md → apply 时跳过文件清单校验（applyWorktree 内部已处理）
- quick 阶段 changeName 格式不同于 execute → 使用 progress.json 中的 change 名
- worktree 创建失败 → 报错停止（同 execute）
- quick 阶段只有单步执行 → worktree 生命周期在一轮内完成
- 不修改传入参数

## 非目标（本任务不做的事）
- 不修改 task-05 的 hook 逻辑（只需确认 stageGate 包含 quick）
- 不修改 execute 阶段（task-06/07/08 负责）
- 不新增 quick 阶段的步骤（只修改现有步骤的 prompt）

## 参考
- `src/stages/quick.js` — quick 阶段步骤定义
- `src/stages/execute.js` — execute 的 worktree 集成（task-06/07/08 的产出）
- design.md §3.4 — 降级机制（quick 阶段说明）

## TDD 步骤
1. 验证 quick 阶段步骤包含「创建 worktree」和「apply 并 cleanup」
2. 运行 quick 流程，验证 worktree 创建和 apply 完整
3. 验证无 design.md 时 apply 跳过文件清单校验

## 验收标准
| # | 验证步骤 | 通过标准 |
|---|---|---|
| AC-01 | `sillyspec run quick --status` | 步骤列表包含「创建 worktree」和「apply 并 cleanup」 |
| AC-02 | quick 流程执行中 | 子代理在 worktree 中工作 |
| AC-03 | quick 完成后 | diff 已 apply 到主工作区，worktree 已 cleanup |
| AC-04 | quick 无 design.md | apply 成功，不报文件清单校验错误 |
| AC-05 | hook stageGate 包含 quick | quick 阶段 worktree 内写入放行 |
