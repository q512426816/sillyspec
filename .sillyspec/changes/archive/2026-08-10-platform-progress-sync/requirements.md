---
author: qinyi
created_at: 2026-08-10T15:06:03+08:00
change: 2026-08-10-platform-progress-sync
---

# 需求规格（Requirements）— 多用户进度同步到 sillyhub 平台

> 覆盖 decisions.md 全部当前版本 D-001~D-015。每条 FR 标注覆盖的 D-xxx@vN；未单独覆盖的 D 标注剩余风险。表名/字段名/类名来自真实代码或标注"新增"。

## 功能需求

### FR-01：平台聚合可见性
同一项目多用户本地进度聚合到 sillyhub 平台，一处看全局。
- 覆盖：D-001@v1（平台后端=sillyhub）
- 验收：`GET /api/changes` 返回 `[{name, current_stage, last_pushed_at, last_pusher}]` 轻量列表；sillyhub 后端改动属独立 change（D-014），本 change 仅固化 HTTP 契约（design §7）

### FR-02：死字段复用
现有 `changes.platform_last_sync`（只写不读死字段，`src/progress/change-registry.js:92 _updatePlatformLastSync`）复用，改语义为"上次同步完成时刻"（本地时钟）。
- 覆盖：D-007@v1
- 验收：旧值落新语义内向后兼容，NULL/旧值视为"从未同步"，首次 push `base_ts=NULL` 平台接受（design §9）

### FR-03：两级 pull 控性能
先 `GET /api/changes` 轻量列表（几 KB），CLI 比对本地决定哪些 change 需更新，再 `GET /api/changes/{name}/progress` 按需拉完整 JSON。
- 覆盖：D-006@v1
- 验收：`SyncManager.pullList()` + `pull(changeName)` 两级（design §7）

### FR-04：pull 时机
CLI 启动（`run`/`--done`）拉一次 + 关键决策点（`approve`/`archive` 前）拉一次 + 手动 `platform pull`；不在每步 pull。
- 覆盖：D-009@v1
- 验收：`src/run/shared.js` 加 `triggerPull`（复用 8s 熔断、Best Effort），与现有 `triggerSync`（stage 边界 + step debounce）对称

### FR-05：冲突 b 策略（双向检测 + 强制提示，禁止字段级 auto-merge）
同 change 冲突走 change 级 last-write-wins + 冲突检测 + 强制提示决策（绝不字段级 auto-merge）：
- 写 `.runtime/sync-conflict-<change>.json`
- `platform resolve` 三选一：`--keep-local`（base_ts 设为**平台当前 last_pushed_at**，保留本地 DB 不 import）/ `--take-platform`（import 平台 JSON 覆盖本地）/ `--abort`（放弃本次同步，清冲突文件，DB 不变，base_ts 不更新）
- 双向检测：push 平台侧 base_ts（`changes.last_synced_platform_ts` 新列）+ pull 本地侧脏度（`changes.last_local_modified_ts` 新列）
- 覆盖：D-002@v1（b 策略）、D-008@v1（脏度列）、D-010@v1（resolve --abort）、D-013@v1（全写入路径脏度触发，import 例外重置）
- 验收：冲突文件正确生成/清理；resolve 三选一语义如 design §7.5 契约表；绝不字段级 auto-merge

### FR-06：triggerPull 注入
`triggerPull` 在 `src/run/shared.js` 实现，时机见 FR-04。
- 覆盖：D-009@v1
- 验收：复用 8s 熔断 + Best Effort `console.warn` 不抛（CONVENTIONS #4）

### FR-07：serializeForSync + import（B1/B2 修正）
- 新增 `ProgressManager.serializeForSync(changeName, {cwd})`：六表完整序列化（project/changes/stages/steps/batch_progress/approvals），changes 行只投影流程进度列（current_stage/status/last_active/last_synced_platform_ts/last_local_modified_ts，排除 isolation_*/platform_change_id/workspace_id/sync_enabled/created_at）
- 新增 `ProgressManager.import(progressObj, changeName, {cwd})`：serializeForSync 逆运算，单事务原子写 stages/steps/batch_progress/approvals；changes 行 UPDATE 选择投影列保留 isolation_*；import 前 `copyFileSync` 到独立 `.runtime/sillyspec.db.pre-import-<ts>.bak`（不抢 `_openWithFallback` 的 `${dbPath}.bak`，D-011）；import 后 `last_synced_platform_ts = progressObj.pushed_at` 且 `last_local_modified_ts = progressObj.pushed_at`（D-013 例外，不更新 now()）；失败 throw 中文 + .bak 不可恢复 fail-loud
- 覆盖：D-005@v2（import 粒度 + serializeForSync + changes 排除 isolation，supersedes D-005@v1，B1/B2 修正）、D-011@v1（独立 .bak 路径）
- 验收：round-trip 测试 serializeForSync→import→serializeForSync 等值；isolation_* 本地状态不被覆盖

### FR-08：user 身份区分多用户
`local.yaml` 的 `platform` 段加 `user:` 字段（与 url/token 同处，零新增配置体系）。
- 覆盖：D-004@v1
- 验收：push 走 `X-SillySpec-User` header（D-015），sillyhub 存 last_pusher / 轻量列表返回

### FR-09：sillyhub 后端 GET 端点（独立 change，本 change 不阻塞）
`GET /api/changes` + `GET /api/changes/{name}/progress` + 聚合存储 + base_ts 冲突检测 + POST header 读取 + 落盘灾备。
- 覆盖：D-001@v1、D-014@v1（拆独立 change 另排期，B3"不阻塞"）、D-015@v1（POST header 方案，sillyhub 读 header；不读也不影响 body 解析，老版继续工作零回归）
- 验收：本 change 仅 SillySpec 客户端侧（serializeForSync/import/pull/resolve/schema 加列/triggerPull/user）；sillyhub 端验收属独立 change；sillyhub 未就绪时 pull Best Effort 降级保本地可用

## schema 变更需求

`changes` 表加两列（**新增**，`src/db.js _migrateAddColumn` 幂等）：`last_synced_platform_ts`（TEXT ISO，base_ts，首次同步 NULL）、`last_local_modified_ts`（TEXT ISO，本地脏度，全写入路径末尾更新，首次 NULL=无脏度）。`DB_SCHEMA_VERSION` 3→4，**连带三处**（D-012）：`src/db.js:10` + `src/db.js:205 project.schema_version DEFAULT` + `src/progress/shared.js:30 CURRENT_VERSION` + `src/progress.js:350 _version`。

## 决策覆盖检查（D-001~D-015）

| 决策 | 覆盖 FR | 状态 |
|---|---|---|
| D-001@v1 平台后端=sillyhub | FR-01 / FR-09 | accepted |
| D-002@v1 冲突=b 强制提示 | FR-05 | accepted |
| D-003@v1 一步到位交付 | 交付方式（wave1-3 不拆 change，非 FR） | accepted |
| D-004@v1 user=local.yaml | FR-08 | accepted |
| D-005@v2 serializeForSync+import 粒度 | FR-07 | accepted（supersedes v1，B1/B2） |
| D-006@v1 两级 pull | FR-03 | accepted |
| D-007@v1 platform_last_sync 改语义 | FR-02 | accepted |
| D-008@v1 last_local_modified_ts 脏度 | FR-05 | accepted |
| D-009@v1 triggerPull 时机 | FR-04 / FR-06 | accepted |
| D-010@v1 resolve --abort 语义 | FR-05 | accepted |
| D-011@v1 import 独立 .bak 路径 | FR-07 | accepted |
| D-012@v1 schema bump 连带三处 | schema 变更 | accepted |
| D-013@v1 脏度全写入路径（import 例外） | FR-05 | accepted |
| D-014@v1 scope SillySpec 先行 | FR-09（边界） | accepted |
| D-015@v1 POST 元字段走 header | FR-08 / FR-09 | accepted |

**全部 D-001~D-015 当前版本已覆盖，无遗漏决策。** D-005@v1 已被 @v2 取代，D-005@v2 为当前版本。

## 剩余风险（plan 阶段细化，非 FR 缺口）

- **R-A**：`renameChange`/`unregisterChange` 写入路径是否需补 `last_local_modified_ts` 更新（Design Grill 复审 P2 gap #22）——plan 阶段读 `src/progress/` 子模块定位所有写入方法核对 D-013
- **R-B**：`last_local_modified_ts` 上行平台是否 dormant（复审 P2 gap #23）——plan 阶段定 serializeForSync 是否投影该列给平台（design §8 投影契约当前含该列）
- R-01（sillyhub 排期）/R-02（base_ts 极端并发）/R-03（import 并发竞争）/R-05（platform_last_sync 语义变更）/R-06（schema 版本漂移）/R-08（.bak 冲突）见 design §10 风险登记，plan 阶段任务化应对
