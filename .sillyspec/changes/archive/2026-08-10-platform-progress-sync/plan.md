---
author: qinyi
created_at: 2026-08-10T15:06:03+08:00
change: 2026-08-10-platform-progress-sync
plan_level: full
---

# 实现计划（Plan）— 多用户进度同步到 sillyhub 平台

## Spike 前置验证

无技术不确定性——SQLite 加列（`_migrateAddColumn` 幂等已有）、HTTP 调用（`fetchJson` 已有）、JSON 序列化逆运算（确定性）均为已验证技术，跳过 Spike。

## Wave 重排说明

execute 强制同 Wave 子代理并行（execute.js:603），同 Wave 内 allowed_paths 重叠会被互相覆盖。本变更改动高度集中于 `src/progress.js` / `src/sync.js` / `src/index.js` 三个文件（各被 4~9 个 task 共享），故 Wave 按「同 Wave 内 allowed_paths 互不重叠」重排：共享同一文件的 task 分到不同 Wave 串行执行；同 Wave 只放文件隔离的 task。结果本变更基本串行——这与「schema → serialize → import → 脏度 → pull → header → 冲突」的强依赖链一致。

## Wave 1

- [x] task-01: `src/db.js` schema 加列 `last_synced_platform_ts` / `last_local_modified_ts` + `DB_SCHEMA_VERSION` 3→4 连带三处（覆盖：D-012, FR-02, FR-05）
- [x] task-08: `local.yaml` `platform` 段加 `user:` 字段（覆盖：D-004, FR-08）

## Wave 2

- [x] task-02: `ProgressManager.serializeForSync()` 六表完整序列化（覆盖：D-005@v2, FR-07）

## Wave 3

- [x] task-03: `ProgressManager.import()` 逆运算 + 事务原子 + 独立 `.bak` snapshot（覆盖：D-005@v2, D-011, FR-07）
- [x] task-09: `sync.js` POST 元字段走 HTTP header（覆盖：D-015, FR-08, FR-09）

## Wave 4

- [x] task-04: 全写入路径更新 `last_local_modified_ts` 脏度（覆盖：D-008, D-013, FR-05）
- [x] task-06: `SyncManager.pullList()` 两级 pull 第一级（覆盖：D-001, D-006, FR-01, FR-03）

## Wave 5

- [x] task-05: round-trip 测试 serializeForSync→import→serializeForSync 等值（覆盖：D-005@v2, FR-07）

## Wave 6

- [x] task-07: `SyncManager.pull(changeName)` 两级 pull 第二级（覆盖：D-001, D-006, D-014, FR-01, FR-03, FR-09）

## Wave 7

- [x] task-10: `src/run/shared.js` `triggerPull` 注入（覆盖：D-009, FR-04, FR-06）
- [x] task-12: 双向冲突检测 + 写 `.runtime/sync-conflict-<change>.json`（覆盖：D-002, D-008, D-010, FR-05）

## Wave 8

- [x] task-11: `src/index.js` `platform pull` 子命令（覆盖：D-006, D-009, FR-03）

## Wave 9

- [x] task-13: `src/index.js` `platform resolve` 三选一（覆盖：D-002, D-010, D-013, FR-05）

## Wave 10

- [x] task-14: `src/index.js` `platform status` 扩展（覆盖：D-002, D-010, FR-05）

## Wave 11

- [x] task-15: 冲突状态机 round-trip 测试（覆盖：D-002, D-010, FR-05）

## 任务总表

| 编号 | 任务 | Wave | 优先级 | 依赖 | 覆盖 FR/D | 说明 |
|---|---|---|---|---|---|---|
| task-01 | schema 加两列 + bump | W1 | P0 | — | FR-02/05, D-012 | db.js:10/203 + shared.js:30 + progress.js:226/350 四处一致 |
| task-02 | serializeForSync 六表序列化 | W2 | P0 | task-01 | FR-07, D-005@v2 | 含 changes 投影列排除 isolation_*（B2） |
| task-03 | import 逆运算 + 事务原子 + .bak | W3 | P0 | task-01,02 | FR-07, D-005@v2/D-011 | 独立 .bak 路径 `.runtime/sillyspec.db.pre-import-<ts>.bak` |
| task-04 | 全写入路径脏度更新 | W4 | P0 | task-01 | FR-05, D-008/D-013 | 八处写入路径 + import 例外重置 |
| task-05 | round-trip 测试 | W5 | P0 | task-02,03,04 | FR-07 | serialize→import→serialize 等值 + isolation 保留 |
| task-06 | pullList 轻量列表 | W4 | P1 | task-03 | FR-01/03, D-001/D-006 | GET /api/changes |
| task-07 | pull 单 change 完整 | W6 | P0 | task-03,06 | FR-01/03/09, D-001/D-006/D-014 | GET 完整 JSON + 无冲突 import |
| task-08 | local.yaml user 字段 | W1 | P1 | — | FR-08, D-004 | `.sillyspec/local.yaml` platform 段 |
| task-09 | POST header 元字段 | W3 | P0 | task-02,08 | FR-08/09, D-015 | body 保持裸 JSON 零回归 |
| task-10 | triggerPull 注入 | W7 | P1 | task-07,09 | FR-04/06, D-009 | 复用 8s 熔断 + Best Effort |
| task-11 | platform pull 子命令 | W8 | P1 | task-06,07 | FR-03, D-006/D-009 | index.js platform case |
| task-12 | 双向冲突检测 + 冲突文件 | W7 | P0 | task-04,07,09 | FR-05, D-002/D-008/D-010 | 409 处理 + 本地脏度比对 |
| task-13 | platform resolve 三选一 | W9 | P0 | task-03,12 | FR-05, D-002/D-010/D-013 | --keep-local/--take-platform/--abort |
| task-14 | platform status 扩展 | W10 | P2 | task-12 | FR-05, D-002/D-010 | 落后标记 + 未决冲突列表 |
| task-15 | 冲突状态机测试 | W11 | P0 | task-12,13 | FR-05, D-002/D-010 | clean↔conflict→resolved 契约表 |

## 关键路径

task-01 → task-02 → task-03 → task-07 → task-12 → task-13（最长链，决定最短交付周期）

## 全局验收标准

- [ ] `npm test` 全量通过（含新增 round-trip + 冲突状态机测试）
- [ ] `npm run lint` 通过
- [ ] （brownfield）未连接平台（无 `local.yaml` platform 段）时 `sync`/`pull`/`triggerPull` 全部跳过，行为与现状完全一致
- [ ] （brownfield）旧 schema 3 DB 幂等加列，新列默认 NULL，不破坏在途 change
- [ ] （兼容）POST body 保持裸 JSON，sillyhub 老版（忽略 header）继续工作零回归
- [ ] import 后 `last_local_modified_ts = last_synced_platform_ts`（D-013 例外），下次 pull 不误判冲突
- [ ] 冲突文件 resolve 后必清，不累积（R-04）

## 覆盖矩阵

| ID | 覆盖任务 | 验收证据 |
|---|---|---|
| D-001@v1 | task-06,07 | AC：pullList/pull 走 {url}/api/changes |
| D-002@v1 | task-12,13 | AC：冲突写 sync-conflict-<change>.json + resolve 三选一 |
| D-003@v1 | 交付方式 | AC：单 change 内部 wave 拆分 |
| D-004@v1 | task-08,09 | AC：local.yaml user 字段 → X-SillySpec-User header |
| D-005@v2 | task-02,03,05 | AC：serializeForSync 六表 + import 选择投影列保留 isolation |
| D-006@v1 | task-06,07,11 | AC：两级 pull 轻量列表 + 按需单 change |
| D-007@v1 | task-01,04 | AC：platform_last_sync 语义变更向后兼容 |
| D-008@v1 | task-04,12 | AC：last_local_modified_ts 双向脏度检测 |
| D-009@v1 | task-10,11 | AC：triggerPull 时机注入 |
| D-010@v1 | task-12,13,14,15 | AC：resolve --abort 语义 |
| D-011@v1 | task-03 | AC：独立 .bak 路径不抢 _openWithFallback |
| D-012@v1 | task-01 | AC：DB_SCHEMA_VERSION 四处一致 |
| D-013@v1 | task-04,13 | AC：全写入路径脏度 + import 例外 |
| D-014@v1 | task-07,12 | AC：sillyhub 独立 change，本 change 客户端侧 |
| D-015@v1 | task-09 | AC：header 方案 body 裸 JSON 零回归 |

> 全部 D-001~D-015 当前版本已覆盖（D-005@v1 已被 v2 superseded，只引用 v2）。requirements.md 剩余风险 R-A（renameChange/unregisterChange 脏度路径）与 R-B（last_local_modified_ts 上行 dormant）在 task-04 落地时细化核对。
