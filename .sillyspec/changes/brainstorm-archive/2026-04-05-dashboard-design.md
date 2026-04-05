# SillySpec Dashboard 设计

## 概述

为 SillySpec CLI 工具添加可视化仪表盘（`sillyspec dashboard`），用户通过浏览器直观查看和管理项目进度、阶段流程、任务详情和实时日志。

## 目标用户

SillySpec 全部用户（官方功能，随 npm 包发布）。

## 分期计划

### 一期（MVP）

可视化仪表盘 + CLI 命令执行 + 实时日志流。

### 二期（进阶）

Web Terminal（xterm.js）+ 自定义命令 + AI 交互（视需求而定）。

## 架构

```
sillyspec dashboard
        │
        ▼
  Node.js HTTP Server (localhost:3456)
        │
        ├─ chokidar: watch .sillyspec/ 目录
        ├─ WebSocket: 实时推送状态变更
        └─ REST API: 项目列表、状态、日志、CLI 执行
        │
        ▼
  Vue 3 SPA (浏览器)
```

### 文件结构

```
sillyspec/packages/dashboard/
├── server/
│   ├── index.js          # HTTP + WebSocket 服务启动
│   ├── watcher.js        # chokidar 文件监听 + 增量解析
│   └── api.js            # REST 路由
├── src/
│   ├── App.vue
│   ├── components/
│   │   ├── ProjectList.vue     # 左栏：项目列表
│   │   ├── PipelineView.vue    # 中栏：阶段 pipeline
│   │   ├── StepCard.vue        # 步骤卡片（可展开折叠）
│   │   ├── DetailPanel.vue     # 右栏：详情 + 日志
│   │   ├── LogStream.vue       # 终端风格日志流
│   │   ├── CommandPalette.vue  # Cmd+K 命令面板
│   │   └── StageBadge.vue      # 阶段状态标签
│   ├── composables/
│   │   ├── useWebSocket.js     # WebSocket 连接管理
│   │   └── useKeyboard.js      # 键盘快捷键
│   └── styles/
│       └── theme.css           # 深色主题变量
├── package.json
└── vite.config.js
```

## 核心页面设计

### 三栏布局

```
┌──────────┬─────────────────────────┬──────────────────┐
│ 项目列表  │    Pipeline 视图（中）    │   详情+日志（右） │
│ (200px)  │     (flex-1)            │    (320px,可收起) │
│          │                         │                  │
│ 📁 proj1 │  ✅ brainstorm           │  Step 3 详情     │
│ 📁 proj2 │  ⏳ plan ← 当前          │  结论：选择React  │
│ 📁 proj3 │  ⬜ execute              │  决策：...       │
│          │  ⬜ verify               │  📋 实时日志     │
└──────────┴─────────────────────────┴──────────────────┘
```

### 信息分层（三级密度）

1. **低密度（默认）**：阶段名 + 状态图标
2. **中密度（hover）**：步骤摘要（1-2 句话）
3. **高密度（点击）**：右侧面板展开完整详情 + 日志

### 异常高亮

失败/阻塞/超时步骤自动标红，视觉上突出，不需用户手动查找。

## 数据源与同步

### 数据文件

| 文件 | 用途 |
|---|---|
| `STATE.md` | 当前阶段、状态、下一步命令 |
| `.runtime/progress.json` | 步骤进度、摘要、时间戳 |
| `.runtime/user-inputs.md` | 用户输入记录 |
| `specs/*.md` | 设计文档 |
| `changes/*/design.md` | 技术方案 |

### 同步方案

- **启动时**：全量读取 `.sillyspec/` 目录，构建初始状态
- **运行时**：chokidar watch 文件变化 → 解析 → WebSocket 增量推送
- **不轮询，不做 diff**，文件变化直接读取推送

### CLI 命令执行（一期）

后端通过 `child_process.spawn` 执行 CLI 命令：
- "下一步"按钮 → `sillyspec next`
- 阶段切换按钮 → `sillyspec plan` / `sillyspec execute` 等
- 执行结果通过 WebSocket 实时推送到前端日志面板

## 交互设计

### 键盘快捷键

| 快捷键 | 功能 |
|---|---|
| `j/k` | 上下切换步骤 |
| `Enter` | 展开详情 |
| `Escape` | 收起面板 |
| `/` | 搜索日志 |
| `Cmd/Ctrl+K` | 命令面板 |

### 命令面板功能

- 搜索项目名
- 跳转到指定阶段
- 切换深色/浅色主题

### CLI 命令

```bash
sillyspec dashboard              # 启动 + 自动开浏览器
sillyspec dashboard --port 8080  # 自定义端口
sillyspec dashboard --no-open    # 不自动打开浏览器
```

## 视觉设计

### 配色

| 用途 | 色值 |
|---|---|
| 背景 | `#0D1117` |
| 主色（进行中） | `#00D4AA` |
| 阻塞 | `#F59E0B` |
| 失败 | `#F87171` |
| 未开始 | `#6B7280` |

### 动效

- 阶段完成：脉冲光效（CSS animation，200ms）
- 日志新行：淡入
- hover 过渡：100ms
- 进度条：弹性缓动

## 技术选型

| 层 | 技术 |
|---|---|
| 前端框架 | Vue 3 |
| 构建工具 | Vite |
| CSS | Tailwind CSS |
| 后端 | Node.js 原生 http + ws |
| 文件监听 | chokidar |
| 数据库 | 无，纯文件系统 |

## 约束和假设

- 用户本地已有 Node.js（SillySpec 前置依赖）
- 仪表盘为本地工具，不考虑多用户并发
- 前端构建产物嵌入 npm 包，无需额外 build
- 不引入 Express、数据库等重依赖

## 状态历史时间线

Pipeline 视图下方展示时间线，记录每个步骤的：
- 开始时间 / 结束时间 / 耗时
- 状态变化（进行中 → 完成/阻塞/失败）
- 可按时间排序，快速定位耗时最长或异常步骤

数据来源：`progress.json` 中的 `summaries` 和时间戳。

## 不在范围内（一期）

- 用户认证/权限
- 多人协作
- 数据持久化（纯文件系统）
- AI 对话交互（二期）
- Web Terminal（二期）

## 验收标准

- [ ] `sillyspec dashboard` 一键启动，自动打开浏览器
- [ ] 三栏布局正确渲染，响应式适配
- [ ] 文件变化后前端实时更新（<1s 延迟）
- [ ] 步骤卡片三级信息分层（默认/hover/点击）
- [ ] 实时日志流正常显示，可搜索可过滤
- [ ] 键盘快捷键可用（j/k/Enter/Escape/Cmd+K）
- [ ] 命令面板可搜索项目名和阶段
- [ ] CLI 命令执行按钮可用，结果实时显示
- [ ] 异常步骤自动高亮
- [ ] 深色/浅色主题切换
