---
author: qinyi
created_at: 2026-08-10T22:32:00+08:00
change: 2026-08-10-platform-progress-sync
---

# 模块影响分析（Module Impact）— 多用户进度同步到 sillyhub 平台

## 触及模块与改动概要

| 模块 | 文件 | 改动概要 | 模块文档同步 |
|---|---|---|---|
| progress（进度库核心） | `src/db.js` | schema 加列 `last_synced_platform_ts` + `last_local_modified_ts`（`_migrateAddColumn` 幂等）；`DB_SCHEMA_VERSION` 3→4 四处一致（db.js:10/203 + shared.js:30 + progress.js:350） | ⚠️ 需同步 `docs/sillyspec/file-lifecycle.md`（DB schema 变更，CLAUDE.md 文件生命周期文档同步） |
| progress（进度库核心） | `src/progress.js` | 新增 `serializeForSync()`（六表完整序列化）+ `import()`（逆运算，事务原子，独立 .bak）+ `_touchLocalModified()` 脏度 helper；保 isolation 投影列 | ⚠️ 需同步 file-lifecycle.md（新增运行时文件类型 `.runtime/sillyspec.db.pre-import-<ts>.bak`） |
| progress（进度库核心） | `src/progress/change-registry.js` `src/progress/step-store.js` `src/progress/stage-machine.js` `src/progress/shared.js` | 全写入路径更新 `last_local_modified_ts` 脏度（registerChange/updateChangeIsolation/_updateApprovalStatus/renameChange/unregisterChange/setStage/addStep/updateStep/updateBatchProgress/completeStage/reset） | — |
| sync（平台同步） | `src/sync.js` | 新增 `pullList()`/`pull()` 两级 pull + `_writeConflictFile`/`readConflictFile`/`clearConflictFile` 冲突文件 helper + `resolve()` 三选一 + `collectStatus()`/`listConflictFiles()` + POST header 元字段（`fetchJsonWithStatus` 识别 409）+ `resolvePlatformUser` | ⚠️ 需同步 file-lifecycle.md（新增运行时文件类型 `.runtime/sync-conflict-<change>.json`） |
| core-engine（运行框架） | `src/run/shared.js` | 新增 `triggerPull()`/`triggerPullActiveChange()`（8s 熔断、Best Effort、未连接跳过），注入 CLI 启动 + approve 前 | — |
| cli-entry（CLI 入口） | `src/index.js` | platform case 新增 `pull`/`resolve` 子命令 + `status` 扩展（落后标记 + 未决冲突列表）+ stage case block 注入 triggerPullActiveChange | — |

## 不触及模块（守界确认）

- **sillyhub-mcp/**（任务派发层 createMission/dispatchWorker/converge_mission）— 完全不碰（D-004 铁律）
- **src/stages/**（阶段定义）— 不碰（本变更不改 stage 流转/prompt）
- **src/run/prompt.js**（提示词注入）— 不碰（无 persona/铁律/占位符改动）

## 需同步的文档（CLAUDE.md 文件生命周期文档同步）

- `docs/sillyspec/file-lifecycle.md`：
  - DB schema 版本 3→4，changes 表加两列
  - 新增运行时文件 `.runtime/sillyspec.db.pre-import-<ts>.bak`（import snapshot）
  - 新增运行时文件 `.runtime/sync-conflict-<change>.json`（冲突持久化，resolve 后清理）
- `.claude/skills/`（若 SKILL 涉及 platform 子命令清单，补 pull/resolve）

## 文档同步结果（archive step 3 落实）

| 目标 | 落实 |
|---|---|
| `docs/sillyspec/file-lifecycle.md` | ✅ line 75 运行时清单加 sync-conflict-*.json + sillyspec.db.pre-import-*.bak；line 107 sillyspec.db 段补 schema v4 + 两列语义 + import .bak；新增"platform sync/pull 冲突命中"文件流段；updated_at → 2026-08-10T22:40 |
| `.sillyspec/docs/sillyspec/modules/sync.md` | ✅ 对外接口加 pullList/pull/resolve/collectStatus/listConflictFiles/冲突文件 helper + 顶层 pull/pullList/resolve/collectStatus；关键数据流加 pull/双向冲突/header；依赖加 readdirSync；变更索引加本变更行 |
| `.sillyspec/docs/sillyspec/modules/cli-entry.md` | ✅ 变更索引加 platform pull/resolve/status 子命令 + triggerPullActiveChange 注入 |
| `.sillyspec/docs/sillyspec/modules/core-engine.md` | ✅ 变更索引加 triggerPull/triggerPullActiveChange + db schema v4 + serializeForSync/import/脏度 |
| `.claude/skills/` | ⚠️ 未同步（本变更未改 src/stages/* prompt，SKILL 的 platform 子命令清单若有需手动补 pull/resolve——非阻塞，SKILL 对外纯净性约束） |

## 跨仓库边界（D-014）

本变更纯 SillySpec 客户端侧。sillyhub 后端（GET /api/changes 轻量列表 + GET /api/changes/\<name\>/progress + POST 409 冲突响应 + base_ts 检测算法）属 sillyhub 仓库独立 change，本变更不碰。
