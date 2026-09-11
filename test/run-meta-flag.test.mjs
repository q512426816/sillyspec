/**
 * `run <stage> --meta`（P1-3，noai-ir-roadmap §4）：SS-META 机器块从 auto 专属毕业——
 * 常规模式经 SILLYSPEC_RUN_META=1（command.js 置，短进程生命周期内有效）同样渲染；
 * meta 增补 change 字段（宿主脚本免从正文 header 行解析）。锁定：
 *   - env 置位 → SS-META 在场（stage/stepName/change/doneCommand/requiresUser JSON）；
 *   - env 未置 → 常规模式不渲染（auto 以外零输出变化）；auto 模式恒渲染不受 env 影响。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { outputStep } from '../src/run/prompt.js'

async function capture(args, envMeta) {
  const prev = process.env.SILLYSPEC_RUN_META
  if (envMeta) process.env.SILLYSPEC_RUN_META = '1'
  else delete process.env.SILLYSPEC_RUN_META
  const buf = []
  const ol = console.log
  console.log = (...a) => buf.push(a.map(String).join(' '))
  try {
    await outputStep(...args)
  } finally {
    console.log = ol
    if (prev === undefined) delete process.env.SILLYSPEC_RUN_META
    else process.env.SILLYSPEC_RUN_META = prev
  }
  return buf.join('\n')
}

const STEPS = [{ name: '测试步', prompt: '做点事' }]

test('--meta（env 置位）：SS-META 渲染且含 change 字段；未置位不渲染', async () => {
  const on = await capture(['brainstorm', 0, STEPS, process.cwd(), 'demo-change', 'proj', {}, null, null, null], true)
  const m = on.match(/<!--SS-META:(.*?)-->/)
  assert.ok(m, 'SS-META 在场')
  const meta = JSON.parse(m[1])
  assert.equal(meta.stage, 'brainstorm')
  assert.equal(meta.stepName, '测试步')
  assert.equal(meta.change, 'demo-change', 'change 字段（宿主免解析 header）')
  assert.ok(meta.doneCommand.includes('run brainstorm --done'), 'doneCommand 与正文同源')

  const off = await capture(['brainstorm', 0, STEPS, process.cwd(), 'demo-change', 'proj', {}, null, null, null], false)
  assert.ok(!off.includes('<!--SS-META:'), '未置位不渲染（常规模式零输出变化）')
})

test('auto 模式：恒渲染不受 env 影响，同样带 change', async () => {
  const out = await capture(['plan', 0, STEPS, process.cwd(), 'auto-change', 'proj', {}, null, null, { changeName: 'auto-change' }], false)
  const m = out.match(/<!--SS-META:(.*?)-->/)
  assert.ok(m, 'auto 恒渲染')
  assert.equal(JSON.parse(m[1]).change, 'auto-change')
})
