---
author: qinyi
created_at: 2026-08-11T02:32:00+08:00
change: 2026-08-11-node-sqlite-migration
---

# 任务清单（Tasks）

> scale=large。细节（allowed_paths / 验收点 / commit 粒度）在 plan 阶段展开。

- [ ] task-01: 实证 node:sqlite floor（D-004）—— 跑 `import('node:sqlite')` 测 22.x/24.x 是否需 `--experimental-sqlite` flag（含 worktree-guard 子进程同 `process.execPath` 约束），定 engines.node floor
- [ ] task-02: 新增 `src/db-engine.js`（openDatabase/applyPragmas/runTransaction/pluckGet/pluckAll，封装 node:sqlite DatabaseSync + 3 缺口 shim）
- [ ] task-03: 新增 `test/db-engine.test.mjs`（openDatabase existsSync 门 / applyPragmas 生效 / runTransaction 提交+回滚+嵌套 / pluckGet 无行 undefined / pluckAll 空数组）
- [ ] task-04: 改造 `src/db.js`（import db-engine；new Database→openDatabase；pragma→applyPragmas；transaction→runTransaction 保留 BUSY 退避外层；getDb 返 DatabaseSync；过时注释改写）
- [ ] task-05: 改造 `src/doctor-diagnostics.js`（import db-engine；readonly→readOnly 驼峰；pluck().get()→pluckGet；pluck().all()→pluckAll；existsSync 门保留）
- [ ] task-06: 改造 `src/hooks/worktree-guard.js`（queryDbFirstCell 子进程：删 resolve better-sqlite3 块，require('node:sqlite')，DatabaseSync+get() 取首列；existsSync 门保留）
- [ ] task-07: `package.json` 删 better-sqlite3 依赖 + engines.node floor + version 3.26.0→4.0.0；`npm install` 重算 package-lock（移除 better-sqlite3 + prebuild-install + node-gyp-build 子树）
- [ ] task-08: 测试迁移（test/*.test.mjs 直连 better-sqlite3 的改 node:sqlite/db-engine；多数经 ProgressManager 透明无需改）
- [ ] task-09: 文档同步（README 安装说明 + .gitignore:11 注释 + docs/sillyspec/{file-lifecycle.md:107, file-lifecycle/worktree-and-guard.md:215, file-lifecycle/storage-and-state.md:35, sillyhub-progress-sync-contract.md:20} better-sqlite3→node:sqlite；历史 review 不动）
- [ ] task-10: 全量验证（npm test + npm run lint 在 node:sqlite 下通过 + 安装冒烟：node 24+ 零 flag 零编译装即用 + 行为等价 spot check：WAL/BUSY/transaction 回滚/.bak 回退/只读 fail-closed）
