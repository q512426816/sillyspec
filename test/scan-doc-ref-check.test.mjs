/**
 * scan-doc-ref-check.test.mjs — scan_doc_ref_invalid 引用事实核验测试（archify 借鉴 P0/P1a，2026-09-04）
 *
 * 覆盖：有效引用不触发 / 文件不存在触发 / 行号超界触发 / repo:// 跨仓跳过 /
 * 本地模式（specDir=null）同规则 / 诊断信封 evidence+supportedFixes 字段 /
 * formatStructuredResult 归类 bad_references / P1b 扩展名（.py）进入核验。
 */

import { join, resolve, dirname, basename } from 'path'
import { mkdirSync, writeFileSync, rmSync } from 'fs'
import { fileURLToPath, pathToFileURL } from 'url'
import { tmpdir } from 'os'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const root = resolve(__dirname, '..')

const { runScanPostCheck, formatStructuredResult } = await import(pathToFileURL(join(root, 'src', 'scan-postcheck.js')).href)

let passed = 0, failed = 0

function assert(cond, msg) {
  if (cond) { console.log(`  ✅ PASS: ${msg}`); passed++ }
  else { console.log(`  ❌ FAIL: ${msg}`); failed++ }
}

function setup(name) {
  const cwd = join(tmpdir(), `refchk-${name}`)
  mkdirSync(cwd, { recursive: true })
  return cwd
}
function specSetup(name) {
  const d = join(tmpdir(), `refchk-${name}-spec`)
  mkdirSync(d, { recursive: true })
  return d
}
function clean(...dirs) { for (const d of dirs) try { rmSync(d, { recursive: true, force: true }) } catch {} }

const DOCS = ['ARCHITECTURE.md','CONVENTIONS.md','STRUCTURE.md','INTEGRATIONS.md','TESTING.md','CONCERNS.md','PROJECT.md']
const HEADER = 'author: bot\ncreated_at: 2026-09-04 10:00:00\n'

// 写源码文件（foo.js 第 3 行含真实符号 dispatchCore、第 1 行含窗口边界标记，共 10 行 + 尾换行）
// + 空文件 empty.js + 全部 7 份文档，knowledge INDEX
function writeFixture(cwd, specDir, archBody) {
  mkdirSync(join(cwd, 'src'), { recursive: true })
  writeFileSync(join(cwd, 'src', 'foo.js'), '// boundaryMarkKw 窗口下界标记\nconst b = 2\nexport function dispatchCore() { return 1 }\n' + 'const tail = 1\n'.repeat(7))
  writeFileSync(join(cwd, 'src', 'empty.js'), '')
  mkdirSync(join(cwd, 'backend', 'app'), { recursive: true })
  writeFileSync(join(cwd, 'backend', 'app', 'main.py'), 'import os\n'.repeat(5))
  const proj = basename(cwd)
  for (const d of DOCS) {
    const p = join(specDir, 'docs', proj, 'scan', d)
    mkdirSync(dirname(p), { recursive: true })
    writeFileSync(p, HEADER + (d === 'ARCHITECTURE.md' ? archBody : '# doc\n'))
  }
  mkdirSync(join(specDir, 'knowledge'), { recursive: true })
  writeFileSync(join(specDir, 'knowledge', 'INDEX.md'), '# Knowledge Index\n')
}

function getRefCheck(r) { return r.checks.find(c => c.name === 'scan_doc_ref_invalid') }

// ── 1: 有效引用 → 不触发 ──
console.log('\n=== Test 1: 全部引用有效 → 无 scan_doc_ref_invalid ===')
{
  const cwd = setup('t1'), spec = specSetup('t1')
  writeFixture(cwd, spec, `# 架构\n核心模块见 \`src/foo.js:1\`，跨仓见 \`repo://other/src/x.js:5\`。\n`)
  const r = runScanPostCheck({ cwd, specDir: spec })
  assert(getRefCheck(r) === undefined, '有效引用 + repo:// 跳过 → 不产生检查')
  assert(r.status === 'success', `状态 success（实际 ${r.status}）`)
  clean(cwd, spec)
}

// ── 2: 文件不存在 → 触发 warning + 信封字段 ──
console.log('\n=== Test 2: 引用不存在的文件 → scan_doc_ref_invalid（WARNING + evidence + supportedFixes） ===')
{
  const cwd = setup('t2'), spec = specSetup('t2')
  writeFixture(cwd, spec, `# 架构\n幽灵模块 \`src/ghost.js:1\`，真实模块 \`src/foo.js:2\`。\n`)
  const r = runScanPostCheck({ cwd, specDir: spec })
  const c = getRefCheck(r)
  assert(c !== undefined, '检查存在')
  assert(c.severity === 'warning', 'WARNING 级（非阻断）')
  assert(c.evidence && c.evidence.invalidCount === 1 && c.evidence.totalRefs === 2, `evidence 计数正确（${JSON.stringify(c?.evidence)}）`)
  assert(Array.isArray(c.supportedFixes) && c.supportedFixes.length >= 1, 'supportedFixes 枚举存在')
  assert(r.status === 'completed_with_warnings', `状态 completed_with_warnings（实际 ${r.status}）`)
  // 结构化输出归类 + additive 字段透传
  const s = formatStructuredResult(r)
  assert(s.failure_categories.bad_references.some(e => e.name === 'scan_doc_ref_invalid'), '归类 bad_references')
  const sc = s.checks.find(x => x.name === 'scan_doc_ref_invalid')
  assert(sc && sc.evidence && Array.isArray(sc.supportedFixes), '结构化 checks 透传 evidence/supportedFixes')
  clean(cwd, spec)
}

// ── 3: 行号超界 → 触发 ──
console.log('\n=== Test 3: 行号超界 → 触发 ===')
{
  const cwd = setup('t3'), spec = specSetup('t3')
  writeFixture(cwd, spec, `# 架构\n超界引用 \`src/foo.js:999\`。\n`)
  const r = runScanPostCheck({ cwd, specDir: spec })
  const c = getRefCheck(r)
  assert(c !== undefined && c.evidence.invalidCount === 1, '行号超界被捕获')
  assert(c.detail.includes('src/foo.js:999'), 'detail 含失效引用')
  clean(cwd, spec)
}

// ── 4: .py 引用（P1b 扩展名）进入核验 ──
console.log('\n=== Test 4: .py 引用有效/超界均被核验 ===')
{
  const cwd = setup('t4'), spec = specSetup('t4')
  writeFixture(cwd, spec, `# 架构\n后端入口 \`backend/app/main.py:3\`（有效），坏引用 \`backend/app/main.py:99\`（超界）。\n`)
  const r = runScanPostCheck({ cwd, specDir: spec })
  const c = getRefCheck(r)
  assert(c !== undefined && c.evidence.totalRefs === 2 && c.evidence.invalidCount === 1, `.py 引用计入核验（${JSON.stringify(c?.evidence)}）`)
  clean(cwd, spec)
}

// ── 5: 本地模式（specDir=null）同规则 ──
console.log('\n=== Test 5: 本地模式 → 同样触发 ===')
{
  const cwd = setup('t5')
  writeFixture(cwd, join(cwd, '.sillyspec'), `# 架构\n坏引用 \`src/ghost.js:1\`。\n`)
  const r = runScanPostCheck({ cwd, specDir: null })
  const c = getRefCheck(r)
  assert(c !== undefined && c.evidence.invalidCount === 1, '本地模式同样核验（防本地过平台挂）')
  clean(cwd)
}

// ── 6: 层2 关键词断言：引用行所述符号在窗口命中 → 通过 ──
console.log('\n=== Test 6: 层2 token 命中 → 不触发 ===')
{
  const cwd = setup('t6'), spec = specSetup('t6')
  writeFixture(cwd, spec, `# 架构\n调度核心 \`dispatchCore\` 定义于 \`src/foo.js:3\`。\n`)
  const r = runScanPostCheck({ cwd, specDir: spec })
  assert(getRefCheck(r) === undefined, 'token 在 [start-2, end+5] 窗口命中 → 通过')
  clean(cwd, spec)
}

// ── 7: 层2 关键词断言：符号不在窗口 → 触发 ──
console.log('\n=== Test 7: 层2 token 未命中 → 触发（关键词未命中） ===')
{
  const cwd = setup('t7'), spec = specSetup('t7')
  writeFixture(cwd, spec, `# 架构\n调度核心 \`ghostSymbol\` 定义于 \`src/foo.js:3\`。\n`)
  const r = runScanPostCheck({ cwd, specDir: spec })
  const c = getRefCheck(r)
  assert(c !== undefined && c.evidence.sample[0].reason.includes('关键词未命中'), `层2 捕获（${JSON.stringify(c?.evidence?.sample?.[0]?.reason)}）`)
  clean(cwd, spec)
}

// ── 8: 层2 窗口下界：token 恰在 1-based start-2 行 → 命中（闭区间 [start-2, end+5]） ──
console.log('\n=== Test 8: token 恰在 start-2 行 → 窗口命中 ===')
{
  const cwd = setup('t8'), spec = specSetup('t8')
  writeFixture(cwd, spec, `# 架构\n标记 \`boundaryMarkKw\` 在 \`src/foo.js:3\` 的窗口下界之外一行以内。\n`)
  const r = runScanPostCheck({ cwd, specDir: spec })
  assert(getRefCheck(r) === undefined, 'token 在 1-based 第 1 行（= start-2）→ 闭区间命中')
  clean(cwd, spec)
}

// ── 9: 空文件 :1 → 失效（不再因 [''] 假长度通过） ──
console.log('\n=== Test 9: 空文件引用 → 空文件（无可引用内容） ===')
{
  const cwd = setup('t9'), spec = specSetup('t9')
  writeFixture(cwd, spec, `# 架构\n坏引用 \`src/empty.js:1\`。\n`)
  const r = runScanPostCheck({ cwd, specDir: spec })
  const c = getRefCheck(r)
  assert(c !== undefined && c.evidence.sample[0].reason.includes('空文件'), `空文件被捕获（${JSON.stringify(c?.evidence?.sample?.[0]?.reason)}）`)
  clean(cwd, spec)
}

// ── 10: 尾换行幻影行 —— :10（末行）有效，:11（幻影）超界 ──
console.log('\n=== Test 10: 幻影 N+1 行 → 超界 ===')
{
  const cwd = setup('t10'), spec = specSetup('t10')
  writeFixture(cwd, spec, `# 架构\n末行 \`src/foo.js:10\` 有效，幻影 \`src/foo.js:11\` 超界。\n`)
  const r = runScanPostCheck({ cwd, specDir: spec })
  const c = getRefCheck(r)
  assert(c !== undefined && c.evidence.invalidCount === 1 && c.evidence.sample[0].reason.includes('行号超界'), '只有 :11 判超界（编辑器口径 10 行）')
  clean(cwd, spec)
}

console.log(`\n结果: ${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
