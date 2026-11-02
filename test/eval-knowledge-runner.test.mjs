/**
 * eval-knowledge-runner.test.mjs — 评测指标纯函数测试（FR-03 绑定）
 */
import { basename, join, resolve } from 'node:path'
import { rmSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const root = join(__filename, '..', '..')

const { rankOf, hitAtK, mrr, precisionAtK, summarize, stableSortByScore } = await import(
  pathToFileURL(join(root, 'eval', 'knowledge', 'lib', 'metrics.mjs')).href
)
const { runFace } = await import(pathToFileURL(join(root, 'eval', 'knowledge', 'lib', 'faces.mjs')).href)
const { materialize } = await import(pathToFileURL(join(root, 'eval', 'knowledge', 'lib', 'probes.mjs')).href)

let passed = 0
let failed = 0
function assert(cond, msg) {
  if (cond) { console.log(`  ✅ PASS: ${msg}`); passed++ }
  else { console.log(`  ❌ FAIL: ${msg}`); failed++ }
}

// ── 1: rankOf 命中与未命中 ──
console.log('\n=== Test 1: rankOf ===')
{
  const hits = ['a.md#x', 'b.md#y', 'c.md#z']
  assert(rankOf(hits, ['b.md#y']) === 2, '命中第 2 位 → rank=2')
  assert(rankOf(hits, ['nope']) === Infinity, '未命中 → Infinity')
  assert(rankOf(hits, ['c.md#z', 'a.md#x']) === 1, '多期望取最佳名次')
  assert(rankOf([], ['a']) === Infinity, '空命中 → Infinity')
}

// ── 2: hitAtK ──
console.log('\n=== Test 2: hitAtK ===')
{
  assert(hitAtK(3, 3) === true, 'rank=3 ≤ k=3 命中')
  assert(hitAtK(4, 3) === false, 'rank=4 > k=3 未命中')
  assert(hitAtK(Infinity, 10) === false, 'Infinity 恒未命中')
}

// ── 3: mrr ──
console.log('\n=== Test 3: mrr ===')
{
  assert(Math.abs(mrr([1, 2, Infinity]) - (1 + 0.5 + 0) / 3) < 1e-9, '倒数和均值（未命中记 0）')
  assert(mrr([]) === 0, '空集 0')
}

// ── 4: precisionAtK ──
console.log('\n=== Test 4: precisionAtK ===')
{
  const hits = ['a', 'x', 'b', 'y']
  assert(precisionAtK(hits, ['a', 'b'], 3) === 2 / 3, '前 3 中 2 条相关 → 2/3')
  assert(precisionAtK(hits, ['a'], 1) === 1, '前 1 命中 → 1')
  assert(precisionAtK([], ['a'], 3) === 0, '空 top → 0')
}

// ── 5: summarize 键序与四舍五入 ──
console.log('\n=== Test 5: summarize ===')
{
  const s = summarize([1, 2, 4, Infinity])
  assert(JSON.stringify(Object.keys(s)) === '["top1","top3","mrr","n"]', '键序固定 top1/top3/mrr/n')
  assert(s.top1 === 0.25, 'top1 = 1/4')
  assert(s.top3 === 0.5, 'top3 = 2/4')
  assert(s.mrr === Math.round(((1 + 0.5 + 0.25) / 4) * 10000) / 10000, 'mrr 4 位小数')
  assert(s.n === 4, 'n = case 数')
  assert(JSON.stringify(summarize([])) === '{"top1":0,"top3":0,"mrr":0,"n":0}', '空集全零')
}

// ── 6: stableSortByScore 同分保持原序 ──
console.log('\n=== Test 6: stableSortByScore ===')
{
  const items = [{ k: 'a', s: 1 }, { k: 'b', s: 3 }, { k: 'c', s: 1 }]
  const sorted = stableSortByScore(items, (x) => x.s)
  assert(sorted.map((x) => x.k).join('') === 'bac', '降序且同分 a/c 保序')
}

// ── 7: 分面 raw/rendered 双口径与截断归因（FR-03） ──
console.log('\n=== Test 7: 分面 raw/rendered ===')
{
  const fixture = {
    defect: 'synthetic-face',
    files: {
      'INDEX.md': [
        '# I', '', '## M',
        '- alpha → [A](a.md#a)', '- alpha → [B](b.md#b)',
        '- alpha → [C](c.md#c)', '- alpha → [D](d.md#d)', '',
      ].join('\n'),
      'a.md': '# A\n\n## a\n\nalpha\n',
      'b.md': '# B\n\n## b\n\nalpha\n',
      'c.md': '# C\n\n## c\n\nalpha\n',
      'd.md': '# D\n\n## d\n\nalpha\n',
    },
  }
  const dir = materialize(fixture)
  try {
    // 期望第 4 位：raw 命中但 rendered(top-3) 不中 → truncated
    const deep = await runFace(dir, 'entries', [{ id: 'deep', query: 'alpha', expected: ['d.md#d'] }])
    assert(deep.raw.top3 === 0, 'raw rank=4 → raw.top3=0')
    assert(deep.rendered.top3 === 0, 'rendered 前 3 不含 → rendered.top3=0')
    assert(deep.truncated.includes('deep'), 'raw 召回而 rendered 丢 → truncated 记录')
    assert(deep.details[0].raw_rank === 4 && deep.details[0].rendered_rank === null, 'per-case 名次明细记录 raw=4/rendered=null')
    // 期望第 2 位：双口径均中、无截断
    const near = await runFace(dir, 'entries', [{ id: 'near', query: 'alpha', expected: ['b.md#b'] }])
    assert(near.raw.top3 === 1 && near.rendered.top3 === 1, '第 2 位双口径均中')
    assert(near.truncated.length === 0, '无截断')
    // search 面：file 级投影 + 全量 raw 不预截断
    const sf = await runFace(dir, 'search', [{ id: 'sf', query: 'alpha', expected: ['b.md#b'] }])
    assert(sf.raw.top3 === 1, 'search 面 anchor 期望投影到 file 级后命中')
  } finally { rmSync(dir, { recursive: true, force: true }) }
}

// ── 8: decisions 面 rejected 优先序 ──
console.log('\n=== Test 8: decisions 面 ===')
{
  const fixture = {
    defect: 'synthetic-dec',
    files: {
      'INDEX.md': '# I\n\n## Decisions\n- alpha → [demo](decisions/demo.md)\n',
      'decisions/demo.md': [
        '## D-001@v1 alpha 实现方案', '状态：implemented', '变更：x', '',
        '## D-002@v1 alpha 替代方案', '状态：rejected', '变更：x', '否决理由：成本高', '',
      ].join('\n'),
    },
  }
  const dir = materialize(fixture)
  try {
    const m = await runFace(dir, 'decisions', [{ id: 'd1', query: 'alpha', expected: ['decisions/demo.md#D-002@v1'] }])
    assert(m.raw.top1 === 1, 'rejected 条目排前 → top1 命中')
  } finally { rmSync(dir, { recursive: true, force: true }) }
}

// ── 9: 仓参数解析（通用，不枚举项目） ──
console.log('\n=== Test 9: parseRepoArgs ===')
{
  const { parseRepoArgs, parseRepoSpec } = await import(pathToFileURL(join(root, 'eval', 'knowledge', 'lib', 'repos.mjs')).href)
  const d = parseRepoArgs(null, root)
  assert(d.size === 1 && d.has(basename(root)), '缺省 = 当前仓（标签=basename）')
  const m = parseRepoArgs(`alpha:${join(root, 'a')},beta:${join(root, 'b')}`, root)
  assert(m.get('alpha') === resolve(join(root, 'a')) && m.get('beta') === resolve(join(root, 'b')), 'label:path 显式标签')
  const win = parseRepoSpec('C:/repos/proj')
  assert(win.label === 'proj', 'Windows 盘符不当作 label 分隔符')
  let threw = false
  try { parseRepoArgs(`x:${join(root, 'a')},x:${join(root, 'b')}`, root) } catch { threw = true }
  assert(threw === true, '重复标签抛错（不静默覆盖）')
}

// ── 10: diffBaseline（快照不一致 + 指标变化 + baseline 两套值） ──
console.log('\n=== Test 10: diffBaseline ===')
{
  const { diffBaseline } = await import(pathToFileURL(join(root, 'eval', 'knowledge', 'lib', 'report.mjs')).href)
  const cur = {
    snapshot: { r: { head: 'bbb', knowledge_hash: 'h2' } },
    metrics: { r: { entries: { raw: { top1: 0.5, top3: 0.5, mrr: 0.5 }, rendered: { top1: 0.5, top3: 0.5, mrr: 0.5 } } } },
    probes: { 'score-contract': true },
  }
  const base = {
    snapshot: { r: { head: 'aaa', knowledge_hash: 'h1' } },
    metrics: { r: { entries: { raw: { top1: 0.25, top3: 0.25, mrr: 0.25 }, rendered: { top1: 0.25, top3: 0.25, mrr: 0.25 } } } },
    probes: { 'score-contract': false },
  }
  const d = diffBaseline(cur, base)
  assert(d.mismatches.length === 1 && /snapshot_mismatch/.test(d.mismatches[0]), '快照差异 → snapshot_mismatch')
  assert(d.baselineSummary['r/entries'].raw.top3 === 0.25 && d.baselineSummary['r/entries'].rendered.top3 === 0.25, 'baselineSummary 保留基线侧 raw+rendered 全量指标')
  assert(d.changes.some((c) => /raw\.top3 0\.25 → 0\.5/.test(c)), '指标变化逐项列出')
  assert(d.changes.some((c) => /probe score-contract: RED → GREEN/.test(c)), 'probe 翻转列出')
  const empty = diffBaseline(cur, null)
  assert(empty.mismatches.length === 0 && empty.changes.length === 0, '无基线 → 空 diff 不抛')
}

// ── 11: fr 面（FR 索引 digest 通道） ──
console.log('\n=== Test 11: fr 面 ===')
{
  const fixture = {
    defect: 'synthetic-fr',
    files: {
      'INDEX.md': '# I\n',
      'fr/demo.md': '## FR-demo-001 alpha 需求标题\n变更：x\n状态：active\n摘要：主路径\n',
    },
  }
  const dir = materialize(fixture)
  try {
    const m = await runFace(dir, 'fr', [{ id: 'f1', query: 'alpha 需求标题', expected: ['fr/demo.md#FR-demo-001'] }])
    assert(m.raw.top3 === 1, 'fr 面命中 FR 条目')
  } finally { rmSync(dir, { recursive: true, force: true }) }
}

// ── 12: scope 子集单列（FR-05） ──
console.log('\n=== Test 12: subsetSummaries ===')
{
  const { subsetSummaries } = await import(pathToFileURL(join(root, 'eval', 'knowledge', 'lib', 'faces.mjs')).href)
  const fr = { details: [{ id: 'a', raw_rank: 1 }, { id: 'b', raw_rank: null }, { id: 'c', raw_rank: 6 }] }
  const s = subsetSummaries(fr, [
    { id: 'a', subset: 'frozen' }, { id: 'b', subset: 'added' }, { id: 'c', subset: 'added' },
  ])
  assert(s.frozen.n === 1 && s.frozen.top1 === 1, 'frozen 子集单列（1 条 rank1）')
  assert(s.added.n === 2 && s.added.top3 === 0, 'added 子集单列（rank null 与 6 → top3=0，不掩盖）')
}

// ── 汇总 ──
console.log(`\n${'='.repeat(40)}`)
console.log(`eval-knowledge-runner tests: ${passed} passed, ${failed} failed, ${passed + failed} total`)
if (failed > 0) process.exit(1)
