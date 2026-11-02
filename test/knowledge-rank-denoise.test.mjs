/**
 * knowledge-rank-denoise.test.mjs — 排序与降噪单测（变更 2026-11-02-knowledge-rank-denoise）
 *
 * 覆盖：FR-01 score 契约与 channel / FR-02 词边界与词片拆分 / FR-03 已修复过滤 /
 *       FR-04 routeHits 分离 / FR-05 DF 排序。
 */
import { join } from 'node:path'
import { mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { fileURLToPath, pathToFileURL } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const root = join(__filename, '..', '..')

const { buildSearchMatches } = await import(pathToFileURL(join(root, 'src', 'stages', 'knowledge.js')).href)
const { matchByRouting, keywordMatchesContext } = await import(pathToFileURL(join(root, 'src', 'knowledge-match.js')).href)

let passed = 0
let failed = 0
function assert(cond, msg) {
  if (cond) { console.log(`  ✅ PASS: ${msg}`); passed++ }
  else { console.log(`  ❌ FAIL: ${msg}`); failed++ }
}

function setup(name, files) {
  const dir = join(tmpdir(), `krd-${process.pid}-${name}`)
  rmSync(dir, { recursive: true, force: true })
  mkdirSync(dir, { recursive: true })
  for (const [rel, content] of Object.entries(files)) {
    const p = join(dir, rel)
    mkdirSync(join(p, '..'), { recursive: true })
    writeFileSync(p, content)
  }
  return dir
}

// ── 1: score 契约（FR-01） ──
console.log('\n=== Test 1: score = 实际命中标签数 ===')
{
  const result = {
    entries: [{ file: 'a.md', display: 'A', keywords: ['alpha', 'beta', 'gamma', 'delta'], category: 'M', anchor: 'a' }],
    json: {},
  }
  const rows = buildSearchMatches(result, join(tmpdir(), 'no-such-dir'), 10, 'alpha 用法')
  assert(rows[0].score === 1, '4 个关键词命中 1 个 → score=1（不再是表长 4）')
  assert(rows[0].channel === 'routing', 'INDEX 路由命中 → channel=routing')
  const fb = buildSearchMatches({ ...result, json: { fallback: true } }, join(tmpdir(), 'no-such-dir'), 10, 'alpha')
  assert(fb[0].channel === 'fallback', '词片回退 → channel=fallback')
  const vec = buildSearchMatches({ ...result, json: { vector: true } }, join(tmpdir(), 'no-such-dir'), 10, 'alpha')
  assert(vec[0].channel === 'vector', '向量召回 → channel=vector')
}

// ── 2: 词边界与词片（FR-02） ──
console.log('\n=== Test 2: 词边界 ===')
{
  const ctx = '修复 node_modules junction'
  assert(keywordMatchesContext('node', ctx) === false, 'node 不命中 node_modules（_ 是词字符）')
  assert(keywordMatchesContext('node', 'node 版本升级') === true, 'node 命中独立词')
  assert(keywordMatchesContext('worktree', 'worktree_apply 冲突') === false, 'worktree 不命中 worktree_apply')
  assert(keywordMatchesContext('worktree', '2026-05-29-worktree-isolation') === true, 'worktree 命中 kebab-case 变更名（- 是边界）')
  assert(keywordMatchesContext('cli-entry', '2026-09-28-cli-entry-drill') === true, 'cli-entry 命中 kebab-case（- 保持边界）')
}

// ── 3: 已修复过滤（FR-03） ──
console.log('\n=== Test 3: 已修复过滤 ===')
{
  const dir = setup('resolved', {
    'INDEX.md': [
      '# I', '',
      '## Known Issues',
      '- alpha → [alpha 已修复](known-issues.md#alpha-已修复)',
      '- beta → [beta 坑](known-issues.md#beta-坑)', '',
    ].join('\n'),
    'known-issues.md': '# Known Issues\n\n## 🟢 alpha 问题已修复（commit abc）\n\n历史坑。\n\n## 🔴 beta 问题\n\n当前坑。\n',
  })
  try {
    const def = matchByRouting(dir, 'alpha 问题')
    assert(def.matched === false, '默认：只命中已修复条目 → 零命中')
    assert(Array.isArray(def.json.resolvedFiltered) && def.json.resolvedFiltered.includes('known-issues.md'), 'resolvedFiltered 披露被滤文件')
    const inc = matchByRouting(dir, 'alpha 问题', { includeResolved: true })
    assert(inc.matched === true && inc.entries.length === 1, 'includeResolved 返回已修复条目')
    const beta = matchByRouting(dir, 'beta 问题')
    assert(beta.matched === true && beta.entries[0].file === 'known-issues.md', '未修复条目正常命中（非误杀）')
  } finally { rmSync(dir, { recursive: true, force: true }) }
}

// ── 4: DF 排序（FR-05） ──
console.log('\n=== Test 4: DF 排序 ===')
{
  const idx = ['# I', '', '## Patterns']
  for (let i = 0; i < 5; i++) idx.push(`- sillyspec → [泛${i}](p${i}.md#p${i})`)
  idx.push('- specificword → [长尾](long.md#long)')
  const files = { 'INDEX.md': idx.join('\n') + '\n' }
  for (let i = 0; i < 5; i++) files[`p${i}.md`] = `# P${i}\n\n## p${i}\n\n正文\n`
  files['long.md'] = '# L\n\n## long\n\n正文\n'
  const dir = setup('df', files)
  try {
    const r = matchByRouting(dir, 'sillyspec specificword 查询')
    assert(r.entries[0].file === 'long.md', '长尾具体词条目排在泛词条目之前（DF 降权）')
    assert(r.entries.length === 6, '全部候选保留（只改排序不删条目）')
    const r2 = matchByRouting(dir, 'sillyspec specificword 查询')
    assert(JSON.stringify(r.entries.map((e) => e.file)) === JSON.stringify(r2.entries.map((e) => e.file)), '重复运行顺序一致（确定性）')
  } finally { rmSync(dir, { recursive: true, force: true }) }
}

// ── 汇总 ──
console.log(`\n${'='.repeat(40)}`)
console.log(`knowledge-rank-denoise tests: ${passed} passed, ${failed} failed, ${passed + failed} total`)
if (failed > 0) process.exit(1)
