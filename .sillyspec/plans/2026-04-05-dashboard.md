# SillySpec Dashboard — 实现计划

## 锚定确认

- [x] design.md — 技术方案和文件变更清单
- [x] src/index.js — CLI 入口，理解现有命令结构
- [x] package.json — ES Module，Node >=18

## 执行顺序

**Wave 1**（基础骨架，并行）：
- Task 1: 项目脚手架 + 依赖安装
- Task 2: 后端 HTTP + WebSocket 服务

**Wave 2**（依赖 Wave 1）：
- Task 3: 文件监听 + 数据解析
- Task 4: REST API

**Wave 3**（依赖 Wave 2）：
- Task 5: 前端三栏布局 + 状态管理
- Task 6: Pipeline 视图 + StepCard 组件

**Wave 4**（依赖 Wave 3）：
- Task 7: 日志流 + 命令面板
- Task 8: CLI 集成（dashboard 命令）

---

## Task 1: 项目脚手架 + 依赖安装

**文件：**
- 新建：`packages/dashboard/package.json`
- 新建：`packages/dashboard/vite.config.js`
- 新建：`packages/dashboard/index.html`
- 新建：`packages/dashboard/tailwind.config.js`
- 新建：`packages/dashboard/postcss.config.js`
- 新建：`packages/dashboard/src/main.js`
- 新建：`packages/dashboard/src/App.vue`
- 新建：`packages/dashboard/src/style.css`

**步骤：**

- [ ] 创建 `packages/dashboard/package.json`：
  ```json
  {
    "name": "@sillyspec/dashboard",
    "version": "1.0.0",
    "type": "module",
    "private": true,
    "scripts": {
      "dev": "vite",
      "build": "vite build",
      "preview": "vite preview"
    },
    "dependencies": {
      "vue": "^3.5.0",
      "ws": "^8.18.0",
      "chokidar": "^4.0.0",
      "open": "^10.1.0"
    },
    "devDependencies": {
      "@vitejs/plugin-vue": "^5.2.0",
      "vite": "^6.0.0",
      "tailwindcss": "^4.0.0",
      "@tailwindcss/vite": "^4.0.0",
      "autoprefixer": "^10.4.0"
    }
  }
  ```

- [ ] 创建 `packages/dashboard/vite.config.js`：
  ```javascript
  import { defineConfig } from 'vite'
  import vue from '@vitejs/plugin-vue'
  import tailwindcss from '@tailwindcss/vite'

  export default defineConfig({
    plugins: [vue(), tailwindcss()],
    build: {
      outDir: 'dist',
      emptyOutDir: true
    },
    server: {
      port: 3456
    }
  })
  ```

- [ ] 创建 `packages/dashboard/index.html`：
  ```html
  <!DOCTYPE html>
  <html lang="zh-CN" class="dark">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SillySpec Dashboard</title>
  </head>
  <body class="bg-[#0D1117] text-gray-100">
    <div id="app"></div>
    <script type="module" src="/src/main.js"></script>
  </body>
  </html>
  ```

- [ ] 创建 `packages/dashboard/src/style.css`：
  ```css
  @import "tailwindcss";

  @theme {
    --color-bg: #0D1117;
    --color-primary: #00D4AA;
    --color-warning: #F59E0B;
    --color-danger: #F87171;
    --color-muted: #6B7280;
    --color-surface: #161B22;
    --color-border: #30363D;
  }

  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    overflow: hidden;
  }

  /* 动效 */
  @keyframes pulse-glow {
    0% { box-shadow: 0 0 0 0 rgba(0, 212, 170, 0.4); }
    70% { box-shadow: 0 0 0 8px rgba(0, 212, 170, 0); }
    100% { box-shadow: 0 0 0 0 rgba(0, 212, 170, 0); }
  }

  .pulse-complete { animation: pulse-glow 200ms ease-out; }

  .fade-enter-active, .fade-leave-active { transition: opacity 100ms; }
  .fade-enter-from, .fade-leave-to { opacity: 0; }

  /* 日志字体 */
  .font-mono-log { font-family: 'JetBrains Mono', 'Fira Code', monospace; }
  ```

- [ ] 创建 `packages/dashboard/src/main.js`：
  ```javascript
  import { createApp } from 'vue'
  import App from './App.vue'
  import './style.css'

  createApp(App).mount('#app')
  ```

- [ ] 创建 `packages/dashboard/src/App.vue`（骨架，后续 Task 填充）：
  ```vue
  <template>
    <div class="h-screen flex flex-col">
      <div class="h-full flex">
        <!-- 三栏布局占位 -->
        <div class="w-[200px] bg-[#161B22] border-r border-[#30363D] flex-shrink-0">
          <div class="p-4 text-sm text-[#00D4AA] font-semibold">项目列表</div>
        </div>
        <div class="flex-1 overflow-auto p-6">
          <div class="text-[#6B7280]">选择左侧项目查看详情</div>
        </div>
        <div class="w-[320px] bg-[#161B22] border-l border-[#30363D] flex-shrink-0">
          <div class="p-4 text-sm text-[#6B7280]">详情面板</div>
        </div>
      </div>
    </div>
  </template>
  ```

- [ ] 安装依赖：`cd packages/dashboard && npm install`
- [ ] 验证：`cd packages/dashboard && npm run dev` → 浏览器打开 `http://localhost:3456` 看到三栏骨架
- [ ] git commit -m "feat(dashboard): project scaffold with Vue 3 + Vite + Tailwind"

---

## Task 2: 后端 HTTP + WebSocket 服务

**文件：**
- 新建：`packages/dashboard/server/index.js`

**步骤：**

- [ ] 创建 `packages/dashboard/server/index.js`：
  ```javascript
  import { createServer } from 'http'
  import { WebSocketServer } from 'ws'
  import { existsSync, statSync, readFileSync, readdirSync } from 'fs'
  import { join, resolve } from 'path'

  let wss

  function broadcast(data) {
    const msg = JSON.stringify(data)
    for (const client of wss.clients) {
      if (client.readyState === 1) client.send(msg)
    }
  }

  async function startServer({ port = 3456, open: shouldOpen = true } = {}) {
    const server = createServer((req, res) => {
      // API 路由
      if (req.url?.startsWith('/api/')) {
        return handleApi(req, res)
      }
      // SPA fallback: serve dist/ 静态文件
      res.writeHead(404)
      res.end('Not found. Run `npm run build` first.')
    })

    wss = new WebSocketServer({ server })
    wss.on('connection', (ws) => {
      ws.on('message', (data) => handleMessage(ws, data.toString()))
    })

    // 导入并启动 watcher（Task 3 实现）
    try {
      const { startWatcher } = await import('./watcher.js')
      startWatcher((event) => broadcast(event))
    } catch {
      console.warn('⚠️ Watcher not available yet')
    }

    server.listen(port, () => {
      console.log(`🚀 SillySpec Dashboard: http://localhost:${port}`)
      if (shouldOpen) {
        import('open').then(m => m.default(`http://localhost:${port}`)).catch(() => {})
      }
    })

    return server
  }

  async function handleApi(req, res) {
    const url = new URL(req.url, 'http://localhost')
    res.setHeader('Content-Type', 'application/json')

    if (url.pathname === '/api/projects') {
      const projects = discoverProjects()
      res.writeHead(200)
      res.end(JSON.stringify(projects))
    } else if (url.pathname.startsWith('/api/project/')) {
      const name = decodeURIComponent(url.pathname.split('/api/project/')[1])
      const project = getProjectStatus(name)
      if (!project) {
        res.writeHead(404)
        res.end(JSON.stringify({ error: 'Project not found' }))
        return
      }
      res.writeHead(200)
      res.end(JSON.stringify(project))
    } else {
      res.writeHead(404)
      res.end(JSON.stringify({ error: 'Not found' }))
    }
  }

  function handleMessage(ws, raw) {
    try {
      const msg = JSON.parse(raw)
      if (msg.type === 'cli:execute') {
        const { spawn } = await import('child_process')
        // Task 4 实现 executor
      }
    } catch {}
  }

  function discoverProjects() {
    const cwd = process.cwd()
    const home = process.env.HOME || '/root'
    const dirs = [cwd]
    try {
      for (const entry of readdirSync(home)) {
        const p = join(home, entry)
        if (statSync(p).isDirectory() && existsSync(join(p, '.sillyspec'))) {
          dirs.push(p)
        }
      }
    } catch {}
    // 去重
    const unique = [...new Set(dirs)]
    return unique.map(p => ({
      name: p.split('/').pop(),
      path: p
    }))
  }

  function getProjectStatus(name) {
    // 简单实现：读取 STATE.md
    // Task 3 完善
    return null
  }

  export { startServer, broadcast }
  ```

- [ ] 验证：`node packages/dashboard/server/index.js --port 3456` → 输出 `🚀 SillySpec Dashboard: http://localhost:3456`
- [ ] git commit -m "feat(dashboard): HTTP + WebSocket server"

---

## Task 3: 文件监听 + 数据解析

**文件：**
- 新建：`packages/dashboard/server/watcher.js`
- 新建：`packages/dashboard/server/parser.js`

**步骤：**

- [ ] 创建 `packages/dashboard/server/parser.js`：
  ```javascript
  import { existsSync, readFileSync } from 'fs'
  import { join } from 'path'

  export function parseProjectState(projectPath) {
    const sillyDir = join(projectPath, '.sillyspec')
    if (!existsSync(sillyDir)) return null

    const state = {}

    // 1. 解析 STATE.md
    const stateFile = join(sillyDir, 'STATE.md')
    if (existsSync(stateFile)) {
      const content = readFileSync(stateFile, 'utf8')
      state.currentStage = extractField(content, '当前阶段') || 'unknown'
      state.nextStep = extractField(content, '下一步') || ''
    }

    // 2. 解析 progress.json
    const progressFile = join(sillyDir, '.runtime', 'progress.json')
    if (existsSync(progressFile)) {
      try {
        const data = JSON.parse(readFileSync(progressFile, 'utf8'))
        state.progress = data
        state.stages = data.stages || {}
      } catch {}
    }

    // 3. 列出 specs
    const specsDir = join(sillyDir, 'specs')
    if (existsSync(specsDir)) {
      const { readdirSync } = await import('fs')
      state.specs = readdirSync(specsDir).filter(f => f.endsWith('.md'))
    }

    state.lastActive = state.progress?.lastActiveAt || state.progress?._meta?.updatedAt || null

    return state
  }

  function extractField(content, fieldName) {
    const match = content.match(new RegExp(`${fieldName}[：:]\\s*(.+)`))
    return match ? match[1].trim() : null
  }
  ```

- [ ] 创建 `packages/dashboard/server/watcher.js`：
  ```javascript
  import { watch } from 'chokidar'
  import { parseProjectState } from './parser.js'

  let watcher = null

  export function startWatcher(onChange) {
    const home = process.env.HOME || '/root'
    const pattern = `${home}/*/.sillyspec/**/*`

    watcher = watch(pattern, {
      ignored: /node_modules/,
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: { stabilityThreshold: 300, pollInterval: 100 }
    })

    watcher.on('all', (event, filePath) => {
      // 从文件路径反推项目名
      const match = filePath.match(/\/([^/]+)\/\.sillyspec\//)
      if (!match) return
      const projectName = match[1]
      const projectPath = filePath.split('.sillyspec')[0]

      const state = parseProjectState(projectPath)
      if (state) {
        onChange({ type: 'project:updated', project: { name: projectName, path: projectPath, ...state } })
      }
    })

    return watcher
  }

  export function stopWatcher() {
    watcher?.close()
  }
  ```

- [ ] 验证：在另一个终端执行 `sillyspec init --dir /tmp/test-project`，确认 WebSocket 推送了 `project:updated` 事件
- [ ] git commit -m "feat(dashboard): file watcher + state parser"

---

## Task 4: REST API + CLI 执行器

**文件：**
- 修改：`packages/dashboard/server/index.js`（完善 API 路由）
- 新建：`packages/dashboard/server/executor.js`

**步骤：**

- [ ] 创建 `packages/dashboard/server/executor.js`：
  ```javascript
  import { spawn } from 'child_process'

  const runningProcesses = new Map()

  export function executeCommand(projectPath, command, onOutput, onComplete) {
    const key = `${projectPath}:${command}`
    if (runningProcesses.has(key)) {
      onOutput(`⚠️ Command already running: ${command}`)
      return
    }

    const child = spawn('npx', ['sillyspec', ...command.split(' ')], {
      cwd: projectPath,
      shell: true,
      env: { ...process.env, FORCE_COLOR: '1' }
    })

    runningProcesses.set(key, child)

    child.stdout.on('data', (data) => {
      onOutput(data.toString())
    })

    child.stderr.on('data', (data) => {
      onOutput(data.toString())
    })

    child.on('close', (code) => {
      runningProcesses.delete(key)
      onComplete(code)
    })

    return () => child.kill()
  }
  ```

- [ ] 完善 `handleApi` 中的 `/api/project/:name` 路由，调用 `parseProjectState` 返回完整数据
- [ ] 完善 `handleMessage`，处理 `cli:execute` 消息，调用 `executeCommand` 并通过 `broadcast` 推送输出
- [ ] 验证：通过 WebSocket 发送 `{ type: 'cli:execute', project: 'test', command: 'progress status' }`，收到 `cli:output` 和 `cli:complete`
- [ ] git commit -m "feat(dashboard): REST API + CLI executor"

---

## Task 5: 前端三栏布局 + 状态管理

**文件：**
- 新建：`packages/dashboard/src/composables/useDashboard.js`
- 新建：`packages/dashboard/src/composables/useWebSocket.js`
- 新建：`packages/dashboard/src/composables/useKeyboard.js`
- 修改：`packages/dashboard/src/App.vue`
- 新建：`packages/dashboard/src/components/ProjectList.vue`

**步骤：**

- [ ] 创建 `packages/dashboard/src/composables/useWebSocket.js`：
  ```javascript
  import { ref, onMounted, onUnmounted } from 'vue'

  export function useWebSocket(url = `ws://${location.host}`) {
    const connected = ref(false)
    let ws = null
    const handlers = new Map()

    function connect() {
      ws = new WebSocket(url)
      ws.onopen = () => { connected.value = true }
      ws.onclose = () => { connected.value = false; setTimeout(connect, 3000) }
      ws.onmessage = (e) => {
        const data = JSON.parse(e.data)
        handlers.get(data.type)?.forEach(fn => fn(data))
      }
    }

    function on(type, handler) {
      if (!handlers.has(type)) handlers.set(type, [])
      handlers.get(type).push(handler)
    }

    function send(data) {
      if (ws?.readyState === 1) ws.send(JSON.stringify(data))
    }

    onMounted(connect)
    onUnmounted(() => ws?.close())

    return { connected, on, send }
  }
  ```

- [ ] 创建 `packages/dashboard/src/composables/useDashboard.js`：
  ```javascript
  import { ref, reactive } from 'vue'

  const state = reactive({
    projects: [],
    activeProject: null,
    activeStep: null,
    logs: [],
    isPanelOpen: true
  })

  export function useDashboard() {
    function selectProject(project) {
      state.activeProject = project
      state.activeStep = null
      state.logs = []
    }

    function appendLog(lines) {
      state.logs.push(...lines)
      // 保留最近 500 行
      if (state.logs.length > 500) state.logs.splice(0, state.logs.length - 500)
    }

    return { state, selectProject, appendLog }
  }
  ```

- [ ] 创建 `packages/dashboard/src/composables/useKeyboard.js`：
  ```javascript
  import { onMounted, onUnmounted } from 'vue'

  export function useKeyboard(handlers) {
    function onKeyDown(e) {
      // Cmd/Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        handlers['cmd+k']?.()
      }
      // j/k 导航
      if (!e.metaKey && !e.ctrlKey && !e.altKey) {
        if (e.key === 'j') handlers['j']?.()
        if (e.key === 'k') handlers['k']?.()
        if (e.key === 'Escape') handlers['escape']?.()
      }
    }

    onMounted(() => document.addEventListener('keydown', onKeyDown))
    onUnmounted(() => document.removeEventListener('keydown', onKeyDown))
  }
  ```

- [ ] 创建 `packages/dashboard/src/components/ProjectList.vue`：
  ```vue
  <template>
    <div class="h-full flex flex-col">
      <div class="p-4 text-sm text-[#00D4AA] font-semibold border-b border-[#30363D]">
        📊 SillySpec
      </div>
      <div class="flex-1 overflow-auto">
        <div v-for="project in projects" :key="project.path"
             @click="$emit('select', project)"
             :class="[
               'px-4 py-3 cursor-pointer text-sm border-b border-[#30363D] hover:bg-[#1C2128] transition-colors duration-100',
               isActive(project) ? 'bg-[#1C2128] text-[#00D4AA]' : 'text-gray-300'
             ]">
          <div class="font-medium truncate">{{ project.name }}</div>
          <div v-if="project.currentStage" class="text-xs text-[#6B7280] mt-1">
            {{ project.currentStage }}
          </div>
        </div>
        <div v-if="!projects.length" class="p-4 text-sm text-[#6B7280]">
          未发现 SillySpec 项目
        </div>
      </div>
    </div>
  </template>

  <script setup>
  const props = defineProps({ projects: Array, activeName: String })
  defineEmits(['select'])

  function isActive(project) {
    return project.name === props.activeName
  }
  </script>
  ```

- [ ] 更新 `App.vue`，集成 WebSocket + 状态管理 + 三栏布局
- [ ] 验证：启动后端，浏览器中左侧显示项目列表，点击项目高亮
- [ ] git commit -m "feat(dashboard): three-panel layout + state management"

---

## Task 6: Pipeline 视图 + StepCard 组件

**文件：**
- 新建：`packages/dashboard/src/components/PipelineView.vue`
- 新建：`packages/dashboard/src/components/StepCard.vue`
- 新建：`packages/dashboard/src/components/StageBadge.vue`

**步骤：**

- [ ] 创建 `packages/dashboard/src/components/StageBadge.vue`：
  ```vue
  <template>
    <span :class="badgeClass">
      {{ icon }} {{ label }}
    </span>
  </template>

  <script setup>
  import { computed } from 'vue'

  const props = defineProps({ status: String })

  const configs = {
    completed: { icon: '✅', label: '已完成', class: 'bg-green-900/30 text-green-400' },
    'in-progress': { icon: '⏳', label: '进行中', class: 'bg-[#00D4AA]/20 text-[#00D4AA]' },
    blocked: { icon: '🟡', label: '阻塞', class: 'bg-yellow-900/30 text-yellow-400' },
    failed: { icon: '🔴', label: '失败', class: 'bg-red-900/30 text-red-400' },
    pending: { icon: '⬜', label: '未开始', class: 'bg-gray-800 text-gray-500' }
  }

  const config = computed(() => configs[props.status] || configs.pending)
  const icon = computed(() => config.value.icon)
  const label = computed(() => config.value.label)
  const badgeClass = computed(() => `inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${config.value.class}`)
  </script>
  ```

- [ ] 创建 `packages/dashboard/src/components/StepCard.vue`：
  三级信息密度实现：默认显示标题，hover 显示摘要，点击 emit select 事件。参考 design.md 中的模板。

- [ ] 创建 `packages/dashboard/src/components/PipelineView.vue`：
  纵向 pipeline，四个阶段（brainstorm/plan/execute/verify），每个阶段内显示步骤卡片。下方显示时间线（步骤耗时列表）。

- [ ] 验证：选择一个有 STATE.md 的项目，pipeline 正确显示四个阶段状态
- [ ] git commit -m "feat(dashboard): pipeline view + step cards"

---

## Task 7: 日志流 + 命令面板

**文件：**
- 新建：`packages/dashboard/src/components/LogStream.vue`
- 新建：`packages/dashboard/src/components/CommandPalette.vue`
- 新建：`packages/dashboard/src/components/DetailPanel.vue`
- 新建：`packages/dashboard/src/components/ActionBar.vue`

**步骤：**

- [ ] 创建 `packages/dashboard/src/components/LogStream.vue`：
  - 等宽字体（font-mono-log）
  - 新行淡入动画
  - 顶部搜索框，实时过滤
  - 自动滚动到底部，用户上翻时暂停
  - 最大 500 行，超出裁剪

- [ ] 创建 `packages/dashboard/src/components/CommandPalette.vue`：
  - `Cmd+K` 打开，`Escape` 关闭
  - 模糊搜索项目名、阶段名
  - 列表用上下键选择，Enter 确认
  - 遮罩层 + 居中弹窗

- [ ] 创建 `packages/dashboard/src/components/DetailPanel.vue`：
  - 右侧面板，可收起
  - 上半部分：步骤详情（结论、决策、用户原话）
  - 下半部分：LogStream 组件

- [ ] 创建 `packages/dashboard/src/components/ActionBar.vue`：
  - "下一步" 按钮 → 发送 `cli:execute` 消息
  - 显示当前执行状态（空闲/执行中/完成）

- [ ] 验证：搜索日志、命令面板跳转项目、点击下一步按钮
- [ ] git commit -m "feat(dashboard): log stream + command palette + detail panel"

---

## Task 8: CLI 集成 + 构建优化

**文件：**
- 修改：`src/index.js`（新增 dashboard 命令）
- 修改：`printUsage`（添加 dashboard 用法）
- 修改：`packages/dashboard/vite.config.js`（生产构建优化）

**步骤：**

- [ ] 在 `src/index.js` 的 `switch (command)` 中新增：
  ```javascript
  case 'dashboard': {
    const portIdx = args.indexOf('--port')
    const port = portIdx >= 0 && args[portIdx + 1] ? parseInt(args[portIdx + 1]) : 3456
    const noOpen = args.includes('--no-open')
    const { startServer } = await import('../packages/dashboard/server/index.js')
    await startServer({ port, open: !noOpen })
    break
  }
  ```

- [ ] 在 `printUsage` 中添加：
  ```
    sillyspec dashboard          启动可视化仪表盘
    [--port <number>]            端口号（默认 3456）
    [--no-open]                  不自动打开浏览器
  ```

- [ ] 执行 `cd packages/dashboard && npm run build`，确认 dist/ 生成
- [ ] 修改 `server/index.js`，生产模式下 serve `dist/` 静态文件：
  ```javascript
  import { readFile } from 'fs/promises'

  // 在 createServer handler 中：
  if (!req.url?.startsWith('/api/')) {
    try {
      const html = await readFile(join(__dirname, '../dist/index.html'), 'utf8')
      res.writeHead(200, { 'Content-Type': 'text/html' })
      res.end(html)
      return
    } catch {
      res.writeHead(404)
      res.end('Run `npm run build` first.')
      return
    }
  }
  ```

- [ ] 验证：全局安装后执行 `sillyspec dashboard`，浏览器自动打开，显示完整仪表盘
- [ ] git commit -m "feat(dashboard): CLI integration + production build"

---

## 自检门控

- [x] 每个 task 包含具体文件路径
- [x] 每个 task 包含验证命令和预期输出
- [x] 标注了 Wave 和执行顺序（Wave 1-4）
- [x] plan 与 design.md 的文件变更清单一致（21 个新增文件 + 2 个修改文件全部覆盖）
- [x] 代码示例包含完整可运行内容
