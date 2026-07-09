---
id: task-06
title: src/run.js 两处 saveWorkflowRun 透传 runtimeRoot/scanRunId
author: qinyi
created_at: 2026-07-09 19:58:30
priority: P1
low_risk: true  # 代码已存在于 baseline(run.js:3395/3436 透传 + workflow.js:744 支持)，本 task 为验证确认性质，无新增代码 diff
depends_on: []
blocks: [task-07, task-08]
allowed_paths:
  - src/run.js
provides:
  - contract: workflow-run-platform-path
    fields: [runtimeRoot, scanRunId]
goal: |
  平台模式下 workflow run 取证文件落 <runtimeRoot>/scan-runs/<scanRunId>/workflow-runs/，
  使平台能读取 postcheck 产物（known-implementation-gaps 缺口之一）。
implementation: |
  改 src/run.js 恰好两处（调用点搜索见 plan.md）：
  - 约 3390 行：scan 深度扫描 postcheck 的 saveWorkflowRun(result, {...}) options
    增加 runtimeRoot: platformOpts?.runtimeRoot, scanRunId: platformOpts?.scanRunId
  - 约 3431 行：archive extract-module-impact postcheck 同样处理
  workflow.js saveWorkflowRun 已支持这两个参数（纯接线，不改 workflow.js）；
  取 platformOpts 的具体变量名以两处调用上下文实际在用的平台参数对象为准。
acceptance: |
  - 带 runtimeRoot/scanRunId 时 run 文件落 <runtimeRoot>/scan-runs/<scanRunId>/workflow-runs/
  - 不带（非平台模式，参数 undefined）时落盘路径与现状完全一致
verify: |
  task-07 中直接调用 saveWorkflowRun 验证两种路径分支；run.js 接线部分通过全量 npm test 回归保护。
constraints: |
  - 只改 src/run.js 的这两处调用 options，不改 saveWorkflowRun 实现、不改其他 run.js 逻辑
---

# task-06: saveWorkflowRun runtimeRoot 透传

## 目标

见 frontmatter goal（design.md §4.2）。

## 实现蓝图

见 frontmatter implementation。

## 验收标准

见 frontmatter acceptance（2 条）。

## TDD/验证

见 frontmatter verify。
