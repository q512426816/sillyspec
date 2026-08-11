---
author: qinyi
created_at: 2026-08-11T02:12:00+08:00
change: 2026-08-11-node-sqlite-migration
---

# 决策台账 — node:sqlite 迁移

## D-001@v1 — clean cut better-sqlite3

- **type**: architecture
- **status**: decided
- **source**: 用户 AskUserQuestion（迁 node:sqlite 根治方向确认）
- **question**: 迁 node:sqlite 后是否保留 better-sqlite3 作 optionalDependencies fallback 兼容老 node？
- **answer**: 不保留。彻底移除 better-sqlite3 依赖。
- **normalized_requirement**: package.json dependencies 删 better-sqlite3；package-lock 重算移除 better-sqlite3 + prebuild-install + node-gyp-build 子树。不留 optional fallback。
- **impacts**: design §3 N1 / §5 Phase 6 / package.json / package-lock.json
- **evidence**: 方案 C（双引擎）brainstorm step4 否决——optional dep 仍会 attempt install + 可能触发 native 编译，违背「根治安装成本」初衷；双 API 测试矩阵复杂。
- **priority**: P0

## D-002@v1 — 方案 B 抽象 db-engine 层

- **type**: architecture
- **status**: decided
- **source**: 用户 AskUserQuestion（brainstorm step4 方案选择）
- **question**: 迁移走最小 diff（A）/ 抽象 db-engine 层（B）/ 双引擎（C）？
- **answer**: 方案 B——新增 src/db-engine.js 封装 node:sqlite + 3 缺口 shim，db.js + doctor-diagnostics 共用。
- **normalized_requirement**: 新增 src/db-engine.js（openDatabase/applyPragmas/runTransaction/pluckGet/pluckAll）；db.js + doctor-diagnostics import 它，消除 doctor 散落 better-sqlite3 import；单一换引擎点。
- **impacts**: design §5 总体方案 / src/db-engine.js（新增）/ src/db.js / src/doctor-diagnostics.js
- **evidence**: 用户选 B 非 A（A 最小 diff 但 doctor 仍散落 import，无单一换引擎点）；非 C（双引擎违背根治）。
- **priority**: P0

## D-003@v1 — worktree-guard 子进程不纳入 db-engine 统一

- **type**: architecture
- **status**: decided
- **source**: brainstorm step4 诚实边界标注（用户知情选定 B）
- **question**: worktree-guard 嵌入子进程（execFileSync -e 跑用户项目 cwd）能否纳入 db-engine 抽象统一？
- **answer**: 不能。子进程无法 require sillyspec 的 ESM 抽象层（ESM + 进程隔离 + -e 字符串），仍内联最小 node:sqlite 读取。
- **normalized_requirement**: worktree-guard queryDbFirstCell 改 require('node:sqlite')（内置，顺带删 resolve better-sqlite3 块）+ DatabaseSync + get() 取首列。db-engine 统一性覆盖 2/3 进程内接触点，子进程 1 点诚实标注不统一。
- **impacts**: design §5 Phase 4 / src/hooks/worktree-guard.js
- **evidence**: ESM 模块无法被 `-e` 脚本 `require()`；db-engine 是 ESM（sillyspec `"type":"module"`）；子进程跑在用户项目 cwd 非 sillyspec 目录。
- **priority**: P1

## D-004@v1 — node floor 实证驱动

- **type**: requirement
- **status**: decided
- **source**: API 实证探测 + R-02 风险登记
- **question**: engines.node floor 定哪个版本（node:sqlite 首现 22.5 / 实证干净 24）？
- **answer**: floor 定 **>=22.11.0**（node:sqlite 的 --experimental-sqlite flag 要求自 v22.11.0 起移除，v22.11+ / 23 / 24 无需 flag 即可 import，仍发 ExperimentalWarning）。node 24.15.0 本地实证无 flag 可用。
- **normalized_requirement**: engines.node >= 22.11.0。worktree-guard 子进程用同 process.execPath，floor 覆盖主进程 + 子进程两路（子进程 `-e` 脚本同样无需 flag）。
- **impacts**: design §5 Phase 5 / R-02 / package.json engines
- **evidence**: (task-01 实证) node v24.15.0 本地 `import('node:sqlite')` 返回 DatabaseSync function 无 flag；node:sqlite 自 v22.5.0 引入但 v22.5.0-22.10 需 `--experimental-sqlite` flag（nodejs/node#53906），v22.11.0+ 移除 flag 要求（仍 experimental）；`/api/sqlite` Node 文档确认「SQLite is no longer behind --experimental-sqlite but still experimental」。故无 flag 最低版本 = 22.11.0。
- **priority**: P1（已解决）
