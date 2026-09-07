---
author: qinyi
created_at: 2026-09-07T23:02:00+08:00
---

# 任务注册表（Tasks）— 2026-09-07-ir-hardening

> 唯一真相表：Wave 结构与依赖见 plan.md（Wave 段纯 ID 引用）；本表是任务清单与勾选状态。

- [x] task-01: 闸门层——IR_STRICT_SINCE 常量 + getChangeCreatedAt 访问器 + isStrictChange helper (depends_on: )
- [x] task-02: P3b 收紧——checkProbeConsistency strictMode 档 + gates envelope/print 接线 (depends_on: task-01)
- [x] task-03: P3a 收紧——reconcileTargetFiles 主仓卡全零声明 strictViolation 档 + gates 接线 (depends_on: task-01)
- [x] task-04: design 清单核验——validateDesignFileList（glob/占位/NEW: 分级）+ brainstorm 末步接线 (depends_on: )
- [x] task-05: delta 手动补跑 project 同口径修复 (depends_on: )
- [x] task-06: buildDeltaReport withSummary + last-delta sidecar 两路径写入 + scanResumeCheck advisory (depends_on: task-05)
- [x] task-07: docs check --fix 修复回执（前/重锚/后失效数） (depends_on: )
- [x] task-08: 引用类诊断 supportedFixes 可执行化（--suggest no-op 清理） (depends_on: )
- [ ] task-09: 测试四件——ir-strict-mode / design-file-list-gate / delta-scan-feedback / docs-fix-receipt（含 grill 补的 4 场景） (depends_on: task-02, task-03, task-04, task-06, task-07)
- [x] task-10: 文档同步——file-lifecycle 注记 + module-impact + 全量 lint/test 回归 (depends_on: task-09)
