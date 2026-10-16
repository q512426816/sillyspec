// FR-04（2026-10-16-fix-downstream-tool-defects）：快照失败分支带出结构化原因。
//
// 坑（2026-10-16 下游实证）：createGateSnapshot/createVerifyGateSnapshot 所有失败分支返回
// 裸 null 零原因（两处 catch 静默吞异常），调用方硬编码笼统文案「变更文件集为空 / 快照
// 基建不可用」——把 pnpm symlink-store 布局设计性拒建误标成文件集为空，排查成本直接由此
// 而来。修法：failRef 可选出参（调用方栈上对象，失败点写 reason）+ catch 补 warn 日志；
// 返回契约 null 不变；--done 路径经 observability 通道把 used_snapshot/snapshot_fallback_reason
// 落进 test-result.json。
import { test, after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { execFileSync } from 'node:child_process'
import { createGateSnapshot, createVerifyGateSnapshot, snapshotObservability } from '../src/run/gate-snapshot.js'

const tmpRoots = []
after(() => { for (const t of tmpRoots) { try { rmSync(t, { recursive: true, force: true }) } catch { /* best effort */ } } })

function makeGitRepo({ lockfile = null } = {}) {
  const cwd = mkdtempSync(join(tmpdir(), 'ss-snap-reason-'))
  tmpRoots.push(cwd)
  mkdirSync(join(cwd, 'src'), { recursive: true })
  writeFileSync(join(cwd, 'src', 'a.js'), 'export const a = 1\n', 'utf8')
  if (lockfile) writeFileSync(join(cwd, lockfile), 'lockfileVersion: 9.0\n', 'utf8')
  const git = (args) => execFileSync('git', args, { cwd, stdio: ['ignore', 'pipe', 'pipe'] })
  git(['init', '-q'])
  git(['config', 'user.email', 't@t'])
  git(['config', 'user.name', 't'])
  git(['add', '.'])
  git(['commit', '-q', '-m', 'init'])
  return cwd
}

test('1. pnpm 布局拒建：failRef.reason 点名 symlink-store 布局（红→绿：此前裸 null）', () => {
  const cwd = makeGitRepo({ lockfile: 'pnpm-lock.yaml' })
  const failRef = {}
  const snap = createGateSnapshot({ cwd, files: ['src/a.js'], failRef })
  assert.equal(snap, null, 'pnpm 布局照旧拒建（返回契约不变）')
  assert.equal(typeof failRef.reason, 'string', `failRef.reason 应为字符串（实际 ${JSON.stringify(failRef)}）`)
  assert.ok(/pnpm|symlink-store/i.test(failRef.reason), `原因应点名 pnpm/symlink-store 布局（实际：${failRef.reason}）`)
})

test('2. 文件集为空成因区分：非 git 仓 → reason 指明 git 不可用（红→绿：此前裸 null）', async () => {
  const cwd = mkdtempSync(join(tmpdir(), 'ss-snap-nogit-'))
  tmpRoots.push(cwd)
  const failRef = {}
  const snap = await createVerifyGateSnapshot({ cwd, changeName: 'x', specBase: join(cwd, '.sillyspec'), failRef })
  assert.equal(snap, null)
  assert.equal(typeof failRef.reason, 'string', `failRef.reason 应为字符串（实际 ${JSON.stringify(failRef)}）`)
  assert.ok(/git/i.test(failRef.reason), `非 git 仓成因应可辨认（实际：${failRef.reason}）`)
})

test('3. 不传 failRef 零行为变化：返回 null 不崩', () => {
  const cwd = makeGitRepo({ lockfile: 'pnpm-lock.yaml' })
  const snap = createGateSnapshot({ cwd, files: ['src/a.js'] })
  assert.equal(snap, null, '既有调用形态（无 failRef）行为不变')
})

test('4. observability 通道：used_snapshot 与降级原因字段（红→绿）', () => {
  const used = snapshotObservability(true, {})
  assert.deepEqual(used, { used_snapshot: true })
  const fellback = snapshotObservability(false, { reason: 'symlink-store 布局拒建（pnpm）' })
  assert.equal(fellback.used_snapshot, false)
  assert.ok(fellback.snapshot_fallback_reason.includes('pnpm'), '降级原因透传 failRef.reason')
  const noReason = snapshotObservability(false, null)
  assert.equal(noReason.used_snapshot, false)
  assert.ok(noReason.snapshot_fallback_reason.length > 0, '无 failRef 时兜底笼统文案（向后兼容）')
})
