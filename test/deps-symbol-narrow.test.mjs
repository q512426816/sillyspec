/**
 * 枢纽模块回归面按触达导出符号收敛（2026-11-11-deps-hub-symbol-narrow FR-01~05）：
 *
 * 现行 import 依赖回归面按模块路径子串匹配——枢纽模块（依赖方众多）任一改动拖全量
 * 依赖测试。本变更加符号收敛：diff 提取「触达导出符号集」，模块路径命中且命名导入
 * 均不含触达符号的依赖测试出面；不确定形态（default/star/动态 import/无 import 语句）
 * fail-open 保留（多跑侧）；无符号信息与现状逐字一致（既有面零回归）。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { execFileSync } from 'child_process'
import {
  extractTouchedExports,
  namedImportEvidence,
  collectTouchedExportSymbols,
  DEPS_SYMBOL_NARROW_HUB_MIN,
} from '../src/deps-symbol-narrow.js'
import { discoverModuleDependentTests } from '../src/verify-postcheck.js'

const tmpRoots = []
function mk(prefix) { const d = mkdtempSync(join(tmpdir(), prefix)); tmpRoots.push(d); return d }
test.after(() => { for (const d of tmpRoots) { try { rmSync(d, { recursive: true, force: true }) } catch {} } })

const HUB = 'export function alpha (n) { return n + 1 }\n\nexport function beta (n) { return n * 2 }\n'
/** 枢纽 fixture：hub.js 导出 alpha/beta，N 个测试只 import alpha（> 阈值触发枢纽面），附若干特殊引用形态测试。 */
function mkHubFixture(root, { specialTests = {} } = {}) {
  mkdirSync(join(root, 'src'), { recursive: true })
  mkdirSync(join(root, 'test'), { recursive: true })
  writeFileSync(join(root, 'src', 'hub.js'), HUB)
  const paths = []
  for (let i = 0; i < DEPS_SYMBOL_NARROW_HUB_MIN + 2; i++) {
    const p = `test/dep-${i}.test.mjs`
    writeFileSync(join(root, p), `import { alpha } from '../src/hub.js'\ntest('a${i}', () => {})\n`)
    paths.push(p)
  }
  for (const [name, body] of Object.entries(specialTests)) {
    const p = `test/${name}.test.mjs`
    writeFileSync(join(root, p), body)
    paths.push(p)
  }
  return paths
}

// ── FR-01 枢纽收敛主路径 ─────────────────────────────────────────────

test('枢纽收敛：未触达符号（仅 import alpha，diff 只触达 beta）的依赖测试出面', () => {
  const root = mk('sym-1-')
  mkHubFixture(root, { specialTests: { keepBeta: "import { beta } from '../src/hub.js'\ntest('b', () => {})\n" } })
  const deps = discoverModuleDependentTests({
    cwd: root, changedFiles: ['src/hub.js'], coveredCommands: [], touchedExportSymbols: { 'src/hub.js': ['beta'] },
  })
  for (let i = 0; i < DEPS_SYMBOL_NARROW_HUB_MIN + 2; i++) {
    assert.ok(!deps.includes(`test/dep-${i}.test.mjs`), `dep-${i} 仅引用 alpha（未触达）应出面（实得 ${deps}）`)
  }
  assert.ok(deps.includes('test/keepBeta.test.mjs'), '引用触达符号 beta 的测试保持入面')
})

// ── FR-02 触达符号引用保持 ───────────────────────────────────────────

test('触达符号：命名导入与 require 解构含触达符号 → 照常入面', () => {
  const root = mk('sym-2-')
  mkHubFixture(root, {
    specialTests: {
      namedBeta: "import { beta } from '../src/hub.js'\ntest('nb', () => {})\n",
      bothBeta: "import { alpha, beta } from '../src/hub.js'\ntest('bb', () => {})\n",
      requireBeta: "const { beta } = require('../src/hub.js')\ntest('rb', () => {})\n",
      aliasBeta: "import { beta as b2 } from '../src/hub.js'\ntest('ab', () => {})\n",
    },
  })
  const deps = discoverModuleDependentTests({
    cwd: root, changedFiles: ['src/hub.js'], coveredCommands: [], touchedExportSymbols: { 'src/hub.js': ['beta'] },
  })
  for (const p of ['test/namedBeta.test.mjs', 'test/bothBeta.test.mjs', 'test/requireBeta.test.mjs', 'test/aliasBeta.test.mjs']) {
    assert.ok(deps.includes(p), `${p} 命名导入含触达符号应入面（实得 ${deps}）`)
  }
})

// ── FR-03 fail-open 三态 ─────────────────────────────────────────────

test('fail-open：default/star/动态 import/无 import 语句 → 保留入面', () => {
  const root = mk('sym-3-')
  mkHubFixture(root, {
    specialTests: {
      defaultImport: "import hub from '../src/hub.js'\ntest('d', () => {})\n",
      starImport: "import * as hub from '../src/hub.js'\ntest('s', () => {})\n",
      dynImport: "const m = await import('../src/hub.js')\ntest('dy', () => {})\n",
      strMention: "test('sm', () => { const p = '../src/hub.js' })\n",
      sideEffect: "import '../src/hub.js'\ntest('se', () => {})\n",
    },
  })
  const deps = discoverModuleDependentTests({
    cwd: root, changedFiles: ['src/hub.js'], coveredCommands: [], touchedExportSymbols: { 'src/hub.js': ['beta'] },
  })
  for (const p of ['test/defaultImport.test.mjs', 'test/starImport.test.mjs', 'test/dynImport.test.mjs', 'test/strMention.test.mjs', 'test/sideEffect.test.mjs']) {
    assert.ok(deps.includes(p), `${p} 引用形态不可判定应 fail-open 入面（实得 ${deps}）`)
  }
})

// ── FR-04 参数缺省与现状逐字一致 ─────────────────────────────────────

test('无符号参数 → 行为与现状一致（模块路径命中全入面）', () => {
  const root = mk('sym-4-')
  const paths = mkHubFixture(root)
  const without = discoverModuleDependentTests({ cwd: root, changedFiles: ['src/hub.js'], coveredCommands: [] })
  const emptySyms = discoverModuleDependentTests({ cwd: root, changedFiles: ['src/hub.js'], coveredCommands: [], touchedExportSymbols: {} })
  for (const deps of [without, emptySyms]) {
    for (const p of paths) assert.ok(deps.includes(p), `${p} 无符号参数应照旧入面（实得 ${deps}）`)
  }
  assert.deepEqual(without, emptySyms)
})

test('非枢纽（命中数 ≤ 阈值）→ 不收敛，模块路径命中全入面', () => {
  const root = mk('sym-4b-')
  mkdirSync(join(root, 'src'), { recursive: true })
  mkdirSync(join(root, 'test'), { recursive: true })
  writeFileSync(join(root, 'src', 'small.js'), HUB)
  writeFileSync(join(root, 'test', 's1.test.mjs'), "import { alpha } from '../src/small.js'\n")
  writeFileSync(join(root, 'test', 's2.test.mjs'), "import { alpha } from '../src/small.js'\n")
  const deps = discoverModuleDependentTests({
    cwd: root, changedFiles: ['src/small.js'], coveredCommands: [], touchedExportSymbols: { 'src/small.js': ['beta'] },
  })
  assert.ok(deps.includes('test/s1.test.mjs') && deps.includes('test/s2.test.mjs'), `命中数 ≤ 阈值不收敛（实得 ${deps}）`)
})

// ── FR-05 纯函数边界 ─────────────────────────────────────────────────

test('extractTouchedExports：hunk 落函数体内（span 交集）触达该导出', () => {
  const content = [
    'export function alpha () {',
    '  return 1',
    '}',
    '',
    'export function beta () {',
    '  return 2',
    '}',
  ].join('\n') + '\n'
  const diff = [
    '@@ -1,3 +1,3 @@',
    ' export function alpha () {',
    '-  return 1',
    '+  return 11',
    ' }',
  ].join('\n') + '\n'
  assert.deepEqual(extractTouchedExports(content, diff), ['alpha'])
})

test('extractTouchedExports：差异行词法命中（hunk 在别的导出体内但 +/- 行提到导出名）', () => {
  const content = 'export function alpha () { return 1 }\nexport function beta () { return alpha() }\n'
  const diff = [
    '@@ -2 +2 @@',
    '-export function beta () { return alpha() }',
    '+export function beta () { return alpha() + 1 }',
  ].join('\n') + '\n'
  // hunk 只落在 beta 行 → beta（span 交集）；alpha 经差异行词法命中
  assert.deepEqual(extractTouchedExports(content, diff).sort(), ['alpha', 'beta'])
})

test('extractTouchedExports：列表 span 命中改动行整列表触达；上下文行不误触达相邻导出', () => {
  const content = [
    'export {',
    '  alpha,',
    '  beta,',
    '}',
    '',
    'export const gamma = () => {',
    '  return 3',
    '}',
  ].join('\n') + '\n'
  // 改动行只有 gamma 声明行（新侧第 6 行）——列表行是上下文，不触达 alpha/beta
  const diff = '@@ -4,3 +4,3 @@\n }\n \n+export const gamma = () => {\n   return 3\n }\n'
  assert.deepEqual(extractTouchedExports(content, diff), ['gamma'])
  // 列表行被改动（加一个导出）→ 整列表触达
  const diffList = '@@ -1,4 +1,5 @@\n export {\n   alpha,\n+  beta2,\n   beta,\n }'
  assert.deepEqual(extractTouchedExports(content, diffList).sort(), ['alpha', 'beta'])
})

test('namedImportEvidence 三态：hit / miss / unknown（别名取前名、default+named 混合走 unknown）', () => {
  const code = [
    "import { alpha as a2, beta } from '../src/hub.js'",        // 命名清单（别名取前名 alpha）
    "const { gamma } = require('../src/hub.js')",               // require 解构
    "import Hub, { delta } from '../src/hub.js'",               // default + named 混合
    "import * as ns from '../src/hub.js'",                      // namespace
    "const m = await import('../src/hub.js')",                  // 动态
    "import '../src/hub.js'",                                   // 副作用
    "import { other } from '../src/elsewhere.js'",              // 他模块——不计入
  ].join('\n')
  assert.equal(namedImportEvidence(code, 'src/hub.js', ['beta']), 'hit')
  assert.equal(namedImportEvidence(code, 'src/hub.js', ['alpha']), 'hit')   // 别名前名命中
  assert.equal(namedImportEvidence(code, 'src/hub.js', ['gamma']), 'hit')   // require 解构命中
  assert.equal(namedImportEvidence(code, 'src/hub.js', ['delta']), 'hit')   // 混合形态命名清单命中优先（多跑侧）
  // 全部命名清单均不含触达符号，但存在 default/namespace/动态/副作用形态 → unknown
  assert.equal(namedImportEvidence(code, 'src/hub.js', ['zeta']), 'unknown')
  // 纯命名清单（无混合形态）且全不触达 → miss
  const pureNamed = "import { alpha, beta } from '../src/hub.js'\nconst { gamma } = require('../src/hub.js')"
  assert.equal(namedImportEvidence(pureNamed, 'src/hub.js', ['zeta']), 'miss')
  // 无 import 语句（字符串提及）→ unknown
  assert.equal(namedImportEvidence("const p = '../src/hub.js'", 'src/hub.js', ['beta']), 'unknown')
})

// ── collectTouchedExportSymbols：真实 git 仓库收集 ───────────────────

test('collectTouchedExportSymbols：flow-state baseline 直锚 + 脏面 diff → 触达符号集', () => {
  const root = mk('sym-git-')
  mkdirSync(join(root, 'src'), { recursive: true })
  mkdirSync(join(root, '.sillyspec', 'changes', 'c-fix'), { recursive: true })
  writeFileSync(join(root, 'src', 'hub.js'), HUB)
  const git = (args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' })
  git(['init'])
  git(['config', 'user.email', 't@t'])
  git(['config', 'user.name', 't'])
  git(['add', 'src/hub.js'])
  git(['commit', '-m', 'base'])
  const anchor = String(git(['rev-parse', 'HEAD'])).trim()
  writeFileSync(join(root, '.sillyspec', 'changes', 'c-fix', 'flow-state.yaml'), `baseline_commit: ${anchor}\n`)
  // 脏面：beta 函数体修改（alpha 不动）→ 触达 beta
  writeFileSync(join(root, 'src', 'hub.js'), HUB.replace('return n * 2', 'return n * 3'))
  const syms = collectTouchedExportSymbols({ cwd: root, changeName: 'c-fix', changedFiles: ['src/hub.js'] })
  assert.deepEqual(syms, { 'src/hub.js': ['beta'] })
})

test('collectTouchedExportSymbols：失败面 fail-soft（无 change 上下文 → null；不可读文件跳过）', () => {
  const root = mk('sym-git-2-')
  assert.equal(collectTouchedExportSymbols({ cwd: root, changeName: 'x', changedFiles: ['src/a.js'] }), null)
  assert.equal(collectTouchedExportSymbols({ cwd: root, changedFiles: ['src/a.js'] }), null)
  assert.equal(collectTouchedExportSymbols({ cwd: root, changeName: 'x', changedFiles: [] }), null)
  const empty = collectTouchedExportSymbols({ cwd: root, changeName: 'x', changedFiles: ['src/a.js'], gitFn: () => '' })
  assert.ok(empty === null || (typeof empty === 'object' && Object.keys(empty).length === 0), `不可读文件跳过（实得 ${empty}）`)
})
