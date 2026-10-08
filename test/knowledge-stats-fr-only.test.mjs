/**
 * --fr-only 三态测试（2026-10-08-knowledge-stats-fr-only）
 *
 * 覆盖：
 *   1. --fr-only 人类模式：仅 FR 索引段（无命中矩阵/无遥测计数头）
 *   2. --fr-only --json：data 仅含 frIndex（envelope 外壳 ok/sinceDays 等顶层键不变）
 *   3. 不带 flag：行为零变化（matrix/neverHit/totalInjects 等键全在场——完整性反向钉）
 *
 * 风格：自研 assert 对齐仓内裸脚本，cmdKnowledgeStats 直驱（tmp fixture 含 knowledge/fr + hits.jsonl）。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { cmdKnowledgeStats } from '../src/knowledge-stats.js'

function makeFixture() {
  const tmp = mkdtempSync(join(tmpdir(), 'fr-only-'))
  const base = join(tmp, '.sillyspec')
  const knowledgeDir = join(base, 'knowledge')
  const runtimeDir = join(base, '.runtime')
  mkdirSync(join(knowledgeDir, 'fr'), { recursive: true })
  mkdirSync(runtimeDir, { recursive: true })
  const NL = String.fromCharCode(10)
  writeFileSync(join(knowledgeDir, 'fr', 'core-engine.md'),
    '# FR 索引 — core-engine' + NL + NL +
    '## FR-core-engine-001 定价引擎' + NL + '变更：c1' + NL + '状态：active' + NL + '摘要：x' + NL)
  writeFileSync(join(knowledgeDir, 'INDEX.md'), '# Knowledge Index' + NL + NL + '## Conventions' + NL + '- key|route → [conventions.md#a](conventions.md#a)' + NL)
  const at = new Date().toISOString()
  writeFileSync(join(runtimeDir, 'knowledge-hits.jsonl'),
    JSON.stringify({ type: 'inject', change: 'c1', matchedFiles: ['conventions.md#a'], at }) + NL +
    JSON.stringify({ type: 'fr-inject', change: 'c1', domains: ['core-engine'], count: 1, source: 'module-inject', at }) + NL)
  return { tmp, base, knowledgeDir, runtimeDir }
}

function captureStdout(fn) {
  const orig = console.log
  let buf = ''
  console.log = (...a) => { buf += a.join(' ') + '\n' }
  let jsonOut = null
  try { jsonOut = fn() } finally { console.log = orig }
  return { text: buf, json: jsonOut }
}

test('FR-01: --fr-only 人类模式仅含 FR 索引段', () => {
  const fx = makeFixture()
  try {
    const { text } = captureStdout(() => cmdKnowledgeStats(fx.tmp, ['--fr-only'], { specDir: fx.base, runtimeDir: fx.runtimeDir }))
    assert.ok(text.includes('FR 索引实验'), '含 FR 索引段标题')
    assert.ok(!text.includes('命中矩阵'), '不含命中矩阵段')
    assert.ok(!text.includes('knowledge stats（近'), '不含总标题头')
    assert.ok(!text.includes('遥测计数'), '不含遥测计数行')
  } finally { rmSync(fx.tmp, { recursive: true, force: true }) }
})

test('FR-02: 不带 flag 行为零变化（完整性反向钉）', () => {
  const fx = makeFixture()
  try {
    const { text } = captureStdout(() => cmdKnowledgeStats(fx.tmp, [], { specDir: fx.base, runtimeDir: fx.runtimeDir }))
    assert.ok(text.includes('knowledge stats（近'), '含总标题头（原行为）')
    assert.ok(text.includes('命中矩阵') || text.includes('近 30 天无命中'), '含矩阵段或无命中提示（原行为）')
    assert.ok(text.includes('遥测计数'), '含遥测计数行（原行为）')
    assert.ok(text.includes('FR 索引实验'), 'FR 段也在（原行为含全量段）')
  } finally { rmSync(fx.tmp, { recursive: true, force: true }) }
})

test('FR-03: --json --fr-only envelope 不变仅过滤 data 键', () => {
  const fx = makeFixture()
  try {
    // --json 模式 outputJson 写 stdout（不走 console.log）——用 process.stdout 劫持或直接调
    // outputJson 会被 asJson 分支调；此处用子进程或直调后检查返回值。cmdKnowledgeStats 无返回值，
    // --json 走 outputJson → console.log(JSON.stringify(...))——同 captureStdout 拿 JSON
    const { text } = captureStdout(() => cmdKnowledgeStats(fx.tmp, ['--fr-only', '--json'], { specDir: fx.base, runtimeDir: fx.runtimeDir, json: true }))
    const d = JSON.parse(text.trim())
    assert.ok(d.ok === true, 'envelope ok=true')
    assert.ok('sinceDays' in d && 'hasTelemetry' in d, 'envelope 顶层 sinceDays/hasTelemetry 在场')
    assert.ok('frIndex' in d, 'data 有 frIndex')
    assert.ok(!('matrix' in d), 'data 无 matrix（被过滤）')
    assert.ok(!('neverHit' in d), 'data 无 neverHit（被过滤）')
    assert.ok(!('totalInjects' in d), 'data 无 totalInjects（被过滤）')
  } finally { rmSync(fx.tmp, { recursive: true, force: true }) }
})

test('FR-04: 三态全覆盖（前面三个 test 即三态——本 test 钉组合可用性）', () => {
  const fx = makeFixture()
  try {
    const { text } = captureStdout(() => cmdKnowledgeStats(fx.tmp, ['--fr-only', '--json'], { specDir: fx.base, runtimeDir: fx.runtimeDir, json: true }))
    const d = JSON.parse(text.trim())
    assert.ok(d.frIndex && d.frIndex.events && d.frIndex.events.frInject >= 1, 'frIndex.events.frInject >= 1（fixture 有 1 条）')
  } finally { rmSync(fx.tmp, { recursive: true, force: true }) }
})
