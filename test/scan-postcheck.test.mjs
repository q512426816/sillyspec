/**
 * scan-postcheck.test.mjs — CLI 层 post-check 测试
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
  const cwd = join(tmpdir(), `pc-${name}`)
  mkdirSync(cwd, { recursive: true })
  return cwd
}
function specSetup(name) {
  const d = join(tmpdir(), `pc-${name}-spec`)
  mkdirSync(d, { recursive: true })
  return d
}
function clean(...dirs) { for (const d of dirs) try { rmSync(d, { recursive: true, force: true }) } catch {} }

const DOCS = ['ARCHITECTURE.md','CONVENTIONS.md','STRUCTURE.md','INTEGRATIONS.md','TESTING.md','CONCERNS.md','PROJECT.md']

// 写入全部 7 份文档，项目名 = basename(cwd)
function writeFull(cwd, specDir) {
  const proj = basename(cwd)
  for (const d of DOCS) {
    const p = join(specDir, 'docs', proj, 'scan', d)
    mkdirSync(dirname(p), { recursive: true })
    writeFileSync(p, 'author: bot\ncreated_at: 2026-06-08 10:00:00\n# doc\n')
  }
  // knowledge 目录 + INDEX.md（scan 已产出知识）
  mkdirSync(join(specDir, 'knowledge'), { recursive: true })
  writeFileSync(join(specDir, 'knowledge', 'INDEX.md'), '# Knowledge Index\n')
}

// 写入前 N 份文档
function writeN(cwd, specDir, n) {
  const proj = basename(cwd)
  for (let i = 0; i < n; i++) {
    const p = join(specDir, 'docs', proj, 'scan', DOCS[i])
    mkdirSync(dirname(p), { recursive: true })
    writeFileSync(p, 'author: bot\ncreated_at: 2026-06-08 10:00:00\n# doc\n')
  }
}

// ── 1: source_root 有文档 → failed ──
console.log('\n=== Test 1: source_root 泄漏 → failed_post_check ===')
{
  const cwd = setup('t1'), spec = specSetup('t1')
  const proj = basename(cwd)
  mkdirSync(join(cwd, '.sillyspec/docs', proj, 'scan'), { recursive: true })
  writeFileSync(join(cwd, '.sillyspec/docs', proj, 'scan', 'ARCHITECTURE.md'), '# leak')
  const r = runScanPostCheck({ cwd, specDir: spec })
  assert(r.status === 'failed_post_check', `状态: ${r.status}`)
  assert(r.checks.some(c => c.name === 'source_root_docs_leak'), `source_root_docs_leak`)
  clean(cwd, spec)
}

// ── 2: spec 无文档 → failed ──
console.log('\n=== Test 2: spec 无文档 → failed_post_check ===')
{
  const cwd = setup('t2'), spec = specSetup('t2')
  const r = runScanPostCheck({ cwd, specDir: spec })
  assert(r.status === 'failed_post_check', `状态: ${r.status}`)
  assert(r.checks.some(c => c.name === 'all_docs_missing'), `all_docs_missing`)
  clean(cwd, spec)
}

// ── 3: 缺部分 required 文档 → failed ──
console.log('\n=== Test 3: 部分缺失 → failed_post_check ===')
{
  const cwd = setup('t3'), spec = specSetup('t3')
  writeN(cwd, spec, 6)
  const r = runScanPostCheck({ cwd, specDir: spec })
  assert(r.status === 'failed_post_check', `状态: ${r.status}`)
  assert(r.checks.some(c => c.name === 'partial_docs_missing'), `partial_docs_missing`)
  clean(cwd, spec)
}

// ── 4: local.yaml 命令不存在 → warnings ──
console.log('\n=== Test 4: local.yaml 命令不存在 → completed_with_warnings ===')
{
  const cwd = setup('t4'), spec = specSetup('t4')
  writeFull(cwd, spec)
  writeFileSync(join(spec, 'local.yaml'),
    'project:\n  type: nodejs\ncommands:\n  build: "npm run build"\n  test: "npm run test"\n  lint: "npm run lint"\n')
  writeFileSync(join(cwd, 'package.json'), '{"name":"t4","scripts":{"start":"node server.js"}}')
  const r = runScanPostCheck({ cwd, specDir: spec })
  assert(r.status === 'completed_with_warnings', `状态: ${r.status}`)
  assert(r.checks.some(c => c.name === 'local_config_invalid'), `local_config_invalid`)
  clean(cwd, spec)
}

// ── 5-8: AI 输出错误标记 → warnings ──
// 注意：tool_use_error 和 fallback 已移除（agent 描述性文本正常提及不应触发）
const errorCases = [
  { id: 'e6', name: 'API Error 529', output: 'API Error 529 server overloaded. API Error 529 retry failed' },
  { id: 'e7', name: 'rate_limit', output: 'rate limit exhausted, rate limit exhausted again' },
]
for (const ec of errorCases) {
  console.log(`\n=== Test: ${ec.name} → completed_with_warnings ===`)
  const cwd = setup(ec.id), spec = specSetup(ec.id)
  writeFull(cwd, spec)
  const r = runScanPostCheck({ cwd, specDir: spec, outputText: ec.output })
  assert(r.status === 'completed_with_warnings', `${ec.name}: 状态 ${r.status}`)
  clean(cwd, spec)
}

// ── tool_use_error / fallback 不再触发 warning（描述性文本正常提及） ──
const noWarnCases = [
  { id: 'e5', name: 'tool_use_error', output: 'tool_use_error: file not found' },
  { id: 'e8', name: 'fallback', output: '作为 fallback 方案，跳过了这个步骤' },
]
for (const ec of noWarnCases) {
  console.log(`\n=== Test: ${ec.name} → 不触发 warning ===`)
  const cwd = setup(ec.id), spec = specSetup(ec.id)
  writeFull(cwd, spec)
  const r = runScanPostCheck({ cwd, specDir: spec, outputText: ec.output })
  assert(!r.checks.some(c => c.name === 'tool_use_error' || c.name === 'fallback_or_skip'),
    `${ec.name}: 不应有 tool_use_error/fallback_or_skip warning`)
  clean(cwd, spec)
}

// ── 9: 文档缺 header → warnings ──
console.log('\n=== Test 9: 文档缺 header → completed_with_warnings ===')
{
  const cwd = setup('t9'), spec = specSetup('t9')
  const proj = basename(cwd)
  for (const d of DOCS) {
    const p = join(spec, 'docs', proj, 'scan', d)
    mkdirSync(dirname(p), { recursive: true })
    writeFileSync(p, '# no header\n')
  }
  const r = runScanPostCheck({ cwd, specDir: spec })
  assert(r.status === 'completed_with_warnings', `状态: ${r.status}`)
  assert(r.checks.some(c => c.name === 'docs_missing_header'), `docs_missing_header`)
  clean(cwd, spec)
}

// ── 10: 全部通过 → success ──
console.log('\n=== Test 10: 全部通过 → success ===')
{
  const cwd = setup('t10'), spec = specSetup('t10')
  writeFull(cwd, spec)
  const r = runScanPostCheck({ cwd, specDir: spec, outputText: 'done' })
  assert(r.status === 'success', `状态: ${r.status}`)
  assert(r.checks.length === 0, `checks.length=0`)
  clean(cwd, spec)
}

// ── 11: 非平台模式 ──
console.log('\n=== Test 11: 非平台模式 ===')
{
  const cwd = setup('t11')
  const proj = basename(cwd)
  for (let i = 0; i < 5; i++) {
    const p = join(cwd, '.sillyspec', 'docs', proj, 'scan', DOCS[i])
    mkdirSync(dirname(p), { recursive: true })
    writeFileSync(p, 'author: bot\ncreated_at: now\n# doc\n')
  }
  const r = runScanPostCheck({ cwd, specDir: null })
  assert(r.status === 'completed_with_warnings', `非平台: ${r.status}`)
  assert(!r.checks.some(c => c.name === 'source_root_docs_leak'), `无 source_root_leak`)
  clean(cwd)
}

// ── 12: 多问题 failed 优先 ──
console.log('\n=== Test 12: failed 优先 ===')
{
  const cwd = setup('t12'), spec = specSetup('t12')
  const proj = basename(cwd)
  mkdirSync(join(cwd, '.sillyspec/docs', proj, 'scan'), { recursive: true })
  writeFileSync(join(cwd, '.sillyspec/docs', proj, 'scan', 'ARCHITECTURE.md'), '# leak')
  writeN(cwd, spec, 3)
  const r = runScanPostCheck({ cwd, specDir: spec })
  assert(r.status === 'failed_post_check', `failed 优先: ${r.status}`)
  clean(cwd, spec)
}

console.log(`\n${'='.repeat(50)}`)
console.log(`✅ 通过: ${passed}  ❌ 失败: ${failed}`)
console.log(`${'='.repeat(50)}`)
if (failed > 0) throw new Error(`${failed} test(s) failed`)
