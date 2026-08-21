/**
 * cleanup fail-closed 保护 characterization 测试（FR-01/02/03，D-001@v1 / D-006@v1）
 *
 * 防线 1：cleanup 在 junction 解链 / git worktree remove --force 之前，检查未落主仓交付变更
 * （hasUnappliedChanges），有则 fail-closed 返回 result:'blocked'（清理即蒸发），--force 显式绕过（D-001）。
 *
 * 关键契约（Grill B-1 / R-01）：hasUnappliedChanges 判定主体是 main HEAD（_changesAlreadyOnMain 用
 * git rev-parse HEAD），而 git apply --3way 不 commit → apply 后 main HEAD 不变 → 无 force 仍判 blocked，
 * 必须显式 force:true 绕过（D-006）。本测试用「apply 后状态（main 工作区已有副本、未 commit）无 force
 * 拦截 + force 放行」锁定该契约。
 *
 * 范式照 test/worktree-has-unapplied-changes.test.mjs：mkdtempSync → git init → 基线 commit →
 * git worktree add → 改动 → 手写 meta.json → new WorktreeManager({cwd})。
 */
import fs from 'fs'
import path from 'path'
import os from 'os'
import { execSync } from 'child_process'
import { WorktreeManager } from '../src/worktree.js'

let passed = 0, failed = 0
const failures = []
function assertTrue(cond, msg) {
  if (cond) { passed++; console.log(`  ✅ PASS: ${msg}`) }
  else { failed++; failures.push(msg); console.log(`  ❌ FAIL: ${msg}`) }
}
function sh(cmd, cwd) { execSync(cmd, { cwd, stdio: 'pipe' }) }
function rev(cmd, cwd) { return execSync(cmd, { cwd, encoding: 'utf8' }).trim() }

function setupRepo() {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'wtcg-'))
  sh('git init', d)
  sh('git config user.email t@t.co && git config user.name t', d)
  sh('git config commit.gpgsign false', d)
  fs.writeFileSync(path.join(d, 'a.txt'), 'a\n')
  sh('git add -A && git commit -m init', d)
  fs.mkdirSync(path.join(d, '.sillyspec', '.runtime', 'worktrees', 'tc'), { recursive: true })
  fs.writeFileSync(path.join(d, '.gitignore'), '.sillyspec/\n')
  sh('git add -A && git commit -m gitignore', d)
  // _resolveMainRepoRoot 用相对 git-common-dir 解析，测试需 chdir 到 d（坑 worktree-test-fixture-must-chdir）
  process.chdir(d)
  return d
}
function makeWorktree(d) {
  const wtDir = path.join(d, '.sillyspec', '.runtime', 'worktrees', 'tc')
  sh(`git worktree add "${wtDir}" -b sillyspec/tc`, d)
  return wtDir
}
function writeMeta(wtDir, base, overrides = {}) {
  const meta = {
    name_zh: 'meta', changeName: 'tc', branch: 'sillyspec/tc',
    baseBranch: 'master', baseHash: base, baselineHash: 'x', baselineCommit: null,
    worktreePath: wtDir, mode: 'worktree', baselineFiles: [],
    ...overrides,
  }
  fs.writeFileSync(path.join(wtDir, 'meta.json'), JSON.stringify(meta))
}
const cleanup = d => { process.chdir(os.tmpdir()); try { fs.rmSync(d, { recursive: true, force: true }) } catch {} }
const wtCleanup = (d, opts) => new WorktreeManager({ cwd: d }).cleanup('tc', opts)
// 捕获 cleanup 的 console.error（FR-01：blocked 时列出文件 + 提示），结束后恢复
function captureError(fn) {
  const out = []
  const oe = console.error
  console.error = (...a) => out.push(a.join(' '))
  try { return { result: fn(), logs: out } } finally { console.error = oe }
}
const normPath = p => p.replace(/\\/g, '/')
function branchExists(d, branch) {
  try { rev(`git rev-parse --verify --quiet refs/heads/${branch}`, d); return true } catch { return false }
}

console.log('=== worktree cleanup: fail-closed 保护（未落主仓拦截 / force 绕过 / apply 后放行 / in-place 跳过）===\n')

console.log('--- ① 未落主仓 untracked 新文件 → blocked，目录/分支/meta/注册全保留 ---')
{
  const d = setupRepo(); const base = rev('git rev-parse HEAD', d); const wtDir = makeWorktree(d)
  fs.writeFileSync(path.join(wtDir, 'new.txt'), 'new-content\n') // 未 commit 未 apply
  writeMeta(wtDir, base)
  const { result, logs } = captureError(() => wtCleanup(d))
  assertTrue(result.result === 'blocked', `result='blocked'（实际: ${result.result}）`)
  assertTrue(result.details.some(x => x.includes('blocked: uncommitted')), `details 含 blocked: uncommitted deliverable changes（实际: ${JSON.stringify(result.details)}）`)
  const all = logs.join('\n')
  assertTrue(all.includes('未落地主工作区 HEAD') && all.includes('new.txt'), 'console.error 列出文件 + 拒绝提示')
  assertTrue(all.includes('sillyspec worktree apply'), 'console.error 含 apply 提示')
  assertTrue(fs.existsSync(wtDir), 'worktree 目录未被删')
  assertTrue(fs.existsSync(path.join(wtDir, 'meta.json')), 'meta.json 未被删')
  assertTrue(branchExists(d, 'sillyspec/tc'), '分支 sillyspec/tc 仍在')
  assertTrue(rev('git worktree list', d).includes(normPath(wtDir)), 'git worktree list 仍引用该 worktree')
  cleanup(d)
}

console.log('--- ② 已 commit 未 apply → blocked（FR-01 已 commit 变体）---')
{
  const d = setupRepo(); const base = rev('git rev-parse HEAD', d); const wtDir = makeWorktree(d)
  fs.writeFileSync(path.join(wtDir, 'a.txt'), 'wt-a\n')
  sh('git add -A && git commit -m wt-change', wtDir)  // 分支已 commit
  writeMeta(wtDir, base)  // 主仓 HEAD=base，未拿到改动
  const { result, logs } = captureError(() => wtCleanup(d))
  assertTrue(result.result === 'blocked', `已 commit 未 apply → blocked（实际: ${result.result}）`)
  assertTrue(logs.join('\n').includes('a.txt'), 'console.error 列出 a.txt')
  assertTrue(fs.existsSync(wtDir), 'worktree 目录未被删')
  cleanup(d)
}

console.log('--- ③ --force 显式绕过 → cleaned，目录/meta/分支全清 ---')
{
  const d = setupRepo(); const base = rev('git rev-parse HEAD', d); const wtDir = makeWorktree(d)
  fs.writeFileSync(path.join(wtDir, 'new.txt'), 'new-content\n')
  writeMeta(wtDir, base)
  const r = wtCleanup(d, { force: true })
  assertTrue(r.result === 'cleaned' || r.result === 'force-cleaned', `force → ${r.result}（cleaned/force-cleaned）`)
  assertTrue(!fs.existsSync(wtDir), 'worktree 目录已删')
  assertTrue(!fs.existsSync(path.join(d, '.sillyspec', '.runtime', 'worktrees', 'tc')), 'meta 目录已删')
  assertTrue(!branchExists(d, 'sillyspec/tc'), '分支已删')
  cleanup(d)
}

console.log('--- ④ apply 后状态（main 工作区有副本未 commit）：无 force 拦截，force 放行，main 副本保留 ---')
{
  const d = setupRepo(); const base = rev('git rev-parse HEAD', d); const wtDir = makeWorktree(d)
  fs.writeFileSync(path.join(wtDir, 'new.txt'), 'new-content\n')
  fs.writeFileSync(path.join(d, 'new.txt'), 'new-content\n') // 模拟 git apply --3way：复制到主仓工作区，未 commit
  writeMeta(wtDir, base)
  const r1 = wtCleanup(d)
  assertTrue(r1.result === 'blocked', `apply 后 main HEAD 未变 → 无 force 仍 blocked（Grill B-1 契约，实际: ${r1.result}）`)
  const r2 = wtCleanup(d, { force: true })
  assertTrue(r2.result === 'cleaned' || r2.result === 'force-cleaned', `apply 后 cleanup 传 force:true → ${r2.result}（不误阻）`)
  assertTrue(fs.existsSync(path.join(d, 'new.txt')), 'main 工作区副本保留（force 只清 worktree，不动主仓交付）')
  cleanup(d)
}


console.log('--- ⑦ branch review 引用保护：task review.json base/head 引用分支 commit → tag 锚定后删分支（坑 cleanup-branch-review-anchor-tag）---')
{
  const d = setupRepo(); const base = rev('git rev-parse HEAD', d)
  const wtDir = makeWorktree(d)
  writeMeta(wtDir, base)
  // worktree 分支上做 1 个 task commit
  fs.writeFileSync(path.join(wtDir, 'feat.txt'), 'feat\n')
  sh('git add -A && git commit -m task-01', wtDir)
  const head = rev('git rev-parse HEAD', wtDir)
  // task review.json 引用该 commit（head）
  const reviewDir = path.join(d, '.sillyspec', '.runtime', 'execute-runs', 'exec-x', 'tasks', 'task-01')
  fs.mkdirSync(reviewDir, { recursive: true })
  fs.writeFileSync(path.join(reviewDir, 'review.json'), JSON.stringify({
    name_zh: '任务评审', schemaVersion: 1, task: 'task-01', base, head,
    changedFiles: ['feat.txt'], specVerdict: 'pass', qualityVerdict: 'pass',
    reviewerNotes: '', requiredEvidence: [],
  }))
  const r = wtCleanup(d, { force: true })
  // 新契约（坑 cleanup-branch-review-anchor-tag）：打 sillyspec-audit/ 轻量 tag 锚定 tip
  //（commit 保持可达、gc 安全）后删分支——不再只能手动保留
  assertTrue(r.details.some(x => x.includes('anchoring tip to tag')), `有 review 引用 → tag 锚定入 details（实际 ${JSON.stringify(r.details)}）`)
  const branchAlive = (() => { try { rev('git rev-parse --verify sillyspec/tc', d); return true } catch { return false } })()
  assertTrue(!branchAlive, '分支 ref 已删（tip 已被 tag 锚定）')
  const tagTip = rev('git rev-parse sillyspec-audit/sillyspec/tc', d)
  assertTrue(tagTip === head, `tag 锚定分支 tip commit（gc 安全；${tagTip.slice(0, 8)} === ${head.slice(0, 8)}）`)
  assertTrue(!fs.existsSync(wtDir), 'worktree 目录照常清理（tag 锚定后工作区照常清）')
  cleanup(d)
}

console.log('--- ⑧ 无 review 引用 → 照删分支（行为不变）---')
{
  const d = setupRepo(); const base = rev('git rev-parse HEAD', d)
  const wtDir = makeWorktree(d)
  writeMeta(wtDir, base)
  fs.writeFileSync(path.join(wtDir, 'feat.txt'), 'feat\n')
  sh('git add -A && git commit -m task-01', wtDir)
  const r = wtCleanup(d, { force: true })
  assertTrue(r.details.some(x => x.includes('branch deleted')), '无 review 引用 → branch deleted')
  const branchGone = (() => { try { rev('git rev-parse --verify sillyspec/tc', d); return false } catch { return true } })()
  assertTrue(branchGone, '分支 ref 已删（零回归）')
  cleanup(d)
}

console.log('--- ⑨ review 引用非分支 commit（无关 hash）→ 照删 ---')
{
  const d = setupRepo(); const base = rev('git rev-parse HEAD', d)
  const wtDir = makeWorktree(d)
  writeMeta(wtDir, base)
  const reviewDir = path.join(d, '.sillyspec', '.runtime', 'execute-runs', 'exec-y', 'tasks', 'task-01')
  fs.mkdirSync(reviewDir, { recursive: true })
  fs.writeFileSync(path.join(reviewDir, 'review.json'), JSON.stringify({
    name_zh: '任务评审', schemaVersion: 1, task: 'task-01', base: 'dead0000000000000000000000000000000000000', head: 'beef0000000000000000000000000000000000000',
    changedFiles: [], specVerdict: 'pass', qualityVerdict: 'pass', reviewerNotes: '', requiredEvidence: [],
  }))
  const r = wtCleanup(d, { force: true })
  assertTrue(r.details.some(x => x.includes('branch deleted')), '引用不在分支 commit 集 → branch deleted（不误保）')
  cleanup(d)
}

console.log('--- ⑤ 无 meta 无目录 → skipped（幂等）---')
{
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'wtcg-skip-'))
  sh('git init', d)
  sh('git config user.email t@t.co && git config user.name t', d)
  process.chdir(d)
  const r = new WorktreeManager({ cwd: d }).cleanup('tc')
  assertTrue(r.result === 'skipped', `无 meta 无目录 → skipped（实际: ${r.result}）`)
  assertTrue(r.mode === null && r.details.length === 0, 'mode=null，details 空')
  process.chdir(os.tmpdir()); try { fs.rmSync(d, { recursive: true, force: true }) } catch {}
}

console.log('--- ⑥ in-place-fallback：保护不触发（不拦），只清 meta，主工作区保留 ---')
{
  const d = setupRepo(); const base = rev('git rev-parse HEAD', d)
  const metaDir = path.join(d, '.sillyspec', '.runtime', 'worktrees', 'tc')
  fs.writeFileSync(path.join(metaDir, 'meta.json'), JSON.stringify({
    name_zh: 'meta', changeName: 'tc', branch: 'sillyspec/tc', baseBranch: 'master',
    baseHash: base, baselineHash: 'x', baselineCommit: null,
    worktreePath: d, mode: 'in-place-fallback', baselineFiles: [],
  }))
  fs.writeFileSync(path.join(d, 'inplace-new.txt'), 'dirty\n') // 主工作区未提交改动
  const r = wtCleanup(d)
  assertTrue(r.result === 'cleaned', `in-place 无 force → cleaned（保护由 hasUnappliedChanges 内部跳过，实际: ${r.result}）`)
  assertTrue(fs.existsSync(d) && fs.existsSync(path.join(d, 'inplace-new.txt')), '主工作区目录与改动保留（cleanup 不碰主工作区）')
  assertTrue(!fs.existsSync(metaDir), 'meta 目录已清（in-place 只清 meta）')
  cleanup(d)
}

console.log(`\n${'='.repeat(50)}`)
console.log(`✅ 通过: ${passed}  ❌ 失败: ${failed}`)
if (failures.length > 0) { console.log('失败项:'); failures.forEach(f => console.log(`  - ${f}`)) }
console.log('='.repeat(50))
if (failed > 0) process.exit(1)
