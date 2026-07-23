/**
 * ensureStageSteps migratedFrom 步骤迁移（bug#1）
 *
 * 旧 13 步 brainstorm → 新 8 步折叠后，用户已完成的步骤不应丢失（否则 currentIdx 回跳 9/13→3/8）。
 * migratedFrom：合并步骤吸收的旧步骤全部 completed → 新步骤标 completed。
 */
import { ensureStageSteps } from '../src/run.js'

let failed = 0
const failures = []
function assertTrue(cond, msg) {
  if (cond) console.log(`  ✅ PASS: ${msg}`)
  else { failed++; failures.push(msg); console.log(`  ❌ FAIL: ${msg}`) }
}

console.log('=== ensureStageSteps migratedFrom 迁移（bug#1）===\n')

{
  // 旧 13 步 brainstorm（用户跑到 9/13：前 8 completed，分段展示 pending）
  const progress = { stages: { brainstorm: { status: 'in-progress', steps: [
    { name: '状态检查', status: 'completed' },
    { name: '加载项目上下文', status: 'completed' },
    { name: '协作与复用检查', status: 'completed' },
    { name: '原型/设计图分析', status: 'completed' },
    { name: '需求范围评估', status: 'completed' },
    { name: '对话式探索', status: 'completed' },
    { name: '需求澄清 Grill', status: 'completed' },
    { name: '提出 2-3 种方案', status: 'completed' },
    { name: '分段展示设计', status: 'pending' },
    { name: 'HTML 原型生成', status: 'pending' },
    { name: '写设计文档并自审', status: 'pending' },
    { name: 'Design Grill 交叉审查', status: 'pending' },
    { name: '用户确认并生成规范文件', status: 'pending' },
  ] } } }

  await ensureStageSteps(progress, 'brainstorm', process.cwd(), null)
  const steps = progress.stages.brainstorm.steps

  assertTrue(steps.length === 8, `迁移后 8 步（实际 ${steps.length}）`)
  const conv = steps.find(s => s.name === '对话式探索与需求澄清')
  assertTrue(conv && conv.status === 'completed', `「对话式探索与需求澄清」migratedFrom 吸收旧 5 步 completed → completed（实际 ${conv?.status}）`)
  const currentIdx = steps.findIndex(s => s.status !== 'completed' && s.status !== 'skipped')
  assertTrue(currentIdx >= 4, `currentIdx 不回跳（>=4 即 5/8，实际 ${currentIdx} →「${steps[currentIdx]?.name}」）`)
}

console.log(`\n${'='.repeat(50)}`)
const total = 3
console.log(`✅ 通过: ${total - failed}  ❌ 失败: ${failed}`)
if (failures.length > 0) { console.log('失败项:'); failures.forEach(f => console.log(`  - ${f}`)) }
console.log('='.repeat(50))
if (failed > 0) process.exit(1)
