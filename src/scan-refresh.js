/**
 * scan-refresh — scan 文档增量刷新（change: 2026-09-14-scan-incremental-refresh）
 *
 * 定位：scan 产物漂移的「刷新执行闭环」。信号侧四路已通（scan-staleness / scan diff /
 * archive-delta 建议 / last-delta 回灌），但 agent 定点补文档后 source_commit 不推进——
 * 漂移信号永久重报旧账。本模块补闭环的另一半（D-7 设计稿「agent 按清单定点补」形态）：
 *
 *   两拍交互（D-002@v1）：
 *     ① sillyspec scan refresh —— 门控 + 受影响文档集 + 手术工单渲染 + guard 握手写
 *        （agent 按工单定点编辑文档正文，worktree-guard 白名单放行）
 *     ② sillyspec scan refresh --done —— 内容比对门 + per-doc bump 盖章 + postcheck + 审计
 *
 * 分层（仿 scan-diff.js）：
 *   computeRefreshPlan —— 计算层（git 只读 + frontmatter/module-map 读取 + guard 原子写）。
 *     硬错误（门控拒绝）返回 { ok:false, kind, error, hint }；advisory 进 warnings。
 *   runRefresh / finalizeRefresh —— IO 面（终端渲染 / --done 收尾），task-06 接线。
 *
 * 口径（D-008@v1）：
 *   dirtyCheck——scope 非空限 module-map scope；scope 空回退全仓源码面（排除
 *     .sillyspec/node_modules/dist/build/.git——scan 文档自身预期脏不阻断）。
 *   受影响集变更集——全量变更集**不经 scope 过滤**（staleRefs 同语义：引用自带范围）。
 *   软门漂移计数——scope 过滤后 driftCount（与 scan diff 同口径）。
 *
 * 检出极限（D-006@v1，如实声明）：staleRefs 只发现带 file:line 引用的过期陈述；
 * 无引用论断检不出。refresh 只声称「核对至 HEAD 的检出项已处理」，不声称「一致」。
 */
import { existsSync, readFileSync, readdirSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { createHash } from 'node:crypto'
import { safeGit } from './git-helper.js'
import { writeAtomicSync } from './fs-atomic.js'
import { parseSourceCommit } from './scan-staleness.js'
import { collectStaleRefs, parseNameStatus } from './scan-diff.js'
import { parseModuleMapSimple } from './modules.js'
import { SCAN_REQUIRED_DOCS } from './constants.js'

const GIT_TIMEOUT_MS = 10000

/** 软门阈值（D-005@v1）：超限告警建议全量（--force 可越；工程默认值，量级仿 staleness 50/14 惯例放大） */
const REFRESH_SOFT_GATE = { maxDriftFiles: 100, maxBehindCommits: 200 }

/** 工单材料体积上限（FR-8 / R-04）：超限降级为提示 agent 自行 git diff */
const MAX_HUNK_LINES_PER_DOC = 200
const MAX_COMMIT_LINES = 30

/** dirtyCheck 豁免前缀（scope 空回退全仓源码面时排除：进度库/依赖/产物/版本控制——D-008@v1） */
const DIRTY_FALLBACK_EXCLUDE = ['.sillyspec/', 'node_modules/', 'dist/', 'build/', '.git/']

/** scope 空回退时仍阻断的源码扩展名面（粗粒度：非二进制/产物即视为源码面） */
const SOURCE_EXT = /\.(js|mjs|cjs|ts|tsx|jsx|py|java|go|rs|rb|php|c|cpp|h|vue|svelte|json|ya?ml|toml|xml|sql|sh|md)$/i

/**
 * 计算层：增量刷新计划。
 * @param {{ projectRoot: string, specBase: string, projectName: string, force?: boolean }} opts
 *   projectRoot：git 锚；specBase/projectName：scan 文档定位（specBase/docs/<projectName>/scan）
 *   force：只越软门（漂移过大告警），不越硬门（D-005@v1）
 * @returns {{ ok: true, head, headShort, behindCommits, scope, affectedDocs, freshDocs,
 *     warnings, workOrderHeadline }
 *   | { ok: false, kind: 'missing-args'|'no-baseline'|'non-ancestor'|'quick-depth'|'dirty-worktree'|'git-error', error, hint? }}
 *   affectedDocs：[{ file, base, staleRefs: [{ref,change,file}], hunks, commits, hunksTruncated }]
 *   （guard 握手文件已原子写——mode=scan-refresh + refreshDocs 白名单 + docHashes 内容哈希）
 */
export function computeRefreshPlan({ projectRoot, specBase, projectName, force = false } = {}) {
  if (!projectRoot || !specBase || !projectName) {
    return { ok: false, kind: 'missing-args', error: 'projectRoot / specBase / projectName 必填，缺一不可' }
  }
  const warnings = []
  const scanDir = join(specBase, 'docs', projectName, 'scan')
  if (!existsSync(scanDir)) {
    return { ok: false, kind: 'no-baseline', error: `无 scan 文档目录 ${scanDir}`,
      hint: '先跑 sillyspec run scan 生成基线，增量刷新无出发锚点' }
  }

  // ── per-doc 基线收集（含 scan_depth，quick 浅文档硬门用）──
  // 基线载体只认 7 份标准文档（SCAN_REQUIRED_DOCS）——scan 目录内的其他 .md
  //（scan-diff-report.md 报告、NOTES 草稿、_ 前缀底稿）不是基线载体，不参与门控不进受影响集
  //（它们无 frontmatter 属正常，若硬拦会让 refresh 被杂项文件永久卡死）。
  const docEntries = [] // { file, base, depth }
  for (const f of readdirSync(scanDir)) {
    if (!SCAN_REQUIRED_DOCS.includes(f)) continue
    let content = ''
    try { content = readFileSync(join(scanDir, f), 'utf8') } catch { continue }
    const base = parseSourceCommit(content)
    if (!base) {
      return { ok: false, kind: 'no-baseline', error: `scan 文档 ${f} 无 source_commit（绿地/旧版生成）`,
        hint: '无基线不可增量——跑 sillyspec run scan --standard --force-rescan 重建基线' }
    }
    const depthMatch = content.match(/^scan_depth:\s*(\S+)\s*$/m)
    // 基线归一 7 位：盖章写短哈希、旧文档可能带 40 位——fresh 比对与分组都以短哈希为键
    docEntries.push({ file: f, base: base.slice(0, 7), depth: depthMatch ? depthMatch[1] : null })
  }
  if (docEntries.length === 0) {
    return { ok: false, kind: 'no-baseline', error: 'scan 目录内无 .md 文档', hint: '先跑 sillyspec run scan' }
  }

  // ── HEAD 解析（非 git 仓/失败 fail-soft 拒绝，R-06）──
  const headRes = safeGit(projectRoot, ['rev-parse', 'HEAD'])
  if (headRes.error || !headRes.value) {
    return { ok: false, kind: 'git-error', error: `git rev-parse HEAD 失败（${headRes.error || '无输出'}）`,
      hint: '非 git 仓不可增量刷新——走全量 sillyspec run scan' }
  }
  const head = headRes.value.trim()
  const headShortRes = safeGit(projectRoot, ['rev-parse', '--short', 'HEAD'])
  const headShort = headShortRes.error ? head.slice(0, 7) : headShortRes.value.trim()

  // ── 硬门②：任一基线非 HEAD 祖先（分支切换/rebase，diff 两快照呈假象）──
  for (const e of docEntries) {
    const anc = safeGit(projectRoot, ['merge-base', '--is-ancestor', e.base, head])
    if (anc.error) {
      return { ok: false, kind: 'non-ancestor', error: `scan 文档 ${e.file} 的基线 ${e.base.slice(0, 7)} 不在当前分支历史（分支切换/rebase）`,
        hint: '增量窗口脱锚不可算——跑 sillyspec run scan --standard --force-rescan 重建基线' }
    }
  }

  // ── dirtyCheck（D-004@v1 fail-closed；scope 口径 D-008@v1）──
  const moduleIndex = loadModuleIndex(specBase, projectName, warnings)
  const scope = collectScope(moduleIndex)
  const dirtyRes = checkDirtyWorktree(projectRoot, scope)
  if (dirtyRes.length > 0) {
    return { ok: false, kind: 'dirty-worktree',
      error: `in-scope 路径有未提交改动 ${dirtyRes.length} 个：${dirtyRes.slice(0, 5).join(', ')}${dirtyRes.length > 5 ? ' …' : ''}`,
      hint: '增量刷新只核对已提交面（base..HEAD）——先提交再重试，或走全量 sillyspec run scan（读工作区口径）' }
  }
  if (scope.length === 0) warnings.push('module-map 缺失/为空——dirtyCheck 回退全仓源码面，漂移范围无法归模块（建议先跑 sillyspec modules rebuild）')

  // ── per-doc 分组 diff（D-003@v2 核心：每文档从自己的基线算漂移窗）──
  const groups = new Map() // base → { files: [], changedFull: Map }
  for (const e of docEntries) {
    if (e.base === head.slice(0, 7)) continue // fresh：已在当前 HEAD（7 位归一口径）
    if (!groups.has(e.base)) {
      const diffRes = safeGit(projectRoot, ['diff', '--name-status', '--find-renames', `${e.base}..HEAD`], { timeout: GIT_TIMEOUT_MS })
      if (diffRes.error) {
        return { ok: false, kind: 'git-error', error: `git diff ${e.base.slice(0, 7)}..HEAD 失败（${diffRes.error}）`,
          hint: 'git 异常不可增量——走全量 sillyspec run scan' }
      }
      const changedFull = new Map() // POSIX path → A/D/M/R（R 旧路径入集，与 scan-diff staleRefs 同构）
      for (const item of parseNameStatus(diffRes.value)) {
        if (item.status === 'A' || item.status === 'D') changedFull.set(item.path, item.status)
        else if (item.status === 'M' || item.status === 'C') changedFull.set(item.path, 'M')
        else if (item.status === 'R') { changedFull.set(item.path, 'R'); changedFull.set(item.oldPath, 'R') }
      }
      groups.set(e.base, { files: parseNameStatus(diffRes.value), changedFull })
    }
  }

  // ── 受影响文档集：全量变更集 × 各文档 file:line 引用命中（staleRefs 单源复用）──
  const staleByDoc = new Map() // file → [{ref,change,file}]
  for (const [base, g] of groups) {
    const hits = collectStaleRefs(scanDir, g.changedFull) // 返回 [{doc,ref,change,file}]
    for (const h of hits) {
      // 只保留属于本基线组的文档（他组文档的命中由其所属组的全量集重算——组间变更集不同）
      if (!docEntries.some(e => e.file === h.doc && e.base === base)) continue
      if (!staleByDoc.has(h.doc)) staleByDoc.set(h.doc, [])
      staleByDoc.get(h.doc).push({ ref: h.ref, change: h.change, file: h.file })
    }
  }

  // ── 硬门③：受影响文档含 scan_depth: quick（浅文档本就该 --deep 全量升级）──
  const affected = docEntries.filter(e => staleByDoc.has(e.file))
  for (const e of affected) {
    if (e.depth === 'quick') {
      return { ok: false, kind: 'quick-depth', error: `受影响文档 ${e.file} 是 scan_depth: quick 浅层版本`,
        hint: '浅文档应全量升级——跑 sillyspec run scan --deep --force-rescan（会识别 quick 标记覆盖重写）' }
    }
  }

  // ── 软门（scope 过滤后漂移 / 落后数；--force 可越，D-005@v1/D-008@v1）──
  let driftCount = 0
  for (const [, g] of groups) {
    for (const item of g.files) {
      if (item.status !== 'A' && item.status !== 'D' && item.status !== 'M' && item.status !== 'R' && item.status !== 'C') continue
      if (scope.length === 0 || inScope(item.path, scope)) driftCount++
    }
  }
  let behindCommits = 0
  {
    const countRes = safeGit(projectRoot, ['rev-list', '--count', `${docEntries[0].base}..HEAD`], { timeout: GIT_TIMEOUT_MS })
    if (!countRes.error) behindCommits = parseInt(countRes.value, 10) || 0
    // 多基线取最大（最坏情况；fail-soft：计数失败保底 0 不阻断）
    for (const base of groups.keys()) {
      const r = safeGit(projectRoot, ['rev-list', '--count', `${base}..HEAD`], { timeout: GIT_TIMEOUT_MS })
      if (!r.error) behindCommits = Math.max(behindCommits, parseInt(r.value, 10) || 0)
    }
  }
  const softHit = driftCount > REFRESH_SOFT_GATE.maxDriftFiles || behindCommits > REFRESH_SOFT_GATE.maxBehindCommits
  if (softHit) {
    const msg = `漂移过大（scope 内 ${driftCount} 文件 / 落后 ${behindCommits} commit，阈值 ${REFRESH_SOFT_GATE.maxDriftFiles}/${REFRESH_SOFT_GATE.maxBehindCommits}）——增量收益消失，建议全量 sillyspec run scan --standard --force-rescan`
    if (force) warnings.push(`软门已 --force 越过：${msg}`)
    else return { ok: false, kind: 'soft-gate', error: msg, hint: '确认增量继续：sillyspec scan refresh --force' }
  }

  // ── 工单材料（FR-8/R-04 截断）──
  const affectedDocs = []
  for (const e of affected) {
    const refs = staleByDoc.get(e.file)
    const refFiles = [...new Set(refs.map(r => r.file))]
    let hunks = ''
    let hunksTruncated = false
    if (refFiles.length > 0) {
      const d = safeGit(projectRoot, ['diff', `${e.base}..HEAD`, '--', ...refFiles], { timeout: GIT_TIMEOUT_MS })
      if (!d.error && d.value) {
        const lines = d.value.split('\n')
        hunksTruncated = lines.length > MAX_HUNK_LINES_PER_DOC
        hunks = lines.slice(0, MAX_HUNK_LINES_PER_DOC).join('\n')
      }
    }
    const logRes = safeGit(projectRoot, ['log', '--oneline', `-n`, `${MAX_COMMIT_LINES}`, `${e.base}..HEAD`], { timeout: GIT_TIMEOUT_MS })
    affectedDocs.push({ file: e.file, base: e.base, staleRefs: refs, hunks, hunksTruncated, commits: logRes.error ? '' : logRes.value.trim() })
  }
  const freshDocs = docEntries.filter(e => e.base === head.slice(0, 7)).map(e => e.file)

  // ── guard 握手（D-007@v1：原子写——hook 并发读，防半截 JSON fail-closed 窗口）──
  const docHashes = {}
  const refreshDocs = []
  for (const e of affected) {
    const rel = `docs/${projectName}/scan/${e.file}`
    refreshDocs.push(rel)
    try { docHashes[rel] = sha256File(join(scanDir, e.file)) } catch { /* 读失败不进白名单（保守） */ }
  }
  if (refreshDocs.length > 0) {
    try {
      const guardDir = join(specBase, '.runtime')
      mkdirSync(guardDir, { recursive: true })
      writeAtomicSync(join(guardDir, 'scan-guard.json'), JSON.stringify({
        name_zh: '增量刷新守卫',
        mode: 'scan-refresh',
        refreshDocs,
        docHashes,
        sourceCommit: headShort,
        startedAt: new Date().toISOString(),
        forceRescan: false,
      }, null, 2) + '\n')
    } catch (e) {
      return { ok: false, kind: 'git-error', error: `guard 握手文件写入失败（${e.message}）`,
        hint: '编辑拍将无 hook 放行通道——检查 .runtime/ 可写性后重试' }
    }
  }

  return {
    ok: true, head, headShort, behindCommits, scope,
    affectedDocs, freshDocs, warnings,
    workOrderHeadline: affected.length === 0
      ? `零检出漂移（staleRefs 0 命中）——检出极限内无需刷新；无引用论断不在此保证（D-006）`
      : `受影响文档 ${affected.length} 份 / 过时引用 ${affectedDocs.reduce((n, d) => n + d.staleRefs.length, 0)} 条——只编辑下列文档的受影响小节，未命中内容原样保留`,
  }
}

// ── 内部工具 ─────────────────────────────────────────────────────

function sha256File(p) {
  return createHash('sha256').update(readFileSync(p)).digest('hex')
}

function loadModuleIndex(specBase, projectName, warnings) {
  const mapPath = join(specBase, 'docs', projectName, 'modules', '_module-map.yaml')
  if (!existsSync(mapPath)) return null
  try { return parseModuleMapSimple(readFileSync(mapPath, 'utf8')) } catch {
    warnings.push('module-map 解析失败——按缺失处理（dirtyCheck 回退全仓源码面）')
    return null
  }
}

/** module-map 全部 paths 去重归一（与 scan-diff collectScope 同口径；本模块内联防双向耦合） */
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

function inScope(filePath, scope) {
  return scope.some((p) => p && (filePath === p || filePath.startsWith(p + '/')))
}

/** dirtyCheck：scope 非空限 scope；空回退全仓源码面（D-008@v1）。返回 in-scope 脏路径清单 */
function checkDirtyWorktree(projectRoot, scope) {
  const st = safeGit(projectRoot, ['status', '--porcelain'], { timeout: GIT_TIMEOUT_MS })
  if (st.error || !st.value) return [] // git 失败 fail-soft 放行（后续 diff/门控仍会暴露 git 问题）
  const dirty = []
  for (const line of st.value.split('\n')) {
    const l = line.replace(/\r$/, '')
    if (!l) continue
    // porcelain v1：`XY path`——状态列与路径间空格数不定（不同 git 版本对未暂存改动
    // 输出 `M path` 或 ` M path`，固定 slice 会错位）；rename 形如 `R  old -> new` 取新路径
    const m = l.match(/^\S+\s+(.+)$/)
    if (!m) continue
    let p = m[1].trim().replace(/^"(.*)"$/, '$1')
    if (p.includes(' -> ')) p = p.split(' -> ').pop()
    p = p.replace(/\\/g, '/')
    if (!p) continue
    if (scope.length > 0) {
      if (inScope(p, scope)) dirty.push(p)
    } else {
      if (DIRTY_FALLBACK_EXCLUDE.some((pre) => p.startsWith(pre))) continue
      if (SOURCE_EXT.test(p)) dirty.push(p)
    }
  }
  return dirty
}

// ── IO 面（task-06）──────────────────────────────────────────────

/** 状态字母 → 人话（工单渲染） */
function changeLabel(c) {
  return c === 'D' ? '文件已删除' : c === 'A' ? '文件为基线后新增' : c === 'R' ? '文件已重命名' : '文件已变更'
}

/**
 * IO 面：第①拍——渲染手术工单。
 * @param {{ projectRoot, specBase, projectName, force?, json? }} opts
 * @returns {number} 退出码：0=工单就绪/零检出漂移；2=门控拒绝或错误
 */
export async function runRefresh(opts = {}) {
  const { projectRoot, specBase, projectName, force = false, json = false } = opts
  const r = computeRefreshPlan({ projectRoot, specBase, projectName, force })
  if (json) {
    console.log(JSON.stringify(r, null, 2))
    return r.ok ? 0 : 2
  }
  if (!r.ok) {
    console.error(`scan refresh：${r.error}`)
    if (r.hint) console.error(`   → ${r.hint}`)
    return 2
  }
  for (const w of r.warnings) console.warn(`  ⚠️ ${w}`)
  // 顺带重跑 scan facts（全量幂等，D-002@v1；fail-soft 不阻断工单）
  try {
    const { buildAndWriteScanFacts } = await import('./scan-facts.js')
    await buildAndWriteScanFacts({ cwd: projectRoot, specDir: specBase, projectName })
    console.log('  📄 _facts.md 已重跑刷新')
  } catch (e) {
    console.warn(`  ⚠️ scan facts 重跑失败（不阻断）：${String((e && e.message) || e).split('\n')[0]}`)
  }
  console.log(`scan refresh（基线后 ${r.behindCommits} commit · HEAD ${r.headShort}）：${r.workOrderHeadline}`)
  if (r.freshDocs.length > 0) console.log(`  已在当前 HEAD（跳过）：${r.freshDocs.join(', ')}`)
  if (r.affectedDocs.length === 0) {
    console.log('检出极限：本判定只覆盖带 file:line 引用的检出项，无引用论断不在保证范围（staleness advisory 仍有效）。')
    return 0
  }
  console.log('')
  for (const d of r.affectedDocs) {
    console.log(`## ${d.file}（基线 ${d.base.slice(0, 7)}）`)
    console.log(`过时引用 ${d.staleRefs.length} 条：`)
    for (const s of d.staleRefs) console.log(`  - \`${s.ref}\`（${changeLabel(s.change)}：${s.file}）`)
    if (d.commits) {
      console.log('基线后提交：')
      for (const l of d.commits.split('\n')) console.log(`  ${l}`)
    }
    if (d.hunks) {
      console.log(`相关 diff${d.hunksTruncated ? '（已截断，完整自行 git diff）' : ''}：`)
      for (const l of d.hunks.split('\n')) console.log(`  ${l}`)
    }
    console.log('编辑纪律：只动受影响小节；未命中内容原样保留；新引用须真实可核验（--done 时 postcheck 逐条核验）。')
    console.log('')
  }
  console.log('编辑完成后收尾：sillyspec scan refresh --done（只推进核对过的文档；未编辑文档默认不盖章）')
  console.log('检出极限：收尾后只声称「核对至 HEAD 的检出项已处理」，不声称文档与源码一致。')
  return 0
}

/**
 * IO 面：第②拍——内容比对门 + per-doc bump + postcheck + 审计落盘。
 * @param {{ projectRoot, specBase, projectName, docs?: string[]|null, force?: boolean, platformOpts?: object|null }} opts
 *   docs：显式点名（scan 目录内文件名，如 ARCHITECTURE.md）；缺省=①拍工单全部受影响文档
 * @returns {{ code: number, bumped: string[], skipped: {file:string,reason:string}[], postCheckStatus: string, auditPath: string|null }}
 *   code：0=盖章成功；1=postCheck failed（文档留待修复重跑）；2=参数/guard/错误
 */
export async function finalizeRefresh(opts = {}) {
  const { projectRoot, specBase, projectName, docs = null, force = false, platformOpts = null } = opts
  const scanDir = join(specBase, 'docs', projectName, 'scan')
  // ①拍 guard 会话态必须存在（握手文件=工单受影响集与内容哈希的唯一来源）
  let guard = null
  const guardPath = join(specBase, '.runtime', 'scan-guard.json')
  try { guard = JSON.parse(readFileSync(guardPath, 'utf8')) } catch { /* 缺失/坏 JSON → 下方拒绝 */ }
  if (!guard || guard.mode !== 'scan-refresh') {
    console.error('scan refresh --done：未找到增量刷新会话态（.runtime/scan-guard.json 无 mode=scan-refresh）')
    console.error('   → 先跑 sillyspec scan refresh（①拍出工单），编辑完成后再 --done')
    return { code: 2, bumped: [], skipped: [], postCheckStatus: null, auditPath: null }
  }
  const relOf = (name) => `docs/${projectName}/scan/${name}`
  const explicit = Array.isArray(docs) && docs.length > 0

  // 内容比对门（D-009@v1）：默认面=工单受影响文档且内容有变者；未编辑文档不盖章
  const candidates = explicit
    ? docs.map((name) => ({ name }))
    : (guard.refreshDocs || []).map((rel) => ({ name: rel.split('/').pop() }))
  const skipped = []
  const toBump = []
  for (const { name } of candidates) {
    const rel = relOf(name)
    const baselineHash = guard.docHashes && guard.docHashes[rel]
    if (!explicit && !force && baselineHash) {
      let curHash = null
      try { curHash = sha256File(join(scanDir, name)) } catch { /* 读失败按未变处理（保守跳过） */ }
      if (curHash === baselineHash) {
        skipped.push({ file: name, reason: '内容未变（未编辑即盖章）——显式 --docs 点名或 --force 才推进' })
        continue
      }
    }
    toBump.push(name)
  }
  if (toBump.length === 0) {
    console.log('scan refresh --done：无文档推进（全部未编辑/已点名为空）。工单未完成请先编辑，或显式 --docs 点名。')
    return { code: 0, bumped: [], skipped, postCheckStatus: null, auditPath: null }
  }

  // per-doc bump（task-03 单源）+ postcheck（specDir 转换口径对齐 executeScanFinalize，D-009@v1）
  const { bumpScanDocBaselines, runScanPostCheck, printScanPostCheckResult } = await import('./scan-postcheck.js')
  const specDirForCheck = platformOpts?.specRoot || null
  const headShortRes = safeGit(projectRoot, ['rev-parse', '--short', 'HEAD'])
  const headShort = headShortRes.error ? null : headShortRes.value.trim()
  const bump = bumpScanDocBaselines({ cwd: projectRoot, specDir: platformOpts?.specRoot || specBase, project: projectName, docs: toBump, headShort })
  console.log(`  📝 基线推进 ${bump.bumped.length} 份文档（source_commit→${headShort || '?'} / generator→sillyspec-scan-refresh）`)
  for (const s of bump.skipped) console.log(`  ⏭️  ${s.file}：${s.reason}`)
  // specDir 传平台 specRoot（平台模式）或 null（本地模式——bump 用 specBase 参数，postcheck 用 null 走本地轻量）
  const postCheck = runScanPostCheck({ cwd: projectRoot, specDir: platformOpts?.specRoot || null, scanProfile: null })
  printScanPostCheckResult(postCheck)

  // 审计（只写不读，取证面；平台模式经 resolveRuntimeRoot 定根）
  let auditPath = null
  try {
    const { resolveRuntimeRoot } = await import('./run/shared.js')
    const runtimeRoot = resolveRuntimeRoot(platformOpts, specBase)
    mkdirSync(runtimeRoot, { recursive: true })
    const ts = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14)
    auditPath = join(runtimeRoot, `scan-refresh-${ts}.json`)
    writeAtomicSync(auditPath, JSON.stringify({
      changeType: 'scan-refresh',
      head: headShort,
      project: projectName,
      bumped: bump.bumped,
      skippedBump: bump.skipped,
      skippedUnedited: skipped,
      postCheckStatus: postCheck.status,
      guardSourceCommit: guard.sourceCommit || null,
      detectionLimit: '只覆盖带 file:line 引用的检出项；无引用论断不在保证范围（staleness advisory 仍有效）',
      finishedAt: new Date().toISOString(),
    }, null, 2) + '\n')
  } catch (e) {
    console.warn(`  ⚠️ 审计落盘失败（不阻断）：${e.message}`)
  }
  const code = postCheck.status === 'failed' ? 1 : 0
  if (code === 0) {
    console.log('检出极限：本次只声称「核对至 HEAD 的检出项已处理」，不声称文档与源码一致（staleness advisory 仍有效）。')
  }
  return { code, bumped: bump.bumped, skipped: [...skipped, ...bump.skipped], postCheckStatus: postCheck.status, auditPath }
}
