/**
 * 跨仓对账锚点 B' 档回归锁（2026-10-09-verify-reuse-friction FR-07）。
 *
 * 2026-10-09 取证：跨仓交付面在 worktree（verify 常跑在 apply 前），原 B 档
 * HEAD~1..HEAD 只看跨仓主副本最近一笔提交——对 worktree 多笔交付是假信号（声明 4 实测 0）。
 * 修复：worktree meta.baseHash 在场时用 baseline..工作树 全量窗口（多笔提交+未提交）；
 * meta 缺失回退 B 档（不回退语义）。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, isAbsolute } from 'node:path'
import { tmpdir } from 'node:os'
import { execSync } from 'node:child_process'
import { collectRepoActual } from '../src/cross-repo-reconcile.js'

function git(dir, args) {
  return execSync(['git', ...args].join(' '), { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
}

function fixture() {
  const main = mkdtempSync(join(tmpdir(), 'crba-main-'))
  const cross = mkdtempSync(join(tmpdir(), 'crba-cross-'))
  const specBase = join(main, '.sillyspec')
  mkdirSync(join(specBase, 'changes', 'c1'), { recursive: true })
  git(cross, ['init -q'])
  git(cross, ['config user.email t@t.local'])
  git(cross, ['config user.name t'])
  writeFileSync(join(cross, 'README.md'), 'init\n')
  git(cross, ['add -A'])
  git(cross, ['commit -qm init'])
  const baseHash = execSync('git rev-parse HEAD', { cwd: cross, encoding: 'utf8' }).trim()
  writeFileSync(join(specBase, 'local.yaml'), 'repos:' + '\n' + '  crossrepo: ' + (isAbsolute(cross) ? cross.split('\\').join('/') : cross) + '\n')
  return { main, cross, specBase, baseHash }
}

function makeCrossWorktree({ specBase, cross, change, baseHash }) {
  // 跨仓 worktree：按 crossWorktreePath 公式落位 + meta.json（baseHash 基线锚）
  const wt = join(specBase, '.runtime', 'worktrees', change + '--crossrepo')
  mkdirSync(join(specBase, '.runtime', 'worktrees'), { recursive: true })
  execSync(['git', 'worktree', 'add', '--detach', JSON.stringify(wt), 'HEAD'].join(' '), { cwd: cross, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  writeFileSync(join(wt, 'meta.json'), JSON.stringify({ baseHash }))
  return wt
}

test("B' 档：worktree meta.baseHash 在场 → baseline..工作树 全量窗口（多笔提交全覆盖）", () => {
  const f = fixture()
  try {
    const wt = makeCrossWorktree({ specBase: f.specBase, cross: f.cross, change: 'c1', baseHash: f.baseHash })
    // worktree 内两笔提交（多笔交付——B 档只看最近一笔必漏第一笔）
    mkdirSync(join(wt, 'src'), { recursive: true })
    writeFileSync(join(wt, 'src', 'one.js'), 'export const a = 1\n')
    git(wt, ['add -A'])
    git(wt, ['commit -qm first'])
    writeFileSync(join(wt, 'src', 'two.js'), 'export const b = 2\n')
    git(wt, ['add -A'])
    git(wt, ['commit -qm second'])
    // 未提交改动也在窗口内
    writeFileSync(join(wt, 'src', 'three.js'), 'export const c = 3\n')
    const r = collectRepoActual({ repoKey: 'crossrepo', specBase: f.specBase, cwd: f.main, changeName: 'c1' })
    assert.equal(r.anchor.source, 'worktree-baseline-window', `锚点档=B'（实得 ${r.anchor.source}）`)
    assert.ok(r.files.includes('src/one.js'), '第一笔提交文件在窗口（B 档必漏——HEAD~1..HEAD 只看最近一笔）')
    assert.ok(r.files.includes('src/two.js'), '第二笔提交文件在窗口')
    assert.ok(r.files.includes('src/three.js'), '未提交改动在窗口')
    assert.ok(!r.files.includes('meta.json'), 'meta.json 不进交付面')
  } finally {
    try { execSync('git worktree remove --force ' + JSON.stringify(join(f.specBase, '.runtime', 'worktrees', 'c1--crossrepo')), { cwd: f.cross, stdio: 'ignore' }) } catch {}
    try { rmSync(f.main, { recursive: true, force: true }) } catch {}
    try { rmSync(f.cross, { recursive: true, force: true }) } catch {}
  }
})

test('回退链：worktree/meta 缺席 → B 档 HEAD~1..HEAD 现行窗口（不回退语义）', () => {
  const f = fixture()
  try {
    // 跨仓主副本一笔提交（无 worktree）
    writeFileSync(join(f.cross, 'src-latest.js'), 'x\n')
    git(f.cross, ['add -A'])
    git(f.cross, ['commit -qm latest'])
    const r = collectRepoActual({ repoKey: 'crossrepo', specBase: f.specBase, cwd: f.main, changeName: 'c1' })
    assert.equal(r.anchor.source, 'head~1-window', `锚点档=B（实得 ${r.anchor.source}）`)
    assert.ok(r.files.includes('src-latest.js'), '最近一笔提交文件在窗口')
  } finally {
    try { rmSync(f.main, { recursive: true, force: true }) } catch {}
    try { rmSync(f.cross, { recursive: true, force: true }) } catch {}
  }
})
