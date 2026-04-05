import { reactive, computed } from 'vue'

/**
 * Dashboard state management composable
 * @returns {object} Dashboard state and methods
 */
export function useDashboard() {
  // Reactive state
  const state = reactive({
    projects: [],
    activeProject: null,
    activeStep: null,
    logs: [],
    isPanelOpen: true,
    executingProject: null,
    isLoading: true
  })

  /**
   * Get project by name
   * @param {string} name - Project name
   * @returns {object|null} Project or null
   */
  function getProject(name) {
    return state.projects.find(p => p.name === name) || null
  }

  /**
   * Select a project as active
   * @param {object|string} project - Project object or name
   */
  function selectProject(project) {
    const proj = typeof project === 'string'
      ? getProject(project)
      : project

    if (proj) {
      state.activeProject = proj
      state.activeStep = null
      state.logs = []

      // Load initial logs from project state if available
      if (proj.state?.progress?.currentLogs) {
        appendLog(proj.state.progress.currentLogs)
      }
    }
  }

  /**
   * Select a step within active project
   * @param {object} step - Step object
   */
  function selectStep(step) {
    state.activeStep = step
  }

  /**
   * Append log lines to logs buffer
   * @param {string|string[]} lines - Log line(s) to append
   */
  function appendLog(lines) {
    const newLines = Array.isArray(lines) ? lines : [lines]

    for (const line of newLines) {
      const timestamp = new Date().toISOString()
      state.logs.push({
        id: `${timestamp}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp,
        content: line,
        type: 'info'
      })
    }

    // Keep only last 500 lines
    if (state.logs.length > 500) {
      state.logs = state.logs.slice(-500)
    }
  }

  /**
   * Clear logs buffer
   */
  function clearLogs() {
    state.logs = []
  }

  /**
   * Toggle detail panel open/closed
   */
  function togglePanel() {
    state.isPanelOpen = !state.isPanelOpen
  }

  /**
   * Open detail panel
   */
  function openPanel() {
    state.isPanelOpen = true
  }

  /**
   * Close detail panel
   */
  function closePanel() {
    state.isPanelOpen = false
  }

  /**
   * Update projects list
   * @param {array} projects - New projects array
   */
  function updateProjects(projects) {
    state.isLoading = false
    state.projects = projects

    // Restore active project if it still exists
    if (state.activeProject) {
      const updated = getProject(state.activeProject.name)
      if (updated) {
        state.activeProject = updated
      }
    }
  }

  /**
   * Set executing project state
   * @param {string|null} projectName - Project name or null
   */
  function setExecuting(projectName) {
    state.executingProject = projectName
  }

  /**
   * Check if a project is currently executing
   * @param {string} projectName - Project name
   * @returns {boolean}
   */
  function isExecuting(projectName) {
    return state.executingProject === projectName
  }

  // Computed properties
  const activeProjectName = computed(() => state.activeProject?.name || null)
  const activeProjectStage = computed(() => state.activeProject?.state?.currentStage || null)
  const hasProjects = computed(() => state.projects.length > 0)
  const activeProjectSteps = computed(() => {
    if (!state.activeProject?.state?.progress?.stages) return []
    const currentStage = state.activeProject.state.currentStage
    const stageData = state.activeProject.state.progress.stages[currentStage]
    return stageData?.steps || []
  })

  return {
    state,
    getProject,
    selectProject,
    selectStep,
    appendLog,
    clearLogs,
    togglePanel,
    openPanel,
    closePanel,
    updateProjects,
    setExecuting,
    isExecuting,
    activeProjectName,
    activeProjectStage,
    hasProjects,
    activeProjectSteps
  }
}
