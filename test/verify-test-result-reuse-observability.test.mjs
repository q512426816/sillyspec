/**
 * 复用判定落盘观测回归锁（2026-10-09-verify-reuse-friction FR-04）。
 *
 * 2026-10-09 取证教训：指纹与复用判定只活在 stdout（还常被管道截走），事后取证只能靠
 * sqlite 会话记录考古。修复后：真跑轮 test-result.json 携 fingerprint/reuse_decision；
 * 复用命中轮落 verify-runs/reuse-decisions-<change>.jsonl；质量扫描记录携
 * missReason/scopeDecision——三处直读即可还原复用链路。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { execSync } from 'node:child_process'
import { executeVerifyQualityScan, loadLastQualityScanRecord } from '../src/run/verify-quality-scan.js'
import { appendReuseDecision } from '../src/verify-postcheck.js'

function makeFixtureRepo() {
  const dir = mkdtempSync(join(tmpdir(), 'obs-'))
  execSync('git init -q', { cwd: dir })
  execSync('git config user.email t@t.local', { cwd: dir })
  execSync('git config user.name t', { cwd: dir })
  writeFileSync(join(dir, 'flip.test.mjs'), [
    "import { test } from 'node:test'",
    "import assert from 'node:assert/strict'",
    "test('t', () => { assert.ok(true) })",
    '',
  ].join('\n'))
  writeFileSync(join(dir, 'exit0.js'), 'process.exit(0)\n')
  execSync('git add -A', { cwd: dir })
  execSync('git commit -qm init', { cwd: dir })
  mkdirSync(join(dir, '.sillyspec', 'changes', 'c1'), { recursive: true })
  mkdirSync(join(dir, '.sillyspec', '.runtime', 'verify-runs'), { recursive: true })
  writeFileSync(join(dir, '.sillyspec', 'local.yaml'), 'commands:\n  test: node exit0.js\n  lint: node exit0.js\n')
  // 快照慢性失败拦截器（同 verify-quality-scan-reuse-actual-scope fixture）
  writeFileSync(join(dir, '.git', 'worktrees'), 'blocked-by-test')
  return dir
}

function latestTestResult(specBase) {
  const runs = join(specBase, '.runtime', 'verify-runs')
  const dirs = readdirSync(runs).filter((d) => /^\d+$/.test(d)).sort()
  for (let i = dirs.length - 1; i >= 0; i--) {
    const p = join(runs, dirs[i], 'test-result.json')
    if (existsSync(p)) return JSON.parse(readFileSync(p, 'utf8'))
  }
  return null
}

test('真跑轮：test-result.json 携 fingerprint 与 reuse_decision（layer=real-run + miss 原因）', async () => {
  const dir = makeFixtureRepo()
  delete process.env.NODE_TEST_CONTEXT
  try {
    const specBase = join(dir, '.sillyspec')
    writeFileSync(join(dir, 'flip.test.mjs'), readFileSync(join(dir, 'flip.test.mjs'), 'utf8') + '// touched\n')
    await executeVerifyQualityScan({ cwd: dir, specBase, changeName: 'c1', platformOpts: {} })
    const j = latestTestResult(specBase)
    assert.ok(j, '真跑轮 test-result.json 在场')
    assert.ok(j.fingerprint && typeof j.fingerprint === 'string' && j.fingerprint.length === 64, 'fingerprint 落盘（质量扫描口径 sha256）')
    assert.equal(j.reuse_decision.layer, 'real-run')
    assert.equal(j.reuse_decision.hit, false)
    assert.ok(typeof j.reuse_decision.reason === 'string' && j.reuse_decision.reason.length > 0, 'miss 原因链在列（首跑为 no-record 类）')
    // 记录观测字段：missReason + scopeDecision（planned≠actual 的慢性失败态可直读）
    const rec = loadLastQualityScanRecord({ specBase, changeName: 'c1' })
    assert.ok(rec.missReason !== undefined, '记录携 missReason 键（首跑可为 null）')
    assert.deepEqual(rec.scopeDecision, { planned: true, actual: false }, 'scopeDecision 记录计划/实际口径')
  } finally {
    try { rmSync(dir, { recursive: true, force: true }) } catch {}
  }
})

test('复用命中轮：reuse-decisions jsonl 落判定行；记录 missReason 链可追', async () => {
  const dir = makeFixtureRepo()
  delete process.env.NODE_TEST_CONTEXT
  try {
    const specBase = join(dir, '.sillyspec')
    writeFileSync(join(dir, 'flip.test.mjs'), readFileSync(join(dir, 'flip.test.mjs'), 'utf8') + '// touched\n')
    await executeVerifyQualityScan({ cwd: dir, specBase, changeName: 'c1', platformOpts: {} })
    // 第二轮：慢性失败口径一致 → passed 幂等闸命中 → journal 落 noai-passed-gate 行
    await executeVerifyQualityScan({ cwd: dir, specBase, changeName: 'c1', platformOpts: {} })
    const jl = join(specBase, '.runtime', 'verify-runs', 'reuse-decisions-c1.jsonl')
    assert.ok(existsSync(jl), 'jsonl journal 在场')
    const lines = readFileSync(jl, 'utf8').trim().split('\n').map((l) => JSON.parse(l))
    assert.ok(lines.some((l) => l.layer === 'noai-passed-gate' && l.hit === true && l.ts && l.fingerprint), '命中行含 layer/hit/ts/fingerprint')
  } finally {
    try { rmSync(dir, { recursive: true, force: true }) } catch {}
  }
})

test('appendReuseDecision：坏输入 false 不抛（best-effort）；合法输入追加一行', () => {
  const dir = mkdtempSync(join(tmpdir(), 'obs-unit-'))
  try {
    assert.equal(appendReuseDecision({ specBase: null, changeName: 'c1', decision: { layer: 'x' } }), false, '缺 specBase → false')
    assert.equal(appendReuseDecision({ specBase: join(dir, '.sillyspec'), changeName: 'c1', decision: null }), false, '缺 decision → false')
    assert.equal(appendReuseDecision({ specBase: join(dir, '.sillyspec'), changeName: 'c1', decision: { layer: 'unit', hit: true, reason: null } }), true, '合法 → true')
    const lines = readFileSync(join(dir, '.sillyspec', '.runtime', 'verify-runs', 'reuse-decisions-c1.jsonl'), 'utf8').trim().split('\n')
    assert.equal(lines.length, 1)
    assert.equal(JSON.parse(lines[0]).layer, 'unit')
  } finally {
    try { rmSync(dir, { recursive: true, force: true }) } catch {}
  }
})
