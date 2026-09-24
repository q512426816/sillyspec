---
plan_level: full
execution_mode: main
---

# 实现计划（Plan）— 2026-09-24-fr-test-readside

## Spike 前置验证
无——残差执行复用 buildDepsBatches 既有组卷；全部为成熟面 additive 扩展。

## Wave 1（核心，无依赖）
- task-01

## Wave 2（依赖 W1）
- task-02

## Wave 3（依赖 W1/W2）
- task-03

## Wave 4（依赖 W3）
- task-04

## Wave 5（依赖 W1）
- task-05

## Wave 6（收尾验证门）
- task-06

> 波次说明：NEW:test/verify-trace-residual.test.mjs 为共用测试文件，同波并行
> 会互覆（plan-postcheck 硬拦）——全串行单任务波。

## 任务总表
| 编号 | 任务 | Wave | 优先级 | 依赖 | 覆盖 FR/D | 说明 |
|---|---|---|---|---|---|---|
| task-01 | 锚点集+残差+悬空硬错 | W1 | P0 | — | FR-01, FR-02, FR-05, D-001@v1/D-004@v1 | resolveVerifyAnchorSet/resolveTraceResidual+门入口 fail-fast |
| task-02 | 残差执行段 | W2 | P0 | task-01 | FR-04, D-003@v1 | runTraceResidual 复用组卷口径；无法归一硬错 |
| task-03 | 执行矩阵合并 | W3 | P0 | task-01/02 | FR-03, D-002@v1 | 5 动作×trace；skip 类→跑 trace；mode +trace(N)；零漂移回归钉 |
| task-04 | 披露 sidecar | W4 | P1 | task-03 | FR-06, D-005@v1 | verify-trace-disclosure.json+console 摘要 |
| task-05 | 账本停复用护栏 | W5 | P1 | task-01 | FR-07, D-006@v1 | gates.js consult/record 前查 trace |
| task-06 | 全量验证门 | W6 | P0 | task-01~05 | FR-01~FR-07 | test:core+新测试+lint+dogfood |

## 关键路径
task-01 → task-02 → task-03 → task-06（锚点/残差→执行→合并→门）

## 全局硬约束（从 design.md 逐字抄录，绑定所有 task）
- decideVerifyTestAction 与既有执行分支逐字保留——残差只在结果层加法。
- trace 空 = 零行为漂移（无 trace 变更门禁输出逐字节同前置 3143aadc）。
- 保守差集：仅 deps 文件集可证；禁解析命令串猜覆盖面。
- 悬空 fail-fast 在门入口（先于任何执行）。
- orphan/candidate/superseded 行不进跑集。
- 绑定行禁存 shell command；无法归一 runner 硬错不猜测。
