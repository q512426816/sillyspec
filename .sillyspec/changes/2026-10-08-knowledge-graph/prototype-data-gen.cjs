/**
 * prototype-data-gen.cjs — 原型全量数据生成器（2026-10-08-knowledge-graph）
 *
 * 从本仓真实知识面按解析契约抽节点/边，产出 prototype-data.js 供原型加载。
 * 解析契约与 src/knowledge-match.js / fr-index.js / modules.js 对齐（只读不写）：
 *   - decisions/<域>.md 的 D-xxx@vN 条目（状态/锚点/变更/来源/supersedes）
 *   - fr/<域>.md 的 FR-域-NNN 条目（变更/承接）
 *   - docs/sillyspec/modules/_module-map.yaml（模块/paths/depends_on/doc）
 *   - modules/<模块>.changelog.md 表行（变更/ql 引用）
 *   - docs/backend/scan/*.md（doc 节点 + 正文路径 scan-refs，前 12 条示意）
 * 用法：node prototype-data-gen.cjs > prototype-data.js（在变更目录下运行）
 */
const { readFileSync, readdirSync, existsSync } = require('fs')
const { join, resolve } = require('path')

const SPEC = resolve(__dirname, '..', '..', '..') // changes/<变更> → .sillyspec → 仓根
const KDIR = join(SPEC, '.sillyspec', 'knowledge')
const ANCHOR_RE = /[\w./-]+\.(?:mjs|cjs|jsx|tsx|js|ts|py|go|java|rs|yaml|yml|json|md)/g

const nodes = [], edges = [], seenN = new Set(), seenE = new Set()
function N(id, type, label, attrs) {
  if (seenN.has(id)) return
  seenN.add(id); nodes.push({ id, type, label, attrs: attrs || {} })
}
function E(s, t, type, note) {
  if (!seenN.has(s) || !seenN.has(t) || s === t) return
  const k = s + '|' + t + '|' + type
  if (seenE.has(k)) return
  seenE.add(k); edges.push({ s, t, type, note: note || '' })
}
const anchorPaths = (a) => {
  const v = String(a || '').trim().replace(/\\/g, '/')
  if (!v || v === '未记录') return []
  return [...new Set((v.match(ANCHOR_RE) || []).map(t =>
    t.replace(/:(?:\d+(?:-\d+)?|[A-Za-z_$][A-Za-z0-9_$]*)$/, '')))]
}

// ── 1. decisions/<域>.md ──
const ddir = join(KDIR, 'decisions')
let decisionCount = 0
const dRows = []
for (const f of existsSync(ddir) ? readdirSync(ddir) : []) {
  if (!f.endsWith('.md')) continue
  const domain = f.replace(/\.md$/, '')
  let cur = null
  const flush = () => { if (cur) dRows.push(cur); cur = null }
  for (const line of readFileSync(join(ddir, f), 'utf8').replace(/\r\n/g, '\n').split('\n')) {
    const h = line.match(/^##\s+(D-\d+@v\d+)\s*(.*)$/)
    if (h) { flush(); cur = { domain, id: h[1], title: h[2].trim(), status: '', anchor: '', change: '', sup: [] }; continue }
    if (!cur) continue
    let m
    if ((m = line.match(/^状态\s*[：:]\s*(\S+)/))) cur.status = m[1]
    else if ((m = line.match(/^锚点\s*[：:]\s*(.*)$/))) cur.anchor = m[1]
    else if ((m = line.match(/^变更\s*[：:]\s*(\S+)/))) cur.change = m[1]
    else if ((m = line.match(/^来源\s*[：:]\s*(\S+)/))) cur.change = cur.change || m[1]
    else if ((m = line.match(/^supersedes\s*[：:]\s*(\S+)/))) cur.sup.push(m[1])
  }
  flush()
}
for (const r of dRows) {
  const nid = `decisions/${r.domain}#${r.id}`
  N(nid, 'decision', `${r.id} ${r.title}`.slice(0, 40), { status: r.status, domain: r.domain })
  decisionCount++
  for (const p of anchorPaths(r.anchor)) { N(p, 'file', p.split('/').pop()); E(nid, p, 'anchors') }
  if (r.change) {
    if (/^ql-/.test(r.change)) { N(r.change, 'ql', r.change); E(nid, r.change, 'from-change') }
    else { N(r.change, 'change', r.change); E(nid, r.change, 'from-change') }
  }
  for (const s of r.sup) {
    const t = dRows.find(x => x.domain === r.domain && x.id === s)
    if (t) E(nid, `decisions/${t.domain}#${t.id}`, 'supersedes')
  }
}

// ── 2. fr/<域>.md ──
const fdir = join(KDIR, 'fr')
let frCount = 0
const frRows = []
for (const f of existsSync(fdir) ? readdirSync(fdir) : []) {
  if (!f.endsWith('.md')) continue
  const domain = f.replace(/\.md$/, '')
  let cur = null
  const flush = () => { if (cur) frRows.push(cur); cur = null }
  for (const line of readFileSync(join(fdir, f), 'utf8').replace(/\r\n/g, '\n').split('\n')) {
    const h = line.match(/^##\s+(FR-[A-Za-z0-9-]+-\d+)\s*(.*)$/)
    if (h) { flush(); cur = { id: h[1], title: h[2].trim(), domain, change: '', sup: [] }; continue }
    if (!cur) continue
    let m
    if ((m = line.match(/^变更\s*[：:]\s*(\S+)/))) cur.change = m[1]
    else if ((m = line.match(/^承接\s*[：:]\s*(.*)$/))) cur.sup = m[1].split(/[,，、\s]+/).filter(Boolean)
  }
  flush()
}
for (const r of frRows) {
  N(r.id, 'fr', `${r.id} ${(r.title || '').slice(0, 24)}`.trim(), { domain: r.domain })
  frCount++
  if (r.domain) E(r.id, r.domain, 'belongs-module')
  if (r.change) { N(r.change, 'change', r.change); E(r.id, r.change, 'from-change') }
  for (const s of r.sup) { const t = frRows.find(x => x.id === s); if (t) E(r.id, t.id, 'supersedes', '承接') }
}
// 域即模块（fr 域文件名 ↔ module 名）
for (const r of frRows) if (r.domain) N(r.domain, 'module', r.domain, { domain: true })

// ── 3. _module-map.yaml（sillyspec 项目） ──
const mapDir = join(SPEC, '.sillyspec', 'docs', 'sillyspec', 'modules')
let moduleCount = 0
if (existsSync(join(mapDir, '_module-map.yaml'))) {
  const lines = readFileSync(join(mapDir, '_module-map.yaml'), 'utf8').split(/\r?\n/)
  let cur = null, listKey = null
  const mods = []
  for (const line of lines) {
    if (/^\s*#/.test(line)) continue
    const top = line.match(/^  ([a-z][\w-]*):\s*$/)
    if (top) { if (cur) mods.push(cur); cur = { id: top[1], paths: [], dep: [], doc: '' }; listKey = null; continue }
    if (!cur) continue
    let m
    if ((m = line.match(/^(\s+)([\w-]+):\s*(.*)$/)) && m[1].length >= 4) {
      const key = m[2], val = m[3].trim(); listKey = null
      if (key === 'doc' && val) cur.doc = val
      else if ((key === 'depends_on' || key === 'used_by')) {
        if (val.startsWith('[')) cur.dep.push(...val.slice(1, -1).split(',').map(s => s.trim()).filter(Boolean))
        else listKey = key
      } else if (key === 'paths' && val) { /* 罕见内联，忽略 */ }
      continue
    }
    if ((m = line.match(/^\s+-\s+(\S+)\s*$/)) && listKey === 'depends_on') cur.dep.push(m[1])
    if ((m = line.match(/^\s+-\s+(src\/[\w./-]+\/?)\s*$/))) cur.paths.push(m[1])
  }
  if (cur) mods.push(cur)
  for (const mod of mods) {
    N(mod.id, 'module', mod.id); moduleCount++
    for (const p of mod.paths) { N(p, 'file', p.endsWith('/') ? p : p.split('/').pop()); E(mod.id, p, 'module-files') }
    for (const d of mod.dep) { N(d, 'module', d); E(mod.id, d, 'module-dep') }
    if (mod.doc) { N('doc:card:' + mod.id, 'doc', mod.doc.split('/').pop(), { kind: 'module-card' }); E('doc:card:' + mod.id, mod.id, 'describes', 'doc: 字段') }
    const cl = join(mapDir, mod.id + '.changelog.md')
    if (existsSync(cl)) {
      const clId = 'doc:chlog:' + mod.id
      N(clId, 'doc', mod.id + '.changelog.md', { kind: 'module-changelog' })
      E(clId, mod.id, 'changelog-of')
      for (const line of readFileSync(cl, 'utf8').split(/\r?\n/)) {
        const t = line.match(/^\|\s*\d{4}-\d{2}-\d{2}\s*\|\s*([^|]+?)\s*\|/)
        if (!t) continue
        const name = t[1].trim().replace(/[（(]quick[）)]/, '').trim()
        if (/^ql-/.test(name)) { N(name, 'ql', name); E(clId, name, 'changelog-entry') }
        else if (/^\d{4}-\d{2}-\d{2}-/.test(name)) { N(name, 'change', name); E(clId, name, 'changelog-entry') }
      }
    }
  }
}

// ── 4. backend scan 文档（doc 节点 + scan-refs 示意） ──
const scanDir = join(SPEC, '.sillyspec', 'docs', 'backend', 'scan')
if (existsSync(scanDir)) {
  for (const f of readdirSync(scanDir).filter(f => f.endsWith('.md'))) {
    const id = 'doc:scan:backend/' + f
    N(id, 'doc', 'backend/scan/' + f, { kind: 'scan' })
    const toks = [...new Set((readFileSync(join(scanDir, f), 'utf8').match(/[\w./-]+\.(?:py|toml|js|ts)/g) || [])
      .map(t => t.replace(/:(?:\d+(?:-\d+)?|[A-Za-z_$][\w$]*)$/, '')))].slice(0, 12)
    for (const p of toks) { N(p, 'file', p.split('/').pop()); E(id, p, 'scan-refs', '正文路径提取') }
  }
}

// ── 5. INDEX.md 手册条目（entry 节点 + 弱边 route 自 INDEX 文档节点） ──
const indexPath = join(KDIR, 'INDEX.md')
let entryCount = 0
if (existsSync(indexPath)) {
  N('doc:INDEX', 'doc', 'knowledge/INDEX.md', { kind: 'manual-index' })
  for (const line of readFileSync(indexPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^-\s+(.+?)\s*→\s*\[(.+?)\]\(([^#)]+)(?:#([^)]+))?\)/)
    if (!m) continue
    const file = m[3].trim()
    if (/^(decisions|fr|proposed)\//.test(file)) continue
    const anchor = (m[4] || '').trim()
    const id = anchor ? `entry:${file}#${anchor}` : `entry:${file}`
    N(id, 'entry', (anchor || file).slice(0, 34), { file })
    E('doc:INDEX', id, 'route', m[1].split('|')[0])
    entryCount++
  }
}

// ── 6. 模块卡 doc-refs（卡片正文路径提取，前 15 条/卡） ──
let docRefCount = 0
for (const n of [...nodes.filter(n => n.type === 'doc' && n.attrs.kind === 'module-card')]) {
  const p = join(mapDir, n.label) // n.label = 卡片文件名（doc: 字段 basename）
  if (!existsSync(p)) continue
  const toks = [...new Set((readFileSync(p, 'utf8').match(/(?:src|test|bin)\/[\w./-]+\.(?:mjs|cjs|js|ts|json)/g) || []))]
    .map(t => t.replace(/:(?:\d+(?:-\d+)?|[A-Za-z_$][\w$]*)$/, '')).slice(0, 15)
  for (const t of toks) { N(t, 'file', t.split('/').pop()); E(n.id, t, 'doc-refs', '卡片正文路径'); docRefCount++ }
}

// ── 7. 变更 deliverables（归档 design.md 交付表）+ change-modules（路径前缀派生） ──
const modulePathIndex = [] // [module, path]，后缀长者优先匹配
if (existsSync(join(mapDir, '_module-map.yaml'))) {
  let curMod = null
  for (const line of readFileSync(join(mapDir, '_module-map.yaml'), 'utf8').split(/\r?\n/)) {
    const top = line.match(/^  ([a-z][\w-]*):\s*$/)
    if (top && !/^(paths|tags|aliases|entrypoints|main_symbols|depends_on|used_by)$/.test(top[1])) { curMod = top[1]; continue }
    const pi = line.match(/^\s+-\s+(src\/[\w./-]+\/?)\s*$/)
    if (pi && curMod) modulePathIndex.push([curMod, pi[1]])
  }
}
modulePathIndex.sort((a, b) => b[1].length - a[1].length)
const moduleOf = (p) => {
  const v = String(p).replace(/\\/g, '/')
  for (const [mod, mp] of modulePathIndex) {
    if (mp.endsWith('/') ? v.startsWith(mp) : v === mp) return mod
  }
  return null
}
let deliverableCount = 0, changeModuleCount = 0
const arcRoot = join(SPEC, '.sillyspec', 'changes', 'archive')
for (const n of [...nodes.filter(n => n.type === 'change')]) {
  const dir = join(arcRoot, n.id)
  const mods = new Set()
  const addFile = (f) => {
    const v = String(f || '').trim().replace(/^`+|`+$/g, '').replace(/\\/g, '/').replace(/\/+$/, '')
    if (!v || v.startsWith('.sillyspec/')) return
    N(v, 'file', v.split('/').pop()); E(n.id, v, 'deliverables'); deliverableCount++
    const mod = moduleOf(v)
    if (mod) { mods.add(mod); N(mod, 'module', mod) }
  }
  // 源①：design.md 交付清单表（厚道主源）
  const dp = join(dir, 'design.md')
  if (existsSync(dp)) {
    for (const line of readFileSync(dp, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\|\s*(?:新增|修改|删除)\s*\|\s*(?:NEW:)?([^\s|]+)\s*\|/)
      if (m) addFile(m[1])
    }
  }
  // 源②：change-patch.json 的 files（thin 主源，frCoverageFiles 同款双源并集）
  const pp = join(dir, 'change-patch.json')
  if (existsSync(pp)) {
    try {
      const j = JSON.parse(readFileSync(pp, 'utf8'))
      for (const f of (Array.isArray(j && j.files) ? j.files : [])) addFile(f)
    } catch { /* 坏 JSON 跳过（fail-soft） */ }
  }
  for (const mod of mods) { E(n.id, mod, 'change-modules'); changeModuleCount++ }
}

// ── 8. FR 测试绑定（条目「测试绑定：」子块 tests 行，前 3/条）+ ql 侧车 ──
let testBindingCount = 0
for (const f of existsSync(fdir) ? readdirSync(fdir) : []) {
  if (!f.endsWith('.md')) continue
  const content = readFileSync(join(fdir, f), 'utf8').replace(/\r\n/g, '\n')
  const secs = content.split(/^##\s+FR-/m) // 分节剥掉 FR- 前缀，条目 id 需补回
  for (const sec of secs) {
    const idm = (sec.match(/^([A-Za-z0-9-]+-\d+)/) || [])[0]
    if (!idm || !seenN.has('FR-' + idm)) continue
    const bind = sec.indexOf('测试绑定')
    if (bind < 0) continue
    const block = sec.slice(bind, bind + 1500)
    const toks = [...new Set(block.match(/[\w./-]*test[\w./-]*/g) || [])].filter(t => /\//.test(t)).slice(0, 3)
    for (const t of toks) { N(t, 'test', t.split('/').pop()); E('FR-' + idm, t, 'test-binding'); testBindingCount++ }
  }
}
// 真源②：.sillyspec/quicklog/test-bindings.json（ql 锚 → tests）
const tbPath = join(SPEC, '.sillyspec', 'quicklog', 'test-bindings.json')
if (existsSync(tbPath)) {
  try {
    const rows = JSON.parse(readFileSync(tbPath, 'utf8')).rows || {}
    for (const arr of Object.values(rows)) {
      for (const r of (Array.isArray(arr) ? arr : [])) {
        if (!r || r.status === 'superseded') continue
        for (const t of (Array.isArray(r.tests) ? r.tests : []).slice(0, 3)) {
          const tp = String(t).replace(/\\/g, '/')
          N(tp, 'test', tp.split('/').pop())
          if (r.anchor && seenN.has(r.anchor)) { E(r.anchor, tp, 'test-binding'); testBindingCount++ }
        }
      }
    }
  } catch { /* 坏 JSON 跳过（fail-soft） */ }
}

const stats = {
  nodes: nodes.length, edges: edges.length,
  byType: nodes.reduce((a, n) => (a[n.type] = (a[n.type] || 0) + 1, a), {}),
  byEdge: edges.reduce((a, e) => (a[e.type] = (a[e.type] || 0) + 1, a), {}),
  decisionCount, frCount, moduleCount, entryCount, docRefCount, deliverableCount, changeModuleCount, testBindingCount,
}

// ── 5. 聚类布局（确定性 sunflower 摆位；全图模式下原型只渲染不跑物理） ──
const comm = (n) => {
  if (n.type === 'decision') return '决策域/' + n.attrs.domain
  if (n.type === 'fr') return 'FR域/' + n.attrs.domain
  if (n.type === 'module') return '模块'
  if (n.type === 'file') return '文件/' + (n.id.includes('/') ? n.id.split('/')[0] : '.')
  if (n.type === 'doc') return '文档'
  if (n.type === 'change') return '变更'
  if (n.type === 'ql') return 'quicklog'
  return '其他'
}
const groups = new Map()
for (const n of nodes) { const k = comm(n); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(n) }
const gArr = [...groups.entries()].sort((a, b) => b[1].length - a[1].length)
gArr.forEach(([k, arr], gi) => {
  const gc = Math.sqrt(gi + 1) * 300, ga = gi * 2.39999
  const cx = Math.cos(ga) * gc, cy = Math.sin(ga) * gc
  arr.forEach((n, j) => {
    const r = 16 * Math.sqrt(j + 1), a = j * 2.39999 + gi
    n.x = Math.round(cx + Math.cos(a) * r)
    n.y = Math.round(cy + Math.sin(a) * r)
  })
})

console.log('/* 自动生成：node prototype-data-gen.cjs > prototype-data.js（勿手改） */')
console.log('window.PROTO_DATA = ' + JSON.stringify({ stats, groups: gArr.map(([k, a]) => [k, a.length]), nodes, edges }) + ';')
process.stderr.write(JSON.stringify(stats))