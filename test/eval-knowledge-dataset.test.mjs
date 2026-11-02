/**
 * eval-knowledge-dataset.test.mjs — 三源数据集加载与校验（FR-01 绑定）
 */
import { join } from 'node:path'
import { mkdirSync, writeFileSync, rmSync, appendFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { fileURLToPath, pathToFileURL } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const root = join(__filename, '..', '..')

const { loadOrganic, validateOrganicCase, buildSelfCases, extractTelemetryPool, validateLabels } = await import(
  pathToFileURL(join(root, 'eval', 'knowledge', 'lib', 'dataset.mjs')).href
)

let passed = 0
let failed = 0
function assert(cond, msg) {
  if (cond) { console.log(`  ✅ PASS: ${msg}`); passed++ }
  else { console.log(`  ❌ FAIL: ${msg}`); failed++ }
}
function setup(name) {
  const dir = join(tmpdir(), `ek-ds-${process.pid}-${name}`)
  rmSync(dir, { recursive: true, force: true })
  mkdirSync(dir, { recursive: true })
  return dir
}

// ── 1: validateOrganicCase ──
console.log('\n=== Test 1: organic case 校验 ===')
{
  const ok = { id: 'c1', repo: 'sillyspec', face: 'entries', query: 'worktree 清理', expected: ['a.md#x'] }
  assert(validateOrganicCase(ok) === null, '合法 case → null')
  assert(validateOrganicCase(null) === 'not-object', 'null → not-object')
  assert(validateOrganicCase({ ...ok, id: '' }) === 'id', '缺 id')
  assert(validateOrganicCase({ ...ok, repo: undefined }) === 'repo', '缺 repo 标签')
  assert(validateOrganicCase({ ...ok, repo: 'any-project-label' }) === null, '任意仓标签合法（不枚举项目）')
  assert(validateOrganicCase({ ...ok, face: 'fr' }) === null, 'fr 面合法')
  assert(validateOrganicCase({ ...ok, scope_files: [] }) === 'scope_files', '空 scope_files 非法')
  assert(validateOrganicCase({ ...ok, scope_files: [''] }) === 'scope_files-item', 'scope_files 空项非法')
  assert(validateOrganicCase({ ...ok, face: 'nope' }) === 'face', '非法 face')
  assert(validateOrganicCase({ ...ok, query: '  ' }) === 'query', '空 query')
  assert(validateOrganicCase({ ...ok, expected: [] }) === 'expected-empty', '空 expected')
  assert(validateOrganicCase({ ...ok, expected: [''] }) === 'expected-item', '空期望项')
}

// ── 2: loadOrganic 跳过语义 ──
console.log('\n=== Test 2: organic 加载 ===')
{
  const d = setup('org')
  try {
    const f = join(d, 'organic.jsonl')
    writeFileSync(f, [
      '// 注释行',
      JSON.stringify({ id: 'c1', repo: 'sillyspec', face: 'entries', query: 'q1', expected: ['a.md#x'] }),
      'not-json',
      JSON.stringify({ id: 'c2', repo: 'sillyspec', face: 'entries', query: 'q2', expected: [] }),
      '',
      JSON.stringify({ id: 'c3', repo: 'platform', face: 'decisions', query: 'q3', expected: ['D-001@v1'] }),
    ].join('\n'))
    const r = loadOrganic(f)
    assert(r.cases.length === 2, '2 条合法 case')
    assert(r.skipped.length === 2, '2 条跳过（bad-json + expected-empty）')
    assert(r.skipped[0].reason === 'bad-json' && r.skipped[1].reason === 'expected-empty', '跳过原因正确')
    assert(r.missing === false, 'missing=false')
    assert(loadOrganic(join(d, 'nope.jsonl')).missing === true, '文件缺失 → missing=true')
  } finally { rmSync(d, { recursive: true, force: true }) }
}

// ── 3: buildSelfCases 映射 ──
console.log('\n=== Test 3: self 现场构建 ===')
{
  const d = setup('self')
  try {
    const arch = join(d, '.sillyspec', 'changes', 'archive', '2026-01-01-demo')
    mkdirSync(arch, { recursive: true })
    writeFileSync(join(arch, 'flow-state.yaml'), 'tier: thin\ninput: |-\n  实现 demo 功能\n  成功标准：\n  - 行为 A\n')
    writeFileSync(join(arch, 'decisions.md'), '## D-001@v1 选用方案甲\n状态：implemented\n')
    const kdir = join(d, '.sillyspec', 'knowledge', 'decisions')
    mkdirSync(kdir, { recursive: true })
    writeFileSync(join(d, '.sillyspec', 'knowledge', 'INDEX.md'), [
      '# Knowledge Index', '', '## Decisions', '- demo → [demo](decisions/demo.md)',
    ].join('\n'))
    writeFileSync(join(kdir, 'demo.md'), [
      '## D-demo-001@v1 选用方案甲', '变更：2026-01-01-demo', '原编号：D-001@v1', '状态：implemented', '',
    ].join('\n'))
    // 无 input 的归档 → skipped
    const arch2 = join(d, '.sillyspec', 'changes', 'archive', '2026-01-02-noinput')
    mkdirSync(arch2, { recursive: true })
    writeFileSync(join(arch2, 'flow-state.yaml'), 'tier: thin\n')
    writeFileSync(join(arch2, 'decisions.md'), '## D-001@v1 x\n')
    const r = buildSelfCases(d, 'sillyspec')
    assert(r.cases.length === 1, '1 条 self case（有 input 且映射成功）')
    assert(r.cases[0].expected[0] === 'decisions/demo.md#D-demo-001@v1', '期望映射到蒸馏后全局号')
    assert(r.cases[0].face === 'self', 'face=self')
    assert(r.skipped.some((s) => s.archive === '2026-01-02-noinput' && s.reason === 'no-input'), '无 input 归档跳过')
  } finally { rmSync(d, { recursive: true, force: true }) }
}

// ── 4: extractTelemetryPool 去重与限流 ──
console.log('\n=== Test 4: 遥测池抽取 ===')
{
  const d = setup('tel')
  try {
    const f = join(d, 'hits.jsonl')
    const ev = (change, query, type = 'inject') => JSON.stringify({ type, change, query, matchedFiles: [] })
    writeFileSync(f, [
      ev('c1', 'q1'), ev('c1', 'q1'), ev('c1', 'q2'), ev('c1', 'q3'), ev('c1', 'q4'),
      ev('c2', 'q5'), ev('c2', 'q6', 'classify'), '',
    ].join('\n'))
    const pool = extractTelemetryPool(f, { limitPerChange: 3 })
    assert(pool.length === 4, 'c1 限流 3 条 + c2 1 条')
    assert(pool.filter((p) => p.change === 'c1').length === 3, '同变更限流生效')
    assert(pool.every((p) => p.query !== 'q6'), '非 inject 事件不进池')
    assert(extractTelemetryPool(join(d, 'none.jsonl')).length === 0, '文件缺失 → 空池')
  } finally { rmSync(d, { recursive: true, force: true }) }
}

// ── 5: 标签有效性自检 ──
console.log('\n=== Test 5: validateLabels ===')
{
  const d = setup('labels')
  try {
    mkdirSync(join(d, '.sillyspec', 'knowledge', 'decisions'), { recursive: true })
    writeFileSync(join(d, '.sillyspec', 'knowledge', 'INDEX.md'), '# I\n')
    writeFileSync(join(d, '.sillyspec', 'knowledge', 'decisions', 'x.md'), '## D-001@v1 标题\n状态：implemented\n')
    const issues = validateLabels([
      { id: 'ok', repo: 'r', face: 'decisions', query: 'q', expected: ['decisions/x.md#D-001@v1'] },
      { id: 'missing-file', repo: 'r', face: 'decisions', query: 'q', expected: ['decisions/nope.md'] },
      { id: 'missing-anchor', repo: 'r', face: 'decisions', query: 'q', expected: ['decisions/x.md#D-999@v1'] },
      { id: 'missing-scope-file', repo: 'r', face: 'scope', query: 'q', expected: ['decisions/x.md'], scope_files: ['src/nope.js'] },
    ], new Map([['r', d]]))
    assert(issues.length === 3, '三条结构性问题检出')
    assert(issues.some((i) => i.id === 'missing-file' && i.reason === 'file-missing'), 'file-missing 检出')
    assert(issues.some((i) => i.id === 'missing-anchor' && i.reason === 'anchor-heading-missing'), 'anchor-heading-missing 检出（标签指向不存在锚点）')
    assert(issues.some((i) => i.id === 'missing-scope-file' && i.reason === 'scope-file-missing'), 'scope-file-missing 检出')
    assert(validateLabels([{ id: 'x', repo: 'not-running', face: 'entries', query: 'q', expected: ['nope.md'] }], new Map()).length === 0, '未参与运行的仓标签不判错')
  } finally { rmSync(d, { recursive: true, force: true }) }
}

// ── 汇总 ──
console.log(`\n${'='.repeat(40)}`)
console.log(`eval-knowledge-dataset tests: ${passed} passed, ${failed} failed, ${passed + failed} total`)
if (failed > 0) process.exit(1)
