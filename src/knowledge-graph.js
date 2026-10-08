/**
 * knowledge-graph.js — 知识图谱引擎（2026-10-08-knowledge-graph）
 *
 * 设计锚：.sillyspec/changes/2026-10-08-knowledge-graph/design.md（本体表=核心契约）。
 * 原则（D-003 墓碑切割）：md/yaml 是唯一真相源，图是 buildKnowledgeGraph() 解析时内存派生
 * ——不落盘任何缓存文件、无刷新机制；只读不改任何知识文件。
 *
 * 本体（10 节点 / 16 边 / 三档强度）：
 *   节点：entry | decision | fr | module | file | test | change | ql | doc | project
 *   边（强度 strong=可传播 / medium=仅展示 / weak=仅展示与自检；可传递仅 supersedes、module-dep）：
 *     anchors / supersedes / from-change / belongs-module / module-dep / module-files /
 *     deliverables / change-modules / test-binding / describes / changelog-of /
 *     changelog-entry / doc-refs / scan-refs / route / entry-link（预留，本模块不采集）
 *
 * 解析纪律：字段契约复用既有 parser import 不复制——decisions 走 knowledge-match
 * parseDecisionEntries（去重键 file+id+change，跨变更同号不折叠）、INDEX 路由走
 * parseKnowledgeIndex、模块图走 modules.parseModuleMapSimple。fr/changelog/文档引用为本
 * 模块域内解析（沿 fr-index renderFrLines / module-changelog 行形态的机械契约）。
 */

import { existsSync, readFileSync, readdirSync } from 'fs'
import { join } from 'path'
import { parseKnowledgeIndex, parseDecisionEntries, anchorFilePaths } from './knowledge-match.js'
import { parseModuleMapSimple } from './modules.js'

// ── 本体常量（design.md 总体方案 §1 的代码化） ──

export const EDGE_STRENGTH = {
  'anchors': 'strong', 'supersedes': 'strong', 'from-change': 'strong',
  'belongs-module': 'strong', 'module-dep': 'strong', 'module-files': 'strong',
  'deliverables': 'strong', 'change-modules': 'strong', 'test-binding': 'strong',
  'describes': 'strong', 'changelog-of': 'strong', 'changelog-entry': 'strong',
  'doc-refs': 'medium', 'scan-refs': 'medium',
  'route': 'weak', 'entry-link': 'weak',
}
// 可传递边（推理规则：其余强边一跳、传递边沿链）
export const TRANSMISSIVE_EDGES = new Set(['supersedes', 'module-dep'])

const ANCHOR_RE = /[\w./-]+\.(?:mjs|cjs|jsx|tsx|js|ts|py|go|java|rs|yaml|yml|json|md)/g

/** POSIX 归一（Windows 反斜杠/尾斜杠）。 */
const posix = (p) => String(p || '').trim().replace(/\\/g, '/').replace(/\/+$/, '')

/** 文本中的代码路径 token 提取（doc-refs/scan-refs 采集器——中强度引用边）。
 *  与 knowledge-match anchorFilePaths 同款剥法，但面向正文全量文本；cap 限边数防噪。 */
function extractFilePaths(text, cap = 15) {
  const raw = String(text || '').replace(/\r\n/g, '\n').match(ANCHOR_RE) || []
  const out = []
  for (const t of raw) {
    const p = posix(t.replace(/:(?:\d+(?:-\d+)?|[A-Za-z_$][A-Za-z0-9_$]*)$/, ''))
    if (p && !out.includes(p)) out.push(p)
    if (out.length >= cap) break
  }
  return out
}

// ── 构建器 ──

export function buildKnowledgeGraph(specRoot) {
  const nodes = new Map()
  const edges = []
  const byEdgeType = new Map()

  const addNode = (id, type, label, attrs = {}) => {
    const key = String(id)
    if (!nodes.has(key)) nodes.set(key, { id: key, type, label: label || key, attrs })
    return nodes.get(key)
  }
  const addEdge = (s, t, type, note = '') => {
    if (!nodes.has(String(s)) || !nodes.has(String(t))) return false
    if (s === t) return false
    const key = `${s}|${t}|${type}`
    if (byEdgeType.get(type)?.some((e) => `${e.s}|${e.t}|${e.type}` === key)) return false
    const e = { s: String(s), t: String(t), type, note: String(note || '') }
    edges.push(e)
    if (!byEdgeType.has(type)) byEdgeType.set(type, [])
    byEdgeType.get(type).push(e)
    return true
  }

  const knowledgeDir = join(specRoot, 'knowledge')
  const docsDir = join(specRoot, 'docs')
  const changesDir = join(specRoot, 'changes')
  const archiveRoot = join(changesDir, 'archive')

  // ── ① INDEX 手册条目（弱边 route；INDEX 行不建 keyword 节点——防图爆炸，路由行由
  //      INDEX 文档节点挂接） ──
  const indexEntries = existsSync(join(knowledgeDir, 'INDEX.md')) ? parseKnowledgeIndex(knowledgeDir) : []
  let routeCount = 0
  if (existsSync(join(knowledgeDir, 'INDEX.md'))) {
    addNode('doc:INDEX', 'doc', 'knowledge/INDEX.md', { kind: 'manual-index' })
    for (const ent of indexEntries) {
      if (/^(decisions|fr|proposed)\//.test(posix(ent.file))) continue // 决策/FR 有自己的节点面
      const id = ent.anchor ? `entry:${ent.file}#${ent.anchor}` : `entry:${ent.file}`
      addNode(id, 'entry', ent.display || ent.anchor || ent.file, { file: ent.file, keywords: ent.keywords })
      if (addEdge('doc:INDEX', id, 'route', ent.keywords[0] || '')) routeCount++
    }
  }

  // ── ② 决策库（parseDecisionEntries：去重键 file+id+change 跨变更同号不折叠） ──
  const decisionHits = existsSync(join(knowledgeDir, 'INDEX.md')) ? parseDecisionEntries(knowledgeDir) : []
  for (const h of decisionHits) {
    const id = `decision:${h.file}#${h.id}${h.change ? `@${h.change}` : ''}`
    addNode(id, 'decision', `${h.id} ${h.title || ''}`.trim(), {
      // attrs 保留 parseDecisionEntries 全量字段——scopeRecall 构造 decisionHits 时零重解析
      hit: h, status: h.status || '', domain: String(h.file || '').replace(/^decisions\//, '').replace(/\.md$/, ''),
    })
    for (const p of anchorFilePaths(h.anchor || '')) {
      addNode(p, 'file', p.split('/').pop())
      addEdge(id, p, 'anchors', String(h.anchor || '').slice(0, 40))
    }
    // 「文件：」字段（matchDecisionsByFiles 语义同源）
    for (const p of h.files || []) {
      addNode(p, 'file', p.split('/').pop())
      addEdge(id, p, 'anchors', '文件：')
    }
    if (h.change) {
      if (/^ql-/.test(h.change)) addNode(h.change, 'ql', h.change)
      else addNode(h.change, 'change', h.change)
      addEdge(id, h.change, 'from-change')
    }
    // supersedes：同域 D-id 解析（「supersedes：无（…）」等非 id 值被正则白名单滤掉；跨变更同号时取同变更优先，再退首个）
    const supIds = String(h.supersedesText || '').split(/[,，、\s]+/).filter((s) => /^D-\d+@v\d+$/.test(s))
    for (const sid of supIds) {
      const target = decisionHits.find((x) => x.id === sid && x.file === h.file && (x.change || '') === (h.change || ''))
        || decisionHits.find((x) => x.id === sid && x.file === h.file)
      if (target) {
        const tid = `decision:${target.file}#${target.id}${target.change ? `@${target.change}` : ''}`
        addEdge(id, tid, 'supersedes')
      }
    }
  }

  // ── ③ FR 索引（fr/<域>.md：变更/状态/superseded_by/取代链/测试绑定子块） ──
  const frDir = join(knowledgeDir, 'fr')
  const frRows = []
  if (existsSync(frDir)) {
    for (const f of readdirSync(frDir)) {
      if (!f.endsWith('.md')) continue
      const domain = f.replace(/\.md$/, '')
      const content = readFileSync(join(frDir, f), 'utf8').replace(/\r\n/g, '\n')
      let cur = null
      const flush = () => { if (cur) frRows.push(cur); cur = null }
      for (const line of content.split('\n')) {
        const h = line.match(/^##\s+(FR-[A-Za-z0-9-]+-\d+)\s*(.*)$/)
        if (h) { flush(); cur = { domain, id: h[1], title: h[2].trim(), change: '', supersedes: [], supersededBy: '', tests: [] }; continue }
        if (!cur) continue
        let m
        if ((m = line.match(/^变更\s*[：:]\s*(\S+)/))) cur.change = m[1]
        else if ((m = line.match(/^superseded_by\s*[：:]\s*(\S+)/))) cur.supersededBy = m[1]
        else if ((m = line.match(/^取代链\s*[：:]\s*(.*)$/))) {
          // 「FR-x-001, FR-x-002 ← 本条目（变更 承接）」——箭头左侧为被取代 id 列表
          cur.supersedes = (m[1].split('←')[0].match(/FR-[A-Za-z0-9-]+-\d+/g) || [])
        } else if ((m = line.match(/^\s+tests\s*[：:]\s*([^\s「]+)/))) cur.tests.push(posix(m[1]))
      }
      flush()
    }
  }
  for (const r of frRows) {
    addNode(r.id, 'fr', `${r.id} ${r.title}`.trim(), { domain: r.domain, status: r.supersededBy ? 'superseded' : 'active' })
    if (r.domain) { addNode(r.domain, 'module', r.domain, { fromFrDomain: true }); addEdge(r.id, r.domain, 'belongs-module') }
    if (r.change) { addNode(r.change, 'change', r.change); addEdge(r.id, r.change, 'from-change') }
    for (const old of r.supersedes) {
      if (frRows.some((x) => x.id === old)) addEdge(r.id, old, 'supersedes', '取代链')
    }
    if (r.supersededBy && frRows.some((x) => x.id === r.supersededBy) && !byEdgeType.get('supersedes')?.some((e) => e.t === r.id)) {
      addEdge(r.supersededBy, r.id, 'supersedes', 'superseded_by 反向补链')
    }
    for (const t of r.tests.slice(0, 3)) { addNode(t, 'test', t.split('/').pop()); addEdge(r.id, t, 'test-binding') }
  }

  // ── ④ 模块图 + 模块卡 + changelog（docs/<项目>/modules/） ──
  if (existsSync(docsDir)) {
    for (const proj of readdirSync(docsDir, { withFileTypes: true })) {
      if (!proj.isDirectory()) continue
      const mapDir = join(docsDir, proj.name, 'modules')
      const mapPath = join(mapDir, '_module-map.yaml')
      const projectNode = `project:${proj.name}`
      addNode(projectNode, 'project', proj.name, {})
      if (!existsSync(mapPath)) continue
      const mods = parseModuleMapSimple(readFileSync(mapPath, 'utf8'))
      // 模块 paths 扁平索引（change-modules 最长前缀派生用）
      const modulePathIndex = []
      for (const [modId, mod] of Object.entries(mods || {})) {
        const mid = `module:${modId}`
        addNode(mid, 'module', modId, { project: proj.name })
        for (const p of (mod.paths || []).map(posix)) {
          addNode(p, 'file', p.endsWith('/') ? p : p.split('/').pop(), { isDir: p.endsWith('/') })
          addEdge(mid, p, 'module-files')
          modulePathIndex.push([mid, p])
        }
        for (const d of (mod.depends_on || []).map(posix)) { addNode(`module:${d}`, 'module', d); addEdge(mid, `module:${d}`, 'module-dep') }
        if (mod.doc) {
          const cardId = `doc:card:${proj.name}/${modId}`
          addNode(cardId, 'doc', mod.doc.split('/').pop(), { kind: 'module-card', project: proj.name })
          addEdge(cardId, mid, 'describes', 'doc: 字段')
          // doc: 字段相对 docs/<项目>/（值形如 modules/core.md），非相对 modules/ 目录
          const cardPath = join(docsDir, proj.name, posix(mod.doc))
          if (existsSync(cardPath)) {
            for (const p of extractFilePaths(readFileSync(cardPath, 'utf8'), 15)) {
              addNode(p, 'file', p.split('/').pop())
              addEdge(cardId, p, 'doc-refs', '卡片正文路径')
            }
          }
        }
        const clPath = join(mapDir, `${modId}.changelog.md`)
        if (existsSync(clPath)) {
          const clId = `doc:chlog:${proj.name}/${modId}`
          addNode(clId, 'doc', `${modId}.changelog.md`, { kind: 'module-changelog', project: proj.name })
          addEdge(clId, mid, 'changelog-of')
          for (const name of parseChangelogEntries(readFileSync(clPath, 'utf8'))) {
            if (/^ql-/.test(name)) addNode(name, 'ql', name)
            else addNode(name, 'change', name)
            addEdge(clId, name, 'changelog-entry')
          }
        }
      }
      // 扫描文档（docs/<项目>/scan/*.md——中强度引用边，project 归属进节点属性非边）
      const scanDir = join(docsDir, proj.name, 'scan')
      if (existsSync(scanDir)) {
        for (const f of readdirSync(scanDir)) {
          if (!f.endsWith('.md')) continue
          const sid = `doc:scan:${proj.name}/${f}`
          addNode(sid, 'doc', `${proj.name}/scan/${f}`, { kind: 'scan', project: proj.name })
          for (const p of extractFilePaths(readFileSync(join(scanDir, f), 'utf8'), 12)) {
            addNode(p, 'file', p.split('/').pop())
            addEdge(sid, p, 'scan-refs', '正文路径提取')
          }
        }
      }
      // ⑤ 变更交付面（deliverables 双源：design.md 交付表 ∪ change-patch.json files——D-005）
      //    + change-modules（deliverables ∩ 模块 paths 最长前缀派生）
      if (existsSync(archiveRoot)) {
        modulePathIndex.sort((a, b) => b[1].length - a[1].length)
        const moduleOf = (p) => {
          const v = posix(p)
          for (const [mid, mp] of modulePathIndex) {
            // 模块 paths 是目录/glob 语义：剥尾斜杠后按「相等 或 path/ 前缀」匹配
            const stem = posix(mp).replace(/\/+$/, '')
            if (v === stem || v.startsWith(stem + '/')) return mid
          }
          return null
        }
        for (const n of [...nodes.values()].filter((n) => n.type === 'change')) {
          const dir = join(archiveRoot, n.id)
          const addFile = (f) => {
            // 剥反引号与 NEW: 前缀（fr-index deliverableFilesFromDesignText 同款契约——29.4% 厚道条目带壳）
            const v = posix(String(f || '').replace(/^`+|`+$/g, '').replace(/^NEW:/, ''))
            if (!v || v.startsWith('.sillyspec/')) return
            addNode(v, 'file', v.split('/').pop())
            addEdge(n.id, v, 'deliverables')
            const mid = moduleOf(v)
            if (mid) { addNode(mid, 'module', mid.replace(/^module:/, '')); addEdge(n.id, mid, 'change-modules') }
          }
          const dp = join(dir, 'design.md')
          if (existsSync(dp)) {
            for (const line of readFileSync(dp, 'utf8').split(/\r?\n/)) {
              const m = line.match(/^\|\s*(?:新增|修改|删除)\s*\|\s*(?:NEW:)?([^\s|]+)\s*\|/)
              if (m) addFile(m[1])
            }
          }
          const pp = join(dir, 'change-patch.json')
          if (existsSync(pp)) {
            try {
              const j = JSON.parse(readFileSync(pp, 'utf8'))
              for (const f of (Array.isArray(j?.files) ? j.files : [])) addFile(f)
            } catch { /* 坏 JSON fail-soft */ }
          }
        }
      }
    }
  }

  // ── ⑥ quicklog 测试绑定侧车（真源②：ql 锚 → tests） ──
  const tbPath = join(specRoot, 'quicklog', 'test-bindings.json')
  if (existsSync(tbPath)) {
    try {
      const rows = JSON.parse(readFileSync(tbPath, 'utf8')).rows || {}
      for (const arr of Object.values(rows)) {
        for (const r of (Array.isArray(arr) ? arr : [])) {
          if (!r || r.status === 'superseded') continue
          for (const t of (Array.isArray(r.tests) ? r.tests : []).slice(0, 3)) {
            const tp = posix(t)
            addNode(tp, 'test', tp.split('/').pop())
            if (r.anchor) { addNode(r.anchor, 'ql', r.anchor); addEdge(r.anchor, tp, 'test-binding') }
          }
        }
      }
    } catch { /* 坏 JSON fail-soft */ }
  }

  const stats = {
    nodeCount: nodes.size,
    edgeCount: edges.length,
    byNodeType: [...nodes.values()].reduce((a, n) => (a[n.type] = (a[n.type] || 0) + 1, a), {}),
    byEdgeType: edges.reduce((a, e) => (a[e.type] = (a[e.type] || 0) + 1, a), {}),
  }
  return { root: specRoot, nodes, edges, byEdgeType, stats }
}

/** changelog 三态行解析（表格行 ∪ 列表行 ∪ 标题态——backend 侧主形态；坏行跳过 fail-soft）。 */
export function parseChangelogEntries(content) {
  const out = []
  const seen = new Set()
  const push = (name) => {
    const n = String(name || '').trim().replace(/[（(]quick[）)]/, '').trim()
    if (!n || seen.has(n)) return
    if (/^ql-/.test(n) || /^\d{4}-\d{2}-\d{2}-/.test(n)) { seen.add(n); out.push(n) }
  }
  for (const line of String(content || '').replace(/\r\n/g, '\n').split('\n')) {
    let m
    if ((m = line.match(/^\|\s*\d{4}-\d{2}-\d{2}\s*\|\s*([^|]+?)\s*\|/))) push(m[1]) // 表格行
    else if ((m = line.match(/^-\s+(ql-[\w-]+|\d{4}-\d{2}-\d{2}-[\w.-]+)/))) push(m[1]) // 列表行
    else if ((m = line.match(/^##\s+\d{4}-\d{2}-\d{2}\s*[—-]\s+.*[（(](\d{4}-\d{2}-\d{2}-[\w.-]+)(?:\s+task-\d+)?[）)]/))) push(m[1]) // 标题态（backend 主形态）
  }
  return out
}

// ═══════════════════════════════════════════════════════════════
// 查询面（task-02）——遍历类只在强边子集上扩展（推理规则，D-002）
// ═══════════════════════════════════════════════════════════════

/** 锚点模糊解析：节点 id 精确 → basename/label 尾段匹配 → FR/D 裸号匹配（CLI 人用入口）。 */
export function resolveGraphNode(graph, key) {
  const k = String(key || '').trim()
  if (!k) return null
  if (graph.nodes.has(k)) return graph.nodes.get(k)
  const bare = k.replace(/^.*\//, '')
  for (const n of graph.nodes.values()) {
    if (n.id.endsWith('/' + bare) || n.label === k) return n
  }
  // 裸号形态：D-001@v1 / D-001@v1@变更 / FR-域-NNN / 变更名 / ql-id
  for (const n of graph.nodes.values()) {
    if (n.type === 'decision' && (n.attrs.hit?.id === k || n.id.endsWith(`#${k}`))) return n
    if (n.type === 'fr' && n.id === k) return n
  }
  return null
}

function edgesOf(graph, { edgeClass = 'all', edgeType } = {}) {
  if (edgeType) return graph.byEdgeType.get(edgeType) || []
  if (edgeClass === 'strong') return graph.edges.filter((e) => EDGE_STRENGTH[e.type] === 'strong')
  return graph.edges
}

/** 一跳（或多跳）邻域。depth>1 沿限定边集扩展；返回 {nodes, edges}（含起点）。 */
export function graphNeighbors(graph, key, { depth = 1, edgeClass = 'all', edgeType } = {}) {
  const start = resolveGraphNode(graph, key)
  if (!start) return { found: false, nodes: [], edges: [] }
  const es = edgesOf(graph, { edgeClass, edgeType })
  const nset = new Set([start.id])
  const eset = new Set()
  let front = [start.id]
  for (let d = 0; d < depth && front.length; d++) {
    const nf = []
    for (const id of front) {
      for (const e of es) {
        let other = null
        if (e.s === id && graph.nodes.has(e.t)) other = e.t
        else if (e.t === id && graph.nodes.has(e.s)) other = e.s
        if (other === null || other === id) continue
        eset.add(e)
        if (!nset.has(other)) { nset.add(other); nf.push(other) }
      }
    }
    front = nf
  }
  return {
    found: true,
    nodes: [...nset].map((id) => graph.nodes.get(id)),
    edges: [...eset],
  }
}

/** 强边 BFS 寻路（中/弱边不参与——推理规则）。不可达显式 found:false。 */
export function graphPath(graph, keyA, keyB) {
  const a = resolveGraphNode(graph, keyA), b = resolveGraphNode(graph, keyB)
  if (!a || !b) return { found: false, reason: !a ? `起点未命中：${keyA}` : `终点未命中：${keyB}`, hops: [] }
  const strong = graph.edges.filter((e) => EDGE_STRENGTH[e.type] === 'strong')
  const prev = new Map([[a.id, null]])
  const q = [a.id]
  while (q.length) {
    const id = q.shift()
    if (id === b.id) break
    for (const e of strong) {
      let nx = null
      if (e.s === id && graph.nodes.has(e.t)) nx = e.t
      else if (e.t === id && graph.nodes.has(e.s)) nx = e.s
      if (nx && !prev.has(nx)) { prev.set(nx, { from: id, e }); q.push(nx) }
    }
  }
  if (!prev.has(b.id)) return { found: false, reason: '强边子集上不可达（中/弱边不参与寻路）', hops: [] }
  const hops = []
  let cur = b.id
  while (prev.get(cur)) { const p = prev.get(cur); hops.unshift(p.e); cur = p.from }
  return { found: true, hops }
}

/** 强边闭包（impact）：深度≤2 为设计契约上限；supersedes/module-dep 传递例外沿链多追一跳。
 *  返回 {closure, modules, decisionsAndFrs, rejectedReachable}——防复潮计数为 rejected ∪ 死路可达集。 */
export function graphImpact(graph, key) {
  const start = resolveGraphNode(graph, key)
  if (!start) return { found: false }
  const strong = graph.edges.filter((e) => EDGE_STRENGTH[e.type] === 'strong')
  // 主闭包：深度 2
  const closure = new Set([start.id])
  let front = [start.id]
  for (let d = 0; d < 2 && front.length; d++) {
    const nf = []
    for (const id of front) for (const e of strong) {
      let nx = null
      if (e.s === id && graph.nodes.has(e.t)) nx = e.t
      else if (e.t === id && graph.nodes.has(e.s)) nx = e.s
      if (nx && !closure.has(nx)) { closure.add(nx); nf.push(nx) }
    }
    front = nf
  }
  // 传递例外：闭包内节点上的 supersedes/module-dep 边再沿一跳（版本链/依赖闭包语义）
  for (const id of [...closure]) {
    for (const e of strong) {
      if (!TRANSMISSIVE_EDGES.has(e.type)) continue
      let nx = null
      if (e.s === id && closure.has(e.t)) continue
      if (e.s === id) nx = e.t
      else if (e.t === id) nx = e.s
      if (nx && !closure.has(nx)) closure.add(nx)
    }
  }
  const nodesOf = (type) => [...closure].filter((id) => graph.nodes.get(id)?.type === type).map((id) => graph.nodes.get(id))
  const rejectedReachable = [...closure]
    .map((id) => graph.nodes.get(id))
    .filter((n) => n?.type === 'decision' && (n.attrs.status === 'rejected' || n.attrs.hit?.deathPath))
  return {
    found: true,
    closure: [...closure],
    modules: nodesOf('module').map((n) => n.id),
    decisionsAndFrs: [...closure].filter((id) => ['decision', 'fr'].includes(graph.nodes.get(id)?.type)).map((id) => graph.nodes.get(id)),
    rejectedReachable,
  }
}

/** 孤儿检测：零度节点 + entry 型无路由无强边（doctor: graph-orphan-entry 消费）。 */
export function graphOrphans(graph) {
  const deg = new Set()
  for (const e of graph.edges) { deg.add(e.s); deg.add(e.t) }
  const out = []
  for (const n of graph.nodes.values()) {
    if (n.type === 'project') continue // project 恒零度（归属在 doc 节点属性，非边）
    if (n.type === 'entry') {
      const hasRoute = graph.edges.some((e) => e.t === n.id && e.type === 'route')
      const hasStrong = graph.edges.some((e) => (e.s === n.id || e.t === n.id) && EDGE_STRENGTH[e.type] === 'strong')
      if (!hasRoute && !hasStrong) out.push({ node: n, kind: 'entry-no-route-no-strong' })
    } else if (!deg.has(n.id)) {
      out.push({ node: n, kind: 'zero-degree' })
    }
  }
  return out
}

/** 悬空检测：路由/引用/锚点边指向不存在文件（doctor: graph-*-dangling-* 消费）。 */
export function graphDangling(graph, { existsFn = existsSync } = {}) {
  const out = []
  const rootDir = String(graph.root || '')
  for (const e of graph.edges) {
    if (!['route', 'doc-refs', 'scan-refs', 'anchors', 'deliverables', 'test-binding', 'module-files'].includes(e.type)) continue
    // 两端都在图中（建图保证）——悬空语义=目标文件在文件系统不存在
    const t = graph.nodes.get(e.t)
    const s = graph.nodes.get(e.s)
    const target = t?.type === 'file' || t?.type === 'test' ? t : (s?.type === 'file' ? s : null)
    if (!target) continue
    if (target.attrs?.isDir) continue
    if (!existsFn(join(rootDir, target.id)) && !existsFn(target.id)) {
      out.push({ edge: e, missing: target.id, strength: EDGE_STRENGTH[e.type] })
    }
  }
  return out
}

// ═══ 2026-10-08-graph-summary-nodes：summary 聚合 + nodes 搜索（平台仓阶段三依赖契约）═══
// 平台侧（multi-agent-platform 2026-10-08-platform-knowledge-graph）经 daemon RPC 直采本面。
// doctor 同源三判定（2026-10-08-graph-summary-consistency 收敛为真单一源）：graphModuleDocGaps /
// graphChangelogDanglings / graphOrphans+graphDangling 的判定逻辑只在 knowledge-graph.js 定义，
// doctor 六检查与 summary 四计数消费同一函数——「口径一处定义两处消费」由测试交叉断言钉死。

/** 模块文档缺口判定（doctor graph-module-doc-gap 单一源）：map 模块缺 describes 或 changelog-of 入边。 */
export function graphModuleDocGaps(graph) {
  const hasDescribes = new Set((graph.byEdgeType.get('describes') || []).map((e) => e.t))
  const hasChlog = new Set((graph.byEdgeType.get('changelog-of') || []).map((e) => e.t))
  const mapModules = [...graph.nodes.values()].filter((n) => n.type === 'module' && n.attrs.project && !n.attrs.fromFrDomain)
  return mapModules.filter((n) => !hasDescribes.has(n.id) || !hasChlog.has(n.id))
}

/** changelog 行悬空判定（doctor graph-changelog-dangling 单一源）：日期名目标不在 archive/ 也不在
 *  活跃 changes/（ql 目标豁免——quicklog 条目无目录形态，其家在 QUICKLOG md 文件）。 */
export function graphChangelogDanglings(graph, { existsFn = existsSync } = {}) {
  const specRoot = String(graph.root || '')
  const out = []
  for (const id of new Set((graph.byEdgeType.get('changelog-entry') || []).map((e) => e.t))) {
    if (/^\d{4}-\d{2}-\d{2}-/.test(id) && !existsFn(join(specRoot, 'changes', 'archive', id)) && !existsFn(join(specRoot, 'changes', id))) out.push(id)
  }
  return out
}

/** 节点 → 簇域（lite 总览聚类键 type×domain；缺省占位防散簇）。 */
function graphNodeDomain(graph, n) {
  switch (n.type) {
    case 'fr': case 'decision':
      return n.attrs.domain || '_unmapped'
    case 'file': {
      // module-files 精确挂接反查（多挂取最长模块 id——窄域优先）
      const mods = graph.edges.filter((e) => e.type === 'module-files' && e.t === n.id).map((e) => e.s.replace(/^module:/, ''))
      return mods.sort((a, b) => b.length - a.length)[0] || '_unmapped'
    }
    case 'module':
      return n.id.replace(/^module:/, '')
    case 'doc':
      return n.attrs.kind || 'doc'
    case 'entry':
      return n.attrs.file || '_unmapped'
    case 'test': {
      const fr = graph.edges.find((e) => e.type === 'test-binding' && e.t === n.id)
      return (fr && graph.nodes.get(fr.s)?.attrs?.domain) || '_tests'
    }
    default: // project/change/ql：id 即域
      return n.id
  }
}

/** 全图聚合：规模/分布 + doctor 同源四计数 + clusters 簇代表（度数 top-5，度=全边入+出）。
 *  clustersLimit>0 时仅返回 count 前 N 簇（真图 800+ 簇，平台 lite 画布摆不下——消费方按需截断）。 */
export function graphSummary(graph, { existsFn = existsSync, clustersLimit = 0 } = {}) {
  const orphans = graphOrphans(graph).length
  const dangling = graphDangling(graph, { existsFn })
  const danglingRefs = dangling.length
  // 分强度计数（附加字段——dangling_refs 是两类之和，消费方对账 doctor 时按 breakdown 拆）
  const danglingBreakdown = dangling.reduce((a, d) => {
    if (EDGE_STRENGTH[d.edge.type] === 'strong') a.strong_anchors++
    else if (EDGE_STRENGTH[d.edge.type] === 'medium') a.medium_doc_refs++
    return a
  }, { strong_anchors: 0, medium_doc_refs: 0 })
  const moduleDocGaps = graphModuleDocGaps(graph).length
  const changelogDanglings = graphChangelogDanglings(graph, { existsFn }).length
  // clusters：type×domain 聚簇，representatives 度数 top-5（同度按 id 字典序稳序）
  const deg = new Map()
  for (const e of graph.edges) {
    deg.set(e.s, (deg.get(e.s) || 0) + 1)
    deg.set(e.t, (deg.get(e.t) || 0) + 1)
  }
  const buckets = new Map()
  for (const n of graph.nodes.values()) {
    const key = `${n.type}:${graphNodeDomain(graph, n)}`
    if (!buckets.has(key)) buckets.set(key, [])
    buckets.get(key).push(n)
  }
  const allClusters = [...buckets.entries()].map(([key, ns]) => ({
    key,
    label: key.slice(key.indexOf(':') + 1),
    count: ns.length,
    representatives: [...ns]
      .sort((a, b) => (deg.get(b.id) || 0) - (deg.get(a.id) || 0) || a.id.localeCompare(b.id))
      .slice(0, 5)
      .map((n) => ({ id: n.id, type: n.type, label: n.label })),
  })).sort((a, b) => b.count - a.count || a.key.localeCompare(b.key))
  const clusters = clustersLimit > 0 ? allClusters.slice(0, clustersLimit) : allClusters
  return {
    nodes: graph.stats.nodeCount,
    edges: graph.stats.edgeCount,
    byType: graph.stats.byNodeType,
    byEdge: graph.stats.byEdgeType,
    orphans,
    module_doc_gaps: moduleDocGaps,
    changelog_danglings: changelogDanglings,
    dangling_refs: danglingRefs,
    // dangling_refs 构成（附加字段，向后兼容）：doctor graph-dangling-anchor（强）+ graph-doc-dangling-ref（中）之和
    dangling_refs_breakdown: danglingBreakdown,
    clusters,
  }
}

/** 全图粗分组（原型 prototype-data-gen.cjs comm() 逐行移植——2026-10-09-knowledge-graph-fullmap Grill F-01 钉死口径：
 *  decision/fr 按域、module/doc 单组、file 按顶级目录、change、ql、其余"其他"；星系数=comm() 实际分组数（真图实测 150-175，原型视觉即如此）。
 *  禁用 summary 细簇（883 簇会把主环撑到 ~8900px 退化均匀散点）。 */
function graphCommunity(n) {
  if (n.type === 'decision') return '决策域/' + (n.attrs.domain || '_unmapped')
  if (n.type === 'fr') return 'FR域/' + (n.attrs.domain || '_unmapped')
  if (n.type === 'module') return '模块'
  if (n.type === 'file') return '文件/' + (n.id.includes('/') ? n.id.split('/')[0] : '.')
  if (n.type === 'doc') return '文档'
  if (n.type === 'change') return '变更'
  if (n.type === 'ql') return 'quicklog'
  return '其他'
}

/** 全图确定性布局（原型 sunflower 摆位逐行移植，常量固化）：
 *  簇按 count 降序（同数按组名字典序稳序）；主环半径 sqrt(gi+1)*300、簇相位 gi*2.39999；
 *  簇内半径 16*sqrt(j+1)（j=节点序）、角 j*2.39999+gi；坐标 Math.round。
 *  确定性为硬约束（同输入逐位一致）；与原型生成器逐位等价非约束（稳序差异）。 */
export function layoutFullGraph(graph) {
  const groups = new Map()
  for (const n of graph.nodes.values()) {
    const k = graphCommunity(n)
    if (!groups.has(k)) groups.set(k, [])
    groups.get(k).push(n)
  }
  const gArr = [...groups.entries()]
    .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]))
  const pos = new Map()
  gArr.forEach(([k, arr], gi) => {
    const gc = Math.sqrt(gi + 1) * 300, ga = gi * 2.39999
    const cx = Math.cos(ga) * gc, cy = Math.sin(ga) * gc
    arr.forEach((n, j) => {
      const r = 16 * Math.sqrt(j + 1), a = j * 2.39999 + gi
      pos.set(n.id, { x: Math.round(cx + Math.cos(a) * r), y: Math.round(cy + Math.sin(a) * r) })
    })
  })
  return { pos, groups: gArr.map(([k, a]) => [k, a.length]) }
}

/** 节点搜索：id/label 不区分大小写包含匹配，limit 钳 1-50（平台锚点自动补全数据源）。 */
export function graphNodesSearch(graph, search, limit = 20) {
  const q = String(search || '').toLowerCase()
  const n = Math.min(Math.max(Number.isInteger(limit) ? limit : 20, 1), 50)
  const nodes = []
  if (q) {
    for (const node of graph.nodes.values()) {
      if (node.id.toLowerCase().includes(q) || node.label.toLowerCase().includes(q)) {
        nodes.push({ id: node.id, type: node.type, label: node.label })
        if (nodes.length >= n) break
      }
    }
  }
  return { count: nodes.length, nodes }
}

// ═══════════════════════════════════════════════════════════════
// scope 遍历召回（task-03，FR-04 承接 FR-cli-entry-234）
// 层序：路由 → 平台向量 → scope 遍历 → 本地词片 → 空。
// 入口键=机器算（D-004）：scope 文件集由调用方传（变更面 touched / decisions.md 锚点提取），
// 不解析 agent 自由文本。三闸（D-006）：scope 缺省/空→整层跳过；只走强边；decisionHits≤20、entries≤3。
// ═══════════════════════════════════════════════════════════════

/** scope 文件集 → 可达知识集（decisionHits 形态 + entries 素材）。
 *  遍历：file ←anchors← decision（+supersedes 链一跳）→ from-change/belongs-module 侧线；
 *  FR 侧：file ←deliverables（变更维）与 anchors 直连。rejected ∪ 死路 保底进场（防复潮）。 */
export function scopeRecall(graph, scopeFiles) {
  const scopes = [...new Set((Array.isArray(scopeFiles) ? scopeFiles : [scopeFiles]).map(posix).filter(Boolean))]
  if (scopes.length === 0) return null
  const strong = graph.edges.filter((e) => EDGE_STRENGTH[e.type] === 'strong')
  const reachable = new Set()
  // 一跳：文件 ←anchors← 决策/FR
  for (const e of strong) {
    if (e.type === 'anchors' && scopes.includes(e.t)) reachable.add(e.s)
    // 变更维：scope 命中变更交付面（scope 可能传变更名而非文件——调用方宽松契约）
    if (e.type === 'deliverables' && scopes.includes(e.s)) reachable.add(e.t)
  }
  // supersedes 链一跳（版本链追新/旧）
  for (const id of [...reachable]) {
    for (const e of strong) {
      if (e.type !== 'supersedes') continue
      if (e.s === id && graph.nodes.has(e.t)) reachable.add(e.t)
      else if (e.t === id && graph.nodes.has(e.s)) reachable.add(e.s)
    }
  }
  const decisions = []
  const frs = []
  for (const id of reachable) {
    const n = graph.nodes.get(id)
    if (!n) continue
    if (n.type === 'decision') decisions.push(n)
    else if (n.type === 'fr') frs.push(n)
  }
  // decisionHits：parseDecisionEntries 原生形态（attrs.hit 直出——零重解析），rejected∪死路优先
  const hits = decisions.map((n) => ({ ...n.attrs.hit, file: n.attrs.hit.file }))
  const death = (h) => h.status === 'rejected' || h.deathPath
  hits.sort((a, b) => ((b.deathPath ? 1 : 0) - (a.deathPath ? 1 : 0)) || ((b.status === 'rejected' ? 1 : 0) - (a.status === 'rejected' ? 1 : 0)))
  const rejectedFirst = [...hits.filter(death), ...hits.filter((h) => !death(h))]
  if (rejectedFirst.length > 20) rejectedFirst.length = 20
  const entries = rejectedFirst.slice(0, 3).map((h) => ({
    category: 'Decisions',
    keywords: ['scope'],
    file: h.file,
    anchor: h.id,
    display: `${h.file}#${h.id}（scope 遍历召回）`,
  }))
  return { decisionHits: rejectedFirst, entries, frCount: frs.length, scopeSize: scopes.length }
}

/** scopeRecall → matchKnowledge 同构四键返回（knowledge-vector 消费——策略面全本地解析）。 */
export function buildScopeRecallResult(recall) {
  if (!recall || recall.decisionHits.length === 0) return null
  return {
    matched: true,
    entries: recall.entries,
    report: `Status: scope-traversal matched (${recall.decisionHits.length} entries from ${recall.scopeSize} scope files)`,
    json: {
      matched: true, entry_count: recall.entries.length, scope: true,
      entries: recall.entries.map((e) => ({ file: e.file, anchor: e.anchor, keywords: e.keywords, category: e.category })),
    },
    decisionHits: recall.decisionHits,
  }
}

/** 变更 decisions.md（九字段形态）「锚点：」字段 → scope 文件集（complete 门的需求期机器键，D-004）。
 *  兼容列表行（`- 锚点：src/x.js:12`）与裸行（`锚点：src/x.js`——归档蒸馏域文件形态）。 */
export function scopeFromDecisionsMd(text) {
  const out = new Set()
  for (const m of String(text || '').replace(/\r\n/g, '\n').matchAll(/^(?:-\s*)?锚点\s*[：:]\s*(.+)$/gm)) {
    for (const p of anchorFilePaths(m[1])) out.add(p)
  }
  return [...out]
}

// ═══════════════════════════════════════════════════════════════
// CLI 子命令（task-02）——stages/knowledge.js 懒加载（classify 同款）。
// 输出沿知识命令族全 JSON 约定（{ok,...data}）；人类可读摘要行内嵌 summary 字段。
// ═══════════════════════════════════════════════════════════════

const GRAPH_USAGE = '用法：sillyspec knowledge graph <summary|nodes|dump|neighbors|path|impact|orphans|dangling> [锚点...] [--search <模糊>] [--limit N] [--edges <边型>] [--depth N]；dump 需 --layout'

export async function cmdKnowledgeGraph(dir, args, opts = {}) {
  const out = (ok, data, error) => console.log(JSON.stringify({ ok, ...(data || {}) , ...(error ? { error } : {}) }, null, 2))
  const rest = Array.isArray(args) ? args.filter((a) => !String(a).startsWith('--')) : []
  const flag = (name) => {
    const i = args.indexOf(name)
    return i >= 0 && args[i + 1] && !String(args[i + 1]).startsWith('--') ? args[i + 1] : null
  }
  const sub = rest[0] || ''
  const edgeType = flag('--edges')
  const depth = parseInt(flag('--depth') || '1', 10)
  // resolveKnowledgeDir 同款口径（stages/knowledge.js）：specDir 优先，缺省 <cwd>/.sillyspec
  const specRoot = opts.specDir || join(dir, '.sillyspec')
  const knowledgeDir = join(specRoot, 'knowledge')

  if (!['summary', 'nodes', 'dump', 'neighbors', 'path', 'impact', 'orphans', 'dangling'].includes(sub)) {
    out(false, {}, { code: 'graph_usage', usage: GRAPH_USAGE, subcommand: sub })
    return
  }
  const graph = buildKnowledgeGraph(specRoot)
  const brief = (n) => `${n.type}  ${n.label}`

  if (sub === 'summary') {
    const cl = parseInt(flag('--clusters') || '0', 10)
    const s = graphSummary(graph, { clustersLimit: Number.isInteger(cl) && cl > 0 ? cl : 0 })
    return out(true, {
      query: { sub, clusters: s.clusters.length },
      stats: s,
      summary: [
        `节点 ${s.nodes} · 边 ${s.edges}`,
        `孤儿 ${s.orphans} · 模块文档缺口 ${s.module_doc_gaps} · changelog 悬空 ${s.changelog_danglings} · 悬空引用 ${s.dangling_refs}`,
        `簇 ${s.clusters.length} 个（最大 ${s.clusters[0]?.key ?? '—'} × ${s.clusters[0]?.count ?? 0}）`,
      ],
    })
  }
  if (sub === 'dump') {
    if (!args.includes('--layout')) return out(false, {}, { code: 'layout_required', usage: GRAPH_USAGE })
    const { pos, groups } = layoutFullGraph(graph)
    const stats = graphSummary(graph)
    return out(true, {
      query: { sub, layout: true },
      nodes: [...graph.nodes.values()].map((n) => {
        const p = pos.get(n.id)
        return { id: n.id, type: n.type, label: n.label, x: p.x, y: p.y }
      }),
      edges: graph.edges.map((e) => ({ s: e.s, t: e.t, type: e.type, strength: EDGE_STRENGTH[e.type] })),
      stats,
      summary: [`节点 ${stats.nodes} · 边 ${stats.edges}`, `星系 ${groups.length} 个（最大 ${groups[0]?.[0] ?? '—'} × ${groups[0]?.[1] ?? 0}）`],
    })
  }
  if (sub === 'nodes') {
    const search = flag('--search')
    const limit = parseInt(flag('--limit') || '20', 10)
    if (!search) return out(false, {}, { code: 'search_required', usage: GRAPH_USAGE })
    const r = graphNodesSearch(graph, search, limit)
    return out(true, {
      query: { sub, search, limit: Math.min(Math.max(Number.isInteger(limit) ? limit : 20, 1), 50) },
      count: r.count,
      summary: r.nodes.slice(0, 5).map((n) => `→ ${brief(n)}`),
      nodes: r.nodes,
    })
  }
  if (sub === 'neighbors') {
    const key = rest[1]
    if (!key) return out(false, {}, { code: 'anchor_required', usage: GRAPH_USAGE })
    const r = graphNeighbors(graph, key, { depth: Number.isInteger(depth) && depth > 0 ? Math.min(depth, 3) : 1, edgeType: edgeType || undefined })
    if (!r.found) return out(false, {}, { code: 'node_not_found', key })
    return out(true, {
      query: { sub, key, edges: edgeType || 'all' },
      summary: r.nodes.slice(1).map((n) => `→ ${brief(n)}`),
      nodes: r.nodes.map((n) => ({ id: n.id, type: n.type, label: n.label })),
      edges: r.edges.map((e) => ({ s: e.s, t: e.t, type: e.type, strength: EDGE_STRENGTH[e.type] })),
    })
  }
  if (sub === 'path') {
    const a = rest[1], b = rest[2]
    if (!a || !b) return out(false, {}, { code: 'two_anchors_required', usage: GRAPH_USAGE })
    const r = graphPath(graph, a, b)
    return out(true, {
      query: { sub, from: a, to: b },
      found: r.found,
      reason: r.reason || '',
      hop_count: r.hops.length,
      summary: r.found ? r.hops.map((e, i) => `${i === 0 ? resolveGraphNode(graph, a)?.label ?? a : ''} —${e.type}→ ${graph.nodes.get(e.t)?.label ?? e.t}`) : [r.reason],
      hops: r.hops.map((e) => ({ s: e.s, t: e.t, type: e.type })),
    })
  }
  if (sub === 'impact') {
    const key = rest[1]
    if (!key) return out(false, {}, { code: 'anchor_required', usage: GRAPH_USAGE })
    const r = graphImpact(graph, key)
    if (!r.found) return out(false, {}, { code: 'node_not_found', key })
    return out(true, {
      query: { sub, key, rule: '强边闭包 深度≤2 + supersedes/module-dep 传递例外' },
      summary: [
        `闭包 ${r.closure.length} 节点`,
        `触及模块：${r.modules.map((m) => m.replace(/^module:/, '')).join('、') || '—'}`,
        `锚定决策/FR ${r.decisionsAndFrs.length}`,
        `防复潮可达（rejected∪死路）${r.rejectedReachable.length}`,
      ],
      closure: r.closure,
      modules: r.modules,
      decisions_and_frs: r.decisionsAndFrs.map((n) => ({ id: n.id, type: n.type, status: n.attrs.status || n.attrs.hit?.status || '' })),
      rejected_reachable: r.rejectedReachable.map((n) => ({ id: n.id, title: n.label, reason: (n.attrs.hit?.reason || '').slice(0, 80) })),
    })
  }
  if (sub === 'orphans') {
    const list = graphOrphans(graph)
    return out(true, {
      query: { sub },
      count: list.length,
      summary: list.map((f) => `⚠️ ${f.kind}  ${f.node.label}`),
      orphans: list.map((f) => ({ id: f.node.id, type: f.node.type, kind: f.kind })),
    })
  }
  // dangling
  const list = graphDangling(graph)
  return out(true, {
    query: { sub },
    count: list.length,
    summary: list.map((d) => `⚠️ ${d.edge.type}（${d.strength}） ${d.edge.s} → ${d.missing}`),
    dangling: list.map((d) => ({ edge: d.edge, missing: d.missing, strength: d.strength })),
  })
}
