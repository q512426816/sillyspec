---
author: qinyi
created_at: 2026-09-07T09:00:00+08:00
plan_level: full
---

# 实现计划（Plan）

## Wave 1（并行，无依赖）
- task-01

## Wave 2（依赖 Wave 1）
- task-02
- task-03

## Wave 3（依赖 Wave 2）
- task-04

## 任务总表

| 编号 | 任务 | Wave | 优先级 | 依赖 | 覆盖 FR/D | 说明 |
|---|---|---|---|---|---|---|
| task-01 | endpoint-baseline 纯函数 | W1 | P0 | — | FR-01, FR-02, D-001/002 | capture（复用 scanBackendEndpoints :217）+ diffEndpointSets（METHOD+normalizePath :372 归一，changed 独立行） |
| task-02 | CLI + execute 指引 | W2 | P0 | task-01 | FR-01, FR-03, D-002 | index.js endpoints case 子分发改造 + baseline 分支（worktree 主仓锚定 detectWorktreeSpecDrift 先例）；execute.js Step3 指引一行 |
| task-03 | archive-delta 第五源 | W2 | P0 | task-01 | FR-02, D-001/002 | collectDeltaSources 增 endpointBaseline+现算；After 段端点增删节（降级门控保留；标题沿用「
| task-04 | 测试套件 | W3 | P0 | task-01, task-02, task-03 | FR-01~03 | 幂等/归一（含 normalizePath 参数改名不假报）/diff/主仓锚定/降级/delta 集成 |

## 关键路径

task-01 → task-02/03 → task-04

## 全局验收标准

1. 基线幂等（首次拍/重跑不覆盖）+ worktree 模式主仓锚定实测
2. delta.md 端点增删节（added/removed 表）+ 无基线降级注记
3. endpoints extract 子命令与 verify 探针 5 零回归
4. module 子集 + lint 归零

## 覆盖矩阵

| ID | 覆盖任务 | 验收证据 |
|---|---|---|
| D-001@v1 | 01/02/03 | 采集/消费时机与幂等 |
| D-002@v1 | 01/02/03 | 四项修正（主仓锚定为关键） |
