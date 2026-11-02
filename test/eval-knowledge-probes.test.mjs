/**
 * eval-knowledge-probes.test.mjs — 六类缺陷探针断言（FR-02 绑定）
 *
 * 注意：探针的 pass 语义是「修复后期望」——当前代码带缺陷时 pass=false 是正确检出。
 * 本测试只断言执行器语义与 fixture 完整性，不硬编码各类的当前红绿（红绿进 baseline 数据）。
 */
import { join } from 'node:path'
import { mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { fileURLToPath, pathToFileURL } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const root = join(__filename, '..', '..')

const { hitMatches, materialize, evaluateCase, runAllProbes } = await import(
  pathToFileURL(join(root, 'eval', 'knowledge', 'lib', 'probes.mjs')).href
)
const { PROBE_FIXTURES } = await import(pathToFileURL(join(root, 'eval', 'knowledge', 'fixtures', 'index.mjs')).href)

let passed = 0
let failed = 0
function assert(cond, msg) {
  if (cond) { console.log(`  ✅ PASS: ${msg}`); passed++ }
  else { console.log(`  ❌ FAIL: ${msg}`); failed++ }
}

// ── 1: hitMatches 语义 ──
console.log('\n=== Test 1: 期望匹配语义 ===')
{
  assert(hitMatches('a.md#x', 'a.md#x') === true, '精确键匹配')
  assert(hitMatches('a.md#x', 'a.md') === true, '文件级前缀匹配')
  assert(hitMatches('a.md', 'a.md') === true, '文件级精确匹配')
  assert(hitMatches('ab.md#x', 'a.md') === false, '前缀必须按 # 分段')
  assert(hitMatches('a.md#x', 'a.md#y') === false, '锚点不同不匹配')
}

// ── 2: evaluateCase 语义（内联 fixture） ──
console.log('\n=== Test 2: case 评估语义 ===')
{
  const fixture = {
    defect: 'synthetic',
    files: {
      'INDEX.md': '# I\n\n## M\n- alpha → [Alpha](a.md#a)\n- beta → [Beta](b.md#b)\n',
      'a.md': '# A\n\n## a\n\nalpha 内容\n',
      'b.md': '# B\n\n## b\n\nbeta 内容\n',
    },
    cases: [],
  }
  const dir = materialize(fixture)
  try {
    const ok = evaluateCase(dir, { name: 'contains 通过', kind: 'entries', query: 'alpha', expect: { contains: ['a.md#a'] } })
    assert(ok.pass === true, 'contains 命中 → pass')
    const miss = evaluateCase(dir, { name: 'contains 失败', kind: 'entries', query: 'alpha', expect: { contains: ['b.md#b'] } })
    assert(miss.pass === false && /缺少期望命中/.test(miss.detail), 'contains 未命中 → fail 且有理由')
    const ex = evaluateCase(dir, { name: 'excludes 失败', kind: 'entries', query: 'alpha', expect: { excludes: ['a.md'] } })
    assert(ex.pass === false && /出现禁止命中/.test(ex.detail), 'excludes 违规 → fail')
    const empty = evaluateCase(dir, { name: '空', kind: 'entries', query: '完全不存在的词zzz', expect: { empty: true } })
    assert(empty.pass === true, 'empty=true 且零命中 → pass')
    const bad = evaluateCase(dir, { name: '未知 kind', kind: 'nope', query: 'x', expect: {} })
    assert(bad.pass === false && /未知 kind/.test(bad.detail), '未知 kind → fail 不静默')
  } finally { rmSync(dir, { recursive: true, force: true }) }
}

// ── 3: 六类 fixture 完整性 ──
console.log('\n=== Test 3: fixture 完整性 ===')
{
  const defects = PROBE_FIXTURES.map((f) => f.defect)
  assert(defects.length === 6, '六个 fixture')
  for (const d of ['score-contract', 'word-boundary', 'route-rows', 'scope-manual', 'fixed-entries', 'linkage']) {
    assert(defects.includes(d), `覆盖 ${d}`)
  }
  assert(PROBE_FIXTURES.every((f) => f.cases.length > 0 && Object.keys(f.files).length > 0), '每类有 files 与 cases')
  assert(PROBE_FIXTURES.every((f) => f.files['INDEX.md']), '每类含 INDEX.md')
}

// ── 4: 全量执行结构与工具自检 ──
console.log('\n=== Test 4: 全量执行 ===')
{
  const results = runAllProbes()
  assert(results.length === 6, '返回六类结果')
  assert(results.every((r) => typeof r.pass === 'boolean' && Array.isArray(r.cases)), '结果结构完整')
  const linkage = results.find((r) => r.defect === 'linkage')
  assert(linkage && linkage.pass === true, 'linkage 探针（工具自身健康报告）pass')
  // 探针检出能力：至少一类缺陷被检出（pass=false），证明断言不是空转
  assert(results.some((r) => r.pass === false), '至少一类缺陷被检出（断言非空转）')
}

// ── 汇总 ──
console.log(`\n${'='.repeat(40)}`)
console.log(`eval-knowledge-probes tests: ${passed} passed, ${failed} failed, ${passed + failed} total`)
if (failed > 0) process.exit(1)
