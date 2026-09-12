/**
 * symlink-store 布局探测（坑 gate-snapshot-pnpm-store-break，②）+ probe1 NEW: 前缀剥离
 * （坑 probe1-new-prefix-miss，③）+ review provenance 戳（坑 review-json-mystery-overwrite，①）。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { spawnSync } from 'node:child_process'
import { detectSymlinkStoreLayout, createGateSnapshot } from '../src/run/gate-snapshot.js'
import { runVerifyProbes } from '../src/verify-probes.js'
import { writeTaskReview } from '../src/task-review.js'

const tmpRoots = []
function mk(p) { const d = mkdtempSync(join(tmpdir(), p)); tmpRoots.push(d); return d }
test.after(() => { for (const d of tmpRoots) { try { rmSync(d, { recursive: true, force: true }) } catch {} } })

function git(dir, args) {
  const r = spawnSync('git', args, { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  if (r.status !== 0) throw new Error(`git ${args.join(' ')}: ${r.stderr}`)
  return r.stdout.trim()
}

test('detectSymlinkStoreLayout：pnpm/bun/lerna 锁文件与 packageManager 字段命中；npm 零命中', () => {
  const d = mk('lay-')
  assert.equal(detectSymlinkStoreLayout(d), null, 'npm/无锁文件 → null')
  writeFileSync(join(d, 'pnpm-lock.yaml'), '')
  assert.equal(detectSymlinkStoreLayout(d), 'pnpm', 'pnpm 锁文件命中')
  const d2 = mk('lay2-')
  writeFileSync(join(d2, 'package.json'), JSON.stringify({ packageManager: 'pnpm@9.1.0' }))
  assert.equal(detectSymlinkStoreLayout(d2), 'pnpm(packageManager)', 'packageManager 字段命中')
})

test('createGateSnapshot：pnpm 布局 → null 回退主仓（不再沙箱假败）', () => {
  const proj = mk('lay-e2e-')
  git(proj, ['init', '-q']); git(proj, ['config', 'user.email', 't@t.local']); git(proj, ['config', 'user.name', 't'])
  writeFileSync(join(proj, '.gitignore'), '.sillyspec/\nnode_modules/\n')
  mkdirSync(join(proj, 'src'), { recursive: true })
  writeFileSync(join(proj, 'src', 'a.js'), '1\n')
  git(proj, ['add', '.']); git(proj, ['commit', '-q', '-m', 'init'])
  writeFileSync(join(proj, 'pnpm-lock.yaml'), '')
  mkdirSync(join(proj, 'node_modules'), { recursive: true })
  assert.equal(createGateSnapshot({ cwd: proj, files: ['src/a.js'] }), null,
    'pnpm 布局快照作废（回退主仓——第三次踩的假败根治）')
})

test('probe1：design 清单 NEW: 前缀文件（已合入主仓无前缀实体）命中扫描不落 skipped', () => {
  const proj = mk('np-')
  git(proj, ['init', '-q']); git(proj, ['config', 'user.email', 't@t.local']); git(proj, ['config', 'user.name', 't'])
  writeFileSync(join(proj, '.gitignore'), '.sillyspec/\n')
  mkdirSync(join(proj, 'src'), { recursive: true })
  writeFileSync(join(proj, 'src', 'new-mod.js'), 'export const x = 1 // TODO: 修这个\n')
  git(proj, ['add', '.']); git(proj, ['commit', '-q', '-m', 'init'])
  const specBase = join(proj, '.sillyspec')
  const changeDir = join(specBase, 'changes', 'c1')
  mkdirSync(changeDir, { recursive: true })
  writeFileSync(join(changeDir, 'design.md'), [
    '## 文件变更清单', '',
    '| 操作 | 文件路径 | 说明 |',
    '|---|---|---|',
    '| 新增 | NEW: src/new-mod.js | 待建（已合入） |',
    '',
  ].join('\n'))
  const r = runVerifyProbes({ cwd: proj, changeName: 'c1' })
  assert.ok(r.probe1.matches.some(m => m.file === 'src/new-mod.js'), 'NEW: 前缀条目按目标文件命中（TODO 标记扫到）')
  assert.ok(!r.probe1.skippedFiles.some(f => f.includes('new-mod')), '不再落 skippedFiles 留 ⚠️ 噪声')
})

test('writeTaskReview：落盘含 writtenBy/writtenAt 溯源戳（空壳覆写归因用）', async () => {
  const proj = mk('prov-')
  git(proj, ['init', '-q']); git(proj, ['config', 'user.email', 't@t.local']); git(proj, ['config', 'user.name', 't'])
  writeFileSync(join(proj, '.gitignore'), '.sillyspec/\n')
  writeFileSync(join(proj, 'a.js'), '1\n')
  git(proj, ['add', '.']); git(proj, ['commit', '-q', '-m', 'init'])
  const base = git(proj, ['rev-parse', 'HEAD'])
  const changeDir = join(proj, '.sillyspec', 'changes', 'pc')
  mkdirSync(join(changeDir, 'tasks'), { recursive: true })
  writeFileSync(join(changeDir, 'tasks', 'task-01.md'),
    '---\nid: task-01\nallowed_paths: [a.js]\n---\n# t\n')
  const r = await writeTaskReview({
    changeName: 'pc', cwd: proj, taskId: 'task-01',
    specVerdict: 'pass', qualityVerdict: 'pass',
    baseOverride: base, headOverride: base, changedFilesOverride: ['a.js'],
  })
  assert.equal(r.ok, true, '写入成功')
  const saved = JSON.parse(readFileSync(r.reviewPath, 'utf8'))
  assert.ok(saved.writtenBy && saved.writtenBy.startsWith('writeTaskReview#pid'), `writtenBy 戳（实际 ${saved.writtenBy}）`)
  assert.ok(saved.writtenAt, 'writtenAt 戳')
})
