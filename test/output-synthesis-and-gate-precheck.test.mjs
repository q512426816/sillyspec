/**
 * P0-2 / P0-3（docs/sillyspec/noai-ir-roadmap.md §3）：
 *   - synthesizeStepOutput：--output 省略时 CLI 按事实合成步骤摘要（步骤名 + 变更窗口 +
 *     门禁指引；纯事实零判断词；≤200 字截断线内）；
 *   - outputStep：主阶段带 change 注入 gate 预检行（P0-3）与 --output 可省略提示（P0-2；
 *     auto 模式除外——SS-META doneCommand 仍带 --output，照抄路径零变化）。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { execSync } from 'node:child_process'
import { synthesizeStepOutput } from '../src/run/complete.js'
import { outputStep } from '../src/run/prompt.js'

test('synthesizeStepOutput：含步骤名与变更窗口计数；净树标注无未提交变更；≤200 字', () => {
  const dir = mkdtempSync(join(tmpdir(), 'synth-'))
  try {
    execSync('git init -q', { cwd: dir })
    execSync('git config user.email t@t.local', { cwd: dir })
    execSync('git config user.name t', { cwd: dir })
    writeFileSync(join(dir, 'README.md'), 'init\n')
    execSync('git add -A && git commit -qm init', { cwd: dir })
    mkdirSync(join(dir, '.sillyspec'), { recursive: true })
    // 净树 → 无未提交变更
    const clean = synthesizeStepOutput({ stageName: 'brainstorm', stepName: '提出方案', cwd: dir })
    assert.ok(clean.includes('【CLI 合成】'), '合成标记')
    assert.ok(clean.includes('提出方案'), '步骤名')
    assert.ok(clean.includes('无未提交变更'), '净树标注')
    assert.ok(!/(通过|成功|PASS)/.test(clean.replace(/【CLI 合成】/, '')), '纯事实零判断词（判断在 gate）')
    assert.ok(clean.length <= 200, '200 字截断线内')
    // 脏树 → 文件计数 + 前三个文件名
    writeFileSync(join(dir, 'a.js'), '1\n')
    writeFileSync(join(dir, 'b.js'), '1\n')
    writeFileSync(join(dir, 'c.js'), '1\n')
    writeFileSync(join(dir, 'd.js'), '1\n')
    const dirty = synthesizeStepOutput({ stageName: 'execute', stepName: '实现', cwd: dir })
    assert.ok(dirty.includes('4 文件'), '变更窗口计数')
    assert.ok(dirty.includes('a.js、b.js、c.js 等'), '前三个文件名 + 省略号')
    assert.ok(dirty.includes('--output 手写'), '语义说明指引')
  } finally {
    try { rmSync(dir, { recursive: true, force: true }) } catch {}
  }
})

async function captureOutputStep(args) {
  const logs = []
  const orig = console.log
  console.log = (...a) => { logs.push(a.map(String).join(' ')) }
  try {
    await outputStep(...args)
  } finally {
    console.log = orig
  }
  return logs.join('\n')
}

test('outputStep：主阶段带 change → gate 预检行 + --output 可省略提示', async () => {
  const out = await captureOutputStep(['brainstorm', 0, [{ name: '测试步', prompt: '做点事' }], process.cwd(), 'demo-change', 'proj', {}, null, null, null])
  assert.ok(out.includes('sillyspec gate brainstorm --change demo-change'), 'gate 预检行（P0-3）')
  assert.ok(out.includes('--output 可省略'), 'output 省略提示（P0-2）')
})

test('outputStep：auto 模式 → 无省略提示（doneCommand 照抄路径零变化）；quick/无 change → 无预检行', async () => {
  const autoOut = await captureOutputStep(['plan', 0, [{ name: '测试步', prompt: '做点事' }], process.cwd(), 'demo-change', 'proj', {}, null, null, { changeName: 'demo-change' }])
  assert.ok(!autoOut.includes('--output 可省略'), 'auto 模式不提示省略')
  assert.ok(autoOut.includes('<!--SS-META:'), 'SS-META 块仍在')
  const noChange = await captureOutputStep(['quick', 0, [{ name: '理解任务', prompt: '做点事' }], process.cwd(), null, 'proj', {}, null, null, null])
  assert.ok(!noChange.includes('sillyspec gate quick'), 'quick 无 gate 预检行')
})
