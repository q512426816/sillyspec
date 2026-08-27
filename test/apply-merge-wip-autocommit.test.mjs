/**
 * applyByMerge 自动 commit worktree WIP（坑 apply-merge-uncommitted-noop，2026-08-28 用户实证）：
 * 子代理默认不 commit，分支 tip 只有 baseline checkpoint → git merge 空转、交付零落地，
 * 落地校验报错后只能手工 cherry-pick/cp。修复：merge 前自动把未提交交付物 pathspec commit 到分支。
 *
 * 场景：worktree 内未提交（新文件 + 修改文件）→ applyByMerge → 自动 commit + merge 落地主仓 HEAD。
 */
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { spawnSync } from 'node:child_process'

import { WorktreeManager } from '../src/worktree.js'
import { applyByMerge } from '../src/worktree-apply.js'

let passed = 0, failed = 0
const failures = []
function assert(cond, msg) {
  if (cond) { passed++; console.log(`  ✅ PASS: ${msg}`) }
  else { failed++; failures.push(msg); console.log(`  ❌ FAIL: ${msg}`) }
}
function git(dir, args) {
  const r = spawnSync('git', args, { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  if (r.status !== 0) throw new Error(`git ${args.join(' ')} failed: ${r.stderr}`)
  return r.stdout.trim()
}

const tmpRoots = []
function mkTmp(prefix) {
  const d = mkdtempSync(join(tmpdir(), `amw-${prefix}-`))
  tmpRoots.push(d)
  return d
}

console.log('=== applyByMerge：worktree WIP 自动 commit（merge 空转修复）===\n')
{
  const proj = mkTmp('proj')
  const specBase = join(proj, '.sillyspec')
  git(proj, ['init', '-q'])
  git(proj, ['config', 'user.email', 't@t.local'])
  git(proj, ['config', 'user.name', 't'])
  writeFileSync(join(proj, '.gitignore'), '.sillyspec/\n')
  // baseline：一个既有文件（worktree 里将修改它）
  mkdirSync(join(proj, 'src'), { recursive: true })
  writeFileSync(join(proj, 'src', 'keep.txt'), 'v1\n')
  git(proj, ['add', '.'])
  git(proj, ['commit', '-q', '-m', 'init'])
  const base = git(proj, ['rev-parse', 'HEAD'])

  // 标准 worktree 布局 + meta
  const wt = join(specBase, '.runtime', 'worktrees', 'amw1')
  git(proj, ['worktree', 'add', '-q', '-b', 'sillyspec/amw1', wt])
  writeFileSync(join(wt, 'meta.json'), JSON.stringify({
    branch: 'sillyspec/amw1', worktreePath: wt, baseHash: base, actualBaseHash: base,
    baselineCommit: base, mode: 'worktree', depsStatus: 'n/a',
  }))
  // 子代理形态：改了东西但【不 commit】——新文件 + 修改既有文件
  writeFileSync(join(wt, 'src', 'feature.py'), '# new feature\n')
  writeFileSync(join(wt, 'src', 'keep.txt'), 'v2 (worktree WIP)\n')

  const wm = new WorktreeManager({ cwd: proj })
  const result = {
    ok: false, merged: false, errors: [], warnings: [],
    changedFiles: ['src/feature.py', 'src/keep.txt'], deletedFiles: [], absentAfterMerge: [],
  }
  const out = applyByMerge(result, 'amw1', proj, wm, { keepConflicts: true })

  assert(out.ok === true && out.merged === true, `merge 成功（ok=${out.ok} merged=${out.merged}；errors=${JSON.stringify(out.errors)}）`)
  assert((out.warnings || []).some(w => w.includes('未提交交付文件') && w.includes('自动 commit')),
    'warning 记录自动 commit（可审计）')
  const landed = git(proj, ['cat-file', '-e', 'HEAD:src/feature.py']) !== '' || spawnSync('git', ['cat-file', '-e', 'HEAD:src/feature.py'], { cwd: proj }).status === 0
  assert(landed, '未提交的新文件经自动 commit + merge 落地主仓 HEAD')
  const headContent = spawnSync('git', ['show', 'HEAD:src/keep.txt'], { cwd: proj, encoding: 'utf8' }).stdout
  assert(headContent.includes('v2'), `未提交的修改内容落地（HEAD 内容=${JSON.stringify(headContent.trim())}）`)
  assert(!existsSync(wt) || !existsSync(join(wt, 'meta.json')), '成功后 cleanup（worktree/meta 清理）')
}

for (const d of tmpRoots) { try { rmSync(d, { recursive: true, force: true }) } catch {} }
console.log(`\n${'='.repeat(50)}`)
console.log(`✅ 通过: ${passed}  ❌ 失败: ${failed}`)
if (failures.length) console.log(`失败项: ${failures.join('; ')}`)
console.log('='.repeat(50))
process.exit(failed > 0 ? 1 : 0)
