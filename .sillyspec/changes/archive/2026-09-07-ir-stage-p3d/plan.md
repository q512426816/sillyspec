---
author: qinyi
created_at: 2026-09-07T07:00:00+08:00
plan_level: full
---

# 实现计划（Plan）

## Wave 1（并行，无依赖）
- task-01

## Wave 2（依赖 Wave 1）
- task-02

## Wave 3（依赖 Wave 2）
- task-03

## 任务总表

| 编号 | 任务 | Wave | 优先级 | 依赖 | 覆盖 FR/D | 说明 |
|---|---|---|---|---|---|---|
| task-01 | archive-delta 聚合器 | W1 | P0 | — | FR-01, D-001~003 | 新文件 collectDeltaSources/buildDeltaReport + src/design-facts.js deriveActualModules 加 export（:149 一行）；复用 parseDecisionDomains/loadModuleMap |
| task-02 | CLI + 归档接线 | W2 | P0 | task-01 | FR-01, FR-02 | index.js delta case（--json 先例口径）；complete-handlers.js handleArchiveConfirmStep :439 archiveChangeDirectory 前生成（fail-soft） |
| task-03 | 测试套件 | W3 | P0 | task-01, task-02 | FR-01, FR-02 | 四源聚合/逐源降级/apply-pathspec 兜底/归属推导/幂等/归档集成（delta.md 进 archive/） |

## 关键路径

task-01 → task-02 → task-03

## 全局验收标准

1. delta 命令对含四源的变更生成完整三段式；对存量变更（缺源）逐段降级不失败
2. 归档后 delta.md 在 archive/<变更>/（fail-soft 验证）
3. module 子集测试全绿 + lint 归零

## 覆盖矩阵

| ID | 覆盖任务 | 验收证据 |
|---|---|---|
| D-001@v1 | task-01 | 缩范围（无端点段/增量引擎） |
| D-002@v1 | task-01, task-02 | 双入口三段式 |
| D-003@v1 | task-01, task-02 | --json/兜底/源4/deriveActualModules |
