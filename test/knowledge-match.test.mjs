/**
 * knowledge-match.test.mjs — knowledge 关键词匹配引擎测试
 */

import { join } from 'path'
import { existsSync, mkdirSync, writeFileSync, rmSync } from 'fs'
import { fileURLToPath, pathToFileURL } from 'url'
import { tmpdir } from 'os'

const __filename = fileURLToPath(import.meta.url)
const __dirname = join(__filename, '..') // join(__dirname, '..') to get parent
const root = join(__dirname, '..')

const { parseKnowledgeIndex, matchKnowledge } = await import(
  pathToFileURL(join(root, 'src', 'knowledge-match.js')).href
)

let passed = 0, failed = 0

function assert(cond, msg) {
  if (cond) { console.log(`  ✅ PASS: ${msg}`); passed++ }
  else { console.log(`  ❌ FAIL: ${msg}`); failed++ }
}

function setup(name) {
  const dir = join(tmpdir(), `kh-test-${name}`)
  mkdirSync(dir, { recursive: true })
  return dir
}
function clean(...dirs) {
  for (const d of dirs) try { rmSync(d, { recursive: true, force: true }) } catch {}
}

// ── 1: 有匹配条目 → matched=true, entries.length > 0 ──
console.log('\n=== Test 1: 有匹配条目 → matched=true ===')
{
  const dir = setup('t1')
  try {
    writeFileSync(join(dir, 'INDEX.md'), [
      '# Knowledge Index',
      '',
      '## Conventions',
      '- ESM|module|import → [ESM Only](conventions.md#esm-only)',
      '',
      '## Patterns',
      '- 阶段定义|stage|stages → [Stage Pattern](patterns.md#stage-step-pattern)',
    ].join('\n'))

    const result = matchKnowledge(dir, 'setup ESM module imports')
    assert(result.matched === true, 'matched is true')
    assert(result.entries.length === 1, 'one entry matched')
    assert(result.entries[0].file === 'conventions.md', 'file is conventions.md')
    assert(result.entries[0].anchor === 'esm-only', 'anchor is esm-only')
    assert(result.entries[0].keywords.includes('ESM'), 'keywords include ESM')
  } finally { clean(dir) }
}

// ── 2: 无匹配条目 → matched=false, report 包含 "no matches" ──
console.log('\n=== Test 2: 无匹配条目 → matched=false ===')
{
  const dir = setup('t2')
  try {
    writeFileSync(join(dir, 'INDEX.md'), [
      '# Knowledge Index',
      '',
      '## Patterns',
      '- 阶段定义|stage → [Stage Pattern](patterns.md#stage-step-pattern)',
    ].join('\n'))

    const result = matchKnowledge(dir, 'implement authentication flow')
    assert(result.matched === false, 'matched is false')
    assert(result.entries.length === 0, 'no entries matched')
    assert(result.report.includes('no matches'), 'report says no matches')
  } finally { clean(dir) }
}

// ── 3: INDEX.md 不存在 → matched=false, report 包含 "not found" ──
console.log('\n=== Test 3: INDEX.md 不存在 → matched=false ===')
{
  const dir = setup('t3')
  try {
    const result = matchKnowledge(dir, 'any context')
    assert(result.matched === false, 'matched is false')
    assert(result.report.includes('not found'), 'report says not found')
    assert(result.json.matched === false, 'json.matched is false')
    assert(result.json.entry_count === 0, 'json.entry_count is 0')
  } finally { clean(dir) }
}

// ── 4: INDEX.md 有空锚点引用 → 正常处理（不过度校验）──
console.log('\n=== Test 4: INDEX.md 有空锚点引用 → 正常处理 ===')
{
  const dir = setup('t4')
  try {
    writeFileSync(join(dir, 'INDEX.md'), [
      '# Knowledge Index',
      '',
      '## Conventions',
      '- naming|camelCase → [Naming](conventions.md)',
    ].join('\n'))

    const result = matchKnowledge(dir, 'naming conventions')
    assert(result.matched === true, 'matched is true with empty anchor')
    assert(result.entries[0].anchor === '', 'anchor is empty string')
    assert(result.entries[0].file === 'conventions.md', 'file is correct')
  } finally { clean(dir) }
}

// ── 5: 大小写不敏感匹配 → "STAGE" 匹配 "stage" ──
console.log('\n=== Test 5: 大小写不敏感匹配 ===')
{
  const dir = setup('t5')
  try {
    writeFileSync(join(dir, 'INDEX.md'), [
      '# Knowledge Index',
      '',
      '## Patterns',
      '- stage|stages → [Stage Pattern](patterns.md#stage-step-pattern)',
    ].join('\n'))

    const result = matchKnowledge(dir, 'implement STAGE definition')
    assert(result.matched === true, 'STAGE matches stage')
    assert(result.entries.length === 1, 'one entry matched')
  } finally { clean(dir) }
}

// ── 6: report 格式包含 "Knowledge Context" header ──
console.log('\n=== Test 6: report 格式包含 Knowledge Context header ===')
{
  const dir = setup('t6')
  try {
    writeFileSync(join(dir, 'INDEX.md'), [
      '# Knowledge Index',
      '',
      '## Patterns',
      '- 阶段定义|stage → [Stage Pattern](patterns.md#stage-step-pattern)',
    ].join('\n'))

    const result = matchKnowledge(dir, 'stage configuration')
    assert(result.report.includes('Knowledge Context'), 'report has Knowledge Context header')
    assert(result.report.includes('Status: matched'), 'report has Status: matched')
    assert(result.report.includes('Entries: 1'), 'report has Entries: 1')
    assert(result.report.includes('patterns.md#stage-step-pattern'), 'report has source')
  } finally { clean(dir) }
}

// ── 7: json 结构正确 ──
console.log('\n=== Test 7: json 结构正确 ===')
{
  const dir = setup('t7')
  try {
    writeFileSync(join(dir, 'INDEX.md'), [
      '# Knowledge Index',
      '',
      '## Conventions',
      '- ESM|module → [ESM Only](conventions.md#esm-only)',
      '',
      '## Patterns',
      '- stage|stages → [Stage Pattern](patterns.md#stage-step-pattern)',
    ].join('\n'))

    const result = matchKnowledge(dir, 'stage module setup')
    const j = result.json
    assert(j.matched === true, 'json.matched is true')
    assert(j.entry_count === 2, 'json.entry_count is 2')
    assert(Array.isArray(j.entries), 'json.entries is array')
    assert(j.entries.length === 2, 'json.entries length is 2')

    const stageEntry = j.entries.find(e => e.anchor === 'stage-step-pattern')
    assert(!!stageEntry, 'stage entry found in json')
    assert(stageEntry.keywords.includes('stage'), 'stage keywords correct')
    assert(stageEntry.category === 'Patterns', 'stage category correct')
    assert(stageEntry.file === 'patterns.md', 'stage file correct')
  } finally { clean(dir) }
}

// ── 8: 空目录（目录存在但无 INDEX.md）→ no matches ──
console.log('\n=== Test 8: 空目录（无 INDEX.md）→ no matches ===')
{
  const dir = setup('t8')
  try {
    const result = matchKnowledge(dir, 'any task')
    assert(result.matched === false, 'no INDEX.md → matched false')
    assert(result.report.includes('not found'), 'report says not found')
  } finally { clean(dir) }
}

// ── 9: parseKnowledgeIndex 返回正确分类 ──
console.log('\n=== Test 9: parseKnowledgeIndex 分类正确 ===')
{
  const dir = setup('t9')
  try {
    writeFileSync(join(dir, 'INDEX.md'), [
      '# Knowledge Index',
      '',
      '## Known Issues',
      '- GLM|proxy → [GLM Proxy](known-issues.md#glm-proxy)',
      '',
      '## Conventions',
      '- 命名|naming → [命名规范](conventions.md#naming)',
    ].join('\n'))

    const entries = parseKnowledgeIndex(dir)
    assert(entries.length === 2, 'parsed 2 entries')
    assert(entries[0].category === 'Known Issues', 'first entry category correct')
    assert(entries[1].category === 'Conventions', 'second entry category correct')
    assert(entries[0].display === 'GLM Proxy', 'display text correct')
  } finally { clean(dir) }
}

// ── 10: taskContext 为空 → no matches ──
console.log('\n=== Test 10: taskContext 为空 → no matches ===')
{
  const dir = setup('t10')
  try {
    writeFileSync(join(dir, 'INDEX.md'), [
      '# Knowledge Index',
      '',
      '## Patterns',
      '- stage → [Stage](patterns.md#stage)',
    ].join('\n'))

    const result = matchKnowledge(dir, '')
    assert(result.matched === false, 'empty context → matched false')
  } finally { clean(dir) }
}

// ── 汇总 ──
console.log(`\n${'='.repeat(40)}`)
console.log(`knowledge-match tests: ${passed} passed, ${failed} failed, ${passed + failed} total`)
if (failed > 0) process.exit(1)
