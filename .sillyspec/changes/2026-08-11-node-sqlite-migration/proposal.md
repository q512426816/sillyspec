---
author: qinyi
created_at: 2026-08-11T02:30:00+08:00
change: 2026-08-11-node-sqlite-migration
---

# 提案书（Proposal）— db.js 从 better-sqlite3 迁到 node:sqlite

## 动机

SillySpec 进度库依赖 `better-sqlite3`（C++ native addon）。better-sqlite3 **11.10.0 与 13.0.3 均无 node 24 预编译二进制**，node 24 用户 `npm install -g sillyspec` 默认 block install-script → binding 缺失 → 运行报 misleading 的「sillyspec.db 损坏」（实为 binding 加载失败）。用户安装成本上升（需 `--allow-scripts` 或装 VS build tools + python 编译）。

Node.js 内置 `node:sqlite`（`DatabaseSync`）是同一 SQLite C 库的内置绑定，零安装成本、零编译、零 flag（node 24 实证）。迁移到 node:sqlite **根治安装成本**，彻底移除 better-sqlite3 三方依赖。

## 关键问题

1. **node 24 无 prebuilt + npm 默认 block install-script**：升级 better-sqlite3 不能解决（11/13 均无 node 24 二进制），现场 node-gyp 编译需重工具链，违背「CLI 装即用」。
2. **错误信息 misleading**：binding 缺失被报成「db 损坏」，误导排查方向（非 db 文件问题，是 native addon 加载失败）。
3. **三方 native addon 维护负担**：better-sqlite3 需跟进每个 node ABI 版本发 prebuilt，永远滞后新 node；node:sqlite 随 Node 内置，零滞后。

## 变更范围

- 新增 `src/db-engine.js`：封装 node:sqlite `DatabaseSync` + 消解 3 缺口（pragma→exec、transaction→手写 BEGIN/COMMIT/ROLLBACK、pluck→helper），db.js + doctor-diagnostics 共用。
- 改造 `src/db.js`：import db-engine；`new Database`→`openDatabase`；`pragma`→`applyPragmas`；`transaction`→`runTransaction`；`getDb()` 返回 `DatabaseSync`（progress 层零改动）。
- 改造 `src/doctor-diagnostics.js`：import db-engine；`pluck().get()/all()`→`pluckGet/pluckAll`；`readonly`→`readOnly` 驼峰。
- 改造 `src/hooks/worktree-guard.js`：子进程 `require('node:sqlite')`（内置，删 `resolve better-sqlite3` 块）；`DatabaseSync` + `get()` 取首列。
- `package.json`：删 `better-sqlite3` 依赖；`engines.node` >=18→node:sqlite floor；`version` 3.26.0→4.0.0（breaking）；package-lock 重算。
- 文档同步：README + .gitignore:11 + 4 模块文档（file-lifecycle/worktree-and-guard/storage-and-state/sillyhub-progress-sync-contract）的 better-sqlite3 引用。
- 测试：新增 `test/db-engine.test.mjs`；直连 better-sqlite3 的测试改 node:sqlite/db-engine；全量 npm test + lint 通过。

## 不在范围内（显式清单）

- **不做双引擎 fallback**（不留 better-sqlite3 optionalDependencies，方案 C 已否决）。
- **不做文件后端 fallback**（老 node 用户不保兼容；node 18/20 已 EOL，engines floor 砍之，方案 A 用户已确认）。
- **不改 DB schema**（表结构/列/migration 不变，`DB_SCHEMA_VERSION=4` 不 bump；现有 .db 文件零迁移）。
- **不改 progress 业务逻辑**（状态机/序列化/import 语义不动）。
- **不异步化**（node:sqlite `DatabaseSync` 仍是同步 API）。

## 成功标准（可验证）

- `npm install -g sillyspec` 在 node 24+ **零 flag 零编译零额外参数**即装可用（G1）。
- `package.json` dependencies **无 better-sqlite3**；package-lock 无 better-sqlite3 + prebuild-install + node-gyp-build 子树（G2）。
- 全量 `npm test` + `npm run lint` 在 node:sqlite 下通过；progress 层（progress.js + 4 子模块 + sync.js）源码零改动（G3）。
- 行为等价：WAL 模式生效、BUSY 退避重试、事务原子性（提交/回滚）、外键级联、schema 戳跳建表、`.bak` 回退、只读诊断 fail-closed 全保留（G4）。
- engines.node 反映 node:sqlite floor（D-004 实证驱动，无 flag 版本）。
