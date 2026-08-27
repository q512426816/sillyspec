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
import { join, resolve, basename, dirname, relative } from 'path'
import { gitQuiet } from './git-helper.js'
import { splitOwnVsForeignDiffFiles } from './foreign-declared.js'
import {
  scanBackendEndpoints,
  scanFrontendApiCalls,
  normalizePath,
  diffApiParity,
} from './endpoint-extractor.js'
import { parseTaskContracts } from './stages/plan-postcheck.js'

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
 * 解析 task 依赖关系，识别 provider → consumer 对（2026-08-20-task-truth-unify D-003@v1：
 * 行内 depends_on 标注源迁 tasks.md，函数内 tasks.md 优先、plan.md 回退拼接）
 * @param {string} planContent - plan.md 内容（任务总表依赖列兜底源）
 * @param {string} changeDir - changes/<name>/ 目录
 * @returns {Array<{ provider: string, consumer: string, type: string }>}
 */
export function buildContractMatrix(planContent, changeDir) {
  const contracts = []

  // 解析 task 依赖关系（tasks.md 注册表行内标注优先；plan.md 总表列兜底——两源拼合去重）
  // tasks.md 格式: - [ ] task-04: 名称 (depends_on: task-01,02)；
  // plan.md 总表: | task-04 | ... | 01 |
  const tasksMdPath = changeDir ? join(changeDir, 'tasks.md') : null
  let registryContent = ''
  if (tasksMdPath && existsSync(tasksMdPath)) {
    try { registryContent = readFileSync(tasksMdPath, 'utf8') } catch { registryContent = '' }
  }
  const taskDeps = parseTaskDependencies(registryContent + '\n' + String(planContent || ''))

  // 读取各 task 文档，分类 provider/consumer
  // classify consumers（taskDeps keys）+ providers（deps 值）。
  // 旧实现只 classify consumers → provider task 不在 keys 里 → providerClass 恒 undefined
  // → contracts 恒空 → 端点契约管线（buildConsumerInjection / extractArtifactsForChange）全失效。
  const taskClasses = {}
  const allTaskNames = new Set([...Object.keys(taskDeps), ...Object.values(taskDeps).flat()])
  for (const taskName of allTaskNames) {
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
 * 解析 task 依赖关系（2026-08-20-task-truth-unify D-003@v1）。
 * 方式 2（depends_on 行内标注）的机器解析源随任务行迁 tasks.md——调用方 buildContractMatrix
 * 读 tasks.md 传入（缺失回退 plan.md 内容，旧变更兼容）；方式 1（任务总表依赖列）仍来自 plan.md。
 * @param {string} registryContent - tasks.md 内容（优先）或 plan.md 内容（回退）
 * @returns {Record<string, string[]>} task → depends_on list
 */
function parseTaskDependencies(registryContent) {
  const deps = {}

  // 方式 1: 任务总表表格形式（两种常见格式）
  //   A: | task-04 | Wave | 优先级 | 说明 | 依赖 |  （task-NN 在独立列）
  //   B: | task | desc | deps |                       （task-NN 在任意列，bare 数字依赖）
  // 逐行按 | 分列解析，避免旧单正则 [^|]* 跨列贪婪误读说明列数字（409/HTTP 状态码）
  // 为假依赖（坑 contract-matrix-false-deps）。
  // deps 列判定：从行尾倒数第一个「非分隔符、非 task 自身、非单数字(Wave/优先级)」的列，
  // 且须含逗号/task- 引用/bare 两位以上数字。
  const lines = registryContent.split('\n')
  for (const line of lines) {
    const taskIdMatch = line.match(/task-(\d+)/i)
    if (!taskIdMatch) continue
    const taskId = `task-${taskIdMatch[1]}`

    const cells = line.split('|').map(c => c.trim()).filter(c => c.length > 0)
    if (cells.length < 2) continue

    // 从行尾倒数找 deps 列
    let depCell = null
    for (let i = cells.length - 1; i >= 0; i--) {
      const c = cells[i]
      if (/^-+$/.test(c)) continue                          // 分隔符 "-"
      if (c.toLowerCase() === taskId.toLowerCase()) continue // task 自身列
      // deps 列候选：含逗号（多依赖）或含 task- 引用
      if (/[,，]/.test(c) || /task-\d+/i.test(c)) { depCell = c; break }
      // bare 数字：须 ≥2 位且位于行尾第2+列（跳过优先级/Wave 列的个位数）
      if (/^\d{2,}$/.test(c) && i >= cells.length - 2) { depCell = c; break }
    }
    if (!depCell) continue
    const depNums = depCell.match(/\d+/g) || []
    deps[taskId] = depNums.map(d => `task-${d.padStart(2, '0')}`)
  }

  // 方式 2: tasks.md 行内标注 "- [ ] task-04: 名称 (depends_on: task-01,02)"（新家，D-003@v1；
  // 旧 plan.md checkbox 行内标注同格式兼容）。仅匹配 (depends_on: ...) 括号内内容，
  // 不在自由文本上全文正则（坑 contract-matrix-false-deps：说明列数字被误读为依赖）。
  const dependsPattern = registryContent.matchAll(/task-(\d+)\b[^)]*?\(depends_on:\s*([^)]+)\)/gi)
  for (const match of dependsPattern) {
    const task = `task-${match[1]}`
    const depStr = match[2]
    // 兼容两种写法：task-01, task-02 或 01, 02
    const depList = depStr.split(/[,，]\s*/).map(s => {
      const num = s.trim().match(/\d+/)
      return num ? `task-${num[0].padStart(2, '0')}` : null
    }).filter(Boolean)
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
export function extractProviderArtifact(changeDir, worktreePath, specBase, taskName, runtimeRoot) {
  // 平台模式 contract-artifacts 落 runtimeRoot；否则落 specBase/.runtime
  const artifactRoot = runtimeRoot || join(specBase, '.runtime')
  // 跨变更隔离：contract-artifacts/<changeName>/<taskName>/，避免不同变更同名 task 互相覆盖污染对账
  const changeName = changeDir ? basename(changeDir) : '_unknown'
  const artifactDir = join(artifactRoot, 'contract-artifacts', changeName, taskName)
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

/**
 * 汇总提取一个变更内所有 provider task 的 endpoint artifact。
 * run.js completeStep 在 execute Wave 完成时调用：扫 worktree → 按 buildContractMatrix 识别的
 * provider task，各自落 contract-artifacts/<changeName>/<taskName>/endpoints.json。
 * @param {{ changeDir: string, specBase: string, changeName: string, worktreePath: string|null }} args
 * @returns {string|null} 日志摘要；无 provider/无 plan/worktree 缺失时返回 null（不打扰）
 */
export function extractArtifactsForChange({ changeDir, specBase, changeName, worktreePath, runtimeRoot }) {
  if (!worktreePath || !changeDir || !existsSync(changeDir)) return null
  const planFile = join(changeDir, 'plan.md')
  if (!existsSync(planFile)) return null
  const contracts = buildContractMatrix(readFileSync(planFile, 'utf8'), changeDir)
  const providers = [...new Set(contracts.map(c => c.provider))]
  if (providers.length === 0) return null
  let withEndpoints = 0
  for (const taskName of providers) {
    // runtimeRoot 透传（坑 contract-artifact-runtime-split）：读侧（verify parity / consumer 注入）
    // 统一走 resolveRuntimeRoot(platformOpts, specBase)，写侧不透传时平台模式落 specBase/.runtime
    // → 读侧恒空 → parity 静默 skipped、契约注入整体失效
    const r = extractProviderArtifact(changeDir, worktreePath, specBase, taskName, runtimeRoot)
    if (r.ok && r.endpoints.length > 0) withEndpoints++
  }
  return `📦 契约 artifact 提取: providers=${providers.join(',')}（${withEndpoints}/${providers.length} 含端点）`
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
export function buildConsumerInjection(changeDir, specBase, taskName, contracts, runtimeRoot) {
  // 平台模式 contract-artifacts 落 runtimeRoot；否则落 specBase/.runtime
  const artifactRoot = runtimeRoot || join(specBase, '.runtime')
  const changeName = changeDir ? basename(changeDir) : '_unknown'
  const myContracts = contracts.filter(c => c.consumer === taskName)
  if (myContracts.length === 0) return null

  const parts = []
  for (const contract of myContracts) {
    const artifactDir = join(artifactRoot, 'contract-artifacts', changeName, contract.provider)
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

/**
 * 为 consumer task 构建字段级契约注入：对比 expects_from.needs vs provider.provides.fields
 *
 * 让 consumer 子代理带着明确的字段清单核验上游产出：
 * - provider 已承诺 → 编码时只使用 provides.fields，运行时缺字段上报
 * - provider 未承诺某 needs 字段 → 标 CONTRACT_GAP，要求 stop and report（禁止 fallback 编造）
 *
 * 命中场景：provider task 漏实现某字段（如 DaemonRuntimeRead 缺 daemon_instance_id），
 * consumer 若 fallback 编造 → 运行时 403/500。此处把"缺字段"暴露在子代理启动前。
 *
 * 注：plan-postcheck 已对账 expects_from↔provides，此处是 execute 时的二次保险，
 * 拦截 plan-postcheck 之后 task 文件被手改、或 provider 实际实现漏字段的情况。
 *
 * @param {string} changeDir - changes/<name>/ 目录
 * @param {string} taskName - consumer task（如 task-11）
 * @returns {string|null} 注入文本，无 expects_from 时返回 null
 */
export function buildContractFieldInjection(changeDir, taskName) {
  const consumerFile = join(changeDir, 'tasks', `${taskName}.md`)
  if (!existsSync(consumerFile)) return null
  const { expectsFrom } = parseTaskContracts(readFileSync(consumerFile, 'utf8'))
  const providers = Object.keys(expectsFrom)
  if (providers.length === 0) return null

  const lines = []
  lines.push('## Upstream Contract Fields（字段级核验）')
  lines.push('')

  for (const providerTask of providers) {
    const providerFile = join(changeDir, 'tasks', `${providerTask}.md`)
    let providerProvides = []
    if (existsSync(providerFile)) {
      providerProvides = parseTaskContracts(readFileSync(providerFile, 'utf8')).provides
    }

    for (const c of expectsFrom[providerTask]) {
      const providerEntry = providerProvides.find(p => p.contract === c.contract)
      if (!providerEntry) {
        lines.push(`### ⚠️ CONTRACT_GAP: ${providerTask} → ${c.contract}`)
        lines.push(`你需要字段 [${c.needs.join(', ')}]，但 ${providerTask} 的 provides 未声明此契约。`)
        lines.push(`**立即停止编码并上报**：不要 fallback、不要编造字段，先确认 ${providerTask} 是否应产出此契约。`)
      } else {
        const providerFields = new Set(providerEntry.fields)
        const missing = c.needs.filter(f => !providerFields.has(f))
        if (missing.length > 0) {
          lines.push(`### ⚠️ CONTRACT_GAP: ${providerTask} → ${c.contract}`)
          lines.push(`你需要字段 [${missing.join(', ')}]，但 ${providerTask}.provides 仅承诺 [${providerEntry.fields.join(', ')}]。`)
          lines.push(`**立即停止编码并上报**：不要 fallback、不要编造字段，先要求 ${providerTask} 在 provides.fields 补上 [${missing.join(', ')}]。`)
        } else {
          lines.push(`### ✅ ${providerTask} → ${c.contract}`)
          lines.push(`你需要的字段 [${c.needs.join(', ')}] 均在 ${providerTask}.provides 承诺内：[${providerEntry.fields.join(', ')}]。`)
          lines.push(`编码时**只使用上述字段**；若运行时实际返回缺字段，说明 provider 实现漏了 → 上报 CONTRACT_GAP，不要 fallback。`)
        }
      }
      lines.push('')
    }
  }

  lines.push('### 字段级铁律')
  lines.push('1. 禁止 fallback 编造：若上游返回缺字段，停止并上报 CONTRACT_GAP，不要用 `x || defaultValue` 之类的防御性回退掩盖契约破裂。')
  lines.push('2. 只消费 provides 承诺的字段；需要新字段必须先让 provider 更新 provides。')
  lines.push('3. 启动子代理前，先读 provider task 的 review.json / acceptance，确认其已声明完成上述契约字段。')

  return lines.join('\n')
}

// ─── Verify 阶段：parity check ──────────────────────────────────────────

/**
 * 读 worktree meta（parity 双根扫描 / diff 收窄共用）。
 * 优先 specBase/.runtime/worktrees/<change>/meta.json（主仓 spec 根——cwd=worktree 时 specBase 已被
 * command.js 漂移守卫锚定主仓；旧实现硬编码 scanRoot/.sillyspec/.runtime，worktree 内运行永远读不到
 * meta）；兼容回退 scanRoot/.sillyspec/.runtime（旧路径）。
 * @returns {{ meta: object, gitDir: string }|null} gitDir = diff/扫描用 git 根（真实 worktree 或 scanRoot）
 */
export function _readWorktreeMeta(specBase, scanRoot, changeName) {
  if (!changeName) return null
  const candidates = [
    specBase ? join(specBase, '.runtime', 'worktrees', changeName, 'meta.json') : null,
    join(scanRoot, '.sillyspec', '.runtime', 'worktrees', changeName, 'meta.json'),
  ].filter(Boolean)
  for (const metaPath of candidates) {
    try {
      if (!existsSync(metaPath)) continue
      const meta = JSON.parse(readFileSync(metaPath, 'utf8'))
      const gitDir = (meta.worktreePath && meta.mode !== 'in-place-fallback' && existsSync(meta.worktreePath))
        ? meta.worktreePath : scanRoot
      return { meta, gitDir }
    } catch { /* 损坏 meta 试下一候选 */ }
  }
  return null
}

/**
 * 取本变更 diff 文件集（parity 前端调用收窄用，坑 probe5-fullrepo-frontend-noise）。
 * 优先 worktree meta 锚点 diff（与 verify 同源）；无 meta 退主仓 git diff HEAD。
 * @returns {string[]|null}
 */
function _resolveDiffFilesForParity(specBase, scanRoot, changeName) {
  try {
    const wt = _readWorktreeMeta(specBase, scanRoot, changeName)
    if (wt) {
      const diffBase = wt.meta.baselineCommit || wt.meta.actualBaseHash || wt.meta.baseHash
      if (diffBase) {
        const out = gitQuiet(wt.gitDir, ['diff', '--name-only', `${diffBase}..HEAD`], { timeout: 30000 })
        if (out !== null) {
          const files = out.split('\n').filter(Boolean)
          // 并入 worktree 未提交（子代理默认不 commit 的形态，与 resolveVerifyChangedFiles 同口径）。
          // -uall：porcelain 默认把整目录折叠成 `dir/` 一项，文件级匹配（前端调用过滤）会漏新目录
          // 里的文件（坑 probe5-worktree-single-root-noise 实证：web/ 折叠 → feature.js 漏匹配）
          try {
            const wtStatus = gitQuiet(wt.gitDir, ['status', '--porcelain', '--untracked-files=all'], { timeout: 30000, trim: false })
            for (const line of String(wtStatus || '').split('\n')) {
              if (!line || line.length < 4) continue
              const p = line.slice(3).trim().split(' -> ').pop() || ''
              const clean = p.replace(/^"|"$/g, '')
              if (clean) files.push(clean)
            }
          } catch {}
          return [...new Set(files)]
        }
      }
    }
    // 无 meta（brownfield/已 cleanup）：主仓未提交 diff。他者声明归属过滤（坑
    // verify-reconcile-foreign-wip）：并行会话在途 WIP 的前端文件混入会产出「他者调用 ×
    // 本变更端点」的 missingBackend 误报——剔除他者显式声明文件（fail-closed：无主保留）。
    const out = gitQuiet(scanRoot, ['diff', '--name-only', 'HEAD'], { timeout: 30000 })
    if (out === null) return null
    const { own, foreign } = splitOwnVsForeignDiffFiles(scanRoot, changeName, out.split('\n').filter(Boolean), { specBase })
    if (foreign.length > 0) {
      console.warn(`⚠️ parity 对账已排除 ${foreign.length} 个并行会话声明的文件（${foreign.slice(0, 5).map(x => x.file).join(', ')}${foreign.length > 5 ? ' 等' : ''}）`)
    }
    return own
  } catch { return null }
}

/**
 * verify 阶段执行 API parity check
 * @param {string} specBase - .sillyspec 目录
 * @param {string} worktreePath - worktree 路径
 * @returns {{ ok: boolean, missingBackend: Array, unusedBackend: Array, summary: string, backendCount: number, frontendCount: number }}
 */
export function verifyApiParity(specBase, scanRoot, runtimeRoot, changeName = null) {
  // 平台模式 contract-artifacts 落 runtimeRoot；否则落 specBase/.runtime
  const artifactRoot = runtimeRoot || join(specBase, '.runtime')
  // 读取该变更的所有 provider artifacts（contract-artifacts/<changeName>/*/endpoints.json）。
  // changeName 缺失时回退扫顶层 contract-artifacts（CLI contractScan 跨变更场景兼容）。
  const artifactBase = changeName
    ? join(artifactRoot, 'contract-artifacts', changeName)
    : join(artifactRoot, 'contract-artifacts')
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

  // 扫描前端调用（scanRoot 通常 = 主工作区 cwd：verify 时代码已 apply 到主工作区）
  if (!scanRoot || !existsSync(scanRoot)) {
    return { ok: true, missingBackend: [], unusedBackend: [], summary: 'No scan root for parity check', backendCount: allProviderEndpoints.length, frontendCount: 0 }
  }

  // ── 双根并集现算（坑 probe5-worktree-single-root-noise，2026-08-24 用户实证：worktree 场景
  // 只现算 scanRoot 单根，另一侧端点不在比对集——verify 从主仓跑（apply 前）漏 worktree 新增端点；
  // verify 从 worktree 跑则既读不到 meta（旧路径硬编码 scanRoot/.sillyspec）也漏主仓既有 daemon
  // 端点 → 前端调用全量误报 missing）。后端端点全集 = 主仓既有 ∪ worktree 新增 ∪ 存量 artifact：
  // 现算根集 = [scanRoot, meta.worktreePath, 主仓根（cwd 自身在 linked worktree 内时经
  // git-common-dir 解析）]，逐根 scanBackendEndpoints 按 method+path 去重。
  // 存量基线失配坑（probe5-endpoint-baseline-stale，2026-08-22）由本并集一并覆盖：现算当前
  // 代码 ∪ 存量基线；unusedBackend 只对现算端点算（存量过期端点不再误报 unused）。
  const wt = _readWorktreeMeta(specBase, scanRoot, changeName)
  const liveRoots = []
  const pushRoot = (root, label) => {
    if (!root || !existsSync(root)) return
    const abs = resolve(root)
    if (liveRoots.some(r => resolve(r.root) === abs)) return
    liveRoots.push({ root, label })
  }
  pushRoot(scanRoot, 'scan-root')
  if (wt && wt.gitDir !== scanRoot) pushRoot(wt.gitDir, 'worktree')
  // cwd 自身是 linked worktree 时补主仓根（主仓返回 .git → dirname=scanRoot 被 pushRoot 去重）
  try {
    const commonDir = gitQuiet(scanRoot, ['rev-parse', '--git-common-dir'])
    if (commonDir) pushRoot(dirname(resolve(scanRoot, commonDir)), 'main')
  } catch { /* 非 git 目录/解析失败：单根继续 */ }

  const liveByRoot = []
  for (const { root, label } of liveRoots) {
    try { liveByRoot.push({ root, label, endpoints: scanBackendEndpoints(root) }) } catch { /* 单根失败不拖垮整体 */ }
  }
  const liveEndpoints = liveByRoot.flatMap(r => r.endpoints)
  const liveKeys = new Set(liveEndpoints.map(e => `${e.method} ${e.path}`))
  const mergedKeys = new Set(allProviderEndpoints.map(e => `${e.method} ${e.path}`))
  const mergedProviderEndpoints = [...allProviderEndpoints]
  for (const e of liveEndpoints) {
    const key = `${e.method} ${e.path}`
    if (!mergedKeys.has(key)) {
      mergedKeys.add(key)
      mergedProviderEndpoints.push(e)
    }
  }

  // ── 前端调用收窄到本变更 diff（坑 probe5-fullrepo-frontend-noise，2026-08-23 实证：
  // 「全仓前端调用 × 本变更局部登记」口径下，未受本变更影响的存量调用对不上局部端点集
  // → 143 个 missing 全是误报噪音）。比对口径 = 本变更 diff 文件内的调用 ∪ 全仓（仅当
  // 端点登记源也是全仓时——无 changeName 的 CLI contractScan 场景）。diff 不可得时退回
  // 全仓（不静默跳过对账）。
  // 扫描根优先真实 worktree（坑 probe5-worktree-single-root-noise）：apply 前新代码只在
  // worktree，scanRoot（主仓 cwd）里是旧版本——读旧版会漏新调用/多已删调用。
  let frontendCalls = []
  let frontendScope = 'full-repo'
  const frontendRoot = (wt && wt.gitDir !== scanRoot) ? wt.gitDir : scanRoot
  const frontendRootLabel = frontendRoot === scanRoot ? 'scan-root' : 'worktree'
  if (changeName) {
    try {
      const changed = _resolveDiffFilesForParity(specBase, scanRoot, changeName)
      if (changed && changed.length > 0) {
        const changedSet = new Set(changed.map(f => f.replace(/\\/g, '/')))
        frontendCalls = scanFrontendApiCalls(frontendRoot).filter(c => {
          const src = String(c.source || '').replace(/\\/g, '/')
          return changedSet.has(src) || [...changedSet].some(cf => src.endsWith(cf) || cf.endsWith(src))
        })
        frontendScope = `change-diff (${changed.length} files @ ${frontendRootLabel})`
      } else {
        frontendCalls = scanFrontendApiCalls(frontendRoot)
      }
    } catch { frontendCalls = scanFrontendApiCalls(frontendRoot) }
  } else {
    frontendCalls = scanFrontendApiCalls(frontendRoot)
  }

  const { missingBackend, unusedBackend } = diffApiParity(frontendCalls, mergedProviderEndpoints)
  // unusedBackend 收窄到现算端点（存量 artifact 的过期端点不参与——它不在当前代码里，
  // 「前端未调用」可能是端点已被重构掉而非真泄漏）
  const narrowedUnused = unusedBackend.filter(u => {
    const key = `${u.method} ${u.path}`
    return liveKeys.has(key) || liveEndpoints.length === 0
  })

  const ok = missingBackend.length === 0
  const liveRootSummary = liveByRoot.map(r => `${r.label} ${r.endpoints.length}`).join(' + ')
  let summary = ok
    ? `✅ API parity check passed: ${mergedProviderEndpoints.length} backend endpoints (live [${liveRootSummary}] + artifact ${allProviderEndpoints.length}), ${frontendCalls.length} frontend calls [scope: ${frontendScope}]`
    : `❌ API parity check failed: ${missingBackend.length} frontend calls have no matching backend endpoint [scope: ${frontendScope}]`

  if (narrowedUnused.length > 0) {
    summary += ` | ${narrowedUnused.length} backend endpoints unused by frontend`
  }

  return { ok, missingBackend, unusedBackend: narrowedUnused, summary, backendCount: mergedProviderEndpoints.length, frontendCount: frontendCalls.length, scanRoots: liveByRoot.map(r => r.root) }
}
