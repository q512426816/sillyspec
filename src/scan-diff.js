/**
 * scan-diff — scan 文档 vs 源码漂移清单（change: 2026-08-16-scan-diff-command, task-01）
 *
 * 定位：scan 文档是架构快照（基线 = 生成时源码 commit，frontmatter source_commit），源码持续演进。
 * scan-diff 算出「基线之后源码变了什么、哪些模块的 scan 文档需要核对/刷新」，按四分类输出：
 *   A         新增文件 → scan 文档缺记（缺文档）
 *   D         已删除文件 → scan 文档多记（多文档）
 *   M / R / C 修改 / 重命名 / 复制 → scan 文档过时
 *   其余（T 等）→ unknown（不判漂移，只展示）
 * 扫描范围缺省 = module-map paths 覆盖集（parseModuleMapSimple 收集全部 paths 去重），
 * 非 src/-only——范围外的源码变更与模块文档无涉，不计入漂移。
 *
 * 分层：
 *   computeScanDiff —— 计算层（git 只读 + frontmatter/module-map 读取；无渲染无落盘）。
 *     硬错误返回 { ok:false, error }（无效 base / git 失败 / 无 source_commit）；
 *     advisory 问题进 warnings（非祖先 base / rev-list 降级 / module-map 缺失）。
 *   runScanDiff —— IO 面（终端聚合渲染 + --report 落盘 scan-diff-report.md），返回退出码。
 *
 * 复用（先读源码确认签名后使用）：parseSourceCommit（scan-staleness）、
 *   matchFilesToModules（docs-debt，含裸名兜底）、safeGit（git-helper）、
 *   parseModuleMapSimple（modules.js）；零新依赖。
 */
import { existsSync, readFileSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { safeGit } from './git-helper.js'
import { parseSourceCommit } from './scan-staleness.js'
import { matchFilesToModules } from './docs-debt.js'
import { parseModuleMapSimple } from './modules.js'

/** safeGit 超时（仿 docs-debt 的 GIT_TIMEOUT_MS 模式：大 diff 慢时降级不挂起） */
const GIT_TIMEOUT_MS = 10000

/** 每模块终端渲染默认上限（--full 展开全部） */
const DEFAULT_LIST_CAP = 5

/**
 * 计算层：scan 文档 vs 源码漂移事实。
 * @param {{ projectRoot: string, specBase: string, projectName: string, base?: string|null }} opts
 *   projectRoot：git 锚（diff/rev-list 的 -C 目录）
 *   specBase / projectName：scan 文档与 module-map 定位（specBase/docs/<projectName>/...）
 *   base：基线 commit（短/长哈希、引用均可）；缺省读 scan 文档 frontmatter 的 source_commit
 * @returns {{ ok: true, base, baseSource, head, behindCommits, daysSinceScan, scope,
 *   added, deleted, modified, unknown, unmapped, outOfScope, renameMap, byModule, warnings, driftCount }
 *   | { ok: false, error: string }}
 *   ok:false = 硬错误（参数缺失 / 无 source_commit / 无效 base / git diff 失败）
 *   added/deleted/modified/unknown：范围内变更文件（POSIX 相对路径；R/C 记新路径）
 *   unmapped：范围内未匹配到模块的文件；outOfScope：范围外变更（不计入漂移）
 *   renameMap：newPath → oldPath（R 归 modified 且保留 rename 细节）
 *   byModule：{ moduleId: { doc, added, deleted, modified, files } }（A/D/M 计数 + 文件清单）
 *   driftCount = added + deleted + modified
 */
export function computeScanDiff({ projectRoot, specBase, projectName, base } = {}) {
  if (!projectRoot || !specBase || !projectName) {
    return { ok: false, error: 'projectRoot / specBase / projectName 必填，缺一不可' }
  }
  const warnings = []
  let baseSource = '--base 显式指定'

  // ── 基线：缺省读 specBase/docs/<projectName>/scan/*.md frontmatter 的 source_commit ──
  if (!base) {
    const sourceCommit = readSourceCommit(specBase, projectName)
    if (!sourceCommit) {
      return {
        ok: false, error:
          'scan 文档无 source_commit 字段（绿地项目 / 旧版生成 / 无 scan 文档），无法定基线——请用 --base <commit> 显式指定基线',
      }
    }
    base = sourceCommit
    baseSource = 'scan 文档 frontmatter source_commit'
  }
  const baseDisplay = displayBase(base)

  // ── base 有效性守卫（仿 computeScanStaleness 的 isAncestor 守卫）──
  // merge-base --is-ancestor 对「无效 commit」与「有效但非祖先」都返回非 0（safeGit 记为 error），
  // 无法直接区分——先用 rev-parse 验有效性：无效 → 报错；有效但非祖先 → 警告（diff 按两快照对比仍可算）。
  const revRes = safeGit(projectRoot, ['rev-parse', '--verify', `${base}^{commit}`])
  if (revRes.error || !revRes.value) {
    return { ok: false, error: `基线 ${baseDisplay} 不是有效 commit（${revRes.error || '无输出'}），跳过 scan-diff` }
  }
  const resolvedBase = revRes.value.trim()
  const headRes = safeGit(projectRoot, ['rev-parse', 'HEAD'])
  const headShort = headRes.error ? 'HEAD' : headRes.value.trim().slice(0, 7)
  const isAncestor = safeGit(projectRoot, ['merge-base', '--is-ancestor', resolvedBase, 'HEAD'])
  if (isAncestor.error) {
    warnings.push(`基线 ${baseDisplay} 不是 HEAD（${headShort}）祖先（rebase / 分支切换）——diff 按两快照对比，删除后重建可能呈假新增`)
  }

  // ── 落后计数（advisory：超时/失败降级 null，不抛）──
  const countRes = safeGit(projectRoot, ['rev-list', '--count', `${resolvedBase}..HEAD`], { timeout: GIT_TIMEOUT_MS })
  let behindCommits = countRes.error ? null : parseInt(countRes.value, 10)
  if (behindCommits === null || Number.isNaN(behindCommits)) {
    behindCommits = null
    warnings.push('rev-list 计数失败（git 降级），behindCommits=null')
  }
  const dateRes = safeGit(projectRoot, ['log', '-1', '--format=%cI', resolvedBase])
  let daysSinceScan = null
  if (!dateRes.error && dateRes.value) {
    daysSinceScan = Math.floor((Date.now() - new Date(dateRes.value.trim()).getTime()) / 86400000)
  }

  // ── 扫描范围：module-map paths 覆盖集（默认范围，非 src/-only）──
  const cardsDir = join(specBase, 'docs', projectName, 'modules')
  const mapPath = join(cardsDir, '_module-map.yaml')
  let moduleIndex = null
  if (existsSync(mapPath)) {
    try { moduleIndex = parseModuleMapSimple(readFileSync(mapPath, 'utf8')) } catch { moduleIndex = null }
  }
  const scope = collectScope(moduleIndex)
  if (scope.length === 0) {
    warnings.push('module-map 缺失 / 解析为空（跑 sillyspec modules rebuild 生成）——扫描范围退化=全部变更文件，无法归模块')
  }

  // ── diff：只算路径（--find-renames 检出重命名；超时降级为错误返回）──
  const diffRes = safeGit(projectRoot, ['diff', '--name-status', '--find-renames', `${resolvedBase}..HEAD`], { timeout: GIT_TIMEOUT_MS })
  if (diffRes.error) {
    return { ok: false, error: `git diff ${baseDisplay}..HEAD 失败（${diffRes.error}），跳过 scan-diff` }
  }

  // ── 四分类 + 范围过滤 ──
  const added = [], deleted = [], modified = [], unknown = [], outOfScope = []
  const renameMap = {} // newPath → oldPath（R 归 modified 且保留 rename 细节）
  const scopeFilter = scope.length > 0 ? scope : null
  for (const item of parseNameStatus(diffRes.value)) {
    if (scopeFilter && !inScope(item.path, scopeFilter)) { outOfScope.push(item.path); continue }
    switch (item.status) {
      case 'A': added.push(item.path); break
      case 'D': deleted.push(item.path); break
      case 'M': modified.push(item.path); break
      case 'R': modified.push(item.path); renameMap[item.path] = item.oldPath; break
      case 'C': modified.push(item.path); break // 复制目标（新路径）视同过时
      default: unknown.push(item.path); break // T / B 等
    }
  }

  // ── 归模块（matchFilesToModules，含裸名兜底；结果 = 同文件清单直接调用一致）──
  const inScopeFiles = [...added, ...deleted, ...modified, ...unknown]
  let byModuleMap = new Map()
  let unmapped = inScopeFiles
  if (inScopeFiles.length > 0) {
    try {
      const matched = matchFilesToModules(inScopeFiles, moduleIndex || {}, { cardsDir })
      byModuleMap = matched.byModule
      unmapped = matched.unmapped
    } catch {
      warnings.push('matchFilesToModules 归模块失败（降级为全部未归模块）')
    }
  } else {
    unmapped = []
  }

  // ── byModule 聚合 A/D/M 计数 ──
  const addedSet = new Set(added)
  const deletedSet = new Set(deleted)
  const modifiedSet = new Set(modified)
  const byModule = {}
  for (const [id, entry] of byModuleMap) {
    let a = 0, d = 0, m = 0
    for (const f of entry.files) {
      if (addedSet.has(f)) a++
      else if (deletedSet.has(f)) d++
      else if (modifiedSet.has(f)) m++
    }
    byModule[id] = { doc: entry.doc || '', added: a, deleted: d, modified: m, files: entry.files }
  }

  return {
    ok: true,
    base: baseDisplay,
    baseSource,
    head: headShort,
    behindCommits,
    daysSinceScan,
    scope,
    added, deleted, modified, unknown, unmapped, outOfScope,
    renameMap,
    byModule,
    warnings,
    driftCount: added.length + deleted.length + modified.length,
  }
}

/**
 * IO 面：终端渲染 + 可选落盘报告。
 * @param {{ projectRoot: string, specBase: string, projectName: string, base?: string|null,
 *   full?: boolean, report?: boolean }} opts
 *   full：终端展开每模块全部文件（缺省每模块 ≤5 条）；report：落盘 scan-diff-report.md
 * @returns {number} 退出码：0 无漂移 / 1 有漂移 / 2 错误（无效 base、git 失败、无 source_commit）
 */
export function runScanDiff(opts = {}) {
  const { projectRoot, specBase, projectName, base = null, full = false, report = false } = opts
  const result = computeScanDiff({ projectRoot, specBase, projectName, base })
  if (!result.ok) {
    console.error(`scan-diff：${result.error}`)
    return 2
  }
  for (const w of result.warnings) console.warn(`  ⚠️ ${w}`)

  console.log(`scan diff: ${result.base}..HEAD（${fmtNum(result.behindCommits)} commit / ${fmtNum(result.daysSinceScan)} 天）`)
  if (result.driftCount === 0) {
    console.log('scan 文档与源码一致（0 漂移）')
    if (result.unknown.length > 0) {
      console.log(`  无法归类（unknown）${result.unknown.length} 条：${result.unknown.join(', ')}`)
    }
  } else {
    renderTerminal(result, { full })
  }

  if (report) {
    const p = writeReport(result, { specBase, projectName })
    if (p) console.log(`scan-diff 报告已落盘：${p}`)
    else console.warn('  ⚠️ scan-diff-report.md 写入失败')
  }
  return result.driftCount > 0 ? 1 : 0
}

/** 终端聚合渲染：每模块计数 + 文件清单（缺省 ≤5 条，--full 展开全部） */
function renderTerminal(r, { full }) {
  const cap = full ? Number.MAX_SAFE_INTEGER : DEFAULT_LIST_CAP
  console.log(`扫描范围：module-map paths 覆盖集（${r.scope.length} 条路径）——范围外的变更不计入漂移`)
  const moduleIds = Object.keys(r.byModule).sort()
  if (moduleIds.length > 0) {
    console.log('按模块聚合漂移（A=缺文档 D=多文档 M=过时，--full 展开全部）：')
    for (const id of moduleIds) {
      const m = r.byModule[id]
      const doc = m.doc ? `（${m.doc}）` : ''
      console.log(`  [${id}] A${m.added} D${m.deleted} M${m.modified}${doc}`)
      for (const f of m.files.slice(0, cap)) {
        console.log(`    - ${statusLetter(r, f)} ${f}${r.renameMap[f] ? `（原 ${r.renameMap[f]}）` : ''}`)
      }
      if (m.files.length > cap) console.log(`    ... 其余 ${m.files.length - cap} 条，--full 展开`)
    }
  }
  if (r.unmapped.length > 0) {
    console.log(`未归模块（unmapped，${r.unmapped.length} 条）：`)
    for (const f of r.unmapped.slice(0, cap)) {
      console.log(`  - ${statusLetter(r, f)} ${f}`)
    }
    if (r.unmapped.length > cap) console.log(`  ... 其余 ${r.unmapped.length - cap} 条，--full 展开`)
  }
  if (r.unknown.length > 0) {
    console.log(`无法归类（unknown，${r.unknown.length} 条）：${r.unknown.slice(0, cap).join(', ')}`)
  }
  console.log(`漂移合计：${r.driftCount} 条（A${r.added.length} / D${r.deleted.length} / M${r.modified.length}）`)
}

/** 文件归属状态字母（渲染用）：R（renameMap 命中）> A > D > M */
function statusLetter(r, f) {
  if (r.renameMap[f]) return 'R'
  // Set 惰性缓存（挂在 r 上，渲染期只建一次）：added/deleted 数组线性扫在数千文件逐条渲染时是 O(n²)
  if (!r._statusSets) r._statusSets = { added: new Set(r.added), deleted: new Set(r.deleted) }
  if (r._statusSets.added.has(f)) return 'A'
  if (r._statusSets.deleted.has(f)) return 'D'
  return 'M'
}

/** 落盘 scan-diff-report.md（markdown 完整清单，不截断） */
function writeReport(r, { specBase, projectName }) {
  const dir = join(specBase, 'docs', projectName, 'scan')
  try { mkdirSync(dir, { recursive: true }) } catch { return null }
  const lines = [
    '# scan-diff 报告',
    '',
    `- 生成时间：${new Date().toISOString()}`,
    `- 项目：${projectName}`,
    `- 基线：${r.base}（${r.baseSource}）`,
    `- 对比：\`${r.base}..HEAD\``,
    `- 落后：${fmtNum(r.behindCommits)} commit / ${fmtNum(r.daysSinceScan)} 天`,
    `- 扫描范围：module-map paths 覆盖集（${r.scope.length} 条路径）`,
    '',
    '## 漂移总览',
    '',
    '| 分类 | 含义 | 数量 |',
    '| --- | --- | --- |',
    `| added | 源码新增，scan 文档缺记 | ${r.added.length} |`,
    `| deleted | 源码已删，scan 文档多记 | ${r.deleted.length} |`,
    `| modified | 源码已变，scan 文档过时 | ${r.modified.length} |`,
    `| unknown | 其他状态 | ${r.unknown.length} |`,
    `| unmapped | 范围内未匹配模块 | ${r.unmapped.length} |`,
    '',
    '## 按模块聚合',
    '',
  ]
  if (Object.keys(r.byModule).length === 0) {
    lines.push('（无模块命中）', '')
  } else {
    for (const id of Object.keys(r.byModule).sort()) {
      const m = r.byModule[id]
      lines.push(`### ${id}（${m.doc || '无 doc'}）`, '')
      lines.push(`- added：${m.added}`, `- deleted：${m.deleted}`, `- modified：${m.modified}`, '- 文件：')
      for (const f of m.files) {
        const ren = r.renameMap[f] ? `，原 ${r.renameMap[f]}` : ''
        lines.push(`  - \`${f}\`（${statusLetter(r, f)}${ren}）`)
      }
      lines.push('')
    }
  }
  if (r.unmapped.length > 0) {
    lines.push('## 未归模块（unmapped）', '')
    for (const f of r.unmapped) lines.push(`- \`${f}\``)
    lines.push('')
  }
  if (r.outOfScope.length > 0) {
    lines.push('## 范围外变更（不计入漂移）', '')
    for (const f of r.outOfScope) lines.push(`- \`${f}\``)
    lines.push('')
  }
  if (r.warnings.length > 0) {
    lines.push('## 提示', '')
    for (const w of r.warnings) lines.push(`- ${w}`)
    lines.push('')
  }
  lines.push('## 结论', '')
  lines.push(`- 漂移合计：${r.driftCount} 条（A${r.added.length} / D${r.deleted.length} / M${r.modified.length}）`)
  if (r.driftCount === 0) {
    lines.push('- scan 文档与源码一致（0 漂移）')
  } else {
    lines.push('- 存在漂移：请按需核对并刷新对应 scan 文档（sillyspec run scan）')
  }
  lines.push('')
  lines.push('> 由 sillyspec scan-diff 自动生成；改动源码后请按需核对 scan 文档。')
  const outPath = join(dir, 'scan-diff-report.md')
  try {
    writeFileSync(outPath, lines.join('\n') + '\n', 'utf8')
    return outPath
  } catch {
    return null
  }
}

/** 读 scan 目录任一 .md 的 source_commit（同 modules.js 写入同值，取首个命中；全失败 → null） */
function readSourceCommit(specBase, projectName) {
  const scanDir = join(specBase, 'docs', projectName, 'scan')
  if (!existsSync(scanDir)) return null
  try {
    for (const f of readdirSync(scanDir)) {
      if (!f.endsWith('.md')) continue
      const c = parseSourceCommit(readFileSync(join(scanDir, f), 'utf8'))
      if (c) return c
    }
  } catch { /* 读失败 → null */ }
  return null
}

/** 收集 module-map 全部 paths 去重（归一 Windows 反斜杠 + 去尾部斜杠；无 paths → 空数组） */
function collectScope(moduleIndex) {
  const set = new Set()
  for (const m of Object.values(moduleIndex || {})) {
    if (!Array.isArray(m.paths)) continue
    for (const raw of m.paths) {
      if (typeof raw !== 'string' || !raw) continue
      set.add(raw.replace(/\\/g, '/').replace(/\/+$/, ''))
    }
  }
  return [...set]
}

/** 路径是否落在范围（p 可为目录或文件：精确相等或目录前缀） */
function inScope(filePath, scope) {
  return scope.some((p) => p && (filePath === p || filePath.startsWith(p + '/')))
}

/** 解析 `git diff --name-status --find-renames` 输出 → [{ status, path, oldPath? }]（R/C 双路径） */
function parseNameStatus(out) {
  const items = []
  if (!out) return items
  for (const line of out.split('\n')) {
    const l = line.replace(/\r$/, '')
    if (!l) continue
    const tab = l.indexOf('\t')
    if (tab === -1) continue
    const m = l.slice(0, tab).match(/^([A-Z])(\d*)$/)
    if (!m) continue
    const status = m[1]
    const parts = l.slice(tab + 1).split('\t')
    const item = { status, path: parts[parts.length - 1] }
    if ((status === 'R' || status === 'C') && parts.length >= 2) item.oldPath = parts[0]
    items.push(item)
  }
  return items
}

/** 40 位全哈希缩成 7 位显示；引用/短哈希原样 */
function displayBase(b) {
  return /^[0-9a-f]{40}$/i.test(b) ? b.slice(0, 7) : b
}

/** null/NaN → '?'（降级显示） */
function fmtNum(n) {
  return n === null || Number.isNaN(n) ? '?' : String(n)
}
