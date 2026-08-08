---
author: qinyi
created_at: 2026-08-08 23:49:40
scale: large
---

# 需求文档（Requirements）— 进度库并发安全

## 功能需求

- **FR-01**：DB 层从 sql.js 替换为 better-sqlite3，构造改同步 `new Database(path)`，启用 `journal_mode=WAL`（真生效）+ `busy_timeout=5000` + `foreign_keys=ON`；删除自定义持久化（`_save`/`_loadDatabase`/`_atomicWriteSync`/`_renameSyncRetry`/`_sleepSync`）。
- **FR-02**：`DB.transaction(fn)` 改用 better-sqlite3 原生 `db.transaction(fn)`（自动 BEGIN/COMMIT/ROLLBACK + 嵌套 savepoint），消除手动 `_save()` 整库 export。
- **FR-03**：保留 schema 不变（`_createSchema`/`_migrateAddColumn`/`DB_SCHEMA_VERSION=3` 戳），`.bak` 损坏回退改 better-sqlite3 API。
- **FR-04**：ProgressManager 及全部调用方 async→sync 同步化（`_ensureDB`/`read`/`_write`/`readGlobal` 等去 async，调用方去 `await`），覆盖 grep 实证 109 处、15 文件（含 init.js:315、machine-interface.js:133/370、quick-audit.js:57）。
- **FR-05**：废除 gate-status.json——删除 progress.js `_updateGateStatus` 及 `_write` 末尾调用、worktree-guard.js `readGateStatus` 优先逻辑与墓碑机制；`readCurrentStage`/`isNoWorktreeMode` 改直读 DB。
- **FR-06**：hook 子进程 `queryDbFirstCell` 从 `import('sql.js')` 改 `require('better-sqlite3')` 只读连接（`new Database(path,{readonly:true,fileMustExist:true})`），`createRequire.resolve` 解析原生绑定。
- **FR-07**：doctor 新增 `detectLostUpdateSignals` 对账——`.runtime/worktrees/<change>` 目录存在但 DB `current_stage≠execute` → lost-update 间接信号。
- **FR-08**：同步化后单进程串行行为与现状一致；sync.js `_updatePlatformLastSync`/`_updateApprovalStatus` 经 WAL 单条 UPDATE 原子落盘（不再整库 export）。

## 非功能需求

- **NFR-01 并发安全**：WAL 模式下多进程并发写不再互相覆盖无关变更（H1/H2/H4 写者面消除）；单写串行、读不阻塞写。
- **NFR-02 npm 发布**：better-sqlite3 v11.x，prebuilt 覆盖 Linux/macOS/Windows x64+arm64（Node 18+）零编译安装；边缘平台（Alpine musl/Win-arm64/BSD）声明不保证（R-01）。
- **NFR-03 单写者容错**：对 SQLITE_BUSY 加应用层有限重试+退避（R-08）；busy_timeout=5000；评估 `_write` 事务缩小持锁窗口。
- **NFR-04 环境假设**：hook WAL readonly 连接需 `.runtime` 可写（建/更新 `-shm`），显式化该假设（R-09）；resolve 失败时 fail-closed + warn。
- **NFR-05 侧车文件**：`.gitignore` 加 `*.db-wal`/`*.db-shm`（R-04）。

## 验收标准

- **AC-01**：新增 `test/db-concurrency.test.mjs`——多进程并发写同一 db 断言无 lost update，通过。
- **AC-02**：废 gate-status 后 execute 期 worktree-guard 守卫边界用例（含 hook 子进程直读 DB）通过。
- **AC-03**：doctor `detectLostUpdateSignals` 对账可触发并正确标记。
- **AC-04**：全量 `npm test` + `npm run lint` 通过，无因 async→sync 引入的回归（grep `await pm` 审计零遗漏）。
- **AC-05**：`npm install` 主流平台零编译成功；`.gitignore` 生效不误提交 WAL 侧车。
