/**
 * 诊断码 parity 测试（2026-09-17-mi-diagnostic-codes，OpenSpec agent-contract 无 parity 的反超点）
 *
 * 三段：
 *   1. 双向 parity：DIAGNOSTIC_CODES 注册码 ⊆ 契约 §8 目录 token ∧ 目录 token ⊆ 注册码
 *      ——单侧漂移任一方向都不许静默通过（文档加码码表没有、码表加码文档没写，都红）
 *   2. 发射抽查（hermetic tmp fixture）：信封级三码（db_missing/change_not_found/unknown_facet）
 *      + gate check.code 恒在场（含通过项，身份码非失败标志）+ 顶层 codes 聚合
 *      （push 序去重、非与 errors 逐条 1:1）
 *   3. 文档语义抽查：契约 §2.3 已改「参与综合 ok」（旧 informational 断言不得回潮，§9 记账节除外）
 *
 * 风格：自研 assert + mkdtempSync（同 test/machine-interface.test.mjs）。
 */
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'fs'
import { join, dirname } from 'path'
import { tmpdir } from 'os'
import { execFileSync } from 'child_process'
import { fileURLToPath } from 'url'

import { DIAGNOSTIC_CODES, checkCode } from '../src/diagnostic-codes.js'
import { runGate, runDerive, runStatusOverview } from '../src/machine-interface.js'
import { ProgressManager } from '../src/progress.js'

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

function git(cwd, args) {
  return execFileSync('git', args, { cwd, encoding: 'utf8' }).trim()
}

/** 契约 §8 目录节的码 token 集（锚定标题 + 首列反引号 token） */
function readCatalogTokens(contractPath) {
  const text = readFileSync(contractPath, 'utf8')
  const lines = text.split(/\r?\n/)
  const tokens = []
  let inCatalog = false
  for (const line of lines) {
    if (/^##\s+8\.\s*诊断码目录/.test(line)) { inCatalog = true; continue }
    if (inCatalog && /^##\s/.test(line)) break
    if (!inCatalog) continue
    const m = line.match(/^\|\s*`([a-z_]+)`\s*\|/)
    if (m) tokens.push(m[1])
  }
  return tokens
}

// ─────────────────────────────────────────
// 1. 双向 parity（码表 ↔ 契约目录）
// ─────────────────────────────────────────
console.log('--- 1. 双向 parity ---')
{
  const here = dirname(fileURLToPath(import.meta.url))
  const contractPath = join(here, '..', 'docs', 'sillyspec', 'interface-contract.md')
  const registryKeys = Object.keys(DIAGNOSTIC_CODES)
  const tokens = readCatalogTokens(contractPath)

  assert(tokens.length > 0, `1a 契约 §8 目录节可解析（token 数 ${tokens.length} > 0——解析脆断=目录锚定标题/行格式漂移，先修格式）`)
  const tokenSet = new Set(tokens)
  const regSet = new Set(registryKeys)
  const docMissing = registryKeys.filter((k) => !tokenSet.has(k))
  const regMissing = tokens.filter((t) => !regSet.has(t))
  assert(docMissing.length === 0, `1b 注册码全在目录（缺失：${docMissing.join(', ') || '无'}）`)
  assert(regMissing.length === 0, `1c 目录码全在码表（表外码：${regMissing.join(', ') || '无'}）`)
  assert(new Set(tokens).size === tokens.length, '1d 目录无重复 token')
  assert(registryKeys.length === 10, `1e 码表恰 10 码（实际 ${registryKeys.length}——扩码须走变更流程并同步目录`)
}

// ─────────────────────────────────────────
// 2. 发射抽查
// ─────────────────────────────────────────
console.log('--- 2. 发射抽查 ---')

// 2a. db_missing ×3（空 spec 目录，无 db——只读契约不建库）
{
  const proj = makeTmpDir('dcp-empty-')
  const specBase = join(proj, '.sillyspec')
  mkdirSync(specBase, { recursive: true })

  const g = await runGate('brainstorm', 'x', { cwd: proj, specBase })
  assert(g.envelope.codes && g.envelope.codes.length === 1 && g.envelope.codes[0] === 'db_missing', '2a-1 gate 无 db → codes=["db_missing"]')
  assert(g.exitCode === 2, '2a-2 gate 无 db → exit 2')

  const d = await runDerive('artifacts', 'x', { cwd: proj, specBase })
  assert(d.envelope.codes && d.envelope.codes[0] === 'db_missing', '2a-3 derive 无 db → codes=["db_missing"]')

  const p = runStatusOverview({ cwd: proj, specBase })
  assert(p.envelope.codes && p.envelope.codes[0] === 'db_missing', '2a-4 progress show 无 db → codes=["db_missing"]')
}

// fixture：真 db + 变更行（同 machine-interface.test.mjs makeProjectFixture 手法，精简版）
async function makeFixture(changeName = 'c1') {
  const proj = makeTmpDir('dcp-fx-')
  const specBase = join(proj, '.sillyspec')
  mkdirSync(specBase, { recursive: true })
  writeFileSync(join(proj, '.gitignore'), '.sillyspec/\n')
  writeFileSync(join(proj, 'main.js'), 'console.log(1)\n')
  git(proj, ['init', '-q'])
  git(proj, ['add', '.'])
  git(proj, ['commit', '-q', '-m', 'init'])
  const baseHash = git(proj, ['rev-parse', 'HEAD'])
  const wtMetaDir = join(specBase, '.runtime', 'worktrees', changeName)
  mkdirSync(wtMetaDir, { recursive: true })
  writeFileSync(join(wtMetaDir, 'meta.json'), JSON.stringify({ changeName, baseHash, mode: 'in-place-fallback', worktreePath: proj }))
  const pm = new ProgressManager({ specDir: specBase })
  await pm.init('p1')
  await pm.initChange('p1', changeName)
  return { cwd: proj, specBase, changeName }
}

// 2b. change_not_found（有 db 无该变更行）
{
  const f = await makeFixture()
  const g = await runGate('execute', 'no-such-change', { cwd: f.cwd, specBase: f.specBase })
  assert(g.envelope.codes && g.envelope.codes.length === 1 && g.envelope.codes[0] === 'change_not_found', '2b-1 gate 变更不存在 → codes=["change_not_found"]')
  assert(g.exitCode === 2, '2b-2 exit 2')
}

// 2c. unknown_facet（入口白名单先于 db 守卫）
{
  const f = await makeFixture()
  const d = await runDerive('nope', f.changeName, { cwd: f.cwd, specBase: f.specBase })
  assert(d.envelope.codes && d.envelope.codes[0] === 'unknown_facet', '2c-1 非法 facet → codes=["unknown_facet"]')
  assert(d.exitCode === 2, '2c-2 exit 2')
}

// 2d. check.code 恒在场 + codes 聚合（push 序去重、非 1:1）
{
  const f = await makeFixture()
  // 双失败场景：写 plan.md（task-01 checkbox）但不写 review.json、不产代码变更 →
  //   execute-evidence 失败（unchanged，check push 先）+ task-reviews 失败（缺 review.json，push 后）
  //   transition（brainstorm→execute 合法）通过 → 不产 transition_blocked
  //   （裸夹具下 artifacts 通过——其失败前提由 2e-2 derive artifacts 覆盖）
  writeFileSync(join(f.specBase, 'changes', f.changeName, 'plan.md'),
    '# Plan\n\n## Wave 1\n\n- [x] task-01: 实现\n')
  const g = await runGate('execute', f.changeName, { cwd: f.cwd, specBase: f.specBase })
  const checks = g.envelope.checks || []
  assert(checks.length >= 3, `2d-1 gate execute checks ≥3（实际 ${checks.length}）`)
  assert(checks.every((c) => typeof c.code === 'string' && c.code.length > 0), '2d-2 check.code 恒在场（含通过项——身份码非失败标志）')
  const failing = checks.filter((c) => !c.ok)
  const expected = [...new Set(failing.map((c) => c.code))]
  assert(JSON.stringify(g.envelope.codes) === JSON.stringify(expected), `2d-3 顶层 codes=失败 check 的 code 按出现序去重（${JSON.stringify(g.envelope.codes)}）`)
  assert(expected[0] === 'artifacts_invalid' && expected[1] === 'execute_evidence_unchanged' && expected[2] === 'task_reviews_invalid',
    `2d-4 push 序：artifacts → execute-evidence → task-reviews（check 声明序，非字母序；实际 ${JSON.stringify(expected)}）`)
  assert(!g.envelope.codes.includes('transition_blocked'), '2d-5 通过的 transition 不产码')
  assert(g.envelope.codes.length <= (g.envelope.errors || []).length, '2d-6 聚合非膨胀（多条 errors 共享 check 级码——非 1:1）')
  assert(g.exitCode === 1, '2d-7 有失败 check → exit 1')
}

// 2e. derive facet 失败面单码
{
  const f = await makeFixture()
  const d = await runDerive('execute-evidence', f.changeName, { cwd: f.cwd, specBase: f.specBase })
  assert(d.envelope.ok === false && d.envelope.codes && d.envelope.codes.length === 1 && d.envelope.codes[0] === 'execute_evidence_unchanged', '2e-1 derive execute-evidence unchanged → codes=["execute_evidence_unchanged"]')
  const d2 = await runDerive('artifacts', f.changeName, { cwd: f.cwd, specBase: f.specBase })
  if (d2.envelope.ok === false) {
    assert(d2.envelope.codes && d2.envelope.codes[0] === 'artifacts_invalid', '2e-2 derive artifacts 失败 → codes=["artifacts_invalid"]')
  }
}

// ─────────────────────────────────────────
// 3. 文档语义抽查（§2.3 现行语义钉死，防 informational 旧断言回潮）
// ─────────────────────────────────────────
console.log('--- 3. 文档语义抽查 ---')
{
  const here = dirname(fileURLToPath(import.meta.url))
  const text = readFileSync(join(here, '..', 'docs', 'sillyspec', 'interface-contract.md'), 'utf8')
  const sec23 = text.split(/^#{2,3}\s+2\.3\s/m)[1]?.split(/^#{2,3}\s/m)[0] || ''
  assert(sec23.includes('参与') && !sec23.includes('不参与综合'), '3a §2.3 现行语义=transition 参与综合 ok（无「不参与综合」旧断言）')
  assert(/^##\s+9\.\s*v1 存续期语义变更记录/m.test(text), '3b §9 语义变更记录节在场（冻结版内不静默改语义）')
}

for (const dir of tmpRoots) {
  try { rmSync(dir, { recursive: true, force: true }) } catch { /* Windows 句柄延迟，残留交给 tmpdir 清理 */ }
}

console.log(`\n${failed === 0 ? '✅ ALL PASS' : '❌ FAILED'}: ${total - failed}/${total}`)
process.exit(failed === 0 ? 0 : 1)
