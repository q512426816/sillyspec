---
author: qinyi
created_at: 2026-09-07T00:25:17+08:00
plan_level: full
---

# 实现计划（Plan）

## Wave 1（并行，无依赖）
- task-01
- task-02
- task-03

## Wave 2（依赖前序 Wave）
- task-04

## Wave 3（依赖前序 Wave）
- task-05

## Wave 4（依赖前序 Wave）
- task-06

## 任务总表

| 编号 | 任务 | Wave | 优先级 | 依赖 | 覆盖 FR/D | 说明 |
|---|---|---|---|---|---|---|
| task-01 | taskcard 骨架与 taskcard-rules 增加 target_files 字段支持 | W1 | P0 | — | FR-01, D-002@v1 | src/taskcard.js 占位+尾注释；templates/prompts/taskcard-rules.md 正反例 |
| task-02 | plan 阶段 prompt 填写指引 | W1 | P0 | — | FR-01 | src/stages/plan.js 任务清单步(:137)+TaskCard 生成步(:405-457) |
| task-03 | plan-postcheck validateTargetFiles 检查 | W1 | P0 | — | FR-02, D-002@v1 | 严格解析 parseTargetFiles（parseAllowedPaths 同族）+存在性/格式核验+design/allowed_paths 双交叉+每变更汇总 WARNING |
| task-04 | verify-postcheck reconcileTargetFiles 纯函数 | W2 | P0 | task-03 | FR-03, FR-04, D-004@v1 | 三源 actual 口径（两形态）+三类差集+filterDeliverableFiles+splitOwnVsForeignDiffFiles 过滤+降级；复用 task-03 的 parseTargetFiles |
| task-05 | gates.js verify 块接线 | W3 | P0 | task-04 | FR-05, D-004@v1 | import+调用，阻断语义照 runVerifyTestCheck 先例，不改既有五项检查 |
| task-06 | 测试套件 | W4 | P0 | task-03, task-04, task-05 | FR-02, FR-03, FR-04 | test/plan-target-files.test.mjs 新建 + 既有受影响断言的更新义务（executePlanPostcheck 聚合 4 测试将收新 WARNING、gates/verify 域测试、taskcard 骨架测试——失效即修，路径同入 allowed_paths） |

## 关键路径

task-03 → task-04 → task-05 → task-06（对账引擎依赖解析函数，接线依赖引擎，测试依赖全部）

## 全局验收标准

1. 全部测试通过（新增 test/plan-target-files.test.mjs + 既有套件零回归——test/ 共 348 个测试文件，其中 41 个引用被改四模块、31 个直接 import，为重点回归面）
2. ②类（声明没做）在 verify gate 产生 ERROR 阻断——门禁冒烟锁定
3. （brownfield）无 target_files 的存量 task 卡零红门禁（汇总 WARNING + 对账 skipped）
4. post-apply 形态 NEW: 文件无假红（三源口径测试覆盖）

## 覆盖矩阵

| ID | 覆盖任务 | 验收证据 |
|---|---|---|
| D-001@v1 | 范围界定（全部任务） | tasks.md 无 P3b/c/d 交付物；全局验收 1-4 |
| D-002@v1 | task-03, task-04, task-05 | 机器 diff 权威（task-04 三源）；②红③黄（task-05 阻断+task-06 冒烟） |
| D-003@v1 | —（流程义务） | archive 收尾输出 P3b/c/d 提醒 |
| D-004@v1 | task-04, task-05 | gates 接线（task-05）；三源口径+ctx=null（task-04） |
