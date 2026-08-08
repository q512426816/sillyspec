---
author: qinyi
created_at: 2026-08-08 23:39:18
scale: large
risk_level: high
---

# 设计文档（Design）— 进度库并发安全（better-sqlite3 替换 sql.js）

## 1. 背景

SillySpec 立身的核心承诺是「多 agent 并发操作同一仓库」——多个 AI agent 同时跑 CLI、写进度库、操作 worktree。但当前进度库用 **sql.js**（SQLite 编译为 WASM 的**纯内存库**），其持久化模型是「整库 load 到内存 → 整库 export 写回」：

- `ProgressManager._ensureDB`（progress.js:195）在首次使用时把整个 `sillyspec.db` load 进内存并**缓存在实例上，永不刷新**。
- `DB.transaction`（db.js:58）只做内存内 `BEGIN/COMMIT`（单连接，对并发是 no-op）+ `_save()`（整库 export ~315KB + 原子写整文件），**全程无任何跨进程文件锁**。
- `db.js:86` 注释自承认「sql.js 是纯内存库，PRAGMA journal_mode=WAL 对它无意义」；`db.js:109` 注释自承认「DB 整体 last-writer-wins 进度丢失仍存（治本需套 withFileLock 或换引擎）」。

由此产生四个并发缺陷（多代理审查主题 A）：

- **H1 整库 lost update**：长 `execute --done` 进程 t0 时刻 load 的快照不含期间另一 agent 落盘的无关 quick 完成态，其结尾的整库 `_save` 把该完成态覆盖抹掉。窗口=整个进程生命，殃及**无关变更**。
- **H2 sync.js 隐藏整库写者**：sync.js:223/248 每次 `new ProgressManager` 拿独立快照独立整库写；`triggerSync` 在 `--done` 路径同进程触发。任何只挂在主 PM 实例上的锁补丁都绕不过 sync。
- **H3 gate-status.json 被 stale 快照打穿**：`_updateGateStatus` 从**内存快照**派生 gate-status.json，两个 agent 的 PM 各自从 stale 快照重写墓碑互相覆盖 → worktree-guard hook 在 execute 期 **fail-open**（安全边界失效）。
- **H4 doctor 是 lost-update 写者且测不出损坏**：回退后的 DB 内部仍自洽，doctor 报 ✅，「越修越坏」。

## 2. 设计目标

- **G1** 消除跨进程整库 lost update：任何两个并发写者不再互相覆盖无关变更的进度（H1/H2/H4 写者面）。
- **G2** 根除 gate-status.json stale 双源（H3）：进度单一权威源，hook 读到的 execute 标记不会被 stale 快照污染。
- **G3** doctor 能基于**准确（非 stale）**状态做一致性修复，并新增 lost-update 间接信号检测（H4 检测面）。
- **G4** 主流 npm 平台（Linux/macOS/Windows x64+arm64，Node 18+）零编译安装（prebuilt），不引入用户侧构建依赖。

## 3. 非目标（Non-Goals）

- **不保留 sql.js 双引擎 fallback**——两套持久化代码 + 运行时探测复杂度 > 边缘平台收益。
- **不做进度库数据迁移**——`.sillyspec/` 可重置（CLAUDE.md 项目状态）；且 sql.js 与 better-sqlite3 同为 SQLite 文件格式，旧 db 文件可被直接打开（见兼容策略）。
- **不改变 DB schema**——6 表 DDL 与 `DB_SCHEMA_VERSION=3` 不变，仅换引擎。
- **不改变 ProgressManager 对外方法名**——仅 async→sync，调用方去 await。
- **不解决 gate-status 之外的性能问题**（启动税、热路径性能属独立主题 D/F，另立变更）。
- **不扩展 concurrency 检测语义**（concurrent-detect.js 的 advisory 分类逻辑不动）。

## 4. 拆分判断

本变更是一个**聚焦的架构替换**（换持久化引擎），非 N 个独立功能，不满足批量模式（任务间无「模板×数据」重复模式，而是同一引擎替换渗透到多个调用点）。也不拆分——废 gate-status 与换引擎强耦合（hook 读路径必须在换引擎时一并改），doctor 增强是换引擎后「无 stale 读」的自然产物。作为单一变更一次走完 brainstorm→plan→execute→verify→archive。

## 5. 总体方案（7 Phase）

## 5.1 决策与方案选择（Decision）

- **D-01 持久化引擎 = better-sqlite3**（用户确认，排除另二方案）：
  - 方案① sql.js + 文件锁（复用 quicklog.js `withFileLock` O_EXCL + 锁内 reload）：零 npm 影响、改动集中，但整库锁序列化、锁内每次 reload 整库 ~315KB、stale 快照与锁内 reload 语义复杂。
  - 方案② better-sqlite3（真 WAL 并发、同步 API、原生 `.transaction`）——**采纳**。天然消除整库 lost update，代价为原生模块 npm prebuilt。
  - 方案③ 渐进（先①后评估②）：两步走、二次迁移成本。
  - 结论：选 ②。SillySpec 低写频率下方案①的锁序列化够用，但方案②从根上消除 lost update 且代码更简洁；用户接受边缘平台 npm 风险。
- **D-02 gate-status.json 处理 = 废除双源（方案 A）**（用户确认，排除 B/C）：B 保留修派生（仍双源，stale 未根除）、C DB 写后钩子物化（跨进程复杂）。gate-status 缓存的性能理由（规避 sql.js 整库读慢，worktree-guard.js:289）随 WAL 消失——better-sqlite3 读单行 SQL 微秒级，hook 直读 DB 为单一权威源。
- **D-03 引擎策略 = 单引擎无 fallback**（用户确认）：不保留 sql.js 双引擎（复杂度 > 边缘平台收益）。
- **D-04 兼容 = 无数据迁移**：sql.js 与 better-sqlite3 同为标准 SQLite 文件格式可直接打开；`.sillyspec/` 可重置（CLAUDE.md）。

## 5.2 实施 Phase

**核心决策（用户已确认）**：sql.js 全量替换为 **better-sqlite3**（原生 SQLite，真 WAL 并发），废 gate-status.json 双源（hook 直读 DB），单引擎无 fallback，接受边缘平台 npm 安装风险。

better-sqlite3 是**同步 API**，原生 `.transaction(fn)`（自动 BEGIN/COMMIT/ROLLBACK + 嵌套 savepoint），WAL 模式下多进程/多连接**并发读写不互斥**（读不阻塞写、单写串行），每次查询读最新文件状态——从根本上同时解决 H1（无整库覆盖）、H2（sync 多连接并发安全）、H4 写者面（无 lost update、无 stale 读）。

- **Phase 1 — db.js 重写**：构造改同步 `new Database(path)`，设 `journal_mode=WAL`（真生效）+ `busy_timeout=5000` + `foreign_keys=ON`。删整套自定义持久化（`_save`/`_loadDatabase`/`_atomicWriteSync`/`_renameSyncRetry`/`_sleepSync`）。`transaction(fn)` 改原生 `db.transaction(fn)`。保留 `_createSchema`（DDL 不变）、`_migrateAddColumn`、`DB_SCHEMA_VERSION` 戳、`.bak` 损坏回退（改 better-sqlite3 API：打开失败 try .bak，与现 `_loadDatabase` 逐级回退语义对齐）。同步替换 `src/doctor-diagnostics.js:23` 的 `import initSqlJs from 'sql.js'` 为 better-sqlite3 只读连接（D1 多 db 检测的只读探测，被 index.js 引用——sql.js 从依赖删除后不 import 崩溃，plan 审查 B1）。
- **Phase 2 — ProgressManager 同步化**：`_ensureDB`/`read`/`_write`/`readGlobal` 等改同步（去 async/await）；调用方 `await pm.*` 去 await。实例不再缓存快照——better-sqlite3 每次查询读最新文件状态。
- **Phase 3 — 废 gate-status.json**：实证确认 gate-status.json **唯一写者是 progress.js `_updateGateStatus`**（stage/tombstone/changes 门禁缓存）；index.js:711/715 的 isolation 信息实际经 `pm.updateChangeIsolation` 写 DB（changes.isolation_status 列），注释「写入 gate-status.json」为过时注释（顺带修正）。废除范围：progress.js 删 `_updateGateStatus`（677-741）+ `_write` 末尾调用（475）；worktree-guard.js 删 `readGateStatus`（228-240）+ 墓碑，`readCurrentStage`（290）/`isNoWorktreeMode`（305）改直读 DB，**`isInsideRegisteredWorktree`（320-321）依赖 `gateStatus.changes` → 改从 DB 读 active changes（`SELECT name FROM changes WHERE status='active'`）或 `.runtime/worktrees/` 目录扫描 + `readWorktreeMeta`**，:92 存在性检查改 DB 判定/删除；init.js:19/28 清理白名单删 gate-status 项；fs-atomic.js:52 / progress.js:8 / worktree.js:650 / machine-interface.js:10,324 注释顺带修正。gate-status 缓存的性能理由（规避 sql.js 整库读慢，worktree-guard.js:289）随 WAL 消失——better-sqlite3 读单行 SQL 微秒级。
- **Phase 4 — sync/doctor 自动并发安全**：sync.js `new PM` → WAL 多连接，`_updatePlatformLastSync`/`_updateApprovalStatus` 单条 UPDATE 原生原子（不再整库 export）。doctor `repairConsistency` 用原生 transaction，与其他写者 WAL 并发安全。
- **Phase 5 — doctor 增强（检测）**：consistency-doctor 新增对账——`.runtime/worktrees/<change>` 目录存在但 DB `current_stage≠execute` → lost-update 间接信号（worktree 残留但进度回退）。
- **Phase 6 — hook 子进程适配**：`queryDbFirstCell` 子进程脚本从 `import('sql.js')` 改 `require('better-sqlite3')`，只读连接 `new Database(path,{readonly:true,fileMustExist:true})`；resolve 原生绑定经 `createRequire.resolve`。
- **Phase 7 — 测试/打包/文档**：测试重写 + 新增多进程并发写不 lost update 回归测试（G1 验收）。package.json 加 better-sqlite3、删 sql.js、`engines.node>=18`。`.gitignore` 加 `*.db-wal`/`*.db-shm`。README 声明主流平台支持。file-lifecycle.md + `.claude/skills/` 同步。

## 6. 文件变更清单

| 操作 | 文件路径 | 说明 |
|---|---|---|
| 修改 | src/db.js | 全量重写 sql.js→better-sqlite3。删 `_save`/`_loadDatabase`/`_atomicWriteSync`/`_renameSyncRetry`/`_sleepSync`；`transaction` 改原生 `db.transaction(fn)`；构造同步 `new Database`+WAL/busy_timeout/foreign_keys；保留 `_createSchema`/`_migrateAddColumn`/`DB_SCHEMA_VERSION` 戳；`.bak` 回退改 better-sqlite3 API。数据流：`sillyspec.db` 持久化 producer=`db.transaction`（WAL 原生原子写）→ consumer=`ProgressManager` 各读方法 + hook `queryDbFirstCell`（同一 better-sqlite3 引擎，WAL 并发读写不互斥）。 |
| 修改 | src/progress.js | PM 方法同步化（`read`/`_write`/`readGlobal`/`_ensureDB` 去 async）；删 `_updateGateStatus` 及 `_write` 末尾调用；不再实例缓存快照。 |
| 修改 | src/progress/step-store.js | 跟随 PM 同步化（去 await db 调用）。 |
| 修改 | src/progress/change-registry.js | 跟随 PM 同步化（去 await db 调用）。 |
| 修改 | src/progress/stage-machine.js | 跟随 PM 同步化（去 await db 调用）。 |
| 修改 | src/progress/consistency-doctor.js | 跟随 PM 同步化（去 await db 调用）；新增 `detectLostUpdateSignals` 对账逻辑（Phase 5）。 |
| 修改 | src/progress/shared.js | 跟随 PM 同步化（去 await db 调用）。 |
| 修改 | src/sync.js | `await pm.read`/`_updatePlatformLastSync`/`_updateApprovalStatus` 去 await（WAL 多连接自动并发安全，覆盖 H2）。 |
| 修改 | src/doctor-diagnostics.js | 引擎替换：`import initSqlJs from 'sql.js'`（:23，被 index.js 引用）改 better-sqlite3 只读连接（D1 多 db 检测只读探测），sql.js 删除后避免 doctor --json import 崩溃（plan 审查 B1）。 |
| 修改 | src/run/command.js | 主流程写者 `await pm.*` 去 await（better-sqlite3 同步 API，覆盖 H1）。 |
| 修改 | src/run/stage.js | 主流程写者 `await pm.*` 去 await（better-sqlite3 同步 API，覆盖 H1）。 |
| 修改 | src/run/gates.js | 主流程写者 `await pm.*` 去 await（better-sqlite3 同步 API，覆盖 H1）。 |
| 修改 | src/run/complete.js | 主流程写者 `await pm.*` 去 await（better-sqlite3 同步 API，覆盖 H1）。 |
| 修改 | src/run/complete-handlers.js | 主流程写者 `await pm.*` 去 await（better-sqlite3 同步 API，覆盖 H1）。 |
| 修改 | src/run/quick-audit.js | 调用方 `await pm.*` 去 await。 |
| 修改 | src/index.js | PM 调用同步化（`progress`/`doctor --align`/`change-rename`/`worktree` 等 case）+ `await pm.*` 去 await。 |
| 修改 | src/init.js | 调用方 `await pm.*`/`await this.pm.*`/`await this._ensureDB` 同步化（grep 实证 init.js:315）。 |
| 修改 | src/machine-interface.js | 调用方 `await pm.*` 同步化（grep 实证 machine-interface.js:133/370）。 |
| 修改 | src/hooks/worktree-guard.js | `readCurrentStage`/`isNoWorktreeMode` 改直读 DB（删 `readGateStatus` 优先 + 墓碑）；`queryDbFirstCell` 子进程脚本 `import('sql.js')`→`require('better-sqlite3')` 只读连接。数据流：producer=`db.transaction`（WAL 写）→ consumer=hook 只读连接（并发读不阻塞写，根除 H3 stale）。 |
| 修改 | package.json | 加 `better-sqlite3 ^11.x`，删 `sql.js`，`engines.node>=18`。 |
| 修改 | .gitignore | 加 `*.db-wal`/`*.db-shm`（WAL 侧车文件）。 |
| 修改 | README.md | 声明主流平台支持（prebuilt），musl/Win-arm64 不保证。 |
| 修改 | docs/sillyspec/file-lifecycle.md | 进度持久化 sql.js→better-sqlite3 描述；删 gate-status.json 条目。 |
| 修改 | .claude/skills/*/SKILL.md | 进度库描述同步（如涉及 gate-status/sql.js）。 |
| 修改 | test/*.test.mjs | db/progress 相关测试重写为 better-sqlite3 行为。 |
| 新增 | test/db-concurrency.test.mjs | 多进程并发写不 lost update 回归测试（G1 验收）。 |
| 删除 | .sillyspec/.runtime/gate-status.json | 运行时产物不再生成（概念性删除，无双源）。数据流：原 producer=`progress._updateGateStatus`（内存快照派生）→ consumer=`worktree-guard.readGateStatus`；删后 consumer 改直读 DB，stale 双源根除。 |

## 7. 接口定义

### DB 类（src/db.js，better-sqlite3）
```js
class DB {
  constructor(dbPath)   // 存路径，不立即打开
  init()                // 同步：new Database + WAL/busy_timeout/foreign_keys + _createSchema（版本戳）+ .bak 回退
  transaction(fn)       // 同步：原生 db.transaction(fn)()，自动 BEGIN/COMMIT/ROLLBACK + 嵌套 savepoint
  getDb()               // 返回 better-sqlite3 Database（.prepare()/.exec()/.pragma()）
  close()               // db.close()（WAL 自动 checkpoint）
}
```
**移除**：`async init`、`_save()`、`_loadDatabase()`、`_atomicWriteSync()`、`_renameSyncRetry()`、`_sleepSync()`。

### ProgressManager（src/progress.js，同步化）
```js
read(cwd, changeName)              // 同步，返回 progress 对象
_write(cwd, progress, changeName)  // 同步，db.transaction 内 UPSERT
readGlobal(cwd)                    // 同步
// 其余方法（registerChange/initChange/setStage/updateStep/completeStage/...）全部去 async
// 移除 _updateGateStatus(cwd)
```

### doctor 对账（src/progress/consistency-doctor.js，新增）
```js
detectLostUpdateSignals(cwd)  // 对账 .runtime/worktrees/<change> 存在 vs DB current_stage≠execute，返回 issue 列表
```

### hook DB 读取（src/hooks/worktree-guard.js，子进程）
```js
// queryDbFirstCell 子进程脚本：import('sql.js') → require('better-sqlite3')
// new Database(dbPath, { readonly: true, fileMustExist: true })
// WAL 下与主进程写并发安全（读不阻塞写）
```

## 7.5 生命周期契约

不涉及生命周期契约。

## 8. 数据模型

**不变**。6 表 DDL（project/changes/stages/steps/batch_progress/approvals）、外键级联、索引、`DB_SCHEMA_VERSION=3` 戳机制全部保留，better-sqlite3 用同一 schema。无新增表/列。

## 9. 兼容策略

- **DB 文件格式**：sql.js 与 better-sqlite3 同为标准 SQLite 文件格式，旧 `sillyspec.db` 可被 better-sqlite3 **直接打开**（无需数据迁移）；首次开启 WAL 模式时 SQLite 自动迁移 journal。保险起见声明 `.sillyspec/` 可重置（CLAUDE.md），旧 db 异常时可删重建。
- **不改变的 API**：ProgressManager 对外方法名与返回结构不变（仅 async→sync），调用方仅去 `await`。
- **不改变的表结构**：schema 完全不变。
- **行为不变（未配置时）**：单进程串行使用时行为与现状一致（只是引擎换掉）。
- **回退路径**：无运行时引擎回退（单引擎）；代码级回退用 `git revert`。

## 10. 风险登记

| 编号 | 风险 | 等级 | 应对策略 |
|---|---|---|---|
| R-01 | npm 边缘平台安装失败（Alpine musl / Win-arm64 / BSD 无 prebuilt，触发 node-gyp 编译失败） | P1 | prebuilt 覆盖主流平台；README/engines 声明支持范围，边缘不保证；better-sqlite3 选 v11.x 稳定版 |
| R-02 | 大规模同步化改动引入回归（调用方漏改 `await`，或 async→sync 语义差异） | P0 | 全量 `npm test` + grep `await pm` 审计调用点 + 类型/返回值一致性逐点核对 |
| R-03 | 废 gate-status 后 hook 读路径失效（execute 期 worktree-guard 守卫失效） | P0 | hook 直读 DB 用 WAL 只读连接；新增 execute 期守卫边界用例测试（含 hook 子进程） |
| R-04 | WAL `-wal`/`-shm` 侧车文件污染 git / 被误提交 | P1 | `.gitignore` 加 `*.db-wal`/`*.db-shm`；doctor 提示 |
| R-05 | hook 子进程 `require('better-sqlite3')` 原生绑定加载失败（resolve 路径 / 子进程环境） | P1 | `createRequire.resolve` + 子进程实测三平台 |
| R-06 | better-sqlite3 版本对 Node 18 prebuilt 覆盖不全 | P1 | 锁定 v11.x 稳定版 + CI 覆盖 Node 18/20/22 × linux/mac/win |
| R-07 | 多进程并发测试 flaky（竞态难稳定复现） | P2 | 确定性压力测试（spawn N 进程并发写同一 db 断言无 lost update）+ 重试隔离 |
| R-08 | WAL 单写者冲突：WAL 同时仅允许一个写者，两个并发 `--done` 中第二者在 busy_timeout=5000 后抛 SQLITE_BUSY；`_write` 大事务（UPSERT 全 stages + 删插全 steps）并发等待概率非零 | P1 | 应用层对 SQLITE_BUSY 加有限重试+退避；评估 busy_timeout 增大；`_write` 事务缩小持锁窗口（只写变更 change 的行，不整表删插） |
| R-09 | hook WAL readonly 连接仍需 `.runtime` 可写（建/更新 `-shm` 索引文件）——环境假设当前满足但未显式化 | P2 | design/文档显式化该假设；hook 子进程 resolve 失败时 fail-closed + warn |

## 11. 自审

- [x] 背景/设计目标/非目标/拆分判断/总体方案/文件变更清单/接口定义/数据模型/兼容策略/风险登记 十章节齐
- [x] 文件变更清单含数据流标注（sillyspec.db 持久化、gate-status 删除两处对外流转已标 producer→consumer）
- [x] 生命周期契约：已写豁免短语（本变更为持久化引擎替换，不涉及 session/lease/claim/heartbeat 等生命周期事件）
- [x] 方案与用户确认一致（方案 A：better-sqlite3 + 废 gate-status + doctor 对账 + hook 直读 DB）
- [x] 覆盖 H1/H2/H3/H4 四缺陷（H1/H2/H4 写者面随 WAL 消除，H3 随废双源根除，H4 检测面随对账补上）
- [x] risk_level=high（架构级 + npm 发布影响 + 大范围同步化，design 命中架构/数据库/并发关键词）
- [x] 无 scope creep（非目标明确排除双引擎/数据迁移/schema 变更/性能主题）
