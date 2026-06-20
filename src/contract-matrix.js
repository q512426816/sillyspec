/**
 * contract-matrix.js — API Contract Matrix 生成与注入
 *
 * plan 阶段：识别 task 之间的 provider/consumer 关系，生成契约矩阵
 * execute 阶段：
 *   - 后端 task 完成后自动提取 endpoint artifact
 *   - 前端 task 开始时注入上游契约
 * verify 阶段：读取 artifact 做 parity check
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync } from 'fs'
import { join, resolve, basename, relative } from 'path'
import {
  scanBackendEndpoints,
  scanFrontendApiCalls,
  normalizePath,
} from './endpoint-extractor.js'

// ─── 关键词检测 ─────────────────────────────────────────────────────────

const PROVIDER_KEYWORDS = /router|routes|endpoint|api|backend|controller|fastapi|flask|express|koa|spring/i
const CONSUMER_KEYWORDS = /frontend|client|service|apiFetch|request|fetch|axios|http/i

/**
 * 判断一个 task 文档是 provider（产出 API）还是 consumer（消费 API）
 * @param {string} taskContent - task markdown 内容
 * @returns {{ isProvider: boolean, isConsumer: boolean, confidence: number }}
 */
export function classifyTask(taskContent) {
  const isProvider = PROVIDER_KEYWORDS.test(taskContent)
  const isConsumer = CONSUMER_KEYWORDS.test(taskContent)
  // 避免所有 task 都被标记（因为几乎所有 task 都含 "api"）
  // 加强判定：provider 要命中 router/endpoint/backend/controller + api
  // consumer 要命中 frontend/client/apiFetch + api
  const providerStrong = /router|endpoint|backend|controller|fastapi|flask/i.test(taskContent)
  const consumerStrong = /frontend|apiFetch|axios|api.*client/i.test(taskContent)
  const providerConfidence = providerStrong ? 0.8 : (isProvider ? 0.4 : 0)
  const consumerConfidence = consumerStrong ? 0.8 : (isConsumer ? 0.4 : 0)
  return {
    isProvider: providerConfidence >= 0.4,
    isConsumer: consumerConfidence >= 0.4,
    confidence: Math.max(providerConfidence, consumerConfidence),
  }
}

/**
 * 从 plan.md 解析 task 依赖关系，识别 provider → consumer 对
 * @param {string} planContent - plan.md 内容
 * @param {string} changeDir - changes/<name>/ 目录
 * @returns {Array<{ provider: string, consumer: string, type: string }>}
 */
export function buildContractMatrix(planContent, changeDir) {
  const contracts = []

  // 解析 task 依赖关系
  // 格式: - [ ] task-04: ... (depends_on: [task-01]) 或
  //        | task-04 | ... | 01 |
  const taskDeps = parseTaskDependencies(planContent)

  // 读取各 task 文档，分类 provider/consumer
  const taskClasses = {}
  for (const taskName of Object.keys(taskDeps)) {
    const taskFile = join(changeDir, 'tasks', `${taskName}.md`)
    if (existsSync(taskFile)) {
      taskClasses[taskName] = classifyTask(readFileSync(taskFile, 'utf8'))
    }
  }

  // 识别契约对：A depends_on B，且 A 是 consumer，B 是 provider
  for (const [consumer, deps] of Object.entries(taskDeps)) {
    const consumerClass = taskClasses[consumer]
    if (!consumerClass?.isConsumer) continue

    for (const provider of deps) {
      const providerClass = taskClasses[provider]
      if (!providerClass?.isProvider) continue

      // 避免自引用和重复
      if (consumer === provider) continue
      const alreadyExists = contracts.some(
        c => c.provider === provider && c.consumer === consumer
      )
      if (alreadyExists) continue

      contracts.push({
        provider,
        consumer,
        type: 'api',
      })
    }
  }

  return contracts
}

/**
 * 从 plan.md 解析 task 依赖关系
 * @param {string} planContent
 * @returns {Record<string, string[]>} task → depends_on list
 */
function parseTaskDependencies(planContent) {
  const deps = {}

  // 方式 1: 表格形式 | task-04 | ... | 01,02 |
  const tableRows = planContent.matchAll(/\|[^|]*task-(\d+)[^|]*\|[^|]*\|[^|]*(?:task-)?(\d+(?:\s*[,，]\s*\d+)*)[^|]*\|/gi)
  for (const match of tableRows) {
    const task = `task-${match[1]}`
    const depList = match[2].split(/[,，\s]+/).map(d => `task-${d.trim()}`).filter(d => d.startsWith('task-'))
    deps[task] = depList
  }

  // 方式 2: depends_on 关键字
  const dependsPattern = planContent.matchAll(/task-(\d+).*?depends_on.*?(\d+(?:\s*[,，]\s*\d+)*)/gi)
  for (const match of dependsPattern) {
    const task = `task-${match[1]}`
    const depList = match[2].split(/[,，\s]+/).map(d => `task-${d.trim()}`).filter(d => d.startsWith('task-'))
    if (!deps[task]) deps[task] = []
    for (const d of depList) {
      if (!deps[task].includes(d)) deps[task].push(d)
    }
  }

  return deps
}

// ─── Execute 阶段：后端 task 完成后提取 artifact ───────────────────────

/**
 * 后端 task 完成后，扫描变更文件提取 endpoint artifact
 * @param {string} changeDir - changes/<name>/ 目录
 * @param {string} worktreePath - worktree 路径（扫描源码用）
 * @param {string} specBase - .sillyspec 目录
 * @param {string} taskName - task-04
 * @returns {{ ok: boolean, endpoints: Array, artifactPath: string|null }}
 */
export function extractProviderArtifact(changeDir, worktreePath, specBase, taskName) {
  const artifactDir = join(specBase, '.runtime', 'contract-artifacts', taskName)
  const artifactPath = join(artifactDir, 'endpoints.json')

  if (!worktreePath || !existsSync(worktreePath)) {
    return { ok: false, endpoints: [], artifactPath: null, error: 'worktree not found' }
  }

  try {
    const endpoints = scanBackendEndpoints(worktreePath)

    if (endpoints.length > 0) {
      mkdirSync(artifactDir, { recursive: true })
      const artifact = {
        task: taskName,
        type: 'backend_endpoints',
        extractedAt: new Date().toISOString(),
        endpoints: endpoints.map(e => ({
          method: e.method,
          path: normalizePath(e.path),
          source: relative(worktreePath, e.source),
          line: e.line,
        })),
      }
      writeFileSync(artifactPath, JSON.stringify(artifact, null, 2) + '\n')
      return { ok: true, endpoints: artifact.endpoints, artifactPath }
    }

    // 无端点提取到 — 不算错误（可能不是 router task）
    return { ok: true, endpoints: [], artifactPath: null }
  } catch (e) {
    return { ok: false, endpoints: [], artifactPath: null, error: e.message }
  }
}

// ─── Execute 阶段：前端 task 开始时注入契约 ─────────────────────────────

/**
 * 为 consumer task 构建上游契约注入文本
 * @param {string} changeDir - changes/<name>/ 目录
 * @param {string} specBase - .sillyspec 目录
 * @param {string} taskName - 当前 task（consumer）
 * @param {Array<{ provider: string, consumer: string, type: string }>} contracts
 * @returns {string|null} 注入到 prompt 的契约文本，无契约时返回 null
 */
export function buildConsumerInjection(changeDir, specBase, taskName, contracts) {
  const myContracts = contracts.filter(c => c.consumer === taskName)
  if (myContracts.length === 0) return null

  const parts = []
  for (const contract of myContracts) {
    const artifactDir = join(specBase, '.runtime', 'contract-artifacts', contract.provider)
    const artifactFile = join(artifactDir, 'endpoints.json')

    let endpoints = []
    if (existsSync(artifactFile)) {
      try {
        const artifact = JSON.parse(readFileSync(artifactFile, 'utf8'))
        endpoints = artifact.endpoints || []
      } catch {}
    }

    parts.push(`### Upstream Contract: ${contract.provider}`)
    if (endpoints.length > 0) {
      parts.push(`\nAvailable endpoints from **${contract.provider}**:`)
      for (const ep of endpoints) {
        parts.push(`- **${ep.method}** \`${ep.path}\``)
      }
    } else {
      parts.push(`\n⚠️ No endpoint artifact found for ${contract.provider}. This may indicate a contract gap.`)
    }
  }

  if (parts.length === 0) return null

  parts.unshift('## Upstream API Contracts')
  parts.push('')
  parts.push('### Rules')
  parts.push('1. Do not invent API paths. Use only endpoints listed above.')
  parts.push('2. If a required endpoint is missing, **stop and report the contract gap** instead of coding around it.')
  parts.push('3. If you need to add new endpoints, you must also update the backend provider task.')

  return parts.join('\n')
}

// ─── Verify 阶段：parity check ──────────────────────────────────────────

/**
 * verify 阶段执行 API parity check
 * @param {string} specBase - .sillyspec 目录
 * @param {string} worktreePath - worktree 路径
 * @returns {{ ok: boolean, missingBackend: Array, unusedBackend: Array, summary: string }}
 */
export function verifyApiParity(specBase, worktreePath) {
  const { diffApiParity } = require('./endpoint-extractor.js')

  // 读取所有 provider artifacts
  const artifactBase = join(specBase, '.runtime', 'contract-artifacts')
  const allProviderEndpoints = []

  if (existsSync(artifactBase)) {
    for (const entry of readdirSync(artifactBase, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue
      const epFile = join(artifactBase, entry.name, 'endpoints.json')
      if (existsSync(epFile)) {
        try {
          const artifact = JSON.parse(readFileSync(epFile, 'utf8'))
          for (const ep of (artifact.endpoints || [])) {
            allProviderEndpoints.push({
              method: ep.method,
              path: ep.path,
              source: `${entry.name}/${ep.source}`,
            })
          }
        } catch {}
      }
    }
  }

  // 扫描前端调用
  if (!worktreePath || !existsSync(worktreePath)) {
    return {
      ok: true,
      missingBackend: [],
      unusedBackend: [],
      summary: 'No worktree to scan for parity check',
    }
  }

  const frontendCalls = scanFrontendApiCalls(worktreePath)
  const { missingBackend, unusedBackend } = diffApiParity(frontendCalls, allProviderEndpoints)

  const ok = missingBackend.length === 0
  let summary = ok
    ? `✅ API parity check passed: ${allProviderEndpoints.length} backend endpoints, ${frontendCalls.length} frontend calls`
    : `❌ API parity check failed: ${missingBackend.length} frontend calls have no matching backend endpoint`

  if (unusedBackend.length > 0) {
    summary += ` | ${unusedBackend.length} backend endpoints unused by frontend`
  }

  return { ok, missingBackend, unusedBackend, summary }
}
