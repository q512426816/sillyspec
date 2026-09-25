/**
 * fr-unmapped-repair.test.mjs — 幽灵条目治理（2026-09-25-fr-unmapped-repair）
 *
 * 覆盖验收面：
 *   ① 写入路径健壮性钉：indexRequirements 产出的域文件经 splitKnowledgeSections 解析，
 *      preamble 零孤立字段行（变更：/状态：开头）——本仓写入路径不可能产出缺节头幽灵条目
 *      （unmapped.md 的 7 条幽灵来自 80355e9b 外部合回切割损伤，属人工操作面，机器不防）；
 *   ② 修复数据钉：unmapped 域 714-720 号条目可被 readActiveFrDigest 读到（标题非佚失）。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const frIndex = await import(pathToFileURL(join(ROOT, 'src', 'fr-index.js')).href)
const { indexRequirements, readActiveFrDigest } = frIndex
const { splitKnowledgeSections } = await import(pathToFileURL(join(ROOT, 'src', 'decision-distill.js')).href)

test('① 写入路径钉：indexRequirements 产出经解析 preamble 零孤立字段行', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'fur-'))
  try {
    const changeDir = join(tmp, 'changes', 'c-orph')
    mkdirSync(changeDir, { recursive: true })
    writeFileSync(join(changeDir, 'requirements.md'), [
      '# 需求',
      '',
      '### FR-01: 首条行为',
      'Given x',
      'When y',
      'Then z',
      '',
      '### FR-02: 次条行为',
      '承接: FR-unmapped-001',
      'Given a',
      'When b',
      'Then c',
      '',
    ].join('\n'))
    const knowledgeRoot = join(tmp, 'knowledge')
    mkdirSync(knowledgeRoot, { recursive: true })
    const r = indexRequirements({ changeDir, knowledgeRoot, headHash: 'abc', deliverableFiles: ['docs/orphan/x.md'] })
    assert.ok(r.written.length > 0, `应写入条目: ${JSON.stringify(r)}`)
    for (const w of r.written) {
      const text = readFileSync(join(knowledgeRoot, w.file), 'utf8')
      const parsed = splitKnowledgeSections(text, { sectionRegex: /^## (FR-[a-z0-9-]+-\d+)(?:@v(\d+))?\s*(.*)$/, buildId: (n) => n })
      const orphan = parsed.preamble.filter((l) => /^(变更|状态)：/.test(l))
      assert.deepEqual(orphan, [], `域文件 ${w.file} 的 preamble 不应有孤立字段行（幽灵条目面）`)
      assert.equal(parsed.sections.length, r.written.length, '全部条目可解析为 section')
    }
  } finally { rmSync(tmp, { recursive: true, force: true }) }
})

test('② 修复数据钉：unmapped 714-720 幽灵修复条目可读且标题恢复', () => {
  const frs = readActiveFrDigest(join(ROOT, '.sillyspec', 'knowledge'), ['unmapped'])
  const repaired = frs.filter((f) => {
    const n = parseInt(String(f.id).split('-')[2], 10)
    return n >= 714 && n <= 720
  })
  assert.equal(repaired.length, 7, `714-720 应 7 条，实际 ${repaired.length}`)
  assert.ok(repaired.every((f) => f.title && !f.title.includes('佚失')), `标题全部恢复: ${repaired.map((f) => f.title).join('、')}`)
})
