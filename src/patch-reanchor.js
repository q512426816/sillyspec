/**
 * patch-reanchor.js — 收口留痕锚点回写（2026-10-12-close-trace-freeze-integrity FR-03）。
 *
 * 事故形态（multi-agent-platform 2026-10-12 ws-ref 五变更取证）：thin 流程在会话专属
 * worktree（独立克隆/事后清理）内收口，change-patch.json 冻结的 baseline/head 是 worktree
 * 本地 SHA；worktree apply 重放回主仓时 SHA 全部改写且原对象被清理——归档锚点悬空，
 * `git diff baseline..head` 不可解析，归档溯源死链。
 *
 * 回写约定：按「提交主题含变更名」归属（仓内提交规范 `(<变更名>)` 后缀族，与
 * filterCommittedFace 的 commitAttribution 同一约定），`git log --all --grep` 取归属提交链：
 * head=拓扑末笔、baseline=首笔^；区间一致性（首笔^ 必须是 head 祖先、区间 diff 与留档
 * files[] 至少一文件重叠）不过即 fail-closed 不改写。原 worktree 锚降级为
 * worktreeBaseline/worktreeHead 溯源字段，patchSha256 按重冻正文重锚。
 *
 * 依赖边界：本模块被 worktree-apply.js 静态引入（apply 尾声自动回写），而 scope-audit.js
 * 已静态引入 worktree-apply（评审 G3「内核绝不 import scope-audit」）——故本模块禁止
 * import scope-audit/worktree-apply（防环），diff 采集自实现（pathspec 分块）。
 */
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'
import { writeAtomicSync } from './fs-atomic.js'

function git(cwd, args, opts = {}) {
  try {
    return execFileSync('git', args, { cwd, encoding: 'utf8', timeout: 60000, windowsHide: true, ...opts }).trim()
  } catch { return null }
}

const resolves = (cwd, sha) => Boolean(sha) && /^[0-9a-f]{40}$/i.test(String(sha)) && git(cwd, ['cat-file', '-e', `${sha}^{commit}`]) !== null

/** pathspec 分块（命令行长度上限防御，与 worktree-apply.chunkPaths 同上限语义，本地实现防环） */
function chunkPaths(paths, maxChars = 8000) {
  const chunks = []
  let cur = []
  let len = 0
  for (const p of paths) {
    if (cur.length > 0 && len + p.length + 1 > maxChars) { chunks.push(cur); cur = []; len = 0 }
    cur.push(p); len += p.length + 1
  }
  if (cur.length > 0) chunks.push(cur)
  return chunks
}

/**
 * 定位变更目录：活跃区 → 归档区精确名 → 归档区 `<日期>-<名>` 后缀匹配（归档重命名形态）。
 * @returns {string|null}
 */
export function locateChangeDir(specBase, changeName) {
  const active = join(specBase, 'changes', changeName)
  if (existsSync(join(active, 'change-patch.json')) || existsSync(join(active, 'design.md'))) return active
  const archiveExact = join(specBase, 'changes', 'archive', changeName)
  if (existsSync(join(archiveExact, 'change-patch.json')) || existsSync(join(archiveExact, 'design.md'))) return archiveExact
  try {
    const archiveRoot = join(specBase, 'changes', 'archive')
    if (existsSync(archiveRoot)) {
      const suffix = `-${changeName}`
      const hit = readdirSync(archiveRoot).filter((d) => d.endsWith(suffix)).sort()
      if (hit.length === 1) return join(archiveRoot, hit[0])
    }
  } catch { /* 归档扫描失败走 null */ }
  return null
}

/**
 * 归档锚点回写核心（幂等）。
 * @param projectRoot 主仓根（锚点可解析性判定与重冻区间的仓）
 * @param changeDir 变更目录（活跃或归档侧）
 * @param changeName 变更名（提交主题归属 grep 锚）
 * @returns {{ ok: boolean, noop?: boolean, baseline?: string, head?: string, reason?: string, rewritten?: string[] }}
 */
export function reAnchorChangePatch({ projectRoot, changeDir, changeName }) {
  const cpPath = join(changeDir, 'change-patch.json')
  if (!existsSync(cpPath)) return { ok: false, reason: 'change-patch.json 不在案（本变更无收口冻结件）' }
  let meta
  try { meta = JSON.parse(readFileSync(cpPath, 'utf8')) } catch (e) { return { ok: false, reason: `change-patch.json 不可解析：${e && e.message ? e.message.split('\n')[0] : e}` } }

  const headOk = resolves(projectRoot, meta.head)
  const baseOk = resolves(projectRoot, meta.baseline)
  if (headOk && (baseOk || !meta.baseline)) return { ok: true, noop: true }

  // 归属提交链：主题含变更名（提交规范后缀族）；--all 覆盖主干/分支，date-order 保拓扑可读
  const grepRaw = git(projectRoot, ['log', '--all', '--date-order', '--format=%H%x01%s', `--grep=${changeName}`])
  if (!grepRaw) return { ok: false, reason: `主仓无可归属提交（git log --all --grep=${changeName} 空/失败）——锚点推导无据，fail-closed` }
  const rows = grepRaw.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => { const i = l.indexOf('\u0001'); return [l.slice(0, i), l.slice(i + 1)] })
  if (rows.length === 0) return { ok: false, reason: `主仓无可归属提交——锚点推导无据，fail-closed` }
  const oldest = rows[rows.length - 1][0]
  const newest = rows[0][0]
  const isAncestor = (a, b) => git(projectRoot, ['merge-base', '--is-ancestor', a, b]) !== null
  if (!isAncestor(oldest, newest)) return { ok: false, reason: `归属提交链拓扑不一致（首笔 ${oldest.slice(0, 10)} 非末笔 ${newest.slice(0, 10)} 祖先）——疑似同名异源提交混入，fail-closed` }
  const baseRaw = git(projectRoot, ['rev-parse', `${oldest}^`])
  if (!baseRaw || !resolves(projectRoot, baseRaw)) return { ok: false, reason: `首笔归属提交无第一父（根提交形态）——baseline 不可推导，fail-closed` }
  if (!isAncestor(baseRaw, newest)) return { ok: false, reason: `推导区间不一致（首笔^ 非 head 祖先）——fail-closed` }

  // 区间与留档 files[] 至少一文件重叠（防错归属整链改写）
  const rangeFiles = String(git(projectRoot, ['diff', '--name-only', '--no-color', baseRaw, newest]) || '')
    .split('\n').map((s) => s.trim().replace(/\\/g, '/')).filter(Boolean)
  const recorded = (Array.isArray(meta.files) ? meta.files : []).map((f) => String(f).replace(/\\/g, '/'))
  const overlap = rangeFiles.filter((f) => recorded.includes(f) || recorded.some((r) => r.startsWith(`${f}/`) || f.startsWith(`${r}/`)))
  if (recorded.length > 0 && overlap.length === 0) {
    return { ok: false, reason: `推导区间（${baseRaw.slice(0, 10)}..${newest.slice(0, 10)}）与留档 files[] 零重叠——归属可疑，fail-closed` }
  }

  // 重冻正文：区间 diff 按 files[] pathspec 限面（重放后的主仓区间即归档真相）
  const face = recorded.length > 0 ? recorded : rangeFiles
  const parts = []
  for (const chunk of chunkPaths(face)) {
    const d = git(projectRoot, ['diff', '--no-color', baseRaw, newest, '--', ...chunk])
    if (d) parts.push(d)
  }
  const patchBody = parts.length > 0 ? (parts.join('\n').endsWith('\n') ? parts.join('\n') : parts.join('\n') + '\n') : null
  if (!patchBody) return { ok: false, reason: `主仓区间 diff 为空（${baseRaw.slice(0, 10)}..${newest.slice(0, 10)} × ${face.length} 文件）——重冻无据，fail-closed` }

  const sha256 = createHash('sha256').update(patchBody.replace(/\r\n/g, '\n'), 'utf8').digest('hex')
  const rewritten = []
  if (meta.baseline !== baseRaw) { meta.worktreeBaseline = meta.baseline ?? null; meta.baseline = baseRaw; rewritten.push('baseline') }
  if (meta.head !== newest) { meta.worktreeHead = meta.head ?? null; meta.head = newest; rewritten.push('head') }
  if (meta.scopeAudit && typeof meta.scopeAudit === 'object' && meta.scopeAudit.baseAnchor !== baseRaw) {
    meta.scopeAudit = { ...meta.scopeAudit, baseAnchor: baseRaw }
    rewritten.push('scopeAudit.baseAnchor')
  }
  meta.patchSha256 = sha256
  meta.patchStatus = 'ok'
  meta.reanchoredAt = new Date().toISOString()
  meta.reanchorNote = `apply/回填后主仓重锚（原 worktree 锚悬空：${meta.worktreeBaseline ? String(meta.worktreeBaseline).slice(0, 10) : '—'}/${meta.worktreeHead ? String(meta.worktreeHead).slice(0, 10) : '—'}；归属约定=提交主题含变更名）——2026-10-12-close-trace-freeze-integrity FR-03`
  writeAtomicSync(cpPath, JSON.stringify(meta, null, 2) + '\n')
  writeAtomicSync(join(changeDir, 'change.patch'), patchBody)
  rewritten.push('change.patch', 'patchSha256')
  return { ok: true, noop: false, baseline: baseRaw, head: newest, rewritten }
}
