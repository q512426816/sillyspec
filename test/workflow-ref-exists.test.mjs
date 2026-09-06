/**
 * workflow-ref-exists.test.mjs — ref_exists 检查类型测试（archify 借鉴，2026-09-04）
 *
 * 声明式引用核验：scan-docs.yaml 的 output checks 里写 { type: ref_exists, min: N }，
 * 引擎对该文档跑 层1+层2 联合核验（与 scan_doc_ref_invalid 单一源）并要求引用条数达标。
 * 覆盖：有效通过 / 条数不足 / 引用失效 / 文件不存在 四态。
 */

import { join, resolve, dirname } from 'path'
import { mkdirSync, writeFileSync, rmSync } from 'fs'
import { fileURLToPath, pathToFileURL } from 'url'
import { tmpdir } from 'os'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const root = resolve(__dirname, '..')

const { runPostCheck } = await import(pathToFileURL(join(root, 'src', 'workflow.js')).href)

let passed = 0, failed = 0

function assert(cond, msg) {
  if (cond) { console.log(`  ✅ PASS: ${msg}`); passed++ }
  else { console.log(`  ❌ FAIL: ${msg}`); failed++ }
}

function setup(name, archBody) {
  const cwd = join(tmpdir(), `wfre-${name}`)
  mkdirSync(join(cwd, 'src'), { recursive: true })
  writeFileSync(join(cwd, 'src', 'foo.js'), 'const a = 1\nconst b = 2\nexport function dispatchCore() { return 1 }\n' + 'const tail = 1\n'.repeat(7))
  const docPath = join(cwd, '.sillyspec', 'docs', 'proj', 'scan', 'A.md')
  mkdirSync(dirname(docPath), { recursive: true })
  writeFileSync(docPath, archBody)
  return { cwd, docPath }
}

function clean(cwd) { try { rmSync(cwd, { recursive: true, force: true }) } catch {} }

const wf = (min) => ({
  name: 'refcheck',
  spec_version: 1,
  roles: [{
    id: 'r', name: 'r', task: '',
    outputs: [{
      path: '{SPEC_ROOT}/docs/<project>/scan/A.md',
      required: true,
      checks: [{ type: 'ref_exists', min }],
    }],
  }],
})

const firstDetail = (r) => {
  const failed = (r.roles?.[0]?.outputs?.[0]?.checks || []).find(c => c.status === 'fail')
  return failed ? failed.detail : ''
}

// ── 1: 有效引用且达标 → 通过 ──
console.log('\n=== Test 1: 有效引用 + 达标 → passed ===')
{
  const { cwd } = setup('t1', `# A\n调度核心 \`dispatchCore\` 见 \`src/foo.js:3\`。\n`)
  const r = runPostCheck(wf(1), cwd, 'proj')
  assert(r.status === 'pass', `status=pass（实际 ${r.status}）`)
  clean(cwd)
}

// ── 2: 引用条数不足 → 失败并给出 min 要求 ──
console.log('\n=== Test 2: 条数不足 → fail + 要求至少 N 条 ===')
{
  const { cwd } = setup('t2', `# A\n无引用的文档。\n`)
  const r = runPostCheck(wf(2), cwd, 'proj')
  assert(r.status === 'fail', 'status=fail')
  assert(firstDetail(r).includes('要求至少 2 条'), `detail 含 min 要求（${firstDetail(r).slice(0, 60)}）`)
  clean(cwd)
}

// ── 3: 引用失效（文件不存在）→ 失败 ──
console.log('\n=== Test 3: 引用失效 → fail + 未通过核验 ===')
{
  const { cwd } = setup('t3', `# A\n幽灵 \`src/ghost.js:1\`。\n`)
  const r = runPostCheck(wf(1), cwd, 'proj')
  assert(r.status === 'fail', 'status=fail')
  assert(firstDetail(r).includes('未通过核验'), `detail 含核验失败（${firstDetail(r).slice(0, 60)}）`)
  clean(cwd)
}

// ── 4: 层2 未命中 → 失败 ──
console.log('\n=== Test 4: 层2 token 未命中 → fail ===')
{
  const { cwd } = setup('t4', `# A\n调度核心 \`ghostSymbol\` 见 \`src/foo.js:3\`。\n`)
  const r = runPostCheck(wf(1), cwd, 'proj')
  assert(r.status === 'fail', 'status=fail')
  assert(firstDetail(r).includes('关键词未命中'), `detail 含关键词未命中（${firstDetail(r).slice(0, 60)}）`)
  clean(cwd)
}

// ── 5: 文件不存在 → 失败 ──
console.log('\n=== Test 5: 文档不存在 → fail ===')
{
  const cwd = join(tmpdir(), 'wfre-t5')
  mkdirSync(join(cwd, 'src'), { recursive: true })
  writeFileSync(join(cwd, 'src', 'foo.js'), 'const a = 1\n')
  const r = runPostCheck(wf(1), cwd, 'proj')
  assert(r.status === 'fail', 'status=fail')
  clean(cwd)
}

// ── 6: min:0 = 只核验有效性、不求数量 ──
console.log('\n=== Test 6: min:0 且 0 条引用 → pass（不被 || 1 改写） ===')
{
  const { cwd } = setup('t6', `# A\n无引用的文档。\n`)
  const r = runPostCheck(wf(0), cwd, 'proj')
  assert(r.status === 'pass', `min:0 且 0 引用 → pass（实际 ${r.status}）`)
  clean(cwd)
}

// ── 7: repo:// 跨仓引用不计入 min，但 detail 有提示 ──
console.log('\n=== Test 7: 纯 repo:// 文档 min:1 → fail + 跨仓提示 ===')
{
  const { cwd } = setup('t7', `# A\n跨仓见 \`repo://other/src/z.js:1\`。\n`)
  const r = runPostCheck(wf(1), cwd, 'proj')
  assert(r.status === 'fail', 'repo:// 未计入本地引用数 → fail')
  assert(firstDetail(r).includes('跨仓引用未计入'), `detail 含跨仓提示（${firstDetail(r).slice(0, 70)}）`)
  clean(cwd)
}

console.log(`\n结果: ${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
