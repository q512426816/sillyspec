---
author: qinyi
created_at: 2026-08-08 23:49:40
scale: large
---

# 提案书（Proposal）— 进度库并发安全（better-sqlite3 替换 sql.js）

## 动机
SillySpec 的核心承诺是「多 agent 并发操作同一仓库」，但进度库用 sql.js（SQLite 编译为 WASM 的纯内存库），其「整库 load 到内存 → 整库 export 写回」模型 + `DB.transaction` 无任何跨进程文件锁，导致**跨进程整库 last-writer-wins lost update**。这是项目立身前提上的地基缺陷。

## 关键问题
1. **H1 整库 lost update**：`ProgressManager._ensureDB`（progress.js:195）快照 load 一次缓存在实例永不刷新；长 `execute --done` 进程结尾的整库 `_save` 会抹杀期间另一 agent 落盘的**无关** quick 完成态。窗口=整个进程生命。
2. **H2 sync.js 隐藏写者**：sync.js:223/248 每次 `new ProgressManager` 拿独立快照独立整库写，任何只挂在主 PM 实例上的锁补丁都绕不过它。
3. **H3 gate-status.json stale 双源**：`_updateGateStatus` 从内存快照派生 gate-status.json，多 PM stale 快照互相覆盖墓碑 → worktree-guard hook 在 execute 期 **fail-open**（安全边界失效）。
4. **H4 doctor 是 lost-update 写者且测不出损坏**：回退后的 DB 内部仍自洽，doctor 报 ✅，「越修越坏」。

根因已由代码自承认：db.js:86「sql.js 是纯内存库，PRAGMA journal_mode=WAL 对它无意义」；db.js:109「DB 整体 last-writer-wins 进度丢失仍存（治本需套 withFileLock 或换引擎）」。

## 变更范围
- 进度库引擎从 sql.js 全量替换为 **better-sqlite3**（原生 SQLite，真 WAL 并发，同步 API，原生 `.transaction`）。
- 废除 gate-status.json 双源：worktree-guard hook 改直读 DB（根除 H3）。
- doctor 新增 `.runtime/worktrees/<change>` 目录 vs DB current_stage 对账（H4 检测）。
- ProgressManager 及全部调用方 async→sync 同步化（grep 实证 109 处、15 文件）。
- 覆盖主流程写者（run/*.js）、sync.js、doctor 所有写路径。

## 不在范围内（显式清单）
- 不保留 sql.js 双引擎 fallback。
- 不做进度库数据迁移（.sillyspec 可重置；且 sql.js/better-sqlite3 同为 SQLite 文件格式可直接打开）。
- 不改变 DB schema（6 表 DDL 与 DB_SCHEMA_VERSION=3 不变）。
- 不改变 ProgressManager 对外方法名与返回结构（仅 async→sync）。
- 不解决启动税/热路径性能（独立主题 D/F，另立变更）。

## 成功标准（可验证）
- **G1**：新增多进程并发写回归测试通过——spawn N 进程并发写同一 db，断言无 lost update（旧 sql.js 会丢，新 better-sqlite3 不丢）。
- **G2**：废除 gate-status.json 后，hook 直读 DB 在 execute 期不再因 stale 快照 fail-open；execute 期 worktree-guard 守卫边界用例（含 hook 子进程）通过。
- **G3**：doctor 能基于准确（非 stale）状态修复，新增 worktree 目录 vs DB 对账检测可触发。
- **G4**：`npm install` 在主流平台（Linux/macOS/Windows x64+arm64，Node 18+）零编译成功（prebuilt）。
- 全量 `npm test` + `npm run lint` 通过；单进程串行行为与现状一致。
