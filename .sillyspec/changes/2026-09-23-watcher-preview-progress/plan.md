---
plan_level: full
execution_mode: main  # dispatch=子代理派发（判据见「执行模式声明」；缺省 main 直写——R7/R8 对撞实证）
---

# 实现计划：watcher 预览进度账本

> change: 2026-09-23-watcher-preview-progress
> 复杂度：unit-sufficient（单仓 5 文件面，core-engine+runtime+cli-entry 三模块；设计已把接口/边界/验收定死，实现期无开放式裁决）

## 全局硬约束（逐字抄录自任务书/design）

1. 预览行永不进 gate/fake-check/审批判定输入面（D-006 红线，FR-08 常驻测试钉）。
2. watcher 写纪律：短连接 + fail-open + 存在性条件进 SQL（cli 行 SQL 层不可中招）（D-005）。
3. 读侧保险丝单点：DB 查询层缺省 `authority='cli' OR IS NULL`，消费者零改动（D-003）。
4. 迁移幂等 fail-closed；加列对旧读无害（design §2）。
5. serializeForSync 平台载荷零变化（D-007，测试钉含此项）。
6. 写放大 maxRows=8；每轮写耗时 <50ms（非功能）。
7. tasks.md 勾选与提交规范走既有 wt-commit 链。
8. 预览粒度=阶段级，steps 级不做（D-004）。

## Wave 1

- task-01

## Wave 2

- task-02
- task-03

（t02/t03 文件零交集可并行；本 plan main 直写按 t02→t03 串行执行。）

## Wave 3

- task-04

（progress.js 与 W1/W2 分波串行——同文件不共 Wave。）

## Wave 4

- task-05

## 任务总表

| ID | 标题 | depends_on | blocks | 模块 |
|---|---|---|---|---|
| task-01 | 权威列迁移+读侧保险丝+走查钉 | — | task-02/03/04 | core-engine |
| task-02 | 投影纯函数+短连接写入+watcher 接线 | task-01 | task-05 | runtime |
| task-03 | --preview 出口+handoff 段 | task-01 | task-05 | cli-entry |
| task-04 | 归档 GC | task-01 | task-05 | core-engine |
| task-05 | 测试收口+隔离钉+冒烟 | task-02,03,04 | — | 全域 |

关键路径 task-01→02→05；task-03/04 与 task-02 无共享文件可并行（本 plan main 直写串行执行）。
