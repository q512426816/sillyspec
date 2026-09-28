---
author: t
created_at: 2026-09-28 18:06:30
plan_level: full
execution_mode: main
---

# 实现计划（Plan）

## Wave 1（并行，无依赖）
- task-01
- task-02

## Wave 2（依赖 Wave 1）
- task-03
- task-04
- task-05

> batch: 无并批（task-03/04/05 文件正交但单会话 main 直写串行执行，无墙钟诉求；接受并批护栏提示如出现）

## 任务总表
| 编号 | 任务 | Wave | 优先级 | 依赖 | 覆盖 FR/D | 说明 |
|---|---|---|---|---|---|---|
| task-01 | route-hindsight 模块（指标/阈值/落库/读取）＋单测 | W1 | P0 | — | FR-02, D-001, D-003, D-005 | 封闭面指标四元组，无任何语义判定 |
| task-02 | brainstorm Step4/5 指引模板加机制词检索动作 | W1 | P1 | — | FR-03, D-004 | 指引面：固定动作+例词标注「举例」 |
| task-03 | flow.js 前门盘问渲染＋hindsight 提示注入＋收口指标接线＋单测 | W2 | P0 | task-01 | FR-01, FR-02, D-001, D-002, D-005 | 同文件改动合一卡（前门 FR-01＋后门接线 FR-02）；adopt/resume 不进前门 |
| task-04 | complete.js 方案步 --done 门检索回显＋config-schema 逃生阀＋单测 | W2 | P1 | — | FR-03, D-004 | warn 不阻断；commands.knowledge-gate: off 可关 |
| task-05 | agents-instruction.md 选道表/速查行改写＋package.json 版本 bump | W2 | P1 | — | FR-01, D-001 | 模板传播靠版本感知 init 刷新 |

## 关键路径
task-01 → task-03（route-hindsight 导出面是 flow.js 接线的消费契约）

## 全局硬约束（从 design.md 逐字抄录，绑定所有 task）
- 需求清晰度机器语义判定禁区：指标 MUST 全封闭面（diff 比例与计数），MUST NOT 引入任何关键词/词表语义判定（D-003 rejected）
- 前门 MUST NOT 阻断流程、MUST NOT 要求新增 --input 节或声明 flag（D-005）
- adopt（头脑风暴收编）、resume（重入恢复）与既有变更路径 MUST NOT 出现选道自检段
- 无 hindsight 文件的仓 flow start 输出 MUST 与现状完全一致（新装零影响）
- 清晰度门既有格式判定（exit 2 两选一）行为逐字保留
- 并行会话在改 src/flow-draft.js——本变更零改该文件；提交一律显式 pathspec
- Node ≥ 22.13.0；ESM（.js 导入带扩展名）；Windows/Linux/macOS 路径与换行兼容（hindsight json 读写跨平台）

## 全局验收标准
1. 所有单元测试通过（新增三件 + flow 系既有回归全绿：npm run test:core）
2. lint 通过（npm run lint）
3. （brownfield）无 hindsight 标记/未升级模板的仓行为与现状完全一致
