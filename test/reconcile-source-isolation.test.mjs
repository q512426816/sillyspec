/**
 * reconcile-source-isolation.test.mjs — 对账源隔离（2026-09-26-reconcile-source-isolation）
 *
 * 覆盖验收面（R18-SF-full 实证：非约定分支名 → B1 猜不中 → agent「暂存物化」自救被并行
 * 会话裸提交扫走 → matched=0 死循环）：
 *   ① meta 分支锚点兜底：sillyspec/<change> 与审计 tag 均落空时，扫 worktrees meta 按
 *      changeName 键匹配取真实 branch 作 diffRef（sources 记 meta-branch）；
 *   ② 死锁诊断：post-apply 形态 actual 源全空时 parallelAdvanceHint 在场（指明形态+禁物化
 *      自救+安全出路），带文件面时不误报。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const { resolveReconcileActualFiles } = await import(pathToFileURL(join(ROOT, 'src/verify-postcheck.js')).href)

function makeRepo() {
  const cwd = mkdtempSync(join(tmpdir(), 'rsi-'))
  const g = (a) => execFileSync('git', a, { cwd, stdio: 'pipe', encoding: 'utf8' })
  g(['init', '-q', '-b', 'main']); g(['config', 'user.email', 't@t']); g(['config', 'user.name', 't'])
  writeFileSync(join(cwd, 'base.txt'), 'b\n')
  g(['add', '.']); g(['commit', '-qm', 'b'])
  return { cwd, g }
}

test('① meta 分支锚点兜底：非约定分支名经 worktree meta 的 changeName 键命中', () => {
  const { cwd, g } = makeRepo()
  try {
    // R18 形态：非约定命名分支锚住基线（merge-base 锚定语义：分叉点=变更基线），
    // apply 已发生（main 侧已有变更提交）——diff merge-base..HEAD 应取到主仓前进面
    writeFileSync(join(cwd, 'impl1.js'), 'a\n')
    g(['add', 'impl1.js']); g(['commit', '-qm', 'impl1'])
    const h1 = g(['rev-parse', 'HEAD']).trim()
    g(['branch', 'r18/sf-full', h1]) // 分支指基线（worktree meta 记录的真实分支名）
    writeFileSync(join(cwd, 'impl2.js'), 'b\n')
    g(['add', 'impl2.js']); g(['commit', '-qm', 'impl2'])
    // worktree meta：changeName 键匹配 + branch 指真实分支（sillyspec/<change> 与审计 tag 均不在）
    const sb = join(cwd, '.sillyspec')
    const rt = join(sb, '.runtime')
    const wtDir = join(rt, 'worktrees', 'anything-else')
    mkdirSync(wtDir, { recursive: true })
    writeFileSync(join(wtDir, 'meta.json'), JSON.stringify({ changeName: 'c-x', branch: 'r18/sf-full', worktreePath: '/nonexistent', mode: 'native-worktree' }))
    const r = resolveReconcileActualFiles({ cwd, specBase: sb, runtimeRoot: rt, changeName: 'c-x' })
    assert.equal(r.form, 'post-apply', 'meta 的 worktreePath 不存在 → 形态 B')
    assert.ok(r.sources.some((s) => s.startsWith('main:diff-merge-base(meta-branch:r18/sf-full)')), `B1 应经 meta 分支锚定（sources=${JSON.stringify(r.sources)}）`)
    assert.ok(r.files.includes('impl2.js'), `diff 面应含基线后前进文件（实际 ${JSON.stringify(r.files)}）`)
  } finally { rmSync(cwd, { recursive: true, force: true }) }
})

test('② 死锁诊断：post-apply 源全空 → parallelAdvanceHint（禁物化自救+出路）；有文件面不误报', () => {
  const { cwd, g } = makeRepo()
  try {
    // 场景 a：无任何锚点（无 sillyspec/c-x 分支无 tag 无 meta）、主仓干净 → 源全空
    const sb = join(cwd, '.sillyspec')
    const rt = join(sb, '.runtime')
    mkdirSync(rt, { recursive: true })
    const a = resolveReconcileActualFiles({ cwd, specBase: sb, runtimeRoot: rt, changeName: 'c-x' })
    assert.equal(a.form, 'post-apply')
    assert.ok(a.parallelAdvanceHint, '源全空应出诊断')
    assert.ok(/并行会话推进/.test(a.parallelAdvanceHint) && /暂存物化/.test(a.parallelAdvanceHint), '诊断含形态说明与禁物化')
    // 场景 b：工作树有文件（porcelain 有行）→ 不误报
    writeFileSync(join(cwd, 'wip.js'), 'w\n')
    const b = resolveReconcileActualFiles({ cwd, specBase: sb, runtimeRoot: rt, changeName: 'c-x' })
    assert.ok(!b.parallelAdvanceHint, '有未提交面不误报')
  } finally { rmSync(cwd, { recursive: true, force: true }) }
})
