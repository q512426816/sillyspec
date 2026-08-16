---
author: qinyi
created_at: 2026-05-13T08:38:20
source_commit: 4401b3d
updated_at: 2026-08-16T19:30:00+08:00
generator: sillyspec-scan
---

# INTEGRATIONS

sillyspec 主 CLI 仅依赖 7 个外部 npm 包（见 package.json dependencies），其中 `src/` 实际 import 的只有 **sql 类 0 个（已迁 node:sqlite 原生）+ js-yaml / @inquirer/prompts / chalk / ora 共 4 个**；chokidar / ws / open 仅 `packages/dashboard/` 子包使用。所有使用位置均经 grep 在 `src/` 与 `packages/` 下确认。

## 网络 / 平台同步（零外部依赖）

- **Node.js 原生 fetch（HTTP POST）** — 用于 SillyHub 平台同步
  - 使用位置：`src/sync.js`（`fetch(url, {...options, signal})` 行 201/233；`method: 'POST'` 行 288/419/503/991；`AbortController` 超时控制行 198/230；`REQUEST_TIMEOUT_MS = 10_000` 行 29）
  - 用法要点：SyncManager 独立于 ProgressManager，best effort——所有网络失败仅 `console.warn`，不抛错、不阻塞主流程；超时 10s；读取 `.sillyspec/local.yaml` 的 platform 段配置（connect/disconnect 用文本级改写保留注释/结构）。
  - 同步契约：`POST {url}/api/changes/{name}/progress`（行 417）、`POST {url}/api/changes/{name}/documents`（行 501）、`GET {url}/api/changes/{name}/approval`（行 536）、approve/reject（`sync.js:1023`/`sync.js:1027`，端点契约 TBD-hub-api 以 SillyHub 实际 API 为准）；409 冲突读回平台最新 JSON。
  - 注意：依赖 Node 内置 fetch，无额外 HTTP 库依赖。

- **SillyHub MCP 客户端（streamable HTTP）** — `src/sillyhub-mcp/`
  - `client.js`：`SillyHubMcpClient`，JSON-RPC 2.0 over `POST {url}/mcp/`（尾斜杠必需，Bearer token，MCP 协议 2025-11-25）；响应兼容 application/json 与 text/event-stream（SSE）。best-effort 契约同 sync：网络失败 / 非 2xx 一律 console.warn，保守返回 unavailable / 空 / false，绝不抛穿到 execute。
  - `config.js`：`readMcpConfig` 凭据共享 helper——优先级 `local.yaml mcp 段（url+token 两键齐全） > env SILLYHUB_MCP_URL / SILLYHUB_MCP_TOKEN`。
  - 消费点：dispatch probe 能力探测、dispatch 策略生成、execute 派发三态判定。
  - 仅用 Node 原生 fetch，不引入新依赖。

- **派发抽象（dispatch）** — `src/dispatch/`：probe 能力探测（无 MCP 配置快速路径不发网络；负面结果 TTL 缓存）+ strategy 策略生成（sillyhub / local 双后端）+ backends/ 指令模板。CLI 入口 `sillyspec dispatch probe|hint`。**dispatcher 不是 JS 执行体**——只生成注入 execute prompt 的指令文本，实际 tool 调用由 agent 执行。

## 存储 / 数据持久化（零外部依赖）

- **node:sqlite（DatabaseSync，Node 原生）** — 进度权威状态源
  - 使用位置：`src/db-engine.js`（引擎抽象层：openDatabase / applyPragmas / runTransaction；WAL + busy_timeout=5000 + BUSY 退避）、`src/db.js`（DB 封装：schema 建表 / `_openWithFallback` 主库→.bak→全新 逐级回退）
  - 历史变更：sql.js（SQLite WASM）已于 2026-08-11 移除——node:sqlite 打开即持久化（DDL/事务提交直接落盘），不再需要 sql.js 时代的整库 export `_save()` 与写前 `.bak` 备份。`.runtime/sillyspec.db` + WAL 侧车。
  - 这是 `engines.node >= 22.13` 的主要约束来源（node:sqlite 需较新 Node 版本）。

## 终端 UI

- **chalk** — 彩色终端输出
  - 使用位置：`src/init.js:6`、`src/migrate.js:3`、`src/setup.js:4`
  - 用法要点：初始化、迁移、MCP 配置引导过程中的彩色提示信息。

- **ora** — 终端加载动画 spinner
  - 使用位置：`src/setup.js:5`
  - 用法要点：setup 流程中的长时间操作反馈（如 MCP 服务器安装）。

## 交互式输入

- **@inquirer/prompts** — 命令行交互式提示
  - 使用位置：`src/init.js:4`（checkbox, confirm, input）、`src/setup.js:6`（checkbox, input）、`src/run/quick-audit.js:12`（checkbox——quick 多变更关联选择）
  - 用法要点：绿地初始化、MCP 配置引导、quick 审计交互。`--non-interactive` flag 供 CI/脚本禁用。

## 配置 / 数据解析

- **js-yaml** — YAML 解析
  - 使用位置：`src/workflow.js:14`（工作流定义）、`src/classify-change.js:10`、`src/docs-check.js:17`、`src/dispatch/probe.js:17`、`src/sillyhub-mcp/config.js:23`、`src/stages/plan-postcheck.js:19`
  - 用法要点：解析 workflows/*.yaml、local.yaml（mcp / dispatch / docs-check 段等）。注意：`src/sync.js` 与 `src/hooks/worktree-guard.js` 对 local.yaml 用轻量手写/文本级解析（保留注释与结构），未使用 js-yaml；`src/config-schema.js` 是 local.yaml 配置键的单一数据源。

## 文件监听（仅子包，主 CLI 不使用）

- **chokidar** — 跨平台文件监听
  - 使用位置：`packages/dashboard/server/watcher.js:219`（`chokidar.watch(watchPaths, ...)`，import 在行 1）
  - 用法要点：**仅 dashboard 子包使用**，主 CLI（src/、bin/）未引入。监听项目文件变更并推送至面板。

## WebSocket（仅子包，主 CLI 不使用）

- **ws（WebSocket / WebSocketServer）** — 实时通信
  - 使用位置：`packages/dashboard/server/index.js:2`（`new WebSocketServer({ server })` 行 456）、`packages/dashboard/src/composables/useWebSocket.js`（前端 `new WebSocket(wsUrl)`）
  - 用法要点：**仅 dashboard 子包使用**，主 CLI 未引入（历史上 sync.js 曾用 ws 做实时事件，已移除——grep `src/` 无 ws import 实证）。服务端推送文件变更事件至前端面板。

## 外部动作（仅子包，主 CLI 不使用）

- **open** — 打开系统默认浏览器
  - 使用位置：`packages/dashboard/server/index.js:7`
  - 用法要点：**仅 dashboard 子包使用**，启动面板后自动打开浏览器（`--no-open` 关闭）。

## 机器接口（对外程序化集成）

- **machine-interface v1**（`src/machine-interface.js`）：把门控与事实核验抽成统一 JSON envelope + 退出码契约（`sillyspec gate` / `sillyspec derive`），供 SillyHub driver 程序化消费；只读语义（不写 sillyspec.db），`--json` 模式 stdout 纯 JSON。

## 备注

- 主 CLI（src/、bin/）实际引入的外部依赖：js-yaml、@inquirer/prompts、chalk、ora 共 4 个。
- chokidar、ws、open 三个依赖虽在 package.json 中声明，但仅在 `packages/dashboard/` 子包内使用，主 CLI 流程不依赖。
- 所有网络通信（平台同步 + MCP 客户端）依赖 Node 内置 fetch，无 axios/node-fetch 等额外 HTTP 库；存储走 node:sqlite 原生引擎，无 WASM 依赖。
- 测试入口 `test/run-tests.mjs` 使用原生 `node:test` + 自定义断言，无第三方测试框架依赖。
