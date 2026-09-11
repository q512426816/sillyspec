/**
 * 跨仓 worktree 三护（2026-09-12 驾驭第十三批，用户实证三连）：
 * ① 主仓清理面守卫（坑 cross-worktree-swept-by-main-cleanup）：safeRemoveWorktreeDir 对
 *    isCross meta / <change>--<repoKey> 命名形态目录拒绝删除；显式路径（allowCross）放行
 * ② 跨仓仓跳过 dirty baseline checkpoint（坑 cross-baseline-checkpoint-foreign-files）：
 *    ensureCrossWorktrees 不再把跨仓主副本在途文件（含并行会话外来 pptx/meta.json）固化进分支
 * ③ 门禁快照环境目录链接面（坑 gate-snapshot-env-mismatch）：venv 族 junction 进快照
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { spawnSync } from 'node:child_process'
import { safeRemoveWorktreeDir, isCrossWorktreeDir } from '../src/worktree.js'
import { ensureCrossWorktrees } from '../src/worktree-cross.js'
import { createGateSnapshot } from '../src/run/gate-snapshot.js'

const tmpRoots = []
function mk(p) { const d = mkdtempSync(join(tmpdir(), p)); tmpRoots.push(d); return d }
test.after(() => { for (const d of tmpRoots) { try { rmSync(d, { recursive: true, force: true }) } catch {} } })

function git(dir, args) {
  const r = spawnSync('git', args, { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  if (r.status !== 0) throw new Error(`git ${args.join(' ')}: ${r.stderr}`)
  return r.stdout.trim()
}

// ── ① 守卫 ──
test('isCrossWorktreeDir：isCross meta 与 <change>--<repoKey> 命名双判据', () => {
  const root = mk('xguard-')
  // 判据 A：meta.json isCross:true
  const byMeta = join(root, '2026-09-12-x')
  mkdirSync(byMeta, { recursive: true })
  writeFileSync(join(byMeta, 'meta.json'), JSON.stringify({ changeName: 'c', repoKey: 'hub', isCross: true }))
  assert.equal(isCrossWorktreeDir(byMeta), true, 'isCross meta → 跨仓')
  // 判据 B：命名形态（无 meta）
  const byName = join(root, '2026-09-12-x--platform')
  mkdirSync(byName, { recursive: true })
  assert.equal(isCrossWorktreeDir(byName), true, '<change>--<repoKey> 命名 → 跨仓')
  // 反例：主仓 worktree（纯 change 名 + 非 cross meta）
  const mainWt = join(root, '2026-09-12-x2')
  mkdirSync(mainWt, { recursive: true })
  writeFileSync(join(mainWt, 'meta.json'), JSON.stringify({ changeName: '2026-09-12-x2' }))
  assert.equal(isCrossWorktreeDir(mainWt), false, '主仓 worktree 不误判')
})

test('safeRemoveWorktreeDir：跨仓目录默认拒删、allowCross 放行；主仓目录照删', () => {
  const root = mk('xrm-')
  const cross = join(root, '2026-09-12-y--hub')
  mkdirSync(cross, { recursive: true })
  writeFileSync(join(cross, 'meta.json'), JSON.stringify({ isCross: true }))
  assert.throws(() => safeRemoveWorktreeDir(cross), /跨仓 worktree 拒绝删除/, '主仓清理面拒删跨仓')
  assert.ok(existsSync(cross), '目录未被动')
  safeRemoveWorktreeDir(cross, null, { allowCross: true })
  assert.ok(!existsSync(cross), '显式路径（allowCross）可清')

  const mainWt = join(root, '2026-09-12-y')
  mkdirSync(mainWt, { recursive: true })
  safeRemoveWorktreeDir(mainWt)
  assert.ok(!existsSync(mainWt), '主仓 worktree 删除零回归')
})

// ── ② 跨仓跳过 checkpoint（端到端：外来文件不进分支） ──
test('ensureCrossWorktrees：跨仓主副本在途外来文件（pptx/meta.json）不进跨仓分支', () => {
  const mainRepo = mk('xck-main-')
  const crossRepo = mk('xck-cross-')
  for (const d of [mainRepo, crossRepo]) {
    git(d, ['init', '-q']); git(d, ['config', 'user.email', 't@t.local']); git(d, ['config', 'user.name', 't'])
  }
  writeFileSync(join(crossRepo, 'code.py'), 'x = 1\n')
  git(crossRepo, ['add', '.']); git(crossRepo, ['commit', '-q', '-m', 'init'])
  const crossHead = git(crossRepo, ['rev-parse', 'HEAD'])
  // 跨仓主副本在途：并行会话外来文件（不 commit）
  writeFileSync(join(crossRepo, 'foreign-a.pptx'), 'pptx-bytes')
  writeFileSync(join(crossRepo, 'foreign-b.pptx'), 'pptx-bytes2')
  writeFileSync(join(crossRepo, 'meta.json'), '{"foreign": true}')

  // 主仓 spec：plan.md 声明跨仓 repo（aggregateDeclaredRepos 读 frontmatter repo: 键）+ local.yaml 注册
  const specBase = join(mainRepo, '.sillyspec')
  const changeDir = join(specBase, 'changes', '2026-09-12-ck')
  mkdirSync(changeDir, { recursive: true })
  writeFileSync(join(changeDir, 'plan.md'), [
    '# Plan',
    '',
    '## Wave 1',
    '',
    '- task-01',
    '',
  ].join('\n') + '\n')
  mkdirSync(join(changeDir, 'tasks'), { recursive: true })
  writeFileSync(join(changeDir, 'tasks', 'task-01.md'),
    '---\nid: task-01\nrepo: hub\nallowed_paths:\n  - hubfile.py\n---\n\n# task-01\n')
  writeFileSync(join(specBase, 'local.yaml'), `repos:\n  hub: ${crossRepo.replace(/\\/g, '/')}\n`)

  const r = ensureCrossWorktrees({ cwd: mainRepo, changeName: '2026-09-12-ck', specBase })
  assert.equal(r.created.length, 1, '跨仓 worktree 创建')
  const wtPath = r.created[0].worktreePath
  // 分支 HEAD == 跨仓仓 HEAD（无 checkpoint commit）——外来文件不在分支
  const wtHead = git(wtPath, ['rev-parse', 'HEAD'])
  assert.equal(wtHead, crossHead, '无 baseline checkpoint commit（锚点=跨仓仓 HEAD）')
  const tree = git(wtPath, ['ls-files'])
  assert.ok(!tree.includes('pptx') && !tree.includes('meta.json'), `外来文件不在分支（tree: ${tree.replace(/\n/g, ',')}）`)
  // meta 记录 baselineFiles=[]
  const meta = JSON.parse(readFileSync(join(wtPath, 'meta.json'), 'utf8'))
  assert.deepEqual(meta.baselineFiles, [], 'meta.baselineFiles=[] 显式记录')
  // 清理（跨仓显式路径）
  git(wtPath, ['checkout', '-q', '--', '.']) // worktree 内可能有未跟踪残留，先复位
  git(crossRepo, ['worktree', 'remove', '--force', wtPath])
})

// ── ③ 快照 venv 链接 ──
test('createGateSnapshot：venv 族目录 junction 进快照（dev 依赖同源不缺）', () => {
  const proj = mk('xenv-')
  git(proj, ['init', '-q']); git(proj, ['config', 'user.email', 't@t.local']); git(proj, ['config', 'user.name', 't'])
  writeFileSync(join(proj, '.gitignore'), '.sillyspec/\nnode_modules/\n.venv/\n')
  writeFileSync(join(proj, 'app.py'), 'x = 1\n')
  git(proj, ['add', '.']); git(proj, ['commit', '-q', '-m', 'init'])
  // 主仓 venv（含 dev 依赖标记文件）
  mkdirSync(join(proj, '.venv', 'Lib', 'site-packages'), { recursive: true })
  writeFileSync(join(proj, '.venv', 'Lib', 'site-packages', 'xdist-marker.txt'), 'dev-deps-here')

  const snap = createGateSnapshot({ cwd: proj, files: ['app.py'] })
  assert.ok(snap, '快照创建')
  try {
    const marker = join(snap.snapshotRoot, '.venv', 'Lib', 'site-packages', 'xdist-marker.txt')
    assert.ok(existsSync(marker), 'venv 经 junction 可达（dev 依赖同源）')
  } finally { snap.cleanup() }
})
