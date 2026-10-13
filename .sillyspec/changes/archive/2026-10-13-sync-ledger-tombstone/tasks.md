---
author: flow-machine-draft
created_at: 2026-10-13T15:35:34.271Z
---
# 任务注册表（Tasks）— 2026-10-13-sync-ledger-tombstone

- [x] task-01: 新增 src/deleted-ledger.js（appendDeletedLedger fail-open 追加 / lookupDeletedLedger latest-wins 坏行容错），配套单测：落账 roundtrip、损坏行跳过、文件缺失返 null——验证：node --test test/deleted-ledger.test.mjs 相应用例绿
- [x] task-02: change-registry.js deleteChange/unregisterChange 事务提交后追加台账（'deleted'/'archived'），fail-open 不阻断——验证：单测断言台账行存在且 DB 状态照常变更
- [x] task-03: sync.js progressData null 分支查台账，命中终态走 _pushLedgerTombstone 合成最小载荷补推墓碑（quick-* 豁免，best-effort 失败零 errors）——验证：mock 平台 http server 断言 POST body changes[0].status 与返回值
- [x] task-04: index.js platform sync --change 检查 errors 非空 → stderr + exit 1（不带 --change 路径不动）——验证：CLI spawn 退出码断言（存在缺失变更 exit 1）
- [x] task-05: docs/sillyspec/file-lifecycle.md .runtime 清单补 deleted-changes.jsonl 条目——验证：文档条目与实现路径/行为一致
