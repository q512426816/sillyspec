/**
 * fr-inject-cap.test.mjs — {FR_INDEX_DIGEST} 注入收敛（2026-09-29-rot-retire-inject-cap）
 *
 * 验收面（FR-01/FR-07）：
 *   ① 滤 unmapped：unmapped-only 变更 → 专属空态文案（不落整池）；混合域 → 仅真域条目
 *   ② top-8 截断：大域 digest ≤8 条 + 「+N 条见」指针行；尾部承接指引 blockquote 保留
 *   ③ 遥测口径：count=全量、rendered/truncated 披露截断面、unmappedFiltered 披露滤除
 *   ④ 小域（≤8 条）：无指针行、blockquote 仍在
 *   ⑤⑥⑦（2026-10-03-fr-inject-relevance-rank）：两档排序——TierA 覆盖命中（🎯）置前、
 *   TierB 按来源变更日期新→旧（取代文件序前 8=每域最老 8 条的缺陷）；轻量道
 *   flowKnowledgeDigest 同步接入；遥测新增 tierA 披露。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = dirname(fileURLToPath(import.meta.url))
const { buildFrIndexDigestSection, FR_INDEX_DIGEST_MAX_ENTRIES } = await import(
  pathToFileURL(join(ROOT, '..', 'src', 'run', 'prompt.js')).href
)
const { flowKnowledgeDigest } = await import(pathToFileURL(join(ROOT, '..', 'src', 'flow.js')).href)

/** 夹具：cli 域（src/cli/ 前缀）N 条 active FR + unmapped 池 M 条。design.md 交付表决定域路由。 */
function buildSpecRoot(base, { cliCount = 0, unmappedCount = 0, designRows = [] } = {}) {
  const specBase = join(base, '.sillyspec')
  const knowledge = join(specBase, 'knowledge')
  const frDir = join(knowledge, 'fr')
  mkdirSync(frDir, { recursive: true })
  const mapDir = join(specBase, 'docs', 'proj', 'modules')
  mkdirSync(mapDir, { recursive: true })
  writeFileSync(join(mapDir, '_module-map.yaml'), 'modules:\n  cli:\n    paths:\n      - src/cli/\n')
  const mkDomain = (domain, count, change) => {
    if (count === 0) return
    const lines = ['---', 'author: sillyspec-fr-index', '---', '', `# FR 索引 — ${domain}`, '']
    for (let i = 1; i <= count; i++) {
      lines.push(`## FR-${domain}-${String(i).padStart(3, '0')} 功能${i}`, `变更：${change}`, '状态：active',
        '摘要：默认场景', '场景正文：', `- 场景：默认场景 — Given G${i} When W${i} Then T${i}`,
        `全文：${change}/requirements.md#FR-${i}`, `最近确认：aaaa${i}`, '')
    }
    writeFileSync(join(frDir, `${domain}.md`), lines.join('\n'))
  }
  mkDomain('cli', cliCount, 'hist-cli')
  mkDomain('unmapped', unmappedCount, 'hist-unmapped')
  return specBase
}

function writeChange(specBase, name, designRows) {
  const changeDir = join(specBase, 'changes', name)
  mkdirSync(changeDir, { recursive: true })
  writeFileSync(join(changeDir, 'design.md'), designRows.map((r) => `| 修改 | ${r} | x |`).join('\n') + '\n')
  return changeDir
}

test('① unmapped-only 变更：专属空态文案，整池不进 prompt', async () => {
  const tmp = mkdtempSync(join(tmpdir(), 'fic1-'))
  try {
    const specBase = buildSpecRoot(tmp, { unmappedCount: 20 })
    writeChange(specBase, 'c-unmapped-only', ['docs/zzz.md'])
    const r = await buildFrIndexDigestSection({ frSpecBase: specBase, changeName: 'c-unmapped-only' })
    assert.ok(r.text.includes('unmapped') && r.text.includes('不注入'), '应给 unmapped 专属空态文案')
    assert.ok(!r.text.includes('FR-unmapped-'), '不得渲染 unmapped 池条目')
    assert.deepEqual(r.telemetry.domains, [], '遥测 domains 为滤后空集')
    assert.equal(r.telemetry.count, 0, 'count=0')
    assert.equal(r.telemetry.unmappedFiltered, true, 'unmappedFiltered=true')
  } finally { rmSync(tmp, { recursive: true, force: true }) }
})

test('② 大域截断：≤8 条渲染 + 指针行 + blockquote 保留；遥测全量口径', async () => {
  const tmp = mkdtempSync(join(tmpdir(), 'fic2-'))
  try {
    const specBase = buildSpecRoot(tmp, { cliCount: 12 })
    writeChange(specBase, 'c-big', ['src/cli/a.js'])
    const r = await buildFrIndexDigestSection({ frSpecBase: specBase, changeName: 'c-big' })
    const entryLines = r.text.split('\n').filter((l) => l.startsWith('- FR-cli-'))
    assert.equal(entryLines.length, FR_INDEX_DIGEST_MAX_ENTRIES, `渲染条目应 ≤${FR_INDEX_DIGEST_MAX_ENTRIES}`)
    assert.ok(r.text.includes(`+${12 - FR_INDEX_DIGEST_MAX_ENTRIES} 条见 knowledge/fr/`), '指针行在场')
    assert.ok(r.text.includes('> 域解析自本变更 design.md 文件清单'), '尾部承接指引 blockquote 保留')
    assert.ok(r.text.indexOf('+4 条见') < r.text.indexOf('> 域解析自'), '指针行在 blockquote 之前（先截后追加）')
    assert.equal(r.telemetry.count, 12, '遥测 count=全量 12')
    assert.equal(r.telemetry.rendered, 8)
    assert.equal(r.telemetry.truncated, 4)
    assert.equal(r.telemetry.unmappedFiltered, false)
  } finally { rmSync(tmp, { recursive: true, force: true }) }
})

test('①b 混合交付：真域命中即路由（unmapped 兜底不叠加）', async () => {
  const tmp = mkdtempSync(join(tmpdir(), 'fic3-'))
  try {
    const specBase = buildSpecRoot(tmp, { cliCount: 3, unmappedCount: 5 })
    writeChange(specBase, 'c-mixed', ['src/cli/a.js', 'docs/zzz.md'])
    const r = await buildFrIndexDigestSection({ frSpecBase: specBase, changeName: 'c-mixed' })
    assert.ok(r.text.includes('FR-cli-001'), '真域条目在场')
    assert.ok(!r.text.includes('FR-unmapped-'), 'unmapped 条目不得渲染')
    // resolveTouchedDomains 的 unmapped 是零命中兜底——真域命中时不与之并存（unmappedFiltered 恒 false）
    assert.deepEqual(r.telemetry.domains, ['cli'])
    assert.equal(r.telemetry.unmappedFiltered, false)
    assert.equal(r.telemetry.count, 3)
  } finally { rmSync(tmp, { recursive: true, force: true }) }
})

test('④ 小域：无指针行、blockquote 仍在、空域清单走通用空态', async () => {
  const tmp = mkdtempSync(join(tmpdir(), 'fic4-'))
  try {
    const specBase = buildSpecRoot(tmp, { cliCount: 3 })
    writeChange(specBase, 'c-small', ['src/cli/a.js'])
    const r = await buildFrIndexDigestSection({ frSpecBase: specBase, changeName: 'c-small' })
    assert.ok(!r.text.includes('条见 knowledge/fr/'), '未截断时无指针行')
    assert.ok(r.text.includes('> 域解析自本变更 design.md 文件清单'), 'blockquote 保留')
    assert.equal(r.telemetry.truncated, 0)

    // 零触达域（design 空表）→ 通用空态（非 unmapped 专属文案）
    const specBase2 = buildSpecRoot(tmp, { cliCount: 1 })
    writeChange(specBase2, 'c-none', [])
    const r2 = await buildFrIndexDigestSection({ frSpecBase: specBase2, changeName: 'c-none' })
    assert.ok(r2.text.includes('首批需求'), '无域依据走通用空态文案')
  } finally { rmSync(tmp, { recursive: true, force: true }) }
})

/** 富夹具（2026-10-03-fr-inject-relevance-rank）：逐条指定来源变更名（日期前缀驱动 TierB 排序），
 *  可选为来源变更落归档 change-patch.json（驱动 TierA 覆盖命中）。module map 复用 buildSpecRoot 骨架。 */
function buildSpecRootRich(base, { entries = [], archives = {} } = {}) {
  const specBase = buildSpecRoot(base, {})
  const frDir = join(specBase, 'knowledge', 'fr')
  const byDomain = new Map()
  for (const e of entries) {
    if (!byDomain.has(e.domain)) byDomain.set(e.domain, [])
    byDomain.get(e.domain).push(e)
  }
  for (const [domain, list] of byDomain) {
    const lines = ['---', 'author: sillyspec-fr-index', '---', '', `# FR 索引 — ${domain}`, '']
    for (const e of list) {
      lines.push(`## FR-${domain}-${String(e.n).padStart(3, '0')} ${e.title}`, `变更：${e.change}`, '状态：active',
        '摘要：默认场景', '场景正文：', `- 场景：默认场景 — Given G When W Then T`,
        `全文：${e.change}/requirements.md#FR-${e.n}`, `最近确认：aaaa${e.n}`, '')
    }
    writeFileSync(join(frDir, `${domain}.md`), lines.join('\n'))
  }
  const archRoot = join(specBase, 'changes', 'archive')
  for (const [name, files] of Object.entries(archives)) {
    const d = join(archRoot, name)
    mkdirSync(d, { recursive: true })
    writeFileSync(join(d, 'change-patch.json'), JSON.stringify({ files }))
  }
  // 知识向量匹配面最小件（matchKnowledgeHybrid fail-soft 依赖 INDEX 在场）
  writeFileSync(join(specBase, 'knowledge', 'INDEX.md'), '# 知识索引\n')
  return specBase
}

const RICH12 = () => Array.from({ length: 12 }, (_, i) => {
  const n = i + 1
  return { domain: 'cli', n, title: `功能${n}`, change: n <= 4 ? '2026-05-01-old-a' : '2026-09-30-new-b' }
})

test('⑤ 覆盖命中进注入：最老命中条目带 🎯 置首，遥测 tierA 披露', async () => {
  const tmp = mkdtempSync(join(tmpdir(), 'fic5-'))
  try {
    const entries = RICH12()
    // 3 号条目来源变更归档且覆盖 src/cli/old.js；同组其余（1/2/4）来源无归档=coverage 不可判
    entries[2].change = '2026-05-02-old-c'
    const specBase = buildSpecRootRich(tmp, { entries, archives: { '2026-05-02-old-c': ['src/cli/old.js'] } })
    writeChange(specBase, 'c-covhit', ['src/cli/old.js'])
    const r = await buildFrIndexDigestSection({ frSpecBase: specBase, changeName: 'c-covhit' })
    const entryLines = r.text.split('\n').filter((l) => l.startsWith('- FR-cli-'))
    assert.equal(entryLines.length, FR_INDEX_DIGEST_MAX_ENTRIES, '渲染条目仍帽 8')
    assert.ok(r.text.includes('FR-cli-003 🎯'), '覆盖命中的最老条目带 🎯')
    assert.ok(entryLines[0].startsWith('- FR-cli-003'), 'TierA 置首')
    assert.ok(!entryLines.some((l) => l.startsWith('- FR-cli-001')), '非命中老条目让位新日期组（旧缺陷：最老 8 恒占席）')
    assert.ok(!entryLines.some((l) => l.startsWith('- FR-cli-004')), '同上')
    assert.equal(r.telemetry.tierA, 1, '遥测披露覆盖命中数')
    assert.equal(r.telemetry.count, 12)
    assert.equal(r.telemetry.rendered, 8)
    assert.equal(r.telemetry.truncated, 4)
  } finally { rmSync(tmp, { recursive: true, force: true }) }
})

test('⑥ 无覆盖命中：TierB 按来源变更日期新→旧（新组先行，老组进截断面）', async () => {
  const tmp = mkdtempSync(join(tmpdir(), 'fic6-'))
  try {
    const specBase = buildSpecRootRich(tmp, { entries: RICH12() })
    writeChange(specBase, 'c-recency', ['src/cli/a.js'])
    const r = await buildFrIndexDigestSection({ frSpecBase: specBase, changeName: 'c-recency' })
    const entryLines = r.text.split('\n').filter((l) => l.startsWith('- FR-cli-'))
    assert.equal(entryLines.length, FR_INDEX_DIGEST_MAX_ENTRIES)
    for (let n = 5; n <= 12; n++) assert.ok(entryLines.some((l) => l.startsWith(`- FR-cli-${String(n).padStart(3, '0')}`)), `新组 FR-cli-${n} 应在场`)
    assert.ok(!entryLines.some((l) => l.startsWith('- FR-cli-001')), '老组被挤出注入面')
    assert.ok(!r.text.includes('🎯'), '无命中无 🎯')
    assert.equal(r.telemetry.tierA, 0)
    assert.ok(r.text.includes('+4 条见 knowledge/fr/'), '指针行保留')
  } finally { rmSync(tmp, { recursive: true, force: true }) }
})

test('⑦ 轻量道 flowKnowledgeDigest 接入：filesOverride 命中带 🎯；小域行集合不回归', async () => {
  const tmp = mkdtempSync(join(tmpdir(), 'fic7-'))
  try {
    const entries = RICH12()
    entries[2].change = '2026-05-02-old-c'
    const specBase = buildSpecRootRich(tmp, { entries, archives: { '2026-05-02-old-c': ['src/cli/old.js'] } })
    const changeDir = writeChange(specBase, 'c-thin', [])
    const r = await flowKnowledgeDigest({ specBase, change: 'c-thin', changeDir, input: '', filesOverride: ['src/cli/old.js'] })
    const frLines = r.lines.filter((l) => l.includes('- FR-cli-'))
    assert.equal(frLines.length, 8, '注入行帽 8')
    assert.ok(frLines.some((l) => l.includes('FR-cli-003') && l.includes('🎯')), '覆盖命中条目带 🎯')
    assert.ok(frLines[0].includes('FR-cli-003'), 'TierA 置首')
    assert.ok(r.lines.some((l) => l.includes('+4 条见 knowledge/fr/')), '指针行保留')

    // 小域（6 条）：行集合不回归——6 条全在场、🎯 仅 003（FR-05 既有面）
    const tmp2 = mkdtempSync(join(tmpdir(), 'fic7b-'))
    try {
      const small = Array.from({ length: 6 }, (_, i) => {
        const n = i + 1
        return { domain: 'cli', n, title: `功能${n}`, change: n === 3 ? '2026-05-02-old-c' : '2026-09-30-new-b' }
      })
      const specBase2 = buildSpecRootRich(tmp2, { entries: small, archives: { '2026-05-02-old-c': ['src/cli/old.js'] } })
      const changeDir2 = writeChange(specBase2, 'c-thin-small', [])
      const r2 = await flowKnowledgeDigest({ specBase: specBase2, change: 'c-thin-small', changeDir: changeDir2, input: '', filesOverride: ['src/cli/old.js'] })
      const frLines2 = r2.lines.filter((l) => l.includes('- FR-cli-'))
      assert.equal(frLines2.length, 6, '小域全量注入')
      for (let n = 1; n <= 6; n++) assert.ok(frLines2.some((l) => l.includes(`FR-cli-${String(n).padStart(3, '0')}`)), `FR-cli-${n} 在场`)
      assert.equal(frLines2.filter((l) => l.includes('🎯')).length, 1, '🎯 仅覆盖命中条目')
      assert.ok(!r2.lines.some((l) => l.includes('条见 knowledge/fr/')), '小域无指针行')
    } finally { rmSync(tmp2, { recursive: true, force: true }) }
  } finally { rmSync(tmp, { recursive: true, force: true }) }
})
