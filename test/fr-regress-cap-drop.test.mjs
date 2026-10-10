/**
 * 2026-10-06-fr-regress-cap-drop 回归：优先面（变更自身测试 ∪ FR 钦定回归）豁免 deps 组卷帽
 *
 * 背景（flow-status-title 收口实测）：buildDepsBatches 的 priorityFiles 设计意图是「绑定面
 * 钦定的回归不该被字母序挤出跑面」，但 slice(0, cap) 对优先面无豁免——优先面自身超帽时
 * 照样被字母序挤出（实测 FR 绑定 63 文件实跑 30、静默弃 33）。
 *
 * 覆盖：
 *   ① 优先面超帽：整跑（普通依赖零席位），dropped 只计普通依赖
 *   ② 优先面未满帽：普通依赖按字母序填余，组内序保持「优先前缀+字母序」
 *   ③ py/js 混组：两组优先面各自豁免本组配额，比例配额计算不变
 *   ④ 披露计数分列：批对象 prioCount/prioDropped 与日志行格式（优先面计数在场、超帽弃限定普通依赖）
 *   ⑤ test:core 清单驻留断言（防移出日常拦截面）
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = dirname(fileURLToPath(import.meta.url))
const { buildDepsBatches, formatDepsBatchLine } = await import(pathToFileURL(join(ROOT, '..', 'src', 'verify-postcheck.js')).href)

const jsBatch = (batches) => batches.find((b) => b.short === 'js')
const pyBatch = (batches) => batches.find((b) => b.short === 'py')
const cmdFiles = (b) => b.command.split(' ').filter((t) => /^test\//.test(t) || /\.py$/.test(t))

const names = (n, prefix) => Array.from({ length: n }, (_, i) => `test/${prefix}-${String(i).padStart(3, '0')}.test.mjs`)

test('① 优先面超帽：整跑不弃（普通依赖零席位），dropped 只计普通依赖', () => {
  const prio = names(40, 'prio')
  const ordinary = names(20, 'ord')
  const batches = buildDepsBatches({ deps: [...prio, ...ordinary], changedFiles: [], priorityFiles: prio, cwd: null })
  const js = jsBatch(batches)
  assert.ok(js, 'js 批在场')
  assert.equal(js.count, 40, '优先面 40 个整跑（豁免 30 帽）')
  assert.equal(js.dropped, 20, 'dropped 只计普通依赖弃置')
  assert.equal(js.prioCount, 40, 'prioCount=实跑优先面数')
  assert.equal(js.prioDropped, 0, '优先面零弃置')
  const files = cmdFiles(js)
  for (const p of prio) assert.ok(files.includes(p), `优先文件 ${p} 必须在执行命令中`)
})

test('② 优先面未满帽：普通依赖填余，组内序保持「优先前缀+字母序」', () => {
  const prio = names(5, 'prio')
  const ordinary = names(40, 'ord')
  const batches = buildDepsBatches({ deps: [...ordinary, ...prio], changedFiles: [], priorityFiles: prio, cwd: null })
  const js = jsBatch(batches)
  assert.equal(js.count, 30, '5 优先 + 25 普通 = 30')
  assert.equal(js.dropped, 15, '普通依赖弃 15')
  const files = cmdFiles(js)
  for (const p of prio) assert.ok(files.includes(p), `优先文件 ${p} 在场`)
  // 序：优先前缀在前，其后普通依赖按字母序
  const prioIdx = files.map((f, i) => (prio.includes(f) ? i : -1)).filter((i) => i >= 0)
  assert.equal(Math.max(...prioIdx), prio.length - 1, '优先文件全部前置于普通依赖')
  const ordRun = files.slice(prio.length)
  assert.deepEqual(ordRun, [...ordRun].sort((a, b) => a.localeCompare(b)), '普通依赖按字母序')
})

test('③ py/js 混组：两组优先面各自豁免本组配额，比例配额计算不变', () => {
  // py 占位换 pytest 收集形态（test_*.py）：.test.py 点名必 0 collected exit 5，
  // 2026-10-10-dyn-subset-nontest-runner-face 起不进执行批（nontest-skip 拆批）
  const pyPrio = ['test/test_a1.py', 'test/test_a2.py', 'test/test_a3.py']
  const pyOrd = ['test/test_b1.py', 'test/test_b2.py', 'test/test_b3.py', 'test/test_b4.py', 'test/test_b5.py']
  const jsPrio = names(10, 'prio')
  const jsOrd = names(50, 'ord')
  const batches = buildDepsBatches({ deps: [...pyPrio, ...pyOrd, ...jsPrio, ...jsOrd], changedFiles: [], priorityFiles: [...pyPrio, ...jsPrio], cwd: null })
  // 比例配额：py=8 / 总 68 → pyCap=5（保底 5），jsCap=25——配额计算与旧口径一致
  const py = pyBatch(batches)
  const js = jsBatch(batches)
  assert.equal(py.count, 5, 'py 组配额 5：3 优先整跑 + 2 普通填余')
  assert.equal(py.prioCount, 3)
  assert.equal(py.dropped, 3, 'py 普通依赖弃 3')
  assert.equal(js.count, 25, 'js 组配额 25：10 优先整跑 + 15 普通填余')
  assert.equal(js.prioCount, 10)
  assert.equal(js.dropped, 35, 'js 普通依赖弃 35')
  // 优先面超组配额时豁免：js 组 30 优先 + 0 普通 → 整跑 30
  const b2 = buildDepsBatches({ deps: [...names(30, 'prio'), ...pyOrd], changedFiles: [], priorityFiles: [...names(30, 'prio'), ...pyOrd.slice(0, 0)], cwd: null })
  const js2 = jsBatch(b2)
  assert.equal(js2.count, 30, 'js 优先 30 = 配额 30 整跑')
})

test('④ 披露行分列：优先面计数在场，「超帽弃」限定普通依赖', () => {
  const line = formatDepsBatchLine({ name: 'deps(auto-js)', count: 63, prioCount: 63, dropped: 97, prioDropped: 0, short: 'js' })
  assert.ok(line.includes('63'), '实跑总数在场')
  assert.ok(line.includes('优先面 63'), '优先面计数在场')
  assert.ok(line.includes('超帽弃 97 普通依赖'), '超帽弃限定普通依赖')
  const lineNoDrop = formatDepsBatchLine({ name: 'deps(auto-js)', count: 5, prioCount: 0, dropped: 0, prioDropped: 0, short: 'js' })
  assert.ok(!lineNoDrop.includes('超帽弃'), '零弃置不打超帽弃')
})

test('⑤ test:core 清单驻留：本测试文件在 package.json test:core 内（防移出日常拦截面）', () => {
  const pkg = JSON.parse(readFileSync(join(ROOT, '..', 'package.json'), 'utf8'))
  assert.ok(
    (pkg.scripts?.['test:core'] || '').includes('test/fr-regress-cap-drop.test.mjs'),
    'test:core 必须包含 test/fr-regress-cap-drop.test.mjs',
  )
})
