/**
 * 携带面 carriedFiles（2026-10-20-gate-snapshot-carried-deps FR-01）：
 * createGateSnapshot 增可选 carriedFiles——与 files 同款 overlay 语义（源判定/运行时面
 * 跳过/逃逸拒绝），计数与清单入返回值；缺省零回归（carriedFiles=[]、carried=0）。
 *
 * 坑文场景（缺陷二：同文件叠加多变更快照缺依赖必破）的机制半场——策略半场（foreign
 * 剔除改携带）由 test/verify-gate-snapshot.test.mjs 钉。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { spawnSync } from 'node:child_process'
import { createGateSnapshot } from '../src/run/gate-snapshot.js'

const tmpRoots = []
function mk(p) { const d = mkdtempSync(join(tmpdir(), p)); tmpRoots.push(d); return d }
test.after(() => { for (const d of tmpRoots) { try { rmSync(d, { recursive: true, force: true }) } catch {} } })

function git(dir, args) {
  const r = spawnSync('git', args, { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  if (r.status !== 0) throw new Error(`git ${args.join(' ')}: ${r.stderr}`)
  return r.stdout.trim()
}

function setupRepo() {
  const proj = mk('gsc-main-')
  git(proj, ['init', '-q'])
  git(proj, ['config', 'user.email', 't@t.local']); git(proj, ['config', 'user.name', 't'])
  writeFileSync(join(proj, '.gitignore'), '.sillyspec/\n')
  mkdirSync(join(proj, 'src'), { recursive: true })
  writeFileSync(join(proj, 'src', 'feature.js'), 'export const f = 1\n')
  writeFileSync(join(proj, 'src', 'util.js'), 'export const stripPathPrefix = null // HEAD 旧版（无新导出体）\n')
  git(proj, ['add', '.']); git(proj, ['commit', '-q', '-m', 'init'])
  return proj
}

test('携带件从 overlayRoot 拷进快照，清单与计数入返回值', () => {
  const proj = setupRepo()
  // 他者声明文件的「在途新版」（主仓工作区形态——in-place 源）
  writeFileSync(join(proj, 'src', 'util.js'), 'export function stripPathPrefix(p) { return p }\n')
  writeFileSync(join(proj, 'src', 'feature.js'), 'export const f = 2 // 本变更\n')

  const snap = createGateSnapshot({ cwd: proj, files: ['src/feature.js'], carriedFiles: ['src/util.js'] })
  assert.ok(snap, '快照可用')
  try {
    assert.equal(readFileSync(join(snap.snapshotRoot, 'src', 'util.js'), 'utf8'),
      'export function stripPathPrefix(p) { return p }\n',
      '携带件=overlayRoot（主仓）工作区版本——依赖自洽')
    assert.deepEqual(snap.carriedFiles, ['src/util.js'], '返回携带清单')
    assert.equal(snap.carried, 1, '携带计数')
    assert.equal(snap.overlaid, 1, '判定面计数不含携带件')
  } finally { snap.cleanup() }
})

test('缺省零回归：不传 carriedFiles → 空清单零计数，行为与既有一致', () => {
  const proj = setupRepo()
  writeFileSync(join(proj, 'src', 'feature.js'), 'export const f = 2\n')
  const snap = createGateSnapshot({ cwd: proj, files: ['src/feature.js'] })
  assert.ok(snap)
  try {
    assert.deepEqual(snap.carriedFiles, [], '缺省携带清单为空')
    assert.equal(snap.carried, 0, '缺省携带计数 0')
    assert.equal(readFileSync(join(snap.snapshotRoot, 'src', 'feature.js'), 'utf8'), 'export const f = 2\n')
    assert.equal(readFileSync(join(snap.snapshotRoot, 'src', 'util.js'), 'utf8').replace(/\r\n/g, '\n'),
      'export const stripPathPrefix = null // HEAD 旧版（无新导出体）\n',
      '未携带的他者文件保持 HEAD 版（隔离不回退；行尾按 autocrlf 归一）')
  } finally { snap.cleanup() }
})

test('源侧不在场的携带件跳过；运行时面/逃逸路径拒绝；与判定面去重', () => {
  const proj = setupRepo()
  writeFileSync(join(proj, 'src', 'feature.js'), 'export const f = 2\n')
  const snap = createGateSnapshot({
    cwd: proj,
    files: ['src/feature.js'],
    carriedFiles: [
      'src/not-in-source.js',            // 源侧不存在（worktree 模式主仓专属 WIP 形态）→ 跳过
      '.sillyspec/.runtime/marker.json', // 运行时面 → 跳过
      '../escape.js',                    // 逃逸 → 跳过
      'src/feature.js',                  // 判定面已含 → 去重不重复计
    ],
  })
  assert.ok(snap)
  try {
    assert.deepEqual(snap.carriedFiles, [], '全部跳过/去重 → 携带清单空')
    assert.equal(snap.carried, 0)
    assert.ok(!existsSync(join(snap.snapshotRoot, 'src', 'not-in-source.js')))
  } finally { snap.cleanup() }
})

test('worktree 三态源判定对携带件同款生效（分叉取 worktree 血统 M2）', () => {
  const proj = setupRepo()
  const wt = mk('gsc-wt-'); rmSync(wt, { recursive: true, force: true })
  git(proj, ['worktree', 'add', '-q', wt, '-b', 'wt-branch'])
  // 他者声明文件在 worktree 有真修改（新版导出）、主仓工作区同步停HEAD——携带应取 worktree 版
  writeFileSync(join(wt, 'src', 'util.js'), 'export function stripPathPrefix(p) { return p } // worktree 版\n')
  writeFileSync(join(wt, 'src', 'feature.js'), 'export const f = 2 // 本变更交付\n')

  const snap = createGateSnapshot({ cwd: proj, files: ['src/feature.js'], carriedFiles: ['src/util.js'], sourceRoot: wt })
  assert.ok(snap)
  try {
    assert.equal(readFileSync(join(snap.snapshotRoot, 'src', 'util.js'), 'utf8'),
      'export function stripPathPrefix(p) { return p } // worktree 版\n',
      '携带件走同款三态判定（worktree 真修改 → worktree 血统）')
    assert.deepEqual(snap.carriedFiles, ['src/util.js'])
  } finally { snap.cleanup() }
})
