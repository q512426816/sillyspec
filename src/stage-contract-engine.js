/**
 * stage-contract-engine.js — 产物字面校验通用引擎
 *
 * 消费 stage-contract-spec.js 的 manifest 规则,按 kind dispatch 判定,产出 {errors, warnings}。
 * 哲学对齐 workflow.js 的 checkOutput(声明式 check + type 分发),但独立:支持 severity(error/warning)、
 * 更丰富的纯 kind、custom kind(引擎 skip,留 validator 保留算法)。
 *
 * 设计原则:
 *   - 引擎不直接碰 fs:readFile/readDir 由调用方注入(默认原生)。CRLF 归一化在调用方收敛
 *     (plan-postcheck 注入 LF-normalizing reader),引擎拿到什么判什么,不在引擎层二次引入差异。
 *   - regex 每次 new RegExp:manifest 存 {pattern, flags} 字符串,规避 lastIndex 状态坑
 *     (旧代码多处 /g 正则跨调用复用需手写 lastIndex=0,是潜在 bug)。
 *   - 内容规则(literal-any、literal-all、regex、contains-section、field-present、header-field、list-non-empty、
 *     min-lines/no-placeholder-line)在 target 文件不存在时自动 skip(不报错)——存在性由独立的
 *     file-exists 规则保证,避免"文件缺失"被内容规则重复报。
 *   - custom kind 引擎 skip(不计 errors/warnings),由调用方 validator 保留判定算法,
 *     但 import manifest 的 data + failMessage(同源)。
 */
import { existsSync, readdirSync, readFileSync } from 'fs'
import { join } from 'path'
import { getRulesFor, isCustomKind } from './stage-contract-spec.js'
import { hasAllSections, hasNoPlaceholderLine, meetsMinLines } from './check-primitives.js'

// ============ IO 注入(默认原生 fs,调用方可替换为 normalized reader)============

function defaultReadFile(absPath) {
  if (!existsSync(absPath)) return { exists: false, content: '' }
  return { exists: true, content: readFileSync(absPath, 'utf8') }
}

function defaultReadDir(absPath) {
  if (!existsSync(absPath)) return { exists: false, files: [] }
  try {
    return { exists: true, files: readdirSync(absPath) }
  } catch {
    return { exists: false, files: [] }
  }
}

const DEFAULT_IO = { readFile: defaultReadFile, readDir: defaultReadDir }

// ============ target 解析 + scope 截取 ============

function resolveTargetPath(target, ctx) {
  if (!target || !target.path) return null
  switch (target.root) {
    case 'change': return ctx.changeDir ? join(ctx.changeDir, target.path) : null
    case 'docs': return ctx.docsRoot ? join(ctx.docsRoot, target.path) : null
    case 'archive': return ctx.archiveDir ? join(ctx.archiveDir, target.path) : null
    case 'specBase': return ctx.specBase ? join(ctx.specBase, target.path) : null
    default: return null
  }
}

/** 按 scope 截取文本:full=全文 / head=前 512 字节(对齐 scan-postcheck header 切片)/ fm=frontmatter 块内容 */
function sliceScope(content, scope) {
  if (!scope || scope === 'full') return content
  if (scope === 'head') return content.slice(0, 512)
  if (scope === 'fm') {
    const m = content.match(/^---\r?\n([\s\S]*?)\r?\n---/)
    return m ? m[1] : ''
  }
  return content
}

// ============ 纯 kind dispatch ============

function dispatchPure(rule, entry) {
  const { exists, content } = entry
  // 存在性 kind:不存在即 fail
  if (rule.kind === 'file-exists' || rule.kind === 'dir-exists') return exists
  // 其余为内容规则:文件不存在 → skip(通过,存在性由 file-exists 规则保证)
  if (!exists) return true
  const scoped = sliceScope(content, rule.target && rule.target.scope)
  switch (rule.kind) {
    case 'literal-any': return (rule.data.literals || []).some(s => scoped.includes(s))
    case 'literal-all': return (rule.data.literals || []).every(s => scoped.includes(s))
    case 'regex': return new RegExp(rule.data.pattern, rule.data.flags || '').test(scoped)
    case 'contains-section': return hasAllSections(scoped, rule.data.sections || [])
    case 'no-placeholder-line': return hasNoPlaceholderLine(scoped, rule.data.patterns)
    case 'field-present':
      // frontmatter 字段:行首 `<field>:`(与 plan-postcheck /^goal:/m 一致,字段名为固定标识符无正则元字符)
      return (rule.data.fields || []).every(f => new RegExp(`^${f}:`, 'm').test(scoped))
    case 'header-field':
      // 头部 N 字节内含 `<field>:`(对齐 scan-postcheck/complete.js author:/created_at: 检查)
      return (rule.data.fields || []).every(f => scoped.includes(`${f}:`))
    case 'list-non-empty':
      // 至少一行 trim 后以 - / * / 数字. 开头(逐字对齐 validateBrainstormOutputs tasks.md 检查)
      return scoped.split(/\r?\n/).some(l => {
        const t = l.trim()
        return t.startsWith('-') || t.startsWith('*') || /^\d+\./.test(t)
      })
    case 'min-lines': return meetsMinLines(scoped, rule.data.min || 1)
    default: return true  // 未知纯 kind,放过(不阻断),避免新 kind 上线时误杀
  }
}

function checkDirNonEmpty(rule, absPath, readDir) {
  const { exists, files } = readDir(absPath)
  if (!exists) return false
  const glob = rule.data.glob || '.md'
  const min = rule.data.min || 1
  return files.filter(f => f.endsWith(glob)).length >= min
}

// ============ 报错文案格式化 ============

/** failMessage 里的 ${path} 占位 → 替换为解析后的绝对路径(与旧 validator join(changeDir, file) 文案一致)。 */
function formatFail(failMessage, absPath) {
  return failMessage && failMessage.includes('${path}')
    ? failMessage.replace('${path}', absPath)
    : failMessage
}

// ============ 主入口 ============

/**
 * 对某 stage 的全部纯 kind 规则跑判定。custom kind / target 基缺失 / enabled=false 的规则计入 skipped。
 *
 * @param {string} stage
 * @param {{ changeDir?: string, docsRoot?: string, archiveDir?: string, specBase?: string }} ctx
 * @param {{ readFile?: Function, readDir?: Function }} [io]  默认原生 fs;plan-postcheck 可注入 CRLF-normalizing reader
 * @returns {{ ok: boolean, errors: string[], warnings: string[], applied: string[], skipped: string[] }}
 */
export function evaluateRules(stage, ctx, io, opts = {}) {
  const readFile = (io || DEFAULT_IO).readFile || defaultReadFile
  const readDir = (io || DEFAULT_IO).readDir || defaultReadDir
  const errors = []
  const warnings = []
  const applied = []
  const skipped = []

  for (const rule of getRulesFor(stage, { source: opts.source })) {
    if (rule.enabled === false) { skipped.push(rule.id); continue }
    if (isCustomKind(rule.kind)) { skipped.push(rule.id); continue }
    const absPath = resolveTargetPath(rule.target, ctx)
    if (absPath == null) { skipped.push(rule.id); continue }

    const ok = rule.kind === 'dir-non-empty'
      ? checkDirNonEmpty(rule, absPath, readDir)
      : dispatchPure(rule, readFile(absPath))

    applied.push(rule.id)
    if (!ok) {
      (rule.severity === 'error' ? errors : warnings).push(formatFail(rule.failMessage, absPath))
    }
  }

  return { ok: errors.length === 0, errors, warnings, applied, skipped }
}
