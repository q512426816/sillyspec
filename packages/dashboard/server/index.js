import { createServer } from 'http'
import { WebSocketServer } from 'ws'
import { existsSync, readFileSync, readdirSync } from 'fs'
import { join, dirname, basename, sep } from 'path'
import { fileURLToPath } from 'url'
import { homedir } from 'os'
import open from 'open'
import { parseProjectState } from './parser.js'
import { startWatcher, stopWatcher, addCustomScanPath, removeCustomScanPath, getCustomScanPaths, customScanPaths } from './watcher.js'
import { executeCommand } from './executor.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

// WebSocket clients and active processes
let wss = null
const activeProcesses = new Map()

/**
 * Broadcast message to all connected WebSocket clients
 * @param {object} data - Data to broadcast
 */
function broadcast(data) {
  if (!wss) return
  const message = JSON.stringify(data)
  wss.clients.forEach(client => {
    if (client.readyState === 1) { // OPEN
      client.send(message)
    }
  })
}

// --- Shared scan logic (aligned with watcher.js) ---

const excludeDirs = new Set([
  '.Trash', '.cache', '.npm', '.local', '.vscode', 'Library',
  '.git', 'node_modules', '.Trash-*', '.DS_Store', '.config',
  '.cocoapods', '.gem', '.rvm', '.nvm', '.asdf', '.brew',
  'AppData', 'Application Data', '.cargo', '.rustup',
  '.nuget', '.android', '.gradle', '.m2', '.vscode-server'
])

function shouldExclude(name, cwd) {
  if (excludeDirs.has(name)) return true
  for (const pattern of excludeDirs) {
    if (pattern.includes('*')) {
      const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$')
      if (regex.test(name)) return true
    }
  }
  const cwdName = cwd.split(sep).pop() || cwd.split('/').pop() || ''
  if (name.startsWith('.') && name !== cwdName) return true
  return false
}

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
      if (existsSync(join(dirPath, '.sillyspec'))) {
        projects.push({ name: entry.name, path: dirPath })
      }
      if (currentDepth < maxDepth) {
        projects.push(...scanDirectory(dirPath, seen, maxDepth, currentDepth + 1))
      }
    }
  } catch (err) {}
  return projects
}

/**
 * Discover all SillySpec projects
 * @returns {Promise<Array>} Array of project objects
 */
async function discoverProjects() {
  const home = homedir()
  const cwd = process.cwd()

  const scanDirs = new Set()
  scanDirs.add(cwd)
  scanDirs.add(dirname(cwd))
  scanDirs.add(dirname(dirname(cwd)))
  scanDirs.add(home)

  const extraDirs = [
    'Desktop', '桌面', 'Documents', '文档', 'Downloads', '下载',
    'Projects', '项目', 'Work', '工作', 'Repos', 'Code', 'src', 'dev',
    'workspace', '工作区'
  ]

  for (const extra of extraDirs) {
    const extraPath = join(home, extra)
    if (existsSync(extraPath)) scanDirs.add(extraPath)
  }

  for (const customPath of customScanPaths) {
    if (existsSync(customPath)) scanDirs.add(customPath)
  }

  const seen = new Set()
  const projects = []

  // Check cwd itself
  if (!seen.has(cwd)) {
    seen.add(cwd)
    if (existsSync(join(cwd, '.sillyspec'))) {
      projects.push({ name: basename(cwd), path: cwd })
    }
  }

  for (const baseDir of scanDirs) {
    projects.push(...scanDirectory(baseDir, seen, 2, 0))
  }

  return projects
}

/**
 * Handle WebSocket message for CLI execution
 * @param {object} ws - WebSocket client
 * @param {object} data - Message data
 */
function handleCliExecute(ws, data) {
  const { projectName, command } = data

  if (!projectName || !command) {
    ws.send(JSON.stringify({
      type: 'cli:error',
      data: { message: 'Missing projectName or command' }
    }))
    return
  }

  discoverProjects().then(projects => {
    const project = projects.find(p => p.name === projectName)
    if (!project) {
      ws.send(JSON.stringify({
        type: 'cli:error',
        data: { message: `Project not found: ${projectName}` }
      }))
      return
    }

    const existingKill = activeProcesses.get(projectName)
    if (existingKill) existingKill()

    const kill = executeCommand(
      project.path,
      command,
      (output) => {
        broadcast({
          type: 'cli:output',
          data: { projectName, output: output.data, outputType: output.type }
        })
      },
      (result) => {
        activeProcesses.delete(projectName)
        broadcast({
          type: 'cli:complete',
          data: { projectName, exitCode: result.code, signal: result.signal }
        })
      }
    )

    activeProcesses.set(projectName, kill)
    broadcast({ type: 'cli:started', data: { projectName, command } })
  })
}

/**
 * Start the dashboard server
 * @param {object} options - Server options
 * @returns {object} HTTP server instance
 */
function startServer({ port = 3456, open: openBrowser = true } = {}) {
  const server = createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

    if (req.method === 'OPTIONS') {
      res.writeHead(200)
      res.end()
      return
    }

    if (req.url === '/api/projects') {
      discoverProjects().then(projects => {
        res.setHeader('Content-Type', 'application/json')
        res.writeHead(200)
        res.end(JSON.stringify(projects))
      }).catch(err => {
        res.writeHead(500)
        res.end(JSON.stringify({ error: err.message }))
      })
      return
    }

    if (req.url?.startsWith('/api/project/')) {
      const projectName = decodeURIComponent(req.url.split('/').pop())
      discoverProjects().then(projects => {
        const project = projects.find(p => p.name === projectName)
        if (project) {
          const state = parseProjectState(project.path)
          res.setHeader('Content-Type', 'application/json')
          res.writeHead(200)
          res.end(JSON.stringify({ ...project, state }))
        } else {
          res.writeHead(404)
          res.end(JSON.stringify({ error: 'Project not found' }))
        }
      }).catch(err => {
        res.writeHead(500)
        res.end(JSON.stringify({ error: err.message }))
      })
      return
    }

    // Serve static files (dist/)
    const distDir = join(__dirname, '../dist')
    const indexPath = join(distDir, 'index.html')
    if (existsSync(distDir)) {
      const filePath = join(distDir, req.url === '/' ? 'index.html' : req.url.replace(/^\//, ''))
      if (existsSync(filePath) && !filePath.includes('..')) {
        const ext = filePath.split('.').pop()
        const mimeTypes = { html: 'text/html', js: 'application/javascript', css: 'text/css', svg: 'image/svg+xml', png: 'image/png', jpg: 'image/jpeg' }
        res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream')
        res.writeHead(200)
        res.end(readFileSync(filePath))
        return
      }
      if (existsSync(indexPath)) {
        res.setHeader('Content-Type', 'text/html')
        res.writeHead(200)
        res.end(readFileSync(indexPath, 'utf8'))
        return
      }
    }

    res.writeHead(404)
    res.end('Not found')
  })

  wss = new WebSocketServer({ server })

  wss.on('error', (err) => {
    console.error('WebSocket server error:', err)
  })

  wss.on('connection', (ws) => {
    console.log('WebSocket client connected')

    // Send initial projects list
    discoverProjects().then(projects => {
      const projectsWithState = projects.map(p => ({
        ...p,
        state: parseProjectState(p.path)
      }))

      ws.send(JSON.stringify({
        type: 'projects:init',
        data: projectsWithState
      }))

      // Send current scan paths
      ws.send(JSON.stringify({
        type: 'scan:paths',
        data: getCustomScanPaths()
      }))
    }).catch(err => {
      console.error('Error sending initial projects:', err)
    })

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message)

        switch (data.type) {
          case 'cli:execute':
            handleCliExecute(ws, data.data)
            break
          case 'cli:kill':
            const kill = activeProcesses.get(data.data.projectName)
            if (kill) {
              kill()
              activeProcesses.delete(data.data.projectName)
              broadcast({ type: 'cli:killed', data: { projectName: data.data.projectName } })
            }
            break
          case 'scan:add-path':
            if (data.data?.path) {
              addCustomScanPath(data.data.path)
              broadcast({ type: 'scan:paths', data: getCustomScanPaths() })
              // Resend projects after scan
              discoverProjects().then(projects => {
                broadcast({
                  type: 'projects:updated',
                  data: projects.map(p => ({ ...p, state: parseProjectState(p.path) }))
                })
              })
            }
            break
          case 'scan:remove-path':
            if (data.data?.path) {
              removeCustomScanPath(data.data.path)
              ws.send(JSON.stringify({ type: 'scan:paths', data: getCustomScanPaths() }))
            }
            break
          case 'scan:get-paths':
            ws.send(JSON.stringify({ type: 'scan:paths', data: getCustomScanPaths() }))
            break
          default:
            console.log('Unknown message type:', data.type)
        }
      } catch (err) {
        console.error('Error handling message:', err)
      }
    })

    ws.on('close', () => {
      console.log('WebSocket client disconnected')
    })

    ws.on('error', (err) => {
      console.error('WebSocket error:', err)
    })
  })

  try {
    startWatcher((projects) => {
      broadcast({ type: 'projects:updated', data: projects })
    })
  } catch (err) {
    console.error('Failed to start file watcher:', err)
  }

  server.listen(port, () => {
    console.log(`Dashboard server running on http://localhost:${port}`)
    if (openBrowser) {
      open(`http://localhost:${port}`)
    }
  })

  const shutdown = () => {
    stopWatcher()
    activeProcesses.forEach(kill => kill())
    activeProcesses.clear()
    server.close()
  }

  process.on('SIGTERM', shutdown)
  process.on('SIGINT', shutdown)

  return server
}

export { startServer, broadcast, discoverProjects }
