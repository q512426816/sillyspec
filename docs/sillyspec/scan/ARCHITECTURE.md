---
author: qinyi
created_at: 2026-05-13T08:37:15
---

# 技术架构

## 技术栈

### 核心 CLI
- **运行时**: Node.js >= 18 (ES Module)
- **语言**: JavaScript
- **依赖**:
  - `@inquirer/prompts`: 交互式命令行提示
  - `chalk`: 终端样式
  - `chokidar`: 文件系统监听
  - `ora`: 加载动画
  - `ws`: WebSocket 通信

### Dashboard（前端）
- **框架**: Vue 3
- **UI 库**: Naive UI
- **构建工具**: Vite 6
- **样式**: Tailwind CSS 4
- **图标**: @vicons/ionicons5
- **Markdown**: marked
- **通信**: WebSocket (ws)

## 架构概览

### 核心模式：流程状态机
SillySpec 是一个阶段驱动的 AI 辅助开发流程框架，通过严格的步骤定义确保 AI 按预定流程执行任务。

### 模块结构

#### 核心模块 (`src/`)
- `index.js`: CLI 入口，命令路由
- `progress.js`: ProgressManager — 进度状态管理
- `init.js`: 项目初始化
- `run.js`: 阶段执行引擎
- `setup.js`: 环境配置

#### 阶段定义 (`src/stages/`)
核心阶段（需进度数据，存储于 SQLite 数据库）:
- `brainstorm`: 需求探索
- `propose`: 生成结构化规范
- `plan`: 编写实现计划
- `execute`: 波次执行
- `verify`: 验证实现

辅助阶段（可独立执行）:
- `scan`: 代码扫描
- `quick`: 快速任务
- `archive`: 归档变更
- `status`: 查看项目状态
- `doctor`: 项目自检

#### Dashboard (`packages/dashboard/`)
- Vue 3 + Vite 构建的单页应用
- WebSocket 实时通信
- 文件监听自动刷新

### 数据模型

#### SQLite 数据库 (sillyspec.db)
运行时状态存储于 `.sillyspec/.runtime/sillyspec.db`，存储：
- 项目和变更信息
- 各阶段状态和步骤进度
- 时间戳和修订记录

通过 `sillyspec progress show` CLI 命令查看状态。

#### 项目配置 (`.sillyspec/projects/*.yaml`)
```yaml
name: 项目名
path: 路径
status: active | archived
```

#### 工作区 (`.sillyspec/workspace/`)
多项目并行工作区配置
