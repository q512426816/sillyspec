---
author: qinyi
created_at: 2026-09-07T05:10:00+08:00
plan_level: full
---

# 实现计划（Plan）

## Wave 1（并行，无依赖）
- task-01
- task-03

## Wave 2（依赖 Wave 1）
- task-02

## Wave 3（依赖 Wave 2）
- task-04

## 任务总表

| 编号 | 任务 | Wave | 优先级 | 依赖 | 覆盖 FR/D | 说明 |
|---|---|---|---|---|---|---|
| task-01 | design-facts 纯函数模块 | W1 | P0 | — | FR-01, FR-02, D-001~004 | 新文件：parseDecisionDomains（复用 distill parseDecisions）+ loadModuleMap + validateDecisionModuleRefs + generateDesignSkeleton（十三章节标题与 stage-contract-spec 一致） |
| task-03 | prompt 双更新 | W1 | P0 | — | FR-02, FR-03, D-004 | brainstorm.js Step3 NEW: 指引（:360）+ Step6 design-init 卸责；prompt.js Step2 _facts 注入（fail-soft） |
| task-02 | gate 接线 + CLI 命令 | W2 | P0 | task-01 | FR-01, FR-02 | complete.js:281 钩子链 + index.js design-init case（幂等+--force）；信封 code 三值 |
| task-04 | 测试套件 | W3 | P0 | task-01, task-02, task-03 | FR-01~03 | test/design-facts.test.mjs：双源一致/核验分级/骨架契约/幂等/注入 + 接线级红路径（幻觉 id→exit 1）+ test/run-complete-step-brainstorm.test.mjs 回归 |

## 关键路径

task-01 → task-02 → task-04

## 全局验收标准

1. 幻觉模块 id 在 brainstorm 末步 ERROR 拦截（NEW: 合法出路 + 出路提示）——测试锁定
2. design-init 骨架过 Stage Review/契约校验（章节标题契约断言）；手写路径保留
3. 存量（无模块域/无 map）零红门禁
4. module 子集测试全绿

## 覆盖矩阵

| ID | 覆盖任务 | 验收证据 |
|---|---|---|
| D-001@v1 | task-01 | 载体=decisions.md（无新文件载体） |
| D-002@v1 | task-01, task-02 | ERROR 语义/NEW: 豁免 |
| D-003@v1 | task-01, task-02, task-03 | 三件套 |
| D-004@v1 | task-02, task-03 | Grill 修正五项 |
