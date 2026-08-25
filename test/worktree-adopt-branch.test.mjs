/**
 * worktree --adopt-branch 收编测试（坑 worktree-user-branch-conflict，2026-08-24 用户反馈五期①：
 * 「用户要求在指定分支上做」与 execute worktree 机制直接冲突——同名分支报错、修复建议误导删分支）。
 *
 * 锁定语义：
 *   1. 同名分支已存在且未带 flag → 决策菜单报错（三选一：删遗留 / --adopt-branch 收编 / 换名），不盲删
 *   2. --adopt-branch → 检出既有分支为工作分支；baseline = 分支 HEAD（存量不计交付 diff）；
 *      meta.adoptedBranch 留审计；hasUnappliedChanges 起始 false
 *   3. 幽灵 worktree 目录清理不再盲删同名分支（分支保留，走菜单处置）
 *   4. 收编后子代理新改动正常计入交付 diff（hasUnappliedChanges 变 true）
 */
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync, existsSync, unlinkSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { spawnSync } from 'node:child_process'

import { WorktreeManager } from '../src/worktree.js'

let passed = 0
let failed = 0

function assert(cond, msg) {
  if (cond) { console.log(`  ✅ PASS: ${msg}`); passed++ }
  else { console.log(`  ❌ FAIL: ${msg}`); failed++ }
}

function git(dir, args) {
  const r = spawnSync('git', args, { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  return { code: r.status, out: (r.stdout || '') + (r.stderr || '') }
}

function makeRepo() {
  const d = mkdtempSync(join(tmpdir(), 'ab-'))
  git(d, ['init', '-q', '-b', 'main'])
  git(d, ['config', 'user.email', 't@t.local'])
  git(d, ['config', 'user.name', 't'])
  writeFileSync(join(d, '.gitignore'), '.sillyspec/\n')
  writeFileSync(join(d, 'base.js'), 'base\n')
  git(d, ['add', '.'])
  git(d, ['commit', '-q', '-m', 'base'])
  return d
}

/** 模拟「用户指定分支」：建 sillyspec/<change> 并带一笔独有提交 */
function makeUserBranch(d, changeName) {
  git(d, ['checkout', '-q', '-b', `sillyspec/${changeName}`])
  writeFileSync(join(d, 'user-branch-work.js'), 'user pre-existing branch content\n')
  git(d, ['add', '.'])
  git(d, ['commit', '-q', '-m', 'user branch work'])
  const head = git(d, ['rev-parse', 'HEAD']).out.trim()
  git(d, ['checkout', '-q', 'main'])
  return head
}

console.log('--- 1. 同名分支已存在（无 flag）→ 决策菜单，不盲删 ---')
{
  const d = makeRepo()
  const cn = 'tc'
  makeUserBranch(d, cn)
  const wm = new WorktreeManager({ cwd: d })
  let err = null
  try { wm.create(cn) } catch (e) { err = e }
  assert(err !== null, 'create 抛错')
  const msg = String(err && err.message || '')
  assert(msg.includes('--adopt-branch'), '菜单给出收编出路（--adopt-branch）')
  assert(msg.includes('git branch -D') && msg.includes('遗留分支'), '菜单区分遗留分支（人工确认后才删）')
  assert(msg.includes('换变更名'), '菜单给第三条出路')
  assert(git(d, ['branch', '--list', `sillyspec/${cn}`]).out.includes(cn), '用户分支未被触碰（保留）')
  rmSync(d, { recursive: true, force: true })
}

console.log('--- 2. --adopt-branch 收编：检出既有分支，baseline=分支 HEAD ---')
{
  const d = makeRepo()
  const cn = 'tc'
  const branchHead = makeUserBranch(d, cn)
  const wm = new WorktreeManager({ cwd: d })
  const r = wm.create(cn, { adoptBranch: true })
  const wt = r.worktreePath
  assert(git(wt, ['branch', '--show-current']).out.trim() === `sillyspec/${cn}`, 'worktree 检出在用户分支上')
  assert(readFileSync(join(wt, 'user-branch-work.js'), 'utf8').includes('user pre-existing'), '分支既有内容在 worktree 可见')
  const meta = wm.getMeta(cn)
  assert(meta.adoptedBranch === true, 'meta.adoptedBranch 审计标记')
  assert(meta.baselineCommit === branchHead, `baselineCommit = 分支 HEAD（实际 ${meta.baselineCommit}）`)
  assert(meta.baseHash === branchHead, 'baseHash = 分支 HEAD')
  // 分支存量不计交付 diff：刚收编（未做新改动）→ hasUnappliedChanges false
  const chk = wm.hasUnappliedChanges(cn)
  assert(chk.hasChanges === false, `分支存量不算交付（hasChanges=false，实际 ${JSON.stringify(chk).slice(0, 120)}）`)
  // 子代理新改动后 → 正常计入
  writeFileSync(join(wt, 'new-work.js'), 'subagent new work\n')
  const chk2 = wm.hasUnappliedChanges(cn)
  assert(chk2.hasChanges === true, '收编后新改动正常计入交付 diff')
  rmSync(d, { recursive: true, force: true })
}

console.log('--- 3. 幽灵 worktree 目录：清理不盲删同名分支 ---')
{
  const d = makeRepo()
  const cn = 'tc'
  makeUserBranch(d, cn)
  const wm = new WorktreeManager({ cwd: d })
  // 模拟幽灵：worktree 目录存在但无 meta.json、无未提交改动
  const ghostDir = join(wm.worktreeBase, cn)
  mkdirSync(ghostDir, { recursive: true })
  writeFileSync(join(ghostDir, 'placeholder.txt'), 'clean\n') // 已提交？未跟踪但无「未提交改动」判定——status 会列 untracked → 拒绝清理。留空目录更贴近。
  unlinkSync(join(ghostDir, 'placeholder.txt'))
  let err = null
  try { wm.create(cn) } catch (e) { err = e }
  // 幽灵清理（prune）后落在分支检查 → 菜单报错；关键是分支没被盲删
  assert(err !== null && String(err.message).includes('--adopt-branch'), '幽灵场景最终落分支菜单报错')
  assert(git(d, ['branch', '--list', `sillyspec/${cn}`]).out.includes(cn), '幽灵清理不再盲删分支（旧代码此处会 branch -D）')
  assert(!existsSync(ghostDir), '幽灵目录本身已清')
  rmSync(d, { recursive: true, force: true })
}

console.log('--- 4. 正常路径零回归：无同名分支时 create 照旧 -b 新分支 ---')
{
  const d = makeRepo()
  const cn = 'fresh'
  const wm = new WorktreeManager({ cwd: d })
  const r = wm.create(cn)
  const meta = wm.getMeta(cn)
  assert(r.branch === `sillyspec/${cn}` && !meta.adoptedBranch, '常规创建不受影响（无 adoptedBranch 标记）')
  assert(git(r.worktreePath, ['branch', '--show-current']).out.trim() === `sillyspec/${cn}`, '新分支检出正常')
  rmSync(d, { recursive: true, force: true })
}

console.log('--- 5. native-worktree cleanup --force 不删用户自己的分支 ---')
{
  const d = makeRepo()
  const cn = 'native'
  // 模拟 native-worktree meta：branch 记的是用户自己的检出分支（非 sillyspec/ 前缀也可）
  const userBranch = 'my-own-branch'
  git(d, ['branch', userBranch])
  const wm = new WorktreeManager({ cwd: d })
  const metaDir = join(wm.worktreeBase, cn)
  mkdirSync(metaDir, { recursive: true })
  writeFileSync(join(metaDir, 'meta.json'), JSON.stringify({
    changeName: cn, worktreePath: join(d, 'external-wt'), mode: 'native-worktree',
    branch: userBranch, baseHash: git(d, ['rev-parse', 'HEAD']).out.trim(),
    createdAt: new Date().toISOString(),
  }))
  const r = wm.cleanup(cn, { force: true })
  assert(git(d, ['branch', '--list', userBranch]).out.includes(userBranch), 'native-worktree 的用户分支 force 也不删')
  assert((r.details || []).some(x => String(x).includes('用户自己的检出分支')), 'details 注明保留原因')
  rmSync(d, { recursive: true, force: true })
}

console.log(`\n合计: ${passed} 通过, ${failed} 失败`)
process.exit(failed > 0 ? 1 : 0)
