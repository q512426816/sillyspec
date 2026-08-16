---
schema_version: 1
doc_type: module-card
module_id: dashboard
author: qinyi
created_at: 2026-06-03T07:42:00+08:00
---

# dashboard

## 定位

SillySpec 的 Web Dashboard，为 CLI 项目提供可视化操作界面。负责：

- 提供 Vue 3 单页应用前端，展示项目概览、文档树、Git 状态、进度流水线
- 提供 Node.js HTTP + WebSocket 服务端，桥接前端与文件系统/CLI
- 实时推送项目变更（fs.watch + progress.json 监听）
- 在浏览器中执行 sillyspec CLI 命令并实时回显输出

**不负责：** CLI 核心逻辑本身、规范引擎、scan/publish 等核心流程。

## 契约摘要

- `startServer({ port, open })` — 启动 HTTP + WebSocket 服务，默认端口 3456
- `discoverProjects()` — 扫描工作目录发现 sillyspec 项目
- `broadcast(data)` — 向所有 WebSocket 客户端推送消息
- WebSocket 消息协议：`cli:execute` / `scan:paths` / `docs:tree` / `project:update` / `progress:update` 等
- `executeCommand(projectPath, command, onOutput, onComplete)` — 子进程执行 CLI 命令
- `parseProjectOverview(projectPath)` / `parseDocsTree()` / `parseGitDetail()` — 前端数据解析器
- `startWatcher(callback)` — 监听文件系统变更并自动刷新
- Vue Composables：`useWebSocket()`（自动重连）、`useDashboard()`（状态管理）、`useLayout()`（拖拽布局）、`useKeyboard()`（快捷键）

## 关键逻辑

```
startServer()
  → 创建 HTTP server（提供静态文件 + API 路由）
  → 创建 WebSocketServer（挂载在同一 server 上）
  → discoverProjects() 扫描工作目录找 .sillyspec 项目
  → startWatcher() 监听文件变更，变更时 broadcast project:update
  → startProgressWatch() 监听 progress.json 变化，推送 progress:update
  → WebSocket on('message') 分发：cli:execute → spawn 子进程，scan/docs → 读取数据并回复

useWebSocket() → Vue composable，connect/disconnect/send/onMessage
  → 自动重连（3s 间隔），onMounted 时连接，onUnmounted 时断开
```

## 注意事项

- WebSocket 仅允许 localhost 和本地网络 origin，外部 origin 会被 1008 关闭
- CLI 命令白名单限制（`isAllowedCliCommand`），防止任意命令执行
- 子进程有超时保护，超时自动 kill
- 进度文件监听使用 `fs.watch` + JSON 增量解析，避免全量重读
- 前端为独立 Vite 项目（`packages/dashboard/`），构建产物在 `dist/`
- ql-20260816-010-50bf | A3 修复：server.listen 前置 + startWatcher setImmediate 延后——原 listen 排在同步全盘扫描（homedir/Temp/桌面 depth 2 + 每项目多次 execSync('git')）后，Windows 实测 150s+ 假死；现在端口立即响应，初始 projects 数据由扫描完成后 broadcast 补发（self-audit-2026-08-16 A3）。

## 人工备注
<!-- MANUAL_NOTES_START -->
- ql-20260812-011-38aa | npm 包瘦身：dashboard 是运行时依赖（index.js:707 import server，server 服务 dist/），dist + server 保留；.npmignore 排除纯开发期文件（src/ Vite 构建源 / public/ 与 dist 重复 / 根 index.html + vite.config.js + package-lock.json），npm 包 155→123 文件、unpacked 3.7MB→3.4MB，tarball 实测 src 已排除且 server 语法正常。
<!-- MANUAL_NOTES_END -->
