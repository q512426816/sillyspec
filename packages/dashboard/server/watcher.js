import chokidar from 'chokidar'
import { join, basename, dirname, sep } from 'path'
import { homedir } from 'os'
import { existsSync, readdirSync } from 'fs'
import { parseProjectState } from './parser.js'

let watcher = null
let updateCallback = null
let projectStates = new Map()
export const customScanPaths = new Set()

// Directories to exclude (system junk, cache, etc.)
const excludeDirs = new Set([
  '.Trash', '.cache', '.npm', '.local', '.vscode', 'Library',
  '.git', 'node_modules', '.Trash-*', '.DS_Store', '.config',
  '.cocoapods', '.gem', '.rvm', '.nvm', '.asdf', '.brew',
  'AppData', 'Application Data', '.cargo', '.rustup',
  '.nuget', '.android', '.gradle', '.m2', '.vscode-server'
])

/**
 * Check if directory should be excluded from scanning
 * @param {string} name - Directory name
 * @returns {boolean}
 */
function shouldExclude(name, cwd) {
  if (excludeDirs.has(name)) return true
  // Check wildcard patterns (like .Trash-*)
  for (const pattern of excludeDirs) {
    if (pattern.includes('*')) {
      const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$')
      if (regex.test(name)) return true
    }
  }
  // Exclude hidden directories unless it's the cwd basename
  const cwdName = cwd.split(sep).pop() || cwd.split('/').pop() || ''
  if (name.startsWith('.') && name !== cwdName) {
    return true
  }
  return false
}

/**
 * Build list of directories to scan
 * @returns {string[]}
 */
function buildScanDirs() {
  const home = homedir()
  const cwd = process.cwd()

  const scanDirs = new Set()

  // Always scan cwd and its parent
  scanDirs.add(cwd)
  scanDirs.add(dirname(cwd))

  // Scan parent of parent (2 levels up from cwd) to discover sibling projects
  const parentParent = dirname(dirname(cwd))
  scanDirs.add(parentParent)

  // Home directory
  scanDirs.add(home)

  // Common project directories - check both English and Chinese names
  const extraDirs = [
    'Desktop', '桌面',
    'Documents', '文档',
    'Downloads', '下载',
    'Projects', '项目',
    'Work', '工作',
    'Repos', 'Code', 'src', 'dev',
    'workspace', '工作区'
  ]

  for (const extra of extraDirs) {
    const extraPath = join(home, extra)
    if (existsSync(extraPath)) {
      scanDirs.add(extraPath)
    }
  }

  // Add custom scan paths
  for (const customPath of customScanPaths) {
    if (existsSync(customPath)) {
      scanDirs.add(customPath)
    }
  }

  return Array.from(scanDirs)
}

/**
 * Recursively scan a directory for .sillyspec projects
 * @param {string} baseDir - Directory to scan
 * @param {Set} seen - Already seen paths
 * @param {number} maxDepth - Maximum recursion depth
 * @param {number} currentDepth - Current depth
 * @returns {Array} Found projects
 */
function scanDirectory(baseDir, seen, maxDepth = 2, currentDepth = 0) {
  const cwd = process.cwd()
  const projects = []

  try {
    const entries = readdirSync(baseDir, { withFileTypes: true })

    for (const entry of entries) {
      if (!entry.isDirectory()) continue
      if (shouldExclude(entry.name, cwd)) continue

      const dirPath = join(baseDir, entry.name)

      if (seen.has(dirPath)) continue
      seen.add(dirPath)

      // Check if this dir has .sillyspec
      const sillyspecPath = join(dirPath, '.sillyspec')
      if (existsSync(sillyspecPath)) {
        projects.push({
          name: entry.name,
          path: dirPath
        })
      }

      // Recurse into subdirectories if not at max depth
      if (currentDepth < maxDepth) {
        projects.push(...scanDirectory(dirPath, seen, maxDepth, currentDepth + 1))
      }
    }
  } catch (err) {
    // Skip directories we can't read
  }

  return projects
}

/**
 * Scan cwd itself (it might be a project root)
 * @param {Set} seen - Already seen paths
 * @returns {Array} Found projects
 */
function scanSelf(seen) {
  const cwd = process.cwd()
  const projects = []

  if (!seen.has(cwd)) {
    seen.add(cwd)
    const sillyspecPath = join(cwd, '.sillyspec')
    if (existsSync(sillyspecPath)) {
      projects.push({
        name: basename(cwd),
        path: cwd
      })
    }
  }

  return projects
}

/**
 * Discover all .sillyspec projects
 * @returns {{ projects: Array, watchPaths: string[] }}
 */
function discoverAll() {
  const scanDirs = buildScanDirs()
  const seen = new Set()
  const allProjects = []

  // Check cwd itself first
  allProjects.push(...scanSelf(seen))

  // Scan each base directory
  for (const baseDir of scanDirs) {
    allProjects.push(...scanDirectory(baseDir, seen, 2, 0))
  }

  // Build watch paths
  const watchPaths = allProjects.map(p => join(p.path, '.sillyspec'))

  return { projects: allProjects, watchPaths }
}

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

  const { projects, watchPaths } = discoverAll()

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
  // Normalize path for comparison
  const normalizedPath = filePath.replace(/\\/g, '/')

  const projectName = Array.from(projectStates.values()).find(p =>
    normalizedPath.startsWith(p.path.replace(/\\/g, '/'))
  )?.name

  if (!projectName) {
    await rescanProjects()
    return
  }

  const project = projectStates.get(projectName)
  if (project) {
    const newState = parseProjectState(project.path)
    if (newState) {
      projectStates.set(projectName, { ...project, state: newState })
    }
  }

  if (updateCallback) {
    updateCallback(Array.from(projectStates.values()))
  }
}

/**
 * Re-scan for projects (e.g., new .sillyspec directories)
 */
async function rescanProjects() {
  const { projects } = discoverAll()

  for (const project of projects) {
    if (!projectStates.has(project.name)) {
      const state = parseProjectState(project.path)
      if (state) {
        projectStates.set(project.name, {
          name: project.name,
          path: project.path,
          state
        })
      }
    }
  }

  if (updateCallback) {
    updateCallback(Array.from(projectStates.values()))
  }
}

/**
 * Add a custom scan path and rescan
 * @param {string} path - Path to add
 */
export function addCustomScanPath(path) {
  customScanPaths.add(path)
  rescanProjects()
}

/**
 * Remove a custom scan path
 * @param {string} path - Path to remove
 */
export function removeCustomScanPath(path) {
  customScanPaths.delete(path)
}

/**
 * Get list of custom scan paths
 * @returns {string[]}
 */
export function getCustomScanPaths() {
  return Array.from(customScanPaths)
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
