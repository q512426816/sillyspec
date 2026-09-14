---
plan_level: full
---

# 实现计划（Plan）

## 来源
brainstorm 四件套（Grill 复核 passed，P1-1 consume 侧滚动修订版）。

## Wave 1（并行，无依赖）
- task-01
- task-02

## 任务总表
| 编号 | 任务 | Wave | 优先级 | 依赖 | 覆盖 FR/D | 说明 |
|---|---|---|---|---|---|---|
| task-01 | 字段链 | W1 | P0 | — | FR-01, D-001@v2 | brainstorm.js 三处模板可选行（:165-176/:425-437/:570-596）；distill applyField+FIELD_LABEL_RE 双触点+renderBlockLines 携带；stage-contract validate{Brainstorm,Plan}Outputs warnings 软警告（architecture+accepted 缺字段，:341-357/:393-399 先例） |
| task-02 | 台账+税面 | W1 | P0 | — | FR-02, FR-03, D-001@v1+@v2 | NEW:src/friction-ledger.js 纯函数（read/merge/roll+quick 会话 consume 点:1677 明确不入台账）；complete.js 两处（空 counts 跳过） verify 收尾 consume 后 merge-by-change 主滚动（锁+原子写+≤200 掐头）；prune 兜底（残余 events[type].count merge+archivedAt+ledgerAppend 返回）；doctor self_maintenance_tax 维度（severity 语义：聚合 pass:true、阈值≥3 WARNING、runtimeRoot 同源） |

## 关键路径
task-01 ∥ task-02（全并行）

## 全局验收标准
1. 全量 npm test 0 fail（含两个新测试文件）
2. 字段端到端双证据：tax-governance-fields.test.mjs fixture 断言（机器验收）+ 本变更 D-001@v2 已补写字段（真蒸馏携带作活体观察——highestByNumber 只落最高版本，v1 字段不随蒸馏）
3. 台账：构造非零 tally 走 consume 路径后台账 merge 正确、reopen 重跑不双计、prune 落 archivedAt
4. brownfield：存量条目/无台账/坏文件全 fail-soft 零阻断

## 覆盖矩阵（如存在 decisions.md）
| ID | 覆盖任务 | 验收证据 |
|---|---|---|
| D-001@v1 | task-01, task-02 | AC-2（字段端到端）、AC-3（台账） |
| D-001@v2 | task-02 | AC-3（merge-by-change+锁） |
