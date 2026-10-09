/**
 * 快照回退主仓可见性 + 摩擦记账回归锁（2026-10-09-verify-reuse-friction FR-02）。
 *
 * 2026-10-09 取证：快照创建慢性失败静默回退主仓口径（apply 前实测的是无变更代码的 HEAD，
 * 绿结论可被 --done 复用消费），全程零可见零记账。修复：reportGateSnapshotFallback 统一
 * ⚠️ 告警块 + gate_snapshot_fallback 摩擦事件；null 回退与异常回退同等可见。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, readFileSync, writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { execSync } from 'node:child_process'
import { reportGateSnapshotFallback } from '../src/run/gate-snapshot.js'
import { executeVerifyQualityScan, storeQualityScan } from '../src/run/verify-quality-scan.js'

function makeFixtureRepo(tag) {
  const dir = mkdtempSync(join(tmpdir(), `snapvis-${tag}-`))
  execSync('git init -q', { cwd: dir })
  execSync('git config user.email t@t.local', { cwd: dir })
  execSync('git config user.name t', { cwd: dir })
  writeFileSync(join(dir, 'exit0.js'), 'process.exit(0)\n')
  execSync('git add -A', { cwd: dir })
  execSync('git commit -qm init', { cwd: dir })
  mkdirSync(join(dir, '.sillyspec', 'changes', 'c1'), { recursive: true })
  mkdirSync(join(dir, '.sillyspec', '.runtime'), { recursive: true })
  writeFileSync(join(dir, '.sillyspec', 'local.yaml'), 'commands:\n  test: node exit0.js\n  lint: node exit0.js\n')
  // 慢性快照失败拦截器：.git/worktrees 同名文件 → git worktree add 必败
  writeFileSync(join(dir, '.git', 'worktrees'), 'blocked-by-test')
  return dir
}

const PASSED_TEST = { status: 'passed', command: 'x', exitCode: 0, durationMs: 12, outputTail: '', reason: null, resultPath: null }
const PASSED_LINT = { status: 'passed', command: 'y', exitCode: 0, durationMs: 3, outputTail: '', reason: null }

test('reportGateSnapshotFallback：⚠️ 告警块可见 + gate_snapshot_fallback 落摩擦台账', async () => {
  const dir = makeFixtureRepo('unit')
  try {
    const warns = []
    const orig = console.warn
    console.warn = (...a) => { warns.push(a.join(' ')) }
    try {
      await reportGateSnapshotFallback({ cwd: dir, changeName: 'c1', where: '测试门', reason: 'boom-reason' })
    } finally { console.warn = orig }
    const joined = warns.join(' | ')
    assert.ok(joined.includes('gate-snapshot-fallback') && joined.includes('boom-reason'), `告警块含标记与原因（实得：${joined.slice(0, 200)}）`)
    assert.ok(warns.some((w) => w.includes('主仓口径')), '告警块明示口径影响')
    const tally = JSON.parse(readFileSync(join(dir, '.sillyspec', '.runtime', 'friction-tally-c1.json'), 'utf-8'))
    assert.equal(tally.events.gate_snapshot_fallback.count, 1, '摩擦事件计数 1')
    assert.ok(String(tally.events.gate_snapshot_fallback.lastAt), '事件带 lastAt')
    assert.ok((tally.history || []).some((h) => h.type === 'gate_snapshot_fallback' && String(h.detail || '').includes('测试门')), 'history 条目 detail 携来源')
  } finally {
    try { rmSync(dir, { recursive: true, force: true }) } catch {}
  }
})

test('noAI 质量扫描步：快照慢性失败经真实调用点产出 ⚠️ 告警 + 记账（null/异常路径不静默）', async () => {
  const dir = makeFixtureRepo('e2e')
  delete process.env.NODE_TEST_CONTEXT
  try {
    const specBase = join(dir, '.sillyspec')
    // 种绿记录使本轮快速收敛（复用命中），快照尝试仍先于复用闸——告警必出
    storeQualityScan({ specBase, cwd: dir, changeName: 'c1', testResult: PASSED_TEST, lintResult: PASSED_LINT })
    const warns = []
    const orig = console.warn
    console.warn = (...a) => { warns.push(a.join(' ')) }
    try {
      await executeVerifyQualityScan({ cwd: dir, specBase, changeName: 'c1', platformOpts: {} })
    } finally { console.warn = orig }
    assert.ok(warns.some((w) => w.includes('noAI 质量扫描步') && w.includes('gate-snapshot-fallback')), `真实调用点告警可见（实得：${warns.join(' || ').slice(0, 200)}）`)
    const tally = JSON.parse(readFileSync(join(dir, '.sillyspec', '.runtime', 'friction-tally-c1.json'), 'utf-8'))
    assert.ok(tally.events.gate_snapshot_fallback && tally.events.gate_snapshot_fallback.count >= 1, '经真实调用点落 gate_snapshot_fallback 台账')
  } finally {
    try { rmSync(dir, { recursive: true, force: true }) } catch {}
  }
})
