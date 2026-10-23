---
author: flow-machine-draft
created_at: 2026-10-23T06:18:15.554Z
---
# 任务注册表（Tasks）— 2026-10-23-rename-platform-tombstone

- [x] task-01: 写测试 test/rename-ledger-tombstone.test.mjs（FR-01 落账含目录缺失分支 / FR-02 旧名 sync 合成墓碑 POST / FR-03 失败不落账），先跑红
- [x] task-02: 实现 renameChange 成功路径 appendDeletedLedger(旧名,'deleted') + ✅ 后 ℹ️ 台账提示行；deleted-ledger.js 头注释补 rename 写入方
- [x] task-03: 新测试 + test/deleted-ledger.test.mjs 回归全绿；显式 pathspec 提交交付（消息带 task-01/02/03）
- [ ] task-04: multi-agent-platform 仓存量清理：台账补记 2026-10-23-new-change-43a74c51(deleted) → platform sync --change exit 0（回执预埋提交消息）；坑11 文档落该仓 docs/sillyspec/finished/ 并按该仓轻量道收口
