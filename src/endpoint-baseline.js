/**
 * endpoint-baseline.js — 变更级端点 before/after 基线（变更 2026-09-07-endpoint-baseline）
 *
 * 背景：contract-matrix 只有 provider 完成后的 endpoints.json 事后快照，无变更前基线——
 * 端点增删（archify Delta 核心内容之一）无法计算。本模块补齐：
 *   - captureEndpointBaseline：变更起点拍端点集快照（幂等，已存在不覆盖）
 *   - diffEndpointSets：基线 × 现算的集合运算纯函数（method+path 粒度）
 *
 * 消费链：CLI `endpoints baseline`（task-02）→ endpoint-baselines/<change>.json →
 * archive-delta 第五源（Wave 2）对比出 delta.md「端点增删」节。
 */

import { existsSync, mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'
import { scanBackendEndpoints, normalizePath } from './endpoint-extractor.js'
import { gitQuiet } from './git-helper.js'

/**
 * diff 键归一：method 大写 + normalizePath 参数归一（endpoint-extractor.js 既有导出，
 * diffApiParity 同款——`:id/{plan_id}` / `{plan_id}/{id}` 等参数形态统一为 `{param}`）
 * + 去尾斜杠（`/api/x/` 与 `/api/x` 同键；全斜杠归一为 `/`）。
 * @param {{ method?: string, path?: string }} ep
 * @returns {string} 形如 `GET /api/ppm/project-plan/{param}`
 */
function endpointKey(ep) {
  const normalized = normalizePath(ep.path || '').replace(/\/+$/, '') || '/'
  return `${(ep.method || '').toUpperCase()} ${normalized}`
}

/**
 * 拍变更前端点基线：endpoint-extractor 现扫 cwd → 写 <runtimeRoot>/endpoint-baselines/<change>.json。
 *
 * - 幂等：目标文件已存在 → {written:false, reason:'exists'}（不读旧内容不覆盖——首次跑
 *   即变更前状态，重跑保持原快照）；存在性检查先于扫描（已拍过直接跳过，不做无效重扫）。
 * - fail-soft：扫描异常返回错误对象不抛（调用方降级注记，不阻断流程）。
 * - cwd 锚定主仓根由调用方保证（task-02 CLI 层职责），本函数不做锚定。
 *
 * @param {{ cwd: string, changeName: string, runtimeRoot?: string }} opts
 *   runtimeRoot 缺省 join(cwd, '.sillyspec', '.runtime')
 * @returns {{ written: boolean, reason?: 'exists', count?: number, path?: string, error?: string }}
 */
export function captureEndpointBaseline({ cwd, changeName, runtimeRoot } = {}) {
  const root = runtimeRoot || join(cwd, '.sillyspec', '.runtime')
  const baselineDir = join(root, 'endpoint-baselines')
  const baselinePath = join(baselineDir, `${changeName}.json`)

  // 幂等守卫在前：已存在直接跳过（不读旧内容不覆盖）
  if (existsSync(baselinePath)) return { written: false, reason: 'exists' }

  let endpoints
  try {
    endpoints = scanBackendEndpoints(cwd)
  } catch (e) {
    return { written: false, error: (e && e.message) || String(e) }
  }

  // git rev-parse fail-soft：非仓库/git 缺失 → null（基线仍可拍，端点集是主体）
  const baseCommit = gitQuiet(cwd, ['rev-parse', '--short', 'HEAD']) || null

  const payload = {
    schemaVersion: 1,
    change: changeName,
    baseCommit,
    generatedAt: new Date().toISOString(),
    endpoints: endpoints.map(e => ({ method: e.method, path: e.path, source: e.source })),
  }

  mkdirSync(baselineDir, { recursive: true })
  writeFileSync(baselinePath, JSON.stringify(payload, null, 2) + '\n', 'utf8')
  return { written: true, count: payload.endpoints.length, path: baselinePath }
}

/**
 * 端点集合 diff：baseline × current 按 method+归一 path 做 Map 集合运算。
 *
 * - 任一输入为 null/非数组 → null（调用方降级：无基线不比）。
 * - added：current 有 baseline 无（带 current 的 source）；removed：反向（带 baseline 的 source）。
 * - changed（同 path 参数改名等）不配对——归一键相同则判同（`:id/{plan_id}` vs
 *   `{param}/{plan_id}` 同键不假报）；键不同的变更天然呈 removed+added 两条独立行
 *   （design Gap-3 显式声明，防止实现期发明配对逻辑）。
 *
 * @param {Array<{method:string,path:string,source:string}>|null} baselineEndpoints
 * @param {Array<{method:string,path:string,source:string}>|null} currentEndpoints
 * @returns {{ added: Array<{method,path,source}>, removed: Array<{method,path,source}> } | null}
 */
export function diffEndpointSets(baselineEndpoints, currentEndpoints) {
  if (!Array.isArray(baselineEndpoints) || !Array.isArray(currentEndpoints)) return null

  const baselineMap = new Map()
  for (const ep of baselineEndpoints) {
    const key = endpointKey(ep)
    if (!baselineMap.has(key)) baselineMap.set(key, ep) // 同键保留首个，防重复行
  }
  const currentMap = new Map()
  for (const ep of currentEndpoints) {
    const key = endpointKey(ep)
    if (!currentMap.has(key)) currentMap.set(key, ep)
  }

  const added = []
  for (const [key, ep] of currentMap) {
    if (!baselineMap.has(key)) added.push({ method: ep.method, path: ep.path, source: ep.source })
  }
  const removed = []
  for (const [key, ep] of baselineMap) {
    if (!currentMap.has(key)) removed.push({ method: ep.method, path: ep.path, source: ep.source })
  }
  return { added, removed }
}
