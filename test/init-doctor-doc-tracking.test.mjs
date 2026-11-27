/**
 * 2026-11-27-changes-dir-platform-default FR-03 / FR-04（task-04 + task-05）：
 *   ① buildSillyspecIgnoreRules：生效值≠repo 追加 .sillyspec/changes/ 行；repo 不追加；既有规则恒在
 *   ② detectDocTrackingMigration：存量+未声明 → findings 含显式声明 repo 建议；显式声明/无存量/非 git 仓不触发
 *   ③ detectArchiveCommitResidue 残留检测语义回归（三值下 changes/ 面残留照样警告）
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const { buildSillyspecIgnoreRules } = await import('../src/init.js')
const { detectDocTrackingMigration, detectArchiveCommitResidue } = await import('../src/doctor-diagnostics.js')

const tmpRoots = []
function fx() { const d = mkdtempSync(join(tmpdir(), 'dtrk2-')); tmpRoots.push(d); return d }
function git(cwd, args) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
}
function initRepo(cwd) {
  git(cwd, ['init'])
  git(cwd, ['config', 'user.email', 't@t'])
  git(cwd, ['config', 'user.name', 't'])
}

test('FR-03① ignoreRules：platform/never 追加 changes 行、repo 不追加、既有规则恒在', () => {
  for (const v of ['platform', 'never']) {
    const rules = buildSillyspecIgnoreRules(v)
    assert.ok(rules.includes('.sillyspec/changes/'), `${v} 应含 changes 忽略行`)
    assert.ok(rules.includes('.sillyspec/local.yaml'), '既有规则恒在')
    assert.ok(rules.includes('.sillyspec/.runtime/'), '既有规则恒在')
  }
  const repoRules = buildSillyspecIgnoreRules('repo')
  assert.ok(!repoRules.includes('.sillyspec/changes/'), 'repo 值不写 changes 忽略行（写行会反向拦截入库）')
  assert.ok(repoRules.includes('.sillyspec/local.yaml'), '既有规则恒在')
})

test('FR-04② 迁移指引：存量+未声明触发 INFO 建议', () => {
  const cwd = fx(); initRepo(cwd)
  mkdirSync(join(cwd, '.sillyspec', 'changes', 'x'), { recursive: true })
  writeFileSync(join(cwd, '.sillyspec', 'changes', 'x', 'design.md'), 'd')
  mkdirSync(join(cwd, '.sillyspec'), { recursive: true })
  git(cwd, ['add', '.sillyspec'])
  git(cwd, ['commit', '-m', 'legacy'])
  const r = detectDocTrackingMigration(cwd)
  assert.equal(r.pass, true, 'advisory 不阻断')
  assert.ok(r.findings.join('\n').includes('changes.doc_tracking: repo'), 'findings 含显式声明建议')
})

test('FR-04② 显式声明不触发建议', () => {
  const cwd = fx(); initRepo(cwd)
  mkdirSync(join(cwd, '.sillyspec', 'changes', 'x'), { recursive: true })
  writeFileSync(join(cwd, '.sillyspec', 'changes', 'x', 'design.md'), 'd')
  mkdirSync(join(cwd, '.sillyspec'), { recursive: true })
  writeFileSync(join(cwd, '.sillyspec', 'local.yaml'), 'changes:\n  doc_tracking: repo\n')
  git(cwd, ['add', '.sillyspec'])
  git(cwd, ['commit', '-m', 'legacy'])
  const r = detectDocTrackingMigration(cwd)
  assert.ok(!r.findings.join('\n').includes('请在 .sillyspec/local.yaml 显式声明'), '显式声明不出建议')
})

test('FR-04② 无存量不触发建议', () => {
  const cwd = fx(); initRepo(cwd)
  writeFileSync(join(cwd, 'a.txt'), 'a')
  git(cwd, ['add', 'a.txt'])
  git(cwd, ['commit', '-m', 'init'])
  const r = detectDocTrackingMigration(cwd)
  assert.ok(!r.findings.join('\n').includes('请在 .sillyspec/local.yaml 显式声明'), '无存量不出建议')
})

test('FR-04③ 残留检测语义回归：platform 值下 changes 面暂存残留照样警告', () => {
  const cwd = fx(); initRepo(cwd)
  writeFileSync(join(cwd, 'a.txt'), 'a')
  mkdirSync(join(cwd, '.sillyspec'), { recursive: true })
  writeFileSync(join(cwd, '.sillyspec', 'local.yaml'), 'changes:\n  doc_tracking: platform\n')
  git(cwd, ['add', 'a.txt', '.sillyspec/local.yaml'])
  git(cwd, ['commit', '-m', 'init']) // HEAD 无 changes/
  // 模拟残留：暂存区出现归档侧条目（archive/z/ 未落 HEAD——检测只认归档侧，活跃侧暂存是
  // 进行中常态不算残留——评审 F1 既有口径，本断言钉「三值语义不变」）
  mkdirSync(join(cwd, '.sillyspec', 'changes', 'archive', 'z'), { recursive: true })
  writeFileSync(join(cwd, '.sillyspec', 'changes', 'archive', 'z', 'design.md'), 'd')
  git(cwd, ['add', '-f', '.sillyspec/changes/archive/z/design.md'])
  const r = detectArchiveCommitResidue(cwd)
  assert.equal(r.pass, false, '残留=警告（与 doc_tracking 值无关——不该有的东西在哪都是残留）')
  assert.equal(r.severity, 'warning')
})

test('后置清理', () => { for (const d of tmpRoots) rmSync(d, { recursive: true, force: true }) })
