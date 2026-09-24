/**
 * test-bindings.js — 验收×测试绑定 写侧基座（2026-09-24-fr-test-bindings，fr-test-binding 方案 §3.1/§3.2）
 *
 * 单点解析纪律（D-002@v1）：两处真源仅本模块解析读写——
 *   真源① FR：knowledge/fr/<域>.md 条目内「测试绑定：」机器子块；
 *   真源② ql：.sillyspec/quicklog/test-bindings.json（quicklog 侧机器面）。
 * 变更期载体（D-001@v1）：changes/<名>/test-trace.json（局部锚 FR-NN；归档提升铸全局）。
 *
 * 行模型（方案 §3.1）：anchor∈{FR-<域>-NNN | ql-<id> | null}（禁 CAP 第四空间）；
 * reason∈{spec|capability|regression}；state∈{candidate|active}；discovery∈{machine|agent}；
 * confirmed_by∈{agent|null}——预填/机械产物≠确认（未确认行恒 candidate+confirmed_by:null）。
 * row_id 锚无关恒填：<change>:<task-id>:<accRef>；orphan accRef=acc-<index>-<sha256(原文)前8>
 * （D-005@v1：禁易漂移纯序号作长期主键，插行后按指纹对齐）。
 *
 * 字段级所有权四硬约束（方案 §3.2）：机器晋升按 (source_change, row_id) upsert、内容全等
 * no-op、不删 agent 行；--bind/--unbind 原子写（writeAtomicSync）；FR supersede 同步置
 * status=superseded（markFrBindingsSuperseded，fr-index 承接翻链调用）。
 */
import { createHash } from 'crypto'
import { existsSync, readFileSync, readdirSync } from 'fs'
import { join } from 'path'
import { writeAtomicSync } from './fs-atomic.js'
import { gitQuiet } from './git-helper.js'
import { quicklogSidecarPath } from './quicklog.js'

const sha256 = (s) => createHash('sha256').update(String(s || '')).digest('hex')
export const ANCHOR_RE = /^(FR-[A-Za-z0-9-]+-\d+|FR-\d+|ql-[0-9]{8}-\d{3}-[0-9a-f]{4}|null)$/
const REASONS = ['spec', 'capability', 'regression']
const STATES = ['candidate', 'active']
const BINDING_BLOCK_HEAD = '测试绑定：'
const BINDING_BLOCK_NOTE = '<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->'

/** 行校验/归一（违例抛错拒绝写入——枚举红线在入口收口）。entryMode：条目内行不带 anchor（锚=条目 id），跳过锚枚举 */
export function normalizeRow(row, opts = {}) {
  const entryMode = !!opts.entryMode
  const anchor = row.anchor === null || row.anchor === undefined ? null : String(row.anchor)
  if (!entryMode) {
    if (!(anchor === null || ANCHOR_RE.test(anchor))) {
      throw new Error(`绑定行 anchor 非法「${row.anchor}」——合法枚举 {FR-<域>-NNN | ql-<id> | null}（禁 CAP 第四空间）`)
    }
    if (anchor === null && !String(row.row_id || '').includes(':')) {
      throw new Error('orphan 行（anchor:null）row_id 必填且含任务段（<change>:<task-id>:<accRef>）')
    }
  }
  if (!REASONS.includes(row.reason)) throw new Error(`绑定行 reason 非法「${row.reason}」（${REASONS.join('|')}）`)
  if (!STATES.includes(row.state)) throw new Error(`绑定行 state 非法「${row.state}」（${STATES.join('|')}）`)
  if (!row.row_id) throw new Error('绑定行 row_id 必填（<change>:<task-id>:<accRef>）')
  if (row.state === 'active' && row.confirmed_by !== 'agent') {
    throw new Error('active 行必须 confirmed_by=agent（预填/机械产物≠确认）')
  }
  const tests = [...new Set((row.tests || []).map(t => String(t).replace(/\\/g, '/')))].filter(Boolean).sort()
  if (tests.length === 0) throw new Error('绑定行 tests 非空（空绑定=伪行）')
  return {
    anchor: anchor || null,
    row_id: String(row.row_id),
    tests,
    reason: row.reason,
    state: row.state,
    discovery: row.discovery === 'agent' ? 'agent' : 'machine',
    confirmed_by: row.confirmed_by === 'agent' ? 'agent' : null,
    confirmed_at: row.confirmed_at && row.confirmed_at !== 'null' ? row.confirmed_at : null,
    reconfirm: ['unchanged', 'rebound'].includes(row.reconfirm) ? row.reconfirm : null,
    status: row.status === 'superseded' ? 'superseded' : 'active',
    source_change: row.source_change && row.source_change !== 'null' ? row.source_change : null,
  }
}

/** orphan accRef（D-005@v1）：index 只作快照，身份=原文指纹 */
export function orphanAccRef(index, acceptanceText) {
  return `acc-${index}-${sha256(acceptanceText).slice(0, 8)}`
}

// ── 变更期载体（D-001@v1）：changes/<名>/test-trace.json ──

export function changeTracePath(changeDir) { return join(changeDir, 'test-trace.json') }

export function readChangeTrace(changeDir) {
  try {
    const p = changeTracePath(changeDir)
    if (!existsSync(p)) return []
    const j = JSON.parse(readFileSync(p, 'utf8'))
    return Array.isArray(j.rows) ? j.rows : []
  } catch { return [] }
}

/** 写 trace（幂等：序列化字节不变跳写；原子：writeAtomicSync） */
export function writeChangeTrace(changeDir, changeName, rows) {
  const normalized = rows.map(normalizeRow)
  const payload = JSON.stringify({
    schemaVersion: 1, change: changeName, rows: normalized,
  }, null, 2) + '\n'
  const p = changeTracePath(changeDir)
  try { if (existsSync(p) && readFileSync(p, 'utf8') === payload) return { changed: false, path: p } } catch { /* 读失败照写 */ }
  writeAtomicSync(p, payload)
  return { changed: true, path: p }
}

/** verify --done 晋升（D-003@v1）：判定列驱动 candidate→active；uncovered/non-testable 删行。
 *  matrixRows = extractAcceptanceMatrixSlots().rows（{task, verdict} 按文档序）——与 trace 行
 *  按 task 分组后顺序 zip（矩阵行由 acceptance 列表渲染，1:1 同源；计数不齐的 task 跳过不晋升）。 */
export function promoteTraceFromMatrix({ changeDir, changeName, matrixRows }) {
  const head = (() => { try { return gitQuiet(process.cwd(), ['rev-parse', 'HEAD'])?.trim() || null } catch { return null } })()
  const byTask = new Map()
  for (const m of (matrixRows || [])) {
    if (!m || !m.task) continue
    if (!byTask.has(m.task)) byTask.set(m.task, [])
    byTask.get(m.task).push(m.verdict)
  }
  const rows = readChangeTrace(changeDir)
  const traceByTask = new Map()
  for (const r of rows) {
    const t = String(r.row_id).split(':')[1] || ''
    if (!traceByTask.has(t)) traceByTask.set(t, [])
    traceByTask.get(t).push(r)
  }
  const out = []
  let promoted = 0, kept = 0, dropped = 0
  for (const r of rows) {
    const t = String(r.row_id).split(':')[1] || ''
    const verdicts = byTask.get(t) || []
    const idx = traceByTask.get(t).indexOf(r)
    const verdict = verdicts.length === traceByTask.get(t).length ? verdicts[idx] : undefined
    if (verdict === 'uncovered' || verdict === 'non-testable') { dropped++; continue }
    if ((verdict === 'covered' || verdict === 'covered-service') && r.state !== 'active') {
      out.push(normalizeRow({ ...r, state: 'active', confirmed_by: 'agent', confirmed_at: head || r.confirmed_at })); promoted++
    } else { out.push(normalizeRow(r)); kept++ }
  }
  const res = writeChangeTrace(changeDir, changeName, out)
  return { promoted, kept, dropped, ...res }
}

// ── 真源① FR：knowledge/fr/<域>.md 条目「测试绑定：」子块 ──

/** 解析条目文本内的绑定子块 → rows（条目内行不带 anchor——锚=条目 id 本身） */
export function parseEntryBindings(entryText) {
  const lines = String(entryText || '').replace(/\r\n/g, '\n').split('\n')
  const rows = []
  let inBlock = false
  let cur = null
  for (const line of lines) {
    if (line.trim() === BINDING_BLOCK_HEAD) { inBlock = true; continue }
    if (inBlock && /^##\s/.test(line)) break
    if (!inBlock) continue
    const rowMatch = line.match(/^-\s+row:\s*(.+)$/)
    if (rowMatch) {
      if (cur) rows.push(cur)
      cur = { row_id: rowMatch[1].trim(), anchor: 'ENTRY' }
      continue
    }
    if (!cur) continue
    const kv = line.match(/^\s{2}(\w+):\s*(.*)$/)
    if (!kv) continue
    const [, k, v] = kv
    if (k === 'tests') cur.tests = v.split('|').map(s => s.trim()).filter(Boolean)
    else cur[k] = v.trim() || null
  }
  if (cur) rows.push(cur)
  return rows.map(r => normalizeRow(r, { entryMode: true }))
}

function renderBindingBlock(rows) {
  if (!rows || rows.length === 0) return []
  const L = [BINDING_BLOCK_HEAD, BINDING_BLOCK_NOTE]
  for (const r of rows) {
    L.push(`- row: ${r.row_id}`)
    L.push(`  tests: ${r.tests.join(' | ')}`)
    L.push(`  reason: ${r.reason}`)
    L.push(`  state: ${r.state}`)
    L.push(`  discovery: ${r.discovery}`)
    L.push(`  confirmed_by: ${r.confirmed_by || 'null'}`)
    L.push(`  confirmed_at: ${r.confirmed_at || 'null'}`)
    L.push(`  source_change: ${r.source_change || 'null'}`)
    L.push(`  status: ${r.status}`)
  }
  return L
}

/** 在域文件内定位条目并 upsert 绑定行（surgical：只动条目段内的绑定子块） */
export function upsertFrBindings({ knowledgeRoot, frId, rows }) {
  const normalized = rows.map(r => normalizeRow({ ...r, anchor: frId }))
  const dir = join(knowledgeRoot, 'fr')
  if (!existsSync(dir)) return { ok: false, error: `knowledge/fr 不存在（${dir}）` }
  for (const f of readdirSync(dir).filter(x => x.endsWith('.md')).sort()) {
    const p = join(dir, f)
    const text = readFileSync(p, 'utf8')
    const lines = text.split(/\r?\n/)
    const start = lines.findIndex(l => l.startsWith(`## ${frId} `) || l === `## ${frId}`)
    if (start === -1) continue
    let end = lines.length
    for (let i = start + 1; i < lines.length; i++) { if (/^##\s/.test(lines[i])) { end = i; break } }
    const entryLines = lines.slice(start, end)
    // 剥旧绑定子块（含头注行），保留其余行原样——蒸馏字段与绑定字段互不越权
    const kept = []
    let skipping = false
    for (const l of entryLines) {
      if (l.trim() === BINDING_BLOCK_HEAD) { skipping = true; continue }
      if (skipping && (/^-\s+row:/.test(l) || /^\s{2}\w+:/.test(l) || l.trim() === BINDING_BLOCK_NOTE)) continue
      skipping = false
      kept.push(l)
    }
    while (kept.length && kept[kept.length - 1].trim() === '') kept.pop()
    // 合并：既有行（含 agent 修复行）按 (source_change,row_id) 与新行合并——机器不删 agent 行
    const existing = parseEntryBindings(entryLines.join('\n'))
    const merged = new Map()
    for (const e of existing) merged.set(`${e.source_change}::${e.row_id}`, e)
    for (const n of normalized) {
      const key = `${n.source_change}::${n.row_id}`
      const cur = merged.get(key)
      // agent 行优先保留（confirmed_by=agent 且新行是 machine 来源的，不覆盖）
      if (cur && cur.confirmed_by === 'agent' && n.discovery === 'machine') continue
      merged.set(key, n)
    }
    const block = renderBindingBlock([...merged.values()].sort((a, b) => (a.source_change + a.row_id).localeCompare(b.source_change + b.row_id)))
    const newEntry = [...kept, ...(block.length ? ['', ...block] : []), '']
    const next = [...lines.slice(0, start), ...newEntry, ...lines.slice(end)]
    const nextText = next.join('\n')
    if (nextText === text) return { ok: true, changed: false, file: p }
    writeAtomicSync(p, nextText)
    return { ok: true, changed: true, file: p }
  }
  return { ok: false, error: `条目 ${frId} 未在 knowledge/fr/*.md 中找到` }
}

/** FR supersede 同步（四硬约束④）：条目全部绑定行 status→superseded（禁死锚） */
export function markFrBindingsSuperseded({ knowledgeRoot, frId }) {
  const rows = readFrBindings({ knowledgeRoot, frId })
  if (rows.length === 0) return { ok: true, changed: false, rows: [] }
  return upsertFrBindingsRaw({ knowledgeRoot, frId, rows: rows.map(r => ({ ...r, status: 'superseded' })) })
}

/** 条目行级 supersede 翻转（fr-index 承接翻链在内存态调用——文件尚未落盘，不能走文件级 API） */
export function applySupersededToEntryLines(lines) {
  const text = lines.join('\n')
  const rows = parseEntryBindings(text)
  if (rows.length === 0) return lines
  const flipped = rows.map(r => ({ ...r, status: 'superseded' }))
  const block = renderBindingBlock(flipped)
  const out = []
  let skipping = false
  for (const l of lines) {
    if (l.trim() === BINDING_BLOCK_HEAD) { skipping = true; continue }
    if (skipping && (/^-\s+row:/.test(l) || /^\s{2}\w+:/.test(l) || l.trim() === BINDING_BLOCK_NOTE)) continue
    skipping = false
    out.push(l)
  }
  while (out.length && out[out.length - 1].trim() === '') out.pop()
  return [...out, '', ...block, '']
}

/** 删 FR 条目绑定行（--unbind 通道；修理工专用） */
export function unbindFrRows({ knowledgeRoot, frId, rowIds }) {
  const rows = readFrBindings({ knowledgeRoot, frId }).filter(r => !rowIds.includes(r.row_id))
  return upsertFrBindingsRaw({ knowledgeRoot, frId, rows })
}

function upsertFrBindingsRaw({ knowledgeRoot, frId, rows }) {
  // 与 upsertFrBindings 同定位/重写逻辑，但行已是权威态（supersede 翻链用，不做 agent 保护）
  const dir = join(knowledgeRoot, 'fr')
  for (const f of readdirSync(dir).filter(x => x.endsWith('.md')).sort()) {
    const p = join(dir, f)
    const text = readFileSync(p, 'utf8')
    const lines = text.split(/\r?\n/)
    const start = lines.findIndex(l => l.startsWith(`## ${frId} `) || l === `## ${frId}`)
    if (start === -1) continue
    let end = lines.length
    for (let i = start + 1; i < lines.length; i++) { if (/^##\s/.test(lines[i])) { end = i; break } }
    const entryLines = lines.slice(start, end)
    const kept = []
    let skipping = false
    for (const l of entryLines) {
      if (l.trim() === BINDING_BLOCK_HEAD) { skipping = true; continue }
      if (skipping && (/^-\s+row:/.test(l) || /^\s{2}\w+:/.test(l) || l.trim() === BINDING_BLOCK_NOTE)) continue
      skipping = false
      kept.push(l)
    }
    while (kept.length && kept[kept.length - 1].trim() === '') kept.pop()
    const block = renderBindingBlock(rows.map(r => normalizeRow({ ...r, anchor: frId })))
    const next = [...lines.slice(0, start), ...kept, ...(block.length ? ['', ...block] : []), '', ...lines.slice(end)]
    const nextText = next.join('\n')
    if (nextText === text) return { ok: true, changed: false, file: p }
    writeAtomicSync(p, nextText)
    return { ok: true, changed: true, file: p }
  }
  return { ok: false, error: `条目 ${frId} 未找到` }
}

/** 读单条目绑定行（全局锚回填） */
export function readFrBindings({ knowledgeRoot, frId }) {
  const dir = join(knowledgeRoot, 'fr')
  try {
    for (const f of readdirSync(dir).filter(x => x.endsWith('.md')).sort()) {
      const text = readFileSync(join(dir, f), 'utf8')
      const lines = text.split(/\r?\n/)
      const start = lines.findIndex(l => l.startsWith(`## ${frId} `) || l === `## ${frId}`)
      if (start === -1) continue
      let end = lines.length
      for (let i = start + 1; i < lines.length; i++) { if (/^##\s/.test(lines[i])) { end = i; break } }
      return parseEntryBindings(lines.slice(start, end).join('\n')).map(r => ({ ...r, anchor: frId }))
    }
  } catch { /* 读失败 → 空 */ }
  return []
}

// ── 真源② ql：.sillyspec/quicklog/test-bindings.json ──

function qlBindingsPath(specBase) { return join(specBase, 'quicklog', 'test-bindings.json') }

export function readQlBindings(specBase) {
  try {
    const p = qlBindingsPath(specBase)
    if (!existsSync(p)) return {}
    const j = JSON.parse(readFileSync(p, 'utf8'))
    return j && j.rows && typeof j.rows === 'object' && !Array.isArray(j.rows) ? j.rows : {}
  } catch { return {} }
}

/** ql 行 upsert（键=ql-id+row_id；原子+幂等） */
export function upsertQlBindings({ specBase, qlId, rows }) {
  const all = readQlBindings(specBase)
  const cur = new Map((all[qlId] || []).map(r => [r.row_id, r]))
  for (const r0 of rows) {
    const r = normalizeRow({ ...r0, anchor: qlId })
    if (cur.has(r.row_id) && cur.get(r.row_id).confirmed_by === 'agent' && r.discovery === 'machine') continue
    cur.set(r.row_id, r)
  }
  all[qlId] = [...cur.values()].sort((a, b) => a.row_id.localeCompare(b.row_id))
  const payload = JSON.stringify({ schemaVersion: 1, rows: all }, null, 2) + '\n'
  const p = qlBindingsPath(specBase)
  try { if (existsSync(p) && readFileSync(p, 'utf8') === payload) return { changed: false, path: p } } catch { /* 照写 */ }
  writeAtomicSync(p, payload)
  return { changed: true, path: p }
}

/** 删 ql 行（--unbind 通道；修理工专用） */
export function unbindQlRows({ specBase, qlId, rowIds }) {
  const all = readQlBindings(specBase)
  const cur = (all[qlId] || []).filter(r => !rowIds.includes(r.row_id))
  const removed = (all[qlId] || []).length - cur.length
  all[qlId] = cur
  writeAtomicSync(qlBindingsPath(specBase), JSON.stringify({ schemaVersion: 1, rows: all }, null, 2) + '\n')
  return { removed }
}

// ── 视图查询（两真源合并）──

export function queryByAnchor({ specBase, knowledgeRoot, anchor }) {
  const out = []
  if (/^FR-/.test(anchor)) {
    // 坑 tests-fr-view-empty（2026-09-24 平台合并后实锤）：此处曾把 anchor 传成 frId
    // 键——readFrBindings 取 frId=undefined → 全域查找落空 → FR 视图恒空（B6 只测 ql
    // 分支放行）。键名对齐 readFrBindings 契约。
    for (const r of readFrBindings({ knowledgeRoot, frId: anchor })) out.push(r)
  } else if (/^ql-/.test(anchor)) {
    for (const r of readQlBindings(specBase)[anchor] || []) out.push(r)
  }
  return out
}

/** 测试文件归属解析（R2 定向化消费面，watcher 调用）：files → 归属锚行（FR 条目+ql 面，
 *  仅 active·非 superseded 行）。返回 Map<normPath, Array<{anchor, row_id, source_change}>>。 */
export function resolveTestFileOwners({ specBase, files }) {
  const map = new Map()
  const norm = (p) => String(p).replace(/\\/g, '/')
  const want = new Set((files || []).map(norm))
  if (want.size === 0) return map
  const push = (file, entry) => {
    const k = norm(file)
    if (!map.has(k)) map.set(k, [])
    map.get(k).push(entry)
  }
  try {
    const knowledgeRoot = join(specBase, 'knowledge')
    const dir = join(knowledgeRoot, 'fr')
    if (existsSync(dir)) {
      for (const f of readdirSync(dir).filter((x) => x.endsWith('.md')).sort()) {
        const text = readFileSync(join(dir, f), 'utf8')
        for (const m of text.matchAll(/^## (FR-[A-Za-z0-9-]+-\d+) /gm)) {
          for (const r of readFrBindings({ knowledgeRoot, frId: m[1] })) {
            if (r.state !== 'active' || r.status === 'superseded') continue
            for (const t of r.tests) if (want.has(norm(t))) push(t, { anchor: m[1], row_id: r.row_id, source_change: r.source_change })
          }
        }
      }
    }
  } catch { /* FR 面读失败 → 只回 ql 面 */ }
  try {
    for (const [qlId, rows] of Object.entries(readQlBindings(specBase))) {
      for (const r of rows || []) {
        if (r.state !== 'active' || r.status === 'superseded') continue
        for (const t of r.tests) if (want.has(norm(t))) push(t, { anchor: qlId, row_id: r.row_id, source_change: r.source_change })
      }
    }
  } catch { /* ql 面读失败 → 只回 FR 面 */ }
  return map
}

export function queryByChange({ specBase, knowledgeRoot, sourceChange }) {
  const out = []
  try {
    const dir = join(knowledgeRoot, 'fr')
    for (const f of readdirSync(dir).filter(x => x.endsWith('.md')).sort()) {
      const text = readFileSync(join(dir, f), 'utf8')
      for (const m of text.matchAll(/^## (FR-[A-Za-z0-9-]+-\d+) /gm)) {
        for (const r of readFrBindings({ knowledgeRoot, frId: m[1] })) {
          if (r.source_change === sourceChange) out.push(r)
        }
      }
    }
  } catch { /* fr 面读失败 → 只回 ql 面 */ }
  for (const rows of Object.values(readQlBindings(specBase))) {
    for (const r of rows) if (r.source_change === sourceChange) out.push(r)
  }
  return out
}

/** 锚可解析校验（修理工入口硬校验——修理工不得制造悬空锚） */
export function anchorResolvable({ specBase, knowledgeRoot, anchor }) {
  if (/^FR-/.test(anchor)) return frEntryExists(knowledgeRoot, anchor)
  if (/^ql-/.test(anchor)) {
    try { return existsSync(quicklogSidecarPath(specBase, anchor)) } catch { return false }
  }
  return false
}

function frEntryExists(knowledgeRoot, frId) {
  try {
    const dir = join(knowledgeRoot, 'fr')
    for (const f of readdirSync(dir).filter(x => x.endsWith('.md'))) {
      if (readFileSync(join(dir, f), 'utf8').split(/\r?\n/).some(l => l.startsWith(`## ${frId} `) || l === `## ${frId}`)) return true
    }
  } catch { /* 读失败 → 不存在 */ }
  return false
}
