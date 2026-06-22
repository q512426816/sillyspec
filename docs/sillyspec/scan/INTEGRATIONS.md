---
author: qinyi
created_at: 2026-05-13T08:38:20
---

# 外部集成

## MCP (Model Context Protocol) 集成

位置：`src/setup.js`

SillySpec 支持集成多个 MCP 服务器，扩展 AI 能力：

### 浏览器相关
- **Chrome DevTools MCP**: 浏览器 DevTools 集成
  - 安装：`npx -y @modelcontextprotocol/server-chrome-devtools`
  - 仓库：https://github.com/ChromeDevTools/chrome-devtools-mcp

- **Agent Browser**: Vercel 浏览器代理
  - 安装：`npx -y agent-browser`
  - 仓库：https://github.com/vercel-labs/agent-browser

### 数据库相关
- **PostgreSQL MCP**: PostgreSQL 数据库集成
  - 安装：`npx -y @modelcontextprotocol/server-postgres`
  - 环境：`DATABASE_URL`
  - 仓库：https://github.com/modelcontextprotocol/servers/tree/main/src/postgres

- **SQLite MCP**: SQLite 数据库集成
  - 安装：`npx -y @modelcontextprotocol/server-sqlite`
  - 仓库：https://github.com/modelcontextprotocol/servers/tree/main/src/sqlite

- **Redis MCP**: Redis 缓存集成
  - 安装：`npx -y @modelcontextprotocol/server-redis`
  - 环境：`REDIS_URL`
  - 仓库：https://github.com/modelcontextprotocol/servers/tree/main/src/redis

### 工具相关
- **Context7 MCP**: Upstash 上下文工具
  - 安装：`npx -y @upstash/context7-mcp`
  - 仓库：https://github.com/upstash/context7-mcp

- **PinchTab**: 浏览器标签管理
  - 安装：`npx -y pinchtab`
  - 仓库：https://github.com/pinchtab/pinchtab

- **Playwright**: 浏览器自动化测试
  - 文档：https://playwright.dev

## 外部服务

### grep.app
代码搜索引擎，用于 doctor 命令检查：
- 健康检查：`curl -s https://grep.app`

## Dashboard 通信

### WebSocket 协议
- 依赖：`ws` (CLI 端) + WebSocket API (Dashboard 端)
- 实时通信：进度更新、文件变化

### 文件监听
- 依赖：`chokidar`
- 监听 `.sillyspec/` 目录变化
- 自动刷新 Dashboard

## NPM 生态

### CLI 核心依赖
- `@inquirer/prompts`: 交互式输入
- `chalk`: 终端样式
- `ora`: 加载动画
- `open`: 打开浏览器/应用

### Dashboard 依赖
- `vue`: Vue 3 框架
- `naive-ui`: UI 组件库
- `vite`: 构建工具
- `tailwindcss`: CSS 框架
- `marked`: Markdown 解析
- `@vicons/ionicons5`: 图标库

## 集成配置

### local.yaml
项目本地配置，支持定义：
- 构建命令
- 测试命令
- Lint 命令
- 环境变量

### SQLite 数据库 (sillyspec.db)
运行时状态存储于 `.sillyspec/.runtime/sillyspec.db`，存储：
- 当前阶段
- 当前步骤
- 项目路径
- 开始时间

通过 `sillyspec progress show` CLI 命令查看状态。
