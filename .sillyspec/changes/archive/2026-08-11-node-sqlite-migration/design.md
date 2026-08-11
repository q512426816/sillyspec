---
author: qinyi
created_at: 2026-08-11T02:10:00+08:00
change: 2026-08-11-node-sqlite-migration
scale: large
risk_level: unit-sufficient
---

# 设计文档（Design）— db.js 从 better-sqlite3 迁到 node:sqlite（根治安装成本）

> **方向（用户已确认）**：将 SillySpec 的 SQLite 引擎从三方 native addon `better-sqlite3` 迁到 Node.js 内置 `node:sqlite`，根治 node 24+ 安装成本。方案 B（抽象 db-engine 层）。

## 1. 背景

SillySpec 进度库用 SQLite 持久化（`.sillyspec/.runtime/sillyspec.db`），当前依赖 `better-sqlite3@^11.0.0`。better-sqlite3 是 C++ native addon，安装需 `prebuild-install` 拉预编译二进制，无对应二进制时退化 `node-gyp` 现场编译（需 VS build tools / python）。

实证问题（node 24.15.0）：
- better-sqlite3 **11.10.0 与 13.0.3 均无 node 24 prebuilt**（`prebuild-install warn: No prebuilt binaries found (target=24.15.0)`），升级不能解决。
- npm 默认 `block` install-scripts → binding `.node` 文件缺失 → 运行时报 misleading 的「sillyspec.db 损坏」（实为 binding 加载失败，非 db 文件损坏）。
- 用户安装成本上升：需 `npm install -g --allow-scripts=better-sqlite3` 或装编译工具链，违背「CLI 装即用」。

`node:sqlite`（Node.js 内置 `DatabaseSync`）是同一 SQLite C 库的内置绑定，零安装成本、零编译、零 flag（node 24 实证）。API 与 better-sqlite3 同步风格高度同构。

## 2. 设计目标

- **G1 根治安装成本**：`npm install -g sillyspec` 在 node 24+ 零 flag 零编译零额外参数即可用。
- **G2 彻底移除 better-sqlite3**：`package.json` dependencies 删 `better-sqlite3`，package-lock 重算（移除 better-sqlite3 + prebuild-install 子树）。不留 optional fallback（fallback 违背根治初衷）。
- **G3 业务层零改动**：progress.js + progress/{step-store,stage-machine,change-registry}.js + sync.js 的 `.prepare().get/all/run` 调用面不变（API 同构）。
- **G4 行为等价**：WAL 模式、BUSY 退避重试、事务原子性、外键级联、schema 截/`.bak` 回退、只读诊断 fail-closed 全保留。

## 3. 非目标

- **N1 不做双引擎 fallback**：不保留 better-sqlite3 作 optionalDependencies（方案 C 已否决，违背根治）。
- **N2 不改 DB schema**：表结构/列/migration 不变，`DB_SCHEMA_VERSION=4` 不 bump（引擎换不是 schema 变）。现有 `.sillyspec.db` 文件零迁移直接可用。
- **N3 不改 progress 业务逻辑**：只换引擎实现，不改状态机/序列化/import 语义。
- **N4 不引入异步化**：node:sqlite `DatabaseSync` 仍是同步 API，不趁机改 async。

## 4. 拆分判断

引擎替换是**原子变更**，不可半迁（db.js 换了 node:sqlite、doctor 还用 better-sqlite3 = 同进程两套 native 绑定且 better-sqlite3 仍要装）。故单 change 完整覆盖 3 接触点 + engines + 测试 + 依赖清理，不走批量。

## 5. 总体方案（方案 B：抽象 db-engine 层）

### API 实证探测结果（node 24.15.0，无 flag）

| better-sqlite3 | node:sqlite `DatabaseSync` | 缺口处理 |
|---|---|---|
| `new Database(path, {readonly,fileMustExist})` | `new DatabaseSync(path, {readOnly})` | **fileMustExist 无效**（不拒缺失文件，凭空建库）→ 改 `existsSync` 前置门 |
| `.prepare(sql).get/all/run(...)` | 同名同签 | ✅ 同构；`.run()` 返回 `{changes,lastInsertRowid}` 一致 |
| `.exec(sql)` | `.exec(sql)` | ✅ 同构 |
| `.pragma(str)` | **无** | → `.exec("PRAGMA …")`（返回值场景用 `.prepare("PRAGMA …").all()`） |
| `.transaction(fn)` | **无** | → 手写 `BEGIN/COMMIT/ROLLBACK`（better-sqlite3 嵌套自动 SAVEPOINT，node:sqlite 需自行处理） |
| `.pluck()` | **无** | → `.get()/all()` + 取首列 helper |
| `.close()` | `.close()` | ✅ 同构 |
| `{busyTimeout}` | `{busyTimeout: ms}` 构造选项 | ✅ 可用（亦可 `PRAGMA busy_timeout`） |
| foreign_keys | 默认 ON（`enableForeignKeyConstraints`） | ✅ `PRAGMA foreign_keys=ON` 重复设无害 |

### Phase 1：新增 `src/db-engine.js`（统一引擎抽象）

封装 node:sqlite `DatabaseSync` + 消解 3 缺口，**只写一次**，供 db.js / doctor-diagnostics 共用：

- `openDatabase(path, opts)` → `DatabaseSync`。`opts.readOnly`（驼峰）透传；**fileMustExist 语义由调用方 `existsSync` 前置门实现**（db.js 主库创建路径不走门、doctor/guard 只读路径走门）。
- `applyPragmas(db, entries)` → 逐条 `.exec("PRAGMA key = value")`。封装 init 的 4 条 PRAGMA（WAL/busy_timeout/foreign_keys/synchronous）。
- `runTransaction(db, fn)` → 手写事务：`BEGIN` → `try { r=fn(); COMMIT; return r } catch(e) { try{ROLLBACK}catch{}; throw e }`。**嵌套处理**：better-sqlite3 自动 SAVEPOINT；本实现首版用 `SAVEPOINT`/`RELEASE` 支持嵌套（审计 progress 现无嵌套 transaction 调用，但保 SAVEPOINT 防回归）。BUSY 退避重试（`MAX_BUSY_RETRIES` + `BUSY_BACKOFF_MS` + `_sleepSync`）由 db.js wrapper 的 `transaction()` 外层包裹（保留现有重试语义，runTransaction 本身不含重试）。
- `pluckGet(db, sql, params)` / `pluckAll(db, sql, params)` → `.prepare(sql).get(...params)` 取首列值 / `.all(...params).map(r => Object.values(r)[0])`。

### Phase 2：`src/db.js` 改造（wrapper 职责不变）

- `import Database from 'better-sqlite3'` → `import { openDatabase, applyPragmas, runTransaction } from './db-engine.js'`。
- `_openWithFallback`：`new Database(p)` 全换 `openDatabase(p)`；`tryOpen` 探测的 `db.prepare('SELECT count(*) FROM sqlite_master').get()` 保留（node:sqlite 同签）。
- init 的 4 条 `this.db.pragma(...)` → `applyPragmas(this.db, [...])`。
- `transaction(fn)`：`this.db.transaction(fn)` → `runTransaction(this.db, fn)`；外层 BUSY 退避 while 循环保留（包裹 runTransaction）。
- `getDb()` 仍返回原生 `DatabaseSync`（progress 层 `.prepare().get/all/run` 零改动）。
- `_createSchema` / `_migrateAddColumn` 的 `.exec()` 保留（同构）。
- schema 戳 `.schema-version` 逻辑、`.bak` 回退 `copyFileSync` 逻辑全保留。
- **删除** db.js 内所有「better-sqlite3 是原生绑定…」「sql.js 时代…」过时注释，改写为 node:sqlite 语义注释。

### Phase 3：`src/doctor-diagnostics.js` 改造（消除散落 import）

- `import Database from 'better-sqlite3'` → `import { openDatabase, pluckGet, pluckAll } from './db-engine.js'`。
- `probeDb`：`new Database(dbPath, {readonly:true, fileMustExist:true})` → 已有 `existsSync(dbPath)` + `statSync` 判 0 字节门（:63-68），换 `openDatabase(dbPath, {readOnly:true})`（fileMustExist 由既有 existsSync 门承担）。
- `pick(sql)` 的 `db.prepare(sql).pluck().get()` → `pluckGet(db, sql)`。
- `pickCol(sql)` 的 `db.prepare(sql).pluck().all()` → `pluckAll(db, sql)`。
- `pickExecuteStatusByChange` 的 `.prepare(...).all()` 保留（无 pluck）。

### Phase 4：`src/hooks/worktree-guard.js` 子进程（诚实标注不统一）

嵌入 `execFileSync(process.execPath, ['-e', script])` 脚本跑在**用户项目 cwd**，无法 require sillyspec 的 ESM 抽象层（ESM + 进程隔离 + `-e` 字符串）。**诚实边界**：此 1/3 接触点不纳入 db-engine 统一，仍内联最小 node:sqlite 读取。

改造（`queryDbFirstCell` :243-280）：
- **删** `createRequire(import.meta.url).resolve('better-sqlite3')` 绝对路径解析块（node:sqlite 是内置模块，无需 resolve）→ 简化 + 消除 resolve 失败 fail-closed 分支。
- 子进程脚本：`const D=require("node:sqlite")` → `new D.DatabaseSync(dbPath,{readOnly:true})` → `.prepare(sql).get()` 取首列（`.pluck()` 不存在）→ `db.close()`。
- 既有 `existsSync(dbPath)` 前置门（:245-250）保留（替代 fileMustExist）。
- fail-closed 语义（db 查询异常 / 子进程超时 → warn + 返回 null）不变。

**db-engine 统一性覆盖 2/3 进程内接触点（db.js + doctor-diagnostics）；worktree-guard 子进程 1 点因进程隔离诚实标注不统一。** 这是方案 B 的固有边界，已在 brainstorm step4 写明，用户知情选定。

### Phase 5：engines breaking + 版本号

- `package.json` `engines.node`：`>=18` → node:sqlite floor。**task-0 实证**：`node -e "import('node:sqlite')"` 在目标最低 node 直接跑，确认是否需 `--experimental-sqlite` flag；定 floor（候选 `>=22.5` node:sqlite 首现 / `>=24` 实证干净）。node 24.15.0 已实证无 flag。
- 版本号：3.26.0 → **4.0.0**（major bump，破坏性 node 版本要求；semver breaking）。
- README 安装说明同步（删 better-sqlite3 编译注意事项，写 node 版本要求）。

### Phase 6：测试迁移 + 依赖清理

- 现有 `test/*.test.mjs` 直连 better-sqlite3 的（DB 相关测试）改 node:sqlite 或走 db-engine；多数测试经 ProgressManager 间接用 DB，引擎透明则零改。
- 新增 `test/db-engine.test.mjs`：openDatabase（含 existsSync 门）、applyPragmas（journal_mode 生效验证）、runTransaction（成功提交 / 抛错回滚 / 嵌套 SAVEPOINT）、pluckGet/pluckAll（首列取值 / 无行 undefined / 空数组）。
- `npm install` 重算 package-lock（删 better-sqlite3 + prebuild-install + node-gyp-build 子树）。
- 全量 `npm test` + `npm run lint` 在 node:sqlite 下通过。

## 6. 文件变更清单

| 操作 | 文件路径 | 说明 |
|---|---|---|
| 新增 | src/db-engine.js | 统一引擎抽象：openDatabase/applyPragmas/runTransaction/pluckGet/pluckAll。封装 node:sqlite DatabaseSync + 3 缺口 shim |
| 修改 | src/db.js | import 换 db-engine；new Database→openDatabase；pragma→applyPragmas；transaction 内部→runTransaction（BUSY 退避外层保留）；getDb() 返回 DatabaseSync；过时注释改写。**数据流**：getDb() 返回原生 DatabaseSync（producer=db.js init）→ progress.js/4 子模块/sync.js `.prepare().get/all/run`（consumer，零改动，API 同构） |
| 修改 | src/doctor-diagnostics.js | import 换 db-engine；readonly 打开走 existsSync 门+openDatabase({readOnly:true})；pluck().get()→pluckGet；pluck().all()→pluckAll |
| 修改 | src/hooks/worktree-guard.js | queryDbFirstCell 子进程脚本：删 resolve better-sqlite3 块，require('node:sqlite')，DatabaseSync+get() 取首列。existsSync 门保留 |
| 修改 | package.json | dependencies 删 better-sqlite3；engines.node >=18→node:sqlite floor；version 3.26.0→4.0.0 |
| 修改 | package-lock.json | npm install 重算（移除 better-sqlite3 + prebuild-install + node-gyp-build 子树） |
| 修改 | README.md | 安装说明：删 better-sqlite3 编译注意，写 node 版本要求（node:sqlite floor） |
| 修改 | .gitignore | :11 注释「better-sqlite3 运行时产物」→ node:sqlite（WAL 侧车文件仍是 SQLite 产物，仅更新引擎名） |
| 修改 | docs/sillyspec/file-lifecycle.md | :107 better-sqlite3 引用改 node:sqlite（CLAUDE.md 规则 19：db.js 改动同步文件生命周期文档） |
| 修改 | docs/sillyspec/file-lifecycle/worktree-and-guard.md | :215 better-sqlite3 引用改 node:sqlite（queryDbFirstCell 子进程引擎） |
| 修改 | docs/sillyspec/file-lifecycle/storage-and-state.md | :35 better-sqlite3 引用改 node:sqlite（存储与状态文档） |
| 修改 | docs/sillyspec/sillyhub-progress-sync-contract.md | :20「better-sqlite3 WAL」→ node:sqlite WAL（同步契约文档） |
| 新增 | test/db-engine.test.mjs | db-engine shim 单测（openDatabase 门/applyPragmas/runTransaction 提交回滚嵌套/pluckGet/pluckAll） |
| 修改 | test/*.test.mjs（按需） | 直连 better-sqlite3 的 DB 测试改 node:sqlite/db-engine（多数经 ProgressManager 透明无需改） |

## 7. 接口定义（`src/db-engine.js`）

```js
// 打开数据库。opts.readOnly（驼峰）透传 node:sqlite。
// fileMustExist 语义由调用方 existsSync 前置门实现（node:sqlite 不拒缺失文件）。
export function openDatabase(dbPath, opts = {}) → DatabaseSync

// 逐条 exec PRAGMA。entries: [['journal_mode','WAL'], ['busy_timeout','5000'], ...]
export function applyPragmas(db, entries) → void

// 手写事务（node:sqlite 无 .transaction()）。fn 抛错自动 ROLLBACK 且不吞错。
// 嵌套用 SAVEPOINT（better-sqlite3 兼容）。本函数不含 BUSY 重试（由 db.js wrapper 外层包裹）。
export function runTransaction(db, fn) → fn 返回值

// pluck 替代：取第一行第一列，无行 undefined。
export function pluckGet(db, sql, ...params) → any

// pluck 替代：取所有行第一列成数组。
export function pluckAll(db, sql, ...params) → any[]
```

`db.js` wrapper 对外签名不变（`init/close/transaction/getDb/_createSchema/_openWithFallback`）。`getDb()` 返回 `DatabaseSync`（原生 prepare/get/all/run/exec/close 可用，pragma/transaction/pluck 不可用——后者由 db.js 自己经 db-engine 调，不暴露给 progress 层）。

## 7.5 生命周期契约表

**不适用（N/A）**。本变更是 SQLite 引擎层替换（DB 事务/连接生命周期），不涉及 agent 会话生命周期（session/lease/agent_run/daemon）。detectChangeRisk 关键词（lifecycle/complete 等）若机械命中属误报——本变更不改任何 agent 会话/租约/守护进程语义，仅换 DB 引擎实现。已设 frontmatter `risk_level: unit-sufficient` 覆盖（依据：API 同构实证 + 全量测试 + 安装冒烟即充分验证，无需独立 integration review）。

## 8. 数据模型

**不变**。表结构（project/changes/stages/steps/batch_progress/approvals）、列、migration、`DB_SCHEMA_VERSION=4` 全保留。node:sqlite 与 better-sqlite3 同一 SQLite C 库，`.sillyspec.db` 文件格式二进制兼容，现有库零迁移直接可用。

## 9. 兼容策略（brownfield）

- **DB 文件兼容**：现有 `.sillyspec.db` / `.bak` / `-wal` / `-shm` 文件零迁移，node:sqlite 直读（同 C 库，WAL 模式一致）。
- **行为等价**：WAL/busy_timeout/foreign_keys/synchronous 4 PRAGMA 经 applyPragmas 设同值；BUSY 退避重试逻辑（`MAX_BUSY_RETRIES=3`/`BUSY_BACKOFF_MS=[50,100,200]`/`_sleepSync`）保留；schema 戳跳过建表逻辑保留；`.bak` 回退 `copyFileSync` 保留。
- **破坏性**：仅 node 版本要求（engines >=18→floor）。node 18/20/（<floor）用户升级 node 后可用，DB 文件不需任何处理。
- **不变的 API/接口**：`DB` class 对外签名、`ProgressManager` 对外签名、`.sillyspec.db` 文件格式。

## 10. 风险登记

| 编号 | 风险 | 等级 | 应对策略 |
|---|---|---|---|
| R-01 | node:sqlite transaction 嵌套行为与 better-sqlite3 不一致（better-sqlite3 自动 SAVEPOINT，手写 BEGIN 嵌套抛 "cannot start a transaction within a transaction"） | P1 | runTransaction 用 SAVEPOINT/RELEASE 支持嵌套；execute 阶段审计 progress 全部 `db.transaction()` 调用点确认无意外嵌套；新增嵌套事务单测 |
| R-02 | node:sqlite 在 node 22.x 需 `--experimental-sqlite` flag（CLI 用户不会传 flag） | P1 | task-0 实证 22.x/24.x 加载行为；engines floor 定在「无 flag 可用」的最低版本（实证驱动，不猜）。**子进程约束**：worktree-guard 子进程用同一 `process.execPath`，若 22.x 需 flag 子进程 `-e` 脚本也受影响——floor 定无 flag 版本已隐式覆盖主进程+子进程两路 |
| R-03 | node:sqlite 仍打 experimental warning（node 22/24）污染 stderr | P2 | 实证确认；若 warning 存在且影响 hook 子进程 stderr 解析（worktree-guard 读 stderr），文档说明 + 必要时子进程 `--no-warnings` |
| R-04 | fileMustExist 缺失致 doctor/guard fail-closed 保证弱化（node:sqlite 不拒缺失文件，凭空建库） | P2 | 两站点已有 `existsSync` 前置门（实证），fileMustExist 是双保险；迁移后纯靠 existsSync 门，单测覆盖「缺失文件→null/报错」fail-closed 路径 |
| R-05 | run() 返回字段差异致 progress 读 `.changes`/`.lastInsertRowid` 错 | P2 | 实证 node:sqlite `.run()` 返回 `{changes,lastInsertRowid}` 与 better-sqlite3 一致（探测确认）；全量 npm test 覆盖 |
| R-06 | WAL 过渡态可见性在 node:sqlite 子进程读与 better-sqlite3 不同 | P2 | node:sqlite 同 C 库，WAL 可见性一致；worktree-guard 子进程读场景跑现有 hook 测试验证 |
| R-07 | major bump 4.0.0 影响已装用户（engines 不满足 npm 警告） | P2 | semver breaking 合规；README + 发布说明写清 node 版本要求；非强制升级 |

## 11. 决策追踪

见 `decisions.md`。当前版本决策：
- **D-001@v1** clean cut better-sqlite3（不留 optional fallback）→ §3 N1 / §5 Phase 6 覆盖。
- **D-002@v1** 方案 B 抽象 db-engine 层（非方案 A 最小 diff / 方案 C 双引擎）→ §5 总体方案覆盖。
- **D-003@v1** worktree-guard 子进程不纳入 db-engine 统一（进程隔离诚实边界）→ §5 Phase 4 覆盖。
- **D-004@v1** node floor 实证驱动（task-0 跑 `import('node:sqlite')` 定 floor，不猜）→ §5 Phase 5 / R-02 覆盖。

## 12. 自审

- ✅ 12 章节齐全（背景/目标/非目标/拆分/总体方案/文件清单/接口/生命周期/数据模型/兼容/风险/决策/自审）。
- ✅ 文件变更清单含数据流标注（getDb() producer→consumer 零改动）。
- ✅ 接口定义含 db-engine 5 export 签名 + db.js 对外签名不变声明。
- ✅ 生命周期契约表：N/A 已说明（DB 引擎层非 agent 会话），risk_level 覆盖 keyword 误判。
- ✅ 风险登记 7 条含 transaction 嵌套（R-01）/ node flag（R-02）/ fileMustExist（R-04）三大技术风险 + 应对。
- ✅ 兼容策略含 brownfield DB 文件零迁移 + 行为等价 + 破坏性仅 node 版本。
- ⚠️ 自审存疑：R-02 node floor 待 task-0 实证（22.x flag 行为），设计阶段无法定论 floor 具体版本号——已作 task 前置，不阻塞 design 通过。
- ⚠️ 自审存疑：R-01 transaction 嵌套需 execute 阶段审计 progress 调用点确认——grep 初看各 `db.transaction()` 体内部无再调 transaction，但全量测试是最终验证。
