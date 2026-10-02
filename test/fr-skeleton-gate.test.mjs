/**
 * fr-skeleton-gate.test.mjs — 骨架信息量门（2026-10-03-fr-skeleton-gate）
 *
 * 验收面（FR-01~FR-04）：
 *   ① 判据单元：isThinSkeletonBodies 三态（全占位/部分实质/空体块）
 *   ② 索引标记：indexRequirements 对占位 GWT 的 FR 落「骨架：thin」（状态行后）；实质 Then 不标
 *   ③ 存量回填幂等：markSkeletonThin 标纯骨架、跳过已标/实质/无场景；二次执行零变更
 *   ④ 注入排除+TierA 例外（双面）：骨架不进注入行、指针行披露、覆盖命中骨架带 🎯 在场
 *   ⑤ digest flag：readActiveFrDigest 对标记条目返回 skeleton=true
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = dirname(fileURLToPath(import.meta.url))
const {
  isThinSkeletonBodies, markSkeletonThin, indexRequirements, readActiveFrDigest,
} = await import(pathToFileURL(join(ROOT, '..', 'src', 'fr-index.js')).href)
const { buildFrIndexDigestSection } = await import(pathToFileURL(join(ROOT, '..', 'src', 'run', 'prompt.js')).href)
const { flowKnowledgeDigest } = await import(pathToFileURL(join(ROOT, '..', 'src', 'flow.js')).href)

/** 骨架：.sillyspec 骨架（module map + knowledge/fr）——域路由同 fr-inject-cap 夹具布局。 */
function buildSpecBase(base) {
  const specBase = join(base, '.sillyspec')
  mkdirSync(join(specBase, 'knowledge', 'fr'), { recursive: true })
  const mapDir = join(specBase, 'docs', 'proj', 'modules')
  mkdirSync(mapDir, { recursive: true })
  writeFileSync(join(mapDir, '_module-map.yaml'), 'modules:\n  cli:\n    paths:\n      - src/cli/\n')
  writeFileSync(join(specBase, 'knowledge', 'INDEX.md'), '# 知识索引\n')
  return specBase
}

/** 域文件条目段生成。skeleton=true → 场景正文行用占位 Then；marked=true → 落「骨架：thin」行
 *  （注入消费 flag=标记行；回填用例用 skeleton 未 marked 形态测内容判据）。 */
function entryLines(id, title, change, { skeleton = false, marked = false, withBody = true } = {}) {
  const out = [`## ${id} ${title}`, `变更：${change}`, '状态：active']
  if (marked) out.push('骨架：thin')
  out.push('摘要：默认场景')
  if (withBody) {
    out.push('场景正文：')
    out.push(skeleton
      ? '- 场景：默认场景 — Given 系统就绪；When 执行目标行为；Then 行为符合本条标准描述'
      : '- 场景：默认场景 — Given 列表页在场；When 打开回放；Then 主体渲染对话流而非卡片列表')
  }
  out.push(`全文：.sillyspec/changes/archive/${change}/requirements.md#FR-01`, `最近确认：aaaa`, '')
  return out
}

function writeDomain(specBase, domain, chunks) {
  const lines = ['---', 'author: sillyspec-fr-index', '---', '', `# FR 索引 — ${domain}`, '', ...chunks]
  writeFileSync(join(specBase, 'knowledge', 'fr', `${domain}.md`), lines.join('\n'))
}

function writeArchive(specBase, name, files) {
  const d = join(specBase, 'changes', 'archive', name)
  mkdirSync(d, { recursive: true })
  writeFileSync(join(d, 'change-patch.json'), JSON.stringify({ files }))
}

function writeChangeDir(specBase, name, designRows) {
  const changeDir = join(specBase, 'changes', name)
  mkdirSync(changeDir, { recursive: true })
  writeFileSync(join(changeDir, 'design.md'), designRows.map((r) => `| 修改 | ${r} | x |`).join('\n') + '\n')
  return changeDir
}

test('① 判据单元：isThinSkeletonBodies 三态', () => {
  assert.equal(isThinSkeletonBodies([{ name: '默认场景', given: 'G', when: 'W', then: '行为符合本条标准描述' }]), true, '全占位 → 骨架')
  assert.equal(isThinSkeletonBodies([
    { name: 'a', given: 'G', when: 'W', then: '行为符合本条标准描述' },
    { name: 'b', given: 'G', when: 'W', then: '主体渲染对话流' },
  ]), false, '任一实质 Then → 非骨架')
  assert.equal(isThinSkeletonBodies([]), false, '空体块 → 不判（保守）')
})

test('② 索引标记：占位 GWT 入索引带「骨架：thin」，实质 Then 不带', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'fsg2-'))
  try {
    const specBase = buildSpecBase(tmp)
    const knowledgeRoot = join(specBase, 'knowledge')
    const changeDir = join(specBase, 'changes', 'c-idx')
    mkdirSync(changeDir, { recursive: true })
    writeFileSync(join(changeDir, 'requirements.md'), [
      '# R', '',
      '### FR-01: 骨架条目A', 'Given 系统就绪', 'When 执行目标行为', 'Then 行为符合本条标准描述', '',
      '### FR-02: 实质条目B', 'Given 列表页在场', 'When 打开回放', 'Then 主体渲染对话流而非卡片列表', '',
    ].join('\n'))
    const r = indexRequirements({ changeDir, knowledgeRoot, headHash: 'h1', deliverableFiles: ['src/cli/a.js'] })
    assert.equal(r.written.length, 2, '两条入索引')
    const domainText = readFileSync(join(knowledgeRoot, 'fr', 'cli.md'), 'utf8')
    const aSec = domainText.split('## FR-cli-001')[1].split('## FR-cli-002')[0]
    const bSec = domainText.split('## FR-cli-002')[1]
    assert.ok(aSec.includes('骨架：thin'), '占位条目带标记')
    assert.ok(aSec.indexOf('骨架：thin') > aSec.indexOf('状态：active'), '标记在状态行后')
    assert.ok(!bSec.includes('骨架：thin'), '实质条目不带标记')
  } finally { rmSync(tmp, { recursive: true, force: true }) }
})

test('③ 存量回填幂等：标纯骨架、跳过已标/实质/无场景；二次执行零变更', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'fsg3-'))
  try {
    const specBase = buildSpecBase(tmp)
    writeDomain(specBase, 'cli', [
      ...entryLines('FR-cli-001', '骨架未标', '2026-09-01-a', { skeleton: true }),
      ...entryLines('FR-cli-002', '实质', '2026-09-01-a', { skeleton: false }),
      ...entryLines('FR-cli-003', '骨架已标', '2026-09-01-a', { skeleton: true, marked: true }),
      ...entryLines('FR-cli-004', '无场景体', '2026-09-01-a', { withBody: false }),
    ])
    const knowledgeRoot = join(specBase, 'knowledge')
    const r1 = markSkeletonThin(knowledgeRoot)
    assert.deepEqual(r1.marked.map((m) => m.id), ['FR-cli-001'], '只标未标纯骨架')
    const text = readFileSync(join(knowledgeRoot, 'fr', 'cli.md'), 'utf8')
    assert.equal((text.match(/^骨架：thin$/gm) || []).length, 2, '共 2 个标记（001 新标 + 003 已有）')
    const r2 = markSkeletonThin(knowledgeRoot)
    assert.equal(r2.marked.length, 0, '二次执行零变更（幂等）')
    assert.equal(r2.files.length, 0, '二次执行零写盘')
  } finally { rmSync(tmp, { recursive: true, force: true }) }
})

test('④ 注入排除+TierA 例外：骨架不进注入行、指针行披露、覆盖命中骨架带 🎯（厚道+轻量道双面）', async () => {
  const tmp = mkdtempSync(join(tmpdir(), 'fsg4-'))
  try {
    // 12 条：001-004 实质、005-012 骨架（已标记——注入消费 flag）；006 源变更归档覆盖 src/cli/old.js（TierA 命中的骨架）
    const chunks = []
    for (let n = 1; n <= 12; n++) {
      const id = `FR-cli-${String(n).padStart(3, '0')}`
      const change = n === 6 ? '2026-09-02-hit-src' : '2026-09-01-a'
      chunks.push(...entryLines(id, `功能${n}`, change, { skeleton: n >= 5, marked: n >= 5 }))
    }
    const specBase = buildSpecBase(tmp)
    writeDomain(specBase, 'cli', chunks)
    writeArchive(specBase, '2026-09-02-hit-src', ['src/cli/old.js'])
    const changeDir = writeChangeDir(specBase, 'c-skel', ['src/cli/old.js'])

    const r = await buildFrIndexDigestSection({ frSpecBase: specBase, changeName: 'c-skel' })
    const entryLinesOut = r.text.split('\n').filter((l) => l.startsWith('- FR-cli-'))
    assert.equal(entryLinesOut.length, 5, '注入行=4 实质 + 1 命中骨架')
    assert.ok(entryLinesOut.some((l) => l.startsWith('- FR-cli-006 🎯') || l.startsWith('- FR-cli-006') && l.includes('🎯')), 'TierA 命中骨架带 🎯')
    for (let n = 7; n <= 12; n++) assert.ok(!entryLinesOut.some((l) => l.startsWith(`- FR-cli-${String(n).padStart(3, '0')}`)), `纯骨架 ${n} 不注入`)
    assert.ok(!entryLinesOut.some((l) => l.startsWith('- FR-cli-005')), '纯骨架 005 不注入')
    assert.ok(r.text.includes('纯骨架 7 条不注入'), '指针行披露骨架数（8 骨架 - 1 命中例外）')
    assert.equal(r.telemetry.skeletonHidden, 7, '遥测 skeletonHidden')
    assert.equal(r.telemetry.tierA, 1, 'TierA=1')
    assert.equal(r.telemetry.count, 12, 'count 全量口径不变')
    assert.equal(r.telemetry.rendered, 5, 'rendered=实际注入行数')

    const rt = await flowKnowledgeDigest({ specBase, change: 'c-skel', changeDir, input: '', filesOverride: ['src/cli/old.js'] })
    const thinLines = rt.lines.filter((l) => l.includes('- FR-cli-'))
    assert.equal(thinLines.length, 5, '轻量道同口径')
    assert.ok(thinLines.some((l) => l.includes('FR-cli-006') && l.includes('🎯')), '轻量道命中骨架带 🎯')
    assert.ok(rt.lines.some((l) => l.includes('纯骨架 7 条不注入')), '轻量道指针行披露')
  } finally { rmSync(tmp, { recursive: true, force: true }) }
})

test('⑤ digest flag：readActiveFrDigest 对标记条目返回 skeleton=true', () => {
  const tmp = mkdtempSync(join(tmpdir(), 'fsg5-'))
  try {
    const specBase = buildSpecBase(tmp)
    writeDomain(specBase, 'cli', [
      ...entryLines('FR-cli-001', '已标骨架', '2026-09-01-a', { skeleton: true, marked: true }),
      ...entryLines('FR-cli-002', '实质', '2026-09-01-a', { skeleton: false }),
    ])
    const frs = readActiveFrDigest(join(specBase, 'knowledge'), ['cli'])
    assert.equal(frs.find((f) => f.id === 'FR-cli-001').skeleton, true, '标记条目 skeleton=true')
    assert.equal(frs.find((f) => f.id === 'FR-cli-002').skeleton, false, '无标记条目 skeleton=false')
  } finally { rmSync(tmp, { recursive: true, force: true }) }
})
