/**
 * SillySpec Task Review Gate — execute 阶段任务级评审校验
 *
 * execute 阶段每个 task 完成后，controller 必须写入 review.json。
 * execute --done 时 CLI 硬校验：缺失 review 或 verdict 不通过则阻断。
 *
 * 目录结构：
 *   .sillyspec/.runtime/execute-runs/<runId>/tasks/<taskId>/review.json
 */

import { existsSync, readFileSync, mkdirSync, writeFileSync, readdirSync } from 'fs'
import { join, resolve } from 'path'
import { execFileSync } from 'child_process'

// ── review.json schema version ──
export const REVIEW_SCHEMA_VERSION = 1

// ── 合法 verdict 枚举 ──
export const VALID_VERDICTS = ['pass', 'fail', 'cannot_verify']

/**
 * 解析 plan.md 中的 task 列表
 * @param {string} planContent - plan.md 文件内容
 * @returns {string[]} task id 列表，如 ['task-01', 'task-02']
 */
export function parseTaskIdsFromPlan(planContent) {
  if (!planContent) return []
  const ids = new Set()
  const re = /^\s*[-*]\s*\[[ x]\]\s*task-(\d+)/gim
  for (const m of planContent.matchAll(re)) {
    ids.add(`task-${m[1].padStart(2, '0')}`)
  }
  return [...ids].sort()
}

/**
 * 校验单个 review.json 文件
 * @param {object} review - 解析后的 JSON 对象
 * @returns {{ ok: boolean, errors: string[] }}
 */
export function validateReviewSchema(review) {
  const errors = []
  if (!review || typeof review !== 'object') {
    errors.push('review.json 不是有效 JSON 对象')
    return { ok: false, errors }
  }

  if (review.schemaVersion !== REVIEW_SCHEMA_VERSION) {
    errors.push(`schemaVersion 应为 ${REVIEW_SCHEMA_VERSION}，实际为 ${review.schemaVersion}`)
  }

  if (!review.task || typeof review.task !== 'string') {
    errors.push('缺少 task 字段（应为 "task-XX" 格式）')
  }

  if (!VALID_VERDICTS.includes(review.specVerdict)) {
    errors.push(`specVerdict 无效：${review.specVerdict}（应为 ${VALID_VERDICTS.join('/')})`)
  }

  if (!VALID_VERDICTS.includes(review.qualityVerdict)) {
    errors.push(`qualityVerdict 无效：${review.qualityVerdict}（应为 ${VALID_VERDICTS.join('/')})`)
  }

  // cannot_verify 必须提供 requiredEvidence
  if (review.specVerdict === 'cannot_verify' || review.qualityVerdict === 'cannot_verify') {
    if (!Array.isArray(review.requiredEvidence) || review.requiredEvidence.length === 0) {
      errors.push('cannot_verify 的 verdict 必须提供非空的 requiredEvidence 数组')
    }
  }

  // base/head 非空检查
  if (!review.base || typeof review.base !== 'string') {
    errors.push('缺少 base 字段（git commit hash）')
  }
  if (!review.head || typeof review.head !== 'string') {
    errors.push('缺少 head 字段（git commit hash）')
  }

  return { ok: errors.length === 0, errors }
}

/**
 * 读取单个 task 的 review.json
 * @param {string} reviewPath - review.json 文件路径
 * @returns {{ ok: boolean, review: object|null, errors: string[] }}
 */
export function readReview(reviewPath) {
  if (!existsSync(reviewPath)) {
    return { ok: false, review: null, errors: ['review.json 不存在'] }
  }

  let raw
  try {
    raw = readFileSync(reviewPath, 'utf8')
  } catch (e) {
    return { ok: false, review: null, parseError: true, errors: [`review.json 读取失败: ${e.message}`] }
  }

  let parsed
  try {
    parsed = JSON.parse(raw)
  } catch (e) {
    // 文件存在但 JSON 非法：review 设为 null 但标记 parseError=true
    return { ok: false, review: null, parseError: true, errors: [`review.json 解析失败: ${e.message}`] }
  }

  const schemaResult = validateReviewSchema(parsed)
  if (!schemaResult.ok) {
    return { ok: false, review: parsed, schemaError: true, errors: schemaResult.errors }
  }

  return { ok: true, review: parsed, errors: [] }
}

/**
 * execute --done 时的 task review 总校验
 *
 * 规则：
 *   - 每个 plan task 必须有 review.json
 *   - specVerdict 或 qualityVerdict 为 fail → 整体 fail
 *   - specVerdict 或 qualityVerdict 为 cannot_verify → warning（requiredEvidence 非空）
 *   - cannot_verify + requiredEvidence 为空 → fail（agent 逃避判断）
 *   - cannot_verify 的 requiredEvidence 汇总到 requiredEvidence 字段，供 verify 阶段消费
 *
 * @param {object} opts
 * @param {string} opts.planContent - plan.md 内容
 * @param {string} opts.runtimeRoot - .sillyspec/.runtime 的绝对路径
 * @param {string} opts.executeRunId - execute run id（如 'exec-2026-06-23-131400'）
 * @param {boolean} [opts.allowCannotVerify=true] - 是否允许 cannot_verify（默认允许，给 warning）
 * @returns {{ ok: boolean, errors: string[], warnings: string[], requiredEvidence: Array<{task: string, verdict: string, evidence: string[]}> }}
 */
/**
 * 读取 task-XX.md frontmatter，判断是否声明 low_risk: true（type-only/机械迁移等低逻辑风险）。
 * 声明 low_risk 的 task 缺 review.json 时只 warning 不 error（B2：免逐个评审仪式）。
 */
function isTaskLowRisk(changeDir, taskId) {
  if (!changeDir) return false
  const taskFile = join(changeDir, 'tasks', `${taskId}.md`)
  if (!existsSync(taskFile)) return false
  try {
    const content = readFileSync(taskFile, 'utf8')
    const fm = content.match(/^---\n([\s\S]*?)\n---/)
    if (!fm) return false
    return /^low_risk:\s*true\s*$/im.test(fm[1])
  } catch {
    return false
  }
}

export function validateTaskReviews(opts) {
  const { planContent, runtimeRoot, executeRunId, allowCannotVerify = true, changeDir = null, gitDir = null } = opts

  const taskIds = parseTaskIdsFromPlan(planContent)

  // 如果 plan 里没有 task，跳过校验（向后兼容）
  if (taskIds.length === 0) {
    return { ok: true, errors: [], warnings: [], requiredEvidence: [] }
  }

  const errors = []
  const warnings = []
  const requiredEvidence = []

  for (const taskId of taskIds) {
    const reviewDir = join(runtimeRoot, 'execute-runs', executeRunId, 'tasks', taskId)
    const reviewPath = join(reviewDir, 'review.json')

    const result = readReview(reviewPath)

    if (!result.ok) {
      if (result.parseError) {
        // review.json 存在但 JSON 非法
        errors.push(`${taskId}: review.json 解析失败 — ${result.errors.join('; ')}`)
      } else if (result.schemaError) {
        // review.json 存在且 JSON 合法，但 schema 校验失败
        errors.push(`${taskId}: review.json 校验失败 — ${result.errors.join('; ')}`)
      } else {
        // review.json 不存在：声明 low_risk 的 task 豁免（B2：type-only/机械迁移免逐个评审）
        if (isTaskLowRisk(changeDir, taskId)) {
          warnings.push(`${taskId}: 缺少 review.json — task 声明 low_risk: true，已豁免评审（type-only/机械迁移）`)
        } else {
          errors.push(`${taskId}: 缺少 review.json — task 未经过评审（期望路径：${reviewPath}，execute run ID: ${executeRunId}）`)
        }
      }
      continue
    }

    const review = result.review

    // 检查 review.task 是否与 plan 中的 taskId 一致
    if (review.task && review.task !== taskId) {
      errors.push(`${taskId}: review.json 中的 task 字段为 "${review.task}"，与 plan 不一致（应为 "${taskId}"）— agent 可能复制模板未修改`)
      continue
    }

    // 检查 fail verdict
    if (review.specVerdict === 'fail' || review.qualityVerdict === 'fail') {
      errors.push(`${taskId}: review 未通过 — spec: ${review.specVerdict}, quality: ${review.qualityVerdict}`)
      if (review.reviewerNotes) {
        errors.push(`${taskId}: ${review.reviewerNotes}`)
      }
      continue
    }

    // ── git 真实性交叉校验：base/head 必须是真实 commit，diff 不能为空 ──
    if (gitDir) {
      const evidence = verifyReviewGitEvidence(review, gitDir)
      for (const w of evidence.warnings) warnings.push(`${taskId}: ${w}`)
      if (!evidence.ok) {
        for (const err of evidence.errors) errors.push(`${taskId}: ${err}`)
        continue
      }
      if (evidence.emptyDiff) {
        if (isTaskLowRisk(changeDir, taskId)) {
          warnings.push(`${taskId}: base..head 无代码变更（task 声明 low_risk: true，不阻断）`)
        } else {
          errors.push(`${taskId}: base..head（${review.base.slice(0, 8)}..${review.head.slice(0, 8)}）无任何代码变更 — 评审了一个零改动的任务，review 疑似伪造`)
          continue
        }
      }
    }

    // 检查 cannot_verify
    if (review.specVerdict === 'cannot_verify' || review.qualityVerdict === 'cannot_verify') {
      if (!allowCannotVerify) {
        errors.push(`${taskId}: cannot_verify 不被允许 — 必须提供评审结果`)
        continue
      }

      if (review.requiredEvidence && review.requiredEvidence.length > 0) {
        const verdicts = []
        if (review.specVerdict === 'cannot_verify') verdicts.push('spec')
        if (review.qualityVerdict === 'cannot_verify') verdicts.push('quality')
        warnings.push(`${taskId}: ${verdicts.join('+')}=cannot_verify，requiredEvidence 必须在 verify 阶段满足`)
        requiredEvidence.push({
          task: taskId,
          verdict: verdicts.join('+'),
          evidence: review.requiredEvidence,
        })
      } else {
        // cannot_verify + 空 requiredEvidence = agent 逃避判断
        errors.push(`${taskId}: cannot_verify 但 requiredEvidence 为空 — 这是无效评审`)
      }
    }
  }

  // 额外检查：扫描 execute-runs/<runId>/tasks/ 下是否有 plan 里没有的 task review
  // （agent 可能写错了 task id）
  try {
    const tasksDir = join(runtimeRoot, 'execute-runs', executeRunId, 'tasks')
    if (existsSync(tasksDir)) {
      const taskDirs = readdirSync(tasksDir, { withFileTypes: true })
        .filter(e => e.isDirectory())
        .map(e => e.name)
      const taskIdSet = new Set(taskIds)
      for (const dirName of taskDirs) {
        if (!taskIdSet.has(dirName) && existsSync(join(tasksDir, dirName, 'review.json'))) {
          warnings.push(`${dirName}: 存在 review.json 但不在 plan.md 的 task 列表中（可能是多余文件）`)
        }
      }
    }
  } catch (e) {
    warnings.push(`task review extra-check 异常: ${e.message}`)
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    requiredEvidence,
  }
}

// ── Git 真实性交叉校验 ──

function runGit(gitDir, args) {
  return execFileSync('git', args, {
    cwd: gitDir,
    encoding: 'utf8',
    timeout: 15000,
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim()
}

/**
 * 校验 review.json 的 base/head 是否指向真实 git 提交，且 diff 非空。
 *
 * 历史漏洞：base/head 只做非空字符串检查，agent 可以填任意假 hash 批量伪造
 * review.json 通过 Task Review Gate。此函数用 git 做客观交叉校验：
 *   1. base/head 必须是仓库中可解析的真实 commit
 *   2. base..head 的 diff 不能为空（评审一个零改动的"任务"无意义）
 *   3. review.changedFiles（如提供）必须与实际 diff 文件有交集
 *
 * git 环境不可用（非 git 仓库 / git 缺失）时返回 unavailable，由调用方降级为
 * warning——不因环境问题误杀，但记录在输出中。
 *
 * @param {object} review - 已通过 schema 校验的 review 对象
 * @param {string} gitDir - 执行 git 命令的目录（worktree 优先，回退主仓库）
 * @returns {{ ok: boolean, emptyDiff: boolean, errors: string[], warnings: string[], unavailable: boolean }}
 */
export function verifyReviewGitEvidence(review, gitDir) {
  const errors = []
  const warnings = []

  // git 环境探测：失败即 unavailable，交由调用方降级
  try {
    runGit(gitDir, ['rev-parse', '--git-dir'])
  } catch (e) {
    return {
      ok: true,
      emptyDiff: false,
      errors: [],
      warnings: [`git 环境不可用（${gitDir}），跳过 review 真实性交叉校验: ${e.message?.split('\n')[0] || e.message}`],
      unavailable: true,
    }
  }

  for (const field of ['base', 'head']) {
    const hash = review[field]
    try {
      runGit(gitDir, ['rev-parse', '--verify', '--quiet', `${hash}^{commit}`])
    } catch {
      errors.push(`${field} "${hash}" 不是仓库中的真实 commit — review.json 疑似伪造`)
    }
  }
  if (errors.length > 0) {
    return { ok: false, emptyDiff: false, errors, warnings, unavailable: false }
  }

  let diffFiles = []
  try {
    const out = runGit(gitDir, ['diff', '--name-only', `${review.base}..${review.head}`])
    diffFiles = out ? out.split('\n').filter(Boolean) : []
  } catch (e) {
    warnings.push(`git diff ${review.base}..${review.head} 执行失败，跳过 diff 校验: ${e.message?.split('\n')[0] || e.message}`)
    return { ok: true, emptyDiff: false, errors, warnings, unavailable: false }
  }

  const emptyDiff = diffFiles.length === 0

  // changedFiles 交叉比对：完全不相交 = review 描述的改动与实际 diff 无关
  if (!emptyDiff && Array.isArray(review.changedFiles) && review.changedFiles.length > 0) {
    const normalize = (p) => String(p).replace(/^\.\//, '')
    const diffSet = new Set(diffFiles.map(normalize))
    const hasOverlap = review.changedFiles.some(f => {
      const nf = normalize(f)
      // 兼容 review 写相对/部分路径：前后缀匹配即可
      return diffSet.has(nf) || diffFiles.some(d => d.endsWith(nf) || nf.endsWith(d))
    })
    if (!hasOverlap) {
      errors.push(`changedFiles 与实际 git diff（${review.base.slice(0, 8)}..${review.head.slice(0, 8)}，${diffFiles.length} 个文件）完全不相交 — review 内容与代码变更无关`)
    }
  }

  return { ok: errors.length === 0, emptyDiff, errors, warnings, unavailable: false }
}

/**
 * 将 cannot_verify 的 requiredEvidence 写入 change 目录
 * 供 verify 阶段消费
 *
 * @param {string} changeDir - 变更目录（.sillyspec/changes/<name>）
 * @param {Array<{task: string, verdict: string, evidence: string[]}>} requiredEvidence
 * @returns {string|null} 写入的文件路径，null 表示无需写入
 */
export function writeVerifyRequiredEvidence(changeDir, requiredEvidence) {
  if (!requiredEvidence || requiredEvidence.length === 0) return null

  const filePath = join(changeDir, 'verify-required-evidence.json')
  const data = {
    generatedAt: new Date().toISOString(),
    schemaVersion: 1,
    items: requiredEvidence,
  }

  mkdirSync(changeDir, { recursive: true })
  writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n')

  return filePath
}

/**
 * 生成 execute run id
 * @returns {string} 如 'exec-2026-06-23-131400'
 */
export function generateExecuteRunId() {
  const now = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `exec-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
}

/**
 * 获取当前（或最新）execute run id
 * 从 runtime 目录下查找 execute-runs/ 子目录
 *
 * @param {string} runtimeRoot - .sillyspec/.runtime 路径
 * @returns {string|null} 最新 run id，null 表示无任何 run
 */
/**
 * 获取当前 execute run id
 * 优先从 current-execute-run-id 标记文件读取（execute 阶段启动时写入），
 * fallback 到 execute-runs/ 下最新的 exec- 前缀目录。
 *
 * @param {string} runtimeRoot - .sillyspec/.runtime 路径
 * @returns {string|null} 当前 run id，null 表示无任何 run
 */
export function getLatestExecuteRunId(runtimeRoot) {
  // 优先读标记文件（execute 阶段启动时由 run.js 写入，生命周期内不变）
  const markerPath = join(runtimeRoot, 'current-execute-run-id')
  try {
    if (existsSync(markerPath)) {
      const content = readFileSync(markerPath, 'utf8').trim()
      if (content) return content
    }
  } catch {}

  // fallback：扫描 execute-runs/ 目录
  const runsDir = join(runtimeRoot, 'execute-runs')
  if (!existsSync(runsDir)) return null

  try {
    const entries = readdirSync(runsDir, { withFileTypes: true })
      .filter(e => e.isDirectory() && e.name.startsWith('exec-'))
      .map(e => e.name)
      .sort()
      .reverse()
    return entries[0] || null
  } catch {
    return null
  }
}

/**
 * 确保 task review 目录存在
 * @param {string} runtimeRoot
 * @param {string} executeRunId
 * @param {string} taskId
 * @returns {string} task review 目录路径
 */
export function ensureTaskReviewDir(runtimeRoot, executeRunId, taskId) {
  const dir = join(runtimeRoot, 'execute-runs', executeRunId, 'tasks', taskId)
  mkdirSync(dir, { recursive: true })
  return dir
}

/**
 * 打印校验结果
 * @param {{ ok: boolean, errors: string[], warnings: string[], requiredEvidence: Array }} result
 */
export function printReviewResult(result, context = {}) {
  if (result.ok && result.warnings.length === 0) {
    console.log('\n✅ Task Review Gate — 所有任务评审通过')
    return
  }

  if (result.errors.length > 0) {
    console.error('\n🚫 Task Review Gate — FAILED')
    for (const err of result.errors) {
      console.error(`   - ${err}`)
    }
    const hint = context.runtimeRoot && context.executeRunId
      ? `期望路径：${context.runtimeRoot}/execute-runs/${context.executeRunId}/tasks/<task-XX>/review.json`
      : '为缺失/失败的任务补充 review.json'
    console.error(`\n   提示：${hint}，然后重新 --done`)
  }

  if (result.warnings.length > 0) {
    console.warn('\n⚠️ Task Review Gate — WARNING')
    for (const w of result.warnings) {
      console.warn(`   - ${w}`)
    }
    console.warn('\n   cannot_verify 的 requiredEvidence 将在 verify 阶段校验')
  }
}
