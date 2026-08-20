/**
 * SillySpec Task Review Gate — execute 阶段任务级评审校验
 *
 * execute 阶段每个 task 完成后，controller 必须写入 review.json。
 * execute --done 时 CLI 硬校验：缺失 review 或 verdict 不通过则阻断。
 *
 * 目录结构：
 *   .sillyspec/.runtime/execute-runs/<runId>/tasks/<taskId>/review.json
 */

import { existsSync, readFileSync, mkdirSync, writeFileSync, readdirSync, statSync } from 'fs'
import { join, resolve } from 'path'
import { git } from './git-helper.js'
import { pathMatches } from './change-list.js'
import { parseAllowedPaths, parseRepo, parseBaseCommit, parseHeadCommit } from './stages/plan-postcheck.js'
import { resolveVerifyChangedFiles } from './verify-postcheck.js'
import { WorktreeManager } from './worktree.js'
import { resolveRuntimeRoot } from './run/shared.js'

// ── review.json schema version ──
//
// design §7.4 / R-07：task-review 的 review.json schemaVersion 1→2（新增可选 repo 字段），
// 旧 v1（无 repo）向后兼容视 'main'，不阻断既有 change archive。
//
// 关于常量与"1→2"：REVIEW_SCHEMA_VERSION 常量被 stage-review.js（文档型阶段评审）共享——
// stage-review.test.mjs:358 + register.test.mjs:40 断言其值 === 1，且 stage-review.js 不在本次
// 变更的 allowed_paths 内。两个 schema（task code-review / stage doc-review）逻辑独立，但历史共享
// 同一常量。本期保持 REVIEW_SCHEMA_VERSION=1 作 stage-review 写侧默认值（不破坏 stage-review），
// 同时用 REVIEW_SCHEMA_VERSIONS_ACCEPTED=[1,2] 表达"读侧接受两版"——validateReviewSchema 兼容 v1/v2，
// 跨仓 task 写 review.json 可用 v2 带 repo 字段，单仓/旧 change 仍用 v1。后续可拆分 stage-review 专用
// 常量，本期遵循 allowed_paths 约束不扩散到 stage-review.js。
export const REVIEW_SCHEMA_VERSION = 1
const REVIEW_SCHEMA_VERSIONS_ACCEPTED = [1, 2]
// repo 缺省值（review.repo / task 卡 repo 缺省时统一按 'main' 处理）。design §7.2 / §7.4。
const DEFAULT_REPO_KEY = 'main'

/**
 * 规范化 review.repo / task 卡 repo 字段为有效 repoKey。
 * 缺省 / 非字符串 / 空串 → 'main'（向后兼容旧 v1 review + 无 repo 声明的单仓 task）。
 * @param {any} repo
 * @returns {string}
 */
export function normalizeRepoKey(repo) {
  if (typeof repo !== 'string' || repo.trim() === '') return DEFAULT_REPO_KEY
  return repo.trim()
}

// ── 合法 verdict 枚举 ──
export const VALID_VERDICTS = ['pass', 'fail', 'cannot_verify']

/**
 * 解析 plan.md 中的 task 列表
 * @param {string} planContent - plan.md 文件内容
 * @returns {string[]} task id 列表，如 ['task-01', 'task-02']
 */
function parseTaskIdsFromPlan(planContent) {
  if (!planContent) return []
  const ids = new Set()
  const re = /^\s*[-*]\s*\[[ x]\]\s*task-(\d+)/gim
  for (const m of planContent.matchAll(re)) {
    ids.add(`task-${m[1].padStart(2, '0')}`)
  }
  return [...ids].sort()
}

/**
 * 统计 plan.md/tasks.md 中 task-NN checkbox 的勾选情况（降级口径）。
 * 与 progress.js readPlanCheckboxStatus 同语义，但纯函数、无类依赖，供 summarizeTaskCompletion 降级复用。
 */
function countPlanCheckboxes(planContent) {
  const re = /^\s*[-*]\s+\[([ xX])\]\s+task-\d+/gm
  let total = 0
  let checked = 0
  let m
  while ((m = re.exec(planContent)) !== null) {
    total++
    if (m[1] === 'x' || m[1] === 'X') checked++
  }
  return { total, checked }
}

/**
 * 汇总变更的任务完成度 —— archive Step1「任务完成度检查」的客观真相源。
 *
 * 以 execute 阶段产出的 review.json verdict 为准（task-NN 的 specVerdict + qualityVerdict 均 ≠ fail
 * 视为完成），而非 plan.md checkbox。原因：plan.md checkbox 依赖 autoCheckPlanFromReviews 回填，
 * 而 runId marker / review.json 缺失时回填静默 no-op，checkbox 会停在未勾态，导致完成度失真
 * （archive 误判「全未完成」）。review.json 是 task 级客观 verdict，不受回填断裂影响。
 *
 * runId 解析：优先 current-execute-run-id-<changeName> marker（最新一次 execute run）；
 * marker 缺失则扫描 execute-runs/ 下子目录、取 mtime 最新的，尽力定位。
 *
 * fail-safe：无 plan / 无 runId / review 全缺等任何异常，降级到 plan.md checkbox 统计 + 标注 source，
 * 绝不抛错、绝不阻断 archive（最坏退回「数 checkbox」现状，不比修复前差）。
 *
 * @param {{ changeDir: string, runtimeRoot: string, changeName: string }} opts
 * @returns {{ source: string, total: number, completed: number, pending: Array<{id:string,reason:string}>, report: string }}
 *   source: 'review.json'（客观源可用）/ 'plan-checkbox-fallback'（降级）/ 'no-plan' / 'no-tasks'
 *   report: 人类可读报告，供 prompt {TASK_COMPLETION_REPORT} 注入
 */
export function summarizeTaskCompletion({ changeDir, runtimeRoot, changeName }) {
  const noPlan = {
    source: 'no-plan', total: 0, completed: 0, pending: [],
    report: '⚠️ 未找到 plan.md/tasks.md，无法计算任务完成度。请确认变更目录完整。'
  }
  if (!changeDir) return noPlan

  // 2026-08-20-task-truth-unify：任务清单唯一真相在 tasks.md，优先读注册表；plan.md 回退
  // （旧归档变更兼容读侧——新契约 plan.md 为纯 ID 引用行，无 checkbox 可解析）
  const planPath = join(changeDir, 'plan.md')
  const tasksPath = join(changeDir, 'tasks.md')
  let planContent = null
  if (existsSync(tasksPath)) planContent = readFileSync(tasksPath, 'utf8')
  else if (existsSync(planPath)) planContent = readFileSync(planPath, 'utf8')
  else return noPlan

  const taskIds = parseTaskIdsFromPlan(planContent)
  if (taskIds.length === 0) {
    return { source: 'no-tasks', total: 0, completed: 0, pending: [],
      report: '⚠️ tasks.md 未解析出任何 task-NN 条目（任务注册表可能未按规范写 checkbox 列表）。' }
  }

  // runId 解析（坑 worktree-cleanup-marker-chain 根治）：归属化解析 resolveExecuteRunForChange——
  // marker 优先但校验覆盖度；marker 断裂（worktree cleanup / 归档清理 / 并行误删）时按 change 戳
  // 精确归属，旧 run 退覆盖度启发。不再盲目 mtime 最新（曾把其他变更的 run 错配给本变更 →
  // 全部 task 误报「review.json 缺失」→ 手工回填 7 份实际存在于正确 run 里的 review）。
  const resolved = resolveExecuteRunForChange({ runtimeRoot, changeName, taskIds })
  const runId = resolved ? resolved.runId : null
  if (resolved && resolved.relocated) {
    console.warn(`[sillyspec] execute run 归属修正：marker 指向的 run 对变更 ${changeName} 零覆盖，改用 ${resolved.origin === 'stamp' ? 'change 戳' : '覆盖度'}命中的 run ${runId}（真实 review 所在）`)
  }

  // 无归属 run → 降级 plan.md checkbox 统计；报告区分「无法归属」与「没跑过 execute」，
  // 避免把定位失败误导成「review 全缺、需手工回填」
  if (!runId) {
    const { total, checked } = countPlanCheckboxes(planContent)
    let runsNote = '无 execute-runs 目录（本变更未跑过 execute？）'
    try {
      const runsDir = join(runtimeRoot, 'execute-runs')
      if (existsSync(runsDir)) {
        const n = readdirSync(runsDir).filter(e => { try { return statSync(join(runsDir, e)).isDirectory() } catch { return false } }).length
        if (n > 0) runsNote = `execute-runs/ 有 ${n} 个 run 但无一能归属到本变更（无 change 戳且零覆盖——marker 链断裂且 review 可能从未生成）`
      }
    } catch {}
    return {
      source: 'plan-checkbox-fallback', total, completed: checked,
      pending: taskIds.slice(0, Math.max(0, total - checked)).map(id => ({ id, reason: 'checkbox 未勾（降级口径）' })),
      report:
        '⚠️ 客观源不可用（execute run 无法归属到本变更：' + runsNote + '）→ 降级用 plan.md checkbox。\n' +
        `- 总任务：${total}\n- plan.md 已勾选：${checked}\n` +
        '⚠️ checkbox 可能因 autoCheckPlanFromReviews 回填断裂而失真，务必交叉核对 .runtime/execute-runs/*/tasks/task-NN/review.json 的 verdict 再下结论。'
    }
  }

  // 有 runId → 读 review.json verdict；cannot_verify 草稿单列（不是真正复核，归档前应可见）
  const completed = []
  const pending = []
  let cannotVerifyCount = 0
  for (const id of taskIds) {
    const reviewPath = join(runtimeRoot, 'execute-runs', runId, 'tasks', id, 'review.json')
    const r = readReview(reviewPath)
    if (r.ok && r.review && r.review.specVerdict !== 'fail' && r.review.qualityVerdict !== 'fail') {
      completed.push(id)
      if (r.review.specVerdict === 'cannot_verify' || r.review.qualityVerdict === 'cannot_verify') cannotVerifyCount++
    } else if (r.ok && r.review) {
      pending.push({ id, reason: `verdict 未通过（spec=${r.review.specVerdict}, quality=${r.review.qualityVerdict}）` })
    } else {
      pending.push({ id, reason: 'review.json 缺失（task 未走完 execute 评审）' })
    }
  }

  const pendingLines = pending.length > 0
    ? pending.map(p => `  - ${p.id}: ${p.reason}`).join('\n')
    : '  （无）'
  const draftLines = cannotVerifyCount > 0
    ? `- cannot_verify 草稿（未真正复核）: ${cannotVerifyCount}\n` +
      '  ⚠️ 这些 task 的 review 是 cannot_verify（含自动草稿兜底）而非 pass——归档前应确认 verify 阶段已兑现其 requiredEvidence，否则派独立子代理对照 task brief + git diff 补真实复核，勿静默放行\n'
    : ''
  return {
    source: 'review.json', total: taskIds.length, completed: completed.length, pending, cannotVerify: cannotVerifyCount, runId,
    report:
      `客观任务完成度（真相源 = review.json verdict，runId=${runId}${resolved.origin !== 'marker' ? `，归属=${resolved.origin}` : ''}）:\n` +
      `- 总任务：${taskIds.length}\n` +
      `- 已通过（spec + quality verdict 均非 fail）：${completed.length}\n` +
      draftLines +
      `- 未通过 / 缺失：${pending.length}\n` +
      `- 未完成列表:\n${pendingLines}\n` +
      '注：以 review.json verdict 为准；plan.md checkbox 仅作显示态（回填断裂时会与客观 verdict 不一致，以下方客观点为准）。'
  }
}

/**
 * 校验单个 review.json 文件
 *
 * schema 版本（design §7.4 / R-07）：接受 v1（无 repo，单仓向后兼容）+ v2（新增可选 repo 字段，
 * 跨仓 task 标记 repo: <key>）。repo 缺省 / 非字符串 → 视 'main'（normalizeRepoKey），不阻断。
 * repo 的真实存在性（local.yaml repos 注册）由 MultiRepoContext 约束② fail-closed 兜底，schema 层
 * 只做"非字符串时不阻断"的宽松类型校验（review.json 是 agent 手写产物，宽松避免误杀）。
 *
 * @param {object} review - 解析后的 JSON 对象
 * @returns {{ ok: boolean, errors: string[] }}
 */
export function validateReviewSchema(review) {
  const errors = []
  if (!review || typeof review !== 'object') {
    errors.push('review.json 不是有效 JSON 对象')
    return { ok: false, errors }
  }

  if (!REVIEW_SCHEMA_VERSIONS_ACCEPTED.includes(review.schemaVersion)) {
    errors.push(`schemaVersion 应为 ${REVIEW_SCHEMA_VERSIONS_ACCEPTED.join(' 或 ')}，实际为 ${review.schemaVersion}`)
  }

  if (!review.task || typeof review.task !== 'string') {
    errors.push('缺少 task 字段（应为 "task-XX" 格式）')
  }

  // repo（可选，v2 新增）：类型宽松校验。非字符串 / 空串 → 视 'main'，不阻断 schema。
  // 跨仓 repo 的注册存在性由 MultiRepoContext 构造时 fail-closed 校验（约束②）。
  if (review.repo !== undefined && typeof review.repo !== 'string') {
    errors.push(`repo 字段（若提供）应为字符串，实际类型为 ${typeof review.repo}`)
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
 * 增强 JSON.parse 失败的定位：从 V8 的 "at position N" 算出 line:col + 出错行上下文，
 * 并对常见非法转义（正则的反斜杠序列误入 JSON 字符串）给针对性修复指引。
 * @param {string} raw  原始文件内容
 * @param {string} message  V8 抛出的错误消息
 * @returns {string} 增强后的可读消息
 */
export function enrichJsonParseError(raw, message) {
  const m = /at position (\d+)/.exec(message)
  if (!m) return message
  const pos = Math.min(Number(m[1]), raw.length)
  let line = 1, col = 1
  for (let i = 0; i < pos; i++) {
    if (raw[i] === '\n') { line++; col = 1 } else { col++ }
  }
  const lineStart = raw.lastIndexOf('\n', pos - 1) + 1
  const nlAfter = raw.indexOf('\n', pos)
  const lineEnd = nlAfter === -1 ? raw.length : nlAfter
  const snippet = raw.slice(lineStart, lineEnd)
  const caret = ' '.repeat(Math.max(0, col - 1)) + '^'
  // 单行注释内的反斜杠序列是纯文本，不触发块注释终止；正则字面量在函数体内正常解析。
  let out = message + '\n  → 第 ' + line + ' 行第 ' + col + ' 列：\n    ' + snippet + '\n    ' + caret
  // 先移除合法的成对反斜杠（JSON 中 \\ 表字面 \），否则 "\\z" 会被逐字符正则误判为 "\z" 非法转义
  const hasBadEscape = message.includes('Bad escaped character') || /\\[^"\\/bfnrtu]/.test(snippet.replace(/\\\\/g, ''))
  if (hasBadEscape) {
    out += '\n  → 疑似正则转义（如 \\s \\d \\w）混入 JSON 字符串。修复：双写反斜杠（\\\\s），或用 JSON.stringify(obj) 重写 review.json。'
  }
  return out
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
    // 文件存在但 JSON 非法：review 设为 null 但标记 parseError=true，错误消息带行列定位 + 转义修复指引
    return { ok: false, review: null, parseError: true, errors: [`review.json 解析失败: ${enrichJsonParseError(raw, e.message)}`] }
  }

  const schemaResult = validateReviewSchema(parsed)
  if (!schemaResult.ok) {
    return { ok: false, review: parsed, schemaError: true, errors: schemaResult.errors }
  }

  return { ok: true, review: parsed, errors: [] }
}

/**
 * 校验 plan.md 里所有「已勾选 [x]」task 的 review.json 是否 schema 完整（坑 review-json-field-gap）。
 *
 * Task Review Gate（validateTaskReviews）只在 execute 整阶段完成时跑，单 task --done 不校验 →
 * 子代理勾了 checkbox 却漏写/漏字段 review.json，要到收尾才暴露，用户被迫事后批量补。本函数供
 * enforceReviewJsonGate 在每次 execute --done 调用：已勾 [x] = 声称完成 = 必有完整 review.json；
 * 未勾 task 不校验（还没做）。readReview 已区分 missing/parseError/schemaError，这里只聚合。
 *
 * @param {{ planContent: string, runtimeRoot: string, executeRunId: string }} opts
 * @returns {{ ok: boolean, failures: Array<{ taskId:string, reviewPath:string, kind:string, errors:string[] }> }}
 *   kind ∈ missing（review.json 不存在）/ parseError（JSON 坏）/ schemaError（字段缺）
 */
export function validateCheckedTaskReviews({ planContent, runtimeRoot, executeRunId }) {
  const failures = []
  const re = /^\s*[-*]\s*\[x\]\s*task-(\d+)/gim
  let m
  while ((m = re.exec(planContent)) !== null) {
    const taskId = `task-${m[1].padStart(2, '0')}`
    const reviewPath = join(runtimeRoot, 'execute-runs', executeRunId, 'tasks', taskId, 'review.json')
    const r = readReview(reviewPath)
    if (!r.ok) {
      const kind = r.parseError ? 'parseError' : (r.schemaError ? 'schemaError' : 'missing')
      failures.push({ taskId, reviewPath, kind, errors: r.errors })
    }
  }
  return { ok: failures.length === 0, failures }
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
 * @param {string} [opts.changeDir] - change 目录（读 task-NN.md frontmatter 判 low_risk）
 * @param {string} [opts.gitDir] - 主仓 git 工作目录（单仓 review 真实性校验 cwd；无 ctx 时用此）
 * @param {object} [opts.ctx] - MultiRepoContext 实例（D-013：缺省/null → 走 opts.gitDir 单仓零回归；
 *   有 ctx 时按 review.repo（缺省 'main'）从 ctx.resolve(repo).gitDir 取每条 review 的校验 cwd，
 *   跨仓 gitDir=跨仓仓根，使 base..head diff 在正确仓跑——design §6 task-review A1 行）
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
  const { planContent, runtimeRoot, executeRunId, allowCannotVerify = true, changeDir = null, gitDir = null, ctx = null } = opts

  const taskIds = parseTaskIdsFromPlan(planContent)

  // 如果 plan 里没有 task，跳过校验（向后兼容）
  if (taskIds.length === 0) {
    return { ok: true, errors: [], warnings: [], requiredEvidence: [] }
  }

  const errors = []
  const warnings = []
  const requiredEvidence = []
  // PERF-01：整个循环共享一份 git 结果缓存（同 gitDir 的探测/status、同 (base,head) 的
  // diff 在多 task 间高度重复；N task 从 5N 个 git 子进程降到 ~2+去重后数量）
  const evidenceCache = {}

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
    // D-013 + design §6 A1：有 ctx 时按 review.repo（缺省 'main'）切 gitDir——跨仓 review 的
    // base/head 是跨仓仓 commit，必须在跨仓仓根跑 rev-parse/diff，否则判伪造误杀。无 ctx 时退回
    // opts.gitDir（单仓零回归）。reviewGitDir 为 null 则跳过证据校验（与原逻辑一致）。
    let reviewGitDir = gitDir
    if (ctx) {
      const repoKey = normalizeRepoKey(review.repo)
      const entry = ctx.resolve(repoKey)
      if (entry && entry.gitDir) {
        reviewGitDir = entry.gitDir
      } else if (repoKey !== 'main') {
        // 跨仓 repo 在 ctx 中未注册 → 不应发生（MultiRepoContext 构造已 fail-closed 拦截未注册），
        // 防御性降级为 warning 提示，不阻断（review.json schema 已过，仓库解析交给 ctx 上游负责）。
        // 坑7 教训：此分支发生时后续主仓校验必报「疑似伪造」，文案须直接指向真实排查方向。
        warnings.push(`${taskId}: review.repo="${repoKey}" 在 MultiRepoContext 未解析到 entry，退回主仓 gitDir 校验——下方若报 commit 不真实/疑似伪造，先查 repo 声明（plan.md 内联块或 tasks/task-NN.md 的 repo:）与 local.yaml repos: 注册，非 review 伪造`)
      }
    }
    if (reviewGitDir) {
      const evidence = verifyReviewGitEvidence(review, reviewGitDir, evidenceCache)
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

// QUAL-01 收口：原为本地 execFileSync('git')（无 safe.directory、与 git-helper 口径分裂），
// 现走统一入口；抛错/trim 语义不变，timeout 15000 保留（rev-parse/diff 大仓余量）
function runGit(gitDir, args) {
  return git(gitDir, args, { timeout: 15000 })
}

// porcelain 状态行 → 变更文件路径（对齐 shared.js:343 parsePorcelainPath：`XY path`、引号包裹、
// rename `R old -> new` 取箭头后）。未 commit 的 working-tree 改动对账用。
function parsePorcelainFiles(statusOut) {
  const files = []
  for (const line of String(statusOut).split('\n')) {
    if (line.trim() === '') continue
    let p = line.slice(3).trim()
    if (p.length >= 2 && p.startsWith('"') && p.endsWith('"')) p = p.slice(1, -1).replace(/\\(.)/g, (_, c) => c)
    const arrow = p.indexOf(' -> ')
    if (arrow !== -1) p = p.slice(arrow + 4)
    if (p) files.push(p.replace(/\\/g, '/'))
  }
  return files
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
/**
 * @param {object} review - 已通过 schema 校验的 review 对象
 * @param {string} gitDir - 执行 git 命令的目录（worktree 优先，回退主仓库）
 * @param {object} [cache] - 进程内单次校验批的共享缓存（体检 PERF-01：N task × 5 个 git
 *   子进程去重——gitDir 探测与 status --porcelain 结果按 gitDir 恒同，commit 校验按
 *   (gitDir,hash)、diff 按 (gitDir,base,head) 在多 task 间高度重复。validateTaskReviews
 *   整个循环传同一份；不传则退化为逐次执行（单测/独立调用零回归）。缓存生命周期 =
 *   一次校验批：working-tree status 是快照语义，跨批复用会读到陈旧状态。
 * @returns {{ ok: boolean, emptyDiff: boolean, errors: string[], warnings: string[], unavailable: boolean }}
 */
export function verifyReviewGitEvidence(review, gitDir, cache = null) {
  const errors = []
  const warnings = []
  const c = cache || (cache = {})
  c.gitOk = c.gitOk || new Map()
  c.verified = c.verified || new Set()
  c.diffs = c.diffs || new Map()
  c.wtStatus = c.wtStatus || new Map()

  // git 环境探测：失败即 unavailable，交由调用方降级（同 gitDir 结果恒同，批内缓存）
  if (!c.gitOk.has(gitDir)) {
    try {
      runGit(gitDir, ['rev-parse', '--git-dir'])
      c.gitOk.set(gitDir, true)
    } catch (e) {
      c.gitOk.set(gitDir, false)
      return {
        ok: true,
        emptyDiff: false,
        errors: [],
        warnings: [`git 环境不可用（${gitDir}），跳过 review 真实性交叉校验: ${e.message?.split('\n')[0] || e.message}`],
        unavailable: true,
      }
    }
  } else if (c.gitOk.get(gitDir) === false) {
    return {
      ok: true,
      emptyDiff: false,
      errors: [],
      warnings: [`git 环境不可用（${gitDir}），跳过 review 真实性交叉校验（批内缓存判定）`],
      unavailable: true,
    }
  }

  for (const field of ['base', 'head']) {
    const hash = review[field]
    const vkey = `${gitDir}\u0000${hash}`
    if (c.verified.has(vkey)) continue
    try {
      runGit(gitDir, ['rev-parse', '--verify', '--quiet', `${hash}^{commit}`])
      c.verified.add(vkey)
    } catch {
      errors.push(`${field} "${hash}" 不是仓库中的真实 commit — review.json 疑似伪造`)
    }
  }
  if (errors.length > 0) {
    return { ok: false, emptyDiff: false, errors, warnings, unavailable: false }
  }

  let diffFiles = []
  const dkey = `${gitDir}\u0000${review.base}\u0000${review.head}`
  if (c.diffs.has(dkey)) {
    diffFiles = c.diffs.get(dkey)
  } else {
    try {
      const out = runGit(gitDir, ['diff', '--name-only', `${review.base}..${review.head}`])
      diffFiles = out ? out.split('\n').filter(Boolean) : []
      c.diffs.set(dkey, diffFiles)
    } catch (e) {
      warnings.push(`git diff ${review.base}..${review.head} 执行失败，跳过 diff 校验: ${e.message?.split('\n')[0] || e.message}`)
      return { ok: true, emptyDiff: false, errors, warnings, unavailable: false }
    }
  }

  // 并入 working-tree 未提交改动（execute 复盘 a）：子代理默认不 commit，base..head 无 commit diff 时
  // diffFiles 留空 → 下方交叉比对拿空集对非空 changedFiles 必判「完全不相交」伪造，逼 agent 强制 commit
  // + 改 7 个 review head。对齐 checkExecuteCodeEvidence（stage-contract.js 同时查 working-tree）语义，
  // 未提交改动也算有效对账源。working-tree 有改动时无条件并入（覆盖「部分 commit + 未提交」）。
  // PERF-01：同 gitDir 的 status 快照按批缓存（单次校验批内恒同，跨批复用会读到陈旧状态）
  const commitDiffFiles = diffFiles.slice()
  try {
    let wtStatus = c.wtStatus.get(gitDir)
    if (wtStatus === undefined) {
      wtStatus = runGit(gitDir, ['status', '--porcelain'])
      c.wtStatus.set(gitDir, wtStatus)
    }
    if (wtStatus && wtStatus.trim().length > 0) {
      const wtFiles = parsePorcelainFiles(wtStatus)
      if (wtFiles.length > 0) diffFiles = diffFiles.concat(wtFiles)
      if (commitDiffFiles.length === 0) {
        warnings.push(`base..head 无 commit diff（${review.base.slice(0, 8)}..${review.head.slice(0, 8)}），交叉对账并入 working-tree 未提交改动 ${wtFiles.length} 个文件 —— 按有效改动处理，不判零改动伪造`)
      }
    }
  } catch {}
  diffFiles = [...new Set(diffFiles)].filter(Boolean)

  const emptyDiff = diffFiles.length === 0

  // changedFiles 交叉比对：完全不相交 = review 描述的改动与实际 diff 无关（diffFiles 已含 working-tree）
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
 * execute run id 格式校验：exec-YYYY-MM-DD-HHMMSS。
 * marker 文件是 agent 可写内容，读回后既注入 prompt（{EXECUTE_RUN_ID}）又拼进
 * join(runtimeRoot, 'execute-runs', runId) 路径——格式校验同时防提示词注入与路径穿越
 * （对齐 stage-review marker 的 review- 前缀校验范式）。
 * @param {string} runId
 * @returns {boolean}
 */
export function isValidExecuteRunId(runId) {
  return typeof runId === 'string' && /^exec-\d{4}-\d{2}-\d{2}-\d{6}$/.test(runId)
}

/**
 * 解析最新 execute run id：优先 current-execute-run-id-<changeName> marker；
 * marker 缺失/为空则扫描 execute-runs/ 下子目录、取 mtime 最新的（尽力定位已有 run）。
 *
 * 与 getLatestStageReviewRunId 的目录扫描兜底同语义——避免 marker 丢失（cleanup/并行/手删）
 * 而 agent 已用旧 runId 落了 execute-runs/<旧ID>/ 时，调用方直接 generate 新 ID 找不到旧 review、
 * 误判缺 review.json（gates.js execute 完成门坑）。返回 null 表示既无 marker 也无既有 run 目录。
 *
 * @param {{ runtimeRoot: string, changeName: string }} opts
 * @returns {string|null} runId（exec- 前缀），无则 null
 */
/**
 * 扫描 execute-runs/，返回 mtime 最新且真正含 tasks/ 子目录的 runId。
 *
 * 专治 execute run marker 漂移（prompt-control-debt.md gate-atom-a）：generateExecuteRunId 只写
 * marker 字符串、run 目录由 ensureTaskReviewDir 在写 review.json 时才建，marker 漂到「尚未建目录 /
 * 未写任何 task review」的新 run 后，旧 run 里齐备的 review.json 全部失联。resolveLatestExecuteRunId
 * 见 marker 非空即原样返回（不校验目录），接不住这种漂移；本函数无视 marker、只看真实目录内容，
 * 供 enforceReviewJsonGate 在 marker 指向的 run 缺 tasks/ 时兜底重定位，避免误报「review.json 不存在」。
 * 全部 run 都无 tasks/（真没写 review）返回 null——调用方维持原阻断，不误放行。
 *
 * @param {{ runtimeRoot: string }} opts
 * @returns {string|null} 含 tasks/ 的最新 runId，无则 null
 */
export function resolveLatestExecuteRunIdWithTasks({ runtimeRoot, changeName = null }) {
  try {
    const runsDir = join(runtimeRoot, 'execute-runs')
    if (!existsSync(runsDir)) return null
    const entries = readdirSync(runsDir)
      .map(e => ({ e, p: join(runsDir, e) }))
      .filter(x => { try { return statSync(x.p).isDirectory() } catch { return false } })
      .filter(x => { try { return statSync(join(x.p, 'tasks')).isDirectory() } catch { return false } })
      .map(x => ({ e: x.e, mtime: statSync(x.p).mtimeMs }))
      .sort((a, b) => b.mtime - a.mtime)
    if (entries.length === 0) return null
    // changeName 给定时优先 change 戳等值的 run（坑 worktree-cleanup-marker-chain：mtime 最新
    // 会错拿其他变更的 run）；无戳命中退回 mtime 最新（向后兼容，调用方多为 marker 漂移兜底，
    // 宁可拿最新 run 也不空手而归——覆盖度由调用方 validateTaskReviews 复校验）
    if (changeName) {
      for (const x of entries) {
        try {
          const c = readFileSync(join(runsDir, x.e, 'change'), 'utf8').trim()
          if (c === changeName) return x.e
        } catch {}
      }
    }
    return entries[0].e
  } catch {
    return null
  }
}

export function resolveLatestExecuteRunId({ runtimeRoot, changeName }) {
  const marker = join(runtimeRoot, `current-execute-run-id-${changeName}`)
  try {
    if (existsSync(marker)) {
      const c = readFileSync(marker, 'utf8').trim()
      if (c && !isValidExecuteRunId(c)) console.warn(`[sillyspec] execute run marker 内容非法（期望 exec-YYYY-MM-DD-HHMMSS，实得 ${JSON.stringify(c.slice(0, 60))}），忽略并回退目录扫描`)
      if (isValidExecuteRunId(c)) return c
    }
  } catch {}
  // marker 缺失（worktree cleanup / 归档清理 / 并行会话误删——坑 worktree-cleanup-marker-chain）
  // 时不再盲目取 mtime 最新（会拿到其他变更的 run）：先按 change 归属戳过滤，命中才返回；
  // 无戳（旧 run）退回 mtime 最新保持向后兼容。
  try {
    const candidates = listExecuteRunCandidates(runtimeRoot, changeName)
    if (candidates.stamped.length > 0) return candidates.stamped[0]
    if (candidates.all.length > 0) return candidates.all[0]
  } catch {}
  return null
}

// ── execute run 的 change 归属戳（坑 worktree-cleanup-marker-chain 根治）──
//
// 背景：run 目录 execute-runs/<runId>/ 本身不带变更身份，change→run 的唯一链接是
// current-execute-run-id-<change> marker；worktree cleanup / 归档 marker 清理 / 并行会话
// 误删后链即断，各 fallback（mtime 最新）会错拿其他变更的 run → archive 完成度报告把
// 已实现 task 全报「review.json 缺失」，只能手工回填。
// 修法：marker 写入点同步在 run 目录落 `change` 戳；marker 断裂后按戳精确归属，
// 旧 run（无戳）退回覆盖度启发式（run 的 tasks/ 含本变更 task-NN review 才算命中）。

/**
 * 在 run 目录写入 change 归属戳（execute-runs/<runId>/change，内容为 changeName）。
 * 与 marker 写入点同步调用（stage.js 主点 + gates.js/task-review.js 补写点）。
 * best-effort：失败仅 warn 不抛（戳是归属优化的载体，缺了退回覆盖度启发式，不阻断主流程）。
 * @param {string} runtimeRoot
 * @param {string} runId
 * @param {string} changeName
 */
export function stampExecuteRunChange(runtimeRoot, runId, changeName) {
  if (!runtimeRoot || !runId || !changeName) return
  try {
    // run 目录可能尚未创建（本 helper 先于 review 落盘调用的路径）——mkdir 保证自洽
    mkdirSync(join(runtimeRoot, 'execute-runs', runId), { recursive: true })
    writeFileSync(join(runtimeRoot, 'execute-runs', runId, 'change'), changeName + '\n')
  } catch (e) {
    console.warn(`[sillyspec] execute run change 戳写入失败（归属 fallback 退回覆盖度启发式，不阻断）: ${e.message}`)
  }
}

/**
 * 读 run 目录的 change 归属戳。
 * @returns {string|null} 戳内容（trim 后非空），无戳/读失败返回 null
 */
function readExecuteRunChangeStamp(runtimeRoot, runId) {
  try {
    const c = readFileSync(join(runtimeRoot, 'execute-runs', runId, 'change'), 'utf8').trim()
    return c || null
  } catch { return null }
}

/**
 * 扫描 execute-runs/ 候选 run（mtime 最新优先），按 change 归属戳分组。
 * @returns {{ stamped: string[], all: string[] }} stamped=戳等 changeName 的 runId（新→旧）；
 *   all=全部 runId（新→旧，含无戳旧 run，供覆盖度启发式与向后兼容 fallback）
 */
function listExecuteRunCandidates(runtimeRoot, changeName) {
  const runsDir = join(runtimeRoot, 'execute-runs')
  const out = { stamped: [], all: [] }
  if (!existsSync(runsDir)) return out
  const entries = readdirSync(runsDir)
    .map(e => ({ e, p: join(runsDir, e) }))
    .filter(x => { try { return statSync(x.p).isDirectory() } catch { return false } })
    .map(x => ({ e: x.e, mtime: statSync(x.p).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime)
  for (const x of entries) {
    out.all.push(x.e)
    if (changeName && readExecuteRunChangeStamp(runtimeRoot, x.e) === changeName) out.stamped.push(x.e)
  }
  return out
}

/**
 * 判定 run 对本变更 taskIds 的覆盖度：tasks/ 下存在多少个 task-NN/review.json ∈ taskIds。
 * taskIds 为空时退化为「tasks/ 下存在任意 task-NN/review.json」（保守启发）。
 * @returns {number} 命中的 review 数
 */
function executeRunCoverage(runtimeRoot, runId, taskIds) {
  try {
    const tasksDir = join(runtimeRoot, 'execute-runs', runId, 'tasks')
    if (!existsSync(tasksDir)) return 0
    const entries = readdirSync(tasksDir).filter(e => /^task-\d+$/.test(e))
    if (taskIds.length > 0) return entries.filter(e => taskIds.includes(e) && existsSync(join(tasksDir, e, 'review.json'))).length
    return entries.filter(e => existsSync(join(tasksDir, e, 'review.json'))).length
  } catch { return 0 }
}

/**
 * 归属化解析本变更的 execute run（marker 链断裂的根治入口）。
 *
 * 解析顺序：
 *   1. marker（格式校验）指向的 run，若其对本变更有覆盖（tasks/ 有本变更 review）或戳匹配 → 用它；
 *   2. marker 缺失/非法/零覆盖（坑10 型漂移：marker 指向空 run）→ 扫描候选：
 *      a. change 戳等值的最新的 run；
 *      b.（旧 run 无戳）覆盖度 ≥1 的最新 run；
 *   3. 都不命中 → null（调用方降级，报告明确「run 无法归属」而非「review 全缺」）。
 *
 * fail-safe：任何异常 → null，绝不抛。
 * @param {{ runtimeRoot: string, changeName: string, taskIds?: string[] }} opts
 * @returns {{ runId: string, origin: 'marker'|'stamp'|'coverage', relocated?: boolean }|null}
 */
export function resolveExecuteRunForChange({ runtimeRoot, changeName, taskIds = [] }) {
  try {
    // 1. marker
    let markerRunId = null
    try {
      const marker = join(runtimeRoot, `current-execute-run-id-${changeName}`)
      if (existsSync(marker)) {
        const c = readFileSync(marker, 'utf8').trim()
        if (c && !isValidExecuteRunId(c)) console.warn(`[sillyspec] execute run marker 内容非法（期望 exec-YYYY-MM-DD-HHMMSS，实得 ${JSON.stringify(c.slice(0, 60))}），忽略并回退归属扫描`)
        if (isValidExecuteRunId(c)) markerRunId = c
      }
    } catch {}
    if (markerRunId) {
      const stamped = readExecuteRunChangeStamp(runtimeRoot, markerRunId) === changeName
      const covered = executeRunCoverage(runtimeRoot, markerRunId, taskIds)
      if (stamped || covered > 0) return { runId: markerRunId, origin: 'marker' }
      // marker 零覆盖且无戳：疑似漂移（坑10：marker 在、真实 review 在别的 run），下探扫描
    }

    // 2. 扫描：戳优先 → 覆盖度启发（旧 run）。
    // 覆盖度启发跳过「戳属他变更」的 run：task-NN 命名跨变更同构（都从 task-01 起），只看覆盖度
    // 会把他变更 run 的 task-01 review 误配给本变更；戳存在且不等值 = 该 run 有明确主人，排除。
    const candidates = listExecuteRunCandidates(runtimeRoot, changeName)
    if (candidates.stamped.length > 0) {
      return { runId: candidates.stamped[0], origin: 'stamp', relocated: markerRunId ? markerRunId !== candidates.stamped[0] : true }
    }
    for (const runId of candidates.all) {
      const stamp = readExecuteRunChangeStamp(runtimeRoot, runId)
      if (stamp && stamp !== changeName) continue
      if (executeRunCoverage(runtimeRoot, runId, taskIds) > 0) {
        return { runId, origin: 'coverage', relocated: markerRunId ? markerRunId !== runId : true }
      }
    }
    return null
  } catch {
    return null
  }
}

/**
 * worktree execute「主 agent 直接实现」模式收尾兜底：per-task review.json 缺失时，
 * 据 git diff base..head 按 task allowed_paths 归属，自动落盘 cannot_verify 草稿。
 *
 * 根因（坑 worktree-execute-apply-friction 坑2）：per-task review.json 无程序化 writer，
 * 全靠子代理手写；主 agent 统一实现强依赖链/机械 task 时不走子代理 review 流程 →
 * review.json 全缺，execute --done 的 Task Review Gate 报「task-XX 缺少 review.json」阻断。
 *
 * 复用（与 Task Review Gate / verify 同源，单一真相）：
 *   - resolveVerifyChangedFiles（worktree-aware，meta.json 为权威）→ base..head diff 文件集
 *   - WorktreeManager.getMeta → baseHash（base）+ worktreePath（决定 head/gitDir，同 gates.js reviewGitDir）
 *   - parseAllowedPaths + pathMatches（同 worktree-apply Gate2 口径）→ task 文件归属
 *   - exec-id 解析同 gates.js:269 / autoCheckPlanFromReviews：current-execute-run-id-<change> marker，
 *     缺失则 generateExecuteRunId + 落盘（保证草稿与后续 gate 读同一 run 目录）
 *
 * 行为：
 *   - 仅 review.json 不存在时写（幂等，已有人工/子代理 verdict 一律跳过，绝不覆盖）
 *   - changedFiles 为空的 task 不生成（verifyReviewGitEvidence 判空 diff 伪造，留给 agent）
 *   - 草稿 verdict=cannot_verify + 非空 requiredEvidence（过 schema，流转 verify 阶段兑现）
 *   - 不属任何 task 的文件累计 unattributed（顺带修复/非源码），不强塞某 task
 *
 * fail-open：任何异常 → 返回统计，仅 console.warn，不阻断 execute 完成（草稿是兜底，
 * 缺了也只是退回原状——gate 报缺 review.json，agent 手补，不比修复前差）。
 *
 * @param {{ changeName: string, cwd: string, platformOpts?: object, ctx?: object|null }} opts
 * @returns {Promise<{ generated: number, skipped: number, unattributed: string[], reason?: string, executeRunId?: string }>}
 */
export async function generateTaskReviewDrafts({ changeName, cwd, platformOpts = {}, ctx = null }) {
  const specBase = platformOpts.specRoot || join(cwd, '.sillyspec')
  const runtimeRoot = resolveRuntimeRoot(platformOpts, specBase)
  const changeDir = join(specBase, 'changes', changeName)
  const tasksDir = join(changeDir, 'tasks')

  if (!changeName) {
    return { generated: 0, skipped: 0, unattributed: [], reason: '无 changeName' }
  }
  // 无 task 卡片目录 → 非多 task 变更，无需补草稿
  if (!existsSync(tasksDir)) {
    return { generated: 0, skipped: 0, unattributed: [], reason: '无 tasks/ 目录' }
  }

  // exec-id：与 Task Review Gate（gates.js:269）/ autoCheckPlanFromReviews 同源
  const runIdFile = join(runtimeRoot, 'current-execute-run-id-' + changeName)
  let executeRunId = ''
  try {
    if (existsSync(runIdFile)) {
      const c = readFileSync(runIdFile, 'utf8').trim()
      if (c && !isValidExecuteRunId(c)) console.warn(`[sillyspec] execute run marker 内容非法（期望 exec-YYYY-MM-DD-HHMMSS，实得 ${JSON.stringify(c.slice(0, 60))}），视为缺失重新生成`)
      if (isValidExecuteRunId(c)) executeRunId = c
    }
  } catch {}
  if (!executeRunId) {
    executeRunId = generateExecuteRunId()
    // D-001#1 fallback 写入点：mkdir execute-runs/<runId>/tasks 先于 marker（不变量：marker 在则目录在）。
    // 保留 fail-open 契约（调用方 catch 降级）——只去静默：失败 console.error 留痕，不 throw
    //（草稿兜底缺了也只是退回 gate 报缺 review.json，不比修复前差）。
    try {
      mkdirSync(join(runtimeRoot, 'execute-runs', executeRunId, 'tasks'), { recursive: true })
      writeFileSync(runIdFile, executeRunId + '\n')
      stampExecuteRunChange(runtimeRoot, executeRunId, changeName)
    } catch (e) {
      console.error(`[sillyspec] execute run marker/目录写入失败（降级继续，草稿落盘仍尝试）: ${e.message}`)
    }
  }

  // base..head diff 文件集（worktree-aware；null=git 不可用，[]=无 commit diff）
  const diffFiles = resolveVerifyChangedFiles(cwd, changeName)
  // 单仓模式（无 ctx）：主仓无 diff 即无任何 task 可生成 → 提前返回（原逻辑零回归）。
  // 有 ctx：主仓无 diff 不阻断——跨仓 task 的 diff 在跨仓仓根独立取（per-task），主仓 task 自然跳过（空 changedFiles）。
  if (!ctx && (!diffFiles || diffFiles.length === 0)) {
    return { generated: 0, skipped: 0, unattributed: [], executeRunId, reason: 'base..head 无代码 diff（改动未 commit？）' }
  }

  // base/head + gitDir：与 gates.js reviewGitDir 同源（worktree 优先，in-place 回退 cwd）
  // 有 ctx 时主仓 base/head 仅供主仓 task 用；ctx 主仓 entry 也可提供 base（meta.baseHash 同源）。
  // 主仓 base/head 解析失败 + 无 ctx → 提前返回（原逻辑）；有 ctx → 仅记 null，主仓 task 后续跳过（不阻断跨仓 task）。
  let base = null
  let head = null
  let reviewGitDir = cwd
  try {
    const wm = new WorktreeManager({ cwd })
    const meta = wm.getMeta(changeName)
    base = (meta && (meta.baselineCommit || meta.baseHash)) || null
    if (meta && meta.worktreePath && meta.mode !== 'in-place-fallback' && existsSync(meta.worktreePath)) {
      reviewGitDir = meta.worktreePath
    }
  } catch {}
  if (!base) {
    if (!ctx) {
      return { generated: 0, skipped: 0, unattributed: diffFiles, executeRunId, reason: '无 worktree meta.baseHash（无法定 base/head）' }
    }
    // 有 ctx：主仓 base 缺失（主仓无 worktree / 单纯跨仓 change）→ 主仓 task 后续跳过，跨仓 task 照常
  } else {
    try {
      head = runGit(reviewGitDir, ['rev-parse', 'HEAD'])
    } catch {
      if (!ctx) {
        return { generated: 0, skipped: 0, unattributed: diffFiles, executeRunId, reason: 'git rev-parse HEAD 失败（' + reviewGitDir + '）' }
      }
      // 有 ctx：主仓 HEAD 失败不阻断跨仓 task；head 留 null，主仓 task 后续按空 changedFiles 跳过
    }
  }

  const taskFiles = readdirSync(tasksDir).filter(f => /^task-\d+\.md$/.test(f)).sort()
  let generated = 0
  let skipped = 0
  const attributed = new Set()

  for (const tf of taskFiles) {
    const taskId = tf.replace(/\.md$/, '')
    const reviewDir = join(runtimeRoot, 'execute-runs', executeRunId, 'tasks', taskId)
    const reviewPath = join(reviewDir, 'review.json')

    // 幂等：review.json 已存在（无论合法/解析错/schema 错）一律跳过，绝不覆盖人工/子代理 verdict
    const existing = readReview(reviewPath)
    if (existing.ok || existing.parseError || existing.schemaError) {
      skipped++
      continue
    }

    const content = readFileSync(join(tasksDir, tf), 'utf8')
    const allowedPaths = parseAllowedPaths(content)

    // ── 多仓分支（design §6 A2 / D-006 / D-010）：跨仓 task 用 task 卡双锡点 + 跨仓仓 diff ──
    const taskRepo = normalizeRepoKey(parseRepo(content))
    const crossEntry = (ctx && taskRepo !== DEFAULT_REPO_KEY) ? ctx.resolve(taskRepo) : null
    let taskBase = base
    let taskHead = head
    let taskChangedFiles
    let draftRepo

    if (crossEntry) {
      // 跨仓 task：base/head 必须读 task 卡锡点（跨仓仓无 meta.json）。缺任一 → 跳过留给 agent。
      const baseCommit = parseBaseCommit(content)
      const headCommit = parseHeadCommit(content)
      if (!baseCommit || !headCommit) {
        skipped++
        continue
      }
      taskBase = baseCommit
      taskHead = headCommit
      draftRepo = taskRepo
      // 跨仓 diff 在跨仓仓根跑（base..head 锡点锚定，非瞬时 HEAD——D-010 head 精度）
      let crossDiffFiles = []
      try {
        const out = runGit(crossEntry.gitDir, ['diff', '--name-only', `${baseCommit}..${headCommit}`])
        crossDiffFiles = out ? out.split('\n').filter(Boolean).map(p => p.replace(/\\/g, '/')) : []
      } catch {
        // git diff 失败（锡点非真实 commit 等）→ 不生成伪造草稿，留给 agent 手补
        skipped++
        continue
      }
      taskChangedFiles = allowedPaths.length > 0
        ? crossDiffFiles.filter(f => allowedPaths.some(p => pathMatches(f, p)))
        : crossDiffFiles
    } else {
      // 主仓 task（taskRepo='main' 或无 ctx 跨仓解析失败 → 退单仓口径）
      // diffFiles 可能为 null（git 不可用）——有 ctx 时主仓 git 异常不阻断跨仓 task，主仓 task 自然跳过。
      const mainDiff = Array.isArray(diffFiles) ? diffFiles : []
      taskChangedFiles = allowedPaths.length > 0
        ? mainDiff.filter(f => allowedPaths.some(p => pathMatches(f, p)))
        : []
    }

    // 空 changedFiles 的 task 不生成（verifyReviewGitEvidence 判空 diff 伪造，留给 agent 手补）
    if (taskChangedFiles.length === 0) {
      skipped++
      continue
    }
    // 主仓 task 缺 base/head（meta 缺失 / HEAD 解析失败，见上方 :968-981 注释承诺的"后续跳过"）：
    // 跳过留给 agent 手补。此前 null.slice(0,8) 直接 TypeError 崩掉整个草稿生成（体检 BUG-06）
    if (!crossEntry && (!taskBase || !taskHead)) {
      skipped++
      continue
    }
    // unattributed 只统计主仓 diff（跨仓 diff 路径相对跨仓仓根，与主仓 unattributed 语义无关）
    if (!crossEntry) {
      taskChangedFiles.forEach(f => attributed.add(f))
    }

    const draft = {
      schemaVersion: REVIEW_SCHEMA_VERSION,
      task: taskId,
      base: taskBase,
      head: taskHead,
      changedFiles: taskChangedFiles,
      specVerdict: 'cannot_verify',
      qualityVerdict: 'cannot_verify',
      requiredEvidence: ['auto-generated draft: 待 agent 对照 ' + taskId + ' brief + diff 复核后升级为 pass/fail'],
      reviewerNotes: 'auto-generated draft from git diff ' + taskBase.slice(0, 8) + '..' + taskHead.slice(0, 8) + ';verdict=未评审（worktree execute 主 agent 实现模式兜底，坑2）',
    }
    if (draftRepo) draft.repo = draftRepo
    mkdirSync(reviewDir, { recursive: true })
    writeFileSync(reviewPath, JSON.stringify(draft, null, 2) + '\n')
    generated++
  }

  const unattributed = (Array.isArray(diffFiles) ? diffFiles : []).filter(f => !attributed.has(f))
  return { generated, skipped, unattributed, executeRunId }
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
      if (content && !isValidExecuteRunId(content)) console.warn(`[sillyspec] execute run marker 内容非法（期望 exec-YYYY-MM-DD-HHMMSS，实得 ${JSON.stringify(content.slice(0, 60))}），忽略并回退目录扫描`)
      if (isValidExecuteRunId(content)) return content
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
