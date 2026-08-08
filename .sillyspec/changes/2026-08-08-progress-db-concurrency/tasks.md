---
author: qinyi
created_at: 2026-08-08 23:49:40
scale: large
---

# 任务清单（Tasks）— 进度库并发安全

- [ ] **T1 db.js 重写（Phase 1）**：sql.js→better-sqlite3。同步 `new Database`+WAL/busy_timeout/foreign_keys；删 `_save`/`_loadDatabase`/`_atomicWriteSync`/`_renameSyncRetry`/`_sleepSync`；`transaction` 改原生；保留 `_createSchema`/`_migrateAddColumn`/版本戳；`.bak` 回退改 better-sqlite3 API。（FR-01/02/03）
- [ ] **T2 ProgressManager 同步化（Phase 2）**：`_ensureDB`/`read`/`_write`/`readGlobal` 去 async；不再实例缓存快照。（FR-04）
- [ ] **T3 progress/ 子模块同步化（Phase 2）**：step-store/change-registry/stage-machine/consistency-doctor/shared 跟随去 await。（FR-04）
- [ ] **T4 调用方同步化（Phase 2/4）**：run/command.js、stage.js、complete.js、complete-handlers.js、gates.js、concurrent-detect.js、prompt.js、shared.js、sync.js、index.js、stages/*.js、init.js:315、machine-interface.js:133/370、quick-audit.js:57 全部去 `await pm.*`；grep 审计零遗漏。（FR-04/08）
- [ ] **T5 废 gate-status.json（Phase 3）**：删 `_updateGateStatus`+`_write` 末尾调用；删 readGateStatus 优先+墓碑；`readCurrentStage`/`isNoWorktreeMode` 改直读 DB。（FR-05）
- [ ] **T6 hook 子进程适配（Phase 6）**：`queryDbFirstCell` 子进程改 require('better-sqlite3') 只读连接 + createRequire.resolve + 失败 fail-closed warn。（FR-06）
- [ ] **T7 doctor 对账增强（Phase 5）**：consistency-doctor 新增 `detectLostUpdateSignals`（worktree 目录 vs DB current_stage）。（FR-07）
- [ ] **T8 单写者容错（NFR-03）**：DB 层 SQLITE_BUSY 有限重试+退避；busy_timeout 评估；`_write` 事务缩小持锁窗口。（R-08）
- [ ] **T9 测试重写**：db/progress 相关测试改 better-sqlite3 行为；多进程并发写回归测试 db-concurrency.test.mjs（AC-01）；execute 期守卫边界用例（AC-02）。
- [ ] **T10 打包/配置**：package.json 加 better-sqlite3 ^11.x、删 sql.js、engines.node>=18；.gitignore 加 `*.db-wal`/`*.db-shm`；README 平台声明。
- [ ] **T11 文档同步**：docs/sillyspec/file-lifecycle.md（引擎+删 gate-status）+ .claude/skills/ 进度库描述同步；docs/prompt/_extract.mjs 再生（如涉及 stages prompt）。
- [ ] **T12 验收**：全量 npm test + lint 绿；npm install 主流平台零编译验证；对照 design §9 兼容策略核对。
