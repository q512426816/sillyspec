---
author: qinyi
created_at: 2026-06-02 23:47:00
---

# 模块影响分析

## 变更：2026-06-02-module-doc-redesign

## 模块影响矩阵
| 模块 | 影响类型 | 相关文件 | 更新内容摘要 | needs_review |
|------|----------|----------|-------------|-------------|
| stages | 配置变更 | .sillyspec/docs/sillyspec/modules/stages.md | 模块卡片精简为新格式（5 个章节） | false |

## 未匹配文件
| 文件路径 | 说明 |
|----------|------|
| .sillyspec/changes/2026-06-02-module-doc-redesign/design.md | 设计文档 |
| .sillyspec/changes/2026-06-02-module-doc-redesign/proposal.md | 提案文档 |
| .sillyspec/changes/2026-06-02-module-doc-redesign/requirements.md | 需求文档 |
| .sillyspec/changes/2026-06-02-module-doc-redesign/tasks.md | 任务列表 |
| .sillyspec/docs/sillyspec/modules/_module-map.yaml | 模块映射重构（新格式） |
| src/index.js | CLI 入口更新 |
| src/progress.js | 进度管理更新 |
| src/run.js | 运行引擎更新 |
| src/stages/archive.js | Archive 阶段更新 |
| src/stages/brainstorm.js | Brainstorm 阶段更新（加载 _module-map.yaml） |
| src/stages/doctor.js | Doctor 阶段更新 |
| src/stages/execute.js | Execute 阶段更新 |
| src/stages/plan.js | Plan 阶段更新（加载 _module-map.yaml） |
| src/stages/scan.js | Scan 阶段更新（Step 7/10、8/10、9/10） |
| src/stages/verify.js | Verify 阶段更新 |

## 更新结果
| 目标 | 操作 | 状态 |
|------|------|------|
| _module-map.yaml | 更新 generated_at | ✅ |
| stages.md | 更新模块卡片格式 | ✅ |