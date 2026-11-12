/**
 * map diff — stale 四态判定与 MAP-DIFF 派生块写入（契约 §2/§4，MASTER 子变更 2）。
 *
 * 平台地图页（子变更 1）消费的 stale 状态唯一写入方。判定口径 = map-contract.md §4：
 * - 交集非空 → stale（changed_files=交集）
 * - 无交集且 covered_files 非空 → fresh（但已 stale 不升回——硬规则 2）
 * - covered_files 空 → unknown（空不得判 fresh——硬规则 1）
 * - 缺 frontmatter / 未知 schema_version → 跳过（legacy/降级不参与判定）
 * - rename：covered_files 含旧路径且 renameMap 命中 → 按新路径判交集；
 *   不可映射且旧路径在变更集 → unknown + changed_files 保留旧路径（硬规则 3）
 *
 * 写入口径 = 契约 §2：只替换 `# BEGIN MAP-DIFF` ~ `# END MAP-DIFF` 区间（trim 后
 * 逐字匹配标记行；标记不识别 → 文件末尾追加标记行+块）；区间外逐字节不变。
 *
 * 命令形态：sillyspec map diff [--dir <项目根>] [--base <commit>] [--dry-run]
 * 退出码：0（含全部 unknown/空跳过）；1 git/IO 失败；2 参数错误。
 */

import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import yaml from 'js-yaml'
import { safeGit } from './git-helper.js'

/** 平台已知契约主版本（与子变更 1 KNOWN_SCHEMA_VERSION 同源；超此值跳过判定）。 */
export const KNOWN_SCHEMA_VERSION = 1

export const BEGIN_MARK = '# BEGIN MAP-DIFF'
export const END_MARK = '# END MAP-DIFF'

const GIT_TIMEOUT_MS = 60_000 // 沿 scan-diff 大仓口径（R-03：超时报错不静默）


/** 解析链路 md frontmatter：首个 --- 对之间 YAML；缺失/坏 YAML → null。 */
export function parseRouteFrontmatter(text) {
  const lines = text.split(/\r?\n/)
  if (!lines.length || lines[0].trim() !== '---') return null
  const end = lines.findIndex((l, i) => i > 0 && l.trim() === '---')
  if (end < 0) return null
  try {
    const meta = yaml.load(lines.slice(1, end).join('\n'))
    return meta && typeof meta === 'object' ? meta : null
  } catch {
    return null
  }
}

/**
 * git 变更集 + rename 映射（--name-status --find-renames，scan-diff :116-131 同款）。
 * @returns {{ changed:Set<string>, renameMap:Object<string,string>, headShort:string }}
 */
function collectChangeSet(cwd, baseCommit) {
  const diffRes = safeGit(cwd, ['diff', '--name-status', '--find-renames', `${baseCommit}..HEAD`], { timeout: GIT_TIMEOUT_MS })
  if (diffRes.error || diffRes.value === null) {
    throw new Error(`git diff 失败（${baseCommit}..HEAD）：${diffRes.error || 'unknown'}`)
  }
  const changed = new Set()
  const renameMap = {} // newPath -> oldPath
  for (const rawLine of String(diffRes.value || '').split(/\r?\n/)) {
    if (!rawLine.trim()) continue
    const [status, p1, p2] = rawLine.split('\t')
    if (!status) continue
    if (status.startsWith('R')) {
      if (p1 && p2) renameMap[p2] = p1
      changed.add(p2)
    } else if (p1) {
      changed.add(p1)
    }
  }
  const headRes = safeGit(cwd, ['rev-parse', '--short', 'HEAD'], { timeout: 10_000 })
  const headShort = headRes.error === null && headRes.value !== null ? String(headRes.value) : ''
  return { changed, renameMap, headShort }
}

/**
 * 单链路四态判定（契约 §4 唯一口径，纯函数）。
 * @param {{covered_files?: string[], source_commit?: string, schema_version?: number}} meta
 * @param {{changed:Set<string>, renameMap:Object<string,string>}} changeSet
 * @param {string|null} prevState 既有派生块状态（null=无既有条目）
 * @returns {{state:'fresh'|'stale'|'unknown', changed_files:string[], renamed:boolean}|null}
 *   null = 跳过（缺 frontmatter / 未知主版本）。
 */
export function judgeRoute(meta, changeSet, prevState) {
  if (!meta) return null
  const version = meta.schema_version
  if (typeof version !== 'number' || version > KNOWN_SCHEMA_VERSION) return null

  const covered = Array.isArray(meta.covered_files) ? meta.covered_files.filter((f) => typeof f === 'string') : null
  if (!covered || covered.length === 0) {
    return { state: 'unknown', changed_files: [], renamed: false } // 硬规则 1：空不得判 fresh
  }

  // rename 换算：旧路径→新路径（硬规则 3）。renameMap 形态为 newPath→oldPath
  // （git --name-status R 输出顺序），covered_files 持旧路径，需反查 old→new。
  const oldToNew = {}
  for (const [newPath, oldPath] of Object.entries(changeSet.renameMap || {})) {
    oldToNew[oldPath] = newPath
  }
  const effective = covered.map((p) => (oldToNew[p] ? oldToNew[p] : p))
  const renamed = effective.some((p, i) => p !== covered[i])
  const intersection = effective.filter((p) => changeSet.changed.has(p))

  if (intersection.length > 0) {
    return { state: 'stale', changed_files: intersection, renamed }
  }
  // 无交集：已 stale 不升回（硬规则 2）——恢复 fresh 只能由语义层刷新产生
  if (prevState === 'stale') {
    return { state: 'stale', changed_files: [], renamed }
  }
  return { state: 'fresh', changed_files: [], renamed }
}

/** 读既有派生块条目（route_id → state）——只降级判定需要。 */
function readExistingStaleStates(indexText) {
  const states = {}
  try {
    const data = yaml.load(indexText)
    if (data && Array.isArray(data.stale)) {
      for (const item of data.stale) {
        if (item && typeof item.route_id === 'string') states[item.route_id] = String(item.state || '')
      }
    }
  } catch {
    // 整文件 YAML 坏（含派生块内异常）：忽略既有态（按无既有条目处理，不阻断）
  }
  return states
}

/** 派生块条目 → YAML 行（契约 §2 字段：route_id/state/changed_files/checked_at/base_commit）。 */
function renderBlockLines(entries, checkedAt, baseCommit) {
  if (entries.length === 0) return [BEGIN_MARK, 'stale: []', END_MARK]
  const lines = [BEGIN_MARK, 'stale:']
  for (const e of entries) {
    lines.push(`  - route_id: ${e.route_id}`)
    lines.push(`    state: ${e.state}`)
    if (e.changed_files && e.changed_files.length > 0) {
      lines.push('    changed_files:')
      for (const f of e.changed_files) lines.push(`      - ${f}`)
    } else {
      lines.push('    changed_files: []')
    }
    lines.push(`    checked_at: "${checkedAt}"`)
    lines.push(`    base_commit: ${baseCommit}`)
  }
  lines.push(END_MARK)
  return lines
}

/**
 * 写回派生块：只替换 BEGIN/END 区间（trim 逐字匹配）；区间外逐字节不变；
 * 标记不识别（大小写/空白变体）→ 按块缺失在文件末尾追加（保守不误伤）。
 * @returns {{written:boolean, appended:boolean}} appended=true 表示走了末尾追加。
 */
export function writeDerivedBlock(indexText, entries, checkedAt, baseCommit) {
  const eol = indexText.includes('\r\n') ? '\r\n' : '\n'
  const lines = indexText.split(/\r?\n/)
  const beginIdx = lines.findIndex((l) => l.trim() === BEGIN_MARK)
  const endIdx = lines.findIndex((l) => l.trim() === END_MARK)

  const block = renderBlockLines(entries, checkedAt, baseCommit)
  if (beginIdx >= 0 && endIdx > beginIdx) {
    const next = [...lines.slice(0, beginIdx), ...block, ...lines.slice(endIdx + 1)]
    return { text: next.join(eol), written: true, appended: false }
  }
  // 块缺失/标记不识别：末尾追加（保文件末换行形态）
  const tail = indexText.endsWith('\n') ? '' : eol
  return {
    text: indexText + tail + (indexText.trim() ? eol : '') + block.join(eol) + eol,
    written: true,
    appended: true,
  }
}

/** 扫 spec 根下全部 docs/<项目>/map/MAP-INDEX.yaml（fail-soft：无目录空列表）。 */
function scanMapIndexes(specRoot) {
  const out = []
  const docsDir = join(specRoot, 'docs')
  if (!existsSync(docsDir)) return out
  for (const proj of readdirSync(docsDir, { withFileTypes: true })) {
    if (!proj.isDirectory()) continue
    const idx = join(docsDir, proj.name, 'map', 'MAP-INDEX.yaml')
    if (existsSync(idx)) out.push({ project: proj.name, indexPath: idx })
  }
  return out
}

/**
 * map diff 主入口。
 * @param {string} dir 项目根（git 仓根）
 * @param {{ specDir?: string, base?: string, dryRun?: boolean }} opts
 * @returns {number} 退出码
 */
export async function runMapDiff(dir, opts = {}) {
  if (!dir || !existsSync(dir)) {
    console.error(`map diff：目录不存在：${dir}`)
    return 2
  }
  const specRoot = opts.specDir && existsSync(opts.specDir) ? opts.specDir : join(dir, '.sillyspec')
  const indexes = scanMapIndexes(specRoot)
  if (indexes.length === 0) {
    // fail-soft（兼容策略）：无 map 目录零输出零写入退出 0——先于 git 检查，
    // 让无地图项目在任意仓形态下都静默通过（git 分野只对「有 map 目录」生效）。
    return 0
  }
  // 非 git 仓：判定依赖 git（兼容策略——有 map 目录才报）
  const gitCheck = safeGit(dir, ['rev-parse', '--git-dir'], { timeout: 10_000 })
  if (gitCheck.error || gitCheck.value === null) {
    console.error('map diff：非 git 仓库（判定依赖 git diff），无法执行')
    return 1
  }

  // 逐链路收集 frontmatter，按 source_commit 分组取变更集（--base 覆盖时全用同一基）
  const routeMetas = [] // { project, indexPath, indexText, routeId, doc, meta }
  for (const { project, indexPath } of indexes) {
    const indexText = readFileSync(indexPath, 'utf8')
    let routes = []
    try {
      const data = yaml.load(indexText)
      routes = data && Array.isArray(data.routes) ? data.routes : []
    } catch {
      routes = []
    }
    for (const r of routes) {
      if (!r || typeof r.route_id !== 'string') continue
      const docName = typeof r.doc === 'string' && r.doc ? r.doc : `${r.route_id}.md`
      const docPath = join(indexPath, '..', docName)
      let meta = null
      if (existsSync(docPath)) meta = parseRouteFrontmatter(readFileSync(docPath, 'utf8'))
      routeMetas.push({ project, indexPath, indexText, routeId: r.route_id, meta })
    }
  }

  // 变更集按基分组（多数项目单基；--base 显式时统一覆盖）
  const baseOf = (m) => opts.base || (m.meta && m.meta.source_commit) || null
  const changeSets = new Map() // baseCommit -> changeSet
  for (const m of routeMetas) {
    const b = baseOf(m)
    if (!b || !m.meta) continue
    if (!changeSets.has(b)) {
      try {
        changeSets.set(b, collectChangeSet(dir, b))
      } catch (err) {
        console.error(`map diff：${err.message}`)
        return 1
      }
    }
  }

  // 判定（按项目聚合写回）
  const nowUtc = new Date().toISOString().replace(/\.\d+Z$/, 'Z')
  const perIndex = new Map() // indexPath -> { text, states, entries[] }
  for (const m of routeMetas) {
    if (!perIndex.has(m.indexPath)) {
      perIndex.set(m.indexPath, {
        text: m.indexText,
        states: readExistingStaleStates(m.indexText),
        entries: [],
      })
    }
    const bucket = perIndex.get(m.indexPath)
    const base = baseOf(m)
    const cs = base ? changeSets.get(base) : null
    if (!m.meta || !cs) {
      continue // 缺 frontmatter（legacy）或无 source_commit 且无 --base：跳过
    }
    const verdict = judgeRoute(m.meta, cs, bucket.states[m.routeId] || null)
    if (!verdict) continue // 未知主版本跳过
    bucket.entries.push({
      route_id: m.routeId,
      state: verdict.state,
      changed_files: verdict.changed_files,
    })
  }

  // 输出 + 写回
  for (const [indexPath, bucket] of perIndex) {
    for (const e of bucket.entries) {
      console.log(`${e.route_id} | ${e.state} | changed ${e.changed_files.length}`)
    }
    if (opts.dryRun) continue
    const headShort = [...changeSets.values()][0]?.headShort || ''
    const { text } = writeDerivedBlock(bucket.text, bucket.entries, nowUtc, headShort)
    writeFileSync(indexPath, text, 'utf8')
  }
  return 0
}
