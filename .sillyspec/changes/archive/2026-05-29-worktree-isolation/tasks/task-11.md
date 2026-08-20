---
author: qinyi
created_at: 2026-05-29T23:05:00+08:00
id: task-11
title: 文档更新
priority: P2
estimated_hours: 1h
depends_on: [task-10]
blocks: []
allowed_paths:
  - docs/worktree-isolation.md (新增)
---

# task-11: 文档更新

## 修改文件（必填）
- 新增 `docs/worktree-isolation.md`

## 实现要求
1. 创建 `docs/worktree-isolation.md`，说明 worktree 隔离机制
2. 内容：目的、使用方式、hook 机制、降级方案、命令参考

## 接口定义（代码类任务必填）

纯文档任务，无代码接口。

### 文档结构
```markdown
# Worktree 隔离

## 概述
execute/quick 阶段使用 git worktree 隔离 AI 子代理的代码修改。

## 命令参考
sillyspec worktree create <change-name> [--base <branch>]
sillyspec worktree apply <change-name> [--check-only]
sillyspec worktree list
sillyspec worktree cleanup <change-name>

## Hook 机制
三重门禁：阶段 × 位置 × 文件
- 阶段门禁：只有 execute/quick 允许源码写入
- 位置门禁：只有 worktree 内允许源码写入
- 文件门禁：文档类文件始终放行

## 降级方案
- git < 2.15：不支持 worktree，报错停止
- --no-worktree：跳过隔离，hook 拦截源码写入
- SILLYSPEC_DISABLE_HOOKS=1：紧急禁用所有 hook

## 常见问题
- worktree 残留：sillyspec worktree list + cleanup
- apply 失败：检查 base hash，手动处理
```

## 边界处理（必填）
- 文档不涉及代码逻辑，边界处理不适用
- 文档内容需与代码实现一致（由 task-01~10 产出决定）

## 非目标（本任务不做的事）
- 不修改 README.md 或其他已有文档
- 不添加 API 文档
- 不添加多语言版本

## 参考
- design.md — 完整技术设计
- requirements.md — 功能需求
- task-01~10 产出的实际代码

## TDD 步骤
1. 编写文档
2. 通读检查：与 design.md 描述一致

## 验收标准
| # | 验证步骤 | 通过标准 |
|---|---|---|
| AC-01 | docs/worktree-isolation.md 存在 | 文件创建成功，非空 |
| AC-02 | 包含命令参考 | 四个 worktree 子命令都有说明 |
| AC-03 | 包含 Hook 机制说明 | 三重门禁都有描述 |
| AC-04 | 包含降级方案 | 三种降级路径都有说明 |
| AC-05 | 与 design.md 一致 | 无矛盾或遗漏 |
