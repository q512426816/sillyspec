/**
 * scan-knowledge.test.mjs — knowledge 产物校验测试
 */

import { join, resolve, dirname, basename } from 'path'
import { existsSync, mkdirSync, writeFileSync, rmSync } from 'fs'
import { fileURLToPath, pathToFileURL } from 'url'
import { tmpdir } from 'os'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const root = resolve(__dirname, '..')

const { runScanPostCheck } = await import(pathToFileURL(join(root, 'src', 'scan-postcheck.js')).href)

let passed = 0, failed = 0

function assert(cond, msg) {
  if (cond) { console.log(`  ✅ PASS: ${msg}`); passed++ }
  else { console.log(`  ❌ FAIL: ${msg}`); failed++ }
}

function setup(name) {
  const cwd = join(tmpdir(), `kn-${name}`)
  mkdirSync(cwd, { recursive: true })
  return cwd
}
function specSetup(name) {
  const d = join(tmpdir(), `kn-${name}-spec`)
  mkdirSync(d, { recursive: true })
  return d
}
function clean(...dirs) { for (const d of dirs) try { rmSync(d, { recursive: true, force: true }) } catch {} }

const DOCS = ['ARCHITECTURE.md','CONVENTIONS.md','STRUCTURE.md','INTEGRATIONS.md','TESTING.md','CONCERNS.md','PROJECT.md']

function writeFull(cwd, specDir) {
  const proj = basename(cwd)
  for (const d of DOCS) {
    const p = join(specDir, 'docs', proj, 'scan', d)
    mkdirSync(dirname(p), { recursive: true })
    writeFileSync(p, 'author: bot\ncreated_at: 2026-06-19 10:00:00\n# doc\n')
  }
}

// ── 1: knowledge INDEX.md 存在，引用真实文件 → 通过 ──
console.log('\n=== Test 1: knowledge INDEX.md 存在且引用有效 → no knowledge warning ===')
{
  const cwd = setup('t1'), spec = specSetup('t1')
  try {
    writeFull(cwd, spec)
    const knowledgeDir = join(spec, 'knowledge')
    mkdirSync(knowledgeDir, { recursive: true })
    writeFileSync(join(knowledgeDir, 'INDEX.md'),
      '# Knowledge Index\n\n## Conventions\n- [kebab-case naming](conventions.md#kebab-case-naming)\n')
    writeFileSync(join(knowledgeDir, 'conventions.md'),
      '# Conventions\n\n## kebab-case-naming\nFiles use kebab-case.\n')

    const result = runScanPostCheck({ cwd, specDir: spec })
    const knowledgeChecks = result.checks.filter(c => c.name.startsWith('knowledge_'))
    assert(knowledgeChecks.length === 0, 'no knowledge warnings when INDEX.md + referenced files exist')
  } finally { clean(cwd, spec) }
}

// ── 2: knowledge 目录不存在 → dir_missing 警告 ──
console.log('\n=== Test 2: knowledge 目录不存在 → knowledge_dir_missing ===')
{
  const cwd = setup('t2'), spec = specSetup('t2')
  try {
    writeFull(cwd, spec)

    const result = runScanPostCheck({ cwd, specDir: spec })
    const missing = result.checks.find(c => c.name === 'knowledge_dir_missing')
    assert(!!missing, 'knowledge_dir_missing check exists')
    assert(missing.detail.includes('knowledge/ 目录不存在'), 'detail text correct')
  } finally { clean(cwd, spec) }
}

// ── 3: INDEX.md 不存在 → index_missing 警告 ──
console.log('\n=== Test 3: INDEX.md 不存在 → knowledge_index_missing ===')
{
  const cwd = setup('t3'), spec = specSetup('t3')
  try {
    writeFull(cwd, spec)
    const knowledgeDir = join(spec, 'knowledge')
    mkdirSync(knowledgeDir, { recursive: true })
    // INDEX.md not created

    const result = runScanPostCheck({ cwd, specDir: spec })
    const missing = result.checks.find(c => c.name === 'knowledge_index_missing')
    assert(!!missing, 'knowledge_index_missing check exists')
    assert(missing.detail.includes('INDEX.md 不存在'), 'detail text correct')
  } finally { clean(cwd, spec) }
}

// ── 4: INDEX.md 引用不存在文件 → broken_refs 警告 ──
console.log('\n=== Test 4: INDEX.md 引用不存在的文件 → knowledge_broken_refs ===')
{
  const cwd = setup('t4'), spec = specSetup('t4')
  try {
    writeFull(cwd, spec)
    const knowledgeDir = join(spec, 'knowledge')
    mkdirSync(knowledgeDir, { recursive: true })
    writeFileSync(join(knowledgeDir, 'INDEX.md'),
      '# Knowledge Index\n\n## Conventions\n- [naming](conventions.md#naming)\n\n## Patterns\n- [auth pattern](patterns.md#auth-pattern)\n')
    // conventions.md exists, patterns.md does not
    writeFileSync(join(knowledgeDir, 'conventions.md'), '# Conventions\n')

    const result = runScanPostCheck({ cwd, specDir: spec })
    const broken = result.checks.find(c => c.name === 'knowledge_broken_refs')
    assert(!!broken, 'knowledge_broken_refs check exists')
    assert(broken.detail.includes('patterns.md'), 'reports missing patterns.md')
  } finally { clean(cwd, spec) }
}

// ── 5: uncategorized.md 为空但存在 → 通过 ──
console.log('\n=== Test 5: uncategorized.md 空但存在 → no knowledge warning ===')
{
  const cwd = setup('t5'), spec = specSetup('t5')
  try {
    writeFull(cwd, spec)
    const knowledgeDir = join(spec, 'knowledge')
    mkdirSync(knowledgeDir, { recursive: true })
    writeFileSync(join(knowledgeDir, 'INDEX.md'),
      '# Knowledge Index\n\n(no entries yet)\n')
    writeFileSync(join(knowledgeDir, 'uncategorized.md'), '# Uncategorized\n')

    const result = runScanPostCheck({ cwd, specDir: spec })
    const knowledgeChecks = result.checks.filter(c => c.name.startsWith('knowledge_'))
    assert(knowledgeChecks.length === 0, 'empty uncategorized.md passes')
  } finally { clean(cwd, spec) }
}

// ── 6: categorized 文件存在但 INDEX.md 无条目 → 通过（不强求 categorized 非空）──
console.log('\n=== Test 6: categorized 文件存在 + INDEX.md 有效 → no knowledge warning ===')
{
  const cwd = setup('t6'), spec = specSetup('t6')
  try {
    writeFull(cwd, spec)
    const knowledgeDir = join(spec, 'knowledge')
    mkdirSync(knowledgeDir, { recursive: true })
    writeFileSync(join(knowledgeDir, 'INDEX.md'),
      '# Knowledge Index\n\n## Known Issues\n- [GLM proxy](known-issues.md#glm-proxy)\n')
    writeFileSync(join(knowledgeDir, 'known-issues.md'),
      '# Known Issues\n\n## glm-proxy\nGLM proxy has usage metadata limits.\n')
    writeFileSync(join(knowledgeDir, 'uncategorized.md'), '# Uncategorized\n')

    const result = runScanPostCheck({ cwd, specDir: spec })
    const knowledgeChecks = result.checks.filter(c => c.name.startsWith('knowledge_'))
    assert(knowledgeChecks.length === 0, 'at least one categorized file + valid INDEX passes')
  } finally { clean(cwd, spec) }
}

// ── 7: source_root knowledge 泄漏检测（平台模式已有检查）──
console.log('\n=== Test 7: source_root knowledge 泄漏 → source_root_leak ===')
{
  const cwd = setup('t7'), spec = specSetup('t7')
  try {
    writeFull(cwd, spec)
    // 写入 source_root/.sillyspec/knowledge/ 泄漏
    const leakedKnowledgeDir = join(cwd, '.sillyspec', 'knowledge')
    mkdirSync(leakedKnowledgeDir, { recursive: true })
    writeFileSync(join(leakedKnowledgeDir, 'INDEX.md'), '# leaked\n')

    const result = runScanPostCheck({ cwd, specDir: spec })
    const leak = result.checks.find(c => c.name === 'source_root_leak')
    assert(!!leak, 'source_root knowledge leak detected')
    assert(leak.severity === 'failed', 'leak severity is failed')
  } finally { clean(cwd, spec) }
}

// ── 汇总 ──
console.log(`\n${'='.repeat(40)}`)
console.log(`scan-knowledge tests: ${passed} passed, ${failed} failed, ${passed + failed} total`)
if (failed > 0) process.exit(1)
