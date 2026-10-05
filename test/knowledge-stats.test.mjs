/**
 * knowledge-stats.test.mjs — knowledge stats 子命令测试（2026-09-14-knowledge-loop-close task-05）
 *
 * 覆盖（验收面）：
 * - 聚合正确性：多记录 hits.jsonl → matrix 计数（inject 按 matchedFiles 条目 / classify 按 targetFile）
 *   与 hits 降序排序、lastHitAt 取最大 at、totalInjects/totalClassifies 按记录计数
 * - neverHit 对照 INDEX 全集：INDEX 行序保留、命中过的 file 剔除、不在 INDEX 的命中 file 不混入
 * - 空数据：hits.jsonl 缺失 → 空矩阵 + neverHit=INDEX 全集 + 人类可读输出「暂无遥测数据」
 * - sinceDays 过滤：窗口外记录不计数（matrix/neverHit/totals 联动）、CLI 窗口内全空提示
 * - --json 输出结构：{ ok, sinceDays, hasTelemetry, matrix, neverHit, totalInjects, totalClassifies }
 * - 坏行容忍：坏 JSON/空行/未知 type 混入不影响聚合
 * - 纯只读：命令运行前后 hits.jsonl / INDEX.md 字节不变
 * - 坏 --since-days 值报错
 */

import { join } from 'path'
import { mkdirSync, writeFileSync, rmSync, readFileSync } from 'fs'
import { fileURLToPath, pathToFileURL } from 'url'
import { tmpdir } from 'os'

const __filename = fileURLToPath(import.meta.url)
const root = join(__filename, '..', '..')

const { buildHitMatrix, cmdKnowledgeStats, resolveLastEventAt } = await import(
  pathToFileURL(join(root, 'src', 'knowledge-stats.js')).href
)

let passed = 0, failed = 0

function assert(cond, msg) {
  if (cond) { console.log(`  ✅ PASS: ${msg}`); passed++ }
  else { console.log(`  ❌ FAIL: ${msg}`); failed++ }
}

let seq = 0
function setup(name) {
  const dir = join(tmpdir(), `ks-test-${name}-${process.pid}-${++seq}`)
  mkdirSync(dir, { recursive: true })
  return dir
}
function clean(...dirs) {
  for (const d of dirs) try { rmSync(d, { recursive: true, force: true }) } catch { /* best effort */ }
}

// ── fixture ──

// INDEX 全集（4 个 file，按段序）：known-issues.md / patterns.md / conventions.md / decisions/change-management.md
const INDEX_TEMPLATE = [
  '# Knowledge Index',
  '',
  '## Known Issues',
  '- 平台审核|approve → [known-issues.md#平台审核占位](known-issues.md#平台审核占位)',
  '',
  '## Patterns',
  '- stage|stages → [patterns.md#stage-step-pattern](patterns.md#stage-step-pattern)',
  '',
  '## Conventions',
  '- ESM|module → [conventions.md#esm-only](conventions.md#esm-only)',
  '',
  '## Decisions',
  '- change-management|decision → [decisions/change-management.md](decisions/change-management.md)',
  '',
].join('\n')

function makeKnowledge(base) {
  const knowledgeDir = join(base, 'knowledge')
  mkdirSync(knowledgeDir, { recursive: true })
  writeFileSync(join(knowledgeDir, 'INDEX.md'), INDEX_TEMPLATE)
  return knowledgeDir
}

function writeHits(runtimeDir, lines) {
  mkdirSync(runtimeDir, { recursive: true })
  writeFileSync(join(runtimeDir, 'knowledge-hits.jsonl'), lines.join('\n') + '\n')
}

const daysAgo = (n) => new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString()

async function captureOutput(fn) {
  const orig = console.log
  const buf = []
  console.log = (...a) => buf.push(a.map(String).join(' '))
  try { await fn() } finally { console.log = orig }
  return buf.join('\n')
}

// ── Test 1: 聚合正确性——计数口径 / 降序排序 / lastHitAt / totals ──
console.log('\n=== Test 1: 聚合正确性与排序 ===')
{
  const base = setup('t1')
  try {
    // 时间戳一次算定复用（毫秒级 ISO 串两次求值不等，fixture 与断言须比同一字符串）
    const T5 = daysAgo(5), T3 = daysAgo(3), T1 = daysAgo(1), T2 = daysAgo(2)
    const knowledgeDir = makeKnowledge(base)
    const runtimeDir = join(base, '.runtime')
    writeHits(runtimeDir, [
      JSON.stringify({ type: 'inject', change: 'c1', query: 'q1', matchedFiles: ['known-issues.md#平台审核占位', 'patterns.md#stage-step-pattern'], at: T5 }),
      JSON.stringify({ type: 'inject', change: 'c2', query: 'q2', matchedFiles: ['known-issues.md#平台审核占位'], at: T3 }),
      JSON.stringify({ type: 'classify', qlId: 'ql-20260914-001-ab12', targetFile: 'known-issues.md', at: T1 }),
      JSON.stringify({ type: 'inject', change: 'c3', query: 'q3', matchedFiles: ['ghost.md#x', 'patterns.md#stage-step-pattern'], at: T2 }),
    ])

    const r = buildHitMatrix(knowledgeDir, runtimeDir, { sinceDays: 30 })
    assert(r.matrix.length === 3, 'matrix 恰 3 个 file（known-issues/patterns/ghost）')
    assert(r.matrix[0].file === 'known-issues.md' && r.matrix[0].hits === 3,
      'known-issues.md 排首：inject 条目 2 + classify 1 = 3 次命中')
    assert(r.matrix[0].lastHitAt === T1, 'lastHitAt 取引用记录的最大 at（classify 最近）')
    assert(r.matrix[1].file === 'patterns.md' && r.matrix[1].hits === 2, 'patterns.md 2 次命中排第二')
    assert(r.matrix[1].lastHitAt === T2, 'patterns.md lastHitAt 为其最近一次注入')
    assert(r.matrix[2].file === 'ghost.md' && r.matrix[2].hits === 1, '不在 INDEX 的 ghost.md 照进 matrix（1 次）')
    assert(r.totalInjects === 3 && r.totalClassifies === 1, 'totals 按记录计数：inject 3 条 / classify 1 条')

    assert(Array.isArray(r.neverHit) && r.neverHit.length === 2,
      'neverHit 恰 2 个（INDEX 4 file − matrix 中出现过的 2 个）')
    assert(r.neverHit[0] === 'conventions.md' && r.neverHit[1] === 'decisions/change-management.md',
      'neverHit 保持 INDEX 行序且不含命中过的 file')
    assert(!r.neverHit.includes('ghost.md'), '不在 INDEX 的命中 file 不进 neverHit')
  } finally { clean(base) }
}

// ── Test 2: 空数据——hits.jsonl 缺失 ──
console.log('\n=== Test 2: 空数据提示 ===')
{
  const base = setup('t2')
  try {
    const knowledgeDir = makeKnowledge(base)
    const r = buildHitMatrix(knowledgeDir, join(base, '.runtime'), { sinceDays: 30 })
    assert(r.matrix.length === 0 && r.totalInjects === 0 && r.totalClassifies === 0, '空矩阵 + totals 0')
    assert(r.neverHit.length === 4 && r.neverHit[0] === 'known-issues.md',
      'neverHit=INDEX 全集（按契约：全集 − 空矩阵）')

    const out = await captureOutput(() => cmdKnowledgeStats(base, [], { specDir: base }))
    assert(out.includes('暂无遥测数据'), '人类可读输出含「暂无遥测数据」提示')
    assert(!out.includes('疑似死重'), '无遥测时不渲染死重清单（全集≠死重，防误导）')

    const j = JSON.parse(await captureOutput(() => cmdKnowledgeStats(base, ['--json'], { specDir: base })))
    assert(j.ok === true && j.hasTelemetry === false && j.matrix.length === 0,
      '--json 空数据：ok + hasTelemetry:false + 空矩阵')
  } finally { clean(base) }
}

// ── Test 3: sinceDays 过滤 ──
console.log('\n=== Test 3: sinceDays 窗口过滤 ===')
{
  const base = setup('t3')
  try {
    const knowledgeDir = makeKnowledge(base)
    const runtimeDir = join(base, '.runtime')
    writeHits(runtimeDir, [
      JSON.stringify({ type: 'inject', change: 'c1', query: 'q1', matchedFiles: ['known-issues.md#a'], at: daysAgo(1) }),
      JSON.stringify({ type: 'inject', change: 'c0', query: 'q0', matchedFiles: ['patterns.md#b'], at: daysAgo(40) }),
    ])

    const r30 = buildHitMatrix(knowledgeDir, runtimeDir, { sinceDays: 30 })
    assert(r30.matrix.length === 1 && r30.matrix[0].file === 'known-issues.md', '30 天窗口滤掉 40 天前记录')
    assert(r30.totalInjects === 1, '窗口内 inject 计数 1')
    assert(r30.neverHit.includes('patterns.md'), '窗口外命中的 file 落回 neverHit')

    const r60 = buildHitMatrix(knowledgeDir, runtimeDir, { sinceDays: 60 })
    assert(r60.matrix.length === 2 && r60.totalInjects === 2, '60 天窗口两条都计入')

    // CLI：窗口内全空（唯一记录在窗口外）→ 提示且不渲染死重清单
    const base2 = setup('t3b')
    const knowledgeDir2 = makeKnowledge(base2)
    writeHits(join(base2, '.runtime'), [
      JSON.stringify({ type: 'inject', change: 'c0', query: 'q0', matchedFiles: ['known-issues.md#a'], at: daysAgo(40) }),
    ])
    const out = await captureOutput(() => cmdKnowledgeStats(base2, ['--since-days', '30'], { specDir: base2 }))
    assert(out.includes('近 30 天无命中记录'), '窗口内全空输出「近 30 天无命中记录」提示')
    assert(!out.includes('疑似死重'), '窗口内全空时不渲染死重清单')
    clean(base2)
  } finally { clean(base) }
}

// ── Test 4: --json 输出结构 ──
console.log('\n=== Test 4: --json 输出结构 ===')
{
  const base = setup('t4')
  try {
    makeKnowledge(base)
    const T1 = daysAgo(1)
    writeHits(join(base, '.runtime'), [
      JSON.stringify({ type: 'inject', change: 'c1', query: 'q1', matchedFiles: ['known-issues.md#平台审核占位', 'patterns.md#stage-step-pattern'], at: daysAgo(5) }),
      JSON.stringify({ type: 'classify', qlId: 'ql-1', targetFile: 'known-issues.md', at: T1 }),
    ])
    const j = JSON.parse(await captureOutput(() =>
      cmdKnowledgeStats(base, ['--since-days', '7', '--json'], { specDir: base })))
    assert(j.ok === true, '--json ok=true')
    assert(j.sinceDays === 7, '--since-days 透传进 JSON')
    assert(j.hasTelemetry === true, 'hasTelemetry=true（文件存在且有有效记录）')
    assert(Array.isArray(j.matrix) && j.matrix[0].file === 'known-issues.md' && j.matrix[0].hits === 2,
      'matrix 数组且首行计数正确')
    assert(typeof j.matrix[0].lastHitAt === 'string' && j.matrix[0].lastHitAt === T1,
      'matrix 行含 lastHitAt ISO 字符串')
    assert(Array.isArray(j.neverHit) && j.neverHit.join(',') === 'conventions.md,decisions/change-management.md',
      'neverHit 数组（INDEX 行序）')
    assert(j.totalInjects === 1 && j.totalClassifies === 1, 'totals 字段齐全')
  } finally { clean(base) }
}

// ── Test 5: 坏行容忍——坏 JSON / 空行 / 未知 type 不影响聚合 ──
console.log('\n=== Test 5: 坏行容忍 ===')
{
  const base = setup('t5')
  try {
    const knowledgeDir = makeKnowledge(base)
    const runtimeDir = join(base, '.runtime')
    writeHits(runtimeDir, [
      '{not json at all',
      '',
      JSON.stringify({ type: 'inject', change: 'c1', query: 'q1', matchedFiles: ['known-issues.md#a'], at: daysAgo(2) }),
      '{"type":"inject","change":"c2","matchedFiles":["patterns.md#b","at":"2026-09-',  // 残行（截断 JSON，跳过）
      JSON.stringify({ type: 'survey', change: 'c3', at: daysAgo(1) }), // 未知 type：忽略
      JSON.stringify({ type: 'classify', qlId: 'ql-1', targetFile: 'known-issues.md', at: daysAgo(1) }),
      JSON.stringify({ type: 'inject', change: 'c4', query: 'q4', matchedFiles: ['patterns.md#b'], at: daysAgo(1) }),
    ])
    const r = buildHitMatrix(knowledgeDir, runtimeDir, { sinceDays: 30 })
    assert(r.matrix.length === 2, '坏行/残行跳过后恰聚合 2 个 file')
    assert(r.matrix[0].file === 'known-issues.md' && r.matrix[0].hits === 2, 'known-issues.md 2 次（inject+classify）')
    assert(r.matrix[1].file === 'patterns.md' && r.matrix[1].hits === 1, 'patterns.md 1 次（仅计有效行）')
    assert(r.totalInjects === 2 && r.totalClassifies === 1, '未知 type 不进 totals（inject 2 / classify 1）')
  } finally { clean(base) }
}

// ── Test 6: 纯只读——命令运行前后输入字节不变 ──
console.log('\n=== Test 6: 纯只读 ===')
{
  const base = setup('t6')
  try {
    makeKnowledge(base)
    const hitsPath = join(base, '.runtime', 'knowledge-hits.jsonl')
    const indexPath = join(base, 'knowledge', 'INDEX.md')
    writeHits(join(base, '.runtime'), [
      JSON.stringify({ type: 'inject', change: 'c1', query: 'q1', matchedFiles: ['known-issues.md#a'], at: daysAgo(1) }),
    ])
    const beforeHits = readFileSync(hitsPath, 'utf8')
    const beforeIndex = readFileSync(indexPath, 'utf8')
    await cmdKnowledgeStats(base, [], { specDir: base })
    await cmdKnowledgeStats(base, ['--json'], { specDir: base })
    assert(readFileSync(hitsPath, 'utf8') === beforeHits, 'hits.jsonl 字节不变')
    assert(readFileSync(indexPath, 'utf8') === beforeIndex, 'INDEX.md 字节不变')
  } finally { clean(base) }
}

// ── Test 7: 坏 --since-days 值 ──
console.log('\n=== Test 7: 坏 --since-days 值 ===')
{
  const base = setup('t7')
  try {
    makeKnowledge(base)
    const j = JSON.parse(await captureOutput(() =>
      cmdKnowledgeStats(base, ['--since-days', 'abc'], { specDir: base })))
    assert(j.ok === false && j.error === '--since-days must be a non-negative integer',
      '非数值 --since-days 报错')
    const j2 = JSON.parse(await captureOutput(() =>
      cmdKnowledgeStats(base, ['--since-days', '-1'], { specDir: base })))
    assert(j2.ok === false, '负数 --since-days 报错')
  } finally { clean(base) }
}

// ── Test 8: lastEventAt 新鲜度读数（2026-10-05-knowledge-stats-freshness）──
console.log('\n=== Test 8: lastEventAt 新鲜度读数 ===')
{
  const base = setup('t8')
  try {
    makeKnowledge(base)
    const runtimeDir = join(base, '.runtime')
    // 时间戳一次算定复用（毫秒级 ISO 串两次求值不等）
    const T5 = daysAgo(5), T3 = daysAgo(3), T1 = daysAgo(1)
    // 多记录乱序：最新一条落在中间
    writeHits(runtimeDir, [
      JSON.stringify({ type: 'inject', change: 'c1', query: 'q1', matchedFiles: ['known-issues.md#a'], at: T5 }),
      JSON.stringify({ type: 'classify', qlId: 'ql-1', targetFile: 'known-issues.md', at: T1 }),
      JSON.stringify({ type: 'inject', change: 'c2', query: 'q2', matchedFiles: ['patterns.md#b'], at: T3 }),
    ])
    assert(resolveLastEventAt(runtimeDir) === T1, '多记录乱序取最新 at（原样 ISO）')

    const j = JSON.parse(await captureOutput(() =>
      cmdKnowledgeStats(base, ['--since-days', '1', '--json'], { specDir: base })))
    assert(j.lastEventAt === T1, '--json lastEventAt=全量 max(at)，不受 --since-days 窗口影响')

    const out = await captureOutput(() => cmdKnowledgeStats(base, [], { specDir: base }))
    assert(out.includes('遥测计数') && out.includes(`数据截至 ${T1.slice(0, 10)}`),
      '人类可读遥测计数行含「数据截至 <date>」')

    // 单记录
    const base2 = setup('t8b')
    makeKnowledge(base2)
    const only = daysAgo(2)
    writeHits(join(base2, '.runtime'), [
      JSON.stringify({ type: 'inject', change: 'c1', query: 'q1', matchedFiles: ['known-issues.md#a'], at: only }),
    ])
    assert(resolveLastEventAt(join(base2, '.runtime')) === only, '单记录 lastEventAt=该记录 at')

    // 无遥测：null 且人类可读不展示
    const base3 = setup('t8c')
    makeKnowledge(base3)
    assert(resolveLastEventAt(join(base3, '.runtime')) === null, '无遥测（文件缺失）lastEventAt=null')
    const j3 = JSON.parse(await captureOutput(() =>
      cmdKnowledgeStats(base3, ['--json'], { specDir: base3 })))
    assert(j3.lastEventAt === null && j3.hasTelemetry === false, '--json 无遥测 lastEventAt=null')
    const out3 = await captureOutput(() => cmdKnowledgeStats(base3, [], { specDir: base3 }))
    assert(!out3.includes('数据截至'), '无遥测不展示「数据截至」读数')
    clean(base2, base3)
  } finally { clean(base) }
}

// ── 汇总 ──
console.log(`\n${'='.repeat(40)}`)
console.log(`knowledge-stats tests: ${passed} passed, ${failed} failed, ${passed + failed} total`)
if (failed > 0) process.exit(1)
