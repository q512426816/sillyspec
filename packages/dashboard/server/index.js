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

  const scanDirs = [cwd, home]
  const projects = []

  for (const baseDir of scanDirs) {
    try {
      const { readdirSync } = await import('fs')
      const entries = readdirSync(baseDir, { withFileTypes: true })

      for (const entry of entries) {
        if (!entry.isDirectory()) continue

        const dirPath = join(baseDir, entry.name)
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

    // Serve static files in production
    if (process.env.NODE_ENV === 'production') {
      const indexPath = join(__dirname, '../dist/index.html')

      if (existsSync(indexPath)) {
        // For SPA routing, serve index.html for all non-API routes
        const ext = req.url?.split('.').pop()
        if (!ext || ext === req.url) {
          readFileSync(indexPath, (err, data) => {
            if (err) {
              res.writeHead(404)
              res.end('Not found')
            } else {
              res.setHeader('Content-Type', 'text/html')
              res.writeHead(200)
              res.end(data)
            }
          })
          return
        }
      }
    }

    // 404
    res.writeHead(404)
    res.end('Not found')
  })

  // WebSocket Server
  wss = new WebSocketServer({ server })

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

  // Start file watcher
  startWatcher((projects) => {
    broadcast({
      type: 'projects:updated',
      data: projects
    })
  })

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
