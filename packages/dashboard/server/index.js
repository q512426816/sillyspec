import { createServer } from 'http'
import { WebSocketServer } from 'ws'
import { existsSync, readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import open from 'open'
import { parseProjectState } from './parser.js'
import { startWatcher, stopWatcher } from './watcher.js'
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

/**
 * Discover all SillySpec projects
 * @returns {Promise<Array>} Array of project objects
 */
async function discoverProjects() {
  const { homedir } = await import('os')
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

  const projects = []
  const seen = new Set() // Dedupe by path

  for (const baseDir of scanDirs) {
    try {
      const { readdirSync } = await import('fs')
      const entries = readdirSync(baseDir, { withFileTypes: true })

      for (const entry of entries) {
        if (!entry.isDirectory()) continue
        if (shouldExclude(entry.name)) continue

        const dirPath = join(baseDir, entry.name)

        // Skip if we've already seen this path (handles symlinks, dupes)
        const realPath = dirPath // Could add realpath for true deduping
        if (seen.has(realPath)) continue
        seen.add(realPath)

        const sillyspecPath = join(dirPath, '.sillyspec')

        if (existsSync(sillyspecPath)) {
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

  // Find project
  discoverProjects().then(projects => {
    const project = projects.find(p => p.name === projectName)
    if (!project) {
      ws.send(JSON.stringify({
        type: 'cli:error',
        data: { message: `Project not found: ${projectName}` }
      }))
      return
    }

    // Kill existing process for this project if any
    const existingKill = activeProcesses.get(projectName)
    if (existingKill) {
      existingKill()
    }

    // Execute command
    const kill = executeCommand(
      project.path,
      command,
      (output) => {
        broadcast({
          type: 'cli:output',
          data: {
            projectName,
            output: output.data,
            outputType: output.type
          }
        })
      },
      (result) => {
        activeProcesses.delete(projectName)
        broadcast({
          type: 'cli:complete',
          data: {
            projectName,
            exitCode: result.code,
            signal: result.signal
          }
        })
      }
    )

    activeProcesses.set(projectName, kill)

    broadcast({
      type: 'cli:started',
      data: { projectName, command }
    })
  })
}

/**
 * Start the dashboard server
 * @param {object} options - Server options
 * @returns {object} HTTP server instance
 */
function startServer({ port = 3456, open: openBrowser = true } = {}) {
  const server = createServer((req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

    if (req.method === 'OPTIONS') {
      res.writeHead(200)
      res.end()
      return
    }

    // API: List all projects
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

    // API: Get project details with state
    if (req.url?.startsWith('/api/project/')) {
      const projectName = decodeURIComponent(req.url.split('/').pop())
      discoverProjects().then(projects => {
        const project = projects.find(p => p.name === projectName)
        if (project) {
          const state = parseProjectState(project.path)
          res.setHeader('Content-Type', 'application/json')
          res.writeHead(200)
          res.end(JSON.stringify({
            ...project,
            state
          }))
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
    const indexPath = join(__dirname, '../dist/index.html')
    if (existsSync(indexPath)) {
      const ext = req.url?.split('.').pop()
      // Serve index.html for SPA routing (non-API, non-asset routes)
      if (!ext || ext === req.url) {
        const data = readFileSync(indexPath, 'utf8')
        res.setHeader('Content-Type', 'text/html')
        res.writeHead(200)
        res.end(data)
        return
      }
    }

    // 404
    res.writeHead(404)
    res.end('Not found')
  })

  // WebSocket Server
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
              broadcast({
                type: 'cli:killed',
                data: { projectName: data.data.projectName }
              })
            }
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

  // Start file watcher (wrapped to avoid crashing server)
  try {
    startWatcher((projects) => {
      broadcast({
        type: 'projects:updated',
        data: projects
      })
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

  // Handle shutdown
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
