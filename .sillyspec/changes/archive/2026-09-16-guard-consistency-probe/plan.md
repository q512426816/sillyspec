---
plan_level: full
author: qinyi
created_at: 2026-09-16 20:17:00
---

# 实现计划（Plan）

## Spike 前置验证
无 Spike——技术不确定性已定稿（方法体提取/注释掩码/接线点均有 probe8 与 endpoint-extractor 先例可同构）。

## Wave 1
- task-01

## Wave 2（依赖 Wave 1）
- task-02
- task-03

## 任务总表
| 编号 | 任务 | Wave | 优先级 | 依赖 | 覆盖 FR/D | 说明 |
|---|---|---|---|---|---|---|
| task-01 | 探针9 核心实现（三导出+渲染+metrics） | W1 | P0 | — | FR-01, FR-02, FR-03, FR-04, FR-05, D-001@v1 | 纯函数聚类/信号检测+探针入口+fail-soft |
| task-02 | 一致性抽查接线 | W2 | P0 | task-01 | FR-06, D-001@v1 | checkProbeConsistency WARNING 级（probe8 先例同构） |
| task-03 | 五用例测试 | W2 | P0 | task-01 | FR-01~FR-04, D-001@v1 | EHS doSubmit 缩小版 fixture |

## 关键路径
task-01 → task-03（核心决定测试面；task-02 独立接线可并行）

## 全局验收标准
1. `node --test test/probe9-guard-consistency.test.mjs` 五用例全绿
2. npm test 全量 0 失败 + lint 过（探针 1-8 零回归）
3. 无 .java 变更不适用注记不空段；文件级 probe9-skip 豁免生效
4. 一致性抽查 probe9 走 WARNING 级

## 覆盖矩阵
| ID | 覆盖任务 | 验收证据 |
|---|---|---|
| D-001@v1 | task-01, task-02, task-03 | 五用例 + 渲染/metrics + 接线 |
