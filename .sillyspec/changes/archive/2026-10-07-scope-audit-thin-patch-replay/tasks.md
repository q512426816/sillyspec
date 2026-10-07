---
author: flow-machine-draft
created_at: 2026-10-07T14:50:14.029Z
---
# 任务注册表（Tasks）— 2026-10-07-scope-audit-thin-patch-replay

- [x] task-01: 归档 thin 变更（无 scope-audit.json、有 change-patch.json）跑 scope-audit：计划内文件显示「✓ 计划内」+ 冻结时点真实行数，不再恒「计划未动 0/0」；行数自冻结 patch 按段统计（binary/new/deleted 三档对齐既有口径）
- [x] task-02: 冻结语义：主仓后续演进（新文件/再修改）不进回放表；基点取 meta.baseline；--file 单文件 diff 走冻结 patch 切片（sha256 校验同 A-F01）
- [x] task-03: 既有行为不回归：execute 快照在时快照优先；快照与 change-patch 双缺的归档仍走开放区间兜底+漂移警告（既有断言绿）
- [x] task-04: multi-agent-platform 旧归档 2026-10-07-taskboard-tasks-md 实测：三个计划内文件（backend/app/modules/task/parser.py 等）显示计划内
- [x] task-05: 全量测试绿（含新增回放夹具测试）
