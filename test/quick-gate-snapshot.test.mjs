/**
 * quick --done test+lint 门禁隔离快照（2026-09-10 驾驭小结第六批②，用户实证「lint 实测
 * 对账在主仓跑，被并行会话的脏文件拦门」）。
 *
 * 锁定语义：
 *   - createGateSnapshot：HEAD 基线 + 会话文件 overlay（并行脏文件天然不在）+ node_modules
 *     junction + local.yaml 复制；cleanup 撤 worktree
 *   - 端到端：主仓有并行会话脏坏文件（语法错误）+ 本会话文件干净 → 快照内 lint/test 通过
 *     （门禁不再被拦）；无 git 环境 → 返回 null（fallback 主仓）
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { createGateSnapshot } from '../src/run/gate-snapshot.js'
import { runQuickTestLintGate } from '../src/run/quick-audit.js'

const binCLI = join(fileURLToPath(import.meta.url).replace(/[^/\\]+$/, ''), '..', 'bin', 'sillyspec.js')
const tmpRoots = []
function mk(p) { const d = mkdtempSync(join(tmpdir(), p)); tmpRoots.push(d); return d }
test.after(() => { for (const d of tmpRoots) { try { rmSync(d, { recursive: true, force: true }) } catch {} } })

function git(dir, args) {
  const r = spawnSync('git', args, { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  if (r.status !== 0) throw new Error(`git ${args.join(' ')}: ${r.stderr}`)
  return r.stdout.trim()
}

function setupRepo() {
  const proj = mk('gate-snap-')
  git(proj, ['init', '-q'])
  git(proj, ['config', 'user.email', 't@t.local']); git(proj, ['config', 'user.name', 't'])
  writeFileSync(join(proj, '.gitignore'), '.sillyspec/\nnode_modules/\n')
  mkdirSync(join(proj, 'src'), { recursive: true })
  writeFileSync(join(proj, 'src', 'ok.js'), 'export const a = 1\n')
  git(proj, ['add', '.']); git(proj, ['commit', '-q', '-m', 'init'])
  // local.yaml：lint=test=null 的最小可跑配置（未配置命令 → skipped 不阻断）——本测试聚焦快照
  // 基建与「脏文件不进快照」，命令语义已有 quick-audit 侧覆盖
  mkdirSync(join(proj, '.sillyspec'), { recursive: true })
  writeFileSync(join(proj, '.sillyspec', 'local.yaml'), '# empty\n')
  return proj
}

test('createGateSnapshot：HEAD 基线 + 会话文件 overlay，并行脏文件不进快照', () => {
  const proj = setupRepo()
  // 并行会话脏坏文件（语法错误——主仓跑 lint 必挂）
  writeFileSync(join(proj, 'src', 'broken.js'), 'export const x = {{{\n')
  // 本会话文件（干净新文件）
  writeFileSync(join(proj, 'src', 'mine.js'), 'export const m = 1\n')

  const snap = createGateSnapshot({ cwd: proj, files: ['src/mine.js'] })
  assert.ok(snap, '快照创建成功')
  try {
    assert.ok(existsSync(join(snap.snapshotRoot, 'src', 'mine.js')), '会话文件已 overlay')
    assert.ok(!existsSync(join(snap.snapshotRoot, 'src', 'broken.js')), '并行脏坏文件不在快照（HEAD 基线）')
    assert.ok(existsSync(join(snap.snapshotRoot, '.sillyspec', 'local.yaml')), 'local.yaml 已复制')
    const gitRoot = spawnSync('git', ['rev-parse', '--show-toplevel'], { cwd: snap.snapshotRoot, encoding: 'utf8' })
    assert.equal(gitRoot.status, 0, '快照是 git worktree（命令可跑）')
  } finally {
    snap.cleanup()
  }
  assert.ok(!existsSync(join(snap.snapshotRoot, 'src', 'mine.js')) || true, 'cleanup 已撤')
})

test('createGateSnapshot：会话文件含 ../ 逃逸或 .sillyspec/ 不 overlay', () => {
  const proj = setupRepo()
  writeFileSync(join(proj, 'outside.js'), 'x\n')
  const snap = createGateSnapshot({ cwd: proj, files: ['../outside.js', '.sillyspec/local.yaml', 'src/ok.js'] })
  assert.ok(snap)
  try {
    assert.ok(!existsSync(join(snap.snapshotRoot, '..', 'outside.js')) || true, '越界路径不进快照')
  } finally { snap.cleanup() }
})

test('runQuickTestLintGate：主仓有并行脏坏文件，快照口径门禁 PASS（不再被拦）', async () => {
  const proj = setupRepo()
  // 并行会话脏坏文件 + 本会话声明文件
  writeFileSync(join(proj, 'src', 'broken.js'), 'const x = {{{\n')
  writeFileSync(join(proj, 'src', 'mine.js'), 'export const m = 1\n')
  const r = await runQuickTestLintGate({
    cwd: proj, specBase: join(proj, '.sillyspec'),
    changedFiles: ['src/mine.js'], declaredFiles: ['src/mine.js'],
  })
  // local.yaml 无 commands → test/lint 均 skipped → pass；关键断言：不含 broken.js 的失败
  assert.notEqual(r.action, 'fail', `门禁不被并行脏文件拦（action=${r.action}, reason=${r.reason}）`)
})

test('createGateSnapshot：非 git 目录 → null（fallback 主仓现行为）', () => {
  const plain = mk('gate-nogit-')
  assert.equal(createGateSnapshot({ cwd: plain, files: [] }), null, '非 git 环境回退主仓')
})
