---
plan_level: full
execution_mode: main
---

# 实现计划（Plan）— 2026-09-24-fr-test-bindings

## Spike 前置验证
无——纯增量接线：探针 7 归属列 / fr-index 蒸馏链 / quick 门均为既有成熟面；
方案经六轮审阅收敛，无新技术栈 / 未验证集成。

## Wave 1（基座，无依赖）
- task-01

## Wave 2（依赖 task-01）
- task-02

## Wave 3（依赖 task-01；与 W2 文件不相交但共用测试文件→串行波）
- task-03

## Wave 4（依赖 task-01/03）
- task-04

## Wave 5（依赖 task-01）
- task-05

## Wave 6（依赖 task-01/03）
- task-06

## Wave 7（收尾验证门）
- task-07

> 波次说明：test/test-bindings.test.mjs 为全任务共用测试文件，同 Wave 并行子代理会
> 互覆（plan-postcheck 硬拦项）——故 W2~W6 各只放一个写点任务，全串行。

## 任务总表
| 编号 | 任务 | Wave | 优先级 | 依赖 | 覆盖 FR/D | 说明 |
|---|---|---|---|---|---|---|
| task-01 | 绑定基座模块 | W1 | P0 | — | FR-01/FR-03/FR-04/FR-07, D-001@v1/D-002@v1/D-005@v1 | test-bindings.js 行模型+两真源读写+upsert 幂等/取代 |
| task-02 | tests CLI | W2 | P0 | task-01 | FR-06, D-002@v1 | --anchor/--change 视图 + --bind/--unbind 修理工 |
| task-03 | 探针7 落 candidate | W3 | P0 | task-01 | FR-01, D-001@v1/D-003@v1/D-005@v1 | 归属行机械写 test-trace.json（orphan 指纹身份） |
| task-04 | verify --done 晋升 | W4 | P0 | task-01 | FR-02, D-003@v1 | 判定列→active/留 candidate/删行 + confirmed 留痕 |
| task-05 | quick ql 行 | W5 | P1 | task-01 | FR-05, D-004@v1 | 窗口测试文件→quicklog 机器面 candidate |
| task-06 | 归档提升 | W6 | P0 | task-01/03 | FR-03/04, D-002@v1 | fr-index 扩展：锚映射+子块 upsert+supersede 同步+重放保护 |
| task-07 | 全量验证门 | W7 | P0 | task-01~06 | 全 FR | test:core+新测试全绿+lint+CLI 端到端手演 |

## 关键路径
task-01 → task-03 → task-06 → task-07（基座→落盘→提升→门）

## 全局硬约束（从 design.md 逐字抄录，绑定所有 task）
- anchor 枚举 = `{FR-<域>-NNN | ql-<id> | null}`；禁 CAP/第四锚空间/第四指纹。
- 两真源仅 src/test-bindings.js 单点解析；不建 knowledge/test-trace/ 目录。
- 预填/机械产物≠确认：未确认行 state=candidate + confirmed_by=null。
- --bind/--unbind：锚可解析+路径存在硬校验；confirmed_by=agent 留痕；writeAtomicSync。
- 机器晋升按 source_change+row_id upsert，内容不变 no-op；不删 agent 行。
- 读侧（跑集/悬空硬错/披露）另案——本变更零预支。
