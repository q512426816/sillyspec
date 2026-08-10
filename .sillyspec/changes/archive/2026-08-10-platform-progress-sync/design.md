---
author: qinyi
created_at: 2026-08-10T14:19:54+08:00
change: 2026-08-10-platform-progress-sync
scale: large
tier: independent
status: draft
---

# 设计文档（Design）— 多用户进度同步到 sillyhub 平台

## 1. 背景

SillySpec 的进度库 `.sillyspec/.runtime/sillyspec.db`（better-sqlite3 WAL，**非** PROJECT.md 过时描述的 sql.js）是流程状态（stage/step/approvals/batch/isolation）的**唯一 source of truth**，但被 `.gitignore` 忽略，各用户本地各自一份、互不可见。

现有 `src/sync.js` 的 `SyncManager` 仅提供**单向上行**（`POST /api/changes/{name}/progress` 推 `ProgressManager.read()` 全量进度 + 四件套文档），每步 `_write` 后由 `run/shared.js triggerSync` 自动触发（8s 熔断，平台模式跳过）。**无下行 pull、无多用户合并、无冲突处理**；`changes` 表的 `platform_change_id/workspace_id/last_sync/sync_enabled` 四个字段是死占位（只写不读）。

需求：同一项目进度在 sillyhub 平台统一可见；多用户可拉取平台进度覆盖本地；处理张三/李四各有更新的合并。约束：SQLite 原生不支持远端连接（嵌入式本地库）；DB 是进度态唯一 SoT，**不能从 `changes/` md 文件重建**（`doctor-diagnostics.js` 全模块只读、`dumpDb` 是 DB→JSON 单向导出无逆操作）。

## 2. 设计目标

- **平台统一可见**：多用户本地进度聚合到 sillyhub 平台，一处看全局。
- **下行 pull**：拉平台权威进度覆盖本地（`ProgressManager.import()` 重建 DB 行）。
- **多用户合并**：不同 change 天然 union（无冲突）；同一 change 冲突走 b 策略（强制提示，禁止字段级 auto-merge）。
- **不破坏本地可用性**：sync 全程永不阻塞 CLI（复用 8s 熔断 + `console.warn` 不抛，遵守 CONVENTIONS #4）。
- **跨仓库边界清晰**：SillySpec CLI（本地侧）+ sillyhub 后端（聚合侧）职责分离。

## 3. 非目标（克制清单）

- ❌ 不让 SQLite 远端连（换 libsql/rqlite/LiteFS 或网络盘挂载 .db）。
- ❌ 不做实时推送（WebSocket / SSE）。
- ❌ 不做字段级 auto-merge（状态机半坏风险）。
- ❌ 不做分布式锁。
- ❌ 不维护离线 push 队列（状态机累积合并危险，YAGNI）。
- ❌ 不改 DB source of truth 模型（DB 仍是本地唯一 SoT，不降级为缓存/文本）。
- ❌ 不碰 `src/sillyhub-mcp/` 任务派发层（`converge_mission` 铁律 D-004）。

## 4. 拆分判断

**单 change 内部 wave 拆分**（非多独立 change）：`import` / `pull` / `conflict` 三者强依赖——pull 依赖 import（拉下来无处落），conflict 依赖 pull + base_ts（检测前提），拆成独立 change 会产生跨 change 依赖债务与中间态半成品。非批量模式（非模板×数据）。`scale=large`、`tier=independent`：schema 变更 + 新冲突状态机 + 多模块（sync/runtime/cli-entry/run.shared）。**本 change 纯 SillySpec 侧**——sillyhub 后端改动（GET 端点+聚合+冲突检测+POST 兼容）拆**独立 change** 另排期，不阻塞本 change archive（B3 用户决策"不阻塞"，D-014）；sillyhub 未就绪时 pull Best Effort 降级保本地可用。

## 5. 总体方案

**方案 A：平台权威 + progress JSON 投影同步**（用户已选定，详见 decisions.md D-001）。

核心思想：DB 始终本地嵌入式不变（保本地可用性、不换引擎）；同步载体是 `ProgressManager.serializeForSync()` 输出的 JSON 投影（文本、可合并）；sillyhub 作权威聚合点；补 `ProgressManager.import()` 逆操作（`serializeForSync()` 的反向）重建 DB 行；user/base_ts/pushed_at 走 **HTTP header**（body 保持裸 JSON，sillyhub 端向后兼容零回归，见 §7/R-09/D-015）；冲突 change 级 base_ts 乐观锁 + b 策略 human-in-loop（绝不字段级 auto-merge）。

```
张三本地                                  李四本地
sillyspec.db ─serializeForSync()─▶ JSON     sillyspec.db ─serializeForSync()─▶ JSON
   ▲ ▲                  │ POST body裸 +header(user/base_ts/pushed_at) │ POST
   │ │                  ▼                                     ▼
   │ │            ┌──── sillyhub 平台（权威聚合点）─────────────────┐
   │ │            │ 每 change：最新 JSON + last_pushed_at + pusher │
   │ │import()    │ base_ts 比对→冲突拒绝  JSON 落盘文本(灾备/审计)│
   │ │重建DB行    │ GET /api/changes(轻量) GET /changes/{n}/progress│
   │ └────────────└──────────────────────────────────────────────┘
```

**分 Wave**（plan 阶段拆分依据）：
- **Wave 1 地基（纯本地，可独立测）**：`ProgressManager.import()` + schema 加列 + `.bak` snapshot
- **Wave 2 下行**：`sync.js pull()` + sillyhub GET 端点 + 轻量列表 + user/base_ts 字段
- **Wave 3 冲突**：base_ts 乐观锁 + 冲突持久化 + `platform resolve` + b 策略交互

## 6. 文件变更清单

| 操作 | 文件路径 | 说明 |
|---|---|---|
| 修改 | src/db.js | `_createSchema` 幂等 `_migrateAddColumn` 加 `last_synced_platform_ts` / `last_local_modified_ts` 两列；`DB_SCHEMA_VERSION` bump 3→4。producer=本变更 DDL → consumer=progress.js 读写新列 |
| 修改 | src/progress.js（+ src/progress/ 5 子模块：shared/change-registry/consistency-doctor/stage-machine/step-store） | 新增 `serializeForSync()`（六表完整序列化）+ `import(progressObj, changeName)`（其逆运算，事务原子 + import 前独立 `.bak` snapshot `.runtime/sillyspec.db.pre-import-<ts>.bak`）；**所有写入路径**（_write/initChange/registerChange/updateChangeIsolation/_updateApprovalStatus 等）末尾更新 `last_local_modified_ts` 脏度（gap7/D-013）。producer=`serializeForSync()` JSON → `import()` 写六表（changes 选择投影列保留 isolation） |
| 修改 | src/sync.js | 新增 `pull(changeName?, opts)` + `pullList()`；现有 `sync()` 的 POST **元字段走 HTTP header**（`X-SillySpec-User`/`X-SillySpec-Base-Ts`/`X-SillySpec-Pushed-At`，body 保持裸 JSON，D-015）；处理 409 冲突响应；Best Effort `console.warn` 不抛（CONVENTIONS #4） |
| 修改 | src/index.js | `platform` 命令组新增 `pull` / `resolve` 子命令；注入 `triggerPull` 时机（`run`/`--done` 启动 + `approve`/`archive` 前） |
| 修改 | src/run/shared.js | `triggerSync` 旁加 `triggerPull`（复用 8s 熔断、Best Effort）；本地脏度比对触发冲突文件写入 |
| 修改 | .sillyspec/local.yaml（schema 约定） | `platform` 段加 `user:` 字段。producer=`connect` 时用户填 → consumer=`sync.js` `X-SillySpec-User` header |
| **独立 change** | sillyhub 后端仓库 | `GET /api/changes` + `GET /api/changes/{name}/progress` + 聚合存储 + base_ts 冲突检测 + POST 兼容 + 落盘灾备——**不在本 change 范围**，拆独立 change 另排期（D-014 / B3"不阻塞"） |
| 不动 | src/sillyhub-mcp/ | 任务派发层（createMission/dispatchWorker），`converge_mission` 铁律 D-004，与进度同步无关 |

**字段数据流标注**（三个同步元字段走 **HTTP header**，body 保持裸 JSON 向后兼容，D-015）：
- **user**：producer=`local.yaml platform.user`（`SyncManager` 读取）→ `sync.js` 设 `X-SillySpec-User` header → consumer=sillyhub 后端读 header 存 `last_pusher` / 轻量列表返回。
- **base_ts**：producer=本地 DB `changes.last_synced_platform_ts`（`sync.js` 读取）→ `X-SillySpec-Base-Ts` header → consumer=sillyhub 后端读 header 做 `current_pushed_at > base_ts` 比对 → 冲突时 409 响应回传平台最新 JSON。
- **pushed_at**：producer=`sync.js` 客户端时钟 `new Date().toISOString()`（CONVENTIONS 时间戳规范）→ `X-SillySpec-Pushed-At` header → consumer=sillyhub 后端读 header 存 `last_pushed_at`，作为下次其他用户 push 的 base_ts 比对基准。

## 7. 接口定义

### ProgressManager（src/progress.js facade + 5 子模块：shared/change-registry/consistency-doctor/stage-machine/step-store）

```js
// 【新增·B1 修正】同步专用序列化：六表完整投影（read() 是聚合视图不够，见 §8/B1）
serializeForSync(changeName, { cwd })
// → 完整序列化 project/changes/stages/steps/batch_progress/approvals 六表
// → changes 行只投影"流程进度列"（current_stage/status/last_active/last_synced_platform_ts/last_local_modified_ts），
//   排除 isolation_*/platform_change_id/workspace_id/sync_enabled/created_at（本地强相关，不同步，见 B2）
// → 返回同步 JSON（**裸六表**，不含 user/base_ts/pushed_at——这些由 sync.js 放 HTTP header，D-015）

// 【新增】serializeForSync 的逆操作：把权威 JSON 写回本地 DB 的该 change 行
import(progressObj, changeName, { cwd })
// → 单个 DB.transaction() 包裹，原子写 stages/steps/batch_progress/approvals
// → changes 行用 UPDATE 选择投影列（current_stage/status/last_active/last_synced_platform_ts），
//   保留 isolation_*/platform_change_id/workspace_id/sync_enabled/created_at（本地状态不被覆盖，与 serializeForSync 排除同列集，见 B2）
// → import 前 copyFileSync 到【独立】snapshot .runtime/sillyspec.db.pre-import-<ts>.bak
//   （不抢 _openWithFallback 的 ${dbPath}.bak，见 gap5/R-08）
// → import 后更新 last_synced_platform_ts = progressObj.pushed_at（对齐平台）
//   **且重置 last_local_modified_ts = progressObj.pushed_at**（表示本地=平台干净；不更新 now()——
//   否则 now()>last_synced_platform_ts 下次 pull 误判冲突，P1 gap；D-013 把 import 列为脏度更新例外）
// → 失败 throw 中文（本地确定性操作，CONVENTIONS #4；非 sync 类 Best Effort）+ .bak 不可恢复 fail-loud
// → 返回 { ok, imported, reason?, bakPath }
// → 仅在无冲突时调用（b 策略绑定）；保留 `// ⚠️ 必须保护真实资产` 注释（CONVENTIONS #5）
```

### SyncManager（src/sync.js，新增下行）

```js
// 两级 pull 第一级：轻量 change 列表（控性能）
pullList({ cwd })
// → GET /api/changes → [{ name, current_stage, last_pushed_at, last_pusher }]
// → CLI 比对本地决定哪些 change 需更新；返回 { ok, changes, reason? }

// 两级 pull 第二级：按需拉单 change 完整 JSON
pull(changeName, { cwd, force })
// → GET /api/changes/{name}/progress → 权威 JSON
// → 本地脏度比对：last_local_modified_ts > last_synced_platform_ts 且平台 last_pushed_at 更新 → 冲突
//   → 写 sync-conflict-<change>.json（不 import），返回 { ok:false, conflict:true }
// → 无冲突 → import() 重建 DB 行，返回 { ok, imported, reason? }
// → 全程 Best Effort：网络失败 console.warn 不抛，返回 { ok:false, reason }
```

### CLI（src/index.js platform 命令组）

```
sillyspec platform pull [--change <名>] [--force]   # 手动拉取
sillyspec platform resolve <名> --keep-local|--take-platform|--abort
sillyspec platform status                            # 现有 + 显示"本地可能落后"标记 + 未决冲突列表
```

### HTTP 契约（SillySpec ↔ sillyhub，跨仓库共享）

| 方法 | 路径 | body/响应 | 说明 |
|---|---|---|---|
| POST（现有）| /api/changes/{name}/progress | **body 保持裸 serializeForSync() JSON**（向后兼容，sillyhub 老版继续工作）；元字段走 **HTTP header**：`X-SillySpec-User` / `X-SillySpec-Base-Ts` / `X-SillySpec-Pushed-At`（D-015，零回归） | 上行；409 时响应 `{conflict:true, platform_progress, last_pushed_at}` |
| GET（新增）| /api/changes | `[{name, current_stage, last_pushed_at, last_pusher}]` | 轻量列表 |
| GET（新增）| /api/changes/{name}/progress | 权威 progress JSON + `{last_pushed_at, last_pusher}` | 完整 JSON |

## 7.5 生命周期契约表

> 本变更**不涉及** SillySpec 核心 stage/step/session/lease/agent_run/daemon 生命周期契约；但**引入平台同步冲突状态机**（clean ↔ conflict → resolved），契约如下。每个事件对应 Wave 3 任务；必需字段出现在 §7/§8。

| 事件 | 发起方 | 接收方 | 必需字段 | 状态变化 |
|---|---|---|---|---|
| push（无冲突） | CLI sync.js | sillyhub | changeName, progress JSON, user, base_ts, pushed_at | clean → clean（更新 last_pushed_at/pusher；本地 base_ts 更新） |
| push 检测冲突 | sillyhub | CLI sync.js | 409 + platform_progress + last_pushed_at | clean → conflict（写 sync-conflict-<change>.json） |
| pull（无冲突） | CLI sync.js | sillyhub | changeName | clean → clean（import 平台 JSON；本地 base_ts 更新） |
| pull 检测冲突 | CLI（本地脏度比对） | 本地 | last_local_modified_ts, last_synced_platform_ts, 平台 last_pushed_at | clean → conflict（写 sync-conflict-<change>.json） |
| resolve --keep-local | CLI | 本地 | 冲突文件 | conflict → clean（base_ts 设为**平台当前 last_pushed_at**，保留本地 DB 不 import；语义一致 gap9） |
| resolve --take-platform | CLI | 本地 | 平台 JSON | conflict → clean（import 平台 JSON 覆盖本地） |
| resolve --abort | CLI | 本地 | 冲突文件 | conflict → clean（放弃本次同步，清冲突文件，本地 DB 不变） |

## 8. 数据模型

`changes` 表加两列（`_migrateAddColumn` 幂等）：

| 列 | 类型 | 用途 |
|---|---|---|
| last_synced_platform_ts（新） | TEXT（ISO） | base_ts：上次成功同步时平台的 `last_pushed_at` |
| last_local_modified_ts（新） | TEXT（ISO） | 本地脏度：上次同步后本地最近写入时刻（**所有写入路径**末尾更新：_write/initChange/registerChange/updateChangeIsolation/_updateApprovalStatus 等，gap7/D-013） |
| platform_last_sync（现有，复用） | TEXT（ISO） | 改语义为"上次同步完成时刻"（本地时钟）——见 D-007 |

`DB_SCHEMA_VERSION`：3 → 4（db.js:10 实测为 3；runtime.md 称"DDL 默认 4"系文档漂移，以 db.js 为准）。bump **连带三处**（gap6/D-012）：`src/db.js:10 DB_SCHEMA_VERSION` + `src/db.js:205 project.schema_version DEFAULT 3` + `src/progress/shared.js:30 CURRENT_VERSION` + `src/progress.js:350 _version 硬编码`。bump 触发 `.schema-version` 戳失效 → 下次 init 重跑 `_createSchema` 幂等加列。

`progress` JSON 投影契约（**新增 `serializeForSync()` 输出**，裸六表，非 read() 聚合视图——见 B1；user/base_ts/pushed_at 走 HTTP header 不在 body，D-015）：

```json
{
  "project": {...},
  "changes": [{ "current_stage":"...", "status":"...", "last_active":"...", "last_synced_platform_ts":"...", "last_local_modified_ts":"..." }],
  "stages": [...], "steps": [...], "batch_progress": [...], "approvals": [...]
}
```

**NULL 语义（gap8）**：`last_local_modified_ts` NULL（新 change/首次）→ 本地无脏度，pull 不判冲突直接 import；`last_synced_platform_ts` NULL（首次同步）→ base_ts NULL，平台接受首次 push。

> **B1 修正（Design Grill 抓出的 P0）**：原 design 称"import 是 read() 逆运算"**不成立**——`progress.js:240-365` read() 输出是聚合对象（currentChange/currentStage/stages{}），不读 approvals 表（全库无 SELECT FROM approvals），changes 只投影 5 列。故**新增 `serializeForSync()` 做真正六表完整序列化**，import 是其逆运算（Wave1 前置任务）；changes 行排除 isolation_*/platform_change_id/workspace_id/sync_enabled/created_at（本地强相关，不同步，见 B2）。原 R-07 自审存疑升级为 P0 确定性矛盾，已解。

## 9. 兼容策略（brownfield）

- **未连平台**（无 `local.yaml` 的 `platform` 段）：`sync`/`pull`/`triggerPull` 全部跳过，行为与现状完全一致。
- **旧 schema 3 DB**：`_migrateAddColumn` 幂等加两列（现有机制），新列默认 NULL（=从未同步）；schema_version 戳触发 `_createSchema`。
- **`platform_last_sync` 语义变更**：旧值（`_updatePlatformLastSync` 写的本地时间戳）落在新语义（同步完成时刻）内，向后兼容；NULL/旧值视为"从未同步"，首次 push `base_ts=NULL` 平台接受。
- **sillyhub 后端未升级**（无 GET 端点）：`pull` 报 404/超时 → `console.warn` 降级，本地继续运行，不阻断（Best Effort）。
- **不改**：stage/step 流转、worktree/in-place 模式、mission 派发、六张表现有结构（仅 changes 加列）。

## 10. 风险登记

| 编号 | 风险 | 等级 | 应对策略 |
|---|---|---|---|
| R-01 | sillyhub 后端独立 change 排期不可控（GET 端点+聚合+POST 兼容） | P1 | B3 决策"不阻塞"（D-014）：本 change 纯 SillySpec 侧，sillyhub 拆独立 change；Wave2 固化 HTTP 契约（§7）待 sillyhub 端实现；pull 失败 Best Effort 降级保本地可用 |
| R-02 | base_ts 乐观锁极端并发（毫秒级同推）误判 | P1 | b 策略 human-in-loop 兜底；冲突不 auto-merge，停下提示 |
| R-03 | `import()` 覆盖时与本地并发 `_write` 竞争 | P1 | import 在 transaction 内；pull 时机避开 step 高频写入（启动/决策点）；import 前比对 `last_local_modified_ts` |
| R-04 | 冲突文件 `.runtime/sync-conflict-*.json` 累积未清理 | P2 | resolve 必清；doctor D-诊断扩展检测孤立冲突文件 |
| R-05 | `platform_last_sync` 语义变更对在途数据影响 | P2 | 旧值语义包含；NULL 视为未同步；迁移说明入 decisions.md D-007 |
| R-06 | schema_version 实际值（db.js=3 vs runtime.md 称 4） | P2 | 以 db.js 实测为准（3），bump 到 4；本 design 已标注文档漂移 |
| R-07 | `read()` 非六表序列化（聚合视图+漏 approvals+changes 只投影 5 列），import≠read 逆运算 | **P0** | **已修正（B1）**：新增 `serializeForSync()` 做六表完整序列化；Wave1 前置 + round-trip 测试（serializeForSync→import→serializeForSync 等值） |
| R-08 | import snapshot 与 `_openWithFallback` 的 `${dbPath}.bak` 路径冲突 | P1 | import 用独立路径 `.runtime/sillyspec.db.pre-import-<ts>.bak`（gap5/D-011） |
| R-09 | ~~POST body 破坏性 API~~ → **已解（D-015 header 方案）**：元字段走 HTTP header，body 保持裸 serializeForSync() JSON 不变，sillyhub 老版继续工作零回归；新版读 header 启用冲突检测 | P2 | D-015 header 方案；sillyhub 独立 change 加读 header（不读也不影响 body 解析） |

## 11. 决策追踪

| 决策 ID | 简述 | 覆盖章节 / FR |
|---|---|---|
| D-001@v1 | 平台后端 = sillyhub（跨仓库改后端） | §1 / §6 / §7 |
| D-002@v1 | 同 change 冲突 = b 强制提示（禁止字段级 auto-merge） | §3 / §7.5 |
| D-003@v1 | 一步到位交付（内部 wave1-3，不拆 change） | §4 / §5 |
| D-004@v1 | user 身份 = `local.yaml` 加 `user` 字段 | §6 / §8 |
| D-005@v2 | import 粒度 = change 覆盖；新增 `serializeForSync()` 专用序列化；changes 排除 isolation 本地列（supersedes D-005@v1，B1/B2 修正） | §7 / §8 |
| D-006@v1 | pull 范围 = 两级（轻量列表 + 按需单 change） | §7 / FR-03 |
| D-007@v1 | 死字段复用 = `platform_last_sync` 改语义为同步完成时刻 | §8 / §9 |
| D-008@v1 | 冲突本地脏度 = 新增 `last_local_modified_ts` | §8 / §7.5 |
| D-009@v1 | triggerPull 时机 = run 启动 + approve/archive 前，不每步 | §6 / FR-04 |
| D-010@v1 | resolve `--abort` = 放弃本次同步保持现状 | §7.5 |
| D-011@v1 | import snapshot 用独立 `.bak` 路径（不抢 _openWithFallback） | §7 / R-08 |
| D-012@v1 | schema bump 连带 db.js + shared.js + progress.js 三处 | §8 / R-06 |
| D-013@v1 | last_local_modified_ts 全写入路径触发（不止 _write） | §6 / §8 |
| D-014@v1 | scope：SillySpec 先行，sillyhub 后端拆独立 change（B3 不阻塞） | §4 / §6 / R-01 |
| D-015@v1 | POST 元字段走 HTTP header（body 保持裸，零回归，解 R-09） | §5 / §7 / R-09 |

全部 D-001~D-014 当前版本已落实于本 design（D-005 升级 v2、D-014 B3 已决策"不阻塞"）。详见 `decisions.md`。

## 12. 自审

- **章节齐全**：背景 / 设计目标 / 非目标 / 拆分判断 / 总体方案 / 文件变更清单 / 接口定义 / 生命周期契约表 / 数据模型 / 兼容策略 / 风险登记 / 决策追踪 / 自审 ✓
- **生命周期关键词**：本设计含"状态机/状态变化"，已提供「同步冲突状态契约表」（§7.5），并注明不涉及 SillySpec 核心 stage/step/session/lease 生命周期。
- **字段数据流**：progress JSON 三个新元字段（user/base_ts/pushed_at）已标注 producer→consumer（§6），无 dormant 字段。
- **一致性**：`import()` 是 `serializeForSync()` 逆运算（B1 修正）、changes 选择投影保留 isolation（B2）、base_ts 双向冲突检测、b 策略贯穿冲突处理——逻辑自洽。
- **YAGNI**：克制清单明确（§3），不滚成分布式数据库项目。
- **⚠️ 自审存疑**（经 Design Grill 独立审查修正，见 review.json `brainstorm-review-2026-08-10-142313`）：
  - ~~R-07 read 投影完整性~~ → **已升级 P0 并修正（B1）**：read() 非六表序列化，新增 serializeForSync()；R-08 .bak 路径冲突已改独立路径；R-09 POST body 破坏性 API 已登记。
  - ~~B3 待用户决策~~ → **已决策"不阻塞"**（D-014）：sillyhub 拆独立 change，本 change 纯 SillySpec 侧；R-01/R-09 降 P1（解耦）。
  - `import()`/`serializeForSync()` 实现位置（progress.js facade vs `src/progress/` 子模块，实为 **5** 子模块 shared/change-registry/consistency-doctor/stage-machine/step-store）需 plan 阶段读子模块定位。
