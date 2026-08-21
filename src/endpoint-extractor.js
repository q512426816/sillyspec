/**
 * endpoint-extractor.js — 从代码中提取 HTTP 端点定义和调用
 *
 * provider 端：扫描 router 文件，提取注册的 API 路径
 * consumer 端：扫描前端文件，提取 apiFetch/request 调用路径
 *
 * 契约对账时：provider 产出 ≠ consumer 消费 → gap
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'fs'
import { join, extname, basename, dirname, resolve } from 'path'
import { execSync } from 'child_process'

// ─── Provider: 扫描后端 router 注册的端点 ───────────────────────────────

/**
 * 从单个文件提取 FastAPI router 端点
 * 支持 APIRouter(prefix=...) 和 @router.get/post/put/delete/patch("/path")
 *
 * @param {string} filePath - 文件绝对路径
 * @returns {Array<{ method: string, path: string, source: string, line: number }>}
 */
export function extractFastApiEndpoints(filePath) {
  const content = readFileSync(filePath, 'utf8')
  const lines = content.split('\n')
  const endpoints = []

  // 1. 提取 router prefix
  let routerPrefix = ''
  for (const line of lines) {
    const prefixMatch = line.match(/(?:APIRouter|router)\s*\(\s*(?:prefix\s*=\s*)?["'`]([^"'`]+)["'`]/)
      || line.match(/\.include_router\s*\([^)]*prefix\s*=\s*["'`]([^"'`]+)["'`]/)
    if (prefixMatch) {
      routerPrefix = prefixMatch[1]
    }
  }

  // 2. 提取 @router.method("/path") 或分散式定义
  //    FastAPI 支持两种写法：
  //    a) @router.get("/path", ...) 下一行 def func():
  //    b) @router.get 下一行 ("/path", ...)
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const decoratorMatch = line.match(
      /@(?:router|api_router)\.(get|post|put|delete|patch)\s*\(\s*["'`]([^"'`]+)["'`]/
    )
    if (decoratorMatch) {
      const method = decoratorMatch[1].toUpperCase()
      const rawPath = decoratorMatch[2]
      endpoints.push({
        method,
        path: routerPrefix + rawPath,
        source: filePath,
        line: i + 1,
      })
      continue
    }
    // 分散式: @router.get\n    ("/path",
    const splitMatch = line.match(/@(?:router|api_router)\.(get|post|put|delete|patch)\s*$/)
    if (splitMatch && i + 1 < lines.length) {
      const nextLine = lines[i + 1]
      const pathMatch = nextLine.match(/\(\s*["'`]([^"'`]+)["'`]/)
      if (pathMatch) {
        endpoints.push({
          method: splitMatch[1].toUpperCase(),
          path: routerPrefix + pathMatch[1],
          source: filePath,
          line: i + 1,
        })
      }
    }
  }

  return endpoints
}

/**
 * 从单个文件提取 Express（Node）路由端点。
 * 支持 router/app.get|post|put|delete|patch("path") 与链式 router.route("path").<method>()。
 * app.use("prefix", router) 的前缀只做同文件近似（跨文件追踪不在首版范围）。
 *
 * @param {string} filePath - 文件绝对路径
 * @returns {Array<{ method: string, path: string, source: string, line: number }>}
 */
export function extractExpressEndpoints(filePath) {
  const content = readFileSync(filePath, 'utf8')
  const lines = content.split('\n')
  const endpoints = []

  // 同文件内最后一个 app.use("prefix", ...) 作为前缀近似
  let routerPrefix = ''
  for (const line of lines) {
    const useMatch = line.match(/\bapp\.use\s*\(\s*["'`]([^"'`]+)["'`]/)
    if (useMatch) routerPrefix = useMatch[1]
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const m = line.match(/\b(?:app|router)\.(get|post|put|delete|patch)\s*\(\s*["'`]([^"'`]+)["'`]/i)
    if (m) {
      endpoints.push({ method: m[1].toUpperCase(), path: routerPrefix + m[2], source: filePath, line: i + 1 })
      continue
    }
    const routeChain = line.match(/\.route\s*\(\s*["'`]([^"'`]+)["'`]/)
    if (routeChain) {
      // 链式 .route(path).get(h).put(h) —— 同行所有 method 配上 path
      const chainPath = routerPrefix + routeChain[1]
      for (const mm of line.matchAll(/\.(get|post|put|delete|patch)\s*\(/gi)) {
        endpoints.push({ method: mm[1].toUpperCase(), path: chainPath, source: filePath, line: i + 1 })
      }
    }
  }

  return endpoints
}

/**
 * 从单个文件提取 Spring（Java）端点。
 * 支持 @GetMapping/@PostMapping/.../@PatchMapping 与旧式 @RequestMapping(value="path", method=RequestMethod.X)；
 * 类级 @RequestMapping("api") 前缀合并（取文件内第一个作类前缀，近似）。
 *
 * @param {string} filePath - 文件绝对路径
 * @returns {Array<{ method: string, path: string, source: string, line: number }>}
 */
export function extractSpringEndpoints(filePath) {
  const content = readFileSync(filePath, 'utf8')
  const lines = content.split('\n')
  const endpoints = []

  let classPrefix = ''
  for (const line of lines) {
    const cm = line.match(/@RequestMapping\s*\(\s*(?:value\s*=\s*)?["'`]([^"'`]+)["'`]/)
    if (cm) { classPrefix = cm[1]; break }
  }

  const methodMap = { get: 'GET', post: 'POST', put: 'PUT', delete: 'DELETE', patch: 'PATCH' }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const shortMatch = line.match(/@(Get|Post|Put|Delete|Patch)Mapping\s*\(\s*(?:value\s*=\s*)?["'`]([^"'`]+)["'`]/i)
    if (shortMatch) {
      endpoints.push({ method: methodMap[shortMatch[1].toLowerCase()], path: classPrefix + shortMatch[2], source: filePath, line: i + 1 })
      continue
    }
    const oldMatch = line.match(/@RequestMapping\s*\(\s*(?:value\s*=\s*)?["'`]([^"'`]+)["'`][^)]*?method\s*=\s*RequestMethod\.(\w+)/i)
    if (oldMatch) {
      endpoints.push({ method: oldMatch[2].toUpperCase(), path: classPrefix + oldMatch[1], source: filePath, line: i + 1 })
    }
  }

  return endpoints
}

/**
 * 从目录递归扫描后端端点（多框架）。
 * 按扩展名分派：.py→FastAPI / .js,.ts→Express / .java→Spring。
 * 保留 excludePatterns（向后兼容 opts）；filePattern 在多框架分派下不再适用。
 * @param {string} dir
 * @param {{ excludePatterns?: RegExp[] }} opts
 * @returns {Array<{ method: string, path: string, source: string, line: number }>}
 */
export function scanBackendEndpoints(dir, opts = {}) {
  // 排除清单对齐 scanFrontendApiCalls（坑 parity-scan-stale-dirs：.claude/worktrees 陈旧检出
  // 与各类 build 产物混入端点扫描全是噪音）——backend 侧另含 __pycache__/.gradle/maven target
  const excludePatterns = opts.excludePatterns || [
    /^__pycache__$/, /^node_modules$/, /^\.venv$/, /^venv$/, /^\.git$/, /^\.gradle$/,
    /^\.claude$/, /^\.vscode$/, /^\.idea$/, /^\.cursor$/, /^\.next$/, /^\.nuxt$/,
    /^\.output$/, /^\.turbo$/, /^\.parcel-cache$/, /^coverage$/,
    /^\.sillyspec$/, /^\.worktrees$/, /^\.d\.ts$/,
    /^(dist|build|target|out)$/i,
    /test/i,
  ]

  const results = []
  if (!existsSync(dir)) return results

  function walk(d) {
    for (const entry of readdirSync(d, { withFileTypes: true })) {
      const full = join(d, entry.name)
      if (entry.isDirectory()) {
        if (excludePatterns.some(p => p.test(entry.name))) continue
        walk(full)
      } else if (entry.isFile()) {
        const ext = extname(entry.name).toLowerCase()
        try {
          if (ext === '.py') results.push(...extractFastApiEndpoints(full))
          else if (ext === '.js' || ext === '.ts') results.push(...extractExpressEndpoints(full))
          else if (ext === '.java') results.push(...extractSpringEndpoints(full))
        } catch {}
      }
    }
  }
  walk(dir)
  return results
}

// ─── Consumer: 扫描前端 API 调用路径 ─────────────────────────────────────

/**
 * 从前端文件提取 API 调用路径
 * 支持：
 *   apiFetch("/api/xxx")
 *   request("/api/xxx")
 *   axios.get("/api/xxx")
 *   axios.post("/api/xxx")
 *   fetch("/api/xxx")
 *
 * @param {string} filePath
 * @returns {Array<{ method: string, path: string, source: string, line: number, raw: string }>}
 */
export function extractFrontendApiCalls(filePath) {
  const content = readFileSync(filePath, 'utf8')
  const lines = content.split('\n')
  const results = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Pattern 1: apiFetch<T>("/path", { method: "POST" }) — default GET
    const apiFetchMatch = line.match(/apiFetch\s*(?:<[^>]*>)?\s*\(\s*["'`]([^"'`]+)["'`]/)
    if (apiFetchMatch) {
      // 检查是否有 method 字段（在后续行或同一行）
      let method = 'GET'
      const snippet = lines.slice(i, Math.min(i + 3, lines.length)).join(' ')
      const methodMatch = snippet.match(/method\s*:\s*["'`](GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)["'`]/i)
      if (methodMatch) method = methodMatch[1].toUpperCase()

      results.push({
        method,
        path: normalizePath(apiFetchMatch[1]),
        source: filePath,
        line: i + 1,
        raw: apiFetchMatch[1],
      })
      continue
    }

    // Pattern 2: axios.get/post/put/delete("/path")
    const axiosMatch = line.match(/axios\.(get|post|put|delete|patch)\s*\(\s*["'`]([^"'`]+)["'`]/i)
    if (axiosMatch) {
      results.push({
        method: axiosMatch[1].toUpperCase(),
        path: normalizePath(axiosMatch[2]),
        source: filePath,
        line: i + 1,
        raw: axiosMatch[2],
      })
      continue
    }

    // Pattern 3: fetch("/api/xxx", { method: "POST" })
    const fetchMatch = line.match(/(?:api_?)?fetch\s*\(\s*["'`]([^"'`]+)["'`]/)
    if (fetchMatch && !apiFetchMatch) {
      let method = 'GET'
      const snippet = lines.slice(i, Math.min(i + 3, lines.length)).join(' ')
      const methodMatch = snippet.match(/method\s*:\s*["'`](GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS)["'`]/i)
      if (methodMatch) method = methodMatch[1].toUpperCase()

      results.push({
        method,
        path: normalizePath(fetchMatch[1]),
        source: filePath,
        line: i + 1,
        raw: fetchMatch[1],
      })
      continue
    }
  }

  return results
}

/**
 * 递归扫描前端目录的 API 调用
 * @param {string} dir
 * @param {{ filePattern?: RegExp, excludePatterns?: RegExp[] }} opts
 * @returns {Array<{ method: string, path: string, source: string, line: number, raw: string }>}
 */
export function scanFrontendApiCalls(dir, opts = {}) {
  const filePattern = opts.filePattern || /\.(ts|tsx|js|jsx)$/
  // 排除清单（坑 parity-scan-stale-dirs，2026-08-21 实证：扫进 .claude/worktrees/agent-* 陈旧
  // 检出与 build 产物，872 条调用全是噪音）——目录名匹配，覆盖：
  //   版本控制/编辑器：.git .claude（含 worktrees/agent-* 陈旧检出）.vscode .idea .cursor
  //   构建产物：dist build out .next .nuxt .output .turbo .parcel-cache coverage
  //   依赖/运行时：node_modules .venv venv target（rust/java）__pycache__
  //   本工具自身：.sillyspec .sillyspec-platform.json 所在 .worktrees
  // 文件级：.d.ts 声明、*.min.js / *.bundle.js 压缩产物（正则命中即跳）
  const excludePatterns = opts.excludePatterns || [
    /^node_modules$/, /^\.git$/, /^\.claude$/, /^\.vscode$/, /^\.idea$/, /^\.cursor$/,
    /^dist$/, /^build$/, /^out$/, /^\.next$/, /^\.nuxt$/, /^\.output$/, /^\.turbo$/,
    /^\.parcel-cache$/, /^coverage$/, /^\.venv$/, /^venv$/, /^target$/, /^__pycache__$/,
    /^\.sillyspec$/, /^\.worktrees$/, /^__tests__$/, /^\.d\.ts$/,
  ]

  const results = []
  if (!existsSync(dir)) return results

  function walk(d) {
    for (const entry of readdirSync(d, { withFileTypes: true })) {
      const full = join(d, entry.name)
      if (entry.isDirectory()) {
        if (excludePatterns.some(p => p.test(entry.name))) continue
        walk(full)
      } else if (entry.isFile() && filePattern.test(entry.name)) {
        if (/\.d\.ts$/.test(entry.name)) continue
        if (/\.min\.(js|ts)$/.test(entry.name) || /\.bundle\.(js|ts)$/.test(entry.name)) continue
        try {
          results.push(...extractFrontendApiCalls(full))
        } catch {}
      }
    }
  }
  walk(dir)
  return results
}

// ─── 路径归一化 ─────────────────────────────────────────────────────────

/**
 * 将动态路径归一化为参数占位符
 * /api/ppm/project-plan/${id}/plan-nodes → /api/ppm/project-plan/{param}/plan-nodes
 * /api/ppm/project-plan/:planId/plan-nodes → /api/ppm/project-plan/{param}/plan-nodes
 * @param {string} rawPath
 * @returns {string}
 */
export function normalizePath(rawPath) {
  return rawPath
    .replace(/\$\{[^}]+\}/g, '{param}')
    .replace(/:\w+/g, '{param}')
    .replace(/\$\w+/g, '{param}')
    .replace(/\{[^}]+\}/g, '{param}')   // Spring {planId} / FastAPI {plan_id} → {param}
}

// ─── 对账 ───────────────────────────────────────────────────────────────

/**
 * 比较前端调用的路径和后端注册的端点，返回差异
 *
 * @param {Array<{ path: string, method: string, source: string }>} frontendCalls
 * @param {Array<{ path: string, method: string, source: string }>} backendEndpoints
 * @returns {{
 *   missingBackend: Array<{ path: string, method: string, consumerFile: string, consumerLine: number }>,
 *   unusedBackend: Array<{ path: string, method: string, providerFile: string }>
 * }}
 */
export function diffApiParity(frontendCalls, backendEndpoints) {
  // 构建 backend 注册表：归一化 path + method → endpoint
  const backendMap = new Map()
  for (const ep of backendEndpoints) {
    const key = `${ep.method}:${normalizePath(ep.path)}`
    if (!backendMap.has(key)) backendMap.set(key, ep)
  }

  const missingBackend = []
  for (const call of frontendCalls) {
    const key = `${call.method}:${normalizePath(call.path)}`
    if (!backendMap.has(key)) {
      missingBackend.push({
        path: normalizePath(call.path),
        method: call.method,
        consumerFile: call.source,
        consumerLine: call.line,
      })
    }
  }

  // 构建 frontend 调用表
  const frontendSet = new Set(
    frontendCalls.map(c => `${c.method}:${normalizePath(c.path)}`)
  )

  const unusedBackend = []
  for (const ep of backendEndpoints) {
    const key = `${ep.method}:${normalizePath(ep.path)}`
    if (!frontendSet.has(key)) {
      unusedBackend.push({
        path: normalizePath(ep.path),
        method: ep.method,
        providerFile: ep.source,
      })
    }
  }

  return { missingBackend, unusedBackend, ok: missingBackend.length === 0 }
}

// ─── CLI 入口 ────────────────────────────────────────────────────────────

/**
 * CLI 子命令入口：sillyspec contract scan [--backend dir] [--frontend dir]
 * 输出 JSON 格式的端点清单和对账结果
 */
export async function contractScan(args, cwd) {
  const backendIdx = args.indexOf('--backend')
  const frontendIdx = args.indexOf('--frontend')
  const backendDir = backendIdx !== -1 && args[backendIdx + 1]
    ? resolve(cwd, args[backendIdx + 1])
    : resolve(cwd, 'backend')
  const frontendDir = frontendIdx !== -1 && args[frontendIdx + 1]
    ? resolve(cwd, args[frontendIdx + 1])
    : resolve(cwd, 'frontend')

  const backendEndpoints = scanBackendEndpoints(backendDir)
  const frontendCalls = scanFrontendApiCalls(frontendDir)
  const { missingBackend, unusedBackend } = diffApiParity(frontendCalls, backendEndpoints)

  return {
    backend: backendEndpoints.map(e => ({ method: e.method, path: normalizePath(e.path), file: e.source })),
    frontend: frontendCalls.map(c => ({ method: c.method, path: normalizePath(c.path), file: c.source })),
    missingBackend,
    unusedBackend,
    summary: {
      backendEndpointCount: backendEndpoints.length,
      frontendCallCount: frontendCalls.length,
      missingBackendCount: missingBackend.length,
      unusedBackendCount: unusedBackend.length,
      ok: missingBackend.length === 0,
    },
  }
}
