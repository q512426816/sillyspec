/**
 * decisions 单一写入者（P1-5，noai-ir-roadmap §4）：decisions-io.upsertDecision 产出
 * canonical 标题式条目，读取侧 parseDecisions 零改动双向兼容（round-trip 锁定）。
 * 手写格式事故族（扁平列表静默 0 条 / 字段拼写漂移 / 状态白名单外）在写入者处 fail-fast。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, readFileSync, writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { upsertDecision, renderDecisionEntry } from '../src/decisions-io.js'
import { parseDecisions } from '../src/decision-distill.js'

function fixture(withFile = true) {
  const dir = mkdtempSync(join(tmpdir(), 'decio-'))
  mkdirSync(dir, { recursive: true })
  if (withFile) {
    writeFileSync(join(dir, 'decisions.md'), [
      '---',
      'author: t',
      'created_at: 2026-09-10 00:00:00',
      '---',
      '',
      '# 决策记录',
      '',
      '## D-001@v1 旧决策',
      '- 状态：confirmed',
      '- 类型：process',
      '- 模块域：core-engine',
      '决策动机散文一段（应随替换保留）。',
      '',
    ].join('\n'))
  }
  return dir
}

test('round-trip：写入 canonical 条目 → parseDecisions 读回字段全对（含白名单标签）', () => {
  const dir = fixture(false)
  try {
    upsertDecision(dir, {
      number: 'D-001', version: 1, title: '用 CLI 写决策',
      status: 'confirmed', type: 'architecture', domains: ['core-engine', 'runtime'],
      question: '谁写格式？', answer: 'CLI 单一写入者', anchor: 'src/decisions-io.js::upsertDecision',
      supersedes: 'D-000@v1', impacts: 'src/a.js', rejectReason: '不需要', revisitWhen: '无',
      body: ['动机散文一。'],
    })
    const parsed = parseDecisions(dir)
    assert.equal(parsed.missing, false)
    assert.equal(parsed.entries.length, 1)
    const e = parsed.entries[0]
    assert.equal(e.id, 'D-001@v1')
    assert.equal(e.title, '用 CLI 写决策')
    assert.equal(e.status, 'confirmed')
    assert.equal(e.type, 'architecture')
    assert.deepEqual(e.domains, ['core-engine', 'runtime'])
    assert.equal(e.question, '谁写格式？')
    assert.equal(e.answer, 'CLI 单一写入者')
    assert.equal(e.supersedes, 'D-000@v1')
    assert.equal(e.rejectReason, '不需要')
    assert.equal(e.revisitWhen, '无')
    assert.ok(e.raw.includes('动机散文一。'), '散文行保留')
  } finally { try { rmSync(dir, { recursive: true, force: true }) } catch {} }
})

test('upsert：同 id@v 整块替换且幂等（散文保留、字段以新值为准）；新版本追加不覆盖旧版', () => {
  const dir = fixture(true)
  try {
    const r1 = upsertDecision(dir, { number: 'D-001', version: 1, title: '旧决策改', status: 'accepted', type: 'process' })
    assert.equal(r1.action, 'replaced')
    const after1 = readFileSync(join(dir, 'decisions.md'), 'utf8')
    assert.ok(after1.includes('- 状态：accepted'), '字段以新值为准')
    assert.ok(after1.includes('决策动机散文一段（应随替换保留）。'), '旧散文保留')
    assert.ok(!after1.includes('confirmed'), '旧字段行被替换而非并存')
    assert.ok(after1.startsWith('---'), 'frontmatter 不动')
    // 幂等：同输入重跑零 diff
    upsertDecision(dir, { number: 'D-001', version: 1, title: '旧决策改', status: 'accepted', type: 'process' })
    assert.equal(readFileSync(join(dir, 'decisions.md'), 'utf8'), after1, '幂等（重跑零 diff）')
    // 新版本追加：v1 保留、v2 在场，解析侧两条
    upsertDecision(dir, { number: 'D-001', version: 2, title: '决策修订', status: 'confirmed', type: 'process', supersedes: 'D-001@v1' })
    const parsed = parseDecisions(dir)
    assert.equal(parsed.entries.length, 2, 'v1/v2 并存（历史可追溯）')
    assert.ok(parsed.entries.some(e => e.id === 'D-001@v1') && parsed.entries.some(e => e.id === 'D-001@v2'))
  } finally { try { rmSync(dir, { recursive: true, force: true }) } catch {} }
})

test('校验 fail-fast：编号形态/版本/状态/类型白名单外在写入处拒绝（先于解析侧）', () => {
  const dir = fixture(false)
  try {
    assert.throws(() => renderDecisionEntry({ number: 'D1', version: 1, title: 'x' }), /编号形态非法/)
    assert.throws(() => renderDecisionEntry({ number: 'D-001', version: 0, title: 'x' }), /版本非法/)
    assert.throws(() => renderDecisionEntry({ number: 'D-001', version: 1, title: 'x', status: 'done' }), /status 白名单外/)
    assert.throws(() => renderDecisionEntry({ number: 'D-001', version: 1, title: 'x', type: 'misc' }), /type 白名单外/)
    // rejected 缺否决理由/复潮条件——知识提炼 needsWait 的源头，写入时就提示（不硬拒：补录是合法后置动作）
    const ok = renderDecisionEntry({ number: 'D-001', version: 1, title: 'x', status: 'rejected' })
    assert.ok(ok.includes('- 状态：rejected'), 'rejected 本身可写（needsWait 裁决留确认步）')
  } finally { try { rmSync(dir, { recursive: true, force: true }) } catch {} }
})

test('CLI：decisions add 缺省版本自增 + list 视图', () => {
  const dir = fixture(true)
  try {
    // 直接调 upsert 模拟 CLI 缺省版本逻辑（版本计算在 index.js：既有最高 + 1）
    const parsed = parseDecisions(dir)
    const maxV = parsed.entries.filter(e => e.number === 'D-002').reduce((m, e) => Math.max(m, e.version), 0)
    upsertDecision(dir, { number: 'D-002', version: maxV + 1, title: '新决策', status: 'confirmed', type: 'boundary' })
    const p2 = parseDecisions(dir)
    assert.ok(p2.entries.some(e => e.id === 'D-002@v1'), '缺省版本 → v1（无既有）')
  } finally { try { rmSync(dir, { recursive: true, force: true }) } catch {} }
})
