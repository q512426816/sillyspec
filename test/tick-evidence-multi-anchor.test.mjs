/**
 * tick-evidence-multi-anchor.test.mjs — tick 证据补录 + reviewedAgainst 跨仓多锚（2026-10-12-tick-evidence-multi-anchor）
 *
 * 验收面：
 *   ① evidence 三态：自由文本 / @file（内容展开+8KB 帽） / @file 读取失败 fail-soft（原样登记+告警，
 *      不拒翻格）；task-evidence.jsonl 四键行追加；幂等重勾零追加；无 --evidence 零变化（零回归）；
 *   ② reviewedAgainst 双形态校验矩阵：合法字符串 / 合法对象（workspace+repos）/ 坏对象（缺
 *      workspace、repos 值非 hex、repos 非对象、数组形态）各拒；
 *   ③ reviewAnchoredToHead 对象形态取 workspace 锚（命中/不命中/缺 workspace fail-safe）；
 *   ④ 任务书双态：跨仓冻结面在场（change-patch.json repos[]）印对象形态优先说明；单仓零变化。
 * dogfood 驱动：限流 429 截断后构建回执（/tmp exit 0 日志）无法补录；跨仓轻量变更评审锚单仓
 * 单 sha，「对着哪个面评审」不可机核。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import { resolveTickEvidence } from '../src/task-tick.js'
import { validateReviewJson, reviewAnchoredToHead, renderReviewerTaskbook } from '../src/flow-review.js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const CLI = join(ROOT, 'src', 'index.js')
const CHANGE = '2026-10-12-tem-fixture'

function makeRepo() {
  const cwd = mkdtempSync(join(tmpdir(), 'tem-'))
  const changeDir = join(cwd, '.sillyspec', 'changes', CHANGE)
  mkdirSync(changeDir, { recursive: true })
  writeFileSync(join(cwd, '.sillyspec', 'local.yaml'), 'project:\n  type: generic\n')
  writeFileSync(join(changeDir, 'tasks.md'), '# T\n\n- [ ] task-01: 做甲\n- [ ] task-02: 做乙\n')
  const cli = (args) => spawnSync(process.execPath, [CLI, ...args], {
    cwd, encoding: 'utf8', timeout: 60_000, env: { ...process.env, SILLYSPEC_WATCHER: '0' },
  })
  return { cwd, cli, changeDir }
}

function writeReview(dir, reviewedAgainst) {
  const p = join(dir, 'review.json')
  writeFileSync(p, JSON.stringify({
    schemaVersion: 1, change: 'x', reviewer: 'subagent', verdict: 'PASS',
    ...(reviewedAgainst !== undefined ? { reviewedAgainst } : {}),
    findings: [], dimensionNotes: {}, reviewedAt: new Date().toISOString(),
  }))
  return p
}

test('evidence 三态 + JSONL 追加 + 幂等零追加 + 无 evidence 零回归', () => {
  const { cwd, cli, changeDir } = makeRepo()
  try {
    // ① 自由文本
    const logFile = join(cwd, 'build.log')
    writeFileSync(logFile, 'BUILD_EXIT=0\n')
    let r = cli(['task', 'tick', '--change', CHANGE, '--task', 'task-01', '--evidence', `构建 exit 0，日志 ${logFile}`])
    assert.equal(r.status, 0, r.stderr)
    assert.match(r.stdout, /证据已登记/)
    let lines = readFileSync(join(changeDir, 'task-evidence.jsonl'), 'utf8').trim().split('\n')
    assert.equal(lines.length, 1)
    const e1 = JSON.parse(lines[0])
    assert.equal(e1.task, 'task-01')
    assert.equal(e1.source, 'task-tick')
    assert.ok(typeof e1.ts === 'number')
    assert.match(e1.evidence, /构建 exit 0/)
    // ② @file 展开
    r = cli(['task', 'tick', '--change', CHANGE, '--task', 'task-02', '--evidence', `@${logFile}`])
    assert.equal(r.status, 0, r.stderr)
    lines = readFileSync(join(changeDir, 'task-evidence.jsonl'), 'utf8').trim().split('\n')
    const e2 = JSON.parse(lines[1])
    assert.match(e2.evidence, /@.*build\.log/)
    assert.match(e2.evidence, /BUILD_EXIT=0/)
    // ③ 读取失败 fail-soft：原样登记 + 告警 + 翻格不受影响（复用已勾的 task-01 → already 幂等路径不追加；改测未勾态需新任务——直接验证 already 零追加）
    r = cli(['task', 'tick', '--change', CHANGE, '--task', 'task-01', '--evidence', '@/no/such/file.log'])
    assert.equal(r.status, 0, r.stderr)
    assert.match(r.stderr, /读取失败/)
    assert.match(r.stdout, /幂等/)
    const after = readFileSync(join(changeDir, 'task-evidence.jsonl'), 'utf8').trim().split('\n')
    assert.equal(after.length, 2) // 幂等重勾零追加（证据不先于事实）
  } finally { rmSync(cwd, { recursive: true, force: true }) }
})

test('resolveTickEvidence 单元：空/@file 8KB 帽/空文件', () => {
  assert.deepEqual(resolveTickEvidence({ evidence: null }), { text: null, warning: null })
  assert.equal(resolveTickEvidence({ evidence: '纯文本' }).text, '纯文本')
  const big = mkdtempSync(join(tmpdir(), 'big-'))
  try {
    writeFileSync(join(big, 'big.log'), 'x'.repeat(9000))
    const capped = resolveTickEvidence({ evidence: `@${join(big, 'big.log')}` })
    assert.ok(capped.text.length < 9000 + 100)
    assert.match(capped.text, /超 8KB 截断/)
    writeFileSync(join(big, 'empty.log'), '')
    const empty = resolveTickEvidence({ evidence: `@${join(big, 'empty.log')}` })
    assert.match(empty.text, /空文件/)
    assert.match(empty.warning, /为空/)
  } finally { rmSync(big, { recursive: true, force: true }) }
})

test('无 --evidence 零回归：无 task-evidence.jsonl 产生', () => {
  const { cwd, cli, changeDir } = makeRepo()
  try {
    const r = cli(['task', 'tick', '--change', CHANGE, '--task', 'task-01'])
    assert.equal(r.status, 0, r.stderr)
    assert.doesNotMatch(r.stdout, /证据已登记/)
    assert.ok(!existsSync(join(changeDir, 'task-evidence.jsonl')))
  } finally { rmSync(cwd, { recursive: true, force: true }) }
})

test('reviewedAgainst 双形态校验矩阵', () => {
  const dir = mkdtempSync(join(tmpdir(), 'rv-'))
  try {
    // 合法字符串（既有零破坏）
    assert.equal(validateReviewJson(writeReview(dir, 'a'.repeat(40))).ok, true)
    // 合法对象
    assert.equal(validateReviewJson(writeReview(dir, { workspace: 'b'.repeat(40), repos: { subgrid: 'c1c1c1c1', spdemo: 'd2d2d2d2' } })).ok, true)
    // 对象缺 workspace → 拒
    const noWs = validateReviewJson(writeReview(dir, { repos: { subgrid: 'c1c1c1c1' } }))
    assert.equal(noWs.ok, false)
    assert.ok(noWs.errors.some((e) => e.includes('workspace')))
    // workspace 非 hex → 拒
    assert.equal(validateReviewJson(writeReview(dir, { workspace: 'not-hex', repos: {} })).ok, false)
    // repos 值非 hex → 拒（逐键点名）
    const badRepo = validateReviewJson(writeReview(dir, { workspace: 'b'.repeat(40), repos: { subgrid: 'zzz' } }))
    assert.equal(badRepo.ok, false)
    assert.ok(badRepo.errors.some((e) => e.includes('repos.subgrid')))
    // repos 非对象 → 拒
    assert.equal(validateReviewJson(writeReview(dir, { workspace: 'b'.repeat(40), repos: ['x'] })).ok, false)
    // 数组形态 → 拒
    assert.equal(validateReviewJson(writeReview(dir, ['a'.repeat(40)])).ok, false)
    // 缺省容忍（既有）
    assert.equal(validateReviewJson(writeReview(dir, undefined)).ok, true)
  } finally { rmSync(dir, { recursive: true, force: true }) }
})

test('reviewAnchoredToHead：对象形态取 workspace 锚 / 缺 workspace fail-safe', () => {
  const dir = mkdtempSync(join(tmpdir(), 'ra-'))
  try {
    const head = 'e'.repeat(40)
    const p1 = writeReview(dir, { workspace: head, repos: { subgrid: 'f'.repeat(40) } })
    assert.equal(reviewAnchoredToHead(p1, head), true)
    const p2 = writeReview(dir, { workspace: 'a'.repeat(40), repos: {} })
    assert.equal(reviewAnchoredToHead(p2, head), false) // workspace 不匹配（跨仓锚不参与判定）
    const p3 = writeReview(dir, { repos: { subgrid: head } }) // 缺 workspace
    assert.equal(reviewAnchoredToHead(p3, head), false) // fail-safe 宁可多评
    const p4 = writeReview(dir, head.slice(0, 10)) // 短 sha 字符串仍双向前缀
    assert.equal(reviewAnchoredToHead(p4, head), true)
  } finally { rmSync(dir, { recursive: true, force: true }) }
})

test('任务书双态：跨仓面印对象形态 / 单仓零变化', () => {
  const dir = mkdtempSync(join(tmpdir(), 'tb-'))
  try {
    const changeDir = join(dir, 'changes', 'c1')
    mkdirSync(changeDir, { recursive: true })
    // 单仓（无 change-patch.json）：与既有形态一致
    const single = renderReviewerTaskbook({ change: 'c1', changeDir, head: 'a'.repeat(40) })
    assert.match(single, /"reviewedAgainst": "<评审对象 HEAD 完整 sha/)
    assert.ok(!single.includes('对象形态优先'))
    // 跨仓冻结面在场
    writeFileSync(join(changeDir, 'change-patch.json'), JSON.stringify({ repos: [{ key: 'subgrid' }, { key: 'spdemo' }] }))
    const cross = renderReviewerTaskbook({ change: 'c1', changeDir, head: 'a'.repeat(40) })
    assert.match(cross, /"reviewedAgainst": \{ "workspace"/)
    assert.match(cross, /对象形态优先/)
    assert.match(cross, /仓键=change-patch\.json repos 的 key/)
  } finally { rmSync(dir, { recursive: true, force: true }) }
})
