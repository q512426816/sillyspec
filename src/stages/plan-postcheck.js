/**
 * Plan Postcheck 模块
 *
 * 从 run.js 和 plan.js 拆出的确定性校验逻辑：
 * - 拓扑排序（topoSortWaves）
 * - 蓝图一致性校验（validateBlueprintConsistency）
 * - plan 产物校验（validatePlanArtifacts）
 * - 执行入口（executePlanPostcheck）
 *
 * 这些都是 noAI 步骤，不需要 LLM 参与。
 */
import { existsSync, readFileSync as _readFileSync, readdirSync } from 'fs'
// 归一化行尾为 LF：Windows 下 python/编辑器文本模式写 .md 会产生 CRLF，致本模块多处
// frontmatter/字段正则（`^---\n`、`allowed_paths:\s*\n…`、`^goal:` 等）失配，报「缺 frontmatter
// /缺字段」假错误（见缺陷 windows-python-crlf-taskcard）。读取时统一转 LF，一处覆盖全部正则。
const readFileSync = (filePath, encoding) => _readFileSync(filePath, encoding).replace(/\r\n/g, '\n')
import { join as pJoin } from 'path'
import jsYaml from 'js-yaml'
import { parseFileChangeList, pathMatches } from '../change-list.js'
import { getRule } from '../stage-contract-spec.js'
import { validateScriptCommands } from './cmd-existence.js'

// ═══════════════════════════════════════════════════════════════
// 解析工具（从 plan.js 迁移）
// ═══════════════════════════════════════════════════════════════

/**
 * 从 task-NN.md frontmatter 解析 depends_on 字段
 * @param {string} content - task 文件内容
 * @returns {string[]}
 */
function parseDependsOn(content) {
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---/)
  if (!fmMatch) return []
  const fm = fmMatch[1]
  const inlineMatch = fm.match(/depends_on:\s*\[([^\]]*)\]/)
  if (inlineMatch) {
    return inlineMatch[1].split(',').map(s => s.trim().replace(/['"]/g, '')).filter(Boolean)
  }
  const blockMatch = fm.match(/depends_on:\s*\n((?:\s+-\s+.+\n?)+)/)
  if (blockMatch) {
    return blockMatch[1].match(/-\s+(.+)/g)?.map(s => s.replace(/^-\s+/, '').trim().replace(/['"]/g, '')) || []
  }
  return []
}

/**
 * 解析 task-NN.md 的 task id（从 frontmatter 或文件名）
 * @param {string} content - task 文件内容
 * @param {string} filename - 文件名
 * @returns {string|null}
 */
function parseTaskId(content, filename) {
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---/)
  if (fmMatch) {
    const idMatch = fmMatch[1].match(/^id:\s*(.+)/m)
    if (idMatch) return idMatch[1].trim()
  }
  const fileMatch = filename.match(/(task-\d+)/i)
  return fileMatch ? fileMatch[1] : null
}

/**
 * 解析 task-NN.md 的 allowed_paths
 * @param {string} content
 * @returns {string[]}
 */
export function parseAllowedPaths(content) {
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---/)
  if (!fmMatch) return []
  const fm = fmMatch[1]
  const inlineMatch = fm.match(/allowed_paths:\s*\[([^\]]*)\]/)
  if (inlineMatch) {
    return inlineMatch[1].split(',').map(s => s.trim().replace(/['"]/g, '')).filter(Boolean)
  }
  const blockMatch = fm.match(/allowed_paths:\s*\n((?:\s+-\s+.+\n?)+)/)
  if (blockMatch) {
    return blockMatch[1].match(/-\s+(.+)/g)?.map(s => s.replace(/^-\s+/, '').trim().replace(/['"]/g, '')) || []
  }
  return []
}

/**
 * 检查 task-NN.md 是否包含验收标准章节
 * @param {string} content
 * @returns {boolean}
 */
function hasAcceptanceCriteria(content) {
  // 新模板把 goal/implementation/acceptance/verify/constraints 放在 frontmatter
  // （acceptance: 作为 fm 字段），老格式或人工写的卡片可能用 body 章节。
  // 两种都认，避免「模板格式」与「postcheck 判定」不一致导致卡片过不了校验。
  if (/^acceptance:/m.test(content)) return true
  return /##\s*验收标准/.test(content) || /##\s*Acceptance/.test(content)
}

/**
 * 检查 task-NN.md 是否包含 TDD/验证步骤
 * @param {string} content
 * @returns {boolean}
 */
function hasTddOrVerify(content) {
  // 同 hasAcceptanceCriteria：新模板用 frontmatter 的 verify: 字段，老格式用 body 章节。
  if (/^verify:/m.test(content)) return true
  return /##\s*TDD/.test(content) || /##\s*验证/.test(content) || /##\s*Verify/.test(content)
}

/**
 * 解析 task-NN.md 的跨任务契约字段 provides / expects_from
 * 用 js-yaml 解析 frontmatter（嵌套结构，正则不可靠）。
 * provides/expects_from 为可选字段；缺失或解析失败时返回空（不阻断）。
 * @param {string} content - task 文件内容
 * @returns {{ provides: Array<{contract, fields}>, expectsFrom: Record<string, Array<{contract, needs}>> }}
 */
export function parseTaskContracts(content) {
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---/)
  if (!fmMatch) return { provides: [], expectsFrom: {} }
  let fm
  try {
    fm = jsYaml.load(fmMatch[1]) || {}
  } catch {
    // frontmatter 非合法 YAML（老格式/手写不规范）—— 当作无契约字段，不阻断
    return { provides: [], expectsFrom: {} }
  }

  const provides = Array.isArray(fm.provides)
    ? fm.provides.map(p => ({
        contract: String(p?.contract || ''),
        fields: Array.isArray(p?.fields) ? p.fields.map(String) : [],
      })).filter(p => p.contract)
    : []

  const expectsFrom = {}
  if (fm.expects_from && typeof fm.expects_from === 'object' && !Array.isArray(fm.expects_from)) {
    for (const [providerTask, contracts] of Object.entries(fm.expects_from)) {
      if (!Array.isArray(contracts)) continue
      expectsFrom[providerTask] = contracts
        .map(c => ({
          contract: String(c?.contract || ''),
          needs: Array.isArray(c?.needs) ? c.needs.map(String) : [],
        }))
        .filter(c => c.contract)
    }
  }

  return { provides, expectsFrom }
}

// ═══════════════════════════════════════════════════════════════
// 核心逻辑
// ═══════════════════════════════════════════════════════════════

/**
 * 拓扑排序：根据 depends_on 计算波次
 * @param {Map<string, string[]>} depMap - taskId → depends_on list
 * @returns {{ waves: string[][], error: string|null }}
 */
export function topoSortWaves(depMap) {
  const tasks = [...depMap.keys()]
  const waves = []
  const assigned = new Set()
  const visited = new Set()

  // 先做循环依赖检测（DFS）
  function hasCycle(task, path) {
    if (path.has(task)) return true
    if (visited.has(task)) return false
    path.add(task)
    const deps = depMap.get(task) || []
    for (const dep of deps) {
      if (!depMap.has(dep)) continue // 依赖不存在（可能是外部引用），跳过
      if (hasCycle(dep, path)) return true
    }
    path.delete(task)
    visited.add(task)
    return false
  }
  for (const task of tasks) {
    if (hasCycle(task, new Set())) {
      return { waves: [], error: `检测到循环依赖，涉及 task: ${task}` }
    }
  }

  // 逐层分配 Wave
  while (assigned.size < tasks.length) {
    const currentWave = []
    for (const task of tasks) {
      if (assigned.has(task)) continue
      const deps = (depMap.get(task) || []).filter(d => depMap.has(d))
      if (deps.every(d => assigned.has(d))) {
        currentWave.push(task)
      }
    }
    if (currentWave.length === 0) {
      const remaining = tasks.filter(t => !assigned.has(t))
      return { waves: [], error: `无法解析依赖关系，剩余 task: ${remaining.join(', ')}` }
    }
    for (const task of currentWave) {
      assigned.add(task)
    }
    waves.push(currentWave)
  }

  return { waves, error: null }
}

/**
 * 解析 plan.md 显式 Wave 分组 → Map<taskId, waveIndex>。
 *
 * Wave 口径与 execute.js parseWavesFromPlan 一致（execute 的真实并行单元，非 topoSort 建议值）：
 *   - `## Wave N` 标题下的 task-XX checkbox 归入 Wave N；
 *   - 非 Wave 标题行（## 自检 等）退出当前 Wave 段，避免其 checkbox 混入。
 * 返回 null = plan.md 不存在或无显式 Wave 标题 → execute 会把所有 task 放进单个隐式 Wave
 * 全并行（execute.js:402-408），调用方据此判「同文件即冲突」。
 *
 * @param {string} planPath - plan.md 绝对路径
 * @returns {Map<string, number>|null} taskId → waveIndex；null = 无显式 Wave
 */
function parseTaskWavesFromPlan(planPath) {
  if (!existsSync(planPath)) return null
  const content = readFileSync(planPath, 'utf8')
  if (!/^#+\s*Wave\s+\d+/im.test(content)) return null
  const map = new Map()
  let currentWave = null
  for (const line of content.split('\n')) {
    const wm = line.match(/^#+\s*Wave\s+(\d+)/i)
    if (wm) { currentWave = parseInt(wm[1], 10); continue }
    if (/^#+\s/.test(line)) { currentWave = null; continue } // 非 Wave 标题退出当前 Wave 段
    const tm = line.match(/^[-*]\s*\[[ x]\]\s*(task-\d+)/i)
    if (tm && currentWave !== null) map.set(tm[1], currentWave)
  }
  return map
}

/**
 * 本地一致性校验器
 * @param {string} changeDir - 变更目录
 * @returns {{ ok: boolean, errors: string[], warnings: string[] }}
 */
export function validateBlueprintConsistency(changeDir) {
  const errors = []
  const warnings = []

  const tasksDir = pJoin(changeDir, 'tasks')
  if (!existsSync(tasksDir)) {
    return { ok: false, errors: ['tasks/ 目录不存在'], warnings }
  }

  const taskFiles = readdirSync(tasksDir).filter(f => /^task-\d+\.md$/.test(f))
  if (taskFiles.length === 0) {
    return { ok: false, errors: ['tasks/ 目录下没有 task-NN.md 文件'], warnings }
  }

  // task 卡片基础字段文案从 manifest 同源(plan.task-card-structure);${id} 由下方 `${taskId} (${file})` 替换。
  const bsRule = getRule('plan.task-card-structure')
  const taskInfo = new Map()
  const pathOwners = new Map()

  for (const file of taskFiles) {
    const filePath = pJoin(tasksDir, file)
    const content = readFileSync(filePath, 'utf8')
    const taskId = parseTaskId(content, file)
    if (!taskId) {
      errors.push(`${file}: 无法解析 task id`)
      continue
    }

    const dependsOn = parseDependsOn(content)
    const allowedPaths = parseAllowedPaths(content)
    const hasAcceptance = hasAcceptanceCriteria(content)
    const hasTdd = hasTddOrVerify(content)

    taskInfo.set(taskId, { dependsOn, allowedPaths, hasAcceptance, hasTdd, file })

    if (allowedPaths.length === 0) {
      errors.push(bsRule.data.messageAllowedPaths.replaceAll('${id}', `${taskId} (${file})`))
    }
    if (!hasAcceptance) {
      errors.push(bsRule.data.messageAcceptance.replaceAll('${id}', `${taskId} (${file})`))
    }
    if (!hasTdd) {
      warnings.push(bsRule.data.messageTdd.replaceAll('${id}', `${taskId} (${file})`))
    }

    for (const p of allowedPaths) {
      if (!pathOwners.has(p)) pathOwners.set(p, [])
      pathOwners.get(p).push(taskId)
    }
  }

  // 路径冲突（Wave 感知）：同 Wave 内 >1 task 共享 allowed_path → execute 强制并行（execute.js:603）
  // 子代理会互相覆盖该文件 → error。跨 Wave 同文件 → 串行执行安全 → warning。
  // Wave 口径 = plan.md 显式 `## Wave N`（parseTaskWavesFromPlan，与 execute 同源，非 topoSort 建议值）；
  // plan.md 无显式 Wave → execute 全并行（隐式单 Wave，execute.js:402-408）→ 同文件即冲突。
  const waveOfTask = parseTaskWavesFromPlan(pJoin(changeDir, 'plan.md'))
  for (const [p, owners] of pathOwners) {
    if (owners.length < 2) continue
    if (waveOfTask === null) {
      errors.push(
        `路径 ${p} 被 ${owners.length} 个 task 修改: ${owners.join(', ')} — plan.md 无显式 Wave 划分，` +
        `execute 会把它们放进同一隐式 Wave 全并行（execute.js:402-408），子代理互相覆盖。` +
        `解法：拆到不同 Wave（串行），或合并为单个 task。`
      )
      continue
    }
    // 显式 Wave：按 wave 分组 owners，找同 Wave 冲突
    const byWave = new Map()
    for (const t of owners) {
      const w = waveOfTask.get(t)
      if (w === undefined) continue // 未列入任何 Wave → execute 不执行，不参与冲突判定
      if (!byWave.has(w)) byWave.set(w, [])
      byWave.get(w).push(t)
    }
    for (const [w, ts] of byWave) {
      if (ts.length > 1) {
        errors.push(
          `路径 ${p} 被 Wave ${w} 内 ${ts.length} 个 task 修改: ${ts.join(', ')} — 同 Wave 任务 execute 强制并行（execute.js:603），` +
          `子代理会互相覆盖该文件。解法：把它们拆到不同 Wave（串行）。`
        )
      }
    }
    // 跨 Wave 共享：串行安全，仅提示
    if (byWave.size > 1) {
      warnings.push(`路径 ${p} 跨 Wave 被修改: ${owners.join(', ')}（不同 Wave 串行执行，安全；确认是否有意共享）`)
    }
  }

  // 拓扑排序 + 循环依赖
  const depMap = new Map()
  for (const [taskId, info] of taskInfo) {
    depMap.set(taskId, info.dependsOn)
  }
  const { error: topoError } = topoSortWaves(depMap)
  if (topoError) {
    errors.push(topoError)
  }

  return { ok: errors.length === 0, errors, warnings }
}

/**
 * 跨任务契约校验器：对账 consumer.expects_from ↔ provider.provides
 *
 * 修复场景：consumer task 声明期望 provider 产出某 DTO 的某字段，
 * 但 provider 的 provides 未承诺（或字段缺失）→ plan 阶段阻断，
 * 避免到 execute/verify 才暴露（典型表现：前端 fallback 错误字段 → 403/500）。
 *
 * provides / expects_from 均为可选字段：未声明时不校验（向后兼容）。
 * @param {string} changeDir - 变更目录
 * @returns {{ ok: boolean, errors: string[], warnings: string[] }}
 */
export function validateCrossTaskContracts(changeDir) {
  const errors = []
  const warnings = []

  const tasksDir = pJoin(changeDir, 'tasks')
  if (!existsSync(tasksDir)) {
    return { ok: true, errors, warnings }
  }

  const taskFiles = readdirSync(tasksDir).filter(f => /^task-\d+\.md$/.test(f))
  if (taskFiles.length === 0) {
    return { ok: true, errors, warnings }
  }

  // 第一遍：收集每个 task 的 provides（taskId → Map(contract → Set(fields))）
  const providesByTask = new Map()
  for (const file of taskFiles) {
    const content = readFileSync(pJoin(tasksDir, file), 'utf8')
    const taskId = parseTaskId(content, file)
    if (!taskId) continue
    const { provides } = parseTaskContracts(content)
    const contractMap = new Map()
    for (const p of provides) {
      contractMap.set(p.contract, new Set(p.fields))
    }
    providesByTask.set(taskId, contractMap)
  }

  // 第二遍：校验每个 consumer 的 expects_from 是否被 provider.provides 覆盖。
  // 3 种断裂文案(unknown-provider / undeclared / missing-fields)从 manifest 同源
  // (plan.cross-task-contract.data),${consumer}/${provider}/${contract}/${needs}/${available} replaceAll。
  const ctRule = getRule('plan.cross-task-contract')
  const renderCtMsg = (tmpl, consumer, provider, contract, needs, available) => tmpl
    .replaceAll('${consumer}', consumer)
    .replaceAll('${provider}', provider)
    .replaceAll('${contract}', contract)
    .replaceAll('${needs}', needs)
    .replaceAll('${available}', available)
  for (const file of taskFiles) {
    const content = readFileSync(pJoin(tasksDir, file), 'utf8')
    const consumerId = parseTaskId(content, file)
    if (!consumerId) continue
    const { expectsFrom } = parseTaskContracts(content)

    for (const [providerTask, contracts] of Object.entries(expectsFrom)) {
      if (!providesByTask.has(providerTask)) {
        for (const c of contracts) {
          errors.push(renderCtMsg(ctRule.data.messageUnknownProvider, consumerId, providerTask, c.contract, c.needs.join(', '), ''))
        }
        continue
      }

      const providerContracts = providesByTask.get(providerTask)
      for (const c of contracts) {
        const providerFields = providerContracts.get(c.contract)
        if (providerFields === undefined) {
          errors.push(renderCtMsg(ctRule.data.messageUndeclaredContract, consumerId, providerTask, c.contract, c.needs.join(', '), ''))
          continue
        }
        const missing = c.needs.filter(f => !providerFields.has(f))
        if (missing.length > 0) {
          errors.push(renderCtMsg(ctRule.data.messageMissingFields, consumerId, providerTask, c.contract, missing.join(', '), [...providerFields].join(', ')))
        }
      }
    }
  }

  return { ok: errors.length === 0, errors, warnings }
}

/**
 * 从 local.yaml 文本解析 modules 块（monorepo 子包定位）。
 *
 * 与 verify-postcheck.extractModules 同风格（轻量行扫描，不引 yaml 依赖），不复用是为避免
 * plan-postcheck → verify-postcheck → contract-matrix → plan-postcheck 的循环导入。
 * 只取 path 字段（test 字段此处用不到），结构 { name: { path } }。
 *
 *   modules:
 *     backend: { path: "backend/", test: "cd backend && uv run pytest" }
 *
 * @param {string} yamlText
 * @returns {Record<string, {path:string}>|null} 无 modules 块或无有效条目 → null
 */
export function parseLocalYamlModules(yamlText) {
  if (!yamlText) return null
  const lines = yamlText.split('\n')
  let startIdx = -1
  for (let i = 0; i < lines.length; i++) {
    if (/^modules:\s*(?:#.*)?$/.test(lines[i])) { startIdx = i; break }
  }
  if (startIdx === -1) return null
  const modules = {}
  for (let i = startIdx + 1; i < lines.length; i++) {
    const line = lines[i]
    const entry = line.match(/^  ([A-Za-z0-9_.\-]+):\s*(.*)$/)
    if (!entry) {
      // 遇到新的顶层 key（行首非空格且非注释）→ modules 块结束
      if (line.length > 0 && !line.startsWith(' ') && !line.startsWith('#') && line.trim() !== '') break
      continue
    }
    const rest = entry[2] || ''
    // path 值：带引号或不带引号（flow mapping），取第一个匹配
    const pathMatch = rest.match(/path:\s*"([^"]+)"/) || rest.match(/path:\s*([^,\s}]+)/)
    if (pathMatch) modules[entry[1]] = { path: pathMatch[1] }
  }
  return Object.keys(modules).length > 0 ? modules : null
}

/**
 * TaskCard 命令存在性校验器（调共享 validateScriptCommands，硬阻断）。
 *
 * 修复场景（design D-04 / 问题 3）：TaskCard verify/implementation 写 `pnpm gen:types`
 * 但根 package.json 无此 script（实际在 monorepo 子包 packages 目录下），plan 阶段零校验
 * → execute 子代理跑死命令。scan-postcheck 的命令校验只看 local.yaml 且维持 warning；
 * 本函数对 TaskCard 升 error（同 helper、严重度由调用方定）。
 *
 * modules 从 local.yaml 提取（monorepo 子包感知）：无 modules 块时仅查根 package.json
 * （与 scan-postcheck 历史行为一致）；有 modules 块时多候选子包 package.json 任一命中即通过。
 *
 * @param {string} changeDir - 变更目录
 * @param {string} projectRoot - 项目根目录（package.json 查找基准）
 * @param {object|null} modules - local.yaml modules 块（{ name: { path } }），可选
 * @returns {{ ok: boolean, errors: string[], warnings: string[] }}
 */
export function validateTaskCommands(changeDir, projectRoot, modules = null) {
  const errors = []
  const warnings = []

  const tasksDir = pJoin(changeDir, 'tasks')
  if (!existsSync(tasksDir)) {
    return { ok: true, errors, warnings }
  }
  const taskFiles = readdirSync(tasksDir).filter(f => /^task-\d+\.md$/.test(f))
  if (taskFiles.length === 0) {
    return { ok: true, errors, warnings }
  }

  for (const file of taskFiles) {
    const content = readFileSync(pJoin(tasksDir, file), 'utf8')
    const taskId = parseTaskId(content, file) || file
    const fmMatch = content.match(/^---\n([\s\S]*?)\n---/)
    if (!fmMatch) continue // feasibility 已报 frontmatter 缺失，不重复
    let fm
    try {
      fm = jsYaml.load(fmMatch[1]) || {}
    } catch {
      continue // 非法 YAML 由 feasibility 处理，不重复
    }

    // 合并 verify + implementation 文本（命令可能出现在任一字段）
    const verifyText = typeof fm.verify === 'string' ? fm.verify : ''
    const implText = typeof fm.implementation === 'string' ? fm.implementation : ''
    const text = `${verifyText}\n${implText}`
    if (!text.trim()) continue

    const { invalid } = validateScriptCommands(text, { projectRoot, modules })
    for (const inv of invalid) {
      errors.push(`${taskId}: ${inv.cmd} 命令不存在（${inv.reason}）`)
    }
  }

  return { ok: errors.length === 0, errors, warnings }
}

// 路径容差匹配（normalizePath / globMatch / pathMatches）复用自 change-list.js，
// design 清单解析与 allowed_paths 对账共用同一套匹配语义，避免两处逻辑漂移。

/**
 * design.md 文件变更清单 → tasks allowed_paths 覆盖对账
 *
 * 修复场景：design.md 声明要改某源码文件（如 access-guide UI），但没有任何 task 的
 * allowed_paths 覆盖它 → execute 子代理被 allowed_paths 锁死不能碰它 → UI 没改
 * （「页面还是错的」），而 verify 一路对照 task 卡片循环验证照样 PASS。
 *
 * 在 plan-postcheck（execute 前）确定性拦截：design 清单中每个源码文件必须被
 * 至少一个 task 的 allowed_paths 覆盖（前缀 / glob 容差匹配）。
 *
 * fail-open 边界（不阻断）：design.md 不存在、无 task 卡片（none 级别）、
 * task 卡片均无 allowed_paths（由 validatePlanFeasibility 把关）。
 * 阻断边界：有 task 卡片但 design 缺清单章节（light/full 已生成 task → design 必有清单）、
 * 清单文件未被任何 task 的 allowed_paths 覆盖。
 *
 * @param {string} changeDir - 变更目录
 * @returns {{ ok: boolean, errors: string[], warnings: string[], designFiles: string[], uncovered: string[] }}
 */
export function validateDesignFileCoverage(changeDir) {
  const errors = []
  const warnings = []

  const designPath = pJoin(changeDir, 'design.md')
  if (!existsSync(designPath)) {
    return { ok: true, errors, warnings, designFiles: [], uncovered: [] }
  }

  const tasksDir = pJoin(changeDir, 'tasks')
  const taskFiles = existsSync(tasksDir)
    ? readdirSync(tasksDir).filter(f => /^task-\d+\.md$/.test(f))
    : []

  // 无 task 卡片（plan_level=none 或老变更）→ 无对账对象，fail-open
  if (taskFiles.length === 0) {
    return { ok: true, errors, warnings, designFiles: [], uncovered: [] }
  }

  const designFiles = [...parseFileChangeList(designPath)]
  // 两种断裂文案(缺清单章节 / 文件未覆盖)从 manifest 同源(plan.design-file-coverage.data)。
  const dcRule = getRule('plan.design-file-coverage')
  if (designFiles.length === 0) {
    // 走到 plan-postcheck 说明已生成 task 卡片（light/full），brainstorm 模板规定清单必填。
    // 无清单 = design↔execute 偏差温床（覆盖对账无从对起），阻断，不让它静默放过。
    errors.push(dcRule.data.messageMissingList)
    return { ok: false, errors, warnings, designFiles: [], uncovered: [] }
  }
  const allAllowed = []
  for (const file of taskFiles) {
    const content = readFileSync(pJoin(tasksDir, file), 'utf8')
    allAllowed.push(...parseAllowedPaths(content))
  }
  if (allAllowed.length === 0) {
    return { ok: true, errors, warnings, designFiles, uncovered: [] }
  }

  const uncovered = designFiles.filter(df => !allAllowed.some(ap => pathMatches(df, ap)))
  if (uncovered.length > 0) {
    errors.push(
      dcRule.data.messageUncovered
        .replaceAll('${count}', uncovered.length)
        .replaceAll('${files}', uncovered.map(f => `     • ${f}`).join('\n'))
    )
  }

  return { ok: errors.length === 0, errors, warnings, designFiles, uncovered }
}

/**
 * Plan 可行性校验器（本地代码证明 execute 前置条件）
 * 检查 TaskCard 的完整性和可行性
 * @param {string} changeDir - 变更目录
 * @param {string} projectRoot - 项目根目录（用于检查 allowed_paths 是否存在）
 * @returns {{ ok: boolean, errors: string[], warnings: string[] }}
 */
export function validatePlanFeasibility(changeDir, projectRoot = null) {
  const errors = []
  const warnings = []

  const tasksDir = pJoin(changeDir, 'tasks')
  if (!existsSync(tasksDir)) {
    return { ok: true, errors, warnings } // none/light 可能没有 tasks/
  }

  const taskFiles = readdirSync(tasksDir).filter(f => /^task-\d+\.md$/.test(f)).sort()
  if (taskFiles.length === 0) {
    return { ok: true, errors, warnings }
  }

  // task 卡片完整 schema 文案从 manifest 同源(plan.task-card-schema);${id} 随检查点取 ${file} / ${taskId || file} / ${taskId}。
  const fsRule = getRule('plan.task-card-schema')
  const allTaskIds = []
  const depMap = new Map()

  for (const file of taskFiles) {
    const content = readFileSync(pJoin(tasksDir, file), 'utf8')
    const fmMatch = content.match(/^---\n([\s\S]*?)\n---/)
    if (!fmMatch) {
      errors.push(fsRule.data.messageFrontmatter.replaceAll('${id}', file))
      continue
    }
    const fm = fmMatch[1]
    const body = content.slice(fmMatch[0].length)

    // 1. 必要字段检查
    const taskId = (fm.match(/^id:\s*(.+)/m)?.[1] || '').trim()
    const title = (fm.match(/^title:\s*(.+)/m)?.[1] || '').trim()
    // 复用 parseAllowedPaths（认 inline [x] + 块式两种写法），与 blueprint consistency / design coverage
    // 三处统一，消除「feasibility 只认块式 → inline 写法被误报 allowed_paths 为空」的漂移（transcript 卡 3 轮根因）。
    const allowedPaths = parseAllowedPaths(content)

    if (!taskId) errors.push(fsRule.data.messageId.replaceAll('${id}', file))
    if (!title) errors.push(fsRule.data.messageTitle.replaceAll('${id}', file))
    // title_zh（中文标题）完整性：子代理常为压 plan.js 的 20~40 行硬上限合并 title/title_zh（静默丢失），
    // postcheck 不校验行数（那是 prompt 劝说）但强制 frontmatter 字段齐全（enforcement 优于放宽劝说）。
    // 无对应 manifest 文案，内联（其余字段文案走 fsRule.data.messageXxx）。prompt-control-debt plan-b。
    const titleZh = (fm.match(/^title_zh:\s*(.+)/m)?.[1] || '').trim()
    if (!titleZh) errors.push(`${taskId || file}: frontmatter 缺少 title_zh（中文标题）——不得为压行数合并/删除字段`)
    if (taskId) allTaskIds.push(taskId)

    // 2. allowed_paths 不为空
    if (allowedPaths.length === 0) {
      errors.push(fsRule.data.messageAllowedPaths.replaceAll('${id}', taskId || file))
    }

    // 3. allowed_paths 文件存在或父目录存在（仅在 projectRoot 提供时检查）
    if (projectRoot && allowedPaths.length > 0) {
      for (const p of allowedPaths) {
        const fullPath = pJoin(projectRoot, p)
        const parentDir = pJoin(fullPath, '..')
        if (!existsSync(fullPath) && !existsSync(parentDir)) {
          warnings.push(`${taskId}: allowed_paths 中的 ${p} 文件和父目录都不存在`)
        }
      }
    }

    // 4. depends_on 引用存在
    const dependsOn = parseDependsOn(content)
    if (taskId) depMap.set(taskId, dependsOn)

    // 5. body/frontmatter 包含必要字段（TaskCard 格式中这些字段在 frontmatter 内）
    const hasGoal = /^goal:/m.test(fm)
    const hasImplementation = /implementation:/m.test(fm)
    const hasAcceptance = /acceptance:/m.test(fm)
    const hasVerify = /verify:/m.test(fm)
    const hasConstraints = /constraints:/m.test(fm)

    if (!hasGoal) errors.push(fsRule.data.messageGoal.replaceAll('${id}', taskId || file))
    if (!hasImplementation) errors.push(fsRule.data.messageImplementation.replaceAll('${id}', taskId || file))
    if (!hasAcceptance) errors.push(fsRule.data.messageAcceptance.replaceAll('${id}', taskId || file))
    if (!hasVerify) errors.push(fsRule.data.messageVerify.replaceAll('${id}', taskId || file))
    if (!hasConstraints) errors.push(fsRule.data.messageConstraints.replaceAll('${id}', taskId || file))

    // 6. acceptance best-effort 字段 grep（D-05 软约束，warning 不阻断）
    // 从 acceptance 文本提取 snake_case/camelCase 标识符，grep allowed_paths 指向的源文件；
    // 找不到 → warning（给 LLM 审查提线索，不阻断 execute）。宁漏不噪：只取 snake/camel，
    // 正则天然避开命令（无 _ 或大写）/路径（无 /）/中文；glob allowed_path / 目录 / 不存在文件一律跳过。
    if (projectRoot && hasAcceptance && allowedPaths.length > 0) {
      let acceptanceText = ''
      try {
        const fmObj = jsYaml.load(fm) || {}
        if (typeof fmObj.acceptance === 'string') acceptanceText = fmObj.acceptance
        else if (Array.isArray(fmObj.acceptance)) acceptanceText = fmObj.acceptance.join('\n')
      } catch {
        // frontmatter 非法 YAML（feasibility 未对 fm 做 YAML 解析，可能字面合法但语义复杂）→ 跳过 best-effort
      }
      if (acceptanceText) {
        const IDENT_RE = /(?<![A-Za-z])[a-z]+(?:_[a-z]+)+|(?<![A-Za-z])[a-z]+(?:[A-Z][a-z]+)+/g
        const idents = [...new Set(acceptanceText.match(IDENT_RE) || [])]
        if (idents.length > 0) {
          const readableFiles = []
          for (const ap of allowedPaths) {
            if (ap.includes('*')) continue // glob，跳过（best-effort，不展开）
            try {
              readableFiles.push(readFileSync(pJoin(projectRoot, ap), 'utf8'))
            } catch {
              // 目录 / 不存在 / 不可读 → 跳过（feasibility 3 已对不存在文件提示 warning）
            }
          }
          // 至少读到一个源文件才比对，避免「全没读到 → 全部标识符误报」噪声
          if (readableFiles.length > 0) {
            for (const ident of idents) {
              if (!readableFiles.some(c => c.includes(ident))) {
                warnings.push(`${taskId}: acceptance 提到 ${ident} 但 allowed_paths 源文件未命中`)
              }
            }
          }
        }
      }
    }
  }

  // 4b. depends_on 引用存在性
  for (const [taskId, deps] of depMap) {
    for (const dep of deps) {
      if (!depMap.has(dep)) {
        errors.push(fsRule.data.messageDependsOnMissing.replaceAll('${id}', taskId).replaceAll('${dep}', dep))
      }
    }
  }

  // 5b. depends_on 无环（topoSortWaves 已含循环检测）
  const { error: topoError } = topoSortWaves(depMap)
  if (topoError) {
    errors.push(topoError)
  }

  // 7. task id 连续性
  if (allTaskIds.length > 0) {
    const nums = allTaskIds.map(id => {
      const m = id.match(/task-(\d+)/i)
      return m ? parseInt(m[1]) : null
    }).filter(n => n !== null).sort((a, b) => a - b)
    if (nums.length > 0 && nums[0] === 1) {
      for (let i = 0; i < nums.length; i++) {
        if (nums[i] !== i + 1) {
          errors.push(getRule('plan.task-id-continuity').failMessage.replaceAll('${expected}', String(i + 1).padStart(2, '0')).replaceAll('${actual}', String(nums[i]).padStart(2, '0')))
          break
        }
      }
    }
  }

  // 9. plan.md 通过 validatePlanForExecute（延迟导入避免循环依赖）
  // 这在 run.js 的 postcheck contract 中已检查，这里不重复

  return { ok: errors.length === 0, errors, warnings }
}

/**
 * Plan 产物校验：检查 plan.md 和 tasks/ 是否齐全
 * @param {string} changeDir - 变更目录
 * @returns {{ ok: boolean, errors: string[], warnings: string[], planExists: boolean, taskCount: number }}
 */
export function validatePlanArtifacts(changeDir) {
  const errors = []
  const warnings = []

  const planPath = pJoin(changeDir, 'plan.md')
  if (!existsSync(planPath)) {
    return { ok: false, errors: ['plan.md 不存在'], warnings, planExists: false, taskCount: 0 }
  }

  const tasksDir = pJoin(changeDir, 'tasks')
  let taskCount = 0
  if (existsSync(tasksDir)) {
    taskCount = readdirSync(tasksDir).filter(f => /^task-\d+\.md$/.test(f)).length
  } else {
    warnings.push('tasks/ 目录不存在（plan_level=none 时可接受）')
  }

  return { ok: true, errors, warnings, planExists: true, taskCount }
}

// ═══════════════════════════════════════════════════════════════
// 执行入口（从 run.js 迁移）
// ═══════════════════════════════════════════════════════════════

/**
 * Plan postcheck 主函数：Wave 重排 + 一致性校验 + 产物确认
 *
 * @param {{ cwd: string, specRoot?: string, resolveChangeDir: Function, progress?: object }} context
 * @throws {Error} 校验失败时抛出
 */
export async function executePlanPostcheck(context) {
  const { cwd, specRoot, resolveChangeDir, progress } = context

  const specDir = specRoot || pJoin(cwd, '.sillyspec')
  const changesDir = pJoin(specDir, 'changes')
  if (!existsSync(changesDir)) {
    console.warn('  ⚠️ 未找到 changes 目录，跳过 postcheck')
    return
  }

  // 找到当前变更目录（progress 由调用方从 SQLite 读取并传入；.runtime/progress.json 已废弃）
  let changeDir = null
  if (progress) {
    changeDir = resolveChangeDir(cwd, progress, specDir)
  }
  if (!changeDir) {
    // 回退：找最新的变更目录
    const dirs = readdirSync(changesDir)
      .filter(d => existsSync(pJoin(changesDir, d, 'plan.md')))
      .sort().reverse()
    if (dirs.length > 0) changeDir = pJoin(changesDir, dirs[0])
  }
  if (!changeDir) {
    console.warn('  ⚠️ 未找到当前变更目录，跳过 postcheck')
    return
  }

  console.log(`  📂 变更目录: ${changeDir}`)

  // ── 1. 一致性校验 ──
  const consistency = validateBlueprintConsistency(changeDir)
  if (consistency.errors.length > 0) {
    console.error('\n❌ 蓝图一致性校验失败：')
    for (const err of consistency.errors) console.error(`   - ${err}`)
    console.error('\n   请修复上述问题后重新完成此步骤。')
    throw new Error('planPostcheck: blueprint consistency check failed')
  }
  if (consistency.warnings.length > 0) {
    console.warn('\n⚠️  蓝图一致性警告（不阻断）：')
    for (const w of consistency.warnings) console.warn(`   - ${w}`)
  }

  // ── 1b. 可行性校验 ──
  const feasibility = validatePlanFeasibility(changeDir, context.cwd)
  if (feasibility.errors.length > 0) {
    console.error('\n❌ Plan 可行性校验失败：')
    for (const err of feasibility.errors) console.error(`   - ${err}`)
    throw new Error('planPostcheck: feasibility check failed')
  }
  if (feasibility.warnings.length > 0) {
    console.warn('\n⚠️  Plan 可行性警告（不阻断）：')
    for (const w of feasibility.warnings) console.warn(`   - ${w}`)
  }

  // ── 1c. 跨任务契约校验 ──
  // 对账 consumer.expects_from ↔ provider.provides，拦截「consumer 期望字段
  // 但 provider 未承诺」的契约断裂（避免到 execute/verify 才暴露成 403/500）
  const crossTask = validateCrossTaskContracts(changeDir)
  if (crossTask.errors.length > 0) {
    console.error('\n❌ 跨任务契约校验失败（consumer 期望的字段未被 provider 承诺）：')
    for (const err of crossTask.errors) console.error(`   - ${err}`)
    console.error('\n   修复方式：要么在 provider task 的 provides.fields 补上缺失字段，')
    console.error('   要么修正 consumer task 的 expects_from.needs（确认依赖是否真实）。')
    throw new Error('planPostcheck: cross-task contract check failed')
  }

  // ── 1c-b. TaskCard 命令存在性校验 ──
  // TaskCard verify/implementation 的 `npm|pnpm|yarn run <script>` 必须在 package.json
  // scripts 中存在（monorepo 子包感知——读 local.yaml modules 块定位）。
  // invalid → error 硬阻断，避免 execute 子代理跑死命令（design D-04 / 问题 3）。
  // modules 块可选：无块时仅查根 package.json（与 scan-postcheck 历史行为一致）。
  const localYamlPath = pJoin(specDir, 'local.yaml')
  let taskModules = null
  if (existsSync(localYamlPath)) {
    taskModules = parseLocalYamlModules(readFileSync(localYamlPath, 'utf8'))
  }
  const taskCmds = validateTaskCommands(changeDir, context.cwd, taskModules)
  if (taskCmds.errors.length > 0) {
    console.error('\n❌ TaskCard 命令存在性校验失败（verify/implementation 的 npm/pnpm/yarn run <script> 不存在）：')
    for (const err of taskCmds.errors) console.error(`   - ${err}`)
    console.error('\n   修复方式：要么在 package.json scripts 补上缺失命令（monorepo 注意子包路径），')
    console.error('   要么修正 TaskCard 的 verify/implementation（确认命令是否真实、是否需 cd 子包）。')
    throw new Error('planPostcheck: task command existence check failed')
  }

  // ── 1d. design 文件覆盖对账 ──
  // design.md 清单中的每个源码文件必须被某 task 的 allowed_paths 覆盖，
  // 否则 execute 子代理无权改它 → 漏改（典型表现：「页面还是错的」）。
  const coverage = validateDesignFileCoverage(changeDir)
  for (const w of coverage.warnings) console.warn(`\n  ⚠️  ${w}`)
  if (coverage.errors.length > 0) {
    console.error('\n❌ design.md 文件覆盖对账失败（清单中的文件未被任何 task 覆盖）：')
    for (const err of coverage.errors) console.error(`   - ${err}`)
    throw new Error('planPostcheck: design file coverage check failed')
  }
  if (coverage.designFiles.length > 0 && coverage.uncovered.length === 0) {
    console.log(`  ✅ design.md ${coverage.designFiles.length} 个文件全部被 task allowed_paths 覆盖`)
  }

  // ── 2. Wave 重排 ──
  const tasksDir = pJoin(changeDir, 'tasks')
  if (existsSync(tasksDir)) {
    const taskFiles = readdirSync(tasksDir).filter(f => /^task-\d+\.md$/.test(f))
    const depMap = new Map()

    for (const file of taskFiles) {
      const content = readFileSync(pJoin(tasksDir, file), 'utf8')
      const fmMatch = content.match(/^---\n([\s\S]*?)\n---/)
      let taskId = file.replace('.md', '')
      if (fmMatch) {
        const idMatch = fmMatch[1].match(/^id:\s*(.+)/m)
        if (idMatch) taskId = idMatch[1].trim()
      }
      depMap.set(taskId, parseDependsOn(content))
    }

    const { waves, error: topoError } = topoSortWaves(depMap)
    if (topoError) {
      console.error(`\n❌ Wave 重排失败: ${topoError}`)
      throw new Error('planPostcheck: ' + topoError)
    }

    console.log('\n  📊 Wave 分组（基于 depends_on 拓扑排序）：')
    waves.forEach((wave, i) => {
      console.log(`     Wave ${i + 1}: ${wave.join(', ')}`)
    })

    // 比较 plan.md 现有 Wave 分组
    if (waves.length > 1 && taskFiles.length > 1) {
      const planPath = pJoin(changeDir, 'plan.md')
      if (existsSync(planPath)) {
        const planContent = readFileSync(planPath, 'utf8')
        if (/##\s*Wave\s+\d/i.test(planContent)) {
          const existingWaves = []
          const lines = planContent.split('\n')
          let currentWaveTasks = null
          for (const line of lines) {
            const wm = line.match(/^#+\s*Wave\s+(\d+)/i)
            if (wm) {
              if (currentWaveTasks) existingWaves.push(currentWaveTasks)
              currentWaveTasks = []
              continue
            }
            // 非 Wave 标题行（## 自检 等）退出当前 Wave 段，避免自检 checkbox
            // 被混入 task 列表导致 Wave 结构比对误判。
            if (/^#+\s/.test(line)) {
              if (currentWaveTasks) existingWaves.push(currentWaveTasks)
              currentWaveTasks = null
              continue
            }
            const tm = line.match(/^[-*]\s*\[[ x]\]\s*task-(\d+)/i)
            if (tm && currentWaveTasks) {
              currentWaveTasks.push(`task-${tm[1]}`)
            }
          }
          if (currentWaveTasks) existingWaves.push(currentWaveTasks)

          const sameStructure = waves.length === existingWaves.length &&
            waves.every((w, i) => {
              const a = [...w].sort().join(',')
              const b = [...(existingWaves[i] || [])].sort().join(',')
              return a === b
            })

          if (sameStructure) {
            console.log('  ✅ Wave 分组与拓扑排序一致，无需更新 plan.md')
          } else {
            console.log('  ⚠️  Wave 分组与拓扑排序不一致，建议手动调整 plan.md')
            console.log('     拓扑排序建议的 Wave 分组见上方')
          }
        }
      }
    }
  }

  // ── 3. 产物确认 ──
  const artifacts = validatePlanArtifacts(changeDir)
  if (!artifacts.ok) {
    for (const err of artifacts.errors) console.error(`❌ ${err}`)
    throw new Error('planPostcheck: artifact validation failed')
  }
  console.log('\n  ✅ plan.md 存在')

  if (artifacts.taskCount > 0) {
    console.log(`  ✅ tasks/ 目录有 ${artifacts.taskCount} 个 TaskCard 文件`)
  }

  console.log('\n  ✅ Plan postcheck 完成')
}
