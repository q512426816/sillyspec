---
author: qinyi
created_at: 2026-09-09T01:20:00+08:00
plan_level: full
---

# 实现计划（Plan）

## Wave 1（无依赖）
- task-01

## Wave 2（依赖 Wave 1）
- task-02

## Wave 3（依赖 Wave 2）
- task-03

## 任务总表
| 编号 | 任务 | Wave | 优先级 | 依赖 | 覆盖 FR/D | 说明 |
|---|---|---|---|---|---|---|
| task-01 | proposal 档 + section 2 三类分流 | W1 | P0 | — | FR-01, FR-02, D-001@v1, D-002@v1 | plan-adopt-waves.js（mode=proposal/rewritten/conflicts）+ plan-postcheck section 2 重构（validateWaveProposal：waves 覆盖参一致性复跑 + 逐 Wave allowed_paths 交集）+ NEW:test/plan-wave-autoderive.test.mjs 主干 + 修 test/plan-adopt-waves.test.mjs §4/4b |
| task-02 | plan_level 客观复核 | W2 | P1 | task-01 | FR-03, D-003@v1 | plan-postcheck PLAN_LEVEL_SIGNALS 单点 + reviewPlanLevelSignal warning（design 清单数/模块跨度/task 数） |
| task-03 | prompt 与文档收口 | W3 | P1 | task-01, task-02 | FR-04, D-004@v1 | plan.js :431-434 补句 + docs/prompt 镜像（_extract/_sync）+ stages 卡 sidecar + execute 解析零改动锁定断言 |

## 关键路径
task-01 → task-02 → task-03（task-01/02 同文件 plan-postcheck.js 须串行）

## 全局验收标准
1. 新测试全过：三分流各 ≥1 用例 + 幂等 + plan_level warn 分支
2. 既有回归：plan-adopt-waves/plan-postcheck 族全绿（§4/4b 按复审 P1 重锚）
3. execute 解析口径零改动（parseTaskWavesFromPlan 行为锁定）
4. adopt CLI 行为等价（既有命令测试锁定）

## 覆盖矩阵
| ID | 覆盖任务 | 验收证据 |
|---|---|---|
| D-001@v1 | task-01 | AC-1（三分流用例） |
| D-002@v1 | task-01 | AC-1（W 列同步随修复） |
| D-003@v1 | task-02 | AC-1（warn 分支） |
| D-004@v1 | task-03 | AC-3（execute 零改动断言） |
