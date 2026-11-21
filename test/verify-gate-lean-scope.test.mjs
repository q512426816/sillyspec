/**
 * verify-gate-lean-scope（2026-11-21-verify-gate-scope-speed）：实测门分层门化。
 * 锁死契约：
 * 1. 归因出参 opt-in（FR-06）：discoverModuleDependentTests 缺省返回 string[]（逐字现状）；
 *    withAttribution: true 返回 { files, attribution, hitCountBySrc } 且 files 与缺省逐字一致。
 * 2. 分层切线（FR-01/02）：gate_scope 缺省 lean——阻断面=自身测试∪非枢纽命中；枢纽命中
 *    （hitCountBySrc>DEPS_SYMBOL_NARROW_HUB_MIN）进间接面（不执行+披露+ledger）；
 *    gate_scope: legacy 恢复三源全阻断面（逐字对齐旧行为）。
 * 3. ledger 留痕（FR-03）：lean 态 runModuleSubset 结果带 indirectFace；护栏降级带
 *    degradedTimeout。
 * 4. 护栏两态（FR-04）：applyTimeoutGuard——degrade（缺省）降级留痕不阻断；block 恢复超时=失败硬拦。
 * 5. 配置键三态（FR-05）：无键=缺省 / 显式 / 坏值 fail-soft 回缺省。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { execFileSync } from 'node:child_process'
import {
  discoverModuleDependentTests,
  readGateScopeConfig,
  readTimeoutPolicyConfig,
  applyTimeoutGuard,
  splitDepsByHub,
  readTestRerunLedger,
  runModuleSubset,
} from '../src/verify-postcheck.js'
import { DEPS_SYMBOL_NARROW_HUB_MIN } from '../src/deps-symbol-narrow.js'

const tmpRoots = []
function mk(p) { const d = mkdtempSync(join(tmpdir(), p)); tmpRoots.push(d); return d }
test.after(() => { for (const d of tmpRoots) { try { rmSync(d, { recursive: true, force: true }) } catch {} } })
const wf = (fx, p2, c) => { mkdirSync(join(fx, p2, '..'), { recursive: true }); writeFileSync(join(fx, p2), c) }
function gitInit(fx) {
  execFileSync('git', ['init', '-q'], { cwd: fx })
  execFileSync('git', ['config', 'user.email', 't@t'], { cwd: fx })
  execFileSync('git', ['config', 'user.name', 't'], { cwd: fx })
  execFileSync('git', ['add', '.'], { cwd: fx, stdio: 'ignore' })
  execFileSync('git', ['commit', '-qm', 'init'], { cwd: fx })
}

test('T1 归因出参 opt-in：缺省数组逐字现状；带参返回三件套且 files 一致（FR-06）', () => {
  const fx = mk('lean-attr-')
  for (const d of ['src', 'test', '.sillyspec']) mkdirSync(join(fx, d), { recursive: true })
  wf(fx, 'src/lib.js', 'export const a = 1\n')
  wf(fx, 'test/lib.test.mjs', "import { a } from '../src/lib.js'\nimport { test } from 'node:test'\ntest('l', () => {})\n")
  wf(fx, '.sillyspec/local.yaml', 'commands:\n  test: "node --test test/"\n')
  const args = { cwd: fx, changedFiles: ['src/lib.js'], coveredCommands: [] }
  const plain = discoverModuleDependentTests(args)
  assert.ok(Array.isArray(plain), '缺省返回数组（逐字现状——三个既有消费点零回归）')
  const withAttr = discoverModuleDependentTests({ ...args, withAttribution: true })
  assert.ok(!Array.isArray(withAttr) && Array.isArray(withAttr.files), '带参返回对象形态')
  assert.deepEqual(withAttr.files, plain, 'files 与缺省形态逐字一致')
  assert.ok((withAttr.attribution['test/lib.test.mjs'] || []).includes('src/lib.js'), 'attribution：测试文件→命中源列表')
  assert.equal(withAttr.hitCountBySrc['src/lib.js'], 1, 'hitCountBySrc：源→命中测试数')
})

test('T2 枢纽切线：hub 源（>8 命中）的测试进间接面，非枢纽+自身测试留阻断面（FR-01/02）', () => {
  const fx = mk('lean-hub-')
  for (const d of ['src', 'test', '.sillyspec']) mkdirSync(join(fx, d), { recursive: true })
  wf(fx, 'src/hub.js', 'export const h = 1\n')
  wf(fx, 'src/plain.js', 'export const p = 1\n')
  wf(fx, 'test/hub-own.test.mjs', "import { test } from 'node:test'\ntest('hub own', () => {})\n")
  for (let i = 0; i < DEPS_SYMBOL_NARROW_HUB_MIN + 1; i++) {
    wf(fx, `test/hub-${i}.test.mjs`, `import '../src/hub.js'\nimport { test } from 'node:test'\ntest('h${i}', () => {})\n`)
  }
  wf(fx, 'test/plain.test.mjs', "import '../src/plain.js'\nimport { test } from 'node:test'\ntest('p', () => {})\n")
  wf(fx, '.sillyspec/local.yaml', 'commands:\n  test: "node --test test/"\n')
  const changedFiles = ['src/hub.js', 'src/plain.js', 'test/hub-own.test.mjs']
  const r = discoverModuleDependentTests({ cwd: fx, changedFiles, coveredCommands: [], withAttribution: true })
  const s = splitDepsByHub({ deps: r.files, attribution: r.attribution, hitCountBySrc: r.hitCountBySrc })
  assert.ok(s.hubSrcs.includes('src/hub.js'), `hub 源识别（${s.hubSrcs.join(',')}）——命中 ${DEPS_SYMBOL_NARROW_HUB_MIN + 1} > ${DEPS_SYMBOL_NARROW_HUB_MIN}`)
  assert.ok(!s.hubSrcs.includes('src/plain.js'), '单命中源非枢纽')
  assert.ok(s.indirect.includes('test/hub-0.test.mjs'), '枢纽命中测试进间接面')
  assert.equal(s.indirect.length, DEPS_SYMBOL_NARROW_HUB_MIN + 1, `间接面=${DEPS_SYMBOL_NARROW_HUB_MIN + 1} 个枢纽命中测试`)
  assert.ok(s.blocking.includes('test/plain.test.mjs'), '非枢纽命中测试留阻断面')
  assert.ok(!s.blocking.some(f => /^test\/hub-\d+\.test\.mjs$/.test(f)), '枢纽命中测试全部移出阻断面')
  assert.ok(s.blocking.includes('test/hub-own.test.mjs'), '自身测试（hub-own）留阻断面——归因缺失/自身测试 fail-open 多跑侧不变量')
})

test('T3 端到端 lean/legacy：runModuleSubset lean 态 indirectFace 落 ledger+legacy 态全量（FR-01/02/03/05）', async () => {
  const fx = mk('lean-e2e-')
  for (const d of ['src', 'test', '.sillyspec']) mkdirSync(join(fx, d), { recursive: true })
  wf(fx, 'src/hub.js', 'export const h = 1\n')
  for (let i = 0; i < DEPS_SYMBOL_NARROW_HUB_MIN + 1; i++) {
    wf(fx, `test/hub-${i}.test.mjs`, `import '../src/hub.js'\nimport { test } from 'node:test'\ntest('h${i}', () => { assert.ok(true) })\n`)
  }
  wf(fx, '.sillyspec/local.yaml', 'commands:\n  test: "node --test test/"\n')
  gitInit(fx)
  const specBase = join(fx, '.sillyspec')
  const changedFiles = ['src/hub.js']
  // lean（缺省）：枢纽命中 9 个测试进间接面不执行——跑面只含自身测试（无）→ dynamic-empty
  // 语义上由 runVerifyTestCheck 决策；直测 runModuleSubset 断言执行面不含枢纽命中文件。
  const lean = runModuleSubset({ cwd: fx, specBase, changeName: null, hits: [], changedFiles, gateScope: 'lean' })
  const leanRan = lean.scopeFiles || []
  assert.ok(!leanRan.some(f => /^test\/hub-\d+\.test\.mjs$/.test(f)), `lean 跑面不含枢纽命中测试（${leanRan.join(',')}）`)
  assert.ok(Array.isArray(lean.indirectFace) && lean.indirectFace.length === DEPS_SYMBOL_NARROW_HUB_MIN + 1, `lean indirectFace=${lean.indirectFace && lean.indirectFace.length}（期望 ${DEPS_SYMBOL_NARROW_HUB_MIN + 1}）`)
  // legacy：三源全阻断面（枢纽命中照跑——逐字对齐旧行为）
  const legacy = runModuleSubset({ cwd: fx, specBase, changeName: null, hits: [], changedFiles, gateScope: 'legacy' })
  const legacyRan = legacy.scopeFiles || []
  assert.equal(legacyRan.filter(f => /^test\/hub-\d+\.test\.mjs$/.test(f)).length, DEPS_SYMBOL_NARROW_HUB_MIN + 1, 'legacy 跑面含全部枢纽命中测试（旧行为）')
  assert.equal(legacy.indirectFace, undefined, 'legacy 无 indirectFace 字段（逐字现状返回形态）')
})

test('T4 护栏两态：degrade 降级留痕不阻断；block 硬拦（FR-04）', () => {
  const timeoutFail = { status: 'failed', modules: [{ status: 'failed', reason: '模块 deps(auto-js) 测试超时（>600s）' }], reason: '模块子集测试失败：deps(auto-js) 测试超时（>600s）' }
  const g1 = applyTimeoutGuard({ testResult: timeoutFail, policy: 'degrade' })
  assert.equal(g1.degraded, true, 'degrade：纯超时命中降级')
  assert.equal(g1.result.status, 'failed', 'degrade 不改 status（上游消费链零变化——quick-audit 纯超时降档照常生效）')
  const g2 = applyTimeoutGuard({ testResult: timeoutFail, policy: 'block' })
  assert.equal(g2.degraded, false, 'block：不降级（超时=失败硬拦）')
  const realFail = { status: 'failed', modules: [{ status: 'failed', reason: '模块 x 测试退出码 1' }], reason: '真实失败' }
  assert.equal(applyTimeoutGuard({ testResult: realFail, policy: 'degrade' }).degraded, false, '真实挂测非纯超时不降级（维持硬拦）')
  const pass = { status: 'passed', modules: [], reason: null }
  assert.equal(applyTimeoutGuard({ testResult: pass, policy: 'degrade' }).degraded, false, '通过结果不降级')
})

test('T5 配置键三态：无键缺省 / 显式 / 坏值 fail-soft（FR-05）', () => {
  const fx = mk('lean-cfg-')
  mkdirSync(join(fx, '.sillyspec'), { recursive: true })
  const specBase = join(fx, '.sillyspec')
  assert.equal(readGateScopeConfig(specBase), 'lean', '无键缺省 lean（收窄为缺省）')
  assert.equal(readTimeoutPolicyConfig(specBase), 'degrade', '无键缺省 degrade')
  wf(fx, '.sillyspec/local.yaml', 'gate_scope: legacy\ntimeout_policy: block\n')
  assert.equal(readGateScopeConfig(specBase), 'legacy', '显式 legacy 生效（逃生阀）')
  assert.equal(readTimeoutPolicyConfig(specBase), 'block', '显式 block 生效')
  wf(fx, '.sillyspec/local.yaml', 'gate_scope: bogus\ntimeout_policy: 42\n')
  assert.equal(readGateScopeConfig(specBase), 'lean', '坏值 fail-soft 回缺省 lean')
  assert.equal(readTimeoutPolicyConfig(specBase), 'degrade', '坏值 fail-soft 回缺省 degrade')
})

test('T6 护栏 ledger 留痕：degradedTimeout 字段落盘可查证（FR-03/04）', async () => {
  const { writeTestRerunLedger } = await import('../src/verify-postcheck.js')
  const fx = mk('lean-ledger-')
  const specBase = join(fx, '.sillyspec')
  writeTestRerunLedger({ specBase, changeName: 'lean-t6', head: null, inputFiles: [], failedFiles: [], mode: 'dynamic-subset', status: 'failed', degradedTimeout: true })
  const ledger = readTestRerunLedger({ specBase, changeName: 'lean-t6' })
  assert.ok(ledger, 'ledger 落盘')
  assert.equal(ledger.degradedTimeout, true, 'degradedTimeout 留痕可查证')
  assert.ok(existsSync(join(specBase, '.runtime')), '.runtime 目录就位')
  void readFileSync
})
