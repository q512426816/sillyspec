---
author: qinyi
created_at: 2026-09-24
---

# 任务清单（Tasks）

- [x] task-01: 账本模块（NEW:src/run/gate-snapshot-ledger.js）+ 守卫/TTL×pid 三态/双清销账单测
- [x] task-02: cleanup 硬化（抽出可注入 cleanupSnapshot：rmSync 重试+prune 兜底）+ 故障注入测试（NEW:test/gate-snapshot-cleanup.test.mjs）
- [x] task-03: runtimeRoot 透传+create 前回收接线+三路径双清确认销账
- [x] task-04: doctor 泄漏维度 detectGateSnapshotLeak（warning 级，阈值 env/24h，零新增参数面）+ 单测
- [x] task-05: 文档同步（runtime 模块卡/changelog、file-lifecycle 登记）+ 新测试入 test:core
