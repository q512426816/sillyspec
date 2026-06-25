---
author: qinyi
created_at: 2026-05-13T08:38:20
source_commit: 850b485
updated_at: 2026-06-24T10:18:40+08:00
generator: sillyspec-scan
---

# INTEGRATIONS

sillyspec 主 CLI 仅依赖 7 个外部 npm 包（见 package.json dependencies），按职责分组如下。所有使用位置均经 grep 在 `src/` 与 `bin/` 下确认。

## 网络 / 平台同步

- **Node.js 原生 fetch（HTTP POST）** — 用于 SillyHub 平台同步
  - 使用位置：`src/sync.js`（`fetch(url, {...options, signal})` 行 96；`method: 'POST'` 行 213、283；`AbortController` 超时控制行 93）
  - 用法要点：SyncManager 独立于 ProgressManager，best effort——所有网络失败仅 `console.warn`，不抛错、不阻塞主流程；超时 10s；读取 `.sillyspec/local.yaml` 的 platform 段配置；同步 proposal/design/requirements/tasks 四件套文档。
  - 注意：依赖 Node 18+ 内置 fetch，无额外 HTTP 库依赖。

## 存储 / 数据持久化

- **sql.js（SQLite WASM）** — 进度权威状态源
  - 使用位置：`src/db.js`（`import initSqlJs from 'sql.js'` 行 1；`const SQL = await initSqlJs()` 行 17）
  - 用法要点：封装为 DB 抽象层；`src/progress.js` 通过 `sqlDb.exec()` / `sqlDb.run()` 操作（行 137、161、216、352 等多处）。数据库文件位于 `.sillyspec/.runtime/sillyspec.db`，v1/v2 的 progress.json 已全部迁移至 SQLite。

## 终端 UI

- **chalk** — 彩色终端输出
  - 使用位置：`src/init.js`（行 6）、`src/migrate.js`（行 3）、`src/setup.js`（行 4）
  - 用法要点：用于初始化、迁移、MCP 配置引导过程中的彩色提示信息。

- **ora** — 终端加载动画 spinner
  - 使用位置：`src/setup.js`（行 5）
  - 用法要点：setup 流程中的长时间操作反馈（如 MCP 服务器安装）。

## 交互式输入

- **@inquirer/prompts** — 命令行交互式提示
  - 使用位置：`src/init.js`（`checkbox, confirm, input` 行 4）、`src/setup.js`（`checkbox, input` 行 6）
  - 用法要点：绿地初始化与 MCP 配置引导中的多选/确认/文本输入。

## 配置 / 数据解析

- **js-yaml** — YAML 解析
  - 使用位置：`src/workflow.js`（`import jsYaml from 'js-yaml'` 行 14）
  - 用法要点：解析工作流定义（templates/workflows/*.yaml）。注意：`local.yaml` 的轻量读取在 sync.js / worktree-guard.js 中用手写解析，未使用 js-yaml。

## 文件监听（仅子包，主 CLI 不使用）

- **chokidar** — 跨平台文件监听
  - 使用位置：`packages/dashboard/server/watcher.js`（`import chokidar from 'chokidar'` 行 1；`chokidar.watch(watchPaths, ...)` 行 219）
  - 用法要点：**仅 dashboard 子包使用**，主 CLI（src/、bin/）未引入。监听项目文件变更并推送至面板。

## WebSocket（仅子包，主 CLI 不使用）

- **ws（WebSocket / WebSocketServer）** — 实时通信
  - 使用位置：`packages/dashboard/server/index.js`（`WebSocketServer` from 'ws' 行 2；`new WebSocketServer({ server })` 行 449）、`packages/dashboard/src/composables/useWebSocket.js`（前端 `new WebSocket(wsUrl)`）
  - 用法要点：**仅 dashboard 子包使用**，主 CLI 未引入。服务端推送文件变更事件至前端面板。

## 外部动作（仅子包，主 CLI 不使用）

- **open** — 打开系统默认浏览器
  - 使用位置：`packages/dashboard/server/index.js`（`import open from 'open'` 行 7）
  - 用法要点：**仅 dashboard 子包使用**，启动面板后自动打开浏览器。

## 备注

- 主 CLI（src/、bin/）实际引入的外部依赖：sql.js、js-yaml、@inquirer/prompts、chalk、ora 共 5 个。
- chokidar、ws、open 三个依赖虽在 package.json 中声明，但仅在 `packages/dashboard/` 子包内使用，主 CLI 流程不依赖。
- 所有网络通信依赖 Node 18+ 内置能力（fetch），无 axios/node-fetch 等额外 HTTP 库。
- 测试入口 `test/run-tests.mjs` 使用原生 `node:test`，无第三方测试框架依赖。
