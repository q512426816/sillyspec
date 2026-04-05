<template>
  <div class="h-screen w-screen flex flex-col bg-[#0D1117] overflow-hidden">
    <!-- Main Content: Three-column layout -->
    <div class="flex-1 flex overflow-hidden">
      <!-- Left: Project List -->
      <aside class="w-[240px] bg-[#161B22] border-r border-[#30363D] flex-shrink-0">
        <ProjectList
          :projects="dashboard.state.projects"
          :active-project="dashboard.state.activeProject"
          @select="handleSelectProject"
        />
      </aside>

      <!-- Center: Pipeline View -->
      <main class="flex-1 bg-[#161B22] overflow-hidden">
        <PipelineView
          :project="dashboard.state.activeProject"
          :active-step="dashboard.state.activeStep"
          @select-step="handleSelectStep"
        />
      </main>

      <!-- Right: Detail Panel -->
      <aside
        :class="[
          'bg-[#161B22] border-l border-[#30363D] flex-shrink-0 transition-all duration-300',
          dashboard.state.isPanelOpen ? 'w-[320px]' : 'w-0 opacity-0'
        ]"
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
  // Initial projects
  ws.on('projects:init', (projects) => {
    dashboard.updateProjects(projects)
  })

  // Projects updated
  ws.on('projects:updated', (projects) => {
    dashboard.updateProjects(projects)
  })

  // CLI output
  ws.on('cli:output', (data) => {
    if (data.projectName === dashboard.activeProjectName.value) {
      dashboard.appendLog(data.output)
    }
  })

  // CLI complete
  ws.on('cli:complete', (data) => {
    if (data.projectName === dashboard.activeProjectName.value) {
      dashboard.setExecuting(null)
      executionResult.value = { exitCode: data.exitCode, signal: data.signal }
    }
  })

  // CLI started
  ws.on('cli:started', (data) => {
    if (data.projectName === dashboard.activeProjectName.value) {
      dashboard.setExecuting(data.projectName)
      executionResult.value = null
    }
  })

  // CLI killed
  ws.on('cli:killed', (data) => {
    if (data.projectName === dashboard.activeProjectName.value) {
      dashboard.setExecuting(null)
      executionResult.value = { exitCode: -1, signal: 'SIGTERM' }
    }
  })
})

// Project selection
function handleSelectProject(project) {
  dashboard.selectProject(project)
}

// Stage selection from command palette
function handleSelectStage({ project, stage }) {
  dashboard.selectProject(project)
  // TODO: Navigate to specific stage
}

// Step selection
function handleSelectStep(step) {
  dashboard.selectStep(step)
}

// Execute next step
function handleExecute() {
  const projectName = dashboard.activeProjectName.value
  if (!projectName) return

  dashboard.clearLogs()

  ws.send({
    type: 'cli:execute',
    data: {
      projectName,
      command: 'next'
    }
  })
}

// Kill running process
function handleKill() {
  const projectName = dashboard.activeProjectName.value
  if (!projectName) return

  ws.send({
    type: 'cli:kill',
    data: {
      projectName
    }
  })
}
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

#app {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}
</style>
