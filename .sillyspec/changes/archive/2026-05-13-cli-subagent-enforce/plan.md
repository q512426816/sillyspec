---
author: qinyi
created_at: 2026-05-13T11:10:00
---

# 实现计划

## Wave 1（并行，无依赖）
- [x] task-01: run.js — currentChange 自动探测（resolveChangeDir + autoDetectChange）
- [x] task-02: brainstorm.js — HTML 原型可选步骤

## Wave 2（task-01 完成后，并行执行）
- [x] task-03: run.js — 简化动态蓝图插入（completeStep 用 resolveChangeDir）
- [x] task-04: plan.js — 单步协调器（buildCoordinatorStep + 修改 buildPlanSteps）
- [x] task-05: execute.js — Wave 强制子代理（修改 buildWavePrompt）

## Wave 3（全部完成后）
- [x] task-06: 验证（手动测试完整流程）

## 全局验收标准
- [x] sillyspec run plan 自动探测 change 目录并设置 currentChange
- [x] Plan 阶段插入 1 个"生成任务蓝图（子代理并行）"协调器步骤
- [x] 协调器 prompt 包含强制子代理指令和 prompt 模板
- [x] Execute Wave prompt 包含子代理执行模板
- [x] Brainstorm 有"HTML 原型生成"可选步骤
- [x] 现有流程不受影响（向后兼容）
