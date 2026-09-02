/**
 * quick --done test+lint 硬门禁测试（P0-2，2026-09-02 跨 agent 工单）
 *
 * 覆盖：
 *   1. env 逃生门 SILLYSPEC_QUICK_TEST_GATE=skip → skip
 *   2. changedFiles 空（brownfield 无 guard）→ skip
 *   3. 纯 doc/配置改动（未触及 src/test）→ skip（规则 8 语义）
 *   4. 触及 src + local.yaml 未配置 commands → pass（skipped 不阻断，兼容无测试项目）
 *   5. 触及 src + test/lint 均 exit 0 → pass（passed + durationMs）
 *   6. 触及 src + test exit 1 → fail（failed 含 test + outputTail 非空 + 阻断 reason）
 *   7. 触及 src + lint exit 1 → fail（failed 含 lint）
 *   8. printQuickTestLintGate 三态打印不抛错，fail 分支输出 BLOCKED 文案
 *
 * 风格：自研 assert（与 machine-interface.test.mjs 同），tmp fixture 不引入测试框架。
 */
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { execFileSync } from 'child_process'

import { runQuickTestLintGate, printQuickTestLintGate } from '../src/run/quick-audit.js'

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

/** 构造 tmp 仓 fixture：.sillyspec/local.yaml（可选 commands 段）+ git 仓 */
function makeGateFixture({ yaml } = {}) {
  const proj = makeTmpDir('qgate-')
  const specBase = join(proj, '.sillyspec')
  mkdirSync(specBase, { recursive: true })
  if (yaml !== undefined) writeFileSync(join(specBase, 'local.yaml'), yaml)
  for (const args of [
    ['init', '-q'],
    ['config', 'user.email', 't@t.local'],
    ['config', 'user.name', 't'],
  ]) {
    execFileSync('git', args, { cwd: proj, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  }
  return { proj, specBase }
}

const SRC_FILES = ['src/index.js']
const DOC_FILES = ['docs/a.md', 'README.md', 'package.json']

// ─── 1. env 逃生门 ───
console.log('--- 1. env 逃生门 ---')
{
  const prev = process.env.SILLYSPEC_QUICK_TEST_GATE
  process.env.SILLYSPEC_QUICK_TEST_GATE = 'skip'
  const gate = await runQuickTestLintGate({ cwd: process.cwd(), specBase: '.', changedFiles: SRC_FILES })
  assert(gate.action === 'skip', `env=skip → action=skip（实际 ${gate.action}）`)
  assert(gate.test === null && gate.lint === null, 'env=skip → 不执行任何命令')
  if (prev === undefined) delete process.env.SILLYSPEC_QUICK_TEST_GATE; else process.env.SILLYSPEC_QUICK_TEST_GATE = prev
}

// ─── 2. brownfield 无变更清单 ───
console.log('--- 2. brownfield 无变更清单 ---')
{
  const { proj, specBase } = makeGateFixture()
  const gate = await runQuickTestLintGate({ cwd: proj, specBase, changedFiles: [] })
  assert(gate.action === 'skip', `空清单 → skip（实际 ${gate.action}）`)
  assert(gate.reason.includes('无变更文件清单'), 'reason 说明 brownfield 语义')
}

// ─── 3. 纯 doc/配置改动 ───
console.log('--- 3. 纯 doc/配置改动 ---')
{
  const { proj, specBase } = makeGateFixture()
  const gate = await runQuickTestLintGate({ cwd: proj, specBase, changedFiles: DOC_FILES })
  assert(gate.action === 'skip', `doc-only → skip（实际 ${gate.action}）`)
  assert(gate.reason.includes('src/test'), 'reason 点出规则 8 语义（未触及 src/test）')
}

// ─── 4. 触及 src + 未配置 commands ───
console.log('--- 4. 触及 src + 未配置 commands（降级不阻断）---')
{
  const { proj, specBase } = makeGateFixture({ yaml: '# 空 local.yaml\n' })
  const gate = await runQuickTestLintGate({ cwd: proj, specBase, changedFiles: SRC_FILES })
  assert(gate.action === 'pass', `未配置命令 → pass（实际 ${gate.action}；test=${gate.test?.status} lint=${gate.lint?.status}）`)
  assert(gate.test.status === 'skipped' && gate.lint.status === 'skipped', 'test/lint 均 skipped（不执行不阻断）')
}

// ─── 5. 触及 src + test/lint 全过 ───
console.log('--- 5. 触及 src + test/lint 全过 ---')
{
  const { proj, specBase } = makeGateFixture({
    yaml: 'commands:\n  test: \'node -e "process.exit(0)"\'\n  lint: \'node -e "process.exit(0)"\'\n',
  })
  const gate = await runQuickTestLintGate({ cwd: proj, specBase, changedFiles: SRC_FILES })
  assert(gate.action === 'pass', `全过 → pass（实际 ${gate.action}）`)
  assert(gate.test.status === 'passed' && gate.lint.status === 'passed', 'test/lint 均 passed')
  assert(typeof gate.test.durationMs === 'number', 'test 记录 durationMs')
}

// ─── 6. 触及 src + test 失败 ───
console.log('--- 6. 触及 src + test 失败（阻断语义）---')
{
  const { proj, specBase } = makeGateFixture({
    yaml: 'commands:\n  test: \'node -e "process.exit(1)"\'\n  lint: \'node -e "process.exit(0)"\'\n',
  })
  const gate = await runQuickTestLintGate({ cwd: proj, specBase, changedFiles: SRC_FILES })
  assert(gate.action === 'fail', `test 失败 → fail（实际 ${gate.action}）`)
  assert(gate.failed.includes('test') && !gate.failed.includes('lint'), `failed 精确含 test（实际 ${JSON.stringify(gate.failed)}）`)
  assert(gate.test.status === 'failed' && typeof gate.test.outputTail === 'string', 'test result failed + outputTail 供定位')
}

// ─── 7. 触及 src + lint 失败 ───
console.log('--- 7. 触及 src + lint 失败 ---')
{
  const { proj, specBase } = makeGateFixture({
    yaml: 'commands:\n  test: \'node -e "process.exit(0)"\'\n  lint: \'node -e "process.exit(2)"\'\n',
  })
  const gate = await runQuickTestLintGate({ cwd: proj, specBase, changedFiles: ['src/a.js', 'test/b.test.js'] })
  assert(gate.action === 'fail', `lint 失败 → fail（实际 ${gate.action}）`)
  assert(gate.failed.includes('lint') && !gate.failed.includes('test'), `failed 精确含 lint（实际 ${JSON.stringify(gate.failed)}）`)
  assert(gate.reason.includes('lint'), 'reason 指明失败项')
}

// ─── 8. printQuickTestLintGate 三态打印 ───
console.log('--- 8. printQuickTestLintGate 三态打印 ---')
{
  const logs = []
  const errs = []
  const origLog = console.log, origErr = console.error
  console.log = (...a) => logs.push(a.join(' '))
  console.error = (...a) => errs.push(a.join(' '))

  printQuickTestLintGate({ action: 'skip', reason: 'x', failed: [], test: null, lint: null })
  printQuickTestLintGate({
    action: 'pass', reason: 'r', failed: [],
    test: { status: 'passed', command: 'npm test', durationMs: 1200 },
    lint: { status: 'skipped', command: null, reason: '未配置' },
  })
  printQuickTestLintGate({
    action: 'fail', reason: '实测失败：test', failed: ['test'],
    test: { status: 'failed', command: 'npm test', durationMs: 800, outputTail: 'AssertionError: boom' },
    lint: { status: 'skipped', command: null },
  })

  // 先恢复原 console 再断言（否则 assert 的 PASS 输出也被劫持进收集数组，不可读）
  console.log = origLog
  console.error = origErr

  assert(logs.some(l => l.includes('SKIP')), 'skip 态打印 SKIP')
  assert(logs.some(l => l.includes('PASS')), 'pass 态打印 PASS')
  assert(errs.some(e => e.includes('BLOCKED')), 'fail 态 stderr 打 BLOCKED')
  assert(errs.some(e => e.includes('AssertionError: boom')), 'fail 态输出尾部含失败详情')
}

// ─── 清理 & 汇总 ───
for (const dir of tmpRoots) {
  try { rmSync(dir, { recursive: true, force: true }) } catch {}
}
console.log('\n==================================================')
console.log(`✅ 通过: ${total - failed}  ❌ 失败: ${failed}`)
console.log('==================================================')
if (failed > 0) process.exit(1)
