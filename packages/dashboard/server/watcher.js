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

  // Directories to exclude (system junk, cache, etc.)
  const excludeDirs = new Set([
    '.Trash', '.cache', '.npm', '.local', '.vscode', 'Library',
    '.git', 'node_modules', '.Trash-*', '.DS_Store', '.config',
    '.cocoapods', '.gem', '.rvm', '.nvm', '.asdf', '.brew'
  ])

  // Helper to check if directory should be excluded
  const shouldExclude = (name) => {
    // Check exact matches
    if (excludeDirs.has(name)) return true
    // Check wildcard patterns (like .Trash-*)
    for (const pattern of excludeDirs) {
      if (pattern.includes('*')) {
        const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$')
        if (regex.test(name)) return true
      }
    }
    // Exclude hidden directories (starting with .) unless it's the cwd basename
    if (name.startsWith('.') && name !== cwd.split('/').pop()) {
      return true
    }
    return false
  }

  // Build scan directories: cwd + home subdirs + common project locations
  const scanDirs = [cwd, home]
  const extraDirs = ['Desktop', 'Documents', 'Projects', 'Work', 'Repos', 'Code', 'src', 'dev']

  for (const extra of extraDirs) {
    const extraPath = join(home, extra)
    if (existsSync(extraPath)) {
      scanDirs.push(extraPath)
    }
  }

  const watchPaths = []
  const projects = []
  const seen = new Set() // Dedupe by path

  for (const baseDir of scanDirs) {
    try {
      const { readdirSync } = require('fs')
      const entries = readdirSync(baseDir, { withFileTypes: true })

      for (const entry of entries) {
        if (!entry.isDirectory()) continue
        if (shouldExclude(entry.name)) continue

        const dirPath = join(baseDir, entry.name)

        // Skip if we've already seen this path
        if (seen.has(dirPath)) continue
        seen.add(dirPath)

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

  // Directories to exclude (system junk, cache, etc.)
  const excludeDirs = new Set([
    '.Trash', '.cache', '.npm', '.local', '.vscode', 'Library',
    '.git', 'node_modules', '.Trash-*', '.DS_Store', '.config',
    '.cocoapods', '.gem', '.rvm', '.nvm', '.asdf', '.brew'
  ])

  const shouldExclude = (name) => {
    if (excludeDirs.has(name)) return true
    for (const pattern of excludeDirs) {
      if (pattern.includes('*')) {
        const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$')
        if (regex.test(name)) return true
      }
    }
    if (name.startsWith('.') && name !== cwd.split('/').pop()) {
      return true
    }
    return false
  }

  // Build scan directories
  const scanDirs = [cwd, home]
  const extraDirs = ['Desktop', 'Documents', 'Projects', 'Work', 'Repos', 'Code', 'src', 'dev']

  for (const extra of extraDirs) {
    const extraPath = join(home, extra)
    if (existsSync(extraPath)) {
      scanDirs.push(extraPath)
    }
  }

  const seen = new Set()

  for (const baseDir of scanDirs) {
    try {
      const { readdirSync } = require('fs')
      const entries = readdirSync(baseDir, { withFileTypes: true })

      for (const entry of entries) {
        if (!entry.isDirectory()) continue
        if (shouldExclude(entry.name)) continue

        const dirPath = join(baseDir, entry.name)
        if (seen.has(dirPath)) continue
        seen.add(dirPath)

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

