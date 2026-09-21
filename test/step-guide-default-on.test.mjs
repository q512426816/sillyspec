/**
 * P4 M1 缺省开（2026-09-21-r5-efficiency-batch3 task-02，FR-04 / D-004@v1）
 *
 * 锁死契约：
 * 1. 未设 SILLYSPEC_STEP_GUIDE → 复入短输出（静态部分 ≤10 行量级，D-001@batch2 退役判据兑现）
 * 2. SILLYSPEC_STEP_GUIDE=0 逃生门 → 复入仍全量（字节一致测试族的锁定锚）
 * 3. --json（console.log 劫持形态，withJsonOutput 同款）→ 不短输出全量照出（机器消费面不受翻转影响）
 * 4. 迁移面回归：三个已迁移的双渲染字节一致测试族（semantic/preflight/aliases 锁 =0）
 *    不在本件重复跑（各自文件内钉）；本件只钉缺省语义本身。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { outputStep } from '../src/run/prompt.js'

const roots = []
function mk(p) { const d = mkdtempSync(join(tmpdir(), p)); roots.push(d); return d }
test.after(() => { for (const d of roots) { try { rmSync(d, { recursive: true, force: true }) } catch {} } })

const STEP = { name: '调研', prompt: '调研 <project> 的模块结构，当前时间 <now-datetime>，产出报告。' }
const NL = String.fromCharCode(10)
const run = (cwd) => outputStep('explore', 0, [STEP], cwd, null, null, {}, null, null, null)

async function capture(fn) {
  const lines = []
  const orig = console.log
  console.log = (...a) => lines.push(a.map(String).join(' '))
  try { await fn() } finally { console.log = orig }
  return lines
}

function withEnv(val, fn) {
  const prev = process.env.SILLYSPEC_STEP_GUIDE
  if (val === undefined) delete process.env.SILLYSPEC_STEP_GUIDE
  else process.env.SILLYSPEC_STEP_GUIDE = val
  return fn().finally(() => {
    if (prev === undefined) delete process.env.SILLYSPEC_STEP_GUIDE
    else process.env.SILLYSPEC_STEP_GUIDE = prev
  })
}

test('D1 缺省开：未设 env → 首见全量、复入短输出（静态部分 ≤10 行量级）', async () => {
  const cwd = mk('p4-default-'); mkdirSync(join(cwd, '.sillyspec'), { recursive: true })
  await withEnv(undefined, async () => {
    const s1 = await capture(() => run(cwd))
    assert.ok(s1.some(l => l.includes('的模块结构')), 'D1: 首见全量渲染')
    const s2 = await capture(() => run(cwd))
    assert.ok(!s2.some(l => l.includes('的模块结构')), 'D1: 复入不重印静态正文（缺省开）')
    assert.ok(s2.some(l => l.includes('fingerprint=')), 'D1: 复入含指纹行')
    // 静态短输出块 ≤10 行（'## Step' 结构标题到动态附录之间的块——动态段另计，与
    // step-guide-fingerprint 件同口径；总行数含进度快照等动态附录不作上限）
    const joined = s2.join(NL)
    const head = joined.indexOf('## Step')
    const cut = joined.indexOf('动态注入', head)
    if (head >= 0 && cut > head) {
      const blockLines = joined.slice(head, cut).split(NL).length
      assert.ok(blockLines <= 10, `D1: 静态短输出块 ≤10 行（实际 ${blockLines}）`)
    }
  })
})

test('D2 逃生门：SILLYSPEC_STEP_GUIDE=0 → 复入仍全量（迁移测试族的锁定锚）', async () => {
  const cwd = mk('p4-escape-'); mkdirSync(join(cwd, '.sillyspec'), { recursive: true })
  await withEnv('0', async () => {
    await capture(() => run(cwd))
    const s2 = await capture(() => run(cwd))
    assert.ok(s2.some(l => l.includes('的模块结构')), 'D2: =0 显式关 → 复入仍全量（逃生门保留）')
  })
})

test('D3 --json 劫持形态：不短输出，全量照出（机器消费面不受翻转影响）', async () => {
  const cwd = mk('p4-json-'); mkdirSync(join(cwd, '.sillyspec'), { recursive: true })
  await withEnv(undefined, async () => {
    await capture(() => run(cwd)) // 落复入状态（若 json 不豁免将短输出）
    // 劫持形态=withJsonOutput 同款（src/index.js）：console.log 箭头函数体含
    // process.stderr.write 字面——prompt.js 的 jsonHijacked 探测即匹配该函数体字符串
    let buf = ''
    const origLog = console.log
    const origWrite = process.stderr.write
    console.log = (...a) => process.stderr.write(a.map(String).join(' ') + NL)
    process.stderr.write = (s) => { buf += String(s); return true }
    try { await run(cwd) } finally { process.stderr.write = origWrite; console.log = origLog }
    assert.ok(buf.includes('的模块结构'), 'D3: json 劫持形态下复入仍全量（不短输出）')
  })
})
