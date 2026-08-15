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
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join, relative } from 'node:path'
import { safeGit } from './git-helper.js'
import { parseModuleMapSimple } from './modules.js'

/** safeGit 超时（大仓 git log 慢时降级该模块，不挂起 Wave 渲染） */
const GIT_TIMEOUT_MS = 5000

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
    if (!matched) { unmapped.push(f); continue }
    const entry = byModule.get(matched) || { doc: modules[matched].doc || '', files: [] }
    entry.files.push(f)
    byModule.set(matched, entry)
  }
  return { byModule, unmapped }
}

/** 单模块欠账：双 commit 时间戳判方向 + rev-list 计数。全失败 → behind null + 注记。
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
  if (!srcLog.error && srcLog.value && srcLog.value.trim()) {
    const [h, ct] = srcLog.value.trim().split(' ')
    srcCommit = { h, ct: parseInt(ct, 10) }
  } else {
    notes.push('源码 commit 历史不可得（新文件或 git 失败）')
  }
  if (docGitPath) {
    // 卡片历史在卡片所在 git 仓查（docGitRoot；linked worktree 场景 = 主仓根），
    // 源码历史在 projectRoot 查——两侧 commit 同属一个仓库历史可 rev-list 对账
    const docGitCwd = docGitRoot || projectRoot
    const docLog = safeGit(docGitCwd, ['log', '-1', '--format=%h %ct', '--', docGitPath], { timeout: GIT_TIMEOUT_MS })
    if (!docLog.error && docLog.value && docLog.value.trim()) {
      const [h, ct] = docLog.value.trim().split(' ')
      docCommit = { h, ct: parseInt(ct, 10) }
    } else {
      neverCommitted = true
    }
  }
  if (srcCommit && !docCommit) {
    // 有源码历史但卡片从未提交 → 欠账最重形态
    return { module: moduleId, ...entry, srcCommit: srcCommit.h, docCommit: null, behind: null, neverCommitted: true, notes }
  }
  if (srcCommit && docCommit) {
    // ct 相等也进对账（同一秒内的提交——测试/快速序列场景），由 rev-list count 分晓
    if (srcCommit.ct >= docCommit.ct) {
      const cnt = safeGit(docGitRoot || projectRoot, ['rev-list', '--count', `${docCommit.h}..${srcCommit.h}`], { timeout: GIT_TIMEOUT_MS })
      behind = cnt.error ? null : parseInt(cnt.value, 10)
      if (behind === null) notes.push('rev-list 失败降级')
    } else {
      return { module: moduleId, ...entry, srcCommit: srcCommit.h, docCommit: docCommit.h, behind: 0, neverCommitted: false, notes }
    }
  }
  return { module: moduleId, ...entry, srcCommit: srcCommit?.h || null, docCommit: docCommit?.h || null, behind, neverCommitted, notes }
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
      const rel = relative(docGitRoot, cardsDir)
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
    lines.push(`    涉及文件：${e.files.join(', ')}`)
  }
  return { ok: true, facts: lines.join('\n'), entries, unmapped }
}
