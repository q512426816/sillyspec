---
author: qinyi
created_at: 2026-08-17 10:05:00
updated_at: 2026-08-17 11:00:00
---

# 模块影响分析（Module Impact）— quick 完成时自动关闭关联真实变更

## 受影响模块

| 模块 | 文件 | 影响类型 | 说明 |
|---|---|---|---|
| 完成处理器 | src/run/complete-handlers.js | 修改 | 新增 `closeQuickLinkedChanges` 及辅助函数；在 `handleQuickStageCompletion` 中 `completeQuicklogEntry` 之后调用 |
| quick 阶段定义 | src/stages/quick.js | 修改 | step3 prompt 增加自动归档说明 |
| 生命周期文档 | docs/sillyspec/file-lifecycle.md | 修改 | 补充 quick --done 自动关闭关联变更说明 |
| prompt 镜像 | docs/prompt/quick.md、docs/prompt/_extracted.json | 再生 | 由 `node docs/prompt/_extract.mjs` 自动刷新 |
| skill 文档 | .claude/skills/sillyspec-quick/SKILL.md | 修改 | 收尾顺序铁律补充自动归档说明 |
| 回归测试 | test/quick-close-linked-changes.test.mjs | 新增 | 覆盖自动归档、未完成任务不误关、幂等、零回归 |
| 回归测试（既有适配） | test/quick-cli-managed-e2e.test.mjs | 修改 | 断言适配新契约：归档目录两级匹配 + 自动归档提示 + 原目录已移走 |
| 模块卡片 | .sillyspec/docs/sillyspec/modules/runtime.md、modules/stages.md | 修改 | 变更索引追加本变更条目 |

## 接口/行为变化

- 对 Agent 可见的行为：quick --done 成功后，若关联真实变更的 `tasks.md` 无未勾选项，CLI 自动把该变更状态设为 `archived` 并移动目录到 `changes/archive/`。
- 对已有 quick 流程的回归：无 `linkedChanges` 的 quick session 行为不变。
- 对完整 archive 阶段的影响：轻量归档跳过 `plan.md` 硬校验；完整 archive 阶段逻辑不变。

## 兼容性

- 向后兼容：是。仅新增自动行为，不修改现有命令签名。
- 并发安全：依赖文件系统 `renameSyncRetry` 与 `existsSync` 检查；单个变更失败 warn 不阻断其他变更。

## 文档同步需求

- docs/sillyspec/file-lifecycle.md
- docs/prompt/quick.md + _extracted.json
- 必要时 .claude/skills/sillyspec-quick/SKILL.md

## 更新结果

| 目标文档 | 操作 | 状态 |
|---|---|---|
| docs/sillyspec/file-lifecycle.md | 补充 quick --done 自动归档说明 | done |
| docs/prompt/quick.md | 由 `_extract.mjs` 刷新 prompt 镜像 | done |
| docs/prompt/_extracted.json | 由 `_extract.mjs` 刷新 | done |
| .claude/skills/sillyspec-quick/SKILL.md | 在收尾顺序铁律中补充自动归档说明 | done |
| modules/runtime.md | 变更索引追加 closeQuickLinkedChanges 轻量归档条目 | done |
| modules/stages.md | 变更索引追加 quick.js step3 prompt 自动归档说明条目 | done |