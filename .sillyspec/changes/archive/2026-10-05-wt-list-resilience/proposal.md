---
author: flow-machine-draft
created_at: 2026-10-05T11:24:54.198Z
---
# 提案书（Proposal）— 2026-10-05-wt-list-resilience

## 动机

任务原话转写：多 agent 共享仓的 worktree 注册表（.sillyspec/.runtime/worktrees/）易混入缺字段 meta（实证：2026-09-27 e2e 手测残留 4 个缺 changeName/branch 的 meta），WorktreeManager.list() 原样透传缺字段项，worktree list 渲染 i.changeName.length 直接 TypeError 崩溃（本会话接手后首条命令即炸），doctor 的孤儿匹配也因 undefined 失效。读侧归一化修复：changeName 兜底注册表目录名（create 恒以变更名建目录）、branch 兜底 '-'，渲染器保持哑。
成功标准：
- 注册表含缺 changeName/branch 字段的 meta 时 sillyspec worktree list 不崩溃，缺字段项以目录名/'-' 兜底正常列出
- 完整 meta 场景 list 输出不变（changeName/branch 取原值）
- 单测覆盖缺字段 meta（changeName 兜底=目录名、branch 兜底='-')与解析失败跳过两形态

## 变更范围

按成功标准机械推导，共 3 条验收面：
1. 注册表含缺 changeName/branch 字段的 meta 时 sillyspec worktree list 不崩溃，缺字段项以目录名/'-' 兜底正常列出
2. 完整 meta 场景 list 输出不变（changeName/branch 取原值）
3. 单测覆盖缺字段 meta（changeName 兜底=目录名、branch 兜底='-')与解析失败跳过两形态

## 成功标准（可验证）

1. 注册表含缺 changeName/branch 字段的 meta 时 sillyspec worktree list 不崩溃，缺字段项以目录名/'-' 兜底正常列出
2. 完整 meta 场景 list 输出不变（changeName/branch 取原值）
3. 单测覆盖缺字段 meta（changeName 兜底=目录名、branch 兜底='-')与解析失败跳过两形态
