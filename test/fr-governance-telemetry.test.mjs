/**
 * fr-governance-telemetry.test.mjs — 治理遥测补齐（2026-10-03-fr-governance-telemetry）
 *
 * 验收面（FR-01~FR-04）：
 *   ① rot-suspect 事件带 frIds（帽 20，既有字段零改动）
 *   ② unreferenced 探针带 ids（帽 20）
 *   ③ 存量无字段事件兼容（既有读数不变，id 聚合跳过）
 *   ④ 裁决候选视图：id 聚合 Top 清单 + 来源变更 join；无 id 数据零候选
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = dirname(fileURLToPath(import.meta.url))
const { indexRequirements } = await import(pathToFileURL(join(ROOT, '..', 'src', 'fr-index.js')).href)
const { rotSuspectFlow } = await import(pathToFileURL(join(ROOT, '..', 'src', 'flow.js')).href)
const { buildFrIndexStats } = await import(pathToFileURL(join(ROOT, '..', 'src', 'knowledge-stats.js')).href)

function buildSpecBase(base) {
  const specBase = join(base, '.sillyspec')
  mkdirSync(join(specBase, 'knowledge', 'fr'), { recursive: true })
  mkdirSync(join(specBase, '.runtime'), { recursive: true })
  const mapDir = join(specBase, 'docs', 'proj', 'modules')
  mkdirSync(mapDir, { recursive: true })
  writeFileSync(join(mapDir, '_module-map.yaml'), 'modules:\n  cli:\n    paths:\n      - src/cli/\n')
  writeFileSync(join(specBase, 'knowledge', 'INDEX.md'), '# 知识索引\n')
  return specBase
}

function writeCliDomain(specBase, count, change) {
  const lines = ['---', 'author: sillyspec-fr-index', '---', '', '# FR 索引 — cli', '']
  for (let i = 1; i <= count; i++) {
    lines.push(
      `## FR-cli-${String(i).padStart(3, '0')} 功能${i}`, `变更：${change}`, '状态：active', '摘要：默认场景',
      '场景正文：', '- 场景：默认场景 — Given G；When W；Then T', `全文：x#FR-${i}`, '最近确认：a', '',
    )
  }
  writeFileSync(join(specBase, 'knowledge', 'fr', 'cli.md'), lines.join('\n'))
}

test('① rot-suspect 事件带 frIds 帽 20（既有字段零改动）', async () => {
  const tmp = mkdtempSync(join(tmpdir(), 'fgt1-'))
  try {
    const specBase = buildSpecBase(tmp)
    writeCliDomain(specBase, 25, '2026-09-01-old-a')
    // 25 条全命中（源变更归档覆盖触碰文件）——frIds 应帽 20
    const arch = join(specBase, 'changes', 'archive', '2026-09-01-old-a')
    mkdirSync(arch, { recursive: true })
    writeFileSync(join(arch, 'change-patch.json'), JSON.stringify({ files: ['src/cli/old.js'] }))
    const changeDir = join(specBase, 'changes', 'c-rot')
    mkdirSync(changeDir, { recursive: true })
    const r = await rotSuspectFlow({ specBase, change: 'c-rot', changeDir, files: ['src/cli/old.js'] })
    assert.equal(r.strong, 25, '25 条覆盖命中')
    const hits = readFileSync(join(specBase, '.runtime', 'knowledge-hits.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l))
    const ev = hits.find((h) => h.type === 'fr-rot-suspect')
    assert.ok(ev, '事件落盘')
    assert.equal(ev.frIds.length, 20, 'frIds 帽 20')
    assert.equal(ev.frIds[0], 'FR-cli-001')
    assert.equal(ev.strong, 25, '既有字段 strong 零改动')
    assert.equal(ev.count, 25, '既有字段 count 零改动')
    assert.equal(ev.source, 'flow-done', '既有字段 source 零改动')
  } finally { rmSync(tmp, { recursive: true, force: true }) }
})

test('② unreferenced 探针带 ids（帽 20）', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'fgt2-'))
  try {
    const specBase = buildSpecBase(tmp)
    writeCliDomain(specBase, 25, '2026-09-01-old-a')
    const changeDir = join(specBase, 'changes', 'c-unref')
    mkdirSync(changeDir, { recursive: true })
    writeFileSync(join(changeDir, 'requirements.md'), [
      '# R', '', '### FR-01: 新条目', 'Given G', 'When W', 'Then T', '',
    ].join('\n'))
    const r = indexRequirements({ changeDir, knowledgeRoot: join(specBase, 'knowledge'), headHash: 'h1', deliverableFiles: ['src/cli/a.js'] })
    assert.equal(r.unreferenced.length, 1, 'cli 域一条未引用记录')
    const u = r.unreferenced[0]
    assert.equal(u.domain, 'cli')
    assert.equal(u.count, 25, '全部 25 条存量 active 未被承接引用')
    assert.equal(u.ids.length, 20, 'ids 帽 20')
    assert.ok(u.ids.every((id) => /^FR-cli-\d{3}$/.test(id)), 'id 形态')
  } finally { rmSync(tmp, { recursive: true, force: true }) }
})

test('③④ 裁决候选聚合：id 聚合 + 来源 join；存量无字段事件兼容零破坏', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'fgt3-'))
  try {
    const specBase = buildSpecBase(tmp)
    writeCliDomain(specBase, 3, '2026-09-01-old-a')
    const at = new Date().toISOString()
    const events = [
      // 存量形态（无 frIds/ids）——既有读数照常、id 聚合跳过
      { type: 'fr-rot-suspect', change: 'c-legacy', domains: ['cli'], strong: 3, count: 3, source: 'flow-done', at },
      { type: 'fr-unreferenced', change: 'c-legacy', domain: 'cli', count: 3, at },
      // 新形态（带 id）
      { type: 'fr-rot-suspect', change: 'c-new', domains: ['cli'], strong: 2, count: 2, frIds: ['FR-cli-001', 'FR-cli-002'], source: 'flow-done', at },
      { type: 'fr-unreferenced', change: 'c-new', domain: 'cli', count: 2, ids: ['FR-cli-001', 'FR-cli-003'], at },
    ]
    writeFileSync(join(specBase, '.runtime', 'knowledge-hits.jsonl'), events.map((e) => JSON.stringify(e)).join('\n') + '\n')
    const s = buildFrIndexStats(join(specBase, 'knowledge'), join(specBase, '.runtime'), { sinceDays: 30 })
    assert.equal(s.events.frRotSuspect, 2, '事件计数含存量（兼容）')
    assert.equal(s.events.frRotSuspectByDomain.find((r) => r.domain === 'cli').count, 5, '域级求和口径不变（3+2）')
    assert.equal(s.events.frUnreferenced.length, 1, '域级 unreferenced 聚合不变')
    const cand = s.adjudicationCandidates
    assert.equal(cand.length, 3, '三条 id 进聚合')
    assert.deepEqual([cand[0].id, cand[0].suspect, cand[0].unreferenced], ['FR-cli-001', 1, 1], 'Top=suspect+unref 并列最高者（id 序 tie-break）')
    assert.equal(cand[0].change, '2026-09-01-old-a', '来源变更 join 自索引')
    assert.ok(cand.some((c) => c.id === 'FR-cli-002' && c.suspect === 1 && c.unreferenced === 0))
    assert.ok(cand.some((c) => c.id === 'FR-cli-003' && c.unreferenced === 1))

    // 无 id 数据（纯存量）→ 零候选（视图零噪音）
    const specBase2 = buildSpecBase(mkdtempSync(join(tmpdir(), 'fgt3b-')))
    writeCliDomain(specBase2, 2, '2026-09-01-old-a')
    writeFileSync(join(specBase2, '.runtime', 'knowledge-hits.jsonl'), JSON.stringify({ type: 'fr-rot-suspect', change: 'c', domains: ['cli'], count: 2, at }) + '\n')
    const s2 = buildFrIndexStats(join(specBase2, 'knowledge'), join(specBase2, '.runtime'), { sinceDays: 30 })
    assert.equal(s2.adjudicationCandidates.length, 0, '纯存量无 id → 零候选')
    try { rmSync(dirname(specBase2), { recursive: true, force: true }) } catch { /* Windows */ }
  } finally { rmSync(tmp, { recursive: true, force: true }) }
})
