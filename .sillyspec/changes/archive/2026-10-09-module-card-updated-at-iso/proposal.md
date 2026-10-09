---
author: flow-machine-draft
created_at: 2026-10-09T04:24:04.313Z
---
# 提案书（Proposal）— 2026-10-09-module-card-updated-at-iso

## 动机

任务原话转写：module-docs-sync 给模块卡戳的 updated_at 用 toISOString().slice(0,19) 拼硬编码 '+08:00' 后缀（src/module-impact.js:158）——写入的是 UTC 数字却标称 +08:00 时区，任何机器上解析瞬间恒早 8 小时；且偏移写死 +08:00 不随机器时区。同名字段在 scan 文档（scan-postcheck.js:548,603）的既定口径是全量 toISOString()（带 Z 机器可读 ISO）。诊断 2026-10-09-fourpiece-created-at-local 时顺带发现，遗留待修。

成功标准：
- syncModuleDocSidecars 戳的卡 updated_at 为全量 ISO（toISOString()，带 Z），瞬间正确（解析值=真实写入时刻），不再拼硬编码偏移
- 回归测试：同步后卡 updated_at 经 Date.parse 落在同步前后时刻窗内（旧实现恒偏 8h 必出窗）
- 既有 module-docs-sync 测试面（knife-batch2.test.mjs 等）全绿

## 变更范围

按成功标准机械推导，共 3 条验收面：
1. syncModuleDocSidecars 戳的卡 updated_at 为全量 ISO（toISOString()，带 Z），瞬间正确（解析值=真实写入时刻），不再拼硬编码偏移
2. 回归测试：同步后卡 updated_at 经 Date.parse 落在同步前后时刻窗内（旧实现恒偏 8h 必出窗）
3. 既有 module-docs-sync 测试面（knife-batch2.test.mjs 等）全绿

## 成功标准（可验证）

1. syncModuleDocSidecars 戳的卡 updated_at 为全量 ISO（toISOString()，带 Z），瞬间正确（解析值=真实写入时刻），不再拼硬编码偏移
2. 回归测试：同步后卡 updated_at 经 Date.parse 落在同步前后时刻窗内（旧实现恒偏 8h 必出窗）
3. 既有 module-docs-sync 测试面（knife-batch2.test.mjs 等）全绿
