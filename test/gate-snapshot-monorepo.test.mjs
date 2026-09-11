/**
 * 门禁快照 monorepo 依赖布局（坑 gate-snapshot-monorepo-layout，2026-09-12 驾驭第十五批①，
 * 用户实证「四次重试才从日志定位 Temp\sillyspec-gate-*」）+ baseline checkpoint 产物防御
 * （坑 baseline-checkpoint-binary-sweep，②：289MB 部署 tar.gz 被带进分支）。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { spawnSync } from 'node:child_process'
import { createGateSnapshot, discoverEnvDirs, envDirsLinked, printSnapshotFailureHint } from '../src/run/gate-snapshot.js'
import { isCheckpointSkippableArtifact } from '../src/worktree.js'

const tmpRoots = []
function mk(p) { const d = mkdtempSync(join(tmpdir(), p)); tmpRoots.push(d); return d }
test.after(() => { for (const d of tmpRoots) { try { rmSync(d, { recursive: true, force: true }) } catch {} } })

function git(dir, args) {
  const r = spawnSync('git', args, { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  if (r.status !== 0) throw new Error(`git ${args.join(' ')}: ${r.stderr}`)
  return r.stdout.trim()
}

test('discoverEnvDirs：monorepo 子包 node_modules 递归发现（深度≤3）', () => {
  const root = mk('mono-disc-')
  for (const p of ['node_modules', '.venv', 'packages/a/node_modules', 'packages/b/node_modules', 'apps/web/node_modules', 'packages/a/src']) {
    mkdirSync(join(root, p), { recursive: true })
  }
  // 深度>3 不发现（packages/x/y/z/node_modules = 深度 4）
  mkdirSync(join(root, 'deep/a/b/c/node_modules'), { recursive: true })
  const found = discoverEnvDirs(root)
  assert.ok(found.includes('node_modules') && found.includes('.venv'), '根级命中')
  assert.ok(found.includes('packages/a/node_modules') && found.includes('apps/web/node_modules'), '子包依赖递归发现')
  assert.ok(!found.includes('deep/a/b/c/node_modules'), '深度帽外不扫')
  // envDirsLinked：主仓有快照缺 → 命中相对路径
  const snap = mk('mono-snap-')
  const missing = envDirsLinked(root, snap)
  assert.ok(missing.includes('packages/a/node_modules'), '发现集口径校验缺失')
})

test('createGateSnapshot：pnpm workspace 形态子包依赖 junction 进快照（dev 依赖同源可达）', () => {
  const proj = mk('mono-e2e-')
  git(proj, ['init', '-q']); git(proj, ['config', 'user.email', 't@t.local']); git(proj, ['config', 'user.name', 't'])
  writeFileSync(join(proj, '.gitignore'), '.sillyspec/\nnode_modules/\n**/node_modules/\ndist/\n')
  mkdirSync(join(proj, 'packages', 'web', 'src'), { recursive: true })
  writeFileSync(join(proj, 'packages', 'web', 'src', 'a.ts'), 'export const a = 1\n')
  git(proj, ['add', '.']); git(proj, ['commit', '-q', '-m', 'init'])
  // monorepo 依赖布局：根 + 子包 node_modules（pnpm workspace 形态）
  mkdirSync(join(proj, 'node_modules', '.pnpm'), { recursive: true })
  mkdirSync(join(proj, 'packages', 'web', 'node_modules', 'vue'), { recursive: true })
  writeFileSync(join(proj, 'packages', 'web', 'node_modules', 'vue', 'pkg-marker.txt'), 'dev-deps')

  const snap = createGateSnapshot({ cwd: proj, files: ['packages/web/src/a.ts'] })
  assert.ok(snap, '快照创建')
  try {
    const marker = join(snap.snapshotRoot, 'packages', 'web', 'node_modules', 'vue', 'pkg-marker.txt')
    assert.ok(existsSync(marker), '子包 node_modules junction 进快照（monorepo 布局可用性核心）')
    assert.ok(existsSync(join(snap.snapshotRoot, 'node_modules', '.pnpm')), '根 node_modules 同链')
  } finally { snap.cleanup() }
})

test('printSnapshotFailureHint：路径 + 排查顺序 + 对照复跑出口直给', () => {
  const origErr = console.error
  let buf = ''
  console.error = (...a) => { buf += a.join(' ') + '\n' }
  try {
    printSnapshotFailureHint({ snapshotRoot: 'C:\\Temp\\sillyspec-gate-XYZ', changeFileCount: 3 })
  } finally { console.error = origErr }
  assert.ok(buf.includes('sillyspec-gate-XYZ'), '快照路径直给（不再从日志考古）')
  assert.ok(buf.includes('SILLYSPEC_VERIFY_GATE_SNAPSHOT_OFF'), '对照复跑出口')
  assert.ok(buf.includes('monorepo 依赖布局'), '环境差异疑点点名')
})

test('isCheckpointSkippableArtifact：归档扩展名恒跳 + 体积帽 + 源码不误伤', () => {
  const root = mk('art-')
  const tar = join(root, 'deploy.tar.gz')
  writeFileSync(tar, 'x')
  assert.equal(isCheckpointSkippableArtifact(tar), 'artifact-ext', '归档扩展名恒跳')
  assert.equal(isCheckpointSkippableArtifact(join(root, 'app.exe')), 'artifact-ext')
  // 体积帽：>10MB 普通扩展
  const big = join(root, 'big.dat')
  writeFileSync(big, Buffer.alloc(11 * 1024 * 1024))
  assert.equal(isCheckpointSkippableArtifact(big), 'size-cap', '超 10MB 体积帽跳')
  // 源码/小文件不误伤
  const src = join(root, 'a.ts')
  writeFileSync(src, 'x')
  assert.equal(isCheckpointSkippableArtifact(src), null, '源码不跳')
})

test('e2e：untracked tar.gz 不进 baseline checkpoint（289MB 场景小规模复刻）', async (t) => {
  const proj = mk('art-e2e-')
  git(proj, ['init', '-q']); git(proj, ['config', 'user.email', 't@t.local']); git(proj, ['config', 'user.name', 't'])
  writeFileSync(join(proj, '.gitignore'), '.sillyspec/\n')
  writeFileSync(join(proj, 'a.js'), '1\n')
  git(proj, ['add', '.']); git(proj, ['commit', '-q', '-m', 'init'])
  // untracked 产物 + untracked 源码 WIP（后者应照常进 baseline）
  writeFileSync(join(proj, 'deploy-2026.tar.gz'), Buffer.alloc(1024))
  writeFileSync(join(proj, 'wip.js'), '// wip\n')
  const wmMod = await import('../src/worktree.js')
  const wm = new wmMod.WorktreeManager({ cwd: proj })
  try {
    wm.create('art-change')
    const metaPath = join(proj, '.sillyspec', '.runtime', 'worktrees', 'art-change', 'meta.json')
    assert.ok(existsSync(metaPath), 'worktree 已建')
    const meta = JSON.parse(readFileSync(metaPath, 'utf8'))
    assert.ok(!meta.baselineFiles.includes('deploy-2026.tar.gz'), 'tar.gz 不进 baseline（坑核心）')
    assert.ok(meta.baselineFiles.includes('wip.js'), '源码 WIP 照常进 baseline（不误伤）')
  } finally {
    try { wm.cleanup('art-change', { force: true }) } catch { try { wm.cleanup('art-change') } catch {} }
  }
})

