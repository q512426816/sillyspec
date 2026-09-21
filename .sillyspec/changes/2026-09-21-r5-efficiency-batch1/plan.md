---
plan_level: full
---

# 实现计划（Plan）— R5 效率优化第 1 批

## Wave 1（并行，无依赖，2 任务文件域正交各单发）
- task-01
- task-02

## Wave 2（task-03 依赖 task-02 同文件；task-04 文件域正交可并行）
- task-03
- task-04

## Wave 3（依赖 W1+W2 全部完成）
- task-05

## 任务总表
| 编号 | 任务 | Wave | 优先级 | 依赖 | 覆盖 FR/D | 说明 |
|---|---|---|---|---|---|---|
| task-01 | plan 并批默认提示词 + checkBatchAdvisory | W1 | P0 | — | FR-01, D-002@v1 | plan.js 指令三行 + plan-postcheck 数组化 advisory + 测试 |
| task-02 | assembleExecuteTaskMaterials 两段式材料包 | W1 | P0 | — | FR-02, D-003@v1 | review-material-pack 新导出 + execute.js 材料包引用行 + 测试 |
| task-03 | 派发契约注入（轮数纪律/B1/B2） | W2 | P0 | task-02 | FR-03, D-001@v1, D-002@v1 | execute.js 同段追加以 task-02 落点为基线 + 文本钉测试 |
| task-04 | 错键探针套件 | W2 | P0 | — | FR-04, D-002@v1 | fixtures 三类形态 + verify-probes 原语断言 |
| task-05 | 镜像与模块文档同步 | W3 | P1 | task-01, task-02, task-03 | FR-01~03 | _extract.mjs 重生成 + stages.md 增补 + docs-check 收口 |

## 关键路径
task-02 → task-03 → task-05（execute.js 串行链 + 镜像收尾）

## 全局硬约束（从 design.md 逐字抄录，绑定所有 task）
- 不动四道防线（审查/门禁/核验/资产）判定语义；不动四律请求钳；不动 allowed_paths 门禁。
- advisory 全部 warning 级不阻断（复用 {ok,errors,warnings} 先例，仅 errors 阻断）。
- 材料包只摘不译（摘录原文锚点，不做语义转写——D-003 防错键正典）；上限 24576B。
- B2 回收瘦身只改转述文案，git diff 对账机制零改动（对账真相源 execute.js:489/1374/1395 不动）。
- 不改状态机/阶段流转/DB schema。
- 代码必须兼容 Windows/Linux/macOS（路径/换行/并发）。

## 全局验收标准
1. 所有单元测试通过（新增五件 + 全量存量零回归）
2. lint 通过
3. buildWavePrompt 渲染含四段新文本（材料包行/轮数纪律/返回契约/回收瘦身——文本钉）
4. 未启用新材料包时 execute 行为与现状一致（additive 零回归）

## 覆盖矩阵
| ID | 覆盖任务 | 验收证据 |
|---|---|---|
| D-001@v1 | task-03 | AC-3 轮数纪律文本钉 |
| D-002@v1 | task-01, task-02, task-03, task-04 | AC-1~4 + 红线核验（advisory warning 级） |
| D-003@v1 | task-02 | AC-2 两段式/上限/原文逐字断言 |
