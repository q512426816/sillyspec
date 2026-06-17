---
schema_version: 1
doc_type: module-card
module_id: stages
author: qinyi
created_at: 2026-06-04T16:55:00+08:00
---

# stages

## 定位

定义 SillySpec 所有工作流阶段的步骤和 prompt，是 CLI 状态引擎的核心配置层。

## 契约摘要

| 接口 | 说明 | 调用方 |
|------|------|--------|
| `definition.steps` | 阶段步骤定义数组 | run.js（getStageSteps） |
| `definition.name` | 阶段名 | stages/index.js（registry） |
| `buildExecuteSteps(planFile)` | 动态生成 execute 步骤 | run.js |
| `buildPlanSteps(changeDir)` | 动态生成 plan 步骤 | run.js |

## 关键逻辑

每个阶段由 `export const definition = { name, title, description, steps: [...] }` 导出。steps 数组中每个 step 包含 name、prompt、outputHint、optional 字段。CLI 通过 `ProgressManager` 写入 SQLite，并以兼容旧 progress JSON 的对象跟踪每个 step 的执行状态。

**核心阶段**（按流程顺序）：brainstorm → propose → plan → execute → verify → archive
**辅助阶段**：scan、quick、explore、status、doctor

当前固定阶段步骤数：

| 阶段 | 步骤数 | 说明 |
|---|---:|---|
| scan | 10 | step 2 后按项目动态展开 perProject 步骤 |
| brainstorm | 13 | 含可选的需求澄清 Grill 和默认执行的 Design Grill 交叉审查 |
| propose | 7 | `生成规范文件` 与 `自检门控` 是独立步骤 |
| verify | 7 | 只读验证并写 `verify-result.md` |
| archive | 5 | 第 4 步必须带 `--confirm` 才移动归档目录 |
| quick | 3 | 直接在主工作区实现，完成后重置辅助阶段 gate |

## 注意事项

- 修改阶段步骤数量时，ensureStageSteps 会自动同步到 progress.json（检测 steps.length 不匹配）
- archive 步骤顺序不能乱：extract-module-impact 必须在 sync-module-docs 之前
- archive `确认归档` 未带 `--confirm` 时会回退为 pending；带 `--confirm` 时由 run.js 移动目录并注销 active change
- quick 的模块同步逻辑与 archive 一致，但跳过用户确认

## 人工备注

<!-- MANUAL_NOTES_START -->
- ql-20260604-001-7a4c | 对齐 file-lifecycle 文档与阶段实现，修复 brainstorm/propose 步骤丢失和 archive confirm 生命周期。
- ql-20260617-003-c3d9 | 收紧 Grill 流程语义，合并需求澄清 pass，并增强决策 ID/record 解析。
<!-- MANUAL_NOTES_END -->
