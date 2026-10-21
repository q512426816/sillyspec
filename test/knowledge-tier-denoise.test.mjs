/**
 * knowledge-tier-denoise.test.mjs — 2026-10-21-knowledge-tier-denoise
 * FR-01 unmapped 停车场三路零返回（路由命中/词片回退/向量候选）+ search 披露行；
 * FR-02 路由行共享泛词剥离（模板零泛词/存量幂等剥离/人工关键词保留/泛词查询不再全池命中）。
 */

import { join } from 'path'
import { mkdirSync, writeFileSync, rmSync, readFileSync } from 'fs'
import { fileURLToPath, pathToFileURL } from 'url'
import { tmpdir } from 'os'

const __filename = fileURLToPath(import.meta.url)
const __dirname = join(__filename, '..')
const root = join(__dirname, '..')

const { matchByRouting, matchKnowledge, fallbackByQueryShingles, isParkingFile } = await import(
  pathToFileURL(join(root, 'src', 'knowledge-match.js')).href
)
const { buildResultFromPlatform } = await import(
  pathToFileURL(join(root, 'src', 'knowledge-vector.js')).href
)
const { syncIndexRoutingLines, DECISIONS_ROUTE_STRIP_TOKENS, FR_ROUTE_STRIP_TOKENS } = await import(
  pathToFileURL(join(root, 'src', 'decision-distill.js')).href
)
const { redomainFrEntries } = await import(pathToFileURL(join(root, 'src', 'redomain.js')).href)
const { redomainDecisionEntries } = await import(pathToFileURL(join(root, 'src', 'decision-redomain.js')).href)
const { cmdSearch } = await import(pathToFileURL(join(root, 'src', 'stages', 'knowledge.js')).href)

let passed = 0, failed = 0

function assert(cond, msg) {
  if (cond) { console.log(`  ✅ PASS: ${msg}`); passed++ }
  else { console.log(`  ❌ FAIL: ${msg}`); failed++ }
}

function setup(name) {
  const dir = join(tmpdir(), `ktd-test-${name}`)
  rmSync(dir, { recursive: true, force: true })
  mkdirSync(dir, { recursive: true })
  return dir
}
function clean(...dirs) {
  for (const d of dirs) try { rmSync(d, { recursive: true, force: true }) } catch {}
}

function writeDecisions(kr, domains) {
  for (const [domain, sections] of Object.entries(domains)) {
    mkdirSync(join(kr, 'decisions'), { recursive: true })
    writeFileSync(join(kr, 'decisions', `${domain}.md`), [
      `# 决策知识 — ${domain}`, '',
      ...sections.flatMap((s) => [s, '']),
    ].join('\n'))
  }
}

// ── FR-01：路由命中过滤停车场 ──
console.log('\n=== T1: 路由命中——停车场行不进 matched/decisionHits ===')
{
  const dir = setup('t1')
  try {
    writeFileSync(join(dir, 'INDEX.md'), [
      '# Knowledge Index', '',
      '## Decisions',
      '- unmapped|decision|决策 → [decisions/unmapped.md](decisions/unmapped.md)',
      '- core-engine|decision|决策 → [decisions/core-engine.md](decisions/core-engine.md)',
    ].join('\n'))
    writeDecisions(dir, {
      unmapped: ['## D-001@v1 停车场条目\n状态：rejected\n变更：2026-01-01-a\n否决理由：测试理由\n复潮条件：无'],
      'core-engine': ['## D-002@v1 正域条目\n状态：rejected\n变更：2026-01-01-b\n否决理由：测试理由\n复潮条件：无'],
    })
    const r = matchByRouting(dir, '任务涉及决策处理')
    assert(r.matched === true, '泛词命中后仍有真域结果')
    assert(r.entries.length === 1 && r.entries[0].file === 'decisions/core-engine.md', 'matched 只剩 core-engine 行')
    assert(r.decisionHits.every((h) => h.file !== 'decisions/unmapped.md'), 'decisionHits 不含停车场文件')
  } finally { clean(dir) }
}

// ── FR-01：只命中停车场 → 零命中 + parkingFiltered 披露 ──
console.log('\n=== T2: 只命中停车场行 → matched=false + json.parkingFiltered ===')
{
  const dir = setup('t2')
  try {
    writeFileSync(join(dir, 'INDEX.md'), [
      '# Knowledge Index', '',
      '## Decisions',
      '- unmapped|知识图谱|影响面 → [decisions/unmapped.md](decisions/unmapped.md)',
    ].join('\n'))
    writeDecisions(dir, { unmapped: ['## D-001@v1 图谱条目\n状态：rejected\n变更：2026-01-01-a\n否决理由：测试理由\n复潮条件：无'] })
    const r = matchByRouting(dir, '知识图谱检索')
    assert(r.matched === false, '停车场唯一命中按零命中处理')
    assert(JSON.stringify(r.json.parkingFiltered) === JSON.stringify(['decisions/unmapped.md']), 'json.parkingFiltered 披露被滤文件')
    assert(isParkingFile('decisions/unmapped.md') && isParkingFile('fr\\unmapped.md'.replace('\\', '/')), 'isParkingFile 双面判等')
    // 语义无关查询零披露（未发生过滤）
    const r2 = matchByRouting(dir, '完全不相关查询词')
    assert(r2.json.parkingFiltered === undefined, '零命中且无过滤时不披露')
  } finally { clean(dir) }
}

// ── FR-01：词片回退跳过停车场 ──
console.log('\n=== T3: 词片回退——unmapped 复现窗口命中不返回 ===')
{
  const dir = setup('t3')
  try {
    writeFileSync(join(dir, 'INDEX.md'), [
      '# Knowledge Index', '',
      '## Conventions', '- 构建|lint → [conventions.md](conventions.md)', '',
      '## Decisions',
      '- unmapped|停车场键 → [decisions/unmapped.md](decisions/unmapped.md)',
      '- core-engine|引擎键 → [decisions/core-engine.md](decisions/core-engine.md)',
    ].join('\n'))
    writeFileSync(join(dir, 'conventions.md'), '# 约定\n')
    // 3 条目 → ceil = max(2, floor(0.05*3)) = 2：'图谱' 恰现 2 次落在复现窗口 [2,2]
    writeDecisions(dir, {
      unmapped: [
        '## D-001@v1 图谱条目一\n状态：confirmed\n变更：2026-01-01-a\n理由：图谱相关',
        '## D-002@v1 无关条目二\n状态：confirmed\n变更：2026-01-01-b\n理由：无关',
        '## D-003@v1 无关条目三\n状态：confirmed\n变更：2026-01-01-c\n理由：无关',
      ],
      'core-engine': ['## D-004@v1 english title only\n状态：confirmed\n变更：2026-01-01-d\n理由：reason text'],
    })
    const fb = fallbackByQueryShingles(dir, '图谱设计')
    assert(fb === null, '唯一复现文件是停车场 → 回退返回 null（零命中语义）')
    const r = matchKnowledge(dir, '图谱设计')
    assert(r.matched === false, 'matchKnowledge 端到端停车场零返回')
  } finally { clean(dir) }
}

// ── FR-01：向量召回候选丢弃停车场 ──
console.log('\n=== T4: buildResultFromPlatform——unmapped 候选被丢弃 ===')
{
  const dir = setup('t4')
  try {
    writeDecisions(dir, {
      unmapped: ['## D-001@v1 停车场条目\n状态：rejected\n变更：2026-01-01-a\n否决理由：测试理由\n复潮条件：无'],
      'core-engine': ['## D-002@v1 正域条目\n状态：rejected\n变更：2026-01-01-b\n否决理由：测试理由\n复潮条件：无'],
    })
    writeFileSync(join(dir, 'INDEX.md'), [
      '# Knowledge Index', '',
      '## Decisions',
      '- unmapped|停车场键 → [decisions/unmapped.md](decisions/unmapped.md)',
      '- core-engine|引擎键 → [decisions/core-engine.md](decisions/core-engine.md)',
    ].join('\n'))
    const built = buildResultFromPlatform(dir, [
      { spec_path: 'knowledge/decisions/unmapped.md', anchor: 'D-001@v1', score: 0.9 },
      { spec_path: 'knowledge/decisions/core-engine.md', anchor: 'D-002@v1', score: 0.8 },
    ])
    assert(built !== null, '非停车场候选照常解析')
    assert(built.entries.length === 1 && built.entries[0].file === 'decisions/core-engine.md', 'entries 不含停车场')
    assert(built.decisionHits.every((h) => h.file !== 'decisions/unmapped.md') && built.decisionHits.length === 1, 'decisionHits 只剩正域条目')
    const onlyParking = buildResultFromPlatform(dir, [
      { spec_path: 'knowledge/decisions/unmapped.md', anchor: 'D-001@v1', score: 0.9 },
    ])
    assert(onlyParking === null, '全部候选是停车场 → null（降级本地层）')
  } finally { clean(dir) }
}

// ── FR-01：search 披露行 ──
console.log('\n=== T5: knowledge search——过滤致零时披露停车场文件 ===')
{
  const repoDir = join(tmpdir(), 'ktd-test-t5-repo')
  const dir = join(repoDir, '.sillyspec', 'knowledge')
  rmSync(repoDir, { recursive: true, force: true })
  try {
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, 'INDEX.md'), [
      '# Knowledge Index', '',
      '## Decisions',
      '- unmapped|知识图谱 → [decisions/unmapped.md](decisions/unmapped.md)',
    ].join('\n'))
    mkdirSync(join(dir, 'decisions'), { recursive: true })
    writeFileSync(join(dir, 'decisions', 'unmapped.md'), '# 决策知识 — unmapped\n\n## D-001@v1 图谱条目\n状态：rejected\n变更：2026-01-01-a\n否决理由：测试理由\n复潮条件：无\n')
    const lines = []
    const origLog = console.log
    console.log = (...a) => lines.push(a.join(' '))
    try {
      await cmdSearch(repoDir, ['--query', '知识图谱'], {})
    } finally { console.log = origLog }
    const out = lines.join('\n')
    assert(out.includes('停车场文件已过滤'), '回显含披露行')
    assert(out.includes('decisions/unmapped.md'), '披露行列明被滤文件')
  } finally { clean(repoDir) }
}

// ── FR-02：decisions 面模板零泛词 + 存量剥离 + 人工关键词保留 + 幂等 ──
console.log('\n=== T6: decisions 面 sync——泛词剥离/缺行零泛词补/幂等 ===')
{
  const dir = setup('t6')
  try {
    writeDecisions(dir, {
      'core-engine': ['## D-001@v1 条目\n状态：confirmed\n变更：2026-01-01-a\n理由：理由'],
      unmapped: ['## D-002@v1 条目\n状态：confirmed\n变更：2026-01-01-b\n理由：理由'],
    })
    writeFileSync(join(dir, 'INDEX.md'), [
      '# Knowledge Index', '',
      '## Decisions',
      '- core-engine|decision|决策 → [decisions/core-engine.md](decisions/core-engine.md)',
      '- unmapped|decision|决策|知识图谱|影响面 → [decisions/unmapped.md](decisions/unmapped.md)',
      '- 非路由注释行原样保留',
      '',
      '## FR 需求索引',
      '- core-engine|FR|需求|承接 → [fr/core-engine.md](fr/core-engine.md)',
    ].join('\n'))
    const changed = syncIndexRoutingLines(dir, { stripTokens: DECISIONS_ROUTE_STRIP_TOKENS })
    assert(changed === true, '首跑发生剥离')
    const after1 = readFileSync(join(dir, 'INDEX.md'), 'utf8')
    assert(after1.includes('- core-engine → [decisions/core-engine.md](decisions/core-engine.md)'), '存量行剥成纯域名键')
    assert(after1.includes('- unmapped|知识图谱|影响面 → [decisions/unmapped.md](decisions/unmapped.md)'), '人工扩充关键词保留')
    assert(!/^- .*\|decision\|决策 →/.test(after1), 'decisions 段不再含泛词行')
    assert(after1.includes('- 非路由注释行原样保留'), '非路由行不动')
    assert(after1.includes('- core-engine|FR|需求|承接 → [fr/core-engine.md](fr/core-engine.md)'), 'fr 段不被 decisions 面 sync 波及')
    const changed2 = syncIndexRoutingLines(dir, { stripTokens: DECISIONS_ROUTE_STRIP_TOKENS })
    assert(changed2 === false, '二跑幂等零漂移')
    // 泛词查询不再全池命中
    const r = matchByRouting(dir, '决策 decision')
    assert(r.matched === false, '泛词查询不再命中全部路由行')
  } finally { clean(dir) }
}

// ── FR-02：fr 面（含 auto- 伪域裸段关键词）──
console.log('\n=== T7: fr 面 sync——泛词剥离/auto- 裸段键保留 ===')
{
  const dir = setup('t7')
  try {
    mkdirSync(join(dir, 'fr'), { recursive: true })
    writeFileSync(join(dir, 'fr', 'core-engine.md'), '# FR 索引 — core-engine\n')
    writeFileSync(join(dir, 'fr', 'auto-backend.md'), '# FR 索引 — auto-backend\n')
    writeFileSync(join(dir, 'INDEX.md'), [
      '# Knowledge Index', '',
      '## FR 需求索引',
      '- core-engine|FR|需求|承接 → [fr/core-engine.md](fr/core-engine.md)',
      '',
    ].join('\n'))
    syncIndexRoutingLines(dir, {
      section: 'FR 需求索引',
      subdir: 'fr',
      stripTokens: FR_ROUTE_STRIP_TOKENS,
      makeLine: (d) => d.startsWith('auto-')
        ? `- ${d}|${d.slice(5)} → [fr/${d}.md](fr/${d}.md)`
        : `- ${d} → [fr/${d}.md](fr/${d}.md)`,
    })
    const after = readFileSync(join(dir, 'INDEX.md'), 'utf8')
    assert(after.includes('- core-engine → [fr/core-engine.md](fr/core-engine.md)'), '存量 fr 行剥成纯域名键')
    assert(after.includes('- auto-backend|backend → [fr/auto-backend.md](fr/auto-backend.md)'), 'auto- 伪域新行带裸段关键词且零泛词')
    assert(!/\|FR\|需求\|承接/.test(after), 'fr 段不再含泛词')
  } finally { clean(dir) }
}

// ── FR-02：迁移调用方接线（redomain 双面 sync 传参）──
console.log('\n=== T8: redomain 双面迁移后 INDEX 路由行同步剥泛词 ===')
{
  const dir = setup('t8')
  try {
    mkdirSync(join(dir, 'fr'), { recursive: true })
    writeFileSync(join(dir, 'fr', 'core-engine.md'), [
      '# FR 索引 — core-engine', '', '## FR-core-engine-1 既有条目', '状态：active', '',
    ].join('\n'))
    writeFileSync(join(dir, 'fr', 'unmapped.md'), [
      '# FR 索引 — unmapped', '', '## FR-unmapped-9 迁移条目', '变更：2026-01-01-a', '',
    ].join('\n'))
    writeDecisions(dir, {
      'core-engine': ['## D-001@v1 条目\n状态：confirmed\n变更：2026-01-01-a\n理由：理由'],
      unmapped: ['## D-002@v1 条目\n状态：confirmed\n变更：2026-01-01-b\n理由：理由'],
    })
    writeFileSync(join(dir, 'INDEX.md'), [
      '# Knowledge Index', '',
      '## Decisions',
      '- core-engine|decision|决策 → [decisions/core-engine.md](decisions/core-engine.md)',
      '- unmapped|decision|决策 → [decisions/unmapped.md](decisions/unmapped.md)',
      '',
      '## FR 需求索引',
      '- core-engine|FR|需求|承接 → [fr/core-engine.md](fr/core-engine.md)',
      '- unmapped|FR|需求|承接 → [fr/unmapped.md](fr/unmapped.md)',
    ].join('\n'))
    const frRes = redomainFrEntries({ knowledgeRoot: dir, from: 'unmapped', to: 'core-engine' })
    assert(frRes.moved.length === 1, 'FR 面迁移 1 条')
    const dRes = redomainDecisionEntries({ knowledgeRoot: dir, from: 'unmapped', to: 'core-engine' })
    assert(dRes.moved.length === 1, 'decisions 面迁移 1 条')
    const after = readFileSync(join(dir, 'INDEX.md'), 'utf8')
    assert(!/\|decision\|决策/.test(after) && !/\|FR\|需求\|承接/.test(after), '迁移触发双面 sync 后 INDEX 零泛词')
    assert(!after.includes('fr/unmapped.md]'), '源域删空后路由行移除')
  } finally { clean(dir) }
}

console.log(`\n结果: ${passed} passed, ${failed} failed`)
process.exit(failed > 0 ? 1 : 0)
