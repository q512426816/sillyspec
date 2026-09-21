---
author: qinyi
created_at: 2026-09-21T23:05:00
plan_level: full
---

# 实现计划（Plan）— 2026-09-21-r5-efficiency-batch3

## Wave 1（并行，P2 与 P4 文件正交）
- task-01
- task-02

## Wave 2（依赖 W1；P1 消费 P2 账本）
- task-03
- task-04

## Wave 3（依赖 W1~W2 全部代码任务）
- task-05

> 依赖说明：task-03（gate --full）的 module 子集实测走 task-02 产出的 test-ledger 复用——W1 先落账本与最小消费接线（gates.js verify 块），W2 再叠 --full 装配（同文件不同区块，Wave 串行天然消冲突）；task-04（complete-handlers.js）与 task-03 不同文件可并行；task-05 镜像重生成须在全部源码面定稿后跑。

## 任务总表

| 编号 | 任务 | Wave | 优先级 | 依赖 | 覆盖 FR/D | 说明 |
|---|---|---|---|---|---|---|
| task-01 | P2 测试结果记账：test-ledger.js 三键指纹（envProfile 探针从 13 环境族测试判定条件源码推导）+账本 IO+fail-closed 语义+消费点接线（gate verify verify-test/quick --done 实测门） | W1 | P0 | — | FR-02, D-001@v1 | 新模块零既有签名变更；三层 fail-closed（键不全/失败不缓存/严格全等）；测试 test-ledger 四态钉 |
| task-02 | P4 M1 缺省开：prompt.js SILLYSPEC_STEP_GUIDE 未设=开/=0 逃生门+stdout 确定性测试族迁移（逐例注记） | W1 | P0 | — | FR-04, D-004@v1 | 翻转后全量零红为硬门；--json 与动态段语义不动 |
| task-03 | P1 gate --full 只读预检档：覆盖 --done 面（module 实测经 P2 复用/reconcile 只读/stage review 缺失探测/quick 同口径）+src/index.js flag 注册；默认档逐字节回归钉 | W2 | P0 | task-01 | FR-01, D-002@v1 | 「--full 绿→--done 不因同因再拦」同引擎 parity 钉 |
| task-04 | P3 归档就绪度前置：verify --done 尾部就绪度报告（未-apply 面 checkOnly+manifest 草拟 round-trip 校验+module-impact 归因草拟，带待确认标记）+apply 即时强提示（main 前进∩交付交集四态）+无发现零附加输出钉 | W2 | P0 | task-01 | FR-03, D-003@v1 | complete-handlers.js 尾部追加；归档门保持全查 |
| task-05 | 文档收口：镜像机械重生成（_extracted.json+DYNAMIC 策展面按需）+模块卡行为行（runtime/stages 域）+changelog+docs-check 重锚 | W3 | P1 | task-01,task-02,task-03,task-04 | FR-01~04 | 镜像只由 _extract.mjs 机械生成禁手编 |

## 执行模式

execution_mode: dispatch（本变更走既有派发流程；P1 建成后下批变更可用 --full 验证自身——本批 W1/W2 两波内任务文件正交）

## 全局硬约束（从 design.md 逐字抄录，绑定所有 task）

- P2 fail-closed 三层：键分量不可得=不复用/失败结果永不缓存/严格全等无模糊无时间窗放宽——宁假红不假绿
- P1 --full 全只读零副作用（账本写入除外）；默认档输出与现状逐字节一致
- P3 草拟永不代 agent 落声明（待确认标记+代写禁令）；归档门保持全查
- P4 逃生门 SILLYSPEC_STEP_GUIDE=0 保留；--json 全量与动态段永不缓存语义不动
- 四道防线判定语义/请求钳/allowed_paths 门禁/状态机步数/DB schema/ceremony 定价零触碰
