---
author: qinyi
created_at: 2026-08-16 16:00:30
---

# 模块影响分析（Module Impact）— 状态机 fail-open 组修复

## 变更：2026-08-16-state-machine-fail-open

## 模块映射状态

`_module-map.yaml` 为 schema_version:1（无 paths 字段），模块→文件映射手动归因（以模块文档内容为准）。

## 模块影响矩阵

| 模块 | 影响类型 | 相关文件 | 更新内容摘要 |
|------|----------|----------|-------------|
| cli-entry | 逻辑变更 | src/run/command.js | --done 补 checkTransition 转换守卫（含 fromStageData）；read-only auxiliary（status/doctor）置顶短路不写库；brainstorm auto-create 按活跃变更数 gating |
| cli-entry | 逻辑变更 | src/run/stage.js | :128-133 仅非 auxiliary 阶段写 currentStage；:377 noAI 消费点 gate 失败置 exitCode |
| cli-entry | 逻辑变更 | src/run/complete.js | :328/:810 消费点 gate 失败（stageCompleted=false）置 process.exitCode=1 |
| cli-entry | 常量变更 | src/constants.js | 新增 READONLY_AUXILIARY_STAGES（status/doctor） |
| （未映射） | 文档同步 | docs/sillyspec/platform-interface-map.md | command.js 增行后 doc-ref-check 锚点行号重校 |
| （未映射） | 新增测试 | test/state-machine-guards.test.mjs | 状态机守卫回归测试（子进程驱动 CLI） |

## 未匹配文件

| 文件路径 | 说明 |
|----------|------|
| test/state-machine-guards.test.mjs | 新增测试文件，模块映射无 test 归因（测试不属交付模块） |

## 更新结果

| 模块文档 | 操作 | 状态 |
|----------|------|------|
| cli-entry.md | 更新（execute/verify 后按实际代码变更确认） | ⏳ 待 execute |
