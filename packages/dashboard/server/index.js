import { createServer } from 'http'
import { WebSocketServer } from 'ws'
import { existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import open from 'open'

const __dirname = dirname(fileURLToPath(import.meta.url))

// WebSocket clients
let wss = null

function broadcast(data) {
  if (!wss) return
  const message = JSON.stringify(data)
  wss.clients.forEach(client => {
    if (client.readyState === 1) { // OPEN
      client.send(message)
    }
  })
}

async function discoverProjects() {
  const { homedir } = await import('os')
  const home = homedir()
  const cwd = process.cwd()

  const scanDirs = [cwd, home]

  const projects = []

  for (const baseDir of scanDirs) {
    try {
      const { readdirSync, statSync } = await import('fs')
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

    // API Routes
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

    // Project detail route
    if (req.url?.startsWith('/api/project/')) {
      const projectName = req.url.split('/').pop()
      discoverProjects().then(projects => {
        const project = projects.find(p => p.name === projectName)
        if (project) {
          res.setHeader('Content-Type', 'application/json')
          res.writeHead(200)
          res.end(JSON.stringify(project))
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
      const { readFile } = require('fs')
      const indexPath = join(__dirname, '../dist/index.html')

      if (existsSync(indexPath)) {
        readFile(indexPath, (err, data) => {
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

    // 404
    res.writeHead(404)
    res.end('Not found')
  })

  // WebSocket Server
  wss = new WebSocketServer({ server })

  wss.on('connection', (ws) => {
    console.log('WebSocket client connected')
    ws.on('close', () => {
      console.log('WebSocket client disconnected')
    })
  })

  server.listen(port, () => {
    console.log(`Dashboard server running on http://localhost:${port}`)

    if (openBrowser) {
      open(`http://localhost:${port}`)
    }
  })

  return server
}

export { startServer, broadcast, discoverProjects }
