<template>
  <n-config-provider :theme-overrides="themeOverrides">
  <div class="h-screen w-screen flex flex-col overflow-hidden font-[DM_Sans,sans-serif] relative" style="background-color: #F5F5F7;">
    <!-- Ambient background -->
    <div class="absolute inset-0 pointer-events-none" style="background: radial-gradient(ellipse 60% 40% at 10% 20%, rgba(251,191,36,0.04) 0%, transparent 70%), radial-gradient(ellipse 50% 50% at 90% 80%, rgba(251,191,36,0.02) 0%, transparent 70%);" />

    <!-- 上层：多项目概览区域 -->
    <div
      class="relative overflow-hidden flex-shrink-0"
      :style="{ height: layout.overviewHeight + '%' }"
    >
      <!-- 项目概览 -->
      <ProjectOverview
        :projects="dashboard.state.projects"
        :active-project="dashboard.state.activeProject"
        @select="handleSelectProject"
      />
    </div>

    <!-- 垂直拖动分割线 -->
    <div
      class="h-[6px] flex-shrink-0 cursor-row-resize hover:bg-[#D97706] active:bg-[#D97706] relative z-20 transition-colors duration-200"
      :class="{ 'bg-[#D97706]': isDragging }"
      style="background: #2A3040;"
      @mousedown="startDragVertical"
    >
      <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div class="w-10 h-1 bg-white/30 rounded-full"></div>
      </div>
    </div>

    <!-- 下层：详情区域 -->
    <div class="flex-1 overflow-hidden flex flex-col">
      <!-- 详情内容 -->
      <div class="flex-1 flex overflow-hidden">
        <!-- 左栏：项目信息 -->
        <div
          class="detail-column flex-shrink-0 bg-white overflow-hidden"
          :style="{ width: layout.columnWidths[0] + '%', minWidth: '150px' }"
          :class="{ 'fade-in': projectSwitched }"
        >
          <div v-if="activeProject" class="project-info">
            <div class="detail-section-title">项目信息</div>
            <div class="detail-item">
              <div class="detail-label">项目名称</div>
              <div class="detail-value">{{ activeProject.name }}</div>
            </div>
            <div class="detail-item">
              <div class="detail-label">路径</div>
              <div class="detail-value detail-path">{{ shortPath }}</div>
            </div>
            <div class="detail-item">
              <div class="detail-label">当前阶段</div>
              <div class="detail-value">{{ currentStageLabel }}</div>
            </div>
            <div class="detail-item">
              <div class="detail-label">进度</div>
              <div class="detail-value">{{ progressLabel }}</div>
            </div>
          </div>
          <div v-else class="text-gray-400 text-sm">选择项目查看详情</div>
        </div>

        <!-- 水平拖动分割线 1 -->
        <div
          class="w-[4px] flex-shrink-0 cursor-col-resize hover:bg-[#D97706] active:bg-[#D97706] relative z-20 transition-colors duration-200"
          style="background: #E5E7EB;"
          @mousedown="startDragHorizontal(0)"
        ></div>

        <!-- 中栏：Pipeline -->
        <div
          class="pipeline-column flex-1 bg-white overflow-hidden"
          :style="{ minWidth: '200px' }"
        >
          <PipelineView
            :project="dashboard.state.activeProject"
            :active-step="dashboard.state.activeStep"
            :active-tab="dashboard.state.activeTab"
            :docs="dashboard.state.docs"
            :selected-doc-file="dashboard.state.selectedDocFile"
            :doc-content="dashboard.state.docContent"
            :doc-loading="dashboard.state.docLoading"
            @select-step="handleSelectStep"
            @switch-tab="handleSwitchTab"
            @select-doc-file="handleSelectDocFile"
          />
        </div>

        <!-- 水平拖动分割线 2 -->
        <div
          class="w-[4px] flex-shrink-0 cursor-col-resize hover:bg-[#D97706] active:bg-[#D97706] relative z-20 transition-colors duration-200"
          style="background: #E5E7EB;"
          @mousedown="startDragHorizontal(1)"
        ></div>

        <!-- 右栏：日志/详情 -->
        <div
          class="activity-column flex-shrink-0 bg-white overflow-hidden flex flex-col"
          :style="{ width: layout.columnWidths[2] + '%', minWidth: '200px' }"
        >
          <div class="detail-section-title px-4 pt-4">最近活动</div>
          <div class="flex-1 overflow-y-auto px-4 pb-4">
            <div
              v-for="(log, i) in recentLogs"
              :key="i"
              class="log-entry"
              :class="{ success: log.includes('✅'), error: log.includes('❌') }"
            >
              {{ log }}
            </div>
            <div v-if="recentLogs.length === 0" class="text-gray-400 text-sm">暂无活动</div>
          </div>
        </div>
      </div>

      <!-- Bottom: Action Bar -->
      <ActionBar
        :project="dashboard.state.activeProject"
        :is-executing="dashboard.state.executingProject !== null"
        :execution-result="executionResult"
        @execute="handleExecute"
        @kill="handleKill"
        @open-palette="isCommandPaletteOpen = true"
      />
    </div>

    <!-- Command Palette Overlay -->
    <CommandPalette
      :is-open="isCommandPaletteOpen"
      :projects="dashboard.state.projects"
      @close="isCommandPaletteOpen = false"
      @select-project="handleSelectProject"
      @select-stage="handleSelectStage"
    />

    <!-- 尺寸指示器 -->
    <div
      v-if="isDragging"
      class="fixed bottom-5 left-5 bg-black/70 text-white px-3 py-2 rounded text-xs font-mono z-50"
    >
      {{ sizeIndicatorText }}
    </div>
  </div>
  </n-config-provider>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useWebSocket } from './composables/useWebSocket.js'
import { useDashboard } from './composables/useDashboard.js'
import { useLayout } from './composables/useLayout.js'
import PipelineView from './components/PipelineView.vue'
import ProjectOverview from './components/ProjectOverview.vue'
import ActionBar from './components/ActionBar.vue'
import CommandPalette from './components/CommandPalette.vue'

// Composables
const ws = useWebSocket()
const dashboard = useDashboard()
const layoutManager = useLayout()

// 解构 layout
const { layout, isDragging, startDrag, endDrag } = layoutManager

// 状态
const isCommandPaletteOpen = ref(false)
const executionResult = ref(null)
const projectSwitched = ref(false)
const dragState = ref({
  active: false,
  type: null,
  startX: 0,
  startY: 0,
  startValue: 0
})

// 尺寸指示器文本
const sizeIndicatorText = computed(() => {
  if (dragState.value.type === 'vertical') {
    return `概览 ${Math.round(layout.overviewHeight)}% | 详情 ${Math.round(100 - layout.overviewHeight)}%`
  } else if (dragState.value.type === 'horizontal') {
    return `三栏: ${Math.round(layout.columnWidths[0])}% | ${Math.round(layout.columnWidths[1])}% | ${Math.round(layout.columnWidths[2])}%`
  }
  return ''
})

// 当前项目
const activeProject = computed(() => dashboard.state.activeProject)

// 项目短路径
const shortPath = computed(() => {
  const path = activeProject.value?.path || ''
  return path.replace(/^\/Users\/[^/]+/, '~')
})

// 当前阶段标签
const currentStageLabel = computed(() => {
  const stage = activeProject.value?.state?.currentStage
  if (!stage) return '未开始'
  const stageNames = {
    brainstorm: '需求探索',
    plan: '实现计划',
    execute: '波次执行',
    verify: '验证确认'
  }
  return stageNames[stage] || stage
})

// 进度标签
const progressLabel = computed(() => {
  const progress = activeProject.value?.state?.progress
  if (!progress) return '-'
  const currentStage = activeProject.value?.state?.currentStage
  const stageProgress = currentStage ? progress.stages?.[currentStage] : null
  if (!stageProgress) return '-'
  if (stageProgress.completedSteps !== undefined && stageProgress.steps !== undefined) {
    return `${stageProgress.completedSteps}/${stageProgress.steps} 步骤`
  }
  return stageProgress.status || '-'
})

// 最近日志（最近 10 条）
const recentLogs = computed(() => {
  const logs = dashboard.state.logs || []
  return logs.slice(-10).reverse()
})

// 垂直拖动（概览 ↔ 详情）
function startDragVertical(e) {
  e.preventDefault()
  dragState.value = {
    active: true,
    type: 'vertical',
    startY: e.clientY,
    startValue: layout.overviewHeight
  }
  document.body.classList.add('resizing')
  startDrag('vertical')

  const onMove = (ev) => {
    const deltaY = ev.clientY - dragState.value.startY
    const windowHeight = window.innerHeight
    const deltaPercent = (deltaY / windowHeight) * 100
    const newHeight = dragState.value.startValue + deltaPercent
    layout.overviewHeight = Math.max(15, Math.min(75, newHeight))
  }

  const onUp = () => {
    document.body.classList.remove('resizing')
    dragState.value.active = false
    dragState.value.type = null
    window.removeEventListener('mousemove', onMove)
    window.removeEventListener('mouseup', onUp)
    endDrag()
  }

  window.addEventListener('mousemove', onMove)
  window.addEventListener('mouseup', onUp)
}

// 水平拖动（三栏分割）
function startDragHorizontal(colIndex) {
  return (e) => {
    e.preventDefault()
    dragState.value = {
      active: true,
      type: 'horizontal',
      colIndex,
      startX: e.clientX,
      startWidths: [...layout.columnWidths]
    }
    document.body.classList.add('resizing')
    startDrag('horizontal')

    const onMove = (ev) => {
      const deltaX = ev.clientX - dragState.value.startX
      const containerWidth = document.querySelector('.flex-1.flex.overflow-hidden').offsetWidth
      const deltaPercent = (deltaX / containerWidth) * 100

      if (colIndex === 0) {
        // 左栏 ↔ 中栏
        const newWidth1 = ((dragState.value.startWidths[0] * containerWidth / 100) + deltaX) / containerWidth * 100
        const newWidth2 = ((dragState.value.startWidths[1] * containerWidth / 100) - deltaX) / containerWidth * 100
        if (newWidth1 >= 10 && newWidth2 >= 10) {
          layout.columnWidths[0] = newWidth1
          layout.columnWidths[1] = newWidth2
        }
      } else {
        // 中栏 ↔ 右栏
        const newWidth2 = ((dragState.value.startWidths[1] * containerWidth / 100) + deltaX) / containerWidth * 100
        const newWidth3 = ((dragState.value.startWidths[2] * containerWidth / 100) - deltaX) / containerWidth * 100
        if (newWidth2 >= 10 && newWidth3 >= 10) {
          layout.columnWidths[1] = newWidth2
          layout.columnWidths[2] = newWidth3
        }
      }
    }

    const onUp = () => {
      document.body.classList.remove('resizing')
      dragState.value.active = false
      dragState.value.type = null
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      endDrag()
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }
}

// WebSocket 事件处理
onMounted(() => {
  ws.on('projects:init', handleProjectsUpdate)
  ws.on('projects:updated', handleProjectsUpdate)
  ws.on('project:update', (project) => {
    dashboard.updateProject(project)
  })
  ws.on('cli:output', (data) => {
    if (data.projectName === dashboard.activeProjectName.value) {
      dashboard.appendLog(data.output)
    }
  })
  ws.on('cli:complete', (data) => {
    if (data.projectName === dashboard.activeProjectName.value) {
      dashboard.setExecuting(null)
      executionResult.value = { exitCode: data.exitCode, signal: data.signal }
    }
  })
  ws.on('cli:started', (data) => {
    if (data.projectName === dashboard.activeProjectName.value) {
      dashboard.setExecuting(data.projectName)
      executionResult.value = null
    }
  })
  ws.on('cli:killed', (data) => {
    if (data.projectName === dashboard.activeProjectName.value) {
      dashboard.setExecuting(null)
      executionResult.value = { exitCode: -1, signal: 'SIGTERM' }
    }
  })
  ws.on('scan:paths', (paths) => { scanPaths.value = paths })
  ws.on('docs:tree', (docs) => { dashboard.updateDocs(docs) })
})

function handleProjectsUpdate(projects) {
  const previousPath = dashboard.activeProjectPath.value
  dashboard.updateProjects(projects)

  if (!previousPath && dashboard.state.activeProject?.path) {
    ws.send({ type: 'docs:get', data: { projectPath: dashboard.state.activeProject.path } })
  }
}

function handleSelectProject(project) {
  dashboard.selectProject(project)
  dashboard.selectDocFile(null)
  dashboard.setDocContent('')
  // 触发淡入动画
  projectSwitched.value = false
  setTimeout(() => { projectSwitched.value = true }, 10)
  setTimeout(() => { projectSwitched.value = false }, 210)
  if (project?.path) {
    ws.send({ type: 'docs:get', data: { projectPath: project.path } })
  }
}

function handleSelectStage({ project, stage }) { dashboard.selectProject(project) }
function handleSelectStep(step) { dashboard.selectStep(step) }
function handleSwitchTab(tab) { dashboard.setActiveTab(tab) }
function handleSelectDocFile(file) {
  dashboard.selectDocFile(file)
  dashboard.setDocLoading(true)
  fetch(`/api/docs/content?path=${encodeURIComponent(file.path)}`)
    .then(r => r.ok ? r.text() : '')
    .then(content => {
      dashboard.setDocContent(content)
      dashboard.setDocLoading(false)
    })
    .catch(() => {
      dashboard.setDocContent('')
      dashboard.setDocLoading(false)
    })
}

function handleExecute() {
  const projectName = dashboard.activeProjectName.value
  if (!projectName) return
  const progress = dashboard.state.activeProject?.state?.progress
  const stages = ['brainstorm', 'plan', 'execute', 'verify']
  const currentStage = dashboard.state.activeProject?.state?.currentStage
    || stages.find(stage => progress?.stages?.[stage]?.status !== 'completed')
    || 'brainstorm'
  dashboard.clearLogs()
  ws.send({ type: 'cli:execute', data: { projectName, command: `run ${currentStage}` } })
}

function handleKill() {
  const projectName = dashboard.activeProjectName.value
  if (!projectName) return
  ws.send({ type: 'cli:kill', data: { projectName } })
}

const themeOverrides = {
  common: {
    primaryColor: '#D97706',
    primaryColorHover: '#F59E0B',
    primaryColorPressed: '#B45309',
    borderRadius: '6px',
    fontFamily: 'DM Sans, sans-serif',
    fontFamilyMono: 'JetBrains Mono, monospace'
  }
}
</script>

<style>
* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-smoothing: grayscale;
}

#app { width: 100vw; height: 100vh; overflow: hidden; min-width: 0; }

/* 拖动时禁用选择 */
body.resizing {
  user-select: none;
}
body.resizing * {
  cursor: inherit !important;
}

/* 响应式：小窗口时调整布局 */
@media (max-width: 1280px) {
  .detail-section-title {
    font-size: 11px;
  }
  .detail-value {
    font-size: 13px;
  }
  .log-entry {
    font-size: 11px;
  }
}

/* 项目信息样式 */
.detail-column,
.activity-column {
  padding: 18px 20px;
}

.pipeline-column {
  border-left: 1px solid #EEF0F4;
  border-right: 1px solid #EEF0F4;
}

.pipeline-column > * {
  min-width: 0;
  padding-left: 18px;
  padding-right: 18px;
}

.activity-column {
  gap: 12px;
}

.activity-column .detail-section-title {
  padding: 0;
  margin-bottom: 0;
}

.activity-column > .flex-1 {
  padding: 0;
}

.project-info {
  min-width: 0;
}

.detail-section-title {
  font-size: 12px;
  font-weight: 600;
  color: #9CA3AF;
  text-transform: uppercase;
  margin-bottom: 12px;
}

.detail-item {
  margin-bottom: 16px;
}

.detail-label {
  font-size: 11px;
  color: #9CA3AF;
  margin-bottom: 4px;
}

.detail-value {
  font-size: 14px;
  color: #1A1A1A;
  font-weight: 500;
  min-width: 0;
  overflow-wrap: anywhere;
  word-break: break-word;
  line-height: 1.45;
}

.detail-path {
  font-size: 12px;
  font-family: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  white-space: normal;
}

/* 日志条目样式 */
.log-entry {
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  padding: 8px;
  background: #F9FAFB;
  border-radius: 4px;
  margin-bottom: 8px;
  color: #374151;
}

.log-entry.success {
  color: #047857;
  background: #D1FAE5;
}

.log-entry.error {
  color: #DC2626;
  background: #FEE2E2;
}

/* 淡入动画 */
.fade-in {
  animation: fadeIn 0.2s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
