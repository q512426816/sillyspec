/**
 * knowledge.js — agent-safe knowledge 管理命令
 *
 * 设计原则：
 * - 所有输出为 JSON（--json 是默认行为，不需要显式传）
 * - agent 可安全调用，不打开编辑器，不直接覆盖人工区
 * - 失败有明确错误码
 *
 * 子命令：
 *   search   — 关键词搜索知识库
 *   inspect  — 读取单条知识详情
 *   validate — 校验知识库完整性
 *   refresh  — 从 scan 文档刷新自动知识（仅写 generated/）
 *   propose  — 提议新知识（写入 proposed/）
 *   classify — 归类 uncategorized 条目到目标知识文件（动态 import src/knowledge-classify.js，task-02 交付）
 *   stats    — 命中矩阵聚合与死重对照（动态 import src/knowledge-stats.js，task-05 交付）
 */

import { existsSync, readFileSync, readdirSync, mkdirSync, statSync } from 'fs'
import { join, basename, dirname } from 'path'
import { writeAtomicSync } from '../fs-atomic.js'
import { parseKnowledgeIndex, keywordMatchesContext, normalizeAnchorForCompare } from '../knowledge-match.js'
import { matchKnowledgeHybrid, resultChannel } from '../knowledge-vector.js'

// ── 工具函数 ──

function resolveKnowledgeDir(dir, specDir) {
  const base = specDir || join(dir, '.sillyspec')
  return join(base, 'knowledge')
}

function output(ok, data, error) {
  const result = { ok, ...data }
  if (error) result.error = error
  console.log(JSON.stringify(result, null, 2))
}

/**
 * 从文件路径生成知识 ID
 * knowledge/conventions.md → conventions
 * knowledge/generated/patterns.md → generated/patterns
 */
function pathToId(basePath, knowledgeDir) {
  let rel = basePath
  if (rel.startsWith(knowledgeDir + '/')) rel = rel.slice(knowledgeDir.length + 1)
  if (rel.endsWith('.md')) rel = rel.slice(0, -3)
  return rel
}

/**
 * 从知识条目提取摘要（取第一段非空非标题文本）
 */
function extractSummary(content, maxLen = 120) {
  const lines = content.split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue
    if (trimmed.startsWith('#')) continue
    if (trimmed.startsWith('---')) continue
    if (trimmed.startsWith('author:') || trimmed.startsWith('created_at:')) continue
    if (trimmed.startsWith('>')) continue
    if (trimmed.startsWith('<!--')) continue
    return trimmed.slice(0, maxLen) + (trimmed.length > maxLen ? '...' : '')
  }
  return ''
}

/**
 * 提取文件标题（第一个 # 标题）
 */
function extractTitle(content) {
  const match = content.match(/^#\s+(.+)$/m)
  return match ? match[1].trim() : ''
}

// ── search ──

// 位置参数取词（2026-11-04-knowledge-search-positional）：--query 缺失时取首个非 flag
// 且非 flag 值的 token 作查询词（AGENTS.md 模板形态 search "<关键词>"）。跳过 '--' 开头
// token 与 --limit 的值 token——防 ['--limit','2'] 的 '2' 被误拾；flag 字面量永不入查询词
// （flag-as-value 坑语义保持：--query 后跟 flag 仍按缺参，不从残参里捡词）。
function positionalQuery(args) {
  for (let i = 0; i < args.length; i++) {
    const a = args[i]
    if (a === '--limit') { i += 1; continue }
    if (a.startsWith('--')) continue
    return a
  }
  return ''
}

export async function cmdSearch(dir, args, opts = {}) {
  const knowledgeDir = resolveKnowledgeDir(dir, opts.specDir)
  // flag-as-value 防护（坑 knowledge-flag-as-value）：值以 '--' 开头视为漏传（只读命令，
  // 按缺参处理落入既有 required 校验/默认值，不静默拿 flag 字面量当查询词）
  const queryIdx = args.indexOf('--query')
  const queryRaw = queryIdx >= 0 ? args[queryIdx + 1] : ''
  // --query 优先（显式压过位置推断）；缺失时回退位置参数形态
  const query = (queryRaw && !queryRaw.startsWith('--') ? queryRaw : '') || positionalQuery(args)
  const limitIdx = args.indexOf('--limit')
  const limitRaw = limitIdx >= 0 ? args[limitIdx + 1] : ''
  const parsedLimit = limitRaw && !limitRaw.startsWith('--') ? parseInt(limitRaw, 10) : NaN
  const limit = Number.isInteger(parsedLimit) && parsedLimit > 0 ? parsedLimit : 10

  if (!query) {
    output(false, {}, '--query is required')
    return
  }

  if (!existsSync(knowledgeDir)) {
    output(false, {}, { code: 'knowledge_dir_missing', path: knowledgeDir })
    return
  }

  // 已修复条目显式包含（FR-03，2026-11-02-knowledge-rank-denoise）——默认排除
  const includeResolved = args.includes('--include-resolved')

  // 复用 knowledge-match 引擎（三层 hybrid：路由→平台向量→本地词片，2026-09-29-knowledge-vector-recall）
  const result = await matchKnowledgeHybrid(knowledgeDir, query, { cwd: dir, includeResolved })

  // 向量开关发现性提示（2026-10-15-vector-switch-discoverability）：平台已连接+开关未开
  // （缺省关）→ hint 键（vectorSwitchHint 单源，flow 注入零命中行同款文案）；其余空串零输出。
  let vectorHint = ''
  try {
    const { vectorSwitchHint } = await import('../knowledge-vector.js')
    vectorHint = vectorSwitchHint(dir)
  } catch { /* 提示 fail-open */ }

  // 停车场过滤披露（FR-01，2026-10-21-knowledge-tier-denoise）：查询命中过 unmapped 停车场
  // 文件但被检索核心滤除且最终零结果时，披露被滤文件——去噪不丢可见性，人工按需直查。
  const parkingFiltered = !result.matched && Array.isArray(result.json && result.json.parkingFiltered)
    ? result.json.parkingFiltered : []
  const payload = buildSearchPayload(result, knowledgeDir, limit, query)

  // search 面遥测（FR-05，2026-11-05-knowledge-search-observability）：显式检索此前零落盘
  // ——查询形态/命中率/通道分布是向量层调优（地板值/词表收录）的唯一数据源。fail-soft：
  // 落盘失败不影响检索输出（R-04 纪律）；stats 按 type 严格过滤，type=search 不进既有视图。
  try {
    const { appendKnowledgeHit } = await import('../knowledge-hits.js')
    appendKnowledgeHit(join(dirname(knowledgeDir), '.runtime'), {
      type: 'search',
      query,
      matched: Boolean(result && result.matched),
      channel: resultChannel(result),
      entry_count: (payload.matches || []).length,
      matchedFiles: (payload.matches || []).map((m) => m.id).slice(0, 12),
    })
  } catch { /* 遥测 fail-soft（R-04） */ }

  output(true, {
    query,
    ...payload,
    ...(vectorHint ? { hint: vectorHint } : {}),
    ...(parkingFiltered.length > 0
      ? { parkingFiltered, parkingNote: `停车场文件已过滤（${parkingFiltered.join('、')}）——按需直查文件` }
      : {}),
  })
}

/**
 * search 面输出载荷（matches + routeHits + 已修复披露）——生产与评测共用单一构造。
 * routeHits 承载 fr/decisions 路由行指针：FR-04 要求 search 消费面不静默丢失 implemented
 * 决策/FR 可见性（entries 已移出路由行，只命中路由行的查询不能返回空 matches 了事）。
 */
export function buildSearchPayload(result, knowledgeDir, limit, query) {
  const matches = result && result.matched ? buildSearchMatches(result, knowledgeDir, limit, query) : []
  const routeHits = ((result && result.routeHits) || []).map(e => ({
    file: e.file,
    anchor: e.anchor || '',
    category: e.category || '',
  }))
  const resolvedFiltered = Array.isArray(result && result.json && result.json.resolvedFiltered)
    ? result.json.resolvedFiltered : []
  return {
    matches,
    ...(routeHits.length > 0
      ? { routeHits, routeNote: '决策/FR 路由命中（专用通道，按需 Read）' }
      : {}),
    ...(resolvedFiltered.length > 0
      ? { resolvedFiltered, resolvedNote: `已修复条目已过滤（${resolvedFiltered.join('、')}）——需查看加 --include-resolved` }
      : {}),
  }
}

/**
 * 检索结果 → search 面展示行（title/summary 增强 + 命中数评分）。
 * 导出为单一源：cmdSearch 与评测适配层（eval/knowledge）共用同一构造。
 * score = tags 中实际命中 query 的标签数（keywordMatchesContext 同一判定）——关键词表长
 * 不再冒充命中数（2026-11-02-knowledge-rank-denoise FR-01）。
 * channel 标明命中通道：routing（INDEX 路由）/ fallback（词片回退）/ vector / scope。
 */
export function buildSearchMatches(result, knowledgeDir, limit, query) {
  const ctx = String(query || '').toLowerCase()
  const channel = resultChannel(result)
  return result.entries.slice(0, limit).map((entry) => {
    const filePath = join(knowledgeDir, entry.file)
    let title = entry.display
    let summary = ''

    if (existsSync(filePath)) {
      const content = readFileSync(filePath, 'utf8')
      title = extractTitle(content) || entry.display
      summary = extractSummary(content)
    }

    const tags = entry.keywords
    // 向量通道透出真实余弦分（FR-03，2026-11-05-knowledge-search-observability）：
    // keywords∩query 对 vector 通道恒 0（keywords=['vector'] 非查询词）——错值不只是缺值；
    // vectorScore 由 buildResultFromPlatform 挂文件级最高分。其余通道 score 口径不变。
    const vectorScore = channel === 'vector' && typeof entry.vectorScore === 'number' ? entry.vectorScore : null
    return {
      id: pathToId(entry.file, knowledgeDir),
      path: join('knowledge', entry.file),
      title,
      summary,
      score: vectorScore !== null ? Math.round(vectorScore * 1000) / 1000 : tags.filter((k) => keywordMatchesContext(k, ctx)).length,
      tags,
      channel,
      category: entry.category,
    }
  })
}

// ── inspect ──

export async function cmdInspect(dir, args, opts = {}) {
  const knowledgeDir = resolveKnowledgeDir(dir, opts.specDir)
  // flag-as-value 防护同 cmdSearch（坑 knowledge-flag-as-value）
  const idIdx = args.indexOf('--id')
  const idRaw = idIdx >= 0 ? args[idIdx + 1] : ''
  const id = idRaw && !idRaw.startsWith('--') ? idRaw : ''

  if (!id) {
    output(false, {}, '--id is required')
    return
  }

  if (!existsSync(knowledgeDir)) {
    output(false, {}, { code: 'knowledge_dir_missing', path: knowledgeDir })
    return
  }

  // ID → 文件路径：conventions → knowledge/conventions.md
  // generated/patterns → knowledge/generated/patterns.md
  const filePath = join(knowledgeDir, id + '.md')

  if (!existsSync(filePath)) {
    output(false, {}, { code: 'not_found', id, path: filePath })
    return
  }

  const content = readFileSync(filePath, 'utf8')
  const title = extractTitle(content)
  const summary = extractSummary(content)

  // 元数据
  const meta = {}
  const authorMatch = content.match(/^author:\s*(.+)$/m)
  const createdAtMatch = content.match(/^created_at:\s*(.+)$/m)
  if (authorMatch) meta.author = authorMatch[1].trim()
  if (createdAtMatch) meta.created_at = createdAtMatch[1].trim()

  // 文件修改时间
  const stat = statSync(filePath)
  meta.updated_at = stat.mtime.toISOString()

  // 分区检测
  let zone = 'manual'
  if (id.startsWith('generated/')) zone = 'generated'
  else if (id.startsWith('proposed/')) zone = 'proposed'

  output(true, {
    entry: {
      id,
      title,
      summary,
      zone,
      path: join('knowledge', id + '.md'),
      meta,
      body: content,
    }
  })
}

// ── validate ──

export async function cmdValidate(dir, args, opts = {}) {
  const knowledgeDir = resolveKnowledgeDir(dir, opts.specDir)
  const errors = []
  const warnings = []

  if (!existsSync(knowledgeDir)) {
    output(false, { errors, warnings }, { code: 'knowledge_dir_missing', path: knowledgeDir })
    return
  }

  // 1. INDEX.md 存在
  const indexPath = join(knowledgeDir, 'INDEX.md')
  if (!existsSync(indexPath)) {
    errors.push({ code: 'missing_index', path: 'knowledge/INDEX.md' })
  } else {
    // 2. INDEX.md 引用的文件是否存在
    const entries = parseKnowledgeIndex(knowledgeDir)
    for (const entry of entries) {
      const refPath = join(knowledgeDir, entry.file)
      if (!existsSync(refPath)) {
        errors.push({
          code: 'broken_reference',
          path: join('knowledge', entry.file),
          referenced_in: 'INDEX.md',
          display: entry.display,
        })
      }
    }

    // 2c. 路由行锚点与目标文件标题的一致性（坑 knowledge-hits-anchor-drift T4，2026-09-25
    // 实证：INDEX 锚点与文件标题静默漂移——标题事后被改/emoji 前缀/点号差异使命中落空成
    // 「幽灵锚」，平台知识页不计覆盖）。容错归一比对（剥 emoji/点号/斜杠/中划线/空白 +
    // 小写 + 截断前缀容忍），**不**引入第四套严格 slug 规则（T2 单一源方向是平台侧归一，
    // 此处只做告警不参与命中判定）；漂移只告警不报错（INDEX 手写面，修复由人拍板）。
    for (const entry of entries) {
      if (!entry.anchor) continue
      const refPath = join(knowledgeDir, entry.file)
      if (!existsSync(refPath)) continue // broken_reference 已报，不重复
      const headings = []
      try {
        const content = readFileSync(refPath, 'utf8')
        for (const m of content.matchAll(/^#{1,6}\s+(.+?)\s*$/gm)) headings.push(m[1])
      } catch { /* 读失败留给上层报 */ }
      const target = normalizeAnchorForCompare(entry.anchor)
      if (!target || headings.length === 0) continue
      const hit = headings.some((h) => {
        const hn = normalizeAnchorForCompare(h)
        if (!hn) return false
        if (hn === target) return true
        // 截断容忍（锚点生成侧有 60 字符截断）：短的一方是长方前缀即视为同源
        const [shorter, longer] = hn.length <= target.length ? [hn, target] : [target, hn]
        return shorter.length >= 6 && longer.startsWith(shorter)
      })
      if (!hit) {
        warnings.push({
          code: 'anchor_drift',
          path: join('knowledge', entry.file),
          anchor: entry.anchor,
          display: entry.display,
          hint: '路由行锚点在目标文件无对应标题（标题已改或锚点生成规则漂移）——命中会落空成幽灵锚，按文件现标题修正 INDEX 路由行',
        })
      }
    }

    // 2b. flag 形态关键词（坑 knowledge-flag-as-value）：classify 曾把 flag-as-value 的
    // 字面量 '--file' 写进路由行——目标文件存在、行格式合法，既有检查放行，此处补侦测
    for (const entry of entries) {
      const flagKw = entry.keywords.find(kw => kw.startsWith('--'))
      if (flagKw) {
        warnings.push({
          code: 'flag_like_keyword',
          path: 'knowledge/INDEX.md',
          display: entry.display,
          keyword: flagKw,
        })
      }
    }
  }

  // 3. 扫描所有 .md 文件，检查是否在 INDEX 中注册
  const allMdFiles = scanMdFiles(knowledgeDir, '')
  const indexedFiles = new Set(
    parseKnowledgeIndex(knowledgeDir).map(e => e.file)
  )

  for (const mdFile of allMdFiles) {
    if (mdFile === 'INDEX.md') continue
    // generated/ 和 proposed/ 区不强制要求 INDEX 注册；uncategorized.md 是暂存区（条目归类即迁出，语义上永不注册 INDEX）
    if (mdFile.startsWith('generated/') || mdFile.startsWith('proposed/') || mdFile === 'uncategorized.md') continue
    if (!indexedFiles.has(mdFile)) {
      warnings.push({
        code: 'unregistered_file',
        path: join('knowledge', mdFile),
      })
    }
  }

  // 4. uncategorized.md 条目数（多了提示需清理）。条目行契约是 `## <qlId> | <标题>`
  //（quick 自动候选与手工条目同格式），h3 形态一并兼容；原 `^###` 只数 h3 恒为 0
  const uncategorizedPath = join(knowledgeDir, 'uncategorized.md')
  if (existsSync(uncategorizedPath)) {
    const content = readFileSync(uncategorizedPath, 'utf8')
    const entryCount = (content.match(/^#{2,3}\s+\S/gm) || []).length
    if (entryCount >= 10) {
      warnings.push({
        code: 'too_many_uncategorized',
        count: entryCount,
        path: 'knowledge/uncategorized.md',
      })
    }
  }

  // 5. 空文件检测
  for (const mdFile of allMdFiles) {
    if (mdFile === 'INDEX.md') continue
    const fullPath = join(knowledgeDir, mdFile)
    const content = readFileSync(fullPath, 'utf8')
    if (content.trim().length === 0) {
      errors.push({
        code: 'empty_file',
        path: join('knowledge', mdFile),
      })
    }
  }

  output(errors.length === 0, { errors, warnings })
}

// ── refresh ──

export async function cmdRefresh(dir, args, opts = {}) {
  // generated 切块退役（2026-11-07-knowledge-generated-retire）：双仓审计实证切块镜像为
  // 零消费死区（INDEX 零引用、检索四层零进语料、自带 INDEX 零读取方）且是双源漂移源
  // （平台仓同事实矛盾实证）——scan 文档本体在 docs 下项目 scan 目录，保留为唯一真相源，
  // 切块产物退出知识库。子命令入口保留防脚本断链，行为=废弃提示零写盘。
  const knowledgeDir = resolveKnowledgeDir(dir, opts.specDir)
  output(true, {
    deprecated: true,
    message: 'knowledge refresh 已退役（2026-11-07-knowledge-generated-retire）：generated 切块为死区已退库。scan 文档本体在 docs 下的项目 scan 目录，由 scan 流程维护；知识沉淀走 propose → 用户确认后 accept 合并。',
    knowledge_dir: knowledgeDir,
  })
}
// ── propose ──

export async function cmdPropose(dir, args, opts = {}) {
  const knowledgeDir = resolveKnowledgeDir(dir, opts.specDir)
  const proposedDir = join(knowledgeDir, 'proposed')

  const titleIdx = args.indexOf('--title')
  const title = titleIdx >= 0 && args[titleIdx + 1] ? args[titleIdx + 1] : ''
  const categoryIdx = args.indexOf('--category')
  const category = categoryIdx >= 0 && args[categoryIdx + 1] ? args[categoryIdx + 1] : 'uncategorized'
  const bodyIdx = args.indexOf('--body')
  const body = bodyIdx >= 0 && args[bodyIdx + 1] ? args[bodyIdx + 1] : ''
  // --body-file 文件正文通道（2026-11-06-knowledge-propose-body-file）：中文长正文
  // 经命令行 argv 传递会被策略层分词误杀（「斜杠+中文标点」序列误判路径，2026-11-06
  // 平台会话双 shell 实证），文件通道彻底绕开 argv。相对路径按进程 cwd 解析
  // （readFileSync 直读，不做 specDir 拼接）。
  const bodyFileIdx = args.indexOf('--body-file')
  const bodyFile = bodyFileIdx >= 0 && args[bodyFileIdx + 1] ? args[bodyFileIdx + 1] : ''
  let bodyFromFile = ''
  const fromIdx = args.indexOf('--from')
  const from = fromIdx >= 0 && args[fromIdx + 1] ? args[fromIdx + 1] : ''

  if (!title) {
    output(false, {}, '--title is required')
    return
  }

  // 三类参数错误先于 mkdirSync/writeAtomicSync——错误路径零目录创建零落盘。
  // 互斥按 flag 在场判定（值缺省同算同给，报冲突优于静默择一）。
  if (bodyFileIdx >= 0 && bodyIdx >= 0) {
    output(false, {}, {
      code: 'body_source_conflict',
      message: '--body 与 --body-file 互斥，只能提供一个正文来源',
    })
    return
  }
  if (bodyFileIdx >= 0) {
    if (!bodyFile || bodyFile.startsWith('--')) {
      output(false, {}, '--body-file requires a path')
      return
    }
    if (!existsSync(bodyFile)) {
      output(false, {}, { code: 'body_file_missing', path: bodyFile })
      return
    }
    try {
      // 文件通道逐字快照读：空文件落空正文（不走 argv 通道的 '(no body provided)'
      // 兜底——FR-01 落盘与源文件一致）
      bodyFromFile = readFileSync(bodyFile, 'utf8')
    } catch (err) {
      output(false, {}, {
        code: 'body_file_read_failed',
        path: bodyFile,
        reason: String((err && err.message) || err),
      })
      return
    }
  }
  const hasBodyFile = bodyFileIdx >= 0
  const bodyText = hasBodyFile ? bodyFromFile : body

  mkdirSync(proposedDir, { recursive: true })

  // 生成 slug
  const slug = title.toLowerCase()
    .replace(/[^\w\u4e00-\u9fff]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60)

  const fileName = `${slug}.md`
  const propPath = join(proposedDir, fileName)
  const isNew = !existsSync(propPath)

  const content = [
    '---',
    `proposed_at: ${new Date().toISOString()}`,
    `category: ${category}`,
    ...(from ? [`source: ${from}`] : []),
    'status: pending_review',
    '---',
    '',
    `# ${title}`,
    '',
    // argv 通道保持既有空兜底；文件通道逐字（空即空，见上方读取处注释）
    hasBodyFile ? bodyText : (bodyText || '(no body provided)'),
    '',
    '---',
    '> This is a proposed knowledge entry. Review and merge into manual/ or generated/.',
  ].join('\n')

  writeAtomicSync(propPath, content)

  output(true, {
    id: `proposed/${slug}`,
    path: `knowledge/proposed/${fileName}`,
    title,
    category,
    new: isNew,
    action: isNew ? 'created' : 'updated',
  })
}

// ── 辅助函数 ──

function scanMdFiles(baseDir, prefix) {
  const results = []
  const items = readdirSync(baseDir, { withFileTypes: true })
  for (const item of items) {
    const rel = prefix ? `${prefix}/${item.name}` : item.name
    if (item.isDirectory()) {
      results.push(...scanMdFiles(join(baseDir, item.name), rel))
    } else if (item.name.endsWith('.md')) {
      results.push(rel)
    }
  }
  return results
}

function extractSections(content) {
  const lines = content.split('\n')
  const sections = []
  let currentHeading = null
  let currentLines = []
  let currentBody = []

  for (const line of lines) {
    if (line.startsWith('## ')) {
      if (currentHeading) {
        sections.push({
          heading: currentHeading,
          body: currentBody.join('\n').trim(),
          lines: currentLines.length,
        })
      }
      currentHeading = line.slice(3).trim()
      currentLines = [line]
      currentBody = []
    } else if (currentHeading) {
      currentLines.push(line)
      // 跳过 frontmatter 和标题行
      if (!line.startsWith('---') && !line.startsWith('#')) {
        currentBody.push(line)
      }
    }
  }

  if (currentHeading) {
    sections.push({
      heading: currentHeading,
      body: currentBody.join('\n').trim(),
      lines: currentLines.length,
    })
  }

  return sections.filter(s => s.lines >= 3)
}

// ── 入口路由 ──

/**
 * 动态加载 classify / stats 子命令实现（2026-09-14-knowledge-loop-close）。
 *
 * 实现文件由 Wave 2/3 的 task-02（src/knowledge-classify.js）/ task-05（src/knowledge-stats.js）交付，
 * 落地前可能缺席——静态 import 会断链整个 knowledge 命令，故循 index.js case 'knowledge'
 * 先例用动态 import；模块缺席时返回 null 由调用方输出友好错误，其余异常照抛。
 * 实现侧须导出 CLI 入口 cmdKnowledgeClassify / cmdKnowledgeStats(dir, args, opts)，
 * 形态对齐本文件 cmdSearch 等既有子命令。
 *
 * 遥测底座：两命令的归类/命中审计统一经 src/knowledge-hits.js 的
 * appendKnowledgeHit / readKnowledgeHits（KnowledgeHitsAPI 契约，task-02/04/05 消费）。
 */
async function tryImportSubcommandImpl(importPath, moduleName) {
  try {
    return await import(importPath)
  } catch (err) {
    if (err && err.code === 'ERR_MODULE_NOT_FOUND' && String(err.message || '').includes(moduleName)) {
      return null
    }
    throw err
  }
}

/**
 * @param {string[]} args - filteredArgs.slice(1)（去掉 'knowledge'）
 * @param {string} dir - 项目根目录
 * @param {object} opts - { specDir }
 */
export async function cmdKnowledge(args, dir, opts = {}) {
  // --help/-h 全局拦截（坑：探索型调用 knowledge refresh --help 被当默认参数直接执行
  // ——cmdRefresh 无参即全量重写 generated/，副作用写 34 文件。帮助请求在任何子命令
  // 前消化，危险面子命令不再被误触发）。
  if (args.includes('--help') || args.includes('-h')) {
    const lines = [
      '用法: sillyspec knowledge <子命令> [参数]',
      '',
      '子命令:',
      '  search "<关键词>"     检索知识库（--query 等效；命中自动注入 prompt 的同源面）',
      '  inspect <文件>        查看单个知识文件条目结构',
      '  validate              校验知识库完整性（INDEX 锚点/注册/幽灵条目——纯读）',
      '  digest                治理信号卡（rot/伪域/坏绑定——纯读）',
      '  scope                 知识注入作用域现状与标记语法（always/repo/module/关键词；纯读）',
      '  stats                 覆盖率/死条目统计（纯读）',
      '  refresh               （已退役 2026-11-07）generated 切块死区退库——零写盘废弃提示；scan 本体由 scan 流程维护',
      '  propose --title "..." [--body "<文本>" | --body-file <路径>] [--category <名>] [--from <来源>]   提议新知识（长中文正文用 --body-file 从文件读正文，绕开命令行传参）',
      '  accept --id proposed/<slug> [--file <目标>] [--dry-run]   合并待审提议为正式知识（用户确认后执行；category 有效时可省 --file 自动路由）',
      '  renumber [--dry-run|--apply]  存量决策号迁移为全局号（dry-run 先行；apply 写盘幂等）',
      '  redomain-unmapped [--face decisions|fr] [--apply]  unmapped 停车场存量批量清偿（文件锚/覆盖面投票目标域；dry-run 先行）',
      '  distill-backfill [--apply] [--change <名>]  对已归档变更完整重跑决策蒸馏（蒸馏规则变更后的存量回填；dry-run 先行）',
      '',
      '写盘面子命令（refresh/propose/classify）先跑同名只读命令确认现状；探索用法先看本帮助。',
    ]
    for (const l of lines) console.log(l)
    output(true, { help: true, subcommands: ['search', 'inspect', 'validate', 'digest', 'refresh', 'propose', 'accept', 'classify', 'inbox', 'graph', 'stats', 'scope', 'redomain-unmapped', 'distill-backfill'] })
    return
  }
  const subCommand = args[0] || ''

  switch (subCommand) {
    case 'search':
      return cmdSearch(dir, args.slice(1), opts)
    case 'inspect':
      return cmdInspect(dir, args.slice(1), opts)
    case 'validate':
      return cmdValidate(dir, args.slice(1), opts)
    case 'refresh':
      return cmdRefresh(dir, args.slice(1), opts)
    case 'propose':
      return cmdPropose(dir, args.slice(1), opts)
    case 'accept': {
      // 待审知识收口（2026-11-07-knowledge-accept-channel）：合并 proposed 条目到正式知识
      // 文件——动态 import 同 classify 先例（实现缺席返回友好错误）。
      const mod = await tryImportSubcommandImpl('../knowledge-classify.js', 'knowledge-classify.js')
      if (!mod || typeof mod.cmdKnowledgeAccept !== 'function') {
        output(false, {}, {
          code: 'not_implemented',
          subcommand: 'accept',
          message: '实现未落地（src/knowledge-classify.js cmdKnowledgeAccept）',
        })
        return
      }
      return mod.cmdKnowledgeAccept(dir, args.slice(1), opts)
    }
    case 'redomain-unmapped': {
      // unmapped 停车场存量批量清偿（FR-04，2026-10-21-knowledge-tier-denoise）：decisions 按文件锚
      // / fr 按来源变更覆盖面投票目标域；缺省 dry-run 报告先行，--apply 幂等迁移（不裸删、冲突跳过）。
      const mod = await tryImportSubcommandImpl('../redomain-unmapped.js', 'redomain-unmapped.js')
      if (!mod || typeof mod.cmdRedomainUnmapped !== 'function') {
        output(false, {}, { code: 'not_implemented', subcommand: 'redomain-unmapped' })
        return
      }
      return mod.cmdRedomainUnmapped(dir, args.slice(1), opts)
    }
    case 'distill-backfill': {
      // 存量决策回填（FR-04，2026-11-12-freeze-decision-recall）：蒸馏入选规则变更后，
      // 已归档变更不会自动重蒸——本命令走 full 模式完整蒸馏，幂等键=号+变更（重跑零漂移）。
      const mod = await tryImportSubcommandImpl('../archive-baseline-replay.js', 'archive-baseline-replay.js')
      if (!mod || typeof mod.cmdDistillBackfill !== 'function') {
        output(false, {}, { code: 'not_implemented', subcommand: 'distill-backfill' })
        return
      }
      return mod.cmdDistillBackfill(dir, args.slice(1), opts)
    }
    case 'graph': {
      // 知识图谱查询面（2026-10-08-knowledge-graph）：neighbors/path/impact/orphans/dangling，
      // --edges 边型筛选；全 JSON 出口（与 search/validate 同族）。
      const mod = await tryImportSubcommandImpl('../knowledge-graph.js', 'knowledge-graph.js')
      if (!mod || typeof mod.cmdKnowledgeGraph !== 'function') {
        output(false, {}, { code: 'not_implemented', subcommand: 'graph' })
        return
      }
      return mod.cmdKnowledgeGraph(dir, args.slice(1), opts)
    }
    case 'classify': {
      const mod = await tryImportSubcommandImpl('../knowledge-classify.js', 'knowledge-classify.js')
      if (!mod || typeof mod.cmdKnowledgeClassify !== 'function') {
        output(false, {}, {
          code: 'not_implemented',
          subcommand: 'classify',
          message: '实现未落地（task-02 交付 src/knowledge-classify.js）',
        })
        return
      }
      return mod.cmdKnowledgeClassify(dir, args.slice(1), opts)
    }
    case 'inbox': {
      // 知识收件箱（2026-09-23 可见性 quick）：uncategorized 待审清单+基线状态按需视图，
      // --json 结构化。纯读零副作用——配套 quick --done/归档收尾的收件箱横幅（complete-handlers）。
      const mod = await tryImportSubcommandImpl('../knowledge-classify.js', 'knowledge-classify.js')
      if (!mod || typeof mod.cmdKnowledgeInbox !== 'function') {
        output(false, {}, { code: 'not_implemented', subcommand: 'inbox' })
        return
      }
      return mod.cmdKnowledgeInbox(dir, args.slice(1), opts)
    }
    case 'stats': {
      const mod = await tryImportSubcommandImpl('../knowledge-stats.js', 'knowledge-stats.js')
      if (!mod || typeof mod.cmdKnowledgeStats !== 'function') {
        output(false, {}, {
          code: 'not_implemented',
          subcommand: 'stats',
          message: '实现未落地（task-05 交付 src/knowledge-stats.js）',
        })
        return
      }
      return mod.cmdKnowledgeStats(dir, args.slice(1), opts)
    }
    case 'scope': {
      // 知识注入作用域发现面（2026-10-23-knowledge-scope-discoverability）：机制 2026-10-23-
      // knowledge-scope-inject 落地但零发现面（用户追问「在哪引导配置」）——本命令列四档现状+
      // 标记语法教学（示例与 collectScopedKnowledge 解析同源），空态明示仅关键词档在用。
      // 纯读零写盘；--json 单对象供程序化消费。
      try {
        const { collectScopedKnowledge } = await import('../knowledge-scope.js')
        const knowledgeDir = resolveKnowledgeDir(dir, opts.specDir)
        const scoped = collectScopedKnowledge(knowledgeDir)
        const moduleEntries = Object.entries(scoped.modules)
        const total = new Set([...scoped.always, ...scoped.repo, ...moduleEntries.flatMap(([, v]) => v)].map((e) => e.id)).size
        const guide = [
          '作用域标记（HTML 注释，写在 top-level knowledge/<文件>.md 的 section heading 之下；无标记=关键词命中现状）：',
          '  <!-- scope: always -->              每次变更恒注入（跨仓通用规约）',
          '  <!-- scope: repo -->                本仓每次变更恒注入（仓级约束）',
          '  <!-- scope: module:<域>[,<域>] -->   仅当触达该知识域时注入（域 id 与 FR 域同源，逗号多域）',
          '查看现状：sillyspec knowledge scope；flow start 注入块中以 📌 行呈现；机制变更：2026-10-23-knowledge-scope-inject',
        ]
        if (opts.json || args.slice(1).includes('--json')) {
          output(true, { subcommand: 'scope', ...scoped, total, guide })
        } else {
          console.log(`🧭 知识注入作用域现状（${total} 条 scoped；关键词档始终生效）`)
          if (scoped.always.length > 0) {
            console.log('  always（每次变更恒注入）：')
            for (const e of scoped.always) console.log(`    - ${e.id}：${e.summary}`)
          }
          if (scoped.repo.length > 0) {
            console.log('  repo（本仓恒注入）：')
            for (const e of scoped.repo) console.log(`    - ${e.id}：${e.summary}`)
          }
          for (const [d, list] of moduleEntries) {
            console.log(`  module:${d}（触达该域时注入）：`)
            for (const e of list) console.log(`    - ${e.id}：${e.summary}`)
          }
          if (total === 0) console.log('  当前仅关键词档在用（无任何 scoped 标记）——要恒注入的规约/仓级约束按下述标记声明：')
          for (const l of guide) console.log(`  ${l}`)
        }
      } catch (e) {
        output(false, {}, { code: 'scope_failed', message: String((e && e.message) || e) })
      }
      return
    }
    case 'digest': {
      // 治理信号摘要（2026-09-27-knowledge-digest）：四类沉睡信号（rot 待复核/收件箱积压/
      // 伪域落库/绑定解析失败）超阈才见人——安静即健康态。--json 供平台 RPC 消费（信号卡）。
      const specBase = opts.specDir || join(dir, '.sillyspec')
      const rest = args.slice(1)
      try {
        const { collectKnowledgeDigest, renderKnowledgeDigestText } = await import('../knowledge-digest.js')
        const d = collectKnowledgeDigest({ specBase, projectRoot: dir })
        if (opts.json || rest.includes('--json')) { // --json 是全局旗标（index.js 顶层吞掉），opts.json 为正道，rest 兜底
          output(true, { subcommand: 'digest', ...d }) // digest 进 data 面（第三参是 error 位）
        } else {
          console.log(renderKnowledgeDigestText(d))
        }
      } catch (e) {
        output(false, {}, { code: 'digest_failed', message: String((e && e.message) || e) })
      }
      return
    }
    case 'renumber': {
      // 存量决策号一次性迁移（2026-10-14-decision-legacy-renumber）：--dry-run 打印计划，
      // --apply 执行重写（快照指纹校验 + 原子写；重跑幂等——原编号在场节段零触碰）。
      const specBase = opts.specDir || join(dir, '.sillyspec')
      const rest = args.slice(1)
      const apply = rest.includes('--apply')
      try {
        const { planRenumber, applyRenumberPlan } = await import('../decision-renumber.js')
        const plan = planRenumber(join(specBase, 'knowledge'))
        const st = plan.stats
        console.log(`🗺️ 决策号迁移计划：legacy ${st.legacySections} 节段｜fanout ${st.fanoutGroups} 组（${st.fanoutCopies} 副本→单一身份）｜发号 ${st.mintedNumbers}｜无变更条目 ${st.noChangeEntries}（逐节独立发号）｜epoch 零触碰 ${st.untouchedEpoch}`)
        for (const [dom, n] of Object.entries(st.perDomainStart)) console.log(`   域 ${dom}：号段自 ${String(n).padStart(3, '0')} 起`)
        if (!apply) {
          console.log('（--dry-run 形态——加 --apply 执行重写；git 可回退）')
          output(true, { subcommand: 'renumber', dryRun: true, ...st })
          return
        }
        if (plan.files.every((f) => !f.ops || f.ops.length === 0)) {
          console.log('✅ 无可迁移节段（幂等重跑——零变化）')
          output(true, { subcommand: 'renumber', filesWritten: 0, ...st })
          return
        }
        let filesWritten = 0
        for (const fe of plan.files) {
          if (!fe.ops || !fe.ops.length) continue
          const p = join(specBase, 'knowledge', fe.file)
          const cur = readFileSync(p, 'utf8')
          if (cur !== fe.content) {
            console.error(`❌ 快照漂移：${fe.file} 在计划后被并行修改——中止不覆盖（重跑重新计划）`)
            process.exitCode = 1
            return
          }
          writeAtomicSync(p, applyRenumberPlan(new Map([[fe.file, cur]]), plan).get(fe.file))
          filesWritten++
        }
        console.log(`✅ 迁移完成：${filesWritten} 文件重写、${st.mintedNumbers} 号铸出（epoch 形态）——重跑 --apply 验证零变化；平台侧随后 platform sync 推送`)
        output(true, { subcommand: 'renumber', filesWritten, ...st })
      } catch (e) {
        output(false, {}, { code: 'renumber_failed', message: String((e && e.message) || e) })
      }
      return
    }
    default:
      output(false, {}, {
        code: 'unknown_subcommand',
        subCommand: subCommand,
        available: ['search', 'inspect', 'validate', 'refresh', 'propose', 'accept', 'classify', 'inbox', 'stats', 'digest', 'graph', 'renumber', 'redomain-unmapped'],  // dump 随 graph 路由面（2026-10-09-graph-dump-layout）
      })
  }
}
