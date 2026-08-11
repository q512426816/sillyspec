---
author: qinyi
created_at: 2026-08-11T09:35:00+08:00
change: 2026-08-11-node-sqlite-migration
plan_level: full
---

# 实现计划（Plan）— db.js 从 better-sqlite3 迁到 node:sqlite

> 依据：design.md（12 章 + frontmatter scale=large risk_level=unit-sufficient）/ requirements.md（FR-01..07）/ decisions.md（D-001..004 全 decided）/ tasks.md（task-01..10）。本计划只做 Wave 分组 + 任务总表 + 关键路径 + 全局验收 + 覆盖矩阵，实现细节（allowed_paths/验收点/verify 步骤）写到 tasks/task-NN.md（execute 阶段展开）。

## Spike 前置验证

| Spike | 验证内容 | 通过标准 | 不通过后果 |
|---|---|---|---|
| spike-01（= task-01，D-004 / R-02） | `node -e "import('node:sqlite').then(m=>console.log(typeof m.DatabaseSync))"` 在目标最低 node（22.x / 24.x）是否需 `--experimental-sqlite` flag；含 worktree-guard 子进程同 `process.execPath` 约束（子进程 `-e` 脚本同样受 flag 影响） | 确认一个「无 flag 可用」的最低 node 版本（node 24.15.0 本地已实证无 flag） | 若 22.x 需 flag → engines.node floor `>=24`；若 22.5+ 无 flag → floor `>=22.5`。floor 定论值写入 task-07 engines.node |

> spike-01 结果只决定 task-07 的 engines.node 字面值；task-02..06/08 在 node 24.15.0（已实证无 flag）上开发不受阻。

## Wave 1（无依赖，并行）

- [x] task-01: 实证 node:sqlite floor（D-004 / spike-01）—— 跑 `import('node:sqlite')` 测 22.x/24.x 是否需 `--experimental-sqlite` flag（含 worktree-guard 子进程同 `process.execPath` 约束），把 floor 定论与实证证据记入 decisions.md D-004（覆盖：FR-06, D-004@v1）
- [x] task-02: 新增 `src/db-engine.js`（openDatabase / applyPragmas / runTransaction / pluckGet / pluckAll，封装 node:sqlite `DatabaseSync` + 3 缺口 shim：pragma→exec / transaction→手写 BEGIN/COMMIT/ROLLBACK（嵌套 SAVEPOINT）/ pluck→helper）（覆盖：FR-01, D-002@v1）
- [x] task-06: 改造 `src/hooks/worktree-guard.js` `queryDbFirstCell` 子进程（D-003：子进程内联 `require('node:sqlite')`，**不纳入 db-engine**）—— 删 `createRequire().resolve('better-sqlite3')` 块（L253）；子进程脚本 `new DatabaseSync(dbPath,{readOnly:true})` + `.prepare(sql).get()` 取首列（`.pluck()` 不存在）；`existsSync(dbPath)` 前置门（L245）保留；fail-closed 语义不变（覆盖：FR-04, D-003@v1）

## Wave 2（依赖 task-02 的 db-engine 抽象）

- [x] task-03: 新增 `test/db-engine.test.mjs`（openDatabase existsSync 门 / applyPragmas journal_mode 生效 / runTransaction 成功提交+抛错回滚+嵌套 SAVEPOINT / pluckGet 无行 undefined / pluckAll 空数组）（覆盖：FR-01）
- [x] task-04: 改造 `src/db.js`（import 换 db-engine；`new Database`→`openDatabase`（L107/134/141）；4 条 `pragma`→`applyPragmas`（L64-67）；`db.transaction(fn)`→`runTransaction(this.db, fn)`（L172），BUSY 退避 while 外层保留；`getDb()` 返回原生 `DatabaseSync`（L190）；`tryOpen` 探测 `prepare().get()` 保留（L109）；`_createSchema`/`_migrateAddColumn` 的 `.exec()` 保留；过时 better-sqlite3/sql.js 注释改写）（覆盖：FR-02, D-002@v1）
- [x] task-05: 改造 `src/doctor-diagnostics.js`（import 换 db-engine；**两处** `new Database` 迁移——L71 `probeDb` + L660 `dumpDb`〔design §5 Phase3 仅提 probeDb，dumpDb 为 plan 补充覆盖，否则 `import Database from 'better-sqlite3'`（L23）删不掉 = clean cut 崩〕；`readonly:true`→`readOnly:true` 驼峰；`pick` 的 `pluck().get()`（L74）→`pluckGet`；`pickCol` 的 `pluck().all()`（L80）→`pluckAll`；`pickExecuteStatusByChange` 的 `.prepare().all()`（L88-91）保留无 pluck；`existsSync`/`statSync` 0 字节门保留；只读 fail-closed 语义不变）（覆盖：FR-03, D-002@v1）

## Wave 3（依赖 task-04，DB 类已包 node:sqlite）

- [x] task-08: 测试迁移——直连 `better-sqlite3` 须改代码 3 个：`test/db-atomic-write.test.mjs`（L12 import / L33 new Database）、`test/machine-interface.test.mjs`（L20 import / L331 new Database）、`test/platform-sync-schema.test.mjs`（L13 import / L38/91/110/144/171 new Database）改 `node:sqlite` `DatabaseSync`（readonly 打开走 `{readOnly:true}`，`.pluck().get()` 取首列改 `.prepare().get()` 取首列）；仅注释提及、经 DB 类透明无需改代码 3 个（`db-concurrency` / `worktree-guard-db-fallback` / `worktree-guard-execute-guard`）顺带清理过时注释（覆盖：FR-02/05）

## Wave 4（依赖 task-01 floor 定论 + task-04/05/06/08 全部 import 站点迁完）

- [x] task-07: `package.json` clean cut —— dependencies 删 `better-sqlite3`；`engines.node` `>=18`→spike-01 定论 floor；`version` `3.26.0`→`4.0.0`（semver breaking）；`npm install` 重算 package-lock（移除 better-sqlite3 + prebuild-install + node-gyp-build 子树）（覆盖：FR-05, FR-06, D-001@v1, D-004@v1）

## Wave 5（依赖 task-07，版本 + 依赖定局；task-09 先于 task-10）

- [x] task-09: 文档同步（CLAUDE.md 规则 19）—— README 安装说明（删 better-sqlite3 编译注意，写 node 版本要求）；`.gitignore:11` 注释引擎名；`docs/sillyspec/file-lifecycle.md:107` / `file-lifecycle/worktree-and-guard.md:215` / `file-lifecycle/storage-and-state.md:35` / `sillyhub-progress-sync-contract.md:20` 的 better-sqlite3 引用全改 node:sqlite；历史 review 文档（review-2026-08-08/09.md）不动（覆盖：FR-07）

## Wave 6（依赖 task-07 + task-08 + task-09，最终验证）

- [x] task-10: 全量验证 + 安装冒烟 —— `npm test` + `npm run lint` 在 node:sqlite 下通过；安装冒烟（node 24+ 零 flag 零编译 `npm install -g` 装即用，无 binding 缺失 / 无 misleading「db 损坏」）；行为等价 spot check（WAL 生效 / BUSY 退避重试 / transaction 抛错回滚 / `.bak` 回退 / 只读诊断 fail-closed）；progress 层源码零改动核验（progress.js + progress/{step-store,stage-machine,change-registry}.js + sync.js 的 `.prepare().get/all/run` 调用面字面不变）（覆盖：FR-02/05/06，G1/G2/G3/G4）

## 任务总表

| 编号 | 任务 | Wave | 优先级 | 依赖 | 覆盖 FR/D | 说明 |
|---|---|---|---|---|---|---|
| task-01 | 实证 node:sqlite floor | W1 | P0 | — | FR-06, D-004@v1 | spike-01，定 engines 字面值，记 D-004 证据 |
| task-02 | 新增 src/db-engine.js | W1 | P0 | — | FR-01, D-002@v1 | 架构基础，gates task-03/04/05 |
| task-06 | 改造 worktree-guard 子进程 | W1 | P0 | — | FR-04, D-003@v1 | 子进程内联 node:sqlite，独立于 db-engine（进程隔离） |
| task-03 | 新增 test/db-engine.test.mjs | W2 | P0 | task-02 | FR-01 | shim 单测（含嵌套 SAVEPOINT） |
| task-04 | 改造 src/db.js | W2 | P0 | task-02 | FR-02, D-002@v1 | wrapper 职责不变，progress 层零改动 |
| task-05 | 改造 src/doctor-diagnostics.js | W2 | P0 | task-02 | FR-03, D-002@v1 | 两处 new Database（probeDb+dumpDb），plan 补 dumpDb |
| task-08 | 测试迁移（3 直连 + 3 注释清理） | W3 | P0 | task-04 | FR-02, FR-05 | 直连 better-sqlite3 测试改 node:sqlite |
| task-07 | package.json clean cut + engines + 4.0.0 | W4 | P0 | task-01, task-04, task-05, task-06, task-08 | FR-05, FR-06, D-001@v1, D-004@v1 | 所有 import 站点迁完才删依赖，npm install 重算 lock |
| task-09 | 文档同步 | W5 | P1 | task-07 | FR-07 | README + .gitignore + 4 模块文档，历史 review 不动 |
| task-10 | 全量验证 + 安装冒烟 | W6 | P0 | task-07, task-08, task-09 | FR-02, FR-05, FR-06 | npm test/lint + node 24 安装冒烟 + 行为等价 spot check |

## 关键路径

task-02 → task-04 → task-08 → task-07 → task-10

（最长依赖链 5 节点；task-01 与 task-06 在 W1 并行不延长关键路径；task-05 同波并行；task-09 与 task-10 在 W5，task-10 末位收尾。）

## 全局验收标准

- [ ] `npm test` 全量通过（node:sqlite 引擎下）
- [ ] `npm run lint` 通过
- [ ] progress 层源码零改动：`src/progress.js` + `src/progress/{step-store,stage-machine,change-registry}.js` + `src/sync.js` 的 `.prepare().get/all/run` 调用面字面不变（G3）
- [ ] `package.json` dependencies 无 `better-sqlite3`；`package-lock.json` 无 `better-sqlite3` + `prebuild-install` + `node-gyp-build` 子树（G2 / D-001）
- [ ] 安装冒烟：node 24+ 零 flag 零编译零额外参数 `npm install -g sillyspec` 装即用，无 binding 缺失、无 misleading「sillyspec.db 损坏」（G1）
- [ ] 行为等价 spot check：WAL 模式生效 / BUSY 退避重试（MAX_BUSY_RETRIES=3 / BUSY_BACKOFF_MS=[50,100,200]）/ transaction 抛错自动 ROLLBACK 不吞错（含嵌套 SAVEPOINT）/ `.bak` 回退 copyFileSync / 只读诊断 fail-closed（缺失/损坏→null）（G4）
- [ ] （brownfield）现有 `.sillyspec.db` / `.bak` / `-wal` / `-shm` 文件零迁移，node:sqlite 直读（同 SQLite C 库二进制兼容）
- [ ] `version` = 4.0.0；`engines.node` 反映 spike-01 定论 floor
- [ ] doctor-diagnostics.js 的 `import Database from 'better-sqlite3'`（L23）已删（两处 new Database 全迁移）

## 覆盖矩阵

| ID | 覆盖任务 | 验收证据 |
|---|---|---|
| D-001@v1（clean cut better-sqlite3） | task-07 | package.json 无 better-sqlite3；lock 无 prebuild-install/node-gyp-build 子树 |
| D-002@v1（方案 B db-engine 抽象层） | task-02, task-04, task-05 | db-engine.js 5 export；db.js + doctor-diagnostics 共用（消除散落 import） |
| D-003@v1（worktree-guard 子进程不纳入 db-engine） | task-06 | 子进程内联 require('node:sqlite')；db-engine 覆盖 2/3 进程内接触点，子进程 1 点诚实标注 |
| D-004@v1（node floor 实证驱动） | task-01, task-07 | spike-01 import('node:sqlite') 22.x/24.x flag 实证；engines.node 写定论 floor |
| FR-01（db-engine 引擎抽象 + 3 缺口 shim） | task-02, task-03 | 5 export 签名可测；单测覆盖门/pragma/事务提交回滚嵌套/pluck |
| FR-02（db.js 迁移，progress 层零改动） | task-04, task-08, task-10 | getDb() 返 DatabaseSync；progress 层 .prepare().get/all/run 字面不变；.run() 返 {changes,lastInsertRowid} |
| FR-03（doctor-diagnostics 迁移） | task-05 | 两处 new Database 迁移；pluckGet/pluckAll；只读 fail-closed 不变 |
| FR-04（worktree-guard 子进程迁移） | task-06 | require('node:sqlite')；删 resolve better-sqlite3 块；fail-closed 不变 |
| FR-05（clean cut 依赖） | task-07, task-08, task-10 | deps 删 better-sqlite3；node 24+ 装即用无 binding 缺失 |
| FR-06（engines floor + 4.0.0 breaking） | task-01, task-07, task-10 | spike-01 定 floor；version 4.0.0；engines 反映 floor |
| FR-07（文档同步） | task-09 | README + .gitignore + 4 模块文档 better-sqlite3→node:sqlite |

## 设计覆盖缺口（plan 已补，execute 须照做）

- **doctor-diagnostics.js `dumpDb` L660 第二处 `new Database`**：design §5 Phase 3 / §6 文件变更清单仅提 `probeDb`（L71），漏列 `dumpDb`（L660）。task-05 allowed_paths 覆盖整文件 + implementation 注明两处迁移（probeDb 用 pluckGet/pluckAll；dumpDb 用 openDatabase({readOnly:true})，`.prepare().all()` 保留无 pluck）。否则 `import Database from 'better-sqlite3'`（L23）删不掉 → clean cut 后 better-sqlite3 已从 deps 移除但仍有 import = 运行时崩。
