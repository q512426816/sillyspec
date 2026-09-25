/**
 * flag-contract.test.mjs — flag 消费/声明一致性钉（2026-09-25-cli-protocol-trust）
 *
 * 病根（R17 臂3 实证 + 静态扫描第二实例）：CLI 报错指引指向未登记 knownFlags 的 flag
 * （--same-session / --force 双死路——照指引重跑即 exit 2）。本钉静态扫描 command.js 的
 * 三种消费形态 vs 白名单声明，任何「被消费但未声明」的 flag 直接红——钉死整类漂移，
 * 不止修这两个实例。
 *
 * 透传 allowlist：声明于白名单但消费点不在 command.js 本文件的 flag（子模块直接读 argv/
 * 由 index.js 分发层消费）——有限可枚举，逐个注明消费出处。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SRC = readFileSync(join(ROOT, 'src', 'run', 'command.js'), 'utf8')

/** 消费面：command.js 内三种静态字面量形态。 */
function consumedFlags() {
  const out = new Set()
  for (const m of SRC.matchAll(/flags\.includes\('(--[\w-]+)'\)/g)) out.add(m[1])
  for (const m of SRC.matchAll(/(?:getFlagValue|autoFlagValue)\('(--[\w-]+)'/g)) out.add(m[1])
  return [...out]
}

/** 声明面：knownFlags = new Set([...]) 数组字面量里的 '--xxx'。 */
function declaredFlags() {
  const m = SRC.match(/const knownFlags = new Set\(\[([\s\S]*?)\]\)/)
  assert.ok(m, 'knownFlags 白名单字面量应可定位')
  const out = new Set()
  for (const f of m[1].matchAll(/'(--[\w-]+)'/g)) out.add(f[1])
  return [...out]
}

test('① 消费⊆声明：任何被 command.js 消费的 flag 必在 knownFlags 白名单（死路类灭绝钉）', () => {
  const consumed = consumedFlags()
  const declared = new Set(declaredFlags())
  assert.ok(consumed.length >= 25, `消费面扫描应非平凡（实际 ${consumed.length} 个）——扫描形态漂移时本钉自身报警`)
  const missing = consumed.filter((f) => !declared.has(f))
  assert.deepEqual(missing, [], `被消费但未登记 knownFlags 的 flag（照报错指引重跑即 exit 2 的死路）：${missing.join(', ')}——登记进 src/run/command.js knownFlags 白名单`)
})

test('② 双死路实例已登记：--same-session 与 --force 在白名单在案', () => {
  const declared = new Set(declaredFlags())
  assert.ok(declared.has('--same-session'), '--same-session（STAGE_WALL 报错指引指向的逃生口）应已登记')
  assert.ok(declared.has('--force'), '--force（quick --cancel 报错指引指向的强清）应已登记')
})

test('③ 声明侧自检：白名单字面量解析非空且含锚点 flag', () => {
  const declared = declaredFlags()
  assert.ok(declared.length >= 30, `白名单解析应非平凡（实际 ${declared.length}）`)
  for (const anchor of ['--done', '--input', '--change', '--session']) assert.ok(declared.includes(anchor), `${anchor} 应在白名单`)
})

/** FR-04 判定半边正向用例（评审 P1 清偿：初版读 s._cliAction 恒 false 死代码——DB 步骤行只有 name/status）。 */
test('④ verify 批量亲测判定：DB 步骤行（无 _cliAction）按 stageRegistry 索引对齐命中', async () => {
  const { hasPendingVerifyScanStep } = await import(pathToFileURL(join(ROOT, 'src/run/complete.js')).href)
  // DB 形态：只有 name/status（_cliAction 不持久化）
  const verifyDef = (await import(pathToFileURL(join(ROOT, 'src/stages/index.js')).href)).stageRegistry.verify
  assert.ok(verifyDef.steps.some(s => s._cliAction === 'verifyRunQualityScan'), 'registry 定义面应在场（fixture 自检）')
  const dbShapedSteps = verifyDef.steps.map(s => ({ name: s.name, status: 'pending' }))
  assert.equal(hasPendingVerifyScanStep('verify', dbShapedSteps), true, 'DB 形态步骤应按索引对齐命中亲测步')
  const allDone = dbShapedSteps.map(s => ({ ...s, status: 'completed' }))
  assert.equal(hasPendingVerifyScanStep('verify', allDone), false, '无 pending 步不命中')
  assert.equal(hasPendingVerifyScanStep('verify', []), false)
  assert.equal(hasPendingVerifyScanStep('brainstorm', [{ name: 'x', status: 'pending' }]), false)
})
