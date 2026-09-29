/**
 * fr-inject-cap.test.mjs — {FR_INDEX_DIGEST} 注入收敛（2026-09-29-rot-retire-inject-cap）
 *
 * 验收面（FR-01/FR-07）：
 *   ① 滤 unmapped：unmapped-only 变更 → 专属空态文案（不落整池）；混合域 → 仅真域条目
 *   ② top-8 截断：大域 digest ≤8 条 + 「+N 条见」指针行；尾部承接指引 blockquote 保留
 *   ③ 遥测口径：count=全量、rendered/truncated 披露截断面、unmappedFiltered 披露滤除
 *   ④ 小域（≤8 条）：无指针行、blockquote 仍在
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
