/**
 * 回归：decision 引用校验不应因「版本号有无 / 大小写」误报
 *
 * 现象：prompt 让用 D-xxx@v1，但 design/requirements 里常裸号引用 D-xxx。
 *       旧校验器用 targetContent.includes("D-xxx@V1") 字面匹配 → 批量误报。
 *       另：强制 decision 在 design+requirements+tasks 三处都引用，tasks 骨架不自然。
 *
 * 修 A：warnMissingIds 剥 @vN 后缀，按基号词边界匹配（裸号 D-001 视为引用 D-001@V1）。
 * 修 B：brainstorm 阶段不再强制 requirements.md / tasks.md 引用每个 decision（decision 天然落点在 design）。
 */
import { runValidators } from '../src/stage-contract.js'
import { mkdirSync, writeFileSync, rmSync } from 'fs'
import { join } from 'path'
import os from 'os'

let failed = 0
const fail = m => { failed++; console.log(`  ❌ FAIL: ${m}`) }
const pass = m => console.log(`  ✅ PASS: ${m}`)

function setup() {
  const tmp = join(os.tmpdir(), `ss-ref-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`)
  const cd = join(tmp, '.sillyspec', 'changes', 'tc')
  mkdirSync(cd, { recursive: true })
  return { tmp, cd }
}

console.log('=== decision 引用校验：版本号 / 裸号 / 三文件放宽 ===\n')

{
  const { tmp, cd } = setup()
  // decisions：小写 @v1（测大小写不敏感）+ 一条 supersede 链
  writeFileSync(join(cd, 'decisions.md'), [
    '# Decisions', '',
    '## D-001@v1: 决策一', 'status: accepted', 'priority: P2', '',
    '## D-002@v1: 决策二', 'status: accepted', 'priority: P2', '',
    '## D-003@v1: 旧', 'status: superseded', 'supersedes: ', '',
    '## D-003@v2: 新', 'status: accepted', 'supersedes: D-003@v1', '',
  ].join('\n'))
  // design：裸号引用 D-001（小写原文）；不引用 D-002（真实缺口）；D-003@v2 裸号 D-003
  writeFileSync(join(cd, 'design.md'), [
    '# Design', '',
    '## 文件变更清单', '- src/a.js 覆盖 D-001', '- src/b.py 涉及 D-003', '',
    '## 风险登记', '- 风险', '',
    '## 自审', '- 已审', '',
  ].join('\n'))
  writeFileSync(join(cd, 'proposal.md'), '# P\n\n## 不在范围内\n- x\n')
  writeFileSync(join(cd, 'requirements.md'), '# Req\n\n- FR-01: 功能\n')
  // tasks：骨架，不引用任何 decision
  writeFileSync(join(cd, 'tasks.md'), '# Tasks\n\n## W1\n- [ ] （待 plan 展开）\n')

  const r = runValidators('brainstorm', tmp, 'tc', {})
  const ref = r.warnings.filter(w => w.includes('未引用'))
  console.log('  产出未引用警告：')
  for (const w of ref) console.log(`     - ${w}`)

  // 修 A：裸号 D-001（小写）应被识别，design 不报 D-001
  if (ref.some(w => w.includes('design.md') && w.includes('D-001'))) {
    fail('design 裸号 D-001（小写）仍被报 —— 修A 未生效（版本号/大小写）')
  } else pass('design 裸号 D-001 被识别（修A：剥版本号 + 大小写不敏感）')

  // 修 A：D-003 裸号应匹配 active 的 D-003@V2（V1 被 supersede 排除）
  if (ref.some(w => w.includes('design.md') && w.includes('D-003'))) {
    fail('design 裸号 D-003 未匹配到 active D-003@V2')
  } else pass('design 裸号 D-003 匹配 active D-003@V2（supersede 链正确）')

  // 真实缺口保留：design 确实没引用 D-002
  if (ref.some(w => w.includes('design.md') && w.includes('D-002'))) {
    pass('design 未引用 D-002 正确报警（真实缺口保留）')
  } else fail('design D-002 缺口未报警 —— 校验器被改得过松')

  // 修 B：requirements / tasks 不再被强制引用每个 decision
  if (ref.some(w => w.includes('requirements.md'))) {
    fail('requirements 仍被强制引用 decision —— 修B 未生效')
  } else pass('requirements 不再强制引用 decision（修B）')
  if (ref.some(w => w.includes('tasks.md'))) {
    fail('tasks 骨架仍被强制引用 decision —— 修B 未生效')
  } else pass('tasks 骨架不再强制引用 decision（修B）')

  rmSync(tmp, { recursive: true, force: true })
}

console.log('\n' + '='.repeat(50))
console.log(failed === 0 ? '✅ 全部通过' : `❌ 失败 ${failed}`)
console.log('='.repeat(50))
if (failed > 0) process.exit(1)
