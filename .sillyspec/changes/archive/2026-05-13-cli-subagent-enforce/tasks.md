---
author: qinyi
created_at: 2026-05-13T11:05:00
---

# Tasks: CLI 子代理强制 + currentChange 自动探测

## Task 1: run.js — currentChange 自动探测
- 修改文件: `src/run.js`
- 新增 `resolveChangeDir(cwd, progress)` 辅助函数
- 新增 `autoDetectChange(progress, cwd)` 函数
- 修改 `runStage()` 入口调用 autoDetectChange
- 修改 `completeStep()` 动态插入逻辑使用 resolveChangeDir

## Task 2: run.js — 简化动态蓝图插入
- 修改文件: `src/run.js`
- 修改 completeStep 中 plan 阶段的动态插入：从 N 个步骤改为 1 个协调器步骤
- 用 resolveChangeDir 替代直接使用 progress.currentChange

## Task 3: plan.js — 单步协调器
- 修改文件: `src/stages/plan.js`
- 新增 `buildCoordinatorStep(changeDir, taskNames)` 函数
- 修改 `buildPlanSteps()` 返回 1 个协调器步骤（而非 N 个 taskSteps）
- 协调器 prompt 包含强制子代理指令和 prompt 模板

## Task 4: execute.js — Wave 强制子代理
- 修改文件: `src/stages/execute.js`
- 修改 `buildWavePrompt()` 在返回内容中加入子代理执行指令
- 包含子代理 prompt 模板（任务蓝图 + 铁律）

## Task 5: brainstorm.js — HTML 原型可选步骤
- 修改文件: `src/stages/brainstorm.js`
- 在"分段展示设计"之后新增可选步骤"HTML 原型生成"
- 步骤 prompt 包含适合性判断逻辑和 HTML 文件保存路径

## Task 6: 验证
- 手动测试完整流程：brainstorm → plan → execute
- 确认 currentChange 自动设置
- 确认蓝图协调器步骤插入
- 确认 Wave prompt 包含子代理指令
- 确认 HTML 原型步骤出现且可选
