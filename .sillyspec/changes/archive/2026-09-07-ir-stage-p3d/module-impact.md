---
author: qinyi
created_at: 2026-09-07T07:05:00+08:00
---

# 模块影响分析（Module Impact）— IR 五阶段 P3d

## 模块影响矩阵

| 模块 | 变更文件 | 影响类型 | 说明 |
|---|---|---|---|
| docs-consistency（建议归属） | src/archive-delta.js | 新增 | delta 聚合器（新文件，paths 待批量补录） |
| docs-consistency（建议归属） | src/design-facts.js | 修改 | deriveActualModules 加 export 一行 |
| cli-entry | src/index.js | 修改 | delta 命令 case |
| runtime | src/run/complete-handlers.js | 修改 | handleArchiveConfirmStep 自动生成 |
| （测试域） | test/archive-delta.test.mjs | 新增 | 测试套件 |

## 未匹配文件

| 文件 | 处置说明 |
|---|---|
| src/archive-delta.js | 新文件（建议归 docs-consistency，后续 modules 同步补录） |
| test/archive-delta.test.mjs | 测试域 |

## 更新结果

| 目标 | 操作 | 状态 |
|------|------|------|
| `modules/docs-consistency.md` | 更新模块卡（archive-delta + design-facts export） | done |
| `modules/cli-entry.md` | 更新模块卡（delta case） | done |
| `modules/runtime.md` | 更新模块卡（归档自动生成） | done |
| `_module-map.yaml` | 新文件 paths 后续批量补录 | skipped |
