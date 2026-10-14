---
author: flow-machine-draft
created_at: 2026-10-14T15:33:12.787Z
---
# 任务注册表（Tasks）— 2026-10-14-decision-legacy-renumber

- [x] task-01: 迁移核心 + 测试族——src/decision-renumber.js（planRenumber/applyRenumberPlan 纯函数：fanout 组单一身份、无变更独立发号、原编号插行、字节保留、epoch 零触碰、域起点 max+1）+ index.js CLI 接线 + test/decision-legacy-renumber.test.mjs「①」「②」「④」绿
- [x] task-02: 兼容面——docs-check parseDecisionEntries 读原编号 + isDecisionExempt 认原编号（裸键/域限定键双匹配）+「③」绿；真实库 dry-run 对账（701→597 计划数=底数）
- [x] task-03: 真实库执行与平台迁移——dry-run 留档 → --apply（重跑幂等验证）→ 迁移后全节段可见/图构建/doctor 计数复核 → 提交 → platform sync 推送 + 向量探针验证留档；全量 npm test 零失败 + lint 零 hard fail + 模块卡 changelog
