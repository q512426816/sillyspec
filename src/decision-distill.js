/**
 * decision-distill — 决策提炼纯函数（change: 2026-08-23-adopt-harness-practices，FR-02/03/04，D-007@v1）
 *
 * 职责：把变更 decisions.md 中「有实现影响」的决策幂等提炼进 knowledge/decisions/<模块域>.md，
 * 并幂等维护 knowledge/INDEX.md 的 decisions 路由行。写入责任全部在本模块——task-03（archive
 * 接线）只调用，task-04（knowledge-match）只消费，本模块不 import 它们（也不接 DB/网络）。
 *
 * 入选规则（FR-02，rejected 优先）：任意 type 的 status=rejected → rejected（留痕防复潮）；
 *   type∈{architecture,compatibility,boundary,definition,process} 且 status∈{confirmed,accepted}
 *   → implemented；type=scope 与 status=superseded 等其余组合不入选（解析保留在 entries 里）。
 * 域三级兜底（FR-03）：条目「模块域」字段优先 → 缺失按 impacts 文本中的路径与 _module-map.yaml
 *   paths/core_files 前缀匹配（moduleIndex 由调用方注入；未注入时按 knowledgeRoot 同级
 *   docs/<项目>/modules/_module-map.yaml 尽力发现）→ 仍未中归 unmapped 域。
 * 条目契约（FR-04，provides decisions_entry 八字段）：id/status/anchor/domains/last_confirmed/
 *   rationale/reject_reason/revisit_when——implemented/rejected 条目逐字落「状态：/锚点：/最近确认：/
 *   理由：」字段行（rejected 追加「否决理由：/复潮条件：」），domains 由条目所在文件
 *   decisions/<域>.md 编码（多域 = 条目扇出到多个域文件）。
 * 幂等：同 ID 同版本重写该条目段落不重复追加；@vN+1 整段替换旧版本段并注 supersedes；旧版本段
 *   散落在其他域文件时同步移除（同号全局只留最高版本；高版本已落库时迟到的低版本不降级）。
 * needsWait：rejected 条目缺否决理由/复潮条件 → 该条目不写盘，needsWait 返回缺失描述
 *   （其余条目照常提炼；步骤层把 needsWait 转 --wait 请用户裁决）。
 * 零输出：无 decisions.md 或无入选条目 → skipped 带原因，不写任何文件、不动 INDEX。
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'

/** FR-02：有实现影响的五类 type（scope 与未知 type 的 confirmed/accepted 不入选） */
const IMPLEMENTED_TYPES = new Set(['architecture', 'compatibility', 'boundary', 'definition', 'process'])
/** FR-02：implemented 入选的 status（superseded 等其余状态不入选） */
const IMPLEMENTED_STATUSES = new Set(['confirmed', 'accepted'])
/** 三级兜底终点域（仍不中归此；域文件由本模块自管） */
const UNMAPPED_DOMAIN = 'unmapped'
/** 旧格式容错占位值（FR-01：缺锚点/缺 headHash 不阻断） */
const NOT_RECORDED = '未记录'

/** 多行/带空白值压成单行字段值（条目行是单行契约） */
function oneLine(s) {
  return String(s ?? '').replace(/\s*\r?\n\s*/g, ' ').trim()
}

/** 取列表字段首 token：`superseded（被 D-005@v2 取代…）` → `superseded` */
function firstToken(value) {
  return value.split(/[\s（(]/)[0] || ''
}

/** 模块域值解析：`[a, b]` / `a、b` / `a b` → ['a','b'] */
function parseListValue(v) {
  return v.replace(/^\[/, '').replace(/\]$/, '')
    .split(/[,，、\s]+/)
    .map(s => s.trim())
    .filter(Boolean)
}

/** 域名净化为安全文件名段（防路径注入；空值归 unmapped） */
function sanitizeDomain(d) {
  const s = String(d || '').trim().replace(/\.md$/i, '').replace(/[^A-Za-z0-9_\-\u4e00-\u9fff]/g, '-')
  return s || UNMAPPED_DOMAIN
}

/** FR-02 入选裁决：'implemented' | 'rejected' | null（null = 解析保留但不入选） */
function dispositionOf(entry) {
  const t = (entry.type || '').toLowerCase()
  const s = (entry.status || '').toLowerCase()
  if (s === 'rejected') return 'rejected' // 任意 type（含 scope）的 rejected 都留痕
  if (IMPLEMENTED_TYPES.has(t) && IMPLEMENTED_STATUSES.has(s)) return 'implemented'
  return null
}

/** decisions.md 列表字段标签 → entry 字段（兼容中英标签与中英冒号；其余字段仅留在 raw） */
function applyField(entry, label, value) {
  switch (label) {
    case 'type': entry.type = firstToken(value); break
    case 'status': entry.status = firstToken(value); break
    case 'question': case '问题': entry.question = value; break
    case 'answer': case '答案': entry.answer = value; break
    case '锚点': case 'anchor': entry.anchor = value; break
    case '模块域': case '模块': case 'domains': case 'domain': entry.domains = parseListValue(value); break
    case '否决理由': case 'reject_reason': case 'rejectreason': entry.rejectReason = value; break
    case '复潮条件': case 'revisit_when': case 'revisitwhen': entry.revisitWhen = value; break
    case 'supersedes': entry.supersedes = value; break
    case 'impacts': case '影响': entry.impacts = value; break
    case 'normalized_requirement': entry.normalizedRequirement = value; break
    default: break
  }
}

/**
 * 纯函数：解析变更 decisions.md 的 D-xxx@vN 决策条目（FR-01 四字段全可选容旧格式）。
 * @param {string} changeDir 变更目录（含 decisions.md）
 * @returns {{ entries: Array<{
 *   id: string, number: string, version: number, title: string,
 *   type?: string, status?: string, question?: string, answer?: string,
 *   anchor?: string, domains?: string[], rejectReason?: string, revisitWhen?: string,
 *   supersedes?: string, impacts?: string, normalizedRequirement?: string,
 *   selected: 'implemented'|'rejected'|null, raw: string }>, missing: boolean }}
 *   missing=true = decisions.md 不存在；selected = FR-02 入选裁决，null 表示解析保留但不入选。
 */
export function parseDecisions(changeDir) {
  const filePath = join(changeDir, 'decisions.md')
  if (!existsSync(filePath)) return { entries: [], missing: true }
  let content
  try { content = readFileSync(filePath, 'utf8') } catch { return { entries: [], missing: true } }

  const entries = []
  let cur = null
  const flush = () => {
    if (!cur) return
    cur.selected = dispositionOf(cur)
    cur.raw = cur.rawLines.join('\n')
    delete cur.rawLines
    entries.push(cur)
  }
  for (const line of content.replace(/\r\n/g, '\n').split('\n')) {
    const h = line.match(/^##\s+(D-\d+)(?:@v(\d+))?\s*(.*)$/)
    if (h) {
      flush()
      const version = h[2] ? parseInt(h[2], 10) : 1
      cur = { id: `${h[1]}@v${version}`, number: h[1], version, title: h[3].trim(), rawLines: [line] }
      continue
    }
    if (!cur) continue
    cur.rawLines.push(line)
    const f = line.match(/^-\s+([^\s：:]+)\s*[：:]\s*(.*)$/)
    if (f) applyField(cur, f[1].toLowerCase(), f[2].trim())
  }
  flush()
  return { entries, missing: false }
}

// ---------------------------------------------------------------------------
// 域三级兜底（FR-03）
// ---------------------------------------------------------------------------

/** moduleIndex 形状归一：parseModuleMapSimple 平铺 {id:{paths}} 或包裹 {modules:{id:{paths}}} */
function normalizeModules(moduleIndex) {
  if (!moduleIndex) return {}
  return moduleIndex.modules ? moduleIndex.modules : moduleIndex
}

/** _module-map.yaml 子集解析（仅模块 id → paths/core_files；不复用 modules.js 以保零依赖纯函数） */
function parseModulePathsSubset(content) {
  const modules = {}
  let cur = null
  let key = null
  for (const line of content.replace(/\r\n/g, '\n').split('\n')) {
    const mm = line.match(/^  ([a-zA-Z0-9_-]+):$/)
    if (mm) { cur = mm[1]; modules[cur] = { paths: [] }; key = null; continue }
    if (!cur) continue
    const inline = line.match(/^    (paths|core_files): \[(.*)\]$/)
    if (inline) {
      modules[cur][inline[1]] = inline[2].split(',').map(s => s.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean)
      key = null; continue
    }
    const block = line.match(/^    (paths|core_files):$/)
    if (block) { key = block[1]; modules[cur][key] = modules[cur][key] || []; continue }
    const item = line.match(/^      - (.+)$/)
    if (item && key) modules[cur][key].push(item[1].trim().replace(/^['"]|['"]$/g, ''))
  }
  return modules
}

/** 未注入 moduleIndex 时的尽力发现：knowledgeRoot 同级 docs/<项目>/modules/_module-map.yaml。
 * 多子项目仓（如本仓 sillyspec+dashboard）各项目有自己的 map——dogfood 实证（2026-08-24）：
 * 只取首个命中会把主项目条目全部误落 unmapped（dashboard 的 map 按字母序先命中）。
 * 改为合并全部项目的 map（同名模块合并 paths/core_files 去重），失败归 null → 全部 unmapped。 */
function discoverModuleIndex(knowledgeRoot) {
  try {
    const docsDir = join(dirname(knowledgeRoot), 'docs')
    if (!existsSync(docsDir)) return null
    const merged = {}
    for (const d of readdirSync(docsDir, { withFileTypes: true })) {
      if (!d.isDirectory()) continue
      const mapPath = join(docsDir, d.name, 'modules', '_module-map.yaml')
      if (!existsSync(mapPath)) continue
      const sub = parseModulePathsSubset(readFileSync(mapPath, 'utf8'))
      for (const [id, m] of Object.entries(sub)) {
        if (!merged[id]) merged[id] = { paths: m.paths || [], core_files: m.core_files || [] }
        else {
          merged[id].paths = [...new Set([...(merged[id].paths || []), ...(m.paths || [])])]
          merged[id].core_files = [...new Set([...(merged[id].core_files || []), ...(m.core_files || [])])]
        }
      }
    }
    return Object.keys(merged).length > 0 ? merged : null
  } catch { /* 尽力而为，失败归 null */ }
  return null
}

/** impacts 文本中的路径 token：含 / 或带扩展名的词（`src/stages/archive.js、quicklog.js:486` → 前者 + `quicklog.js`） */
function extractPathTokens(text) {
  if (!text) return []
  const tokens = String(text).match(/[A-Za-z0-9_\-.\\/]+/g) || []
  return tokens
    .map(t => t.replace(/\\/g, '/').replace(/\/+$/, ''))
    .filter(t => t && (t.includes('/') || /\.[A-Za-z0-9]+$/.test(t)) && t !== '.' && t !== '..')
}

/** impacts 路径 token × module paths 前缀匹配（全路径优先，基名兜底——卡内裸文件名引用先例） */
function matchImpactsToModules(impacts, moduleIndex) {
  const flat = normalizeModules(moduleIndex)
  const modPaths = []
  for (const [id, m] of Object.entries(flat)) {
    for (const p of [...(m.paths || []), ...(m.core_files || [])]) {
      const ps = String(p).replace(/\\/g, '/').replace(/\/+$/, '')
      if (ps) modPaths.push({ id, p: ps })
    }
  }
  const tokens = extractPathTokens(impacts)
  const hits = []
  for (const t of tokens) {
    for (const { id, p } of modPaths) {
      if (t === p || t.startsWith(p + '/')) { if (!hits.includes(id)) hits.push(id); break }
    }
  }
  if (hits.length === 0) {
    for (const t of tokens) {
      const base = t.slice(t.lastIndexOf('/') + 1)
      for (const { id, p } of modPaths) {
        if (p.slice(p.lastIndexOf('/') + 1) === base && !hits.includes(id)) hits.push(id)
      }
    }
  }
  return hits
}

/** 三级兜底：模块域字段 → impacts × moduleIndex 前缀 → unmapped */
function resolveDomains(entry, moduleIndex) {
  if (entry.domains && entry.domains.length > 0) return entry.domains.map(sanitizeDomain)
  const matched = moduleIndex ? matchImpactsToModules(entry.impacts, moduleIndex) : []
  if (matched.length > 0) return matched.map(sanitizeDomain)
  return [UNMAPPED_DOMAIN]
}

// ---------------------------------------------------------------------------
// knowledge/decisions/<域>.md 条目读写（FR-04 契约条目，幂等）
// ---------------------------------------------------------------------------

/** 新域文件头（preamble） */
function newDomainPreamble(domain) {
  return [
    `# 决策知识 — ${domain}`,
    '',
    '> decision-distill 从变更 decisions.md 幂等提炼（「最近确认」= 归档时 HEAD）。条目字段行为 docs-check 机械解析契约，勿手改。',
  ]
}

/** 单条目段落渲染（design 接口定义的条目格式，逐字对齐：状态/锚点/最近确认/理由 + rejected 专属两行）。
 * 变更：行（2026-08-28，坑 distill-cross-change-supersede）：D-xxx 编号是变更内局部序号，
 * 跨变更同号（两个 D-002）互不相干——条目必须携带变更名限定，消费方（knowledge-match/
 * docs-check 的字段行解析）只认各自标签，新增字段行是增量安全。 */
function renderBlockLines(entry, headHash, supersedesNote, changeName) {
  const lines = [`## ${entry.id} ${oneLine(entry.title)}`.replace(/\s+$/, '')]
  lines.push(`状态：${entry.selected}`)
  if (changeName) lines.push(`变更：${oneLine(changeName)}`)
  lines.push(`锚点：${oneLine(entry.anchor) || NOT_RECORDED}`)
  lines.push(`最近确认：${oneLine(headHash) || NOT_RECORDED}`)
  lines.push(`理由：${oneLine(entry.answer || entry.normalizedRequirement || entry.question)}`)
  if (supersedesNote) lines.push(`supersedes：${oneLine(supersedesNote)}`)
  if (entry.selected === 'rejected') {
    lines.push(`否决理由：${oneLine(entry.rejectReason)}`)
    lines.push(`复潮条件：${oneLine(entry.revisitWhen)}`)
  }
  return lines
}

/** 知识文件切段：preamble 行 + D-xxx@vN 条目段（段边界 = 下一 `## D-` 头）。
 * 段的变更归属取段内 `变更：<name>` 行；无该行的历史条目 → change=null（legacy：
 * 升级前落库的条目，不参与新条目的同号匹配/supersede——只共存不误删）。 */
function splitKnowledgeSections(content) {
  const sections = []
  const preamble = []
  let cur = null
  for (const line of content.replace(/\r\n/g, '\n').split('\n')) {
    const m = line.match(/^## (D-\d+)@v(\d+)\s*(.*)$/)
    if (m) {
      if (cur) sections.push(cur)
      cur = { number: m[1], version: parseInt(m[2], 10), title: m[3].trim(), lines: [line] }
      continue
    }
    if (cur) cur.lines.push(line)
    else preamble.push(line)
  }
  if (cur) sections.push(cur)
  for (const s of sections) {
    s.id = `${s.number}@v${s.version}`
    const cm = s.lines.find(l => /^变更[：:]/.test(l))
    s.change = cm ? cm.replace(/^变更[：:]\s*/, '').trim() || null : null
  }
  return { preamble, sections }
}

/** 段落重组落盘文本（幂等归一：段间恰好一个空行 + 文件单一尾换行） */
function joinKnowledgeFile(preamble, sections) {
  const parts = []
  const pre = preamble.join('\n').replace(/\s+$/, '')
  if (pre) parts.push(pre)
  for (const s of sections) {
    const block = s.lines.join('\n').replace(/\s+$/, '')
    if (block) parts.push(block)
  }
  return parts.join('\n\n') + '\n'
}

/**
 * 单条目写入一个域文件的段落集（就地修改 sections）。
 * 坑 distill-cross-change-supersede（2026-08-28 用户实证：跨变更同号 D-002 在 knowledge
 * 里互相 supersede）：幂等键从「号」改为「号+变更」——同号匹配、版本守卫、旧版本段清除
 * 全部限定在 entry.change 内；他者变更的同号段不参与（共存）。legacy 段（change=null，
 * 升级前落库）不与任何新条目互认，只共存不误删。
 * @returns {{ action: 'append'|'update'|'supersede' }|null} null = 同变更同号高版本已落库，迟到低版本不降级。
 */
function applyEntryToSections(sections, entry, headHash) {
  const change = entry.change || null
  const sameNumber = sections.filter(s => s.number === entry.number && (s.change || null) === change)
  if (sameNumber.some(s => s.version > entry.version)) return null
  let action
  let supersedesNote = oneLine(entry.supersedes) || null
  if (sameNumber.length === 0) {
    sections.push({ number: entry.number, version: entry.version, id: entry.id, title: entry.title, change, lines: renderBlockLines(entry, headHash, supersedesNote, change || undefined) })
    action = 'append'
  } else {
    const same = sameNumber.find(s => s.version === entry.version)
    const slot = same || sameNumber[0]
    if (!same && !supersedesNote) supersedesNote = `${slot.number}@v${slot.version}`
    slot.version = entry.version
    slot.title = entry.title
    slot.lines = renderBlockLines(entry, headHash, supersedesNote, change || undefined)
    // 同变更同号旧版本段（< 新版本）就地清除——同文件内同变更同号只留一个段
    for (let i = sections.length - 1; i >= 0; i--) {
      if (sections[i].number === entry.number && (sections[i].change || null) === change && sections[i] !== slot) sections.splice(i, 1)
    }
    action = same ? 'update' : 'supersede'
  }
  return { action }
}

// ---------------------------------------------------------------------------
// INDEX.md decisions 路由行幂等维护（FR-05：写入责任在本模块；只动 ## Decisions 段内指向 decisions/ 的行）
// ---------------------------------------------------------------------------

/** INDEX 路由行格式与 knowledge-match 解析口径一致：`- <域>|decision|决策 → [decisions/<域>.md](decisions/<域>.md)` */
function routingLine(domain) {
  return `- ${domain}|decision|决策 → [decisions/${domain}.md](decisions/${domain}.md)`
}

const ROUTING_TARGET_RE = /^-\s+.*→\s*\[[^\]]*\]\(decisions\/([^)#]+?)(?:\.md)?(?:#[^)]*)?\)\s*$/

/** 域文件实况 ↔ ## Decisions 段路由行对账：缺行补、失效行删、重复行去重；不动其他类别行 */
function syncIndexRoutingLines(knowledgeRoot) {
  const decisionsDir = join(knowledgeRoot, 'decisions')
  let domains
  try {
    domains = readdirSync(decisionsDir).filter(f => f.endsWith('.md')).map(f => f.replace(/\.md$/, ''))
  } catch { return false }
  if (domains.length === 0) return false

  const indexPath = join(knowledgeRoot, 'INDEX.md')
  let original = null
  if (existsSync(indexPath)) {
    try { original = readFileSync(indexPath, 'utf8') } catch { return false }
  }
  const lines = original ? original.replace(/\r\n/g, '\n').split('\n') : ['# Knowledge Index', '']

  // 定位 ## Decisions 段边界
  let secStart = -1
  let secEnd = lines.length
  for (let i = 0; i < lines.length; i++) {
    const h = lines[i].match(/^##\s+(.+?)\s*$/)
    if (!h) continue
    if (secStart === -1) {
      if (h[1] === 'Decisions') secStart = i + 1
    } else { secEnd = i; break }
  }

  const desired = domains.map(routingLine)
  if (secStart === -1) {
    // 无段则追加（保留原文件其余内容）
    while (lines.length > 0 && lines[lines.length - 1].trim() === '') lines.pop()
    lines.push('', '## Decisions', ...desired)
  } else {
    const body = lines.slice(secStart, secEnd)
    const kept = []
    const seen = new Set()
    const domainSet = new Set(domains)
    for (const l of body) {
      const m = l.match(ROUTING_TARGET_RE)
      if (!m) { kept.push(l); continue } // 非路由行（注释/空行）原样保留
      // 目标域文件仍存在的路由行原样保留（关键词可能被人工扩充）；失效行（文件已不存在）与重复行删
      if (domainSet.has(m[1]) && !seen.has(m[1])) { seen.add(m[1]); kept.push(l) }
    }
    // 补行插在段尾空行之前（段尾空行是与下一 `## ` 的分隔，新行追加其后会出现行间空洞）
    const tail = []
    while (kept.length > 0 && kept[kept.length - 1].trim() === '') tail.unshift(kept.pop())
    for (const d of desired) {
      const m = d.match(ROUTING_TARGET_RE)
      if (m && !seen.has(m[1])) kept.push(d) // 缺行补
    }
    kept.push(...tail)
    const sepNeeded = secEnd < lines.length && kept.length > 0 && kept[kept.length - 1].trim() !== ''
    lines.splice(secStart, secEnd - secStart, ...kept, ...(sepNeeded ? [''] : []))
  }

  let next = lines.join('\n').replace(/\n{3,}$/, '\n')
  if (!next.endsWith('\n')) next += '\n'
  if (next === original) return false
  writeFileSync(indexPath, next)
  return true
}

// ---------------------------------------------------------------------------
// IO 入口：提炼（FR-03）
// ---------------------------------------------------------------------------

/**
 * 纯函数入口：把 changeDir/decisions.md 的入选决策幂等提炼进 knowledgeRoot/decisions/<域>.md，
 * 并幂等维护 knowledgeRoot/INDEX.md 的 decisions 路由行（仅在有实际写入时）。
 * @param {string} changeDir 变更目录（含 decisions.md）
 * @param {string} knowledgeRoot knowledge 目录（如 <specBase>/knowledge）
 * @param {string} headHash 归档时 HEAD hash（落「最近确认」；空值容错为 未记录）
 * @param {object|null} [moduleIndex] 域兜底用模块索引（{modules:{id:{paths,core_files}}} 或平铺形；
 *   缺省时按 knowledgeRoot 同级 docs/<项目>/modules/_module-map.yaml 尽力发现）
 * @returns {{ written: Array<{file: string, id: string, action: 'append'|'update'|'supersede'}>,
 *   skipped: string|null, needsWait: string|null }}
 *   file 为 knowledgeRoot 相对 POSIX 路径（decisions/<域>.md）；跨文件旧版本移除记
 *   { file: 所在文件, id: 被替换旧版本, action: 'supersede' }。
 *   skipped 非空 = 无 decisions.md / 无入选条目（零输出）；needsWait 非空 = 有 rejected 条目
 *   缺否决理由/复潮条件被拦下（该条目未写盘，其余条目照常提炼）。
 */
export function distillIntoKnowledge(changeDir, knowledgeRoot, headHash, moduleIndex = null) {
  // 变更名限定（坑 distill-cross-change-supersede）：条目幂等键 = 号+变更。changeDir 末段
  // 即变更名（changes/<name> 与 archive 后的 changes/archive/<name> 同为 <name>）。
  const changeName = basename(changeDir)
  const parsed = parseDecisions(changeDir)
  if (parsed.missing) {
    return { written: [], skipped: `decisions.md 不存在（${join(changeDir, 'decisions.md')}），零输出`, needsWait: null }
  }
  const selected = parsed.entries.filter(e => e.selected)
  if (selected.length === 0) {
    return { written: [], skipped: `无入选条目（解析 ${parsed.entries.length} 条，0 条入选：scope/非五类 type/非 confirmed|accepted|rejected 状态均不入选），零输出`, needsWait: null }
  }

  // needsWait：rejected 缺否决理由/复潮条件 → 该条目不写盘（其余照常）
  const waitParts = []
  const distillable = []
  for (const e of selected) {
    if (e.selected === 'rejected' && (!e.rejectReason || !e.revisitWhen)) {
      const missing = []
      if (!e.rejectReason) missing.push('否决理由')
      if (!e.revisitWhen) missing.push('复潮条件')
      waitParts.push(`${e.id} 缺${missing.join('、')}`)
    } else {
      distillable.push(e)
    }
  }
  const needsWait = waitParts.length > 0
    ? `${waitParts.join('；')}——rejected 条目必填，补齐后重跑提炼`
    : null
  if (distillable.length === 0) return { written: [], skipped: null, needsWait }

  // 同批同号只提炼最高可写版本（decisions.md 里 v1+v2 并存时 v1 不先落后清——落了也会被 v2
  // 整段替换，跳过避免空转写与日志抖动；v2 被 needsWait 拦下时 v1 仍是最高可写版，照常提炼）
  const highestByNumber = new Map()
  for (const e of distillable) {
    const prev = highestByNumber.get(e.number)
    if (!prev || e.version > prev.version) highestByNumber.set(e.number, e)
  }
  const batch = []
  const taken = new Set()
  for (const e of distillable) {
    const keep = highestByNumber.get(e.number)
    if (keep && !taken.has(e.number)) { taken.add(e.number); keep.change = changeName; batch.push(keep) }
  }

  const decisionsDir = join(knowledgeRoot, 'decisions')
  mkdirSync(decisionsDir, { recursive: true })
  const idx = moduleIndex || discoverModuleIndex(knowledgeRoot)

  // 域文件 store：域 → { preamble, sections, dirty }（按需加载，批量写盘）
  const store = new Map()
  const loadDomain = (domain) => {
    let st = store.get(domain)
    if (st) return st
    const p = join(decisionsDir, `${domain}.md`)
    if (existsSync(p)) {
      let parsedFile = { preamble: [], sections: [] }
      try { parsedFile = splitKnowledgeSections(readFileSync(p, 'utf8')) } catch { /* 按新文件处理 */ }
      st = { ...parsedFile, dirty: false }
    } else {
      st = { preamble: newDomainPreamble(domain), sections: [], dirty: false }
    }
    store.set(domain, st)
    return st
  }

  const written = []
  const targetSets = new Map() // entry → Set(域)（跨文件清理时排除目标文件）
  for (const entry of batch) {
    const domains = resolveDomains(entry, idx)
    targetSets.set(entry, new Set(domains))
    for (const d of domains) {
      const st = loadDomain(d)
      const res = applyEntryToSections(st.sections, entry, headHash)
      if (res) {
        st.dirty = true
        written.push({ file: `decisions/${d}.md`, id: entry.id, action: res.action })
      }
    }
  }

  // 跨文件清理：同变更同号 ≤ 新版本的旧段散落其他域文件时移除（同变更同号全局只留最高
  // 版本/目标文件）；他者变更的同号段不参与（共存，坑 distill-cross-change-supersede）
  let onDisk = []
  try { onDisk = readdirSync(decisionsDir).filter(f => f.endsWith('.md')).map(f => f.replace(/\.md$/, '')) } catch { /* 刚创建，走 store */ }
  const allDomains = [...new Set([...onDisk, ...store.keys()])]
  for (const entry of batch) {
    const targets = targetSets.get(entry)
    for (const d of allDomains) {
      if (targets.has(d)) continue
      const st = loadDomain(d)
      const removed = st.sections.filter(s => s.number === entry.number && s.version <= entry.version && (s.change || null) === (entry.change || null))
      if (removed.length === 0) continue
      st.sections = st.sections.filter(s => !removed.includes(s))
      st.dirty = true
      for (const r of removed) written.push({ file: `decisions/${d}.md`, id: r.id, action: 'supersede' })
    }
  }

  for (const [domain, st] of store) {
    if (st.dirty) writeFileSync(join(decisionsDir, `${domain}.md`), joinKnowledgeFile(st.preamble, st.sections))
  }

  // INDEX 路由行对账（仅在实际有条目写入时；零输出场景不动 INDEX）
  if (written.length > 0) syncIndexRoutingLines(knowledgeRoot)

  return { written, skipped: null, needsWait }
}
