/**
 * wt-commit 跨仓 worktree 识别回归锁（2026-10-09-verify-reuse-friction FR-08 / D-006@v1）。
 *
 * 2026-10-09 取证：cwd 推断正则把跨仓 worktree 名 <change>--<repoKey> 整段当变更名 →
 * 永远匹配不上；runWtCommit 按名反查主仓 worktree 命名域 → 跨仓目录必落「worktree 不存在」。
 * 修复：推断经注册表校验剥后缀（不猜切分；全段命中已知变更不剥）；提交目标按「cwd 所在
 * worktree 目录事实」定向（跨仓 <change>--<repoKey> 通吃）。
 *
 * 推断逻辑内嵌 index.js dispatch（重量级 CLI 入口），本测试直测 runWtCommit 目标定向
 * （真 worktree 提交回环）+ 剥后缀判定的文件系统面（specBaseGuess/changes 存在性语义）。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs'
import { join, isAbsolute } from 'node:path'
import { tmpdir } from 'node:os'
import { execSync } from 'node:child_process'
import { runWtCommit } from '../src/wt-commit.js'

function git(dir, args) { return execSync(['git', ...args].join(' '), { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }) }

function fixture() {
  const main = mkdtempSync(join(tmpdir(), 'wtci-main-'))
  const specBase = join(main, '.sillyspec')
  mkdirSync(join(specBase, 'changes', '2026-10-09-x', 'tasks'), { recursive: true })
  mkdirSync(join(specBase, '.runtime', 'worktrees'), { recursive: true })
  git(main, ['init -q'])
  git(main, ['config user.email t@t.local'])
  git(main, ['config user.name t'])
  writeFileSync(join(main, 'README.md'), 'init\n')
  git(main, ['add -A'])
  git(main, ['commit -qm init'])
  // 跨仓仓 + 注册表
  const cross = mkdtempSync(join(tmpdir(), 'wtci-cross-'))
  git(cross, ['init -q'])
  git(cross, ['config user.email t@t.local'])
  git(cross, ['config user.name t'])
  writeFileSync(join(cross, 'README.md'), 'init\n')
  git(cross, ['add -A'])
  git(cross, ['commit -qm init'])
  writeFileSync(join(specBase, 'local.yaml'), 'repos:' + '\n' + '  crossrepo: ' + (isAbsolute(cross) ? cross.split('\\').join('/') : cross) + '\n')
  return { main, cross, specBase }
}

test('runWtCommit：cwd 在跨仓 worktree（<change>--<注册repoKey>）内 → 目标=该 worktree，提交回环', async () => {
  const f = fixture()
  const wt = join(f.specBase, '.runtime', 'worktrees', '2026-10-09-x--crossrepo')
  try {
    execSync(['git', 'worktree', 'add', '--detach', JSON.stringify(wt), 'HEAD'].join(' '), { cwd: f.cross, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
    writeFileSync(join(wt, 'src', 'delivered.js'), '') // 占位防误写——下一行先建目录
  } catch { /* 首写无目录预期失败，走下面正式建 */ }
  try {
    mkdirSync(join(wt, 'src'), { recursive: true })
    writeFileSync(join(wt, 'src', 'delivered.js'), 'export const x = 1\n')
    const r = await runWtCommit({ changeName: '2026-10-09-x', message: 'task-01 跨仓交付', pathspecs: ['src/delivered.js'], cwd: wt })
    assert.ok(!r.skipped, '有变更不跳过')
    const headFiles = execSync('git show --name-only --format= HEAD', { cwd: wt, encoding: 'utf8' }).trim()
    assert.ok(headFiles.includes('src/delivered.js'), '提交落在跨仓 worktree（目标定向=目录事实）')
  } finally {
    try { execSync('git worktree remove --force ' + JSON.stringify(wt), { cwd: f.cross, stdio: 'ignore' }) } catch {}
    try { rmSync(f.main, { recursive: true, force: true }) } catch {}
    try { rmSync(f.cross, { recursive: true, force: true }) } catch {}
  }
})

test('runWtCommit：cwd 不属于本变更的 worktree（他变更目录）→ 不吞并，走原名路径报错', async () => {
  const f = fixture()
  const wt = join(f.specBase, '.runtime', 'worktrees', 'other-change--crossrepo')
  try {
    execSync(['git', 'worktree', 'add', '--detach', JSON.stringify(wt), 'HEAD'].join(' '), { cwd: f.cross, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
    await assert.rejects(
      () => runWtCommit({ changeName: '2026-10-09-x', message: 'm', pathspecs: ['src/a.js'], cwd: wt }),
      (e) => /worktree 不存在/.test(String(e.message)),
      'cwd 属他变更 worktree → 拒绝定向并按原名报「worktree 不存在」（不误吞他变更目录）')
  } finally {
    try { execSync('git worktree remove --force ' + JSON.stringify(wt), { cwd: f.cross, stdio: 'ignore' }) } catch {}
    try { rmSync(f.main, { recursive: true, force: true }) } catch {}
    try { rmSync(f.cross, { recursive: true, force: true }) } catch {}
  }
})

test('推断三态：注册 repoKey 剥后缀 / 全段命中已知变更不剥 / 未注册不剥（D-006@v1 直测）', async () => {
  const { inferChangeFromWorktreeCwd } = await import('../src/wt-commit.js')
  const main = mkdtempSync(join(tmpdir(), 'wtci3-main-'))
  const cross = mkdtempSync(join(tmpdir(), 'wtci3-cross-'))
  try {
    const specBase = join(main, '.sillyspec')
    mkdirSync(join(specBase, 'changes', '2026-10-09-x', 'tasks'), { recursive: true })
    // 真实同名陷阱：变更真名恰以 --crossrepo 结尾
    mkdirSync(join(specBase, 'changes', '2026-10-09-y--crossrepo'), { recursive: true })
    mkdirSync(join(specBase, '.runtime', 'worktrees', '2026-10-09-x--crossrepo', 'deep'), { recursive: true })
    mkdirSync(join(specBase, '.runtime', 'worktrees', '2026-10-09-y--crossrepo'), { recursive: true })
    mkdirSync(join(specBase, '.runtime', 'worktrees', '2026-10-09-z--unknownrepo'), { recursive: true })
    writeFileSync(join(specBase, 'local.yaml'), 'repos:' + '\n' + '  crossrepo: ' + (isAbsolute(cross) ? cross.split('\\').join('/') : cross) + '\n')
    // ① 注册 repoKey + 剥出候选是已知变更 → 剥
    assert.equal(await inferChangeFromWorktreeCwd(join(specBase, '.runtime', 'worktrees', '2026-10-09-x--crossrepo', 'deep', 'file.js')), '2026-10-09-x', '注册后缀剥除（深路径也命中——推断按目录段不问深度）')
    // ② 全段命中已知变更（变更真名恰含 --crossrepo）→ 不剥
    assert.equal(await inferChangeFromWorktreeCwd(join(specBase, '.runtime', 'worktrees', '2026-10-09-y--crossrepo', 'f.js')), '2026-10-09-y--crossrepo', '全段命中已知变更不剥（防真名误拆）')
    // ③ 后缀未注册 → 不剥（原样透传）
    assert.equal(await inferChangeFromWorktreeCwd(join(specBase, '.runtime', 'worktrees', '2026-10-09-z--unknownrepo', 'f.js')), '2026-10-09-z--unknownrepo', '未注册后缀不剥（现状透传，调用方自然报错引导显式 --change）')
  } finally {
    try { rmSync(main, { recursive: true, force: true }) } catch {}
    try { rmSync(cross, { recursive: true, force: true }) } catch {}
  }
})
