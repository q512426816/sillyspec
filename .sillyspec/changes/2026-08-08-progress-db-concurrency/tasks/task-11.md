---
id: task-11
title: hook `queryDbFirstCell` 子进程改 require('better-sqlite3') 只读连接 + createRequire.resolve + 失败 fail-closed warn
title_zh: hook 子进程 queryDbFirstCell 改 better-sqlite3 只读连接（失败 fail-closed）
author: qinyi
created_at: 2026-08-09 00:32:15
priority: P0
depends_on: [task-10]
blocks: [task-16]
requirement_ids: [FR-06, NFR-04]
decision_ids: [D-01, D-02]
allowed_paths:
  - src/hooks/worktree-guard.js
goal: >
  hook queryDbFirstCell 子进程从 sql.js 换 better-sqlite3 只读连接（WAL 并发读不阻塞主进程写），
  原生绑定经 createRequire.resolve 解析绝对路径传入子进程，resolve 或打开失败时 fail-closed
  打印 warn 并返回 null，保证废 gate-status 后 hook 三平台可直读 DB（R-03/R-05/R-09）。
implementation:
  - queryDbFirstCell 子进程脚本由动态 import('sql.js') 改同步 require(betterSqlite3 绝对路径)，去掉 pathToFileURL 与 import().then 的 async 包装（better-sqlite3 为同步原生 API）
  - 只读连接参数：new Database(dbPath, options)，options 同时带 readonly 与 fileMustExist 两个布尔并置 true；查询 db.prepare(sql).get() 取第一行第一列，空结果返回 null
  - 原生绑定解析：createRequire(import.meta.url).resolve('better-sqlite3') 得绝对路径，经 JSON.stringify 嵌入子进程脚本（子进程 cwd 为项目目录，不能裸 require 包名）
  - 失败路径 fail-closed：resolve 抛错、db 不存在、fileMustExist 打开失败、子进程超时或崩溃——一律 console.warn（含 e.stderr 详情）并返回 null，调用方（readCurrentStage/isNoWorktreeMode）对 null 走 fail-closed，禁止 fail-open
  - 注释同步：更新 queryDbFirstCell 函数头注释，显式化 WAL readonly 连接需 .runtime 可写（建/更新 -shm 索引）的环境假设（R-09）
  - 收尾检查 worktree-guard.js 内 sql.js / initSqlJs / pathToFileURL 引用清零（全文件仅 queryDbFirstCell 一处曾用）
acceptance:
  - 子进程脚本使用同步 require，queryDbFirstCell 内不再出现 import('sql.js') 与 pathToFileURL
  - 只读连接参数含 readonly 与 fileMustExist 且均置 true，未打开写连接
  - resolve 失败 / db 不存在 / 查询异常 / 超时 → 打印 warn 并返回 null 不抛错（fail-closed）
  - readCurrentStage / isNoWorktreeMode 经 queryDbFirstCell 从 sillyspec.db 直读 current_stage 与 no_worktree 正常
  - hook 子进程三平台（Linux/macOS/Windows）可直读 DB，完成标准达成
verify:
  - node --input-type=module -e "import {_queryDbFirstCellForTest as q} from './src/hooks/worktree-guard.js'; console.log('cell=' + q(process.cwd(), 'SELECT 1'))"
  - grep -nE 'sql\\.js|pathToFileURL|initSqlJs' src/hooks/worktree-guard.js
  - grep -nE 'better-sqlite3|readonly|fileMustExist' src/hooks/worktree-guard.js
  - npm run lint
constraints:
  - 仅允许修改 src/hooks/worktree-guard.js 单文件（queryDbFirstCell 与其注释）
  - 只读连接必须 readonly 与 fileMustExist 双参数，不得退化为写连接
  - 失败一律 fail-closed（warn + null），禁止 fail-open 跳过守卫
  - 子进程脚本保持全平台兼容，Windows 下 require 绝对路径直接可用，无需 file:// URL 转换
  - 既有 catch 降级语义（超时/崩溃 warn + null）必须保留，不得静默吞错
  - 不接管测试重写：worktree-guard-db-fallback 等 sql.js/gate-status 依赖测试归属 task-14
related_tests:
  - path: test/worktree-guard-db-fallback.test.mjs
    reason: 直接 import _queryDbFirstCellForTest 且依赖 sql.js 子进程与 async DB（await db.init），引擎替换后失效，重写归 task-14
---
