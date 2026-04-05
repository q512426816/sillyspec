import chokidar from 'chokidar'
import { join } from 'path'
import { homedir } from 'os'
import { existsSync } from 'fs'
import { parseProjectState } from './parser.js'

let watcher = null
let updateCallback = null
let projectStates = new Map()

/**
 * Start watching all .sillyspec directories
 * @param {function} callback - Callback function when projects are updated
 * @returns {object} The watcher instance
 */
export function startWatcher(callback) {
  if (watcher) {
    stopWatcher()
  }

  updateCallback = callback

  // Discover all .sillyspec directories
  const home = homedir()
  const cwd = process.cwd()
  const scanDirs = [cwd, home]

  const watchPaths = []
  const projects = []

  for (const baseDir of scanDirs) {
    try {
      const { readdirSync, statSync } = require('fs')
      const entries = readdirSync(baseDir, { withFileTypes: true })

      for (const entry of entries) {
        if (!entry.isDirectory()) continue

        const dirPath = join(baseDir, entry.name)
        const sillyspecPath = join(dirPath, '.sillyspec')

        if (existsSync(sillyspecPath)) {
          watchPaths.push(sillyspecPath)
          projects.push({
            name: entry.name,
            path: dirPath
          })
        }
      }
    } catch (err) {
      // Skip directories we can't read
      continue
    }
  }

  // Parse initial states
  for (const project of projects) {
    const state = parseProjectState(project.path)
    if (state) {
      projectStates.set(project.name, { ...project, state })
    }
  }

  // Emit initial state
  if (updateCallback) {
    updateCallback(Array.from(projectStates.values()))
  }

  // Watch for changes
  watcher = chokidar.watch(watchPaths, {
    ignored: /node_modules/,
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 300,
      pollInterval: 100
    },
    depth: 5
  })

  watcher.on('change', async (filePath) => {
    await handleFileChange(filePath)
  })

  watcher.on('add', async (filePath) => {
    await handleFileChange(filePath)
  })

  watcher.on('unlink', async (filePath) => {
    await handleFileChange(filePath)
  })

  watcher.on('error', (error) => {
    console.error('Watcher error:', error)
  })

  return watcher
}

/**
 * Handle file change events
 * @param {string} filePath - Path to the changed file
 */
async function handleFileChange(filePath) {
  // Find which project this file belongs to
  const projectName = Array.from(projectStates.values()).find(p =>
    filePath.startsWith(p.path)
  )?.name

  if (!projectName) {
    // Re-scan for new projects
    await rescanProjects()
    return
  }

  // Re-parse the project state
  const project = projectStates.get(projectName)
  if (project) {
    const newState = parseProjectState(project.path)
    if (newState) {
      projectStates.set(projectName, { ...project, state: newState })
    }
  }

  // Emit updated state
  if (updateCallback) {
    updateCallback(Array.from(projectStates.values()))
  }
}

/**
 * Re-scan for projects (e.g., new .sillyspec directories)
 */
async function rescanProjects() {
  const home = homedir()
  const cwd = process.cwd()
  const scanDirs = [cwd, home]

  for (const baseDir of scanDirs) {
    try {
      const { readdirSync } = require('fs')
      const entries = readdirSync(baseDir, { withFileTypes: true })

      for (const entry of entries) {
        if (!entry.isDirectory()) continue

        const dirPath = join(baseDir, entry.name)
        const sillyspecPath = join(dirPath, '.sillyspec')

        if (existsSync(sillyspecPath) && !projectStates.has(entry.name)) {
          const state = parseProjectState(dirPath)
          if (state) {
            projectStates.set(entry.name, {
              name: entry.name,
              path: dirPath,
              state
            })
          }
        }
      }
    } catch (err) {
      continue
    }
  }

  if (updateCallback) {
    updateCallback(Array.from(projectStates.values()))
  }
}

/**
 * Stop the file watcher
 */
export function stopWatcher() {
  if (watcher) {
    watcher.close()
    watcher = null
    projectStates.clear()
  }
}

/**
 * Get current project states
 * @returns {array} Array of project states
 */
export function getProjectStates() {
  return Array.from(projectStates.values())
}

/**
 * Get a specific project state
 * @param {string} projectName - Name of the project
 * @returns {object|null} Project state or null
 */
export function getProjectState(projectName) {
  return projectStates.get(projectName) || null
}

export { startWatcher, stopWatcher, getProjectStates, getProjectState }
