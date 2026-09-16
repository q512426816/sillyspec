---
plan_level: full
author: qinyi
created_at: 2026-09-16 12:25:00
---

# 实现计划（Plan）

## Spike 前置验证
无 Spike——技术不确定性已定稿（既有探针8 架构实证可挂载、契约解析判据经 Grill 与独立审查双轮修正）。

## Wave 1
- task-01

## Wave 2（依赖 Wave 1）
- task-02
- task-03

## 任务总表
| 编号 | 任务 | Wave | 优先级 | 依赖 | 覆盖 FR/D | 说明 |
|---|---|---|---|---|---|---|
| task-01 | 探针8 契约维度核心——parseDesignContracts + runProbe8PayloadParity 扩展（contractOrphans/missingRequired）+ 渲染段与 metrics 两行 | W1 | P0 | — | FR-01, FR-02, FR-03, FR-05, D-001@v1, D-002@v1 | 既有三提取器与配对策略零触碰；归一化复用 normFieldKey |
| task-02 | 一致性抽查接线——verify-postcheck.js checkProbeConsistency 纳入 probe8 维度（WARNING 级） | W2 | P0 | task-01 | FR-06, D-002@v1 | ed540c6 未接线缺口；gates.js 信封路由通用无需改 |
| task-03 | 测试——NEW:test/probe8-contract-pivot.test.mjs 五用例 | W2 | P0 | task-01 | FR-01~FR-04, D-001@v1, D-002@v1 | 函数级用例只依赖 task-01 导出（与 task-02 并行）；既有 probe8-payload-parity 零触碰 |

## 关键路径
task-01 → task-03（契约维度核心决定测试面；task-02 独立接线可并行）

## 全局验收标准
1. `node --test test/probe8-contract-pivot.test.mjs` 五用例全绿
2. npm test 全量 0 失败（含既有 test/probe8-payload-parity.test.mjs 五组零回归）+ npm run lint 通过
3. 无契约面变更两新维度 skipped + 注记，不产新告警（零噪音）
4. 探针8 渲染段含两新维度行，skipped 不空段；一致性抽查 probe8 走 WARNING 级

## 覆盖矩阵
| ID | 覆盖任务 | 验收证据 |
|---|---|---|
| D-001@v1 | task-01, task-03 | 契约枢纽两维度 + 五用例 |
| D-002@v1 | task-01, task-02, task-03 | 既有零回归（FR-04 用例 3/既有测试）+ 接线 + 渲染扩展 |
