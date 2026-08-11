---
author: qinyi
created_at: 2026-08-11T02:31:00+08:00
change: 2026-08-11-node-sqlite-migration
---

# 需求规格（Requirements）— node:sqlite 迁移

## 角色

| 角色 | 说明 |
|---|---|
| SillySpec 用户 | `npm install -g sillyspec` 装即用；node 版本满足 engines floor |
| 多 agent（并发） | 同一项目多 agent 并行操作进度库（WAL 单写者模型保留） |
| SillySpec 维护者 | 引擎集中在 db-engine，未来换引擎只改一处 |

## 功能需求

### FR-01: db-engine 引擎抽象层（node:sqlite 封装 + 3 缺口 shim）

覆盖决策：D-002@v1

Given 新增 `src/db-engine.js`
When 导出 `openDatabase(path, opts)` / `applyPragmas(db, entries)` / `runTransaction(db, fn)` / `pluckGet(db, sql, ...params)` / `pluckAll(db, sql, ...params)`
Then 5 export 签名清晰可测；openDatabase 返回 node:sqlite `DatabaseSync`；applyPragmas 走 `.exec("PRAGMA …")`；runTransaction 手写 BEGIN/COMMIT/ROLLBACK（fn 抛错自动 ROLLBACK 且不吞错）；pluckGet/pluckAll 取首列。

Given `openDatabase(path, {readOnly:true})`
When 打开不存在路径
Then **不凭空建库**（node:sqlite 不拒缺失文件，fileMustExist 语义由调用方 existsSync 前置门承担）。

### FR-02: db.js 迁移（wrapper 职责不变，progress 层零改动）

覆盖决策：D-002@v1

Given `src/db.js` import 换 `./db-engine.js`
When `_openWithFallback` 用 `openDatabase`、init 用 `applyPragmas`、`transaction(fn)` 用 `runTransaction`、`getDb()` 返回原生 `DatabaseSync`
Then schema/fallback/schema-version 戳/BUSY 退避（`MAX_BUSY_RETRIES` + `BUSY_BACKOFF_MS` + `_sleepSync`）逻辑全保留；`progress.js` + `progress/{step-store,stage-machine,change-registry}.js` + `sync.js` 的 `.prepare().get/all/run` 调用**源码零改动**（API 同构）。

Given `.run()` 返回值
When progress 层读 `ins.changes` / `ins.lastInsertRowid`
Then 与 better-sqlite3 同构（node:sqlite `StatementSync.run` 确返 `{changes, lastInsertRowid}`）。

### FR-03: doctor-diagnostics.js 迁移（消除散落 import）

覆盖决策：D-002@v1

Given `src/doctor-diagnostics.js` import 换 `./db-engine.js`
When `probeDb` 用 `existsSync` 门 + `openDatabase(path,{readOnly:true})`、`pick(sql)` 用 `pluckGet`、`pickCol(sql)` 用 `pluckAll`
Then 不再直接 `import Database from 'better-sqlite3'`；只读诊断 fail-closed（db 缺失/损坏→null）语义不变。

### FR-04: worktree-guard.js 子进程迁移（诚实标注不统一）

覆盖决策：D-003@v1

Given `src/hooks/worktree-guard.js` 的 `queryDbFirstCell` 子进程脚本
When 删 `createRequire().resolve('better-sqlite3')` 块、改 `require('node:sqlite')`（内置）、`new DatabaseSync(dbPath,{readOnly:true})`、`.prepare(sql).get()` 取首列
Then 子进程无需 better-sqlite3 安装；fail-closed（resolve 不再需要 / db 查询异常 / 子进程超时→warn+null）语义不变。**db-engine 抽象不覆盖此子进程**（进程隔离，ESM 无法 require，诚实标注）。

### FR-05: clean cut better-sqlite3 依赖

覆盖决策：D-001@v1

Given `package.json` dependencies 删 `better-sqlite3`、`npm install` 重算 package-lock
When 检查 package-lock
Then 无 `better-sqlite3` + `prebuild-install` + `node-gyp-build` 子树。

Given `npm install -g sillyspec` 在 node 24+
When 无 `--allow-scripts` / 无编译工具链
Then 装即用，无 binding 缺失，无 misleading「db 损坏」错。

### FR-06: engines floor + 版本号（breaking）

覆盖决策：D-004@v1

Given task-0 实证 `import('node:sqlite')` 在 22.x/24.x 加载行为
When 确认 22.x 是否需 `--experimental-sqlite` flag（含子进程同 `process.execPath` 约束）
Then engines.node floor 定在「无 flag 可用」最低版本（候选 >=22.5 / >=24，实证驱动）；`version` 3.26.0→4.0.0（semver breaking）。

### FR-07: 文档同步（CLAUDE.md 规则 19）

覆盖：Grill P2.2

Given db.js 改动（文件生命周期代码）
When 更新文档
Then README（安装说明）+ `.gitignore:11`（注释引擎名）+ `docs/sillyspec/file-lifecycle.md:107` + `file-lifecycle/worktree-and-guard.md:215` + `file-lifecycle/storage-and-state.md:35` + `sillyhub-progress-sync-contract.md:20` 的 better-sqlite3 引用全改 node:sqlite。历史 review 文档（review-2026-08-08/09.md）不动（historically accurate）。

## 非功能需求

- **兼容性**：现有 `.sillyspec.db` / `.bak` / `-wal` / `-shm` 文件零迁移，node:sqlite 直读（同 SQLite C 库，二进制兼容）。破坏性仅 node 版本（engines floor）。
- **可回退**：若 node:sqlite 迁移出问题，git revert 本次变更即可回到 better-sqlite3（DB 文件格式兼容，无需数据迁移）。但 better-sqlite3 依赖需手动加回。
- **可测试**：db-engine shim 全部单测覆盖（openDatabase 门/applyPragmas/runTransaction 提交回滚嵌套/pluckGet/pluckAll）；全量 npm test 兜底行为等价。
- **多 agent 并发**：WAL 单写者模型 + busy_timeout + BUSY 退避重试保留，并发安全不退化。
- **跨平台**：node:sqlite 随 Node 内置，Windows/Linux/macOS 一致（消除 better-sqlite3 平台 prebuilt 差异）。

## 决策覆盖矩阵

| 决策 ID | 覆盖的 FR | 说明 |
|---|---|---|
| D-001@v1 | FR-05 | clean cut better-sqlite3，不留 optional fallback |
| D-002@v1 | FR-01, FR-02, FR-03 | 方案 B 抽象 db-engine 层，db.js + doctor 共用 |
| D-003@v1 | FR-04 | worktree-guard 子进程不纳入 db-engine 统一（进程隔离诚实边界） |
| D-004@v1 | FR-06 | node floor 实证驱动（task-0），不猜 |

所有 D-xxx@v1 均被 FR 覆盖，无剩余风险决策。
