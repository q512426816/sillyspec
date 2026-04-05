<template>
  <div class="h-screen w-screen flex flex-col overflow-hidden font-[DM_Sans,sans-serif] relative" style="background-color: #151820;">
    <!-- Ambient background -->
    <div class="absolute inset-0 pointer-events-none" style="background: radial-gradient(ellipse 60% 40% at 10% 20%, rgba(251,191,36,0.04) 0%, transparent 70%), radial-gradient(ellipse 50% 50% at 90% 80%, rgba(251,191,36,0.02) 0%, transparent 70%);" />

    <!-- Main Content -->
    <div class="flex-1 flex overflow-hidden relative z-10">
      <!-- Left: Project List -->
      <aside class="w-[240px] flex-shrink-0 relative" style="background: #1A1E28; border-right: 1px solid #2A3040;">
        <ProjectList
          :projects="dashboard.state.projects"
          :active-project="dashboard.state.activeProject"
          :is-loading="dashboard.state.isLoading"
          :scan-paths="scanPaths"
          @select="handleSelectProject"
          @scan:add-path="handleAddScanPath"
          @scan:remove-path="handleRemoveScanPath"
        />
      </aside>

      <!-- Center: Pipeline View -->
      <main class="flex-1 overflow-hidden accent-stripe">
        <PipelineView
          :project="dashboard.state.activeProject"
          :active-step="dashboard.state.activeStep"
          @select-step="handleSelectStep"
        />
      </main>

      <!-- Right: Detail Panel -->
      <aside
        :class="[
          'flex-shrink-0 transition-all duration-300 relative overflow-hidden',
          dashboard.state.isPanelOpen ? 'w-[340px]' : 'w-0'
        ]"
        style="background: #1A1E28; border-left: 1px solid #2A3040;"
      >
        <DetailPanel
          :is-open="dashboard.state.isPanelOpen"
          :active-step="dashboard.state.activeStep"
          :logs="dashboard.state.logs"
          @close="dashboard.closePanel"
          @clear-logs="dashboard.clearLogs"
        />
      </aside>
    </div>

    <!-- Bottom: Action Bar -->
    <ActionBar
      :project="dashboard.state.activeProject"
      :is-executing="dashboard.state.executingProject !== null"
      :execution-result="executionResult"
      :is-panel-open="dashboard.state.isPanelOpen"
      @execute="handleExecute"
      @kill="handleKill"
      @toggle-panel="dashboard.togglePanel"
      @open-palette="isCommandPaletteOpen = true"
    />

    <!-- Command Palette Overlay -->
    <CommandPalette
      :is-open="isCommandPaletteOpen"
      :projects="dashboard.state.projects"
      @close="isCommandPaletteOpen = false"
      @select-project="handleSelectProject"
      @select-stage="handleSelectStage"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useWebSocket } from './composables/useWebSocket.js'
import { useDashboard } from './composables/useDashboard.js'
import { useDashboardKeyboard } from './composables/useKeyboard.js'
import ProjectList from './components/ProjectList.vue'
import PipelineView from './components/PipelineView.vue'
import DetailPanel from './components/DetailPanel.vue'
import ActionBar from './components/ActionBar.vue'
import CommandPalette from './components/CommandPalette.vue'

// Composables
const ws = useWebSocket()
const dashboard = useDashboard()
const isCommandPaletteOpen = ref(false)
const executionResult = ref(null)
const scanPaths = ref([])

// Keyboard shortcuts
useDashboardKeyboard({
  onOpenCommandPalette: () => { isCommandPaletteOpen.value = true },
  onClose: () => {
    if (isCommandPaletteOpen.value) {
      isCommandPaletteOpen.value = false
    } else if (dashboard.state.activeStep) {
      dashboard.state.activeStep = null
    } else {
      dashboard.closePanel()
    }
  }
})

// WebSocket event handlers
onMounted(() => {
  ws.on('projects:init', (projects) => { dashboard.updateProjects(projects) })
  ws.on('projects:updated', (projects) => { dashboard.updateProjects(projects) })
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
})

function handleSelectProject(project) { dashboard.selectProject(project) }
function handleSelectStage({ project, stage }) { dashboard.selectProject(project) }
function handleSelectStep(step) { dashboard.selectStep(step) }
function handleExecute() {
  const projectName = dashboard.activeProjectName.value
  if (!projectName) return
  dashboard.clearLogs()
  ws.send({ type: 'cli:execute', data: { projectName, command: 'next' } })
}
function handleKill() {
  const projectName = dashboard.activeProjectName.value
  if (!projectName) return
  ws.send({ type: 'cli:kill', data: { projectName } })
}
function handleAddScanPath(path) {
  ws.send({ type: 'scan:add-path', data: { path } })
}
function handleRemoveScanPath(path) {
  ws.send({ type: 'scan:remove-path', data: { path } })
}
</script>

<style>
* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

#app { width: 100vw; height: 100vh; overflow: hidden; }
</style>
