---
author: qinyi
created_at: 2026-09-07T00:45:00+08:00
---

# 模块影响分析（Module Impact）— IR 五阶段 P3a

## 模块影响矩阵

| 模块 | 变更文件 | 影响类型 | 说明 |
|---|---|---|---|
| stages | src/stages/plan-postcheck.js | 修改 | 新增 validateTargetFiles 第 7 项检查 + parseTargetFiles 解析 |
| stages | src/stages/plan.js | 修改 | 任务清单步 + TaskCard 生成步 prompt 增加 target_files 指引 |
| core-engine | src/verify-postcheck.js | 修改 | 新增 reconcileTargetFiles 纯函数（三源 actual 口径） |
| core-engine | src/taskcard.js | 修改 | 骨架 frontmatter 加 target_files 占位 + 尾注释 |
| runtime | src/run/gates.js | 修改 | verify 块新增 reconcileTargetFiles 接线（仅追加，不改既有检查） |
| runtime | test/plan-target-files.test.mjs | 新增 | 测试套件（两形态×三模式矩阵 + 门禁冒烟） |

> 注：templates/prompts/taskcard-rules.md 为模板文件，不在 _module-map.yaml 任一模块 paths 内（归入未匹配）；src/taskcard.js 同样未收录于模块 paths（仓库索引侧现状，见下）。

## 未匹配文件

| 文件 | 处置说明 |
|---|---|
| templates/prompts/taskcard-rules.md | 模板目录，无模块归属——追加 target_files 字段规则小节，影响面孤立 |
| src/taskcard.js | 未收录于 _module-map.yaml 任何模块 paths（索引侧缺口，非本变更引入）——本次改动为 additive 占位字段，建议下次 modules 同步时补录（可归 stages 或 core-engine） |

## 更新结果

| 目标 | 操作 | 状态 |
|------|------|------|
| `modules/stages.md` | 更新 stages 模块卡（MANUAL_NOTES 区追加变更条目：prompt 指引 + validateTargetFiles 第 7 检查） | done |
| `modules/core-engine.md` | 更新 core-engine 模块卡（变更索引表追加：taskcard 占位 + reconcileTargetFiles 三源口径） | done |
| `modules/runtime.md` | 更新 runtime 模块卡（MANUAL_NOTES 区追加：gates 接线 + 落盘 + envelope code） | done |
| `_module-map.yaml` | 无变化（未增删模块；taskcard.js paths 缺口为存量问题，不在本变更处理） | skipped |
