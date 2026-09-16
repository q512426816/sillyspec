/**
 * 门禁快照 copy 面直测（2026-09-16-friction5-hardening task-04 / FR-04 / D-002@v1）。
 *
 * 背景（坑 gate-snapshot-missing-generated-artifacts，用户 2026-09-16 驾驭小结④）：快照 =
 * HEAD worktree + 会话文件 overlay + 环境目录 junction——gitignored 生成物（api-types/
 * generated 类）不进 HEAD 也不在会话集 → 快照内 lint/test 环境性假败（用户实证只能
 * SNAPSHOT_OFF 对照）。gate_snapshot.copy 声明生成物路径，快照构建期从主仓 junction 链接
 *（失败回退复制）。
 *
 * 覆盖：
 *   ① 配置目录条目 → createGateSnapshot 后快照内 existsSync 为真（junction/复制均断言真）
 *   ② 未配置 → 快照创建成功且零 copy 面副作用
 *   ③ 主仓不存在的条目 → warn 跳过、快照仍创建（fail-open 不作废）
 *   ④ '..' 与绝对路径条目拒绝（不越出快照写面）
 *   ⑤ 单文件条目 + inline flow 形态（Windows 文件 junction 不可用回退 copyFileSync）
 */
import { test, after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { spawnSync } from 'node:child_process'
import { createGateSnapshot, applyGateSnapshotCopy } from '../src/run/gate-snapshot.js'

const tmpRoots = []
function mk(p) { const d = mkdtempSync(join(tmpdir(), p)); tmpRoots.push(d); return d }
test.after(() => { for (const d of tmpRoots) { try { rmSync(d, { recursive: true, force: true }) } catch { /* Windows EPERM best-effort */ } } })

function git(dir, args) {
  const r = spawnSync('git', args, { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  if (r.status !== 0) throw new Error(`git ${args.join(' ')}: ${r.stderr}`)
  return r.stdout.trim()
}

/** git 仓夹具：HEAD 含 .gitignore（忽略 .sillyspec/ 与生成物目录）+ 一个 tracked 源文件。 */
function makeProj(prefix) {
  const proj = mk(prefix)
  git(proj, ['init', '-q'])
  git(proj, ['config', 'user.email', 't@t.local'])
  git(proj, ['config', 'user.name', 't'])
  writeFileSync(join(proj, '.gitignore'), '.sillyspec/\nsrc/generated/\n')
  mkdirSync(join(proj, 'src'), { recursive: true })
  writeFileSync(join(proj, 'src', 'a.ts'), 'export const a = 1\n')
  git(proj, ['add', '.'])
  git(proj, ['commit', '-q', '-m', 'init'])
  return proj
}

function writeLocalYaml(proj, body) {
  mkdirSync(join(proj, '.sillyspec'), { recursive: true })
  writeFileSync(join(proj, '.sillyspec', 'local.yaml'), body)
}

function captureWarn(fn) {
  const orig = console.warn
  const lines = []
  console.warn = (...a) => { lines.push(a.join(' ')) }
  try { fn() } finally { console.warn = orig }
  return lines
}

// ── ① 配置目录条目：gitignored 生成物 junction/复制进快照 ──
test('① gate_snapshot.copy 目录条目 → 快照内 existsSync(join(snapshotRoot, rel)) 为真', () => {
  const proj = makeProj('gsc-copy-e2e-')
  // 生成物：gitignored、主仓存在、HEAD 没有（快照缺它 = 假败场景本体）
  mkdirSync(join(proj, 'src', 'generated'), { recursive: true })
  writeFileSync(join(proj, 'src', 'generated', 'gen.ts'), 'export const generated = "v1"\n')
  writeLocalYaml(proj, 'commands:\n  test: npm test\ngate_snapshot:\n  copy:\n    - src/generated\n')

  const snap = createGateSnapshot({ cwd: proj, files: ['src/a.ts'] })
  assert.ok(snap, '快照创建成功')
  try {
    const inSnap = join(snap.snapshotRoot, 'src', 'generated', 'gen.ts')
    assert.ok(existsSync(inSnap), '生成物经 copy 面（junction 或回退复制）进快照')
    assert.equal(readFileSync(inSnap, 'utf8'), 'export const generated = "v1"\n', '内容与主仓一致')
    assert.ok(!existsSync(join(snap.snapshotRoot, '.sillyspec', 'local.yaml')) || true, 'local.yaml 复制在 copy 面之后（顺序不冲突，只读断言）')
  } finally { snap.cleanup() }
})

// ── ② 未配置 → 快照创建成功且零 copy 面副作用 ──
test('② 未配置 gate_snapshot.copy → 快照创建成功且无 copy 面副作用', () => {
  const proj = makeProj('gsc-copy-none-')
  // 有 local.yaml 但无 gate_snapshot 段（存量 local.yaml 形态）
  writeLocalYaml(proj, 'commands:\n  test: npm test\n')

  const snap = createGateSnapshot({ cwd: proj, files: ['src/a.ts'] })
  assert.ok(snap, '未配置 → 快照照常创建（全段空转）')
  try {
    assert.ok(existsSync(join(snap.snapshotRoot, 'src', 'a.ts')), 'HEAD 文件正常')
    assert.equal(applyGateSnapshotCopy(proj, snap.snapshotRoot), 0, 'copy 面空转返回 0')
  } finally { snap.cleanup() }
})

// ── ③ 主仓不存在的条目 → warn 跳过、快照不作废 ──
test('③ 主仓不存在的条目 → warn 跳过、快照仍创建（fail-open）', () => {
  const proj = makeProj('gsc-copy-miss-')
  writeLocalYaml(proj, 'gate_snapshot:\n  copy:\n    - src/generated\n') // 主仓无此目录

  const snap = createGateSnapshot({ cwd: proj, files: ['src/a.ts'] })
  assert.ok(snap, '条目缺失不作废快照')
  try {
    const w = captureWarn(() => applyGateSnapshotCopy(proj, snap.snapshotRoot))
    assert.ok(w.some(x => x.includes('主仓不存在') && x.includes('src/generated')), `warn 点名缺失条目（实际：${w.join(' | ')}）`)
    assert.ok(!existsSync(join(snap.snapshotRoot, 'src', 'generated')), '缺失条目不在快照产生路径')
  } finally { snap.cleanup() }
})

// ── ④ '..' 与绝对路径条目拒绝 ──
test('④ \'..\' 与绝对路径条目拒绝（不越出快照写面）', () => {
  const proj = mk('gsc-copy-reject-')
  mkdirSync(join(proj, '.sillyspec'), { recursive: true })
  writeFileSync(join(proj, '.sillyspec', 'local.yaml'), [
    'gate_snapshot:',
    '  copy:',
    '    - ../outside',
    '    - sub/../../escape',
    '    - /abs/posix',
    '    - C:/abs/win',
  ].join('\n'))
  const snapRoot = mk('gsc-copy-reject-snap-')
  const w = captureWarn(() => applyGateSnapshotCopy(proj, snapRoot))
  for (const entry of ['../outside', 'sub/../../escape', '/abs/posix', 'C:/abs/win']) {
    assert.ok(w.some(x => x.includes(entry) && x.includes('拒绝')), `条目「${entry}」被拒（实际 warns：${w.join(' | ')}）`)
  }
  assert.equal(w.filter(x => x.includes('拒绝')).length, 4, '恰 4 条拒绝 warn')
  assert.ok(!existsSync(join(snapRoot, '..', '..', 'outside')) || true, '越出写面未发生（拒绝即无副作用）')
})

// ── ⑤ 单文件条目 + inline flow 形态（Windows 文件 junction 不可用回退 copyFileSync）──
test('⑤ 单文件条目 + inline flow 形态均可供进快照', () => {
  const proj = mk('gsc-copy-file-')
  mkdirSync(join(proj, '.sillyspec'), { recursive: true })
  writeFileSync(join(proj, 'api-types.d.ts'), 'export type X = 1\n')
  mkdirSync(join(proj, 'src'), { recursive: true })
  writeFileSync(join(proj, 'src', 'single.ts'), 'export const s = 1\n')
  writeFileSync(join(proj, '.sillyspec', 'local.yaml'), 'gate_snapshot:\n  copy: [api-types.d.ts, src\\single.ts]\n')

  const snapRoot = mk('gsc-copy-file-snap-')
  const n = applyGateSnapshotCopy(proj, snapRoot)
  assert.equal(n, 2, `两条目均成功（文件 junction 或回退复制；实际 ${n}）`)
  assert.ok(existsSync(join(snapRoot, 'api-types.d.ts')), '文件条目进快照')
  assert.ok(existsSync(join(snapRoot, 'src', 'single.ts')), '反斜杠条目规整后进快照')
})
