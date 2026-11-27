/**
 * 2026-11-27-changes-dir-platform-default FR-02 / task-02+task-03：
 *   ① renderDocTrackingEpilogue 两段式文案（platform/never：changes/ 面单行说明+回退指引，
 *      knowledge/docs 面有暂存则保留落库指引、无暂存不出段；repo 值不走本函数——现行为）
 *   ② archiveNarrowedGitAdd docTracking 短路：platform/never 下 changes/archive 面不触 git add
 *      （无 ignored-fatal 告警面），knowledge/docs 面照常入暂存；repo（未传=兼容）现行为
 *   ③ readDocTrackingFromRepo：local.yaml 缺省/显式/非法值留痕
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const { renderDocTrackingEpilogue, archiveNarrowedGitAdd } = await import('../src/run/complete-handlers.js')
const { readDocTrackingFromRepo } = await import('../src/config-schema.js')

const tmpRoots = []
function fx() { const d = mkdtempSync(join(tmpdir(), 'doctrk-')); tmpRoots.push(d); return d }
function git(cwd, args) {
  return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
}
function initRepo(cwd) {
  git(cwd, ['init'])
  git(cwd, ['config', 'user.email', 't@t'])
  git(cwd, ['config', 'user.name', 't'])
  writeFileSync(join(cwd, '.gitignore'), 'node_modules/\n')
  git(cwd, ['add', '.gitignore'])
  git(cwd, ['commit', '-m', 'init'])
}

test('FR-02① platform/never：changes 面单行说明+回退指引，knowledge 面有暂存出指引段', () => {
  for (const v of ['platform', 'never']) {
    const out = renderDocTrackingEpilogue({
      docTracking: v,
      changeName: '2026-11-27-x',
      stagedKnowledgeCells: ['.sillyspec/knowledge/fr/cli.md', '.sillyspec/docs/modules/foo.md'],
    })
    assert.match(out, new RegExp(`📁 变更文档不入库（changes\\.doc_tracking=${v}）`), v)
    assert.match(out, /spec 以平台同步为准/, v)
    assert.match(out, /需入库请设 changes\.doc_tracking: repo/, v)
    assert.match(out, /git commit -m "chore\(archive\): 2026-11-27-x 归档蒸馏留档"/, v)
    assert.match(out, /-- \.sillyspec\/knowledge\/fr\/cli\.md \.sillyspec\/docs\/modules\/foo\.md/, v)
    assert.doesNotMatch(out, /🚨/, `changes 面不打 🚨（${v}）`)
  }
})

test('FR-02① knowledge 面无暂存不出指引段', () => {
  const out = renderDocTrackingEpilogue({ docTracking: 'platform', changeName: 'x', stagedKnowledgeCells: [] })
  assert.match(out, /📁 变更文档不入库/)
  assert.doesNotMatch(out, /git commit/)
  assert.doesNotMatch(out, /归档蒸馏留档/)
})

test('FR-02② archiveNarrowedGitAdd platform 短路：changes 面不入暂存、knowledge 面照常', () => {
  const cwd = fx(); initRepo(cwd)
  const destDir = join(cwd, '.sillyspec', 'changes', 'archive', '2026-11-27-x')
  mkdirSync(destDir, { recursive: true })
  writeFileSync(join(destDir, 'design.md'), '# spec')
  mkdirSync(join(cwd, '.sillyspec', 'knowledge', 'fr'), { recursive: true })
  writeFileSync(join(cwd, '.sillyspec', 'knowledge', 'fr', 'x.md'), 'x')

  const r = archiveNarrowedGitAdd({ cwd, specBase: join(cwd, '.sillyspec'), destDir, destName: '2026-11-27-x', extraDocs: [], docTracking: 'platform' })
  assert.ok(r, '返回结果存在')
  const staged = git(cwd, ['diff', '--cached', '--name-only']).split('\n').map(s => s.trim()).filter(Boolean)
  assert.ok(!staged.some(p => p.replace(/\\/g, '/').startsWith('.sillyspec/changes/')), 'changes 面零暂存（platform 短路）')
  assert.ok(staged.some(p => p.replace(/\\/g, '/').startsWith('.sillyspec/knowledge/')), 'knowledge 面照常入暂存')
})

test('FR-02② archiveNarrowedGitAdd repo（显式）保持现行为：changes 面入暂存', () => {
  const cwd = fx(); initRepo(cwd)
  const destDir = join(cwd, '.sillyspec', 'changes', 'archive', '2026-11-27-y')
  mkdirSync(destDir, { recursive: true })
  writeFileSync(join(destDir, 'design.md'), '# spec')
  mkdirSync(join(cwd, '.sillyspec', 'knowledge', 'fr'), { recursive: true })
  writeFileSync(join(cwd, '.sillyspec', 'knowledge', 'fr', 'y.md'), 'y')

  archiveNarrowedGitAdd({ cwd, specBase: join(cwd, '.sillyspec'), destDir, destName: '2026-11-27-y', extraDocs: [], docTracking: 'repo' })
  const staged = git(cwd, ['diff', '--cached', '--name-only']).split('\n').map(s => s.trim()).filter(Boolean)
  assert.ok(staged.some(p => p.replace(/\\/g, '/').startsWith('.sillyspec/changes/archive/2026-11-27-y/')), 'changes 面入暂存（repo 现行为）')
  assert.ok(staged.some(p => p.replace(/\\/g, '/').startsWith('.sillyspec/knowledge/')), 'knowledge 面入暂存')
})

test('FR-02② archiveNarrowedGitAdd 未传 docTracking=兼容现行为（旧调用方零回归）', () => {
  const cwd = fx(); initRepo(cwd)
  const destDir = join(cwd, '.sillyspec', 'changes', 'archive', '2026-11-27-z')
  mkdirSync(destDir, { recursive: true })
  writeFileSync(join(destDir, 'design.md'), '# spec')
  mkdirSync(join(cwd, '.sillyspec', 'knowledge', 'fr'), { recursive: true })
  writeFileSync(join(cwd, '.sillyspec', 'knowledge', 'fr', 'z.md'), 'z')

  archiveNarrowedGitAdd({ cwd, specBase: join(cwd, '.sillyspec'), destDir, destName: '2026-11-27-z', extraDocs: [] })
  const staged = git(cwd, ['diff', '--cached', '--name-only']).split('\n').map(s => s.trim()).filter(Boolean)
  assert.ok(staged.some(p => p.replace(/\\/g, '/').startsWith('.sillyspec/changes/archive/')), '未传=repo 兼容')
})

test('FR-02③ readDocTrackingFromRepo：显式/缺省/非法值', () => {
  const cwd = fx(); initRepo(cwd)
  mkdirSync(join(cwd, '.sillyspec'), { recursive: true })
  assert.equal(readDocTrackingFromRepo(cwd).value, 'platform', '无 local.yaml 缺省')

  writeFileSync(join(cwd, '.sillyspec', 'local.yaml'), 'changes:\n  doc_tracking: never\n')
  const r = readDocTrackingFromRepo(cwd)
  assert.equal(r.value, 'never'); assert.equal(r.explicit, true); assert.equal(r.invalid, false)

  writeFileSync(join(cwd, '.sillyspec', 'local.yaml'), 'changes:\n  doc_tracking: bogus\n')
  const bad = readDocTrackingFromRepo(cwd)
  assert.equal(bad.value, 'platform'); assert.equal(bad.invalid, true)
})

test('后置清理', () => { for (const d of tmpRoots) rmSync(d, { recursive: true, force: true }) })
