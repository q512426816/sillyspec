/**
 * sillyspec push — 推送前压扁本地未推送提交（2026-10-23-push-squash）
 *
 * 定位：客户反馈每 task 一笔、归档两笔、merge 兜底带入 worktree 全量历史，远端提交过密。
 * 本模块提供显式命令：以目标远端分支为 base，只处理 `base..HEAD` 的本地未推送段；默认按
 * “连续且归属同一变更”的提交段分组，压成按变更一笔；`--mode one` 合并为一个大提交；
 * 然后普通快进 push。禁止 pre-push hook 静默改写、禁止改写已推送历史、禁止 force-push。
 *
 * 核心安全不变量：
 *   ① 新 tip 树 == 旧 HEAD 树（commit-tree 取段末树），index/工作区/暂存区零变化；
 *   ② base 必须是 HEAD 祖先，且区间内不得含任何 remote-tracking ref 可达的提交；
 *   ③ pre/post 备份 ref + CAS update-ref + 文件锁，并发/中断可恢复；
 *   ④ SillySpec 活锚点（scan source_commit / active baseline / change-patch / worktree meta）
 *      抬升 effectiveBase，保证压扁后旧锚点仍是新 HEAD 祖先；
 *   ⑤ by-change 合成 subject 带 `(<变更名>)`，body 保留全部原始消息与 task-NN 证据 token。
 *
 * 本模块不直接 console；人类输出由调用方（index.js）渲染，便于 --json 保持 stdout 纯净。
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { git, safeGit, gitQuiet } from './git-helper.js'

const PUSH_MODES = ['by-change', 'one', 'none']
const GIT_TIMEOUT = 30000
const PUSH_TIMEOUT = 600000
const MAX_MESSAGE_BYTES = 200000
const PLUMBING_RE = /^sillyspec:/

export const PUSH_USAGE = `用法: sillyspec push [--mode by-change|one|none] [--change <名>] [--dry-run] [--no-push]
                     [--undo] [--base <ref>] [--remote <名>] [--branch <名>] [--json]

推送前压扁当前分支相对目标远端的本地未推送提交，然后快进推送。
  --mode by-change  默认：连续且归属同一变更的提交压成一笔；无归属提交原样保留
  --mode one        全部未推送提交合并为一个大提交（需 --change；有活跃变更时拒绝）
  --mode none       只推送，不压扁
  --dry-run         只打印计划，不建备份 ref、不改写、不推送
  --no-push         只压扁，不推送
  --undo            恢复最近一次压扁前的本地分支（远端已更新时拒绝）
  --base <ref>      显式指定压扁基线（默认取目标远端分支）
  --remote <名>     目标远端（默认 branch.<分支>.pushRemote/remote，再退 origin）
  --branch <名>     只作断言：必须等于当前 checkout 分支
  --json            机器可读输出`

// ─────────────────────────────────────────────────────────────────────────────
// 纯函数：参数解析 / 归属识别 / 分组 / 消息 / 计划渲染
// ─────────────────────────────────────────────────────────────────────────────

function escapeRegExp(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function normalizeText(s) {
  return String(s == null ? '' : s).replace(/\r\n/g, '\n')
}

function splitLines(s) {
  return String(s == null ? '' : s).split('\n').map((x) => x.trim()).filter(Boolean)
}

/**
 * 解析 push 参数（纯函数）。未知 flag/位置参数/互斥组合一律 fail-closed。
 * @param {string[]} argv 命令后的参数（不含 `push` 本身；--json 已由全局层剥离）
 * @returns {{ok:true,options:object}|{ok:false,errors:string[]}}
 */
export function parsePushArgs(argv = []) {
  const options = {
    mode: 'by-change', change: null, dryRun: false, noPush: false, undo: false,
    base: null, remote: null, branch: null, help: false, json: false,
  }
  const errors = []
  const valueFlags = new Set(['--mode', '--change', '--base', '--remote', '--branch'])
  const boolFlags = new Set(['--dry-run', '--no-push', '--undo', '--help', '-h', '--json'])
  for (let i = 0; i < argv.length; i++) {
    const a = String(argv[i])
    if (a === '--') { errors.push('push 不接受位置参数或 pathspec（只操作当前分支的未推送提交）'); break }
    let key = a
    let inlineValue = null
    if (a.startsWith('--') && a.includes('=')) {
      key = a.slice(0, a.indexOf('='))
      inlineValue = a.slice(a.indexOf('=') + 1)
    }
    if (boolFlags.has(key)) {
      if (inlineValue !== null) { errors.push(`${key} 不接受值`); continue }
      if (key === '--help' || key === '-h') options.help = true
      else if (key === '--dry-run') options.dryRun = true
      else if (key === '--no-push') options.noPush = true
      else if (key === '--undo') options.undo = true
      else if (key === '--json') options.json = true
      continue
    }
    if (valueFlags.has(key)) {
      const v = inlineValue !== null ? inlineValue : argv[i + 1]
      if (v == null || String(v).startsWith('--') || String(v).trim() === '') {
        errors.push(`${key} 缺少值`)
        continue
      }
      if (inlineValue === null) i++
      if (key === '--mode') options.mode = String(v)
      else if (key === '--change') options.change = String(v)
      else if (key === '--base') options.base = String(v)
      else if (key === '--remote') options.remote = String(v)
      else if (key === '--branch') options.branch = String(v)
      continue
    }
    if (a.startsWith('-')) { errors.push(`未知参数: ${a}`); continue }
    errors.push(`不接受位置参数: ${a}`)
  }
  if (!PUSH_MODES.includes(options.mode)) errors.push(`--mode 非法：${options.mode}（应为 ${PUSH_MODES.join('|')}）`)
  if (options.mode === 'one' && !options.change) errors.push('--mode one 必须带 --change <名>（明确归属）')
  if (options.change != null && options.mode !== 'one') errors.push('--change 仅用于 --mode one')
  if (options.undo) {
    for (const k of ['mode', 'change', 'base']) {
      const def = k === 'mode' ? 'by-change' : null
      if (options[k] !== def) errors.push(`--undo 不能与 --${k} 同用`)
    }
    if (options.dryRun) errors.push('--undo 不能与 --dry-run 同用')
    if (options.noPush) errors.push('--undo 不能与 --no-push 同用')
  }
  if (options.mode === 'none' && options.noPush) errors.push('--mode none 已不压扁，不能与 --no-push 同用')
  if (errors.length) return { ok: false, errors }
  return { ok: true, options }
}

/**
 * 从 subject 识别变更归属。只认已知变更名（附日期前缀）与括号锚，避免把正文/文件名误判。
 * 多个候选 = 歧义 → null（按无归属处理，不猜）。
 * @param {string} subject
 * @param {string[]} knownChanges
 * @returns {string|null}
 */
export function detectChangeOwner(subject, knownChanges = []) {
  const s = normalizeText(subject)
  const hits = new Set()
  for (const m of s.matchAll(/(?:^|[^\w.-])(\d{4}-\d{2}-\d{2}-[A-Za-z0-9._-]+)(?=$|[^\w.-])/g)) hits.add(m[1])
  const sorted = [...knownChanges].filter(Boolean).sort((a, b) => b.length - a.length)
  for (const name of sorted) {
    const re = new RegExp(`(^|[^A-Za-z0-9._-])${escapeRegExp(name)}([^A-Za-z0-9._-]|$)`)
    if (re.test(s)) hits.add(name)
  }
  return hits.size === 1 ? [...hits][0] : null
}

/** plumbing 提交（worktree baseline/WIP/align）无变更名时，贴到相邻归属段；不跨裸提交猜测。 */
function attachPlumbingOwners(commits) {
  for (let i = 0; i < commits.length; i++) {
    const c = commits[i]
    if (c.owner || !PLUMBING_RE.test(c.subject)) continue
    for (let j = i - 1; j >= 0; j--) {
      if (commits[j].owner) { c.owner = commits[j].owner; break }
    }
    if (c.owner) continue
    for (let j = i + 1; j < commits.length; j++) {
      if (commits[j].owner) { c.owner = commits[j].owner; break }
    }
  }
}

/**
 * 合成压扁提交消息：subject 带 `(<owner>)`，body 保留原始 subject 清单 + 原始正文；
 * 原始消息里的 task-NN token 必须全部保留（缺失时追加 Task-Evidence 行）。
 */
export function buildSquashMessage({ commits, owner, mode = 'by-change' }) {
  const list = Array.isArray(commits) ? commits : []
  if (list.length === 0) throw new Error('buildSquashMessage: commits 为空')
  const last = list[list.length - 1]
  const meaningful = list.filter((c) => !PLUMBING_RE.test(c.subject))
  const baseSubject = normalizeText((meaningful[0] || last).subject).trim() || 'chore: squash local commits'
  const name = owner || null
  let subject = baseSubject
  if (name) {
    const anchored = new RegExp(`[（(]\\s*${escapeRegExp(name)}\\s*[）)]`).test(subject)
    if (!anchored) {
      if (/^chore\(archive\):/.test(subject) && subject.includes(name)) {
        subject = `chore(archive): 归档留档 (${name})`
      } else {
        subject = `${subject} (${name})`
      }
    }
  }
  const summary = [`Squashed ${list.length} commits (${list[0].sha.slice(0, 7)}..${last.sha.slice(0, 7)}):`]
  for (const c of list) summary.push(`- ${c.sha.slice(0, 7)} ${normalizeText(c.subject).trim()}`)
  const bodies = list.map((c) => normalizeText(c.body).trim()).filter(Boolean)
  let msg = `${subject}\n\n${summary.join('\n')}\n`
  if (bodies.length > 0) {
    msg += '\nOriginal commit bodies:\n'
    for (let i = 0; i < bodies.length; i++) {
      if (i > 0) msg += '\n---\n'
      msg += bodies[i] + '\n'
    }
  }
  const allText = list.map((c) => `${c.subject}\n${c.body}`).join('\n')
  const tokens = [...new Set([...allText.matchAll(/\btask-\d{1,4}\b/g)].map((m) => m[0]))]
  const missing = tokens.filter((t) => !msg.includes(t))
  if (missing.length > 0) msg += `\nTask-Evidence: ${missing.join(' ')}\n`
  if (Buffer.byteLength(msg, 'utf8') > MAX_MESSAGE_BYTES) {
    // 超大段只保留 subject 清单 + 全部证据 token，避免提交信息无上限膨胀；
    // 原始正文仍可通过备份 ref 的旧提交追溯。
    const compact = [`${subject}`, '', ...summary, '', `Task-Evidence: ${tokens.join(' ')}`].join('\n') + '\n'
    msg = Buffer.byteLength(compact, 'utf8') <= MAX_MESSAGE_BYTES ? compact : compact.slice(0, MAX_MESSAGE_BYTES)
  }
  return msg
}

/**
 * 提交分组（纯函数）。by-change 只合并连续同归属段；one 全段一笔；none 不压扁。
 * @param {{commits:Array, mode:string, changeName?:string|null, knownChanges?:string[]}} p
 * @returns {{ok:true,groups:Array,needsRewrite:boolean,warnings:string[]}|{ok:false,error:string}}
 */
export function classifyCommits({ commits, mode = 'by-change', changeName = null, knownChanges = [] }) {
  const list = (Array.isArray(commits) ? commits : []).map((c) => ({ ...c }))
  if (mode === 'none') return { ok: true, groups: [], needsRewrite: false, warnings: [] }
  if (list.length === 0) return { ok: true, groups: [], needsRewrite: false, warnings: [] }
  for (const c of list) {
    if (c.owner === undefined) c.owner = detectChangeOwner(c.subject, knownChanges)
  }
  attachPlumbingOwners(list)
  const warnings = []
  if (mode === 'one') {
    const foreign = list.filter((c) => c.owner && c.owner !== changeName)
    if (foreign.length > 0) {
      return { ok: false, error: `--mode one 区间含其他变更提交（${[...new Set(foreign.map((c) => c.owner))].join('、')}）——请用默认 by-change 或先拆分提交` }
    }
    const group = { owner: changeName, commits: list, tree: list[list.length - 1].tree, action: 'squash' }
    group.message = list.length > 1 ? buildSquashMessage({ commits: list, owner: changeName, mode }) : list[0].message
    group.subject = list.length > 1 ? group.message.split('\n')[0] : list[0].subject
    return { ok: true, groups: [group], needsRewrite: list.length > 1, warnings }
  }
  const groups = []
  for (const c of list) {
    const last = groups[groups.length - 1]
    if (c.owner && last && last.owner === c.owner) last.commits.push(c)
    else groups.push({ owner: c.owner, commits: [c] })
  }
  // 无归属的连续提交不合并（FR-02：原样保留为独立提交）
  const expanded = []
  for (const g of groups) {
    if (!g.owner && g.commits.length > 1) {
      for (const c of g.commits) expanded.push({ owner: null, commits: [c] })
    } else expanded.push(g)
  }
  for (const g of expanded) {
    g.tree = g.commits[g.commits.length - 1].tree
    if (g.commits.length > 1) {
      g.action = 'squash'
      g.message = buildSquashMessage({ commits: g.commits, owner: g.owner, mode })
      g.subject = g.message.split('\n')[0]
    } else {
      g.action = 'keep'
      g.message = g.commits[0].message
      g.subject = g.commits[0].subject
    }
  }
  if (expanded.some((g) => g.action === 'squash' && !g.owner)) {
    warnings.push('存在无变更归属的多提交段——已按单提交保留，未压扁')
  }
  return { ok: true, groups: expanded, needsRewrite: expanded.some((g) => g.action === 'squash'), warnings }
}

/** 人类可读计划行。纯函数，不打印。 */
export function renderPushPlan({ plan, dryRun = false } = {}) {
  const lines = []
  const short = (s) => String(s || '').slice(0, 10)
  lines.push(`📦 sillyspec push 计划（mode=${plan.mode}，branch=${plan.ctx?.branch || '?'}，remote=${plan.target?.remote || '?'}/${plan.target?.remoteBranch || '?'}）`)
  lines.push(`   HEAD ${short(plan.ctx?.head)}，base ${short(plan.effectiveBase)}${plan.baseRaised ? `（已从 ${short(plan.base)} 抬升）` : ''}；未推送提交 ${plan.commits.length} 个，分 ${plan.groups.length} 段`)
  for (const g of plan.groups) {
    const old = g.commits.length === 1 ? short(g.commits[0].sha) : `${short(g.commits[0].sha)}..${short(g.commits[g.commits.length - 1].sha)}`
    const owner = g.owner || '（无变更归属）'
    const action = g.action === 'squash' ? `压扁 ${g.commits.length} 笔` : '保留'
    lines.push(`   - [${owner}] ${old} → ${action}：${g.subject}`)
  }
  if (!plan.needsRewrite) lines.push('   无需压扁，直接推送当前历史')
  for (const w of plan.warnings || []) lines.push(`   ⚠️ ${w}`)
  if (dryRun) lines.push('   仅预览：未建备份 ref、未改写、未推送')
  return lines
}

// ─────────────────────────────────────────────────────────────────────────────
// IO：仓库/目标/锚点/提交读取
// ─────────────────────────────────────────────────────────────────────────────

function resolveRepoContext({ cwd = process.cwd() } = {}) {
  const top = safeGit(cwd, ['rev-parse', '--show-toplevel'])
  if (top.error || !top.value) return { ok: false, error: `当前目录不是 git 仓库：${top.error || '无输出'}` }
  const repoRoot = top.value.trim()
  const gd = safeGit(repoRoot, ['rev-parse', '--git-dir'])
  const gcd = safeGit(repoRoot, ['rev-parse', '--git-common-dir'])
  if (gd.error || gcd.error) return { ok: false, error: 'git rev-parse --git-dir/--git-common-dir 失败' }
  const gitDir = resolve(repoRoot, gd.value.trim())
  const commonDir = resolve(repoRoot, gcd.value.trim())
  const headRes = safeGit(repoRoot, ['rev-parse', 'HEAD'])
  if (headRes.error || !headRes.value) return { ok: false, error: '仓库尚无 HEAD（空仓）——先提交再压扁' }
  const head = headRes.value.trim()
  const branchRes = safeGit(repoRoot, ['symbolic-ref', '--short', '-q', 'HEAD'])
  const detached = !!branchRes.error || !branchRes.value
  const branch = detached ? null : branchRes.value.trim()
  const shallow = gitQuiet(repoRoot, ['rev-parse', '--is-shallow-repository']) === 'true'
  const inProgress = []
  for (const marker of ['MERGE_HEAD', 'CHERRY_PICK_HEAD', 'REVERT_HEAD', 'BISECT_LOG', 'rebase-merge', 'rebase-apply']) {
    const p = gitQuiet(repoRoot, ['rev-parse', '--git-path', marker])
    if (p && existsSync(resolve(repoRoot, p))) inProgress.push(marker)
  }
  return { ok: true, repoRoot, gitDir, commonDir, head, branch, detached, shallow, inProgress }
}

function resolvePushTarget({ repoRoot, branch, remote = null, remoteBranch = null }) {
  if (!branch) return { ok: false, error: 'detached HEAD 无分支——先 git switch <分支>' }
  const r = remote
    || gitQuiet(repoRoot, ['config', '--get', `branch.${branch}.pushRemote`])
    || gitQuiet(repoRoot, ['config', '--get', `branch.${branch}.remote`])
    || 'origin'
  let rb = remoteBranch
  if (!rb) {
    const merge = gitQuiet(repoRoot, ['config', '--get', `branch.${branch}.merge`])
    if (merge && merge.startsWith('refs/heads/')) rb = merge.slice('refs/heads/'.length)
  }
  rb = rb || branch
  const url = gitQuiet(repoRoot, ['remote', 'get-url', r])
  if (!url) return { ok: false, error: `远端不存在或不可达：${r}（git remote get-url 失败）` }
  return { ok: true, remote: r, remoteBranch: rb, remoteRef: `refs/remotes/${r}/${rb}` }
}

function lsRemoteTip(repoRoot, remote, remoteBranch) {
  const out = gitQuiet(repoRoot, ['ls-remote', '--heads', remote, `refs/heads/${remoteBranch}`], { timeout: 60000 })
  const line = String(out == null ? '' : out).split('\n').map((x) => x.trim()).find(Boolean)
  return line ? line.split(/\s+/)[0] : null
}

function revParseCommit(repoRoot, ref) {
  if (!ref) return null
  const r = safeGit(repoRoot, ['rev-parse', '--verify', '--quiet', `${ref}^{commit}`])
  return r.error || !r.value ? null : r.value.trim()
}

function revParseTree(repoRoot, ref) {
  if (!ref) return null
  const r = safeGit(repoRoot, ['rev-parse', '--verify', '--quiet', `${ref}^{tree}`])
  return r.error || !r.value ? null : r.value.trim()
}

function isAncestor(repoRoot, a, b) {
  if (!a || !b) return false
  return safeGit(repoRoot, ['merge-base', '--is-ancestor', a, b]).error === null
}

function parseSourceCommit(content) {
  const m = normalizeText(content).match(/^---\s*\n[\s\S]*?^source_commit:\s*([0-9a-f]{7,40})\s*$/m)
  return m ? m[1] : null
}

/** 已知变更名（活跃 + 归档目录），供 subject 归属识别。 */
function collectKnownChanges(specBase) {
  const out = new Set()
  for (const root of [join(specBase, 'changes'), join(specBase, 'changes', 'archive')]) {
    try {
      for (const e of readdirSync(root, { withFileTypes: true })) {
        if (e.isDirectory() && /^\d{4}-\d{2}-\d{2}-[A-Za-z0-9._-]+$/.test(e.name)) out.add(e.name)
      }
    } catch { /* 目录缺失/不可读 → 跳过 */ }
  }
  return [...out].sort((a, b) => b.length - a.length)
}

/**
 * 收集 SillySpec 活锚点（只读；缺失/坏文件 fail-soft 跳过）。
 * @returns {Array<{kind:string,id:string,sha:string}>}
 */
function collectAnchorCandidates(specBase) {
  const anchors = []
  const push = (kind, id, sha) => { if (sha) anchors.push({ kind, id, sha: String(sha).trim() }) }
  // scan 文档
  try {
    const docsRoot = join(specBase, 'docs')
    for (const p of readdirSync(docsRoot, { withFileTypes: true })) {
      if (!p.isDirectory() || p.name.startsWith('.')) continue
      const scanDir = join(docsRoot, p.name, 'scan')
      if (!existsSync(scanDir)) continue
      for (const f of readdirSync(scanDir)) {
        if (!f.endsWith('.md')) continue
        try { push('scan', `${p.name}/scan/${f}`, parseSourceCommit(readFileSync(join(scanDir, f), 'utf8'))) } catch { /* 单文档失败跳过 */ }
      }
    }
  } catch { /* 无 docs */ }
  // 活跃变更 baseline + change-patch
  try {
    const changesRoot = join(specBase, 'changes')
    for (const p of readdirSync(changesRoot, { withFileTypes: true })) {
      if (!p.isDirectory() || p.name === 'archive') continue
      const dir = join(changesRoot, p.name)
      try {
        const st = readFileSync(join(dir, 'flow-state.yaml'), 'utf8')
        const m = st.match(/^baseline_commit:\s*'?([0-9a-f]{7,40})'?\s*$/m)
        if (m) push('flow-baseline', p.name, m[1])
      } catch { /* 无 flow-state */ }
      try {
        const cp = JSON.parse(readFileSync(join(dir, 'change-patch.json'), 'utf8'))
        push('change-patch-baseline', p.name, cp.baseline)
        push('change-patch-head', p.name, cp.head)
      } catch { /* 无 change-patch/不可解析 */ }
    }
  } catch { /* 无 changes */ }
  // worktree meta
  try {
    const wtRoot = join(specBase, '.runtime', 'worktrees')
    for (const p of readdirSync(wtRoot, { withFileTypes: true })) {
      if (!p.isDirectory()) continue
      try {
        const meta = JSON.parse(readFileSync(join(wtRoot, p.name, 'meta.json'), 'utf8'))
        for (const key of ['baselineCommit', 'actualBaseHash', 'baseHash']) {
          if (meta[key]) push('worktree-meta', `${p.name}:${key}`, meta[key])
        }
      } catch { /* 单 worktree meta 失败跳过 */ }
    }
  } catch { /* 无 worktrees */ }
  return anchors
}

/**
 * 计算 effectiveBase：所有活锚点必须仍是新 HEAD 祖先。
 * 显式 --base 早于活锚点 → 拒绝；锚点分叉 → 取最低共同后代（通常是 merge commit）。
 * @returns {{ok:true,base:string,anchors:Array,warnings:string[],raised:boolean}|{ok:false,error:string}}
 */
function computeEffectiveBase({ repoRoot, head, base, anchors = [], explicitBase = false }) {
  const warnings = []
  const original = base
  const live = []
  const seen = new Set()
  for (const a of anchors) {
    const sha = revParseCommit(repoRoot, a.sha)
    if (!sha) { warnings.push(`锚点不可解析（预存坏锚点，跳过）：${a.kind} ${a.id} ${String(a.sha).slice(0, 10)}`); continue }
    if (!isAncestor(repoRoot, sha, head)) {
      warnings.push(`锚点不是 HEAD 祖先（预存脱锚，压扁不修复）：${a.kind} ${a.id} ${sha.slice(0, 10)}`)
      continue
    }
    if (seen.has(sha)) continue
    seen.add(sha)
    live.push({ ...a, sha })
  }
  const advance = (cur, target) => {
    if (!cur) return target
    if (isAncestor(repoRoot, cur, target)) return target
    if (isAncestor(repoRoot, target, cur)) return cur
    return lowestCommonDescendant(repoRoot, [cur, target], head)
  }
  if (explicitBase) {
    for (const a of live) {
      if (!isAncestor(repoRoot, a.sha, base)) {
        return { ok: false, error: `--base ${String(base).slice(0, 10)} 早于活锚点 ${a.kind} ${a.id}（${a.sha.slice(0, 10)}）——请把 base 抬到锚点之后，或先刷新/归档对应变更` }
      }
    }
  }
  const maximal = live.filter((a) => !live.some((b) => b.sha !== a.sha && isAncestor(repoRoot, a.sha, b.sha)))
  let next = base
  if (maximal.length === 1) {
    next = advance(next, maximal[0].sha)
  } else if (maximal.length > 1) {
    const common = lowestCommonDescendant(repoRoot, maximal.map((a) => a.sha), head)
    if (!common) return { ok: false, error: '活锚点分叉且找不到共同后代——先跑全量 scan/归档活跃变更，或显式 --base 到所有锚点之后' }
    next = advance(next, common)
  }
  if (!next || !isAncestor(repoRoot, next, head)) return { ok: false, error: 'effectiveBase 不是 HEAD 祖先（内部算法错误）' }
  for (const a of live) {
    if (!isAncestor(repoRoot, a.sha, next)) {
      return { ok: false, error: `effectiveBase ${next.slice(0, 10)} 未覆盖活锚点 ${a.kind} ${a.id}（${a.sha.slice(0, 10)}）` }
    }
  }
  if (next !== original) {
    warnings.push(`effectiveBase 因活锚点抬升：${String(original).slice(0, 10)} → ${next.slice(0, 10)}（${live.filter((a) => !isAncestor(repoRoot, a.sha, original)).map((a) => `${a.kind}:${a.id}`).join('、')}）`)
  }
  return { ok: true, base: next, anchors: live, warnings, raised: next !== original }
}

function lowestCommonDescendant(repoRoot, shas, head) {
  const uniq = [...new Set(shas.filter(Boolean))]
  if (uniq.length === 0) return head
  if (uniq.some((s) => s === head)) return head
  const lists = []
  for (const sha of uniq) {
    const out = gitQuiet(repoRoot, ['rev-list', '--ancestry-path', '--reverse', `${sha}..${head}`], { timeout: GIT_TIMEOUT })
    const arr = splitLines(out)
    if (arr.length === 0) return head
    lists.push(arr)
  }
  const sets = lists.map((l) => new Set(l))
  const common = lists[0].find((sha) => sets.every((s) => s.has(sha)))
  if (!common) return null
  if (uniq.some((s) => !isAncestor(repoRoot, s, common))) return null
  return common
}

/** 读取 `base..HEAD` 提交（拓扑正序）。 */
function collectCommits({ repoRoot, base, head }) {
  const out = git(repoRoot, [
    'log', '--reverse', '--no-color', '--no-decorate', '-z',
    '--format=%H%x1f%T%x1f%P%x1f%an%x1f%ae%x1f%aI%x1f%B',
    `${base}..${head}`,
  ], { timeout: GIT_TIMEOUT, trim: false })
  return String(out).split('\x00').map((block) => block.replace(/^\n+/, '')).filter(Boolean).map((block) => {
    const f = block.split('\x1f')
    const message = normalizeText(f.slice(6).join('\x1f'))
    const nl = message.indexOf('\n')
    return {
      sha: f[0].trim(),
      tree: f[1].trim(),
      parents: splitLines(f[2]).length > 0 ? f[2].trim().split(/\s+/).filter(Boolean) : [],
      author: { name: f[3], email: f[4], date: f[5] },
      message,
      subject: nl === -1 ? message.trim() : message.slice(0, nl).trim(),
      body: nl === -1 ? '' : message.slice(nl + 1),
    }
  })
}

function readStatus(repoRoot) {
  const staged = splitLines(gitQuiet(repoRoot, ['diff', '--cached', '--name-only']))
  const dirty = splitLines(gitQuiet(repoRoot, ['diff', '--name-only']))
  const untracked = splitLines(gitQuiet(repoRoot, ['ls-files', '--others', '--exclude-standard']))
  const porcelain = gitQuiet(repoRoot, ['status', '--porcelain'], { trim: false }) || ''
  return { staged, dirty, untracked, porcelain }
}

async function detectWorktree(cwd) {
  try {
    const { detectCwdInsideWorktree } = await import('./run/shared.js')
    return detectCwdInsideWorktree(cwd)
  } catch { return null }
}

// ─────────────────────────────────────────────────────────────────────────────
// 计划层
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 只读计划：解析仓库/目标/base/锚点/提交/分组；不写任何 ref/index/工作区/远端。
 * @returns {{ok:true, ...}|{ok:false, exitCode:number, errors:string[], warnings:string[]}}
 */
export function planPush({
  cwd = process.cwd(), specDir = null, mode = 'by-change', change = null,
  base = null, remote = null, branch = null, remoteSha = null,
} = {}) {
  const fail = (msg, exitCode = 1) => ({ ok: false, exitCode, errors: [msg], warnings: [] })
  const ctx = resolveRepoContext({ cwd })
  if (!ctx.ok) return fail(ctx.error)
  if (ctx.detached) return fail('detached HEAD 无分支——先 git switch <分支>', 2)
  if (branch && branch !== ctx.branch) return fail(`--branch ${branch} 与当前 checkout 分支 ${ctx.branch} 不一致（v1 只允许当前分支）`, 2)
  if (ctx.shallow) return fail('shallow clone 的祖先/patch-id 不可靠——先 git fetch --unshallow', 2)
  if (ctx.inProgress.length > 0) return fail(`仓库有进行中的 git 操作（${ctx.inProgress.join('、')}）——先完成或中止后再 push`, 2)
  const target = resolvePushTarget({ repoRoot: ctx.repoRoot, branch: ctx.branch, remote })
  if (!target.ok) return fail(target.error, 2)
  const specBase = specDir ? resolve(specDir) : join(ctx.repoRoot, '.sillyspec')
  const warnings = []
  if (change && !/^[A-Za-z0-9._-]+$/.test(change)) return fail(`--change 非法：${change}`, 2)

  // 远端 tip：优先调用方刚 fetch 的结果；否则 ls-remote（只读，不改 remote-tracking ref）
  const tip = remoteSha || lsRemoteTip(ctx.repoRoot, target.remote, target.remoteBranch)
  let baseSha = null
  if (base) {
    baseSha = revParseCommit(ctx.repoRoot, base)
    if (!baseSha) return fail(`--base 不可解析：${base}`, 2)
  } else if (tip) {
    baseSha = revParseCommit(ctx.repoRoot, tip)
    if (!baseSha) return fail(`远端分支 ${target.remote}/${target.remoteBranch} 的 tip ${tip.slice(0, 10)} 本地不可达——先 git fetch ${target.remote} ${target.remoteBranch}，或显式 --base`, 1)
  } else {
    return fail(`远端分支 ${target.remote}/${target.remoteBranch} 不存在——新分支请显式 --base <ref>`, 2)
  }
  if (!isAncestor(ctx.repoRoot, baseSha, ctx.head)) {
    return fail(`base ${baseSha.slice(0, 10)} 不是 HEAD 祖先（远端领先或已分叉）——先 git fetch/rebase 后再 push；本命令不 force`, 1)
  }
  const knownChanges = collectKnownChanges(specBase)
  const anchorCandidates = collectAnchorCandidates(specBase)
  const eff = computeEffectiveBase({ repoRoot: ctx.repoRoot, head: ctx.head, base: baseSha, anchors: anchorCandidates, explicitBase: !!base })
  if (!eff.ok) return fail(eff.error, 1)
  warnings.push(...eff.warnings)
  const effectiveBase = eff.base
  if (effectiveBase === ctx.head) {
    return { ok: true, ctx, target, specBase, mode, change, base: baseSha, effectiveBase, remoteSha: tip, baseRaised: eff.raised, anchors: eff.anchors, commits: [], groups: [], needsRewrite: false, warnings: [...warnings, 'base 已到 HEAD，无未推送提交'] }
  }
  // 区间含已推送提交 → 拒绝（仅压扁模式需要；--mode none 只推送，天然允许）
  if (mode !== 'none') {
    const allRange = splitLines(gitQuiet(ctx.repoRoot, ['rev-list', `${effectiveBase}..${ctx.head}`]))
    const unpushed = new Set(splitLines(gitQuiet(ctx.repoRoot, ['rev-list', `${effectiveBase}..${ctx.head}`, '--not', '--remotes'])))
    const pushedInRange = allRange.filter((sha) => !unpushed.has(sha))
    if (pushedInRange.length > 0) {
      return fail(`压扁区间含 ${pushedInRange.length} 个已被远端 ref 可达的提交——拒绝压扁（本命令不 force-push）`, 1)
    }
    const merges = splitLines(gitQuiet(ctx.repoRoot, ['rev-list', '--merges', `${effectiveBase}..${ctx.head}`]))
    if (merges.length > 0) {
      return fail(`压扁区间含 ${merges.length} 个 merge commit——默认拒绝（展平 merge 拓扑会丢语义）；先人工整理为线性历史或改用 --mode none`, 1)
    }
  }
  if (mode === 'one' && eff.anchors.some((a) => a.kind === 'flow-baseline' && a.id !== change)) {
    return fail('--mode one 与活跃变更相交——单一大提交会让文件归属不可按变更切分；请等活跃变更 flow done，或用默认 by-change', 1)
  }
  const commits = collectCommits({ repoRoot: ctx.repoRoot, base: effectiveBase, head: ctx.head })
  if (commits.length === 0) {
    return fail('未收集到待处理提交（base..HEAD 为空）——检查 --base 或远端状态', 1)
  }
  const cls = classifyCommits({ commits, mode, changeName: change, knownChanges })
  if (!cls.ok) return fail(cls.error, 1)
  warnings.push(...cls.warnings)
  if (mode === 'by-change' && knownChanges.length === 0) {
    warnings.push('未发现 .sillyspec 变更元数据（changes/ 目录为空）——by-change 无归属可分组；需要合成一笔请用 --mode one --change <名>')
  }
  if (mode !== 'none') {
    warnings.push(...buildRangeAdvisories({ repoRoot: ctx.repoRoot, base: effectiveBase, head: ctx.head, commits }))
  }
  return {
    ok: true, ctx, target, specBase, mode, change, knownChanges,
    base: baseSha, effectiveBase, remoteSha: tip, baseRaised: eff.raised,
    anchors: eff.anchors, commits, groups: cls.groups, needsRewrite: cls.needsRewrite,
    warnings,
  }
}

/**
 * 签名标记解析（纯函数，供单测直测）：`git log --format=%G?` 的 flag 非 N 即带签名
 * （G 有效/B 无效/E 过期/U 无法验证/X 签名过期）。压扁用 commit-tree 重写，签名不可迁移——
 * 带签名提交必须告警，让用户在远端拒收/协作要求签名场景下先人工决策。
 * @param {Array<{sha:string,flag:string}>} flags
 * @returns {string|null} null=全无签名（零误报）
 */
export function signatureWarnFromFlags(flags) {
  const signed = (Array.isArray(flags) ? flags : []).filter((f) => f && f.flag && f.flag !== 'N')
  if (signed.length === 0) return null
  const preview = signed.slice(0, 3).map((f) => String(f.sha).slice(0, 7)).join('、')
  return `区间含 ${signed.length} 个带签名提交（${preview}${signed.length > 3 ? ' 等' : ''}）——压扁会将其重写为无签名提交（签名不可迁移，pre-squash 备份 ref 保原提交可溯）；如远端/协作方要求签名，请先人工处理`
}

/**
 * 压扁区间 advisory（只读，不参与守卫判定）：tag 落区间 + 带签名提交。
 * 警示是披露面——计划后远端/本地变化的改写安全仍由守卫与 CAS 保证。
 */
function buildRangeAdvisories({ repoRoot, base, head, commits }) {
  const out = []
  // tag 落压扁区间：tip ∈ (base..head]（tag 不随改写，仍指旧提交，备份 ref 保活可溯）
  const rangeSet = new Set((commits || []).map((c) => c.sha))
  const tagRefs = splitLines(gitQuiet(repoRoot, ['for-each-ref', 'refs/tags', '--format=%(refname:short)%09%(*objectname)%09%(objectname)'], { timeout: GIT_TIMEOUT }))
  const inRangeTags = []
  for (const line of tagRefs) {
    const parts = line.split('\t')
    const name = parts[0]
    // annotated tag：*objectname=剥皮 commit；lightweight：*objectname 空，objectname 即 commit
    const tip = parts[1] || parts[2]
    if (!name || !tip || !rangeSet.has(tip)) continue
    inRangeTags.push(name)
  }
  if (inRangeTags.length > 0) {
    out.push(`${inRangeTags.length} 个 tag 指向压扁区间内提交（${inRangeTags.slice(0, 5).join('、')}${inRangeTags.length > 5 ? ' 等' : ''}）——tag 不随改写（仍指旧提交，pre-squash 备份 ref 保原提交可溯）；如需 tag 跟随压扁结果，推送后人工 git tag -f <tag> <新HEAD>`)
  }
  // 签名提交告警：commit-tree 重写后签名丢失
  const signOut = gitQuiet(repoRoot, ['log', '--format=%H%x1f%G?', `${base}..${head}`], { timeout: GIT_TIMEOUT })
  const flags = splitLines(signOut).map((line) => {
    const i = line.indexOf('\x1f')
    return i === -1 ? { sha: line, flag: 'N' } : { sha: line.slice(0, i), flag: line.slice(i + 1).trim() }
  })
  const sigWarn = signatureWarnFromFlags(flags)
  if (sigWarn) out.push(sigWarn)
  return out
}

// ─────────────────────────────────────────────────────────────────────────────
// 执行层
// ─────────────────────────────────────────────────────────────────────────────

function timestampToken() {
  return new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')
}

function backupRefs(branch, ts) {
  const b = String(branch || 'detached').replace(/\s+/g, '-')
  return {
    pre: `refs/sillyspec/pre-squash/${b}/${ts}`,
    post: `refs/sillyspec/post-squash/${b}/${ts}`,
  }
}

function commitWithMessage({ repoRoot, tree, parent, message, author }) {
  const env = {
    ...process.env,
    GIT_AUTHOR_NAME: author?.name || 'sillyspec',
    GIT_AUTHOR_EMAIL: author?.email || 'sillyspec@push.local',
    GIT_COMMITTER_NAME: author?.name || 'sillyspec',
    GIT_COMMITTER_EMAIL: author?.email || 'sillyspec@push.local',
  }
  if (author?.date) env.GIT_AUTHOR_DATE = author.date
  return git(repoRoot, ['commit-tree', tree, '-p', parent, '-F', '-'], {
    input: message, timeout: GIT_TIMEOUT, env,
  })
}

function rewriteChain({ repoRoot, base, groups, oldHead }) {
  let parent = base
  let rewritten = false
  const mapping = []
  for (const g of groups) {
    const last = g.commits[g.commits.length - 1]
    const originalParent = g.commits[0].parents[0] || null
    if (!rewritten && g.action === 'keep' && g.commits.length === 1 && parent === originalParent) {
      // 前缀单提交且父链未变：复用原提交，避免无谓改写更多 hash
      mapping.push({ from: g.commits[0].sha, to: g.commits[0].sha, action: 'keep' })
      parent = g.commits[0].sha
      continue
    }
    rewritten = true
    const newSha = commitWithMessage({
      repoRoot, tree: g.tree, parent, message: g.message, author: last.author,
    })
    if (!newSha) throw new Error('git commit-tree 未返回 commit hash')
    const newTree = revParseTree(repoRoot, newSha)
    if (newTree !== g.tree) throw new Error(`commit-tree 树不一致：期望 ${g.tree.slice(0, 10)}，实际 ${String(newTree).slice(0, 10)}`)
    mapping.push({ from: g.commits[0].sha, to: newSha, action: g.action })
    parent = newSha
  }
  if (parent !== oldHead && revParseTree(repoRoot, parent) !== revParseTree(repoRoot, oldHead)) {
    throw new Error('压扁后 HEAD 树与旧 HEAD 不一致——拒绝更新分支')
  }
  return { newHead: parent, mapping }
}

function pushBranch({ repoRoot, remote, branch, remoteBranch, json = false }) {
  try {
    // human 模式 inherit：pre-push hook 输出实时直达终端——报错一次给全，不依赖二跑定位
    // （cli-copy-selfsufficient 探针口径）；--json 模式保持 pipe 捕获，stderr 并入错误信息供机器消费。
    const out = git(repoRoot, ['push', remote, `refs/heads/${branch}:refs/heads/${remoteBranch}`], {
      timeout: PUSH_TIMEOUT, trim: false,
      stdio: json ? undefined : ['ignore', 'inherit', 'inherit'],
    })
    return { ok: true, output: String(out || '') }
  } catch (e) {
    // json（pipe）模式把 hook 的 stderr/stdout 并入错误信息——报错一次给全；
    // human（inherit）模式下输出已实时直达终端，e.stderr 为空属预期。
    const detail = [e && e.stderr, e && e.stdout].map((x) => String(x == null ? '' : x).trim()).filter(Boolean).join('\n')
    const first = String(e && e.message ? e.message : e).split('\n')[0]
    return { ok: false, error: detail ? `${first}\n${detail}` : first }
  }
}

/**
 * 执行 push（含锁/备份/CAS/推送）。dry-run 只调 planPush，不取锁不写 ref。
 * @returns {Promise<{ok:boolean,exitCode:number,plan?:object,oldHead?:string,newHead?:string,pushed?:boolean,backupRefs?:object,errors:string[],warnings:string[],humanLines:string[],envelope:object}>}
 */
export async function runPush({
  cwd = process.cwd(), specDir = null, mode = 'by-change', change = null,
  base = null, remote = null, branch = null, dryRun = false, noPush = false,
  undo = false, json = false, log = () => {}, warn = () => {},
} = {}) {
  const warnings = []
  const errors = []
  if (undo) return undoPush({ cwd, remote, branch, json })

  const ctx = resolveRepoContext({ cwd })
  if (!ctx.ok) return { ok: false, exitCode: 1, errors: [ctx.error], warnings, humanLines: [], envelope: { command: 'push', ok: false, errors: [ctx.error] } }
  const wt = await detectWorktree(cwd)
  if (wt && !dryRun) {
    const msg = `cwd 在 SillySpec worktree 内（${wt.changeName}）——默认拒绝压扁（scanOrphanFace 会把旧提交误判为冻结面外）；先 sillyspec worktree apply 回主仓，再从主仓 push`
    return { ok: false, exitCode: 2, errors: [msg], warnings, humanLines: [], envelope: { command: 'push', ok: false, errors: [msg] } }
  }
  const status = readStatus(ctx.repoRoot)
  if (status.staged.length > 0) {
    const msg = `index 有 ${status.staged.length} 个已暂存文件——压扁不改变暂存区，但为避免误解先提交或 restore --staged；未暂存/未跟踪文件不阻止执行`
    return { ok: false, exitCode: 2, errors: [msg], warnings, humanLines: [], envelope: { command: 'push', ok: false, errors: [msg] } }
  }
  if (status.dirty.length > 0) warnings.push(`工作区有 ${status.dirty.length} 个未暂存修改——不会进入本次提交/推送`)
  if (status.untracked.length > 0) warnings.push(`工作区有 ${status.untracked.length} 个未跟踪文件——不会进入本次提交/推送`)

  // 目标远端解析一次，fetch 用真实 push remote（不能硬编码 origin）
  const targetForFetch = resolvePushTarget({ repoRoot: ctx.repoRoot, branch: ctx.branch, remote })
  const exec = async () => {
    // 执行前 fetch 目标分支（dry-run 不走这里）；新分支 fetch 失败交给 planPush 报“缺 --base”
    if (!dryRun && targetForFetch.ok) {
      try {
        git(ctx.repoRoot, ['fetch', '--no-tags', targetForFetch.remote, targetForFetch.remoteBranch], { timeout: 120000 })
      } catch { /* 远端分支可能不存在/离线；planPush 会用 ls-remote 给出可执行错误 */ }
    }
    const plan = planPush({ cwd, specDir, mode, change, base, remote, branch })
    if (!plan.ok) return { ok: false, exitCode: plan.exitCode || 1, plan, errors: plan.errors, warnings: [...warnings, ...(plan.warnings || [])], humanLines: [], envelope: { command: 'push', ok: false, mode, branch: ctx.branch, errors: plan.errors, warnings: [...warnings, ...(plan.warnings || [])] } }
    const humanLines = renderPushPlan({ plan, dryRun })
    const envelope = {
      schema_version: 1, command: 'push', ok: true, branch: plan.ctx.branch,
      remote: plan.target.remote, remote_branch: plan.target.remoteBranch,
      base: plan.effectiveBase, old_head: plan.ctx.head, new_head: plan.ctx.head,
      mode: plan.mode, dry_run: dryRun, pushed: false,
      groups: plan.groups.map((g) => ({ owner: g.owner, action: g.action, count: g.commits.length, from: g.commits[0].sha, to: g.commits[g.commits.length - 1].sha, subject: g.subject })),
      backup_refs: [], errors: [], warnings: [...warnings, ...plan.warnings],
    }
    if (dryRun) return { ok: true, exitCode: 0, plan, errors: [], warnings: envelope.warnings, humanLines, envelope }

    let newHead = plan.ctx.head
    let refs = null
    if (plan.needsRewrite) {
      const ts = timestampToken()
      refs = backupRefs(plan.ctx.branch, ts)
      try {
        git(ctx.repoRoot, ['update-ref', refs.pre, plan.ctx.head], { timeout: GIT_TIMEOUT })
        const rewritten = rewriteChain({ repoRoot: ctx.repoRoot, base: plan.effectiveBase, groups: plan.groups, oldHead: plan.ctx.head })
        newHead = rewritten.newHead
        if (newHead === plan.ctx.head) throw new Error('压扁未产生新提交（内部状态异常）')
        const oldTree = revParseTree(ctx.repoRoot, plan.ctx.head)
        const newTree = revParseTree(ctx.repoRoot, newHead)
        if (oldTree !== newTree) throw new Error('压扁后树与旧 HEAD 不一致——拒绝更新分支')
        git(ctx.repoRoot, ['update-ref', refs.post, newHead], { timeout: GIT_TIMEOUT })
        try {
          git(ctx.repoRoot, ['update-ref', '-m', `sillyspec push: squash ${plan.commits.length} commits`, `refs/heads/${plan.ctx.branch}`, newHead, plan.ctx.head], { timeout: GIT_TIMEOUT })
        } catch (e) {
          try { gitQuiet(ctx.repoRoot, ['update-ref', '-d', refs.post]) } catch { /* 清理失败不掩盖主错误 */ }
          throw new Error(`分支已被并发推进，CAS 更新失败（未改写远端）：${String(e && e.message ? e.message : e).split('\n')[0]}——重跑 --dry-run 重新计划`)
        }
      } catch (e) {
        const msg = String(e && e.message ? e.message : e)
        return { ok: false, exitCode: 1, plan, oldHead: plan.ctx.head, newHead, backupRefs: refs, errors: [msg], warnings: envelope.warnings, humanLines, envelope: { ...envelope, ok: false, new_head: newHead, errors: [msg], backup_refs: refs ? [refs.pre, refs.post] : [] } }
      }
      envelope.old_head = plan.ctx.head
      envelope.new_head = newHead
      envelope.backup_refs = [refs.pre, refs.post]
      humanLines.push(`✅ 已压扁：${plan.ctx.head.slice(0, 10)} → ${newHead.slice(0, 10)}（备份 ref: ${refs.pre} / ${refs.post}）`)
    }
    if (!noPush) {
      // 推送前再探一次远端：计划后远端被推进 → 拒绝，避免基于旧 base 的 non-FF
      const tipNow = lsRemoteTip(ctx.repoRoot, plan.target.remote, plan.target.remoteBranch)
      if (tipNow && plan.remoteSha && tipNow !== plan.remoteSha) {
        const msg = `远端分支在计划后被更新（${plan.remoteSha.slice(0, 10)} → ${tipNow.slice(0, 10)}）——本地压扁已保留，请重跑 --dry-run 重新计划或用 --undo 恢复`
        return { ok: false, exitCode: 1, plan, oldHead: plan.ctx.head, newHead, pushed: false, backupRefs: refs, errors: [msg], warnings: envelope.warnings, humanLines, envelope: { ...envelope, ok: false, errors: [msg] } }
      }
      const pushed = pushBranch({ repoRoot: ctx.repoRoot, remote: plan.target.remote, branch: plan.ctx.branch, remoteBranch: plan.target.remoteBranch, json })
      if (!pushed.ok) {
        const msg = `git push 失败（本地压扁已保留）：${pushed.error}`
        return { ok: false, exitCode: 1, plan, oldHead: plan.ctx.head, newHead, pushed: false, backupRefs: refs, errors: [msg], warnings: envelope.warnings, humanLines, envelope: { ...envelope, ok: false, errors: [msg] } }
      }
      envelope.pushed = true
      humanLines.push(`🚀 已推送 ${plan.target.remote}/${plan.target.remoteBranch}（快进，无 force）`)
      if (pushed.output) humanLines.push(...String(pushed.output).trim().split('\n').filter(Boolean))
    } else {
      humanLines.push('ℹ️ --no-push：仅压扁，未推送')
    }
    return { ok: true, exitCode: 0, plan, oldHead: plan.ctx.head, newHead, pushed: envelope.pushed, backupRefs: refs, errors: [], warnings: envelope.warnings, humanLines, envelope }
  }

  if (dryRun) return exec()
  const { withFileLock } = await import('./quicklog.js')
  const lockPath = join(ctx.commonDir, 'sillyspec-push.lock')
  try {
    return await withFileLock(lockPath, exec, {
      staleMs: 10 * 60 * 1000,
      timeoutMs: 120000,
      retryMs: 200,
      content: JSON.stringify({ pid: process.pid, session: process.env.SILLYSPEC_SESSION_ID || 'anon', branch: ctx.branch, purpose: 'push', startedAt: new Date().toISOString() }),
    })
  } catch (e) {
    const msg = `push 锁获取/执行失败：${String(e && e.message ? e.message : e).split('\n')[0]}`
    return { ok: false, exitCode: 1, errors: [msg], warnings, humanLines: [], envelope: { command: 'push', ok: false, errors: [msg], warnings } }
  }
}

/**
 * 恢复最近一次压扁前的本地分支。只在当前 HEAD 精确等于 post-squash ref 且远端尚未
 * 指向压扁结果时允许；不做 force，不推送。
 */
async function undoPush({ cwd = process.cwd(), remote = null, branch = null, json = false } = {}) {
  const fail = (msg, exitCode = 1) => ({ ok: false, exitCode, errors: [msg], warnings: [], humanLines: [], envelope: { command: 'push', ok: false, undo: true, errors: [msg] } })
  const ctx = resolveRepoContext({ cwd })
  if (!ctx.ok) return fail(ctx.error)
  if (ctx.detached) return fail('detached HEAD 无分支——不能 undo', 2)
  if (branch && branch !== ctx.branch) return fail(`--branch ${branch} 与当前分支 ${ctx.branch} 不一致`, 2)
  const target = resolvePushTarget({ repoRoot: ctx.repoRoot, branch: ctx.branch, remote })
  if (!target.ok) return fail(target.error, 2)
  const prefix = `refs/sillyspec/post-squash/${ctx.branch}/`
  const refs = splitLines(gitQuiet(ctx.repoRoot, ['for-each-ref', '--sort=-creatordate', '--format=%(refname)', prefix]) || '')
  if (refs.length === 0) return fail('没有可恢复的 post-squash 备份 ref——未在本分支执行过 sillyspec push --no-push/压扁', 2)
  const postRef = refs[0]
  const ts = postRef.slice(prefix.length)
  const preRef = `refs/sillyspec/pre-squash/${ctx.branch}/${ts}`
  const postSha = revParseCommit(ctx.repoRoot, postRef)
  const preSha = revParseCommit(ctx.repoRoot, preRef)
  if (!postSha || !preSha) return fail(`备份 ref 不可解析（${postRef} / ${preRef}）`)
  if (ctx.head !== postSha) return fail(`当前 HEAD ${ctx.head.slice(0, 10)} 不是最近一次压扁结果 ${postSha.slice(0, 10)}——已有新提交，拒绝 undo（避免抹掉后续工作）`)
  const tip = lsRemoteTip(ctx.repoRoot, target.remote, target.remoteBranch)
  if (tip && (tip === postSha || isAncestor(ctx.repoRoot, postSha, tip))) {
    return fail(`远端 ${target.remote}/${target.remoteBranch} 已指向压扁结果——拒绝 undo（会让本地落后远端并制造 non-FF）；如确需改写远端历史请人工处理`)
  }
  if (tip && tip !== preSha && !isAncestor(ctx.repoRoot, tip, preSha)) {
    return fail(`远端已变化（${tip.slice(0, 10)}），既不等于压扁前 ${preSha.slice(0, 10)} 也不是其祖先——拒绝 undo，先人工核对`)
  }
  try {
    git(ctx.repoRoot, ['update-ref', '-m', 'sillyspec push: undo squash', `refs/heads/${ctx.branch}`, preSha, postSha], { timeout: GIT_TIMEOUT })
  } catch (e) {
    return fail(`undo CAS 失败：${String(e && e.message ? e.message : e).split('\n')[0]}`)
  }
  const humanLines = [`↩️ 已恢复 ${ctx.branch}：${postSha.slice(0, 10)} → ${preSha.slice(0, 10)}（备份 ref 保留）`]
  return {
    ok: true, exitCode: 0, oldHead: postSha, newHead: preSha, errors: [], warnings: [], humanLines,
    envelope: { schema_version: 1, command: 'push', ok: true, undo: true, branch: ctx.branch, remote: target.remote, remote_branch: target.remoteBranch, old_head: postSha, new_head: preSha, errors: [], warnings: [] },
  }
}
