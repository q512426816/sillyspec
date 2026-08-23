/**
 * docs-debt — 模块文档欠账事实计算（change: 2026-08-15-docs-debt-inject，债单第六节）
 *
 * 原则："CLI 算事实注入"——git 事实算出本变更触及模块的文档欠账，注入 Wave prompt 的是
 * 结论不是要求（advisory 不阻断，无债零输出，D-005）。
 *
 * 归属三级（D-003）：module.paths || module.core_files（读端口径同 prompt.js loadModuleContextIndex）
 *   → 模块卡 doc 内容中的文件路径字面量（v1 map 兼容）→ 未匹配归 unmapped。
 * behind 口径（D-004）：每模块两次 git log -1 --format="%h %ct" 取时间戳判方向，
 *   behind = rev-list --count docCommit..srcCommit；untracked 卡 behind=null 显式"卡片从未提交"；
 *   git 失败/超时 5s → 该模块 behind=null + 降级注记，不抛。
 */
import { existsSync, readFileSync, readdirSync, realpathSync } from 'node:fs'
import { join, relative } from 'node:path'
import { safeGit } from './git-helper.js'
import { parseModuleMapSimple } from './modules.js'
import { runDocsCheck, readDocsCheckConfig } from './docs-check.js'

/** safeGit 超时（大仓 git log 慢时降级该模块，不挂起 Wave 渲染） */
const GIT_TIMEOUT_MS = 5000

/** realpath 归一（失败回退原值——路径不可及时保持调用方原有行为） */
function realpathSafe(p) {
  try { return realpathSync(p) } catch { return p }
}

/**
 * 纯函数：把 changedFiles 归属到模块。
 * @param {string[]} changedFiles 变更文件（POSIX 相对路径）
 * @param {object} moduleIndex parseModuleMapSimple 返回值（{ modules: { id: { paths?, core_files?, doc? } } }）
 * @param {{ cardsDir: string }} opts cardsDir = <specBase>/docs/<project>/modules
 * @returns {{ byModule: Map<string, { doc: string, files: string[] }>, unmapped: string[] }}
 */
export function matchFilesToModules(changedFiles, moduleIndex, opts = {}) {
  const byModule = new Map()
  const unmapped = []
  // parseModuleMapSimple 返回扁平模块对象（{ id: {paths?, core_files?, doc?} }，无 .modules 包层）
  const modules = moduleIndex && !moduleIndex.modules ? moduleIndex : (moduleIndex?.modules || {})
  const cardsDir = opts.cardsDir

  // 模块 → 候选路径集合（一级：paths || core_files；同时预载卡片内容供二级）
  const modulePaths = new Map() // moduleId → string[]
  const cardContents = new Map() // moduleId → string
  for (const [id, m] of Object.entries(modules)) {
    const ps = [...(Array.isArray(m.paths) ? m.paths : []), ...(Array.isArray(m.core_files) ? m.core_files : [])]
    modulePaths.set(id, ps)
    if (cardsDir && m.doc) {
      const cardPath = join(cardsDir, m.doc.replace(/^modules\//, ''))
      if (existsSync(cardPath)) {
        try { cardContents.set(id, readFileSync(cardPath, 'utf8')) } catch { /* 降级二级 */ }
      }
    }
  }

  for (const f of changedFiles) {
    let matched = null
    // 一级：paths/core_files 前缀或字面量命中
    for (const [id, ps] of modulePaths) {
      if (ps.some(p => p === f || f.startsWith(p.replace(/\/$/, '') + '/') || p.startsWith(f.split('/')[0] + '/') && p === f)) {
        matched = id; break
      }
    }
    // 二级：卡片 doc 内容中的文件路径字面量（精确子串）
    if (!matched) {
      for (const [id, content] of cardContents) {
        if (content && content.includes(f)) { matched = id; break }
      }
    }
    // 二级b：裸文件名匹配——卡片引用习惯是裸名（`execute.js` 而非 `src/stages/execute.js`，
    // 本仓 stages.md 实证），全路径 includes 对这类卡永远落空 → 归属 unmapped（假"无归属"）。
    // 规则：基名在卡内存在"独立出现"（两侧均非路径/标识符字符），防 a.js 误配 xa.js.txt 等。
    // 全路径命中（上面循环）优先，裸名仅在未命中时兜底。
    if (!matched) {
      const base = f.slice(f.lastIndexOf('/') + 1)
      if (base && !base.startsWith('.')) {
        outer: for (const [id, content] of cardContents) {
          if (!content) continue
          let pos = content.indexOf(base)
          while (pos !== -1) {
            const before = pos > 0 ? content[pos - 1] : ''
            const after = content[pos + base.length] || ''
            const beforeOk = before === '' || !/[A-Za-z0-9_\/.\-]/.test(before)
            const afterOk = after === '' || !/[A-Za-z0-9_\-./]/.test(after)
            if (beforeOk && afterOk) { matched = id; break outer }
            pos = content.indexOf(base, pos + 1)
          }
        }
      }
    }
    if (!matched) { unmapped.push(f); continue }
    const entry = byModule.get(matched) || { doc: modules[matched].doc || '', files: [] }
    entry.files.push(f)
    byModule.set(matched, entry)
  }
  return { byModule, unmapped }
}

/** "h ct" 输出解析（git log -1 --format=%h %ct 的单行值）→ { h, ct }；空输出 → null。
 *  刻意不额外校验 ct 可析性——与 moduleDebt 原内联解析逐字等价（含畸形输出 NaN ct 形态），
 *  保证公共抽取零行为漂移。 */
function parseHct(out) {
  if (!out || !out.trim()) return null
  const [h, ct] = out.trim().split(' ')
  return { h, ct: parseInt(ct, 10) }
}

/** behind 公共口径（D-004；2026-08-23-adopt-harness-practices task-05 抽公共实现）：双 commit
 *  时间戳判方向 + rev-list 计数。src.ct >= ref.ct → rev-list --count ref..src（git 失败 →
 *  behind=null + degraded=true，不抛）；src 时间戳落后 ref → behind=0。ct 相等也进对账
 *  （同一秒内的提交——测试/快速序列场景），由 rev-list count 分晓。
 *  moduleDebt 与 computeModuleBehind 共用——behind 口径单一真相源。 */
function behindWithDirection(gitRoot, srcCommit, refCommit) {
  if (srcCommit.ct >= refCommit.ct) {
    const cnt = safeGit(gitRoot, ['rev-list', '--count', `${refCommit.h}..${srcCommit.h}`], { timeout: GIT_TIMEOUT_MS })
    const behind = cnt.error ? null : parseInt(cnt.value, 10)
    return { behind, degraded: behind === null }
  }
  return { behind: 0, degraded: false }
}

/** 单模块欠账：双 commit 时间戳判方向 + rev-list 计数（复用 parseHct/behindWithDirection 公共
 * 实现，抽取前后逐字等价，C-10）。全失败 → behind null + 注记。
 * docGitPath：模块卡的 git 相对路径（specBase 相对 projectRoot 换算——specBase 在项目内时
 * 是 .sillyspec/docs/<p>/modules/<id>.md；平台模式 specBase 在仓外时卡片不在 git 内 →
 * docLog 恒失败 → 走"从未提交"形态，如实呈现）。 */
function moduleDebt(projectRoot, moduleId, entry, docGitPath, docGitRoot) {
  const notes = []
  const srcPaths = entry.files
  const srcLog = safeGit(projectRoot, ['log', '-1', '--format=%h %ct', '--', ...srcPaths], { timeout: GIT_TIMEOUT_MS })
  let behind = null
  let srcCommit = null
  let docCommit = null
  let neverCommitted = false
  srcCommit = (!srcLog.error && srcLog.value) ? parseHct(srcLog.value) : null
  if (!srcCommit) notes.push('源码 commit 历史不可得（新文件或 git 失败）')
  if (docGitPath) {
    // 卡片历史在卡片所在 git 仓查（docGitRoot；linked worktree 场景 = 主仓根），
    // 源码历史在 projectRoot 查——两侧 commit 同属一个仓库历史可 rev-list 对账
    const docGitCwd = docGitRoot || projectRoot
    const docLog = safeGit(docGitCwd, ['log', '-1', '--format=%h %ct', '--', docGitPath], { timeout: GIT_TIMEOUT_MS })
    docCommit = (!docLog.error && docLog.value) ? parseHct(docLog.value) : null
    if (!docCommit) neverCommitted = true
  }
  if (srcCommit && !docCommit) {
    // 有源码历史但卡片从未提交 → 欠账最重形态
    return { module: moduleId, ...entry, srcCommit: srcCommit.h, docCommit: null, behind: null, neverCommitted: true, notes }
  }
  if (srcCommit && docCommit) {
    behind = behindWithDirection(docGitRoot || projectRoot, srcCommit, docCommit).behind
    if (behind === null) notes.push('rev-list 失败降级')
  }
  return { module: moduleId, ...entry, srcCommit: srcCommit?.h || null, docCommit: docCommit?.h || null, behind, neverCommitted, notes }
}

/**
 * 公共导出（C-10，2026-08-23-adopt-harness-practices task-05）：模块源码在参考 commit 后的
 * 前进数（behind）。口径同 moduleDebt（D-004：双 commit 时间戳判方向 + rev-list 计数，复用
 * behindWithDirection；git 失败/输入缺失 → behind=null + degraded=true，不抛）。
 * 消费方：docs-check 决策规则 behind 复核（决策锚定模块源码在「最近确认」commit 后的前进数）。
 * 不改 moduleDebt 对外行为与既有返回结构（computeDocsDebt / matchFilesToModules 输出不变）。
 * @param {string} moduleId 模块 id（_module-map.yaml 键；决策规则里 = 条目所在域文件名）
 * @param {string} lastConfirmedCommit 参考 commit（决策「最近确认」hash；空/「未记录」/非 hash 串 → degraded）
 * @param {{ projectRoot?: string, srcPaths?: string[], moduleIndex?: object }} [opts]
 *   projectRoot git 锚（缺省 process.cwd()）；srcPaths 显式源码路径集（优先）；
 *   moduleIndex _module-map 解析结果（平铺或 {modules} 包裹均可，取该模块 paths∪core_files 兜底）
 * @returns {{ behind: number|null, degraded: boolean }} degraded=true = behind 不可得
 *   （路径集为空 / 参考 commit 不可解析 / git 失败），调用方降级呈现不阻断
 */
export function computeModuleBehind(moduleId, lastConfirmedCommit, opts = {}) {
  const projectRoot = opts.projectRoot || process.cwd()
  let srcPaths = Array.isArray(opts.srcPaths) ? opts.srcPaths.filter(Boolean).map(p => String(p)) : null
  if ((!srcPaths || srcPaths.length === 0) && opts.moduleIndex) {
    const flat = opts.moduleIndex.modules ? opts.moduleIndex.modules : opts.moduleIndex
    const m = flat && typeof flat === 'object' ? flat[moduleId] : null
    if (m) srcPaths = [...(Array.isArray(m.paths) ? m.paths : []), ...(Array.isArray(m.core_files) ? m.core_files : [])]
  }
  if (!srcPaths || srcPaths.length === 0) return { behind: null, degraded: true }
  const ref = String(lastConfirmedCommit || '').trim()
  if (!/^[0-9a-f]{4,40}$/i.test(ref)) return { behind: null, degraded: true }
  const srcCommit = parseHct(safeGit(projectRoot, ['log', '-1', '--format=%h %ct', '--', ...srcPaths], { timeout: GIT_TIMEOUT_MS }).value)
  const refCommit = parseHct(safeGit(projectRoot, ['log', '-1', '--format=%h %ct', ref], { timeout: GIT_TIMEOUT_MS }).value)
  if (!srcCommit || !refCommit) return { behind: null, degraded: true }
  return behindWithDirection(projectRoot, srcCommit, refCommit)
}

/**
 * IO 入口：算模块文档欠账事实。
 * @param {{ projectRoot: string, specBase: string, projectName: string, changedFiles: string[] }} opts
 *   projectRoot：git 锚（worktree 根或 cwd）；specBase/projectName：module-map 与卡片定位
 * @returns {{ ok: boolean, facts: string, entries: object[], unmapped: string[] }}
 *   ok=false = 归属数据缺失（map 不存在/解析空）→ facts 为单行说明
 *   facts 空 = 无债（调用方零输出）
 */
export function computeDocsDebt(opts) {
  const { projectRoot, specBase, projectName, changedFiles = [] } = opts || {}
  const cardsDir = specBase && projectName ? join(specBase, 'docs', projectName, 'modules') : null
  const mapPath = cardsDir ? join(cardsDir, '_module-map.yaml') : null
  if (!mapPath || !existsSync(mapPath)) {
    return { ok: false, facts: '[docs-debt] 无 _module-map.yaml，模块归属数据缺失（跑 sillyspec modules rebuild 生成）', entries: [], unmapped: changedFiles }
  }
  let moduleIndex
  try {
    moduleIndex = parseModuleMapSimple(readFileSync(mapPath, 'utf8'))
  } catch (e) {
    return { ok: false, facts: `[docs-debt] module-map 解析失败（${e.message}），跳过欠账计算`, entries: [], unmapped: changedFiles }
  }
  if (!moduleIndex || Object.keys(moduleIndex.modules ? moduleIndex.modules : moduleIndex).length === 0) {
    return { ok: false, facts: '[docs-debt] module-map 解析为空（0 模块），归属数据缺失', entries: [], unmapped: changedFiles }
  }
  const { byModule, unmapped } = matchFilesToModules(changedFiles, moduleIndex, { cardsDir })
  if (byModule.size === 0) {
    return { ok: true, facts: '', entries: [], unmapped }
  }
  const entries = []
  // doc 的 git 锚定（execute 审查 FAIL-1 修复）：卡片查询按 specBase 所在 git 仓根算相对路径，
  // 不按 projectRoot——dogfood execute 场景 projectRoot=worktree 而 specBase=主仓/.sillyspec，
  // linked worktree 共享 git 历史，git -C <worktree> log -- <主仓相对路径> 查得到卡片真实历史；
  // 若按 projectRoot relative 判 null 会把"卡片在主仓 git 内"误报为"从未提交"（假事实）。
  // 平台模式 specRoot 在仓外（git -C specBase 失败/无 git）→ docGitPath=null 走"从未提交"如实呈现。
  let docGitRoot = null
  let docPathPrefix = null
  try {
    const specTop = safeGit(specBase, ['rev-parse', '--show-toplevel'], { timeout: GIT_TIMEOUT_MS })
    if (!specTop.error && specTop.value) {
      docGitRoot = specTop.value.trim()
      // macOS 坑：git 返回 realpath（/var → /private/var 的 symlink 解析），cardsDir 可能是
      // symlink 形态（tmpdir/用户项目路径经符号链接）——两侧不归一时 relative() 产出 ../..
      // 前缀 → 卡片被误判"从未提交"（假账）。两侧 realpathSync 归一后再算（失败回退原值）。
      const rel = relative(realpathSafe(docGitRoot), realpathSafe(cardsDir))
      if (rel && !rel.startsWith('..')) docPathPrefix = rel.replace(/\\/g, '/')
    }
  } catch { /* 保持 null */ }
  for (const [id, entry] of byModule) {
    const docGitPath = docPathPrefix && entry.doc ? `${docPathPrefix}/${entry.doc.replace(/^modules\//, '')}` : null
    entries.push(moduleDebt(projectRoot, id, entry, docGitPath, docGitPath ? docGitRoot : null))
  }
  // 只报欠账（behind>0 / neverCommitted / behind=null 降级注记）；behind=0 不出（无债零输出）
  const debtEntries = entries.filter(e => e.neverCommitted || (e.behind !== null && e.behind > 0) || (e.behind === null && !e.neverCommitted))
  if (debtEntries.length === 0) return { ok: true, facts: '', entries, unmapped }
  const lines = ['[docs-debt] 本变更已触及以下模块（CLI 算，diff × _module-map.yaml，累计）：']
  for (const e of debtEntries) {
    if (e.neverCommitted) {
      lines.push(`  - ${e.module}：模块卡 ${e.doc} 从未提交（欠账最重）`)
    } else if (e.behind === null) {
      lines.push(`  - ${e.module}：欠账数不可得（${(e.notes || []).join('；') || 'git 降级'}）`)
    } else {
      lines.push(`  - ${e.module}：源码 ${e.behind} commit 未同步卡（卡停 ${e.docCommit}，源码到 ${e.srcCommit}）`)
    }
    // O-2（docs-signals-o12）：内联卡片失效引用 + 建议行号——agent 从"知道欠账"到"知道改哪行"。
    // 守卫 docGitPath && docGitRoot（D-004 同锚；平台模式仓外跳过）；每模块上限 3 条（D-002）；
    // 异常整块降级跳过（advisory 链不因增强而脆）。
    const inline = inlineCardInvalidRefs(e, docGitRoot, docPathPrefix)
    if (inline) lines.push(inline)
    lines.push(`    涉及文件：${e.files.join(', ')}`)
  }
  return { ok: true, facts: lines.join('\n'), entries, unmapped }
}

/** O-2：欠账模块卡片的失效引用内联行（docs check 层1 单文档）。无失效/不可跑 → null。 */
function inlineCardInvalidRefs(entry, docGitRoot, docPathPrefix) {
  if (!docGitRoot || !docPathPrefix || !entry.doc) return null
  try {
    const docGitPath = `${docPathPrefix}/${entry.doc.replace(/^modules\//, '')}`
    // HUB-06：补传 crossRepoRoots（与 docs gate 同口径），repo:// 跨仓引用不再恒跳过；
    // 配置读取失败（无 local.yaml 段等）→ 不启用跨仓，与原行为一致
    let crossRepoRoots
    try { crossRepoRoots = readDocsCheckConfig(docGitRoot)?.crossRepoRoots } catch { crossRepoRoots = undefined }
    const check = runDocsCheck({ projectRoot: docGitRoot, docs: [docGitPath], crossRepoRoots })
    if (check.ok || !Array.isArray(check.invalid) || check.invalid.length === 0) return null
    const parts = check.invalid.slice(0, 3).map((inv) => {
      const sug = Array.isArray(inv.suggest) && inv.suggest.length > 0 ? `→建议 L${inv.suggest.join('/L')}` : ''
      return `${inv.ref || inv.doc}${sug}`
    })
    const more = check.invalid.length > 3 ? ` · 等 ${check.invalid.length} 处` : ''
    return `    卡内失效引用 ${check.invalid.length} 处：${parts.join(' · ')}${more}`
  } catch {
    return null
  }
}
