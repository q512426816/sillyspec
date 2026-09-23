/**
 * knowledge-classify.js — knowledge classify 子命令核心（2026-09-14-knowledge-loop-close task-02）
 *
 * 职责：把 knowledge/uncategorized.md 中的条目迁移归类到目标知识文件，四步动作：
 *   ①解析条目 → ②追加目标知识文件（`## <标题>` + 原文，先追加后删除保内容可 revert）
 *   → ③INDEX.md 对应分类段补路由行（keywords 显式传或标题分词兜底，anchor=条目标题
 *   机械生成，先例 knowledge/INDEX.md `#平台审核占位`）→ ④从 uncategorized.md 删除该段。
 *
 * 条目寻址三通道（X-001 双格式 + --title 兜底，按优先级）：
 *   1. 标题行前缀 `## <qlId> | <标题>`（knowledge.js validate 契约格式）
 *   2. 正文尾注 `（<qlId>）`（中文括号，quick.js 收尾指引格式；半角括号容忍）
 *   3. titleFallback 模糊匹配条目标题（无 ql 标注历史条目兜底）
 *
 * 幂等：目标文件已含同标题条目 → 跳过追加（skippedReason='duplicate-title'）只做迁移
 * 收尾（INDEX 路由 + 删除原条目）；INDEX 已含同 file#anchor 路由 → 不重复加行。
 * --dry-run 只渲染将要发生的变更（返回 plan），不落盘（含审计零写盘）。
 *
 * 审计：归类动作经 task-01 的 appendKnowledgeHit（KnowledgeHitsAPI）落一行 type:classify
 * 进 .runtime/knowledge-hits.jsonl；runtimeDir 缺省 = knowledgeDir/../.runtime。
 *
 * CRLF/LF 双容忍：读侧 \r\n 归一解析，写侧按各文件检测到的既有 EOL 回写/追加
 * （uncategorized.md 可能 CRLF，主仓知识文件为 LF）。
 */

import { appendFileSync, existsSync, readFileSync } from 'fs'
import { basename, dirname, join } from 'path'
import { writeAtomicSync } from './fs-atomic.js'
import { appendKnowledgeHit } from './knowledge-hits.js'

// ── 常量与内部工具 ──

// 目标文件（INDEX 相对 POSIX 路径）→ INDEX.md 分类段标题。
// decisions/ 目录按前缀判定为 Decisions；四类之外的目标文件无处落路由行 → unknown_category。
const CATEGORY_SECTIONS = {
  'known-issues.md': 'Known Issues',
  'patterns.md': 'Patterns',
  'conventions.md': 'Conventions',
}

// 标题行 qlId 标注形态：`## ql-20260604-001-7a4c | <标题>` 的首 token
const QL_TOKEN_RE = /^(?:ql|quick)-[a-z0-9][a-z0-9-]*$/i

function escapeRegExp(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function detectEol(content) {
  return content.includes('\r\n') ? '\r\n' : '\n'
}

/**
 * 目标文件路径归一：反斜杠转 POSIX、剥 './' 与冗余 'knowledge/' 前缀（--file 容错）。
 * 'knowledge\known-issues.md' / './known-issues.md' → 'known-issues.md'
 */
function normalizeTargetFile(targetFile) {
  let f = String(targetFile || '').trim().replace(/\\/g, '/')
  if (!f) return ''
  f = f.replace(/^\.\//, '')
  if (f.startsWith('knowledge/')) f = f.slice('knowledge/'.length)
  return f
}

/** 目标文件 → INDEX.md 分类段标题（known-issues/patterns/conventions/decisions 四类，其余 null） */
function categoryForTarget(file) {
  if (/^decisions\//.test(file)) return 'Decisions'
  return CATEGORY_SECTIONS[basename(file)] || null
}

/**
 * 标题分词兜底（--keywords 未显式传时的 keywords 来源，X-005）：
 * 按空白 + Unicode 标点/符号切段（'|' 与 '→' 均 \p{S}/\p{P}，不会泄进关键词），
 * 滤 <2 字符噪音 token，去重封顶 6 个；中文长短语保持整段
 * （keywordMatchesContext 对非 ASCII 关键词用子串匹配，短语可命中）。
 */
function tokenizeTitle(title) {
  return [...new Set(
    String(title || '')
      .split(/[\s\p{P}\p{S}]+/u)
      .map(t => t.trim())
      .filter(t => t.length >= 2)
  )].slice(0, 6)
}

/** keywords 解析：显式传优先（滤空与含 '→'/换行的废值）；缺省/为空 → 标题分词兜底；仍空 → 标题本身 */
function resolveKeywords(keywords, title) {
  const explicit = (Array.isArray(keywords) ? keywords : [keywords])
    .map(k => String(k || '').trim())
    .filter(k => k && !k.includes('→') && !k.includes('\n'))
  if (explicit.length > 0) return explicit
  const tokens = tokenizeTitle(title)
  return tokens.length > 0 ? tokens : [String(title || 'uncategorized')]
}

// ── uncategorized.md 条目解析（双格式寻址底座） ──

/**
 * 解析 uncategorized.md（\r\n 已归一的正文）为条目列表。
 * 条目边界：`^#{2,3}\s+\S` 标题行——与 knowledge.js validate 的计数正则
 * `/^#{2,3}\s+\S/gm` 同口径（h3 形态一并兼容）；h1 行终止当前条目但自身不是条目；
 * h4 归入正文。start/end 为行号区间 [start, end)，end 止于下一标题边界行。
 * @returns {{ start: number, end: number, headingText: string, qlIdPrefix: string|null,
 *             title: string, body: string, text: string }[]}
 */
export function parseUncategorizedEntries(normalizedContent) {
  const lines = normalizedContent.split('\n')
  const boundaryRe = /^#{1,3}\s+\S/
  const entryHeadingRe = /^#{2,3}\s+\S/
  const entries = []
  let cur = null
  for (let i = 0; i < lines.length; i++) {
    if (!boundaryRe.test(lines[i])) continue
    if (cur) { cur.end = i; entries.push(cur); cur = null }
    if (entryHeadingRe.test(lines[i])) {
      cur = { start: i, end: lines.length, headingText: lines[i].replace(/^#{2,3}\s+/, '').trim() }
    }
  }
  if (cur) entries.push(cur)

  for (const e of entries) {
    // 标题行 qlId 前缀剥离：`## ql-xxx | <标题>` → title=`<标题>`；非 ql 形态首 token 不剥
    const m = e.headingText.match(/^(\S+)\s*\|\s*(.*)$/)
    if (m && QL_TOKEN_RE.test(m[1])) {
      e.qlIdPrefix = m[1]
      e.title = m[2].trim() || e.headingText
    } else {
      e.qlIdPrefix = null
      e.title = e.headingText
    }
    e.body = lines.slice(e.start + 1, e.end).join('\n').trim()
    e.text = e.headingText + '\n' + e.body
  }
  return entries
}

/** 三通道寻址：qlId 标题行前缀 → qlId 正文尾注（中文/半角括号）→ titleFallback 模糊（首个命中） */
function locateEntry(entries, qlId, titleFallback) {
  if (qlId) {
    const headingRe = new RegExp(`^${escapeRegExp(qlId)}\\s*\\|`)
    const byHeading = entries.find(e => headingRe.test(e.headingText))
    if (byHeading) return { entry: byHeading, channel: 'ql-heading' }
    const full = `（${qlId}）`
    const half = `(${qlId})`
    const bySuffix = entries.find(e => e.text.includes(full) || e.text.includes(half))
    if (bySuffix) return { entry: bySuffix, channel: 'ql-suffix' }
  }
  if (titleFallback) {
    const needle = String(titleFallback).toLowerCase()
    const byTitle = entries.find(e =>
      e.title.toLowerCase().includes(needle) || e.headingText.toLowerCase().includes(needle))
    if (byTitle) return { entry: byTitle, channel: 'title-fallback' }
  }
  return { entry: null, channel: null }
}

/**
 * INDEX.md 分类段内（或文件末尾新段）插入路由行，返回新的归一正文（'\n' 行尾）。
 * 只增不改既有行；插入点 = 分类段内最后一个非空行之后（段缺失时 EOF 追加 `## <段>` + 行）。
 */
function insertRouteLine(indexNorm, category, routeLine) {
  const lines = indexNorm.split('\n')
  const sectionRe = new RegExp(`^##\\s+${escapeRegExp(category)}\\s*$`, 'i')
  let sectStart = -1
  for (let i = 0; i < lines.length; i++) {
    if (sectionRe.test(lines[i])) { sectStart = i; break }
  }
  if (sectStart < 0) {
    return indexNorm.replace(/\n+$/, '') + `\n\n## ${category}\n${routeLine}\n`
  }
  let lastContent = sectStart
  for (let i = sectStart + 1; i < lines.length; i++) {
    if (/^##\s+\S/.test(lines[i])) break
    if (lines[i].trim() !== '') lastContent = i
  }
  lines.splice(lastContent + 1, 0, routeLine)
  return lines.join('\n')
}

// ── 核心 ──

/**
 * 归类单个 uncategorized 条目到目标知识文件（四步迁移）。
 *
 * @param {object} params
 * @param {string} params.knowledgeDir - knowledge 目录路径
 * @param {string} [params.qlId] - quicklog 条目 ID（标题行前缀 ∪ 正文尾注双格式寻址）
 * @param {string} params.targetFile - 目标知识文件（INDEX 相对，如 'known-issues.md'）
 * @param {string} [params.sectionTitle] - 覆盖落盘条目标题（--section；anchor 随实际标题）
 * @param {string[]} [params.keywords] - INDEX 路由行关键词（缺省按条目标题分词兜底）
 * @param {string} [params.titleFallback] - 无 ql 标注历史条目的模糊匹配兜底（--title）
 * @param {boolean} [params.dryRun] - 只渲染将要发生的变更，不落盘
 * @param {string} [params.runtimeDir] - 审计目录（缺省 knowledgeDir/../.runtime）
 * @returns {{ ok: boolean, moved: boolean, appendedTo: string|null, indexUpdated: boolean,
 *             anchor: string, skippedReason?: string, error?: object,
 *             dryRun?: boolean, title?: string, channel?: string, keywords?: string[], plan?: object }}
 *   moved：真实迁移发生（条目已从 uncategorized 删除；dry-run 恒 false）；
 *   skippedReason='duplicate-title'：目标已含同标题条目，跳过追加只做迁移收尾。
 */
export function classifyUncategorizedEntry({ knowledgeDir, qlId, targetFile, sectionTitle, keywords, titleFallback, dryRun, runtimeDir } = {}) {
  const fail = (code, extra = {}) => ({
    ok: false, moved: false, appendedTo: null, indexUpdated: false, anchor: '',
    error: { code, ...extra },
  })

  // ① 前置校验
  const file = normalizeTargetFile(targetFile)
  if (!knowledgeDir || !existsSync(knowledgeDir)) return fail('knowledge_dir_missing', { path: knowledgeDir || null })
  if (!file) return fail('target_file_required')
  if (!qlId && !titleFallback) return fail('address_required', { message: 'qlId 与 titleFallback 至少传一个' })

  const uncatPath = join(knowledgeDir, 'uncategorized.md')
  if (!existsSync(uncatPath)) return fail('uncategorized_missing', { path: 'knowledge/uncategorized.md' })
  const uncatRaw = readFileSync(uncatPath, 'utf8')
  const uncatEol = detectEol(uncatRaw)
  const uncatNorm = uncatRaw.replace(/\r\n/g, '\n')
  const entries = parseUncategorizedEntries(uncatNorm)

  const { entry, channel } = locateEntry(entries, qlId, titleFallback)
  if (!entry) return fail('entry_not_found', { qlId: qlId || null, titleFallback: titleFallback || null })

  const entryTitle = entry.title || entry.headingText
  const finalTitle = String(sectionTitle || '').trim() || entryTitle
  const anchor = finalTitle // anchor=条目标题机械生成（X-005 / R-03）

  // ② 追加目标知识文件（幂等：同标题条目已存在 → 跳过追加只做迁移收尾）
  const targetPath = join(knowledgeDir, file)
  if (!existsSync(targetPath)) return fail('target_file_missing', { targetFile: file, path: targetPath })
  const targetRaw = readFileSync(targetPath, 'utf8')
  const targetEol = detectEol(targetRaw)
  const dupRe = new RegExp(`^##\\s+${escapeRegExp(finalTitle)}\\s*$`, 'm')
  const duplicate = dupRe.test(targetRaw.replace(/\r\n/g, '\n'))
  let appendBlock = null
  let skippedReason
  if (!duplicate) {
    // 追加块：空行 + `## <标题>` + 空行 + 原文 + 收尾换行（按目标文件既有 EOL）
    const body = entry.body ? entry.body.replace(/\n/g, targetEol) : ''
    appendBlock = ['', `## ${finalTitle}`, '', ...(body ? [body] : []), ''].join(targetEol)
    if (targetRaw && !targetRaw.endsWith('\n')) appendBlock = targetEol + appendBlock
  } else {
    skippedReason = 'duplicate-title'
  }

  // ③ INDEX.md 对应分类段补路由行（不改既有行；同 file#anchor 已路由则不重复加）
  const category = categoryForTarget(file)
  if (!category) return fail('unknown_category', { targetFile: file })
  const indexPath = join(knowledgeDir, 'INDEX.md')
  if (!existsSync(indexPath)) return fail('index_missing', { path: 'knowledge/INDEX.md' })
  const indexRaw = readFileSync(indexPath, 'utf8')
  const indexEol = detectEol(indexRaw)
  const indexNorm = indexRaw.replace(/\r\n/g, '\n')
  const kws = resolveKeywords(keywords, finalTitle)
  const display = `${file}#${anchor}`
  const routeLine = `- ${kws.join('|')} → [${display}](${display})`
  const routeExists = indexNorm.split('\n').some(l => l.includes(`](${display})`))
  const newIndexNorm = routeExists ? null : insertRouteLine(indexNorm, category, routeLine)

  // --dry-run：只渲染将要发生的变更，不落盘（三个知识文件与 hits 审计均零写盘）
  if (dryRun) {
    return {
      ok: true, dryRun: true, moved: false, appendedTo: file, indexUpdated: false,
      anchor, title: finalTitle, channel, keywords: kws,
      skippedReason: skippedReason || undefined,
      plan: {
        appendToTarget: !duplicate,
        targetSectionHeading: `## ${finalTitle}`,
        indexRouteLine: routeExists ? null : routeLine,
        removeFromUncategorized: true,
      },
    }
  }

  // 落盘顺序（约束：先追加后删除，条目不丢内容、可手工搬运 revert）：
  // 目标文件追加（append-only，既有字节不动）→ INDEX 原子写 → uncategorized 删除段原子写
  if (appendBlock !== null) appendFileSync(targetPath, appendBlock, 'utf8')
  if (newIndexNorm !== null) writeAtomicSync(indexPath, newIndexNorm.split('\n').join(indexEol))
  const uncatLines = uncatNorm.split('\n')
  uncatLines.splice(entry.start, entry.end - entry.start)
  writeAtomicSync(uncatPath, uncatLines.join(uncatEol))

  // 归类审计（task-01 KnowledgeHitsAPI；幂等重入同样留痕，skippedReason 随行记录）
  const rt = runtimeDir || join(dirname(knowledgeDir), '.runtime')
  appendKnowledgeHit(rt, {
    type: 'classify',
    qlId: qlId || entry.qlIdPrefix || undefined,
    targetFile: file,
    title: finalTitle,
    channel,
    skippedReason: skippedReason || undefined,
  })

  return {
    ok: true, moved: true, appendedTo: file,
    indexUpdated: newIndexNorm !== null,
    anchor, title: finalTitle, channel, keywords: kws,
    skippedReason: skippedReason || undefined,
  }
}

// ── CLI 入口（形态对齐 src/stages/knowledge.js 的 cmdSearch：JSON 输出 + args.indexOf 解析） ──

function output(ok, data, error) {
  const result = { ok, ...data }
  if (error) result.error = error
  console.log(JSON.stringify(result, null, 2))
}

/**
 * `sillyspec knowledge classify` 子命令入口（stages/knowledge.js 二级路由动态 import 转发）。
 *
 * 用法：classify (--ql <id> | --title <模糊>) --file <目标文件>
 *               [--section <标题>] [--keywords kw1,kw2] [--dry-run]
 * @param {string} dir - 项目根目录
 * @param {string[]} args - 二级路由切掉 'classify' 后的参数
 * @param {object} [opts] - { specDir, runtimeDir }
 */
export async function cmdKnowledgeClassify(dir, args, opts = {}) {
  const base = opts.specDir || join(dir, '.sillyspec')
  const knowledgeDir = join(base, 'knowledge')

  // flag-as-value 防护（坑 knowledge-flag-as-value，2026-09-15 实证）：朴素 indexOf 取值会把
  // 紧随的 flag 当本参数值（--keywords --file known-issues.md → 关键词写成字面量 '--file'
  // 落进 INDEX 路由行，a49e7a5 批量迁移产生 9 条垃圾路由且 validate 放行）。值以 '--' 开头
  // 一律视为漏传，由下方统一报错拦截——不静默降级成标题分词（会掩盖调用方参数错误）。
  const pick = (name) => {
    const i = args.indexOf(name)
    const v = i >= 0 ? args[i + 1] : ''
    return v && !v.startsWith('--') ? v : ''
  }
  const flagAsValue = ['--ql', '--title', '--file', '--section', '--keywords']
    .find(name => {
      const i = args.indexOf(name)
      return i >= 0 && args[i + 1] !== undefined && String(args[i + 1]).startsWith('--')
    })

  if (flagAsValue) {
    output(false, {}, {
      code: 'flag_as_value',
      flag: flagAsValue,
      message: `${flagAsValue} 的值缺失（后随 token 是 flag，不能作值）——请补参数值后重跑`,
    })
    return
  }
  const qlId = pick('--ql')
  const targetFile = pick('--file')
  const sectionTitle = pick('--section')
  const keywordsRaw = pick('--keywords')
  const titleFallback = pick('--title')
  const dryRun = args.includes('--dry-run')

  if (!qlId && !titleFallback) {
    output(false, {}, '--ql or --title is required')
    return
  }
  if (!targetFile) {
    output(false, {}, '--file is required')
    return
  }
  const keywords = keywordsRaw
    ? keywordsRaw.split(/[,，]/).map(s => s.trim()).filter(Boolean)
    : undefined

  const result = classifyUncategorizedEntry({
    knowledgeDir,
    qlId,
    targetFile,
    sectionTitle,
    keywords,
    titleFallback,
    dryRun,
    runtimeDir: opts.runtimeDir || join(base, '.runtime'),
  })

  if (result.ok) {
    output(true, result)
  } else {
    output(false, {
      moved: result.moved,
      appendedTo: result.appendedTo,
      indexUpdated: result.indexUpdated,
      anchor: result.anchor,
    }, result.error)
  }
}

/**
 * `sillyspec knowledge inbox` 子命令——知识收件箱按需视图（2026-09-23 知识可见性 quick）。
 *
 * 背景：uncategorized 待审条目与 quick 资产尾蒸馏产出此前只落文件、不在聊天面露头，
 * 用户全程无感（2026-09-23 用户反馈「聊天过程中完全不知道」）。收件箱给出待审清单
 * （标题 + ql 前缀 + 一行摘要）与基线状态；--json 结构化供面板/脚本消费。纯读零副作用。
 */
export async function cmdKnowledgeInbox(dir, args, opts = {}) {
  const base = opts.specDir || join(dir, '.sillyspec')
  const knowledgeDir = join(base, 'knowledge')
  const wantJson = args.includes('--json')
  const uncPath = join(knowledgeDir, 'uncategorized.md')
  let entries = []
  if (existsSync(uncPath)) {
    entries = parseUncategorizedEntries(readFileSync(uncPath, 'utf8').replace(/\r\n/g, '\n'))
  }
  let baseline = null
  try {
    const bp = join(base, 'knowledge-baseline')
    if (existsSync(bp)) {
      const n = parseInt(readFileSync(bp, 'utf8').trim(), 10)
      if (Number.isFinite(n) && n >= 0) baseline = n
    }
  } catch { /* 基线读失败按未启用 */ }
  const over = baseline !== null && entries.length > baseline
  const items = entries.map((e) => ({
    title: e.title,
    qlId: e.qlIdPrefix || null,
    summary: String(e.body || '').replace(/\s+/g, ' ').slice(0, 80),
  }))
  if (wantJson) {
    output(true, { inbox: { count: entries.length, baseline, over, items } })
    return
  }
  if (entries.length === 0) {
    console.log('📚 知识收件箱：空——uncategorized 无待审条目')
    return
  }
  console.log(`📚 知识收件箱：待审 ${entries.length} 条${baseline !== null ? `（基线 ${baseline}${over ? '，已超 ⚠️' : ''}）` : ''}`)
  items.forEach((it, i) => {
    console.log(`  ${i + 1}. 《${it.title}》${it.qlId ? `（${it.qlId}）` : ''}`)
    if (it.summary) console.log(`     ${it.summary}`)
  })
  console.log('   归类：sillyspec knowledge classify --title "…" --file conventions|patterns|known-issues.md')
}
