# SillySpec Dashboard — 技术方案

## 架构决策

| 决策 | 选择 | 理由 |
|---|---|---|
| 前端框架 | Vue 3 + Vite | 轻量、打包快、SillySpec 用户已有 Node.js |
| CSS | Tailwind CSS | 原子化、深色主题变量管理方便 |
| 后端 | Node.js 原生 http + ws | 不引入 Express，零重依赖 |
| 文件监听 | chokidar | 跨平台、成熟稳定 |
| 数据库 | 无 | 纯文件系统，与 SillySpec 哲学一致 |
| 包结构 | SillySpec 子包 packages/dashboard | 独立 package.json，可单独开发 |

## 文件变更清单

### 新增文件

| 文件 | 说明 |
|---|---|
| `packages/dashboard/package.json` | 子包配置，依赖 vue/vite/tailwind/chokidar/ws |
| `packages/dashboard/vite.config.js` | Vite 构建配置，构建产物输出到 dist/ |
| `packages/dashboard/server/index.js` | HTTP + WebSocket 服务启动入口 |
| `packages/dashboard/server/watcher.js` | chokidar 监听 .sillyspec/，解析文件变化，emit 事件 |
| `packages/dashboard/server/api.js` | REST 路由：GET /api/projects, GET /api/project/:name/status |
| `packages/dashboard/server/executor.js` | CLI 命令执行器（child_process.spawn + stdout 流式推送） |
| `packages/dashboard/src/main.js` | Vue 应用入口 |
| `packages/dashboard/src/App.vue` | 根组件，三栏布局 |
| `packages/dashboard/src/components/ProjectList.vue` | 左栏项目列表 |
| `packages/dashboard/src/components/PipelineView.vue` | 中栏阶段 pipeline + 时间线 |
| `packages/dashboard/src/components/StepCard.vue` | 步骤卡片（三级信息密度） |
| `packages/dashboard/src/components/DetailPanel.vue` | 右栏详情 + 日志 |
| `packages/dashboard/src/components/LogStream.vue` | 终端风格日志流（等宽字体、语法高亮、搜索过滤） |
| `packages/dashboard/src/components/CommandPalette.vue` | Cmd+K 命令面板 |
| `packages/dashboard/src/components/StageBadge.vue` | 阶段状态标签组件 |
| `packages/dashboard/src/components/ActionBar.vue` | CLI 操作按钮（下一步、阶段切换） |
| `packages/dashboard/src/composables/useWebSocket.js` | WebSocket 连接管理（自动重连、心跳） |
| `packages/dashboard/src/composables/useKeyboard.js` | 全局键盘快捷键 |
| `packages/dashboard/src/styles/theme.css` | CSS 变量（配色、间距、动效） |
| `packages/dashboard/index.html` | Vite HTML 入口 |
| `packages/dashboard/tailwind.config.js` | Tailwind 配置（自定义颜色） |

### 修改文件

| 文件 | 变更 |
|---|---|
| `src/index.js` | 新增 `dashboard` 命令分支 |
| `package.json` | workspace 引用 packages/dashboard |

## 数据模型

### 前端状态（composable/store）

```javascript
{
  projects: [
    {
      name: 'my-project',
      path: '/Users/x/my-project',
      currentStage: 'plan',
      stages: {
        brainstorm: { status: 'completed', steps: 10, completedSteps: 10, duration: '25min' },
        plan: { status: 'in-progress', steps: 5, completedSteps: 2, duration: '8min' },
        execute: { status: 'pending', steps: 0, completedSteps: 0 },
        verify: { status: 'pending', steps: 0, completedSteps: 0 }
      },
      lastActive: '2026-04-05T14:30:00Z'
    }
  ],
  activeProject: 'my-project',  // 当前选中
  activeStep: 3,                // 当前选中步骤
  logs: [],                     // 实时日志行
  isPanelOpen: true             // 右侧面板是否展开
}
```

### WebSocket 消息协议

```javascript
// 服务端 → 客户端
{ type: 'project:updated', project: { name, stages, currentStage } }
{ type: 'step:updated', project: 'name', step: { id, status, summary } }
{ type: 'log:append', project: 'name', lines: ['> analyzing...', '> done ✅'] }
{ type: 'cli:output', project: 'name', data: 'stdout/stderr 流' }
{ type: 'cli:complete', project: 'name', exitCode: 0 }

// 客户端 → 服务端
{ type: 'cli:execute', project: 'name', command: 'sillyspec next' }
{ type: 'project:select', name: 'my-project' }
```

### REST API

```
GET /api/projects           → 项目列表（扫描用户目录下的 .sillyspec/）
GET /api/project/:name      → 项目完整状态（STATE.md + progress.json 合并）
GET /api/project/:name/logs → 最近日志（user-inputs.md）
```

## 关键组件实现

### StepCard.vue — 三级信息密度

```vue
<template>
  <div class="step-card" :class="[statusClass]" 
       @mouseenter="hovered = true" @mouseleave="hovered = false"
       @click="select">
    <!-- 低密度：始终显示 -->
    <div class="step-header">
      <span class="step-icon">{{ icon }}</span>
      <span class="step-title">{{ step.title }}</span>
    </div>
    
    <!-- 中密度：hover 显示 -->
    <transition name="fade">
      <div v-if="hovered && step.summary?.conclusion" class="step-summary">
        {{ step.summary.conclusion }}
      </div>
    </transition>
    
    <!-- 高密度：点击后在右侧 DetailPanel 展示 -->
  </div>
</template>
```

### LogStream.vue — 终端风格日志

- 等宽字体（JetBrains Mono / monospace）
- 新行淡入动画（CSS transition opacity）
- 搜索过滤：顶部搜索框，实时过滤匹配行
- 自动滚动到底部，用户上翻时暂停自动滚动
- ANSI 颜色码支持（使用 ansi-to-html）

### CommandPalette.vue

- `Cmd/Ctrl+K` 打开，`Escape` 关闭
- 模糊搜索项目名、阶段名
- 选中后跳转视图
- 参考 shadcn/ui 的 Command 组件风格

## CLI 集成

### src/index.js 新增命令

```javascript
// 在现有 commander 配置中新增
program
  .command('dashboard')
  .description('启动可视化仪表盘')
  .option('--port <number>', '端口号', 3456)
  .option('--no-open', '不自动打开浏览器')
  .action(async (options) => {
    const { startServer } = await import('../packages/dashboard/server/index.js');
    await startServer(options);
  });
```

### server/index.js 启动流程

```javascript
async function startServer({ port = 3456, open = true }) {
  // 1. 启动 HTTP 服务，serve 前端静态文件
  const server = http.createServer(handler);
  
  // 2. 挂载 WebSocket
  const wss = new WebSocketServer({ server });
  
  // 3. 启动文件监听
  const watcher = new ProjectWatcher();
  watcher.on('change', (event) => wss.broadcast(event));
  
  // 4. 启动服务
  server.listen(port, () => {
    console.log(`🚀 SillySpec Dashboard: http://localhost:${port}`);
    if (open) openBrowser(`http://localhost:${port}`);
  });
}
```

## 项目发现机制

扫描用户常用项目目录，查找包含 `.sillyspec/` 的目录：

```javascript
// 优先级：
// 1. 当前工作目录
// 2. HOME 目录下第一层子目录
// 3. 用户可通过设置文件配置额外路径 ~/.sillyspec/dashboard.json
```

## 构建与发布

### 开发模式

```bash
cd packages/dashboard
npm run dev  # Vite dev server + 后端热重载
```

### 生产构建

```bash
cd packages/dashboard
npm run build  # Vite 构建 → dist/
```

前端构建产物（dist/）嵌入 npm 包，`sillyspec dashboard` 启动时 serve 静态文件。

### 发布

作为 SillySpec 的子包，跟随主包版本一起发布。不需要独立版本号。

## 代码风格参照

- Vue 3 Composition API（`<script setup>`）
- Tailwind CSS utility-first
- 组件命名：PascalCase
- composable 命名：use 前缀
- 不使用 Vuex/Pinia，composable 管理状态即可（项目规模不需要）
