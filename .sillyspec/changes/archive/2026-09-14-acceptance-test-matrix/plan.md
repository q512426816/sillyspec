---
plan_level: full
---

# 实现计划（Plan）

## 来源
brainstorm 四件套（Grill 复核 passed）：acceptance×测试覆盖矩阵——探针 7 / fail-closed 门禁 / 映射文档化。

## Wave 1（并行，无依赖）
- task-01

## Wave 2（依赖 Wave 1）
- task-02
- task-03

## 任务总表
| 编号 | 任务 | Wave | 优先级 | 依赖 | 覆盖 FR/D | 说明 |
|---|---|---|---|---|---|---|
| task-01 | 探针 7 主体 | W1 | P0 | — | FR-01, D-001@v1 | verify-probes.js + index.js --init 接线：acceptance jsYaml 自解析（string/array 双形态）+ 双源结构归属（allowed_paths 测试模式 ∪ marker 内联解析 runId 的 review.json changedFiles test/ 前缀；禁静态 import task-review）+ 关键词提示（标识符+CJK≥2 片段 grep，上限 5 词）+ 骨架渲染「#### 探针 7」章节 + ensureAcceptanceMatrixSection 幂等补段 |
| task-02 | 门禁 | W2 | P0 | task-01 | FR-02, D-001@v1 | stage-contract.js export extractAcceptanceMatrixSlots（四枚举+证据口径：covered/partial 须测试锚点形态、non-testable 须非空理由，皆计 missingEvidence）+ contracts.verify.validators 注册（:884，gates.js 预计零改动）；有 tasks 无段严格档 ERROR（复用 isIrStrictVerifyChange/IR_STRICT_SINCE 同源常量） |
| task-03 | 文档 | W2 | P0 | task-01 | FR-03, D-001@v1 | testcase-design.md 第 7 条覆盖对账；verify-probes.md 探针清单补 7；verify.js step5 prompt 矩阵消费说明；docs/prompt 提取同步（若 _sync 机制自动则跑之） |

## 关键路径
task-01 → task-02/03（并行）

## 全局验收标准
1. 全量 npm test 0 fail（含两个新测试文件）
2. 集成自举：本变更 verify 时矩阵经「骨架生成或幂等补段」二选一通道在场（本变更新建走前者，ensureAcceptanceMatrixSection 幂等性以单测二跑零改动验证），并被门禁核对
3. brownfield：无 tasks/ 的变更 verify 零行为变化（probe7.applicable=false）
4. 骨架渲染矩阵 + 未填槽/缺证据阻断 + non-testable 行证据列理由非空

## 覆盖矩阵（如存在 decisions.md）
| ID | 覆盖任务 | 验收证据 |
|---|---|---|
| D-001@v1 | task-01, task-02, task-03 | AC-1（全量测试）、AC-2（自举）、AC-4（门禁四态） |
