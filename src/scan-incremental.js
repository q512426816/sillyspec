/**
 * scan-incremental — 增量 scan 计划计算层（change: 2026-11-14-scan-incremental / task-02）。
 *
 * 定位：把「scan 基线..HEAD 变化集」换算成「受影响模块集 + 篇章重生成/跳过集 +
 * _module-map 对账报告 + guard 白名单 + 软门回退判定」（design.md Phase 2）。
 * 消费方：run/stage.js scan 启动段（探测+路径判定+guard 握手，task-03）。
 *
 * 单源复用（D-001 禁双写）：parseSourceCommit（scan-staleness）/ parseNameStatus（scan-diff）/
 *   matchFilesToModules（docs-debt）/ parseModuleMapSimple（modules）/ SCAN_REQUIRED_DOCS（constants）。
 * 基线聚合锚（落后最多）与 scope 内联口径与 scan-diff/scan-refresh 同语义——两处先例均选择
 * 内联防双向耦合（src/scan-refresh.js:270 注释），本模块同例。
 *
 * 回退链（D-002/D-007，全 fail-soft 不抛）：无 scan 目录 / 无基线 / git 失败 / 非祖先基线 /
 *   任一基线载体 scan_depth:quick（浅文档应全量升级，与 refresh quick-depth 硬门同语义）/
 *   软门超限（scope 内变更 >100 文件或落后 >200 commit，对齐 REFRESH_SOFT_GATE，
 *   forceIncremental 可越并留痕）→ mode:'full' + 中文 reason。
 * 秒级预算（C4）：除 probe/listIndexFiles/affectedTests 三个 codegraph 调用外零子进程；
 *   unmapped hint 用目录邻居启发（D-010 执行期裁决），不用 query。
 */
import { existsSync, readFileSync, readdirSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { safeGit as defaultSafeGit } from './git-helper.js'
import { parseSourceCommit } from './scan-staleness.js'
import { parseNameStatus } from './scan-diff.js'
import { matchFilesToModules } from './docs-debt.js'
import { parseModuleMapSimple } from './modules.js'
import { SCAN_REQUIRED_DOCS } from './constants.js'
import { probeCodegraph as defaultProbe, listIndexFiles as defaultListFiles, affectedTests as defaultAffected } from './scan-codegraph.js'
import { writeAtomicSync as defaultWrite } from './fs-atomic.js'

/** 软门阈值（对齐 REFRESH_SOFT_GATE src/scan-refresh.js:41 同值，design Phase 2.7） */
export const INCREMENTAL_SOFT_GATE = Object.freeze({ maxDriftFiles: 100, maxBehindCommits: 200 })

const GIT_TIMEOUT_MS = 10_000

/**
 * 对账/变化集排除前缀与目录名（D-008 三层隔离之一；源集合与 estimateSourceSize skipDirs
 * 同源 src/run/scan-profile.js:28-37 + '.sillyspec-codegraph/' 索引目录自身）。
 * 模块内私有常量（原曾导出拟供 stage.js 共用，实际未消费，见 22e-b 死码裁决）。
 */
const INCREMENTAL_EXCLUDE_DIRS = Object.freeze(new Set([
  'node_modules', '.git', 'dist', 'build', 'out', 'target',
  '__pycache__', '.venv', 'venv',
  '.next', '.nuxt', '.output', '.svelte-kit', '.astro', '.turbo', '.parcel-cache',
  'coverage', '.nyc_output', '.vitest', '.cache',
  'vendor', 'bower_components',
  'dist-types',
  '.sillyspec', '.claude',
  'tmp', 'temp', '.tmp', 'logs',
  '.sillyspec-codegraph', '.codegraph',
]))

/** 路径是否被排除（任一路径段命中排除目录名，或以排除前缀开头） */
export function isExcludedPath(p) {
  if (typeof p !== 'string' || !p) return true
  const posix = p.replace(/\\/g, '/')
  return posix.split('/').some((seg) => INCREMENTAL_EXCLUDE_DIRS.has(seg))
}

/** 路由特征（路由信号判定：路径段或文件名含路由语义 token → INTEGRATIONS 篇章需重生成） */
const ROUTE_TOKENS = /(routes?|router|endpoint|controller|api|handler)s?\b/i

/**
 * 计算增量计划。
 * @param {{ projectRoot: string, specBase: string, projectName: string, forceIncremental?: boolean,
 *   deps?: { safeGit?, probeCodegraph?, listIndexFiles?, affectedTests?, writeFile? } }} opts
 *   deps 全部可注入（测试 mock；缺省用真实现）
 * @returns {Promise<object>} IncrementalPlan：
 *   { ok, mode:'incremental'|'full', reason, base, head, headShort, behindCommits,
 *     affectedModules:[{id, doc, files:[{path,status}], added, deleted, modified}],
 *     unmappedFiles:[{path, status, hint}], docsToRegenerate, docsToSkip,
 *     audit:{uncoveredFiles, totalIndexed, coverageRatio}|null,
 *     affectedTests:{list, truncated}|null, guardDocs, warnings }
 *   ok:false 仅参数缺失；增量不可行一律 mode:'full'（不抛，D-002 fail-soft）
 */
export async function computeIncrementalPlan(opts = {}) {
  const { projectRoot, specBase, projectName, forceIncremental = false } = opts
  const deps = opts.deps || {}
  const safeGit = deps.safeGit || defaultSafeGit
  const probeCodegraph = deps.probeCodegraph || defaultProbe
  const listIndexFiles = deps.listIndexFiles || defaultListFiles
  const affectedTests = deps.affectedTests || defaultAffected
  const writeFile = deps.writeFile || defaultWrite
  const warnings = []
  const scanDir = join(specBase, 'docs', projectName, 'scan')

  if (!projectRoot || !specBase || !projectName) {
    return { ok: false, mode: 'full', reason: '参数缺失（projectRoot/specBase/projectName 必填）', warnings }
  }
  const full = (reason) => ({
    ok: true, mode: 'full', reason, base: null, head: null, headShort: null, behindCommits: null,
    affectedModules: [], unmappedFiles: [], docsToRegenerate: [], docsToSkip: [...SCAN_REQUIRED_DOCS],
    audit: null, affectedTests: null, guardDocs: [], warnings,
  })

  // ── 基线载体收集（只认 SCAN_REQUIRED_DOCS；_ 前缀报告/底稿不是载体——refresh 同口径）──
  if (!existsSync(scanDir)) return full('无 scan 文档目录（绿地项目）——先跑全量 scan 建基线')
  const docEntries = [] // { file, base(7位), depth }
  for (const f of readdirSync(scanDir)) {
    if (!SCAN_REQUIRED_DOCS.includes(f)) continue
    let content = ''
    try { content = readFileSync(join(scanDir, f), 'utf8') } catch { continue }
    const base = parseSourceCommit(content)
    if (!base) return full(`scan 文档 ${f} 无 source_commit（旧版生成）——不可增量`)
    const dm = content.match(/^scan_depth:\s*(\S+)\s*$/m)
    docEntries.push({ file: f, base: base.slice(0, 7), depth: dm ? dm[1] : null })
  }
  if (docEntries.length === 0) return full('scan 目录内无基线载体文档')

  // ── quick 深度回退（D-007：任一基线载体是浅文档 → 全量升级；统一 bump 语义要求如此）──
  const quickDoc = docEntries.find((e) => e.depth === 'quick')
  if (quickDoc) return full(`基线载体 ${quickDoc.file} 是 scan_depth:quick 浅文档——应全量升级（--deep --force-rescan）`)

  // ── HEAD 解析（fail-soft：git 失败不抛，Review Focus #3）──
  const headRes = safeGit(projectRoot, ['rev-parse', 'HEAD'], { timeout: GIT_TIMEOUT_MS })
  if (headRes.error || !headRes.value) return full(`git rev-parse HEAD 失败（${String(headRes.error || '无输出').split('\n')[0]}）——非 git 仓或 git 异常`)
  const head = headRes.value.trim()
  const headShort = head.slice(0, 7)

  // ── 祖先校验（分支切换/rebase 脱锚 → full，refresh 硬门②同语义）──
  for (const e of docEntries) {
    const anc = safeGit(projectRoot, ['merge-base', '--is-ancestor', e.base, head], { timeout: GIT_TIMEOUT_MS })
    if (anc.error) return full(`基线 ${e.base} 不在当前分支历史（分支切换/rebase）——增量窗口脱锚`)
  }

  // ── 聚合锚：落后最多（保守漂移窗，scan-staleness D-003@v2 同口径）──
  let base = docEntries[0].base
  let behindCommits = 0
  for (const e of docEntries) {
    const r = safeGit(projectRoot, ['rev-list', '--count', `${e.base}..HEAD`], { timeout: GIT_TIMEOUT_MS })
    const n = r.error ? null : parseInt(r.value, 10)
    if (n !== null && !Number.isNaN(n) && n >= behindCommits) { behindCommits = n; base = e.base }
  }

  // ── 软门 behind 轴前置（C4 秒级预算，2026-11-14 task-06 真机实测驱动：大漂移仓 4233 commit
  // 落后时 git diff --name-status 跑出 40s+——behind 单轴已可判软门（或关系），非 force 时
  // 跳过 diff 直接回退，判定压回秒级。force 越过时才需要完整 diff 做收窄面。──
  if (behindCommits > INCREMENTAL_SOFT_GATE.maxBehindCommits && !forceIncremental) {
    return full(`漂移过大（落后 ${behindCommits} commit，阈值 ${INCREMENTAL_SOFT_GATE.maxDriftFiles}/${INCREMENTAL_SOFT_GATE.maxBehindCommits}）——增量收益消失，建议全量 sillyspec run scan --standard --force-rescan`)
  }

  // ── 变化集（全量变更文件；排除前缀过滤与对账同源 D-008）──
  const diffRes = safeGit(projectRoot, ['diff', '--name-status', '--find-renames', `${base}..HEAD`], { timeout: GIT_TIMEOUT_MS })
  if (diffRes.error) return full(`git diff ${base}..HEAD 失败（${String(diffRes.error).split('\n')[0]}）`)
  const changed = parseNameStatus(diffRes.value).filter((it) => !isExcludedPath(it.path))

  // ── codegraph 探测（fail-soft：不可用只降级补强面，不回退增量本身）──
  const probe = await probeCodegraph(projectRoot)
  if (!probe.available) warnings.push(`codegraph 不可用（${probe.reason}）——对账/受影响测试清单降级跳过，增量判定不受影响`)

  // ── 索引目录隔离提示（D-008 第②层：索引目录存在但未进 .gitignore → warnings 建议登记，
  //    不自动改写用户 .gitignore；第③层本仓登记见 .gitignore，第①层排除常量见 isExcludedPath）──
  if (existsSync(join(projectRoot, '.sillyspec-codegraph'))) {
    let ignored = false
    try {
      const gi = readFileSync(join(projectRoot, '.gitignore'), 'utf8')
      ignored = /^\.sillyspec-codegraph\/?\s*$/m.test(gi) || gi.includes('.sillyspec-codegraph')
    } catch { /* 无 .gitignore 或读失败 → 未 ignore */ }
    if (!ignored) warnings.push('索引目录 .sillyspec-codegraph/ 存在但未进 .gitignore——建议登记一行（防索引文件污染 git diff/对账清单），本仓治理见变更 2026-11-14-scan-incremental D-008')
  }

  // ── module-map 加载与 scope ──
  const mapPath = join(specBase, 'docs', projectName, 'modules', '_module-map.yaml')
  let moduleIndex = null
  if (existsSync(mapPath)) {
    try { moduleIndex = parseModuleMapSimple(readFileSync(mapPath, 'utf8')) } catch { moduleIndex = null }
  }
  const scope = collectScope(moduleIndex)
  if (scope.length === 0) warnings.push('module-map 缺失/为空——变化文件无法归模块（全部 unmapped），建议先跑全量 scan 建映射')

  // ── 软门（scope 内变更计数 + 落后数；forceIncremental 可越并留痕）──
  const scopeDrift = changed.filter((it) => scope.length === 0 || inScope(it.path, scope)).length
  if (scopeDrift > INCREMENTAL_SOFT_GATE.maxDriftFiles || behindCommits > INCREMENTAL_SOFT_GATE.maxBehindCommits) {
    const msg = `漂移过大（scope 内 ${scopeDrift} 文件 / 落后 ${behindCommits} commit，阈值 ${INCREMENTAL_SOFT_GATE.maxDriftFiles}/${INCREMENTAL_SOFT_GATE.maxBehindCommits}）——增量收益消失`
    if (!forceIncremental) return full(msg)
    warnings.push(`软门已 --force-incremental 越过：${msg}`)
  }

  // ── 归属（matchFilesToModules 单源；A/D/M/R 状态聚合同 scan-diff 模式）──
  const allFiles = changed.map((it) => it.path)
  const statusOf = new Map(changed.map((it) => [it.path, it.status]))
  let byModule = new Map()
  let unmapped = allFiles
  if (allFiles.length > 0 && moduleIndex) {
    try {
      const matched = matchFilesToModules(allFiles, moduleIndex, { cardsDir: join(specBase, 'docs', projectName, 'modules') })
      byModule = matched.byModule
      unmapped = matched.unmapped
    } catch { warnings.push('matchFilesToModules 归属失败（降级全部 unmapped）') }
  }

  const affectedModules = []
  for (const [id, entry] of byModule) {
    let a = 0, d = 0, m = 0
    for (const f of entry.files) {
      const s = statusOf.get(f)
      if (s === 'A') a++
      else if (s === 'D') d++
      else m++
    }
    affectedModules.push({ id, doc: entry.doc || '', files: entry.files.map((f) => ({ path: f, status: statusOf.get(f) || 'M' })), added: a, deleted: d, modified: m })
  }

  // ── unmapped hint：目录邻居启发（D-010，纯本地零子进程）──
  const hintByDir = new Map() // 目录前缀 → 模块 id（由已归属文件聚合）
  for (const [id, entry] of byModule) {
    for (const f of entry.files) {
      const dir = f.replace(/\\/g, '/').split('/').slice(0, -1).join('/')
      if (dir && !hintByDir.has(dir)) hintByDir.set(dir, id)
    }
  }
  const unmappedFiles = unmapped.map((p) => {
    const dir = p.replace(/\\/g, '/').split('/').slice(0, -1).join('/')
    const hint = []
    let cur = dir
    while (cur && hint.length < 3) {
      if (hintByDir.has(cur)) hint.push(hintByDir.get(cur))
      if (!cur.includes('/')) break
      cur = cur.split('/').slice(0, -1).join('/')
    }
    return { path: p, status: statusOf.get(p) || 'M', hint }
  })

  // ── 篇章影响映射（design Phase 2.6 保守规则）──
  const docsToRegenerate = new Set()
  const structuralSignal = unmappedFiles.length > 0 || affectedModules.some((m) => m.deleted > 0)
  if (structuralSignal) {
    docsToRegenerate.add('STRUCTURE.md')
    docsToRegenerate.add('ARCHITECTURE.md')
  }
  const routeSignal = changed.some((it) => ROUTE_TOKENS.test(it.path))
  if (routeSignal) docsToRegenerate.add('INTEGRATIONS.md')
  const docsToRegenerateList = [...docsToRegenerate]
  const docsToSkip = SCAN_REQUIRED_DOCS.filter((d) => !docsToRegenerate.has(d))

  // ── 对账（codegraph available 时；报告落盘 _module-map-audit.md）──
  let audit = null
  if (probe.available && scope.length > 0) {
    const files = await listIndexFiles(projectRoot)
    if (files) {
      // 项目责任域与口径对齐（2026-11-15-scan-audit-domain）：索引路径是全仓相对、子项目
      // map paths 历史上两种口径并存（backend=项目相对 app/core/**；sillyhub-daemon=全仓相对
      // sillyhub-daemon/src/**）——按注册 path 剥前缀得 rel，覆盖判定双口径兼容（rel 或全仓
      // 原路径任一命中即覆盖）；剥不动的文件（其他项目域内）不进对账分母与未归属（跨域污染
      // 修复，backend 项目实测误报 3296）。空前缀（主项目 path:. / 未注册单项目仓）不剥不滤
      // ——根级散文件仍是真实盲区，行为不变（FR-02）。uncovered 报全仓原始路径（可定位）。
      const pre = readProjectPathPrefix(specBase, projectName)
      const effective = []
      for (const f of files) {
        if (isExcludedPath(f.path)) continue
        let rel
        if (pre) {
          if (!f.path.startsWith(pre)) continue // 其他项目域内
          rel = f.path.slice(pre.length)
        } else {
          rel = f.path
        }
        effective.push({ rel, orig: f.path })
      }
      const uncovered = effective.filter((e) => !inScope(e.rel, scope) && !inScope(e.orig, scope)).map((e) => e.orig)
      audit = {
        uncoveredFiles: uncovered,
        totalIndexed: effective.length,
        coverageRatio: effective.length > 0 ? Math.round(((effective.length - uncovered.length) / effective.length) * 100) / 100 : null,
      }
      writeAuditReport({ specBase, projectName, headShort, audit, writeFile })
    } else {
      warnings.push('codegraph files 清单获取失败——对账跳过')
    }
  }

  // ── 受影响测试清单（补强面：重生成子代理的回归提示）──
  let affected = null
  if (probe.available && allFiles.length > 0) {
    const r = await affectedTests(projectRoot, allFiles)
    if (r) affected = { list: r.affectedTests, truncated: r.truncated }
  }

  // ── guard 白名单（task-03 guard 握手消费；新增文件无哈希=计划内新建放行由 guard 分支处理）──
  // 模块卡路径归一：map 的 doc 字段是 `modules/<id>.md`（相对 modules 目录），转 specBase 相对完整路径
  const scanRel = (f) => `docs/${projectName}/scan/${f}`
  const cardRel = (m) => {
    const d = typeof m.doc === 'string' && m.doc ? m.doc : `modules/${m.id}.md`
    return d.startsWith('docs/') ? d : `docs/${projectName}/${d.replace(/^\/+/, '')}`
  }
  const guardDocs = [
    ...docsToRegenerateList.map(scanRel),
    ...affectedModules.map(cardRel),
    `docs/${projectName}/modules/_module-map.yaml`,
    `docs/${projectName}/scan/_module-map-audit.md`,
    `docs/${projectName}/scan/_facts.md`,
  ].map((p) => p.replace(/\\/g, '/'))

  return {
    ok: true, mode: 'incremental', reason: `基线 ${base}..${headShort}（落后 ${behindCommits} commit）`,
    base, head, headShort, behindCommits,
    affectedModules, unmappedFiles, docsToRegenerate: docsToRegenerateList, docsToSkip,
    audit, affectedTests: affected, guardDocs, warnings,
  }
}

// ── 内部工具 ───────────────────────────────────────────────────────────────

/** 读注册项目 path 的前缀形态（'backend' → 'backend/'；主项目 '.'/未注册/读失败 → ''） */
function readProjectPathPrefix(specBase, projectName) {
  try {
    const p = join(specBase, 'projects', `${projectName}.yaml`)
    if (!existsSync(p)) return ''
    const m = readFileSync(p, 'utf8').match(/^path:\s*(\S+)\s*$/m)
    const v = m ? m[1].replace(/\\/g, '/').replace(/^\.\//, '').replace(/\/+$/, '') : ''
    return !v || v === '.' ? '' : `${v}/`
  } catch {
    return ''
  }
}

/** module-map 全部 paths 去重归一（scan-diff/scan-refresh 同口径内联先例，防双向耦合） */
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

/** 路径是否落在范围（精确相等或目录前缀；`src/**` 形 glob 展开为 src 前缀匹配） */
function inScope(filePath, scope) {
  const p = filePath.replace(/\\/g, '/')
  return scope.some((s) => {
    const norm = s.replace(/\\/g, '/').replace(/\/+$/, '')
    const prefix = norm.endsWith('/**') ? norm.slice(0, -3) : norm
    if (!prefix) return false
    return p === prefix || p.startsWith(prefix + '/')
  })
}

/** 对账报告落盘（_ 前缀非基线载体；frontmatter 带 source_commit=HEAD——staleness 收集读到它取 max 口径无实害） */
function writeAuditReport({ specBase, projectName, headShort, audit, writeFile }) {
  try {
    const dir = join(specBase, 'docs', projectName, 'scan')
    mkdirSync(dir, { recursive: true })
    const lines = [
      '---',
      `source_commit: ${headShort}`,
      `updated_at: ${new Date().toISOString()}`,
      'generator: sillyspec-scan-incremental',
      '---',
      '',
      '# _module-map 对账报告（Module Map Audit）',
      '',
      `索引全量文件 ${audit.totalIndexed} 个（排除 .sillyspec/node_modules/构建产物等非源码面与 .sillyspec-codegraph/ 索引目录后），模块 paths 覆盖率 ${(audit.coverageRatio ?? '?') * 100}%。`,
      `未归属文件 ${audit.uncoveredFiles.length} 个——这些文件不在任何模块的 paths 覆盖集内，是映射盲区（新模块落地或 paths 过窄）：`,
      '',
      ...audit.uncoveredFiles.map((f) => `- \`${f}\``),
      '',
      '> 由 sillyspec scan-incremental 自动生成；归属判断归 agent（补扫时判断新文件归属，勿自动改 map）。',
    ]
    writeFile(join(dir, '_module-map-audit.md'), lines.join('\n') + '\n')
  } catch { /* 对账报告写失败不阻断计划（advisory 面） */ }
}
