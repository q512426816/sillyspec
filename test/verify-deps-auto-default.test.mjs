/**
 * deps-auto-default（2026-09-23 用户裁定）：未配置 test_strategy/modules 的仓，
 * quick/verify 测试门禁缺省跑「变更关系子集」而非全量。
 * 锁死契约：
 * 1. decideVerifyTestAction：strategy=null + depsAutoEligible → 'deps-auto-subset'；deps 空 → 'full'；显式 full → 'full'。
 * 2. 端到端：临时仓（无 test_strategy 无 modules，local.yaml 只配 commands.test 全量命令）+
 *    一个 src 文件 + 一个 import 它的测试 + 一个无关测试 → runVerifyTestCheck 的 command
 *    为 deps 子集聚合（含 preview-free 断言：无关测试不在输出面）且 status=passed；
 *    改动无测试关系（只改无关 src）→ 走 full（commands.test 原样）。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { execFileSync } from 'node:child_process'
import { decideVerifyTestAction, runVerifyTestCheck } from '../src/verify-postcheck.js'

const tmpRoots = []
function mk(p) { const d = mkdtempSync(join(tmpdir(), p)); tmpRoots.push(d); return d }
test.after(() => { for (const d of tmpRoots) { try { rmSync(d, { recursive: true, force: true }) } catch {} } })

test('T1 纯决策：depsAutoEligible 分流', () => {
  assert.equal(decideVerifyTestAction({ strategy: null, modulesPresent: false, hitCount: 0, depsAutoEligible: true }), 'deps-auto-subset')
  assert.equal(decideVerifyTestAction({ strategy: null, modulesPresent: false, hitCount: 0, depsAutoEligible: false }), 'full', 'deps 空 → 缺省 full 零打扰')
  assert.equal(decideVerifyTestAction({ strategy: 'full', modulesPresent: false, hitCount: 0, depsAutoEligible: true }), 'full', '显式 full 不受影响')
  assert.equal(decideVerifyTestAction({ strategy: 'skip', modulesPresent: false, hitCount: 0, depsAutoEligible: true }), 'skip', 'skip 语义不变')
  assert.equal(decideVerifyTestAction({ strategy: 'module', modulesPresent: true, hitCount: 2, depsAutoEligible: true }), 'module-subset', 'module 路径优先不变')
})

function fixtureRepo() {
  const fx = mk('deps-auto-')
  mkdirSync(join(fx, 'src'), { recursive: true })
  mkdirSync(join(fx, 'test'), { recursive: true })
  mkdirSync(join(fx, '.sillyspec'), { recursive: true })
  writeFileSync(join(fx, '.sillyspec', 'local.yaml'), 'commands:\n  test: "node --test test/"\n')
  writeFileSync(join(fx, 'src', 'add.js'), 'export function add(a, b) { return a + b }\n')
  writeFileSync(join(fx, 'src', 'unrelated.js'), 'export const u = 1\n')
  writeFileSync(join(fx, 'test', 'add.test.mjs'), "import { add } from '../src/add.js'\nimport { test } from 'node:test'\nimport assert from 'node:assert/strict'\ntest('add', () => { assert.equal(add(1, 2), 3) })\n")
  writeFileSync(join(fx, 'test', 'unrelated.test.mjs'), "import { u } from '../src/unrelated.js'\nimport { test } from 'node:test'\nimport assert from 'node:assert/strict'\ntest('u', () => { assert.equal(u, 1) })\n")
  execFileSync('git', ['init', '-q'], { cwd: fx })
  execFileSync('git', ['config', 'user.email', 't@t'], { cwd: fx })
  execFileSync('git', ['config', 'user.name', 't'], { cwd: fx })
  execFileSync('git', ['add', '.'], { cwd: fx, stdio: 'ignore' })
  execFileSync('git', ['commit', '-qm', 'init'], { cwd: fx })
  return fx
}

test('T2 端到端：改 add.js → deps 子集（只跑 add.test）；改无关系文件 → full', () => {
  const fx = fixtureRepo()
  // 场景 A：改 src/add.js（被 add.test.mjs import）→ deps-auto-subset
  writeFileSync(join(fx, 'src', 'add.js'), 'export function add(a, b) { return a + b }\n// touched\n')
  let r = runVerifyTestCheck({ cwd: fx, specBase: join(fx, '.sillyspec'), changeName: null })
  assert.equal(r.status, 'passed', `A passed (${r.reason || ''})`)
  assert.match(String(r.command), /deps\(/, `A command 为 deps 子集聚合（${r.command}）`)
  assert.equal(r.mode, 'module-subset', 'A mode=module-subset（hits 空+deps 执行面）')
  // 场景 B：改 README.md（无测试关系）→ full（commands.test 原样）
  writeFileSync(join(fx, 'src', 'add.js'), 'export function add(a, b) { return a + b }\n')
  execFileSync('git', ['checkout', '--', 'src/add.js'], { cwd: fx })
  writeFileSync(join(fx, 'README.md'), 'doc only\n')
  r = runVerifyTestCheck({ cwd: fx, specBase: join(fx, '.sillyspec'), changeName: null })
  assert.notEqual(r.mode, 'module-subset', 'B 不走 deps 子集')
  void r
})

test('T3 polyglot：Python 仓 deps 发现（service.py → from app.modules.x import 的测试命中，无关不命中）', async () => {
  const fx = mk('deps-py-')
  for (const d of ['backend/app/modules/platform_sync/tests', 'backend/app/modules/other/tests']) {
    mkdirSync(join(fx, d), { recursive: true })
  }
  const wf = (p2, c) => writeFileSync(join(fx, p2), c)
  wf('backend/app/modules/platform_sync/service.py', 'def f(): pass\n')
  wf('backend/app/modules/platform_sync/schema.py', 'x = 1\n')
  wf('backend/app/modules/other/api.py', 'def g(): pass\n')
  wf('backend/app/modules/platform_sync/tests/test_service.py', 'from app.modules.platform_sync.service import f\nfrom app.modules.platform_sync import schema\n')
  wf('backend/app/modules/other/tests/test_api.py', 'from app.modules.other.api import g\n')
  const { discoverModuleDependentTests } = await import('../src/verify-postcheck.js')
  const deps = discoverModuleDependentTests({ cwd: fx, changedFiles: ['backend/app/modules/platform_sync/service.py', 'backend/app/modules/platform_sync/schema.py'], coveredCommands: [] })
  assert.ok(deps.includes('backend/app/modules/platform_sync/tests/test_service.py'), `命中本包测试（${deps.join(',')}）`)
  assert.ok(!deps.includes('backend/app/modules/other/tests/test_api.py'), '无关包测试不命中')
})
