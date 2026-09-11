---
author: qinyi
created_at: 2026-09-11 10:31:00
plan_level: light
---

# 轻量计划（Light Plan）：摩擦信号计数与收尾提示（friction-signal-hint）

## 来源
brainstorm 已确认（design.md v2，Design Grill independent 两轮：3×P1 修正记 D-006@v1 后双 pass）。核心：借鉴 teamai-cli 摩擦信号设计立场——CLI 状态机埋点计数（gate 回滚/verify 实测失败/审查打回三类），quick/verify --done 收尾非零一行 advisory 提示，全零静默、提示后清零、`friction_hint.enabled` 可关默认开；计数只落 `.runtime` 本机运行时区（D-002 红线）。

## 范围
- NEW:src/friction-tally.js——数据层（record/consume/render/配置读取/路由/静默降级）
- src/run/gates.js——rollbackCompletionAndReturn 尾参 + 13 处调用点标签
- src/run/verify-quality-scan.js——失败判定处记 verify_run_failed（含 advisory lint 失败）
- src/run/complete.js——verify 双 consume 点（completeStep + continueStep）
- src/run/complete-handlers.js——quick 两处失败分支 record + 收尾 consume + prune 清单
- src/config-schema.js——注册 friction_hint.enabled（默认 true）
- NEW:test/friction-tally.test.mjs——单测
- .sillyspec/docs/sillyspec/modules/runtime.md、docs/sillyspec/file-lifecycle.md——文档同步

## 验收
- AC-01: 顺利会话（全零摩擦）quick/verify --done 收尾零新增输出
- AC-02: 摩擦发生后收尾输出恰好一行提示（含各类型次数），计数文件随后不存在
- AC-03: friction_hint.enabled: false 时 record/consume 双直通，.runtime 零新写入
- AC-04: 计数文件两路径（真实变更/quick 会话）均解析进 .runtime 树内，单测断言；文件只含计数/类型/时间戳/预定义标签
- AC-05: 未配置新键默认开，advisory 不阻断任何既有流程（npm test 全绿）
- AC-06: 归档/删变更时 friction-tally-<change>.json 随 pruneArchivedChangeRuntime 清理

## 覆盖矩阵（如存在 decisions.md）
| ID | 覆盖任务 | 覆盖 FR | 验收证据 |
|---|---|---|---|
| D-001@v1 | task-01, task-02, task-03, task-04 | FR-01 | AC-02 |
| D-002@v1 | task-01 | FR-03 | AC-04 |
| D-003@v1 | task-01, task-03, task-04, task-05 | FR-02, FR-04 | AC-01/02/03 |
| D-004@v1 | task-01, task-02, task-03 | FR-01 | AC-02/04 |
| D-005@v1 | task-01 | FR-03 | AC-04 |
| D-006@v1 | task-02, task-03, task-04 | FR-02, FR-05 | AC-02/06 |

FR 总览：FR-01（计数）→ task-01/02/03；FR-02（收尾提示与清零）→ task-03/04；FR-03（落点红线）→ task-01/07；FR-04（配置开关）→ task-01/05；FR-05（归档清理）→ task-04/07。
