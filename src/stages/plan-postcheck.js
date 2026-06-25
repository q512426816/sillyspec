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
import { existsSync, readFileSync, readdirSync } from 'fs'
import { join as pJoin } from 'path'

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
function parseAllowedPaths(content) {
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
  return /##\s*验收标准/.test(content) || /##\s*Acceptance/.test(content)
}

/**
 * 检查 task-NN.md 是否包含 TDD/验证步骤
 * @param {string} content
 * @returns {boolean}
 */
function hasTddOrVerify(content) {
  return /##\s*TDD/.test(content) || /##\s*验证/.test(content) || /##\s*Verify/.test(content)
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
      errors.push(`${taskId} (${file}): 缺少 allowed_paths`)
    }
    if (!hasAcceptance) {
      errors.push(`${taskId} (${file}): 缺少「验收标准」章节`)
    }
    if (!hasTdd) {
      warnings.push(`${taskId} (${file}): 缺少 TDD/验证步骤章节`)
    }

    for (const p of allowedPaths) {
      if (!pathOwners.has(p)) pathOwners.set(p, [])
      pathOwners.get(p).push(taskId)
    }
  }

  // 路径冲突
  for (const [p, owners] of pathOwners) {
    if (owners.length > 1) {
      warnings.push(`路径 ${p} 被 ${owners.length} 个 task 修改: ${owners.join(', ')}（确认是否为有意共享）`)
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
 * @param {{ cwd: string, specRoot?: string, resolveChangeDir: Function }} context
 * @throws {Error} 校验失败时抛出
 */
export async function executePlanPostcheck(context) {
  const { cwd, specRoot, resolveChangeDir } = context

  const specDir = specRoot || pJoin(cwd, '.sillyspec')
  const changesDir = pJoin(specDir, 'changes')
  if (!existsSync(changesDir)) {
    console.warn('  ⚠️ 未找到 changes 目录，跳过 postcheck')
    return
  }

  // 找到当前变更目录
  const progressPath = pJoin(specDir, '.runtime', 'progress.json')
  let changeDir = null
  if (existsSync(progressPath)) {
    const progress = JSON.parse(readFileSync(progressPath, 'utf8'))
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
    console.log(`  ✅ tasks/ 目录有 ${artifacts.taskCount} 个蓝图文件`)
  }

  console.log('\n  ✅ Plan postcheck 完成')
}
