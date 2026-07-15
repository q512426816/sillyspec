/**
 * SillySpec Stage Review Gate — 阶段级审查校验（文档型）
 *
 * 与 task-review.js 的关系：
 *   task-review 校验 execute 每个 task 的 review.json（git 代码 diff 证据：base/head）。
 *   stage-review 校验 brainstorm/plan/propose/execute-acceptance 的阶段级 review.json
 *   （文档证据：reviewedFiles + docHash）。两者 verdict 语义一致（pass/fail/cannot_verify
 *   三态 + cannot_verify 必须带 requiredEvidence 的反逃逸规则），复用 task-review 导出的
 *   VALID_VERDICTS / REVIEW_SCHEMA_VERSION 常量；task-review.js 本身不改、execute 路径零风险。
 *
 * 目录结构：
 *   .sillyspec/.runtime/stage-reviews/<stage>-<reviewRunId>/review.json
 *   （平台模式落 <runtimeRoot>/stage-reviews/...，与 execute-runs 同构）
 */

import { existsSync, readFileSync, mkdirSync, readdirSync } from 'fs'
import { join } from 'path'
import { createHash } from 'crypto'
import { VALID_VERDICTS, REVIEW_SCHEMA_VERSION } from './task-review.js'

// 文档型 stage review 的合法 reviewType
export const STAGE_REVIEW_TYPES = ['design', 'plan', 'proposal', 'code', 'acceptance']

// checklist 每项 result 的合法值
const CHECKLIST_RESULTS = ['pass', 'gap', 'fail']

/**
 * 计算文件内容的 sha256（用于 docHash 真实性校验，防 agent 凭空伪造 review.json）
 * @param {string} filePath - 绝对路径
 * @returns {string|null} sha256 hex；文件不存在返回 null
 */
export function computeDocHash(filePath) {
  if (!filePath || !existsSync(filePath)) return null
  const content = readFileSync(filePath)
  return createHash('sha256').update(content).digest('hex')
}

/**
 * 校验文档型 stage review.json 的 schema
 *
 * 与 task-review.validateReviewSchema 的区别：
 *   - 不要求 git base/head（证据形态不同）
 *   - 改要求 reviewedFiles（被审查文档路径数组）+ docHash（主文档内容 sha256）
 *   - 新增 reviewType（design/plan/proposal/code/acceptance）+ checklist
 *   - 复用 VALID_VERDICTS 三态 + cannot_verify 联动规则（task-review.js:65-69）
 *
 * @param {object} review - 解析后的 JSON 对象
 * @returns {{ ok: boolean, errors: string[] }}
 */
export function validateStageReviewSchema(review) {
  const errors = []
  if (!review || typeof review !== 'object') {
    return { ok: false, errors: ['stage review.json 不是有效 JSON 对象'] }
  }

  if (review.schemaVersion !== REVIEW_SCHEMA_VERSION) {
    errors.push(`schemaVersion 应为 ${REVIEW_SCHEMA_VERSION}，实际为 ${review.schemaVersion}`)
  }

  if (!STAGE_REVIEW_TYPES.includes(review.reviewType)) {
    errors.push(`reviewType 无效：${review.reviewType}（应为 ${STAGE_REVIEW_TYPES.join('/')}）`)
  }

  if (!VALID_VERDICTS.includes(review.specVerdict)) {
    errors.push(`specVerdict 无效：${review.specVerdict}（应为 ${VALID_VERDICTS.join('/')}）`)
  }
  if (!VALID_VERDICTS.includes(review.qualityVerdict)) {
    errors.push(`qualityVerdict 无效：${review.qualityVerdict}（应为 ${VALID_VERDICTS.join('/')}）`)
  }

  // cannot_verify 必须提供非空 requiredEvidence（与 task-review:65-69 一致，反逃逸）
  if (review.specVerdict === 'cannot_verify' || review.qualityVerdict === 'cannot_verify') {
    if (!Array.isArray(review.requiredEvidence) || review.requiredEvidence.length === 0) {
      errors.push('cannot_verify 的 verdict 必须提供非空的 requiredEvidence 数组')
    }
  }

  // reviewedFiles 必须是非空数组
  if (!Array.isArray(review.reviewedFiles) || review.reviewedFiles.length === 0) {
    errors.push('缺少 reviewedFiles 字段（应为被审查文档路径数组，[0] 为主审查对象，docHash 对应它）')
  }

  // docHash 非空
  if (!review.docHash || typeof review.docHash !== 'string') {
    errors.push('缺少 docHash 字段（被审查主文档内容的 sha256）')
  }

  // checklist 若提供，校验每项结构
  if (review.checklist !== undefined) {
    if (!Array.isArray(review.checklist)) {
      errors.push('checklist 若提供必须是数组')
    } else {
      for (let i = 0; i < review.checklist.length; i++) {
        const item = review.checklist[i]
        if (!item || typeof item !== 'object' || !item.item) {
          errors.push(`checklist[${i}] 缺少 item 描述`)
          continue
        }
        if (item.result !== undefined && !CHECKLIST_RESULTS.includes(item.result)) {
          errors.push(`checklist[${i}].result 无效：${item.result}（应为 ${CHECKLIST_RESULTS.join('/')}）`)
        }
      }
    }
  }

  return { ok: errors.length === 0, errors }
}

/**
 * docHash 真实性交叉校验：review 声称审查了某文档，重算该文档 sha256 对比。
 *
 * 对应 task-review.verifyReviewGitEvidence 的"防伪造"职责——agent 不能凭空编一份
 * review.json 贴个假 hash。约定 docHash 对应 reviewedFiles[0]（主审查对象）。
 *
 * searchDirs 依次尝试解析 reviewedFiles 的相对路径（specBase / changeDir / cwd 都可能）。
 * 主文档在所有基准下都找不到时降级 warning，不阻断（不因路径基准差异误杀）。
 *
 * @param {object} review - 已通过 schema 校验
 * @param {string[]} searchDirs - 解析相对路径的候选基准目录（绝对路径）
 * @returns {{ ok: boolean, errors: string[], warnings: string[] }}
 */
export function verifyStageReviewDocHash(review, searchDirs) {
  const errors = []
  const warnings = []
  const files = Array.isArray(review.reviewedFiles) ? review.reviewedFiles : []
  if (files.length === 0) {
    return { ok: false, errors: ['reviewedFiles 为空，无法做 docHash 校验'], warnings }
  }

  const primaryRel = files[0]

  for (const base of searchDirs || []) {
    const abs = join(base, primaryRel)
    const actual = computeDocHash(abs)
    if (actual === null) continue
    // 找到主文档，比对 hash
    if (review.docHash !== actual) {
      errors.push(`docHash 与主审查文档 ${primaryRel} 的实际内容不匹配 — review.json 疑似伪造（未真正读取文档）`)
      return { ok: false, errors, warnings }
    }
    return { ok: true, errors, warnings }
  }

  // 所有基准都找不到主文档：路径基准差异，降级 warning
  warnings.push(`主审查文档 ${primaryRel} 在候选目录下均不存在，跳过 docHash 校验（可能路径基准不同）`)
  return { ok: true, errors, warnings }
}

/**
 * 生成 stage review run id
 * @returns {string} 如 'review-2026-07-16-143000'
 */
export function generateStageReviewRunId() {
  const now = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `review-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
}

/**
 * 获取最新的 stage review run id（扫描 stage-reviews/<stage>-review-* 目录取最新）
 *
 * @param {string} runtimeRoot - .runtime 绝对路径
 * @param {string} stage - brainstorm|plan|propose|execute
 * @returns {string|null} run id（如 'review-2026-07-16-143000'），无则 null
 */
export function getLatestStageReviewRunId(runtimeRoot, stage) {
  const dir = join(runtimeRoot, 'stage-reviews')
  if (!existsSync(dir)) return null
  try {
    const entries = readdirSync(dir, { withFileTypes: true })
      .filter(e => e.isDirectory() && e.name.startsWith(`${stage}-review-`))
      .map(e => e.name)
      .sort()
      .reverse()
    if (!entries[0]) return null
    // entries[0] = "plan-review-2026-..."，剥掉 `${stage}-` 前缀得到 runId "review-2026-..."
    return entries[0].slice(stage.length + 1)
  } catch {
    return null
  }
}

/**
 * stage-level review 总校验（brainstorm/plan/propose/execute-acceptance 的 done gate）
 *
 * 规则（与 task-review.validateTaskReviews 对称）：
 *   - review.json 缺失 → error 阻断
 *   - 解析失败 / schema 失败 → error 阻断
 *   - reviewType 与期望不符 → error（agent 复制模板未改）
 *   - specVerdict 或 qualityVerdict 为 fail → error 阻断
 *   - cannot_verify + 非空 requiredEvidence → warning
 *   - cannot_verify + 空 requiredEvidence → error（schema 已拦，双保险）
 *   - docHash 与主文档实际内容不符 → error（伪造）
 *
 * 调用方约定：先用 classifyReviewTier 判定 tier——tier=self 不调用本函数（直接放行），
 * tier=independent 才调用。
 *
 * @param {object} opts
 * @param {string} opts.stage - brainstorm|plan|propose|execute
 * @param {string} opts.reviewType - design|plan|proposal|code|acceptance
 * @param {string} opts.runtimeRoot - .runtime 绝对路径（平台模式为 runtimeRoot）
 * @param {string} opts.reviewRunId - stage review run id（review-<ts>）
 * @param {string[]} [opts.searchDirs] - docHash 校验的候选基准目录
 * @param {boolean} [opts.verifyDocHash=true] - 是否做 docHash 真实性校验
 * @returns {{ ok: boolean, errors: string[], warnings: string[], review: object|null }}
 */
export function validateStageReview(opts) {
  const { stage, reviewType, runtimeRoot, reviewRunId, searchDirs = [], verifyDocHash = true } = opts
  const errors = []
  const warnings = []

  const reviewDir = join(runtimeRoot, 'stage-reviews', `${stage}-${reviewRunId}`)
  const reviewPath = join(reviewDir, 'review.json')

  if (!reviewRunId || !existsSync(reviewPath)) {
    return {
      ok: false,
      errors: [`缺少 ${stage} 阶段的 stage review.json — tier=independent 要求独立审查子代理产出（期望路径：${reviewPath}）`],
      warnings,
      review: null,
    }
  }

  let raw
  try {
    raw = readFileSync(reviewPath, 'utf8')
  } catch (e) {
    return { ok: false, errors: [`${stage} review.json 读取失败: ${e.message}`], warnings, review: null }
  }

  let parsed
  try {
    parsed = JSON.parse(raw)
  } catch (e) {
    return { ok: false, errors: [`${stage} review.json 解析失败: ${e.message}`], warnings, review: null }
  }

  const schemaResult = validateStageReviewSchema(parsed)
  if (!schemaResult.ok) {
    return { ok: false, errors: [`${stage} review.json schema 校验失败 — ${schemaResult.errors.join('; ')}`], warnings, review: parsed }
  }

  // reviewType 与期望一致性
  if (parsed.reviewType && parsed.reviewType !== reviewType) {
    errors.push(`${stage} review.json 的 reviewType 为 "${parsed.reviewType}"，与期望 "${reviewType}" 不符 — agent 可能复制模板未修改`)
  }

  // fail verdict
  if (parsed.specVerdict === 'fail' || parsed.qualityVerdict === 'fail') {
    errors.push(`${stage} review 未通过 — spec: ${parsed.specVerdict}, quality: ${parsed.qualityVerdict}`)
    if (parsed.reviewerNotes) errors.push(`${stage}: ${parsed.reviewerNotes}`)
  }

  // docHash 真实性（fail verdict 已错时跳过，避免噪声）
  if (errors.length === 0 && verifyDocHash && searchDirs.length > 0) {
    const dh = verifyStageReviewDocHash(parsed, searchDirs)
    for (const w of dh.warnings) warnings.push(`${stage}: ${w}`)
    if (!dh.ok) {
      for (const err of dh.errors) errors.push(`${stage}: ${err}`)
    }
  }

  // cannot_verify → warning（requiredEvidence 非空已由 schema 保证）
  if (errors.length === 0 && (parsed.specVerdict === 'cannot_verify' || parsed.qualityVerdict === 'cannot_verify')) {
    const verdicts = []
    if (parsed.specVerdict === 'cannot_verify') verdicts.push('spec')
    if (parsed.qualityVerdict === 'cannot_verify') verdicts.push('quality')
    warnings.push(`${stage}: ${verdicts.join('+')}=cannot_verify，requiredEvidence 需在后续阶段满足`)
  }

  return { ok: errors.length === 0, errors, warnings, review: parsed }
}

/**
 * 打印 stage review 校验结果
 * @param {{ ok: boolean, errors: string[], warnings: string[] }} result
 * @param {object} context - { stage, reviewRunId } 用于错误提示路径
 */
export function printStageReviewResult(result, context = {}) {
  const { stage } = context
  if (result.ok && result.warnings.length === 0) {
    console.log(`\n✅ Stage Review Gate — ${stage} 阶段独立审查通过`)
    return
  }

  if (result.errors.length > 0) {
    console.error(`\n🚫 Stage Review Gate — ${stage} FAILED`)
    for (const err of result.errors) {
      console.error(`   - ${err}`)
    }
    console.error(`\n   提示：tier=independent 要求独立审查子代理产出 review.json，补全后重新 --done`)
  }

  if (result.warnings.length > 0) {
    console.warn(`\n⚠️ Stage Review Gate — ${stage} WARNING`)
    for (const w of result.warnings) {
      console.warn(`   - ${w}`)
    }
  }
}
