---
author: qinyi
created_at: 2026-08-08 23:59:40
plan_level: full
scale: large
---

# 实现计划（Plan）— 进度库并发安全（better-sqlite3 替换 sql.js）

> 依据 design.md §5（D-01~04 决策 + 7 Phase）/ requirements.md（FR-01~08 / NFR-01~05 / AC-01~05）/ tasks.md（T1~T12）。
> **执行原则**：引擎替换强耦合，Wave 间有硬依赖，**顺序执行、不并行 sub-agent**；每个 Wave 完成必须跑全量 `npm test` + `npm run lint` 绿后才进下一 Wave。
> **修订记录（plan 独立审查 fail 后闭环）**：新增 task-06 覆盖 `doctor-diagnostics.js`（B1）；task-10 显式承接 6 个依赖 sql.js/gate-status 测试重写（B2）；收敛过度声明（stages/*.js、run/concurrent-detect|prompt|shared 实证零 pm 调用）；裁预研 task；统一 `await pm` 审计口径 = 109 处 / 15 文件（含 `this.pm.`/`this._ensureDB`/`progressManager.`）。
> **修订记录（plan step5 蓝图一致性冲突修复）**：db.js 被 Wave1 内 task-03/04/05 共享、consistency-doctor.js 被 Wave4 内 task-12/13 共享（同 Wave execute 强制并行互相覆盖）→ 重排 Wave 为 0~7，同 Wave 内无文件共享；task 定义与 depends_on 不变。

## Wave 0 — 依赖与配置先行
目的：引入 better-sqlite3 并验证可安装/可加载，锁定依赖基础。

- [ ] task-01: package.json 加 `better-sqlite3 ^11.x`、**确认** `engines.node>=18`（现状已有，保留非新增）；`npm install` 验证主流平台零编译装得上（prebuilt）。**本 task 不删 sql.js**——db.js/doctor-diagnostics.js 仍静态 import sql.js，删包会让走 PM/DB 的测试全崩，删依赖动作归 task-06（审查 P1 排序缺口）。完成标准：`node -e "require('better-sqlite3')"` 可加载；现状 `npm test` 仍绿。
- [ ] task-02: `.gitignore` 加 `*.db-wal`/`*.db-shm`；README 声明主流平台支持、musl/Win-arm64 不保证。完成标准：文件落盘。

## Wave 1 — db.js 引擎重写（核心）
依赖 Wave 0。目的：DB 封装换 better-sqlite3，保留 schema 与 `.bak` 回退；**本 Wave 仅 task-03 独占 src/db.js**（task-04/05 后续 Wave 再改 db.js，避免同 Wave 并行覆盖）。

- [ ] task-03: db.js 重写——同步 `new Database(path)`+`journal_mode=WAL`+`busy_timeout=5000`+`foreign_keys=ON`；删 `_save`/`_loadDatabase`/`_atomicWriteSync`/`_renameSyncRetry`/`_sleepSync`；`transaction(fn)` 改原生 `db.transaction(fn)`；保留 `_createSchema`/`_migrateAddColumn`/`DB_SCHEMA_VERSION=3` 戳。完成标准：`npm run lint` 过。

## Wave 2 — .bak 回退 + doctor-diagnostics + PM 同步化
依赖 Wave 1。目的：db.js 收尾（.bak 回退）、清理 doctor-diagnostics sql.js import（含删依赖）、PM 层去 async。**同 Wave 内 task-04（db.js）/task-06（doctor-diagnostics+package.json）/task-07（progress.js）文件互斥**。

- [ ] task-04: `.bak` 损坏回退改 better-sqlite3 API（打开失败 try `.bak`，逐级回退语义对齐原 `_loadDatabase`）。完成标准：损坏/空库/全新三态回退用例可构造。
- [ ] task-06: doctor-diagnostics.js:23 `import initSqlJs from 'sql.js'` 改 better-sqlite3 只读连接（D1 多 db 检测只读探测，被 index.js 引用）。**承接删 sql.js 依赖**：task-06 完成后 package.json 移除 `sql.js` + `npm install`（task-01 不删，避免 db.js/doctor-diagnostics 静态 import 断链崩测试）。完成标准：sql.js 删除后 `doctor --json` 不 import 崩溃（B1）。
- [ ] task-07: progress.js `_ensureDB`/`read`/`_write`/`readGlobal` 去 async；不再缓存快照（better-sqlite3 每次读最新）。完成标准：lint 过。

## Wave 3 — BUSY 容错 + 子模块同步化
依赖 Wave 2。目的：db.js 加 SQLITE_BUSY 重试（task-05，db.js+progress.js 持有），progress/ 子模块去 await（task-08，独占 progress/ 子模块文件）。**同 Wave 内 task-05（db.js+progress.js）/task-08（progress/*.js）文件互斥**。

- [ ] task-05: SQLITE_BUSY 应用层有限重试+退避（R-08）；评估 `_write` 事务缩小持锁窗口（只写变更 change 行）。完成标准：BUSY 重试逻辑含上限，注释说明。
- [ ] task-08: progress/ 子模块（step-store/change-registry/stage-machine/consistency-doctor/shared）同步化去 await。完成标准：lint 过。

## Wave 4 — 调用方同步化 + 废 gate-status + doctor 对账
依赖 Wave 2/3。目的：所有 `await pm.*` 去 await（task-09），废 gate-status 双源（task-10），doctor 对账新增（task-12）。**同 Wave 内 task-09（run/*.js 等 10 文件）/task-10（progress.js+worktree-guard.js）/task-12（consistency-doctor.js+test）文件互斥**。

- [ ] task-09: 调用方同步化（grep 实证 15 文件中的主流程部分）：run/command.js、run/stage.js、run/gates.js、run/complete.js、run/complete-handlers.js、run/quick-audit.js、sync.js、index.js、init.js、machine-interface.js 全部去 `await pm.*`/`await this.pm.*`/`await this._ensureDB`。完成标准：src/ 下 `await (pm\.|this\.pm\.|this\._ensureDB|progressManager\.)` 计数归零。
- [ ] task-10: 废 gate-status.json——删 progress.js `_updateGateStatus`+`_write` 末尾调用、worktree-guard.js `readGateStatus` 优先+墓碑机制；`readCurrentStage`/`isNoWorktreeMode` 改直读 DB。**显式承接 6 个依赖 sql.js/gate-status 的测试重写归属**（db-atomic-write、worktree-guard、worktree-guard-db-fallback、machine-interface、quick-session-isolation、runtime-cleanup-keeps-worktree——删除或改 better-sqlite3 行为/改直读 DB 断言，具体归属 task-14）。完成标准：全 src 无 gate-status.json 写点；worktree-guard 无 readGateStatus；6 个测试在 task-14 内承接（B2）。
- [ ] task-12: consistency-doctor 新增 `detectLostUpdateSignals`（`.runtime/worktrees/<change>` 目录存在 vs DB `current_stage≠execute`）。完成标准：对账逻辑含测试。

## Wave 5 — hook 适配 + doctor 事务验证
依赖 Wave 4。目的：hook 直读 DB（task-11，独占 worktree-guard.js）、doctor repairConsistency 原生 transaction 确认（task-13，独占 consistency-doctor.js+db.js）。**同 Wave 内 task-11/task-13 文件互斥**。

- [ ] task-11: hook `queryDbFirstCell` 子进程改 require('better-sqlite3') 只读连接 + createRequire.resolve + 失败 fail-closed warn。完成标准：hook 子进程三平台可直读 DB。
- [ ] task-13: doctor repairConsistency 确认经原生 transaction（WAL 并发安全）。完成标准：验证。

## Wave 6 — 测试收尾
依赖 Wave 1-5。目的：回归 + 并发验收。**同 Wave 内 task-14（6 测试+2 脚手架）/task-15（db-concurrency 新增）/task-16（execute 守卫新增）文件互斥**。

- [ ] task-14: db/progress 相关测试重写为 better-sqlite3 行为 + **承接 task-10 声明的 6 个 sql.js/gate-status 依赖测试**（修复 import / 改直读 DB 断言 / 删 gate-status 依赖断言）；全量 `npm test` 绿。完成标准：无 async→sync 回归，6 个测试重写完成。
- [ ] task-15: 新增 db-concurrency.test.mjs——多进程并发写同一 db 断言无 lost update（AC-01/G1 验收）。完成标准：确定性压力测试通过。
- [ ] task-16: execute 期 worktree-guard 守卫边界用例（hook 直读 DB，AC-02/G2）。完成标准：测试通过。

## Wave 7 — 文档同步
依赖 Wave 6。目的：文档与代码一致。

- [ ] task-17: 文档同步——docs/sillyspec/file-lifecycle.md（引擎+删 gate-status）+ `.claude/skills/` 进度库描述 + `node docs/prompt/_extract.mjs` 再生（如涉及 stages prompt）。完成标准：文档与代码一致。

## 验收
- 全量 `npm test` + `npm run lint` 绿；src/ `await (pm\.|this\.pm\.|this\._ensureDB|progressManager\.)` 归零（R-02）。
- db-concurrency 回归测试证明多进程并发写无 lost update（G1）。
- hook 直读 DB execute 期守卫不 fail-open（G2）。
- doctor 对账可触发（G3）；`npm install` 主流平台零编译（G4）。
- 对照 design §9 兼容策略核对（schema 不变、旧 db 可直接打开、PM 方法名不变仅 async→sync）。
- **plan 审查 B1/B2 已闭环**：doctor-diagnostics.js 有 task-06 承接；6 个依赖测试有 task-10/14 承接。

## 风险与注意
- **R-02 同步化回归**是最大执行风险：Wave 2-5 每步完成必跑全量 test；`await pm` 审计在 task-09/14 三处核对（口径 109/15）。
- **R-08 WAL 单写者**：task-05 重试逻辑 + task-15 并发测试共同覆盖。
- **R-03 hook 失效**：task-10/11/16 必须含 hook 子进程实测，不只单元测试。
- **R-05 子进程原生绑定**：task-11 createRequire.resolve + 三平台验证。
- 引擎替换不可中途半态提交——任一 Wave 未绿不进下一 Wave。
