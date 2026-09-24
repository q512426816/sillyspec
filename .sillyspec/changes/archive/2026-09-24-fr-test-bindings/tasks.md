---
author: qinyi
created_at: 2026-09-24 12:40:00
---
# 任务注册表（Tasks）— 2026-09-24-fr-test-bindings

> Wave 与 plan.md 一致；测试与实现同卡。锚：FR-01..07 见 requirements.md。

## Wave 1（基座，无依赖）
- [x] task-01: src/test-bindings.js 行模型+两真源读写——schema 解析/序列化、
  test-trace.json 读写、条目子块 upsert（source_change+row_id 键、内容不变
  no-op）、quicklog 机器面读写、writeAtomicSync；单测（幂等/取代/原子）。
- [x] task-02: `sillyspec tests` CLI——视图（--anchor/--change）+修理工
  （--bind/--unbind：锚可解析+路径存在硬错、confirmed_by 留痕）；单测。

## Wave 2（写点接线，依赖 task-01）
- [x] task-03: 探针 7 落 candidate——verify-probes 构建矩阵时归属行机械写
  test-trace.json（含 orphan 行 row_id+指纹）；单测。
- [x] task-04: verify --done 晋升——判定列（covered/covered-service→active）
  更新行+confirmed 留痕；partial 留 candidate、uncovered/non-testable 删行；单测。
- [x] task-05: quick --done ql 行——窗口测试文件（isTestPath）机械落 quicklog
  机器面 candidate 行；单测。

## Wave 3（归档提升，依赖 task-01/03）
- [x] task-06: fr-index 归档提升——局部锚→全局锚映射后条目子块 upsert、
  幂等（同源重放零漂移）、supersede 同步绑定 status、蒸馏重放不覆盖绑定字段；单测。
- [x] task-07: 全量验证——test:core+新测试全绿、lint 零失败、
  `sillyspec tests` 端到端手演（bind→view→unbind）。
