/**
 * 坑 quick-step3-four-fields-late 回归：quick 末步四字段模板的前置预告
 *
 * 背景：末步 --done 的 --output 四字段（需求/根因/方案/结果）是硬校验，但模板藏在 step3 长
 * prompt 中段（task-08 同因：长 prompt 易被 tail 截断），agent 常到 --done 被拦才第一次见到
 * 模板，白费一轮拦截往返。
 *
 * 锁定语义：
 *   1. step2 --done 推进到末步（step3）的输出尾部，出现 📌 四字段预告块（模板 + 可照抄命令）
 *   2. 预告只在进入末步时出现：step1 --done 推进到 step2 不出预告
 *   3. 拦截兜底保留：末步 --output 缺字段仍被拒（既有行为零回归）
 */
import { writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { makeRepo, initChange, seedStage, runStage, cleanup, report } from './_cli-step-harness.mjs'
import { ProgressManager } from '../src/progress.js'

const count = { passed: 0, failed: 0, failures: [] }
const assert = (cond, msg) => { cond ? (count.passed++, console.log(`  ✅ PASS: ${msg}`)) : (count.failed++, count.failures.push(msg), console.log(`  ❌ FAIL: ${msg}`)) }

const QL_ID = 'ql-test-preview-01'
const FULL_OUTPUT = '需求：修复 X\n根因：无，纯新增\n方案：加文件\n结果：测试通过'

function writeGuard(specBase, sid) {
  const guardFile = join(specBase, '.runtime', 'quick-sessions', sid, 'guard.json')
  mkdirSync(join(specBase, '.runtime', 'quick-sessions', sid), { recursive: true })
  writeFileSync(guardFile, JSON.stringify({
    quicklogId: QL_ID, baselineFiles: [], allowedFiles: [], allowNew: false,
    forceBaseline: false, linkedChanges: [], taskDescription: '测试任务',
  }))
}
function writeQuicklogEntry(specBase) {
  const dir = join(specBase, 'quicklog')
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'QUICKLOG-test.md'),
    `# QUICKLOG\n\n## ${QL_ID} | 2026/08/20 02:00:00 | 测试条目\n状态：进行中\n关联变更：（无）\n文件：（见实际改动）\n`)
}
async function seed(cwd, specBase, sid, statuses) {
  const pm = await initChange(cwd, specBase, sid)
  return seedStage(pm, cwd, sid, 'quick', [
    { name: '理解任务', status: statuses[0] },
    { name: '实现并验证', status: statuses[1] },
    { name: '暂存和更新记录', status: statuses[2] },
  ])
}

console.log('=== quick 末步四字段前置预告（坑 quick-step3-four-fields-late）===\n')

console.log('--- ① step2 --done 推进到末步 → 尾部出现四字段预告块 ---')
{
  const { cwd, specBase } = makeRepo('quick-preview-adv-')
  const sid = 'quick-cafe0001'
  await seed(cwd, specBase, sid, ['completed', 'pending', 'pending'])

  const r = runStage('quick', sid, cwd, { done: true, output: '实现完成，改了 src/a.js' })
  assert(r.status === 0, `step2 --done 成功（实际 ${r.status}）`)
  assert(r.combined.includes('本步是 quick 末步'), '输出含「本步是 quick 末步」预告标识')
  assert(r.combined.includes('CLI 硬校验'), '预告点明硬校验 + 被拒不丢进度')
  for (const f of ['需求：', '根因：', '方案：', '结果：']) {
    assert(r.combined.includes(f), `预告模板含字段「${f}」`)
  }
  assert(r.combined.includes(`run quick --done --change ${sid}`), '预告给可照抄完整命令（含 --change）')
  assert(r.combined.includes('--file-notes'), '预告顺带提示可选 --file-notes')
  const after = await new ProgressManager({ specDir: specBase }).read(cwd, sid)
  assert(after.stages.quick.steps[2].status === 'pending' && after.stages.quick.steps[1].status === 'completed', '进度正确推进到末步')
  cleanup()
}

console.log('--- ② 非末步推进（step1→step2）不出预告 ---')
{
  const { cwd, specBase } = makeRepo('quick-preview-early-')
  const sid = 'quick-cafe0002'
  await seed(cwd, specBase, sid, ['pending', 'pending', 'pending'])

  const r = runStage('quick', sid, cwd, { done: true, output: '任务理解完成' })
  assert(r.status === 0, `step1 --done 成功（实际 ${r.status}）`)
  assert(!r.combined.includes('本步是 quick 末步'), '推进到 step2 无末步预告（只在进入末步时出现）')
  cleanup()
}

console.log('--- ③ 拦截兜底保留：末步缺字段仍被拒 ---')
{
  const { cwd, specBase } = makeRepo('quick-preview-intercept-')
  const sid = 'quick-cafe0003'
  await seed(cwd, specBase, sid, ['completed', 'completed', 'pending'])
  writeGuard(specBase, sid)
  writeQuicklogEntry(specBase)

  const r = runStage('quick', sid, cwd, { done: true, output: '不完整的输出' })
  assert(r.status === 1, '末步缺四字段仍被拒（拦截兜底零回归）')
  const after = await new ProgressManager({ specDir: specBase }).read(cwd, sid)
  assert(after.stages.quick.steps[2].status === 'pending', '末步回退 pending（既有行为）')
  // 打回文案补四参数形式（坑 quick-step3-four-fields-late 第二层）：旧文案只给 --output 模板，
  // 照抄旧形式仍可能踩嵌套全角冒号拆分坑（四参数形式正是为消灭它而生）——打回时刻同步给四参数。
  assert(r.combined.includes('--req'), '打回文案含推荐四参数 --req（CLI 自动合成无冒号事故面）')
  assert(r.combined.includes('--cause') && r.combined.includes('--solution') && r.combined.includes('--result'), '打回文案四参数齐全')
  cleanup()
}

console.log('--- ④ 末步 --done 缺 --output 拦截文案同样给四参数形式 ---')
{
  const { cwd, specBase } = makeRepo('quick-preview-nooutput-')
  const sid = 'quick-cafe0004'
  await seed(cwd, specBase, sid, ['completed', 'completed', 'pending'])
  writeGuard(specBase, sid)
  writeQuicklogEntry(specBase)

  const r = runStage('quick', sid, cwd, { done: true })
  assert(r.status === 1, '末步缺 --output 仍被拒（Q6 既有行为）')
  assert(r.combined.includes('--req'), '缺 --output 拦截文案含四参数 --req')
  cleanup()
}

console.log('--- ⑤ step2 prompt 内预告末步四字段（防线前移：验证数据在 step2 产生当场记录）---')
{
  const { cwd, specBase } = makeRepo('quick-preview-step2-')
  const sid = 'quick-cafe0005'
  await seed(cwd, specBase, sid, ['completed', 'pending', 'pending'])

  const r = runStage('quick', sid, cwd, {})
  assert(r.status === 0, `渲染 step2 prompt 成功（实际 ${r.status}）`)
  assert(r.combined.includes('末步预告'), 'step2 prompt 含末步预告段（硬校验模板在实现阶段即告知）')
  assert(r.combined.includes('验证情况'), '预告点明「结果：验证情况」素材在本步产生')
  assert(r.combined.includes('--req'), '预告给推荐四参数形式')
  cleanup()
}

report(count.passed, count.failed, count.failures)
