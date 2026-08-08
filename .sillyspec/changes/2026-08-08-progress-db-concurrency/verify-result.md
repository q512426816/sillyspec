---
author: qinyi
created_at: 2026-08-09 03:57:41
---

# 验证报告（Verify Result）

## 结论

**PASS**

进度库引擎从 sql.js（WASM 内存「整库 load→export 写回」）换 better-sqlite3（原生 WAL 真并发），废除 gate-status.json 双源。4 缺陷（H1 整库 lost update / H2 sync.js 隐藏写者 / H3 gate-status stale fail-open / H4 doctor 读写不分）全修复。task-01~17 全完成，全量 npm test 143/0 绿，lint 74 文件过，独立 acceptance 审查 13/13 pass。

## 任务完成度

| Task | 完成度 | 证据 |
|---|---|---|
| task-01 | ✅ | package.json +better-sqlite3 ^11.x；node require 可加载；npm test 仍绿 |
| task-02 | ✅ | .gitignore +*.db-wal/*.db-shm；README 平台声明 |
| task-03 | ✅ | db.js 重写 better-sqlite3（WAL+busy_timeout+foreign_keys，删 _save/_loadDatabase/_atomicWriteSync，transaction 原生） |
| task-04 | ✅ | .bak 损坏回退改 better-sqlite3 API（三态回退） |
| task-05 | ✅ | SQLITE_BUSY 应用层有限重试（MAX_BUSY_RETRIES=3 退避 50/100/200ms）+ _write 持锁窗口评估 |
| task-06 | ✅ | doctor-diagnostics.js sql.js→better-sqlite3 只读探测（D1 多 db 检测） |
| task-07 | ✅ | progress.js _ensureDB/read/_write/readGlobal 去 async，不缓存快照 |
| task-08 | ✅ | progress/ 子模块 49 方法去 async + 20 transaction 适配 + 修 9 处双引号 SQL regression |
| task-09 | ✅ | 调用方 10 文件 63 await + 3 async 去除（grep=0） |
| task-10 | ✅ | 废 gate-status.json（删 _updateGateStatus/readGateStatus，hook 改直读 DB） |
| task-11 | ✅ | hook queryDbFirstCell 子进程 better-sqlite3 readonly+fileMustExist + 删 sql.js 依赖 |
| task-12 | ✅ | consistency-doctor detectLostUpdateSignals 对账 |
| task-13 | ✅ | repairConsistency 经原生 transaction 验证（WAL 并发安全） |
| task-14 | ✅ | 6 测试重写 + 修 waitOptions 数组展开 Too many parameters 真 bug + gate-status 收尾 |
| task-15 | ✅ | db-concurrency.test.mjs 8 进程×100=800 连跑 2 轮无 lost update（G1/AC-01） |
| task-16 | ✅ | worktree-guard-execute-guard.test.mjs 4 边界 + fail-closed 10/0（G2/AC-02） |
| task-17 | ✅ | 文档同步 better-sqlite3 + 删 gate-status（file-lifecycle 全家+interface-contract+doctor SKILL） |

## 设计一致性

对照 design.md 逐节核验：
- **§5 D-01~04 决策**：D-01 换 better-sqlite3（✅ db.js 全量重写）/ D-02 废 gate-status 双源 DB 单一权威（✅ task-10/11）/ D-03 schema 不变 DB_SCHEMA_VERSION=3（✅ 保留 _createSchema/_migrateAddColumn）/ D-04 无数据迁移（✅ 旧 db 直接 better-sqlite3 打开）。
- **§7 Phase**：Phase 1-7（依赖→db.js→.bak/doctor/PM→BUSY/子模块→调用方/废 gate-status/doctor 对账→hook/doctor 事务→测试→文档）全对应 Wave 0-7/task-01~17。
- **§8 兼容策略**：schema 不变 ✅、旧 db 可直接打开 ✅、PM 方法名不变仅 async→sync ✅（外部零感知）。
- **§G1-G4 验收门 / AC-01~05**：见下探针 + 测试结果。
- **§6 文件清单**：38 文件全覆盖（apply 校验过）；task-14 窗口连带 src 文件（worktree.js/index.js/init.js/progress.js）补入 task-14 allowed_paths 对齐 review.json changedFiles。

## 探针结果

- **未实现标记扫描**：src/ 无新增 TODO/FIXME/HACK（gate-status 废除相关清理完成，无占位）。
- **关键词覆盖**：`better-sqlite3`/`WAL`/`busy_timeout`/`db.transaction(fn)` 全落地；`sql.js`/`initSqlJs` 代码引用零（仅 db.js 迁移注释）；`gate-status` 代码依赖零（仅 5 处描述性注释残留 cosmetic）。
- **测试覆盖**：G1/G2/G3/G4 + AC-01~05 均有对应测试实证（见测试结果）。
- **决策追踪覆盖**：D-01~04 → FR → task → evidence 矩阵完整（见下）。
- **API 契约对账**：PM 公共方法签名不变（read/_write/init/_ensureDB/listChanges 等），仅 async→sync；DB_SCHEMA_VERSION=3 不变；hook shouldBlock/shouldBlockWrite 接口不变，内部 readGateStatus→queryDbFirstCell 直读 DB。
- **代码删除对账**：`.sillyspec/.runtime/gate-status.json` 概念性删除（design §6 列，运行时产物不再生成）；`sql.js` 依赖删除（task-11，最后消费者已迁）；无未声明整文件删除（git diff --name-status 无意外 D）。

## 决策追踪矩阵

| 决策 ID | FR | Task | Evidence | 状态 |
|---|---|---|---|---|
| D-01 换 better-sqlite3 | FR-01/FR-02/NFR-01 | task-01/03/04/05/07/08 | db.js WAL+busy_timeout+原生 transaction；db-concurrency.test.mjs 800/800 | PASS |
| D-02 废 gate-status 双源 | FR-05/NFR-04 | task-10/11/16 | hook queryDbFirstCell 直读 DB；worktree-guard-execute-guard 10/0 fail-closed；grep src gate-status 代码依赖零 | PASS |
| D-03 schema 不变 | FR-03 | task-03 | DB_SCHEMA_VERSION=3 保留；_createSchema/_migrateAddColumn 保留；旧 db 直接打开 | PASS |
| D-04 无数据迁移 | FR-04 | task-03/13 | better-sqlite3 直接打开旧 sillyspec.db；无迁移脚本 | PASS |
| H1 整库 lost update | NFR-01 | task-03/05/15 | db-concurrency 8 进程×100=800 连跑 2 轮无 lost update | PASS |
| H2 sync.js 隐藏写者 | FR-02 | task-07/09 | sync.js await pm.* 去除，WAL 多连接并发安全 | PASS |
| H3 gate-status stale | NFR-04 | task-10/11/16 | 废双源，hook 直读 DB fail-closed | PASS |
| H4 doctor 读写不分 | FR-06 | task-06/12 | doctor 只读探测 + detectLostUpdateSignals 对账（诊断/写分离） | PASS |

## 测试结果

- **全量 npm test**（apply 后 main 工作区）：`EXIT=0`，grand summary `✅ 通过: 143 ❌ 失败: 0`（含 2 新增测试 + 6 重写测试 + 全既有套件零回归）。CLI verify 完成门将复跑 local.yaml commands.test 对账。
- **npm run lint**：Checked 74 JavaScript files，exit 0。
- **G1/AC-01 并发无 lost update**：`node test/db-concurrency.test.mjs`，8 进程×各 100 次小事务自增=期望 800，连跑 2 轮一致，8 子进程全 exit 0 无 SQLITE_BUSY（走 DB 类生产路径 WAL+busy_timeout+BUSY 重试）。
- **G2/AC-02 execute 期守卫不 fail-open**：`node test/worktree-guard-execute-guard.test.mjs`，10/10——hook 子进程 execFileSync 真实 node require better-sqlite3 readonly+fileMustExist 直读 DB execute 命中；shouldBlock 4 边界（registered 放行/unregistered 拦截/主工作区拦截/no_worktree=1 拦截）；fail-closed db 缺失/损坏→null+源码写拦截。
- **G3 doctor 对账**：`node test/consistency-doctor-lost-update.test.mjs`，5/5，detectLostUpdateSignals 对账正确。
- **G4 npm install 零编译**：better-sqlite3 11.10.0 prebuilt `better_sqlite3.node` 就位（Win x64 零编译）。
- **AC-03~05 兼容**：schema 不变（DB_SCHEMA_VERSION=3）、旧 db 直接打开、PM 方法名不变仅 async→sync——既有 run-complete-step/machine-interface/quick-session 等套件零回归佐证。

## 技术债务

- **dead await ×2**（cosmetic，非阻断）：`src/progress.js:735`（`await this.read`）/ `:808`（`await this._write`）在 async `alignExecuteToPlan` 内，目标方法已同步化，await 同步返回值 no-op（功能无害），不在 R-02 grep 模式（`pm.|this.pm.,this._ensureDB,progressManager.`）内。建议后续独立 quick 清理 + alignExecuteToPlan 本身可考虑去 async（需同步更新调用方）。
- **gate-status 描述性注释残留 ×5**（cosmetic）：fs-atomic.js:52 / machine-interface.js:10,324 / run/gates.js:552 / index.js:1413（描述性注释，非代码依赖）。建议同 quick 一并清理。
- **_module-map.yaml schema_version=1**（既有，非本变更引入）：file-lifecycle.md 已记，模块解析可能错位，与本变更无关。

## 变更风险等级

**显式声明 = contract-required**（design.md frontmatter `risk_level: contract-required`，覆盖 detectChangeRisk 关键词误判）。

理由：detectChangeRisk 机械扫描 design/plan 命中 session/lease/lifecycle/claim/heartbeat 关键词误判 integration-critical（强制 real_daemon_backend_integration + runtime_log_evidence）——本变更是 DB 引擎库替换 + 并发契约，**无 daemon/backend/session 状态机**，关键词命中纯属 false-positive（session 出自 quick-session-isolation 测试名、lifecycle 出自 file-lifecycle 文档）。真实风险等级 contract-required：需 unit_tests（npm test 143/0）+ contract_tests（db-concurrency 多进程真并发 + hook 子进程真直读 DB，非 mock），二者均满足。design 原 frontmatter `risk_level: high` 非 RISK_LEVELS 合法值被忽略，已修正为 contract-required。

requiredVerification = [unit_tests, contract_tests]——均实证满足。

## Runtime Evidence

N/A——risk_level=contract-required，非 integration-critical/deployment-critical，无 daemon/backend。并发契约证据见测试结果 G1（多进程真并发，非 mock 单测）。

## 代码审查

**独立 acceptance 审查**（stage-reviews/execute-review-2026-08-09-033611/review.json，docHash 35d2a570 双口径对照，13/13 checklist pass，specVerdict/qualityVerdict=pass）已由独立子代理完成，独立重跑 npm test 143/0 + lint 74 + G1/G2/G3/G4。

发现的真实问题（均 cosmetic 非阻断，已记入技术债务）：
1. dead await ×2（progress.js:735/808，no-op 无害）。
2. gate-status 描述性注释残留 ×5（非代码依赖）。
3. 简报 base SHA a99282e 标注误（实为 task-11 commit，非「引擎改动前」）——审查按真实范围 5b4033d..2cd295a 核查，design §6 文件清单 100% 覆盖。

**总体评价**：引擎替换强耦合，Wave 间硬依赖顺序执行无并行偏移；每 Wave 全量 npm test + lint 绿才进下一；better-sqlite3 严拒性暴露 2 处 sql.js 宽容性掩盖的真 bug（双引号字面量/数组展开参数）均按 rule 11 修逻辑非修测试；坑2 草稿机制以预写合法 review 规避；废 gate-status 双源 + hook 直读 DB fail-closed 实证不 fail-open；多进程并发无 lost update 实证根除整库覆盖。生产级质量，可归档。
