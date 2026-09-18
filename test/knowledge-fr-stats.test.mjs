/**
 * knowledge-stats FR 索引聚合测试（2026-09-18-fr-index-l1 后续钩子·L3 裁决仪表盘）
 *
 * 覆盖：
 *   1. 事件聚合：四类 fr-* 各计数+涉及变更/候选去重+unreferenced 按域求和
 *   2. 索引面：条目/active/superseded/来源变更/域清单（scanFrIndex 消费）
 *   3. 承接引用率：分子=fr-supersede 涉及变更（窗口内）、分母=索引来源变更（全量）；索引空 → null
 *   4. present 三态：无 fr/ 无事件 → false；仅事件 → true；仅 fr/ → true
 *   5. 未知 fr- 前缀事件（如未来 fr-x）不炸聚合（前向兼容）
 *   6. CLI 端到端：knowledge stats --json 含 frIndex 键；人类模式含「FR 索引实验」段
 *   7. 既有 buildHitMatrix 零回归：fr-* 事件不进命中矩阵（type 过滤面）
 *
 * 风格：自研 assert + mkdtempSync（同 machine-interface.test.mjs）。
 */
import { mkdtempSync, mkdirSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { tmpdir } from 'os'
import { execFileSync } from 'child_process'
import { fileURLToPath } from 'url'

import { buildFrIndexStats, buildHitMatrix } from '../src/knowledge-stats.js'
import { appendKnowledgeHit } from '../src/knowledge-hits.js'

let failed = 0
let total = 0

function assert(condition, msg) {
  total++
  if (!condition) {
    failed++
    console.log(`  ❌ FAIL: ${msg}`)
  } else {
    console.log(`  ✅ PASS: ${msg}`)
  }
}

const tmpRoots = []
function makeTmpDir(prefix) {
  const dir = mkdtempSync(join(tmpdir(), prefix))
  tmpRoots.push(dir)
  return dir
}

function makeFixture() {
  const root = makeTmpDir('kfs-')
  const base = join(root, '.sillyspec')
  const knowledgeDir = join(base, 'knowledge')
  const runtimeDir = join(base, '.runtime')
  mkdirSync(knowledgeDir, { recursive: true })
  mkdirSync(runtimeDir, { recursive: true })
  return { root, base, knowledgeDir, runtimeDir }
}

function seedFrDir(knowledgeDir, entries) {
  const frDir = join(knowledgeDir, 'fr')
  mkdirSync(frDir, { recursive: true })
  for (const [domain, content] of Object.entries(entries)) {
    writeFileSync(join(frDir, `${domain}.md`), content)
  }
}

const CE = [
  '## FR-core-engine-001 需求A\n变更：2026-09-18-c1\n状态：superseded\nsuperseded_by：FR-core-engine-003\n取代链：x\n摘要：s\n最近确认：\n',
  '## FR-core-engine-002 需求B\n变更：2026-09-18-c1\n状态：active\n摘要：s\n最近确认：\n',
  '## FR-core-engine-003 需求C\n变更：2026-09-18-c2\n状态：active\n摘要：s\n最近确认：\n',
].join('\n')

// ── 1+2+3. 事件聚合 + 索引面 + 引用率 ──
{
  const { knowledgeDir, runtimeDir } = makeFixture()
  seedFrDir(knowledgeDir, { 'core-engine': CE })
  appendKnowledgeHit(runtimeDir, { type: 'fr-inject', change: '2026-09-18-c2', domains: ['core-engine'], count: 3 })
  appendKnowledgeHit(runtimeDir, { type: 'fr-inject', change: '2026-09-18-c2', domains: ['core-engine'], count: 2 })
  appendKnowledgeHit(runtimeDir, { type: 'fr-supersede', change: '2026-09-18-c2', from: 'FR-core-engine-001', to: 'FR-core-engine-003' })
  appendKnowledgeHit(runtimeDir, { type: 'fr-duplicate-warning', change: '2026-09-18-c3', title: '需求A改', candidate: 'FR-core-engine-001', overlap: 0.75 })
  appendKnowledgeHit(runtimeDir, { type: 'fr-unreferenced', change: '2026-09-18-c2', domain: 'core-engine', count: 1 })
  appendKnowledgeHit(runtimeDir, { type: 'fr-unreferenced', change: '2026-09-18-c3', domain: 'core-engine', count: 2 })
  appendKnowledgeHit(runtimeDir, { type: 'fr-unreferenced', change: '2026-09-18-c3', domain: 'stages', count: 4 })
  appendKnowledgeHit(runtimeDir, { type: 'fr-future-unknown', change: 'x' })

  const r = buildFrIndexStats(knowledgeDir, runtimeDir, { sinceDays: 1 })
  assert(r.present === true, '1a present（fr/ + 事件双在场）')
  assert(r.events.frInject === 2 && r.events.frInjectChanges === 1, `1b fr-inject 计数2/变更去重1（实际 ${r.events.frInject}/${r.events.frInjectChanges}）`)
  assert(r.events.frSupersede === 1 && r.events.frSupersedeChanges === 1, '1c fr-supersede 计数/变更')
  assert(r.events.frDuplicateWarning === 1 && r.events.frDuplicateCandidates === 1, '1d 重复拦截计数/候选')
  const ce = r.events.frUnreferenced.find((u) => u.domain === 'core-engine')
  assert(ce && ce.count === 3 && ce.events === 2, `1e unreferenced 按域求和（core-engine count=3 events=2，实际 ${JSON.stringify(ce)}）`)
  assert(r.events.frUnreferenced[0].domain === 'stages', '1f 域排序按 count 降序')
  assert(r.index.entries === 3 && r.index.superseded === 1 && r.index.active === 2, `2a 索引面计数（实际 ${JSON.stringify(r.index)}）`)
  assert(r.index.sourceChanges === 2 && r.index.domains.includes('core-engine'), '2b 来源变更去重+域清单')
  assert(r.supersedeRate === 0.5, `3a 承接引用率 1/2=0.5（实际 ${r.supersedeRate}）`)
}

// ── 3b+4. 索引空 → null；present 三态 ──
{
  const { knowledgeDir, runtimeDir } = makeFixture()
  const r0 = buildFrIndexStats(knowledgeDir, runtimeDir, { sinceDays: 1 })
  assert(r0.present === false && r0.supersedeRate === null && r0.index.entries === 0, '4a 无 fr/ 无事件 → present=false 零值安全')
  appendKnowledgeHit(runtimeDir, { type: 'fr-inject', change: 'c', count: 1 })
  const r1 = buildFrIndexStats(knowledgeDir, runtimeDir, { sinceDays: 1 })
  assert(r1.present === true && r1.supersedeRate === null, '4b 仅事件（无索引分母）→ present=true 率 null')
  seedFrDir(knowledgeDir, { 'core-engine': '## FR-core-engine-001 x\n变更：c1\n状态：active\n摘要：s\n最近确认：\n' })
  const r2 = buildFrIndexStats(knowledgeDir, runtimeDir, { sinceDays: 1 })
  assert(r2.present === true && r2.index.entries === 1 && r2.supersedeRate === 0, '4c 仅 fr/（零取代事件）→ 率 0（有分母有分母的 0）')
}

// ── 6. CLI 端到端（直调 cmdKnowledgeStats——同 test/knowledge-stats.test.mjs 先例：全局层剥 --json 故不经 bin） ──
{
  const { base, knowledgeDir, runtimeDir } = makeFixture()
  seedFrDir(knowledgeDir, { 'core-engine': CE })
  appendKnowledgeHit(runtimeDir, { type: 'fr-supersede', change: '2026-09-18-c2', from: 'a', to: 'b' })
  const { cmdKnowledgeStats } = await import('../src/knowledge-stats.js')
  const capture = async (fn) => {
    let out = ''
    const orig = console.log
    console.log = (...a) => { out += a.join(' ') + '\n' }
    try { await fn() } finally { console.log = orig }
    return out
  }
  const j = JSON.parse(await capture(() => cmdKnowledgeStats(base, ['--json'], { specDir: base })))
  assert(j.ok === true && j.frIndex && j.frIndex.present === true && j.frIndex.events.frSupersede === 1, '6a --json 含 frIndex 键与聚合计数')
  const human = await capture(() => cmdKnowledgeStats(base, [], { specDir: base }))
  assert(human.includes('FR 索引实验') && human.includes('承接引用率') && human.includes('50%') && human.includes('1/2'), `6b 人类模式含实验段与率（50%：1 取代变更/2 索引来源变更）`)
}

// ── 7. 既有矩阵零回归 ──
{
  const { root, knowledgeDir, runtimeDir } = makeFixture()
  writeFileSync(join(knowledgeDir, 'INDEX.md'), '# Knowledge Index\n\n## Conventions\n- x|y → [conventions.md#a](conventions.md#a)\n')
  appendKnowledgeHit(runtimeDir, { type: 'fr-inject', change: 'c', matchedFiles: ['conventions.md#a'] })
  appendKnowledgeHit(runtimeDir, { type: 'inject', change: 'c2', matchedFiles: ['conventions.md#a'] })
  const m = buildHitMatrix(knowledgeDir, runtimeDir, { sinceDays: 1 })
  assert(m.matrix.length === 1 && m.matrix[0].hits === 1 && m.totalInjects === 1, `7 fr-* 事件不进命中矩阵（fr-inject 的 matchedFiles 不计——type 过滤面零回归，实际 hits=${m.matrix[0] && m.matrix[0].hits} injects=${m.totalInjects}）`)
}

// ── fr-inject source 分组（ql-20260919-002）：module-inject vs digest vs 存量无 source 归 digest ──
{
  const fx = makeFixture()
  const NL = String.fromCharCode(10)
  const hits = [
    JSON.stringify({ type: 'fr-inject', change: 'c1', domains: ['core-engine'], count: 3, source: 'module-inject', at: new Date().toISOString() }),
    JSON.stringify({ type: 'fr-inject', change: 'c1', domains: ['core-engine'], count: 14, source: 'digest', at: new Date().toISOString() }),
    JSON.stringify({ type: 'fr-inject', change: 'c2', domains: ['runtime'], count: 4, at: new Date().toISOString() }),  // 存量无 source
  ].join(NL) + NL
  writeFileSync(join(fx.runtimeDir, 'knowledge-hits.jsonl'), hits)
  const st = buildFrIndexStats(fx.knowledgeDir, fx.runtimeDir, {})
  assert(st.events.frInject === 3, `frInject 总数=3（source 维度不裂口径，实际 ${st.events.frInject}）`)
  assert(st.events.frInjectBySource && st.events.frInjectBySource['module-inject'] === 1, 'module-inject 桶=1')
  assert(st.events.frInjectBySource && st.events.frInjectBySource['digest'] === 2, 'digest 桶=2（含存量无 source 归桶）')
  assert(st.events.frInjectChanges === 2, `changes 按 change 去重=2（c1 双发不虚增，实际 ${st.events.frInjectChanges}）`)
  rmSyncSafe(fx.root)
}

for (const dir of tmpRoots) {
  try { rmSyncSafe(dir) } catch { /* Windows 句柄延迟 */ }
}
import { rmSync } from 'fs'
function rmSyncSafe(dir) { rmSync(dir, { recursive: true, force: true }) }

console.log(`\n${failed === 0 ? '✅ ALL PASS' : '❌ FAILED'}: ${total - failed}/${total}`)
process.exit(failed === 0 ? 0 : 1)
