---
author: qinyi
created_at: 2026-08-10T15:06:03+08:00
change: 2026-08-10-platform-progress-sync
---

# 任务清单（Tasks）— 多用户进度同步到 sillyhub 平台

> 仅列任务名，细节在 plan 阶段展开。按 Wave 划分（design §5：Wave1 地基 → Wave2 下行 → Wave3 冲突）。
> 边界：本 change 纯 SillySpec 客户端侧（D-014）；平台侧 base_ts 冲突检测属 sillyhub 独立 change，本 change 只做 409 响应处理与冲突文件。

## Wave 1：地基（纯本地，可独立测）

- [x] task-01: `src/db.js` schema 加列 `last_synced_platform_ts` / `last_local_modified_ts`（`_migrateAddColumn` 幂等）+ `DB_SCHEMA_VERSION` 3→4 连带三处（D-012）
- [x] task-02: `ProgressManager.serializeForSync()` 六表完整序列化（B1 修正）
- [x] task-03: `ProgressManager.import()` 逆运算 + 事务原子 + 独立 `.bak` snapshot（B2 / D-011）
- [x] task-04: 全写入路径更新 `last_local_modified_ts` 脏度（import 例外重置，D-013）
- [x] task-05: round-trip 测试 serializeForSync→import→serializeForSync 等值 + isolation_* 保留

## Wave 2：下行 pull

- [x] task-06: `SyncManager.pullList()` 两级 pull 第一级（`GET /api/changes` 轻量列表）
- [x] task-07: `SyncManager.pull(changeName)` 两级 pull 第二级（`GET /api/changes/{name}/progress` + 无冲突 import）
- [x] task-08: `local.yaml` `platform` 段加 `user:` 字段（D-004）
- [x] task-09: `sync.js` POST 元字段走 HTTP header（`X-SillySpec-User`/`X-SillySpec-Base-Ts`/`X-SillySpec-Pushed-At`，body 保持裸，D-015）
- [x] task-10: `src/run/shared.js` `triggerPull` 注入（复用 8s 熔断 + Best Effort，D-009）
- [x] task-11: `src/index.js` `platform pull` 子命令

## Wave 3：冲突

- [x] task-12: 双向冲突检测（push 409 响应 + pull 本地脏度比对）+ 写 `.runtime/sync-conflict-<change>.json`
- [x] task-13: `src/index.js` `platform resolve` 三选一子命令（`--keep-local` / `--take-platform` / `--abort`，D-010）
- [x] task-14: `src/index.js` `platform status` 扩展（"本地可能落后"标记 + 未决冲突列表）
- [x] task-15: 冲突状态机 round-trip 测试（clean ↔ conflict → resolved，design §7.5 契约表）
