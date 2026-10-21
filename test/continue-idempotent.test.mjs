/**
 * FR-05（2026-10-21-protocol-tax）：--continue 无 waiting 步骤时幂等 no-op。
 *
 * 锁定行为：
 *   1. 无 waiting + --continue（无 answer）→ exit 0 + 指引行（progress show），状态零变化
 *   2. 无 waiting + --continue --answer "x" → exit 0，答案不落盘（无 waitAnswer 产生）
 *   3. 无 waiting + --continue --answers "2=A" → exit 0，零回填
 *   4. 有 waiting + --continue --answer → 既有语义不变（回填并推进）
 *
 * 风格：_cli-step-harness 子进程 CLI。
 */
import { makeRepo, initChange, seedStage, runCLI, cleanup, report } from './_cli-step-harness.mjs'
import { ProgressManager } from '../src/progress.js'

const count = { passed: 0, failed: 0, failures: [] }
const assert = (cond, msg) => { cond ? (count.passed++, console.log(`  ✅ PASS: ${msg}`)) : (count.failed++, count.failures.push(msg), console.log(`  ❌ FAIL: ${msg}`)) }

const BRAINSTORM_STEPS = [
  '进度确认', '加载项目上下文', '对话式探索与需求澄清', '提出 2-3 种方案',
  '分段展示设计', '写设计文档并自审', 'Design Grill 交叉审查', '生成规范文件',
]
const noWaiting = () => BRAINSTORM_STEPS.map((name, i) => ({ name, status: i < 1 ? 'completed' : 'pending' }))
const oneWaiting = () => BRAINSTORM_STEPS.map((name, i) => ({ name, status: i === 1 ? 'waiting' : (i < 1 ? 'completed' : 'pending') }))

async function readSteps(specBase, cn) {
  const pm = new ProgressManager({ specDir: specBase })
  const progress = await pm.read(null, cn)
  return progress.stages.brainstorm.steps
}
const runBrainstorm = (cwd, cn, extra = []) =>
  runCLI(['--dir', cwd, 'run', 'brainstorm', '--change', cn, ...extra], { cwd })

console.log('=== FR-05 --continue 幂等 no-op ===\n')

console.log('--- Case 1: 无 waiting + --continue → exit 0 + 指引行 ---')
{
  const { cwd, specBase } = makeRepo('cli-cont-idem-1-')
  const cn = '2026-07-25-cont-idem-1'
  const pm = await initChange(cwd, specBase, cn)
  await seedStage(pm, cwd, cn, 'brainstorm', noWaiting())
  const before = JSON.stringify(await readSteps(specBase, cn))

  const r = runBrainstorm(cwd, cn, ['--continue'])
  assert(r.status === 0, `exit 0（实际 ${r.status}，输出：${r.combined.slice(0, 200)}）`)
  assert(r.combined.includes('幂等跳过'), '输出幂等跳过说明')
  assert(r.combined.includes('progress show'), '指引行指向 progress show')
  assert(JSON.stringify(await readSteps(specBase, cn)) === before, '状态零变化')
}

console.log('--- Case 2: 无 waiting + --continue --answer → exit 0、答案不落盘 ---')
{
  const { cwd, specBase } = makeRepo('cli-cont-idem-2-')
  const cn = '2026-07-25-cont-idem-2'
  const pm = await initChange(cwd, specBase, cn)
  await seedStage(pm, cwd, cn, 'brainstorm', noWaiting())
  const r = runBrainstorm(cwd, cn, ['--continue', '--answer', '这条答案不该落盘'])
  assert(r.status === 0, `exit 0（实际 ${r.status}）`)
  const steps = await readSteps(specBase, cn)
  assert(steps.every(s => !s.waitAnswer), '无任何步骤被写入 waitAnswer')
}

console.log('--- Case 3: 无 waiting + --continue --answers → exit 0、零回填 ---')
{
  const { cwd, specBase } = makeRepo('cli-cont-idem-3-')
  const cn = '2026-07-25-cont-idem-3'
  const pm = await initChange(cwd, specBase, cn)
  await seedStage(pm, cwd, cn, 'brainstorm', noWaiting())
  const r = runBrainstorm(cwd, cn, ['--continue', '--answers', '2=A,3=B'])
  assert(r.status === 0, `exit 0（实际 ${r.status}）`)
  assert(r.combined.includes('--answers 未回填任何答案'), '批量形态提示未回填')
  const steps = await readSteps(specBase, cn)
  assert(steps.every(s => !s.waitAnswer), '零回填')
}

console.log('--- Case 4: 有 waiting → 既有回填语义不变 ---')
{
  const { cwd, specBase } = makeRepo('cli-cont-idem-4-')
  const cn = '2026-07-25-cont-idem-4'
  const pm = await initChange(cwd, specBase, cn)
  await seedStage(pm, cwd, cn, 'brainstorm', oneWaiting())
  const r = runBrainstorm(cwd, cn, ['--continue', '--answer', '正常回填的答案'])
  assert(r.status === 0, `exit 0（实际 ${r.status}，尾：${r.combined.slice(-150)}）`)
  const steps = await readSteps(specBase, cn)
  assert(steps[1].waitAnswer === '正常回填的答案', '答案已记录')
  assert(steps[1].status !== 'waiting', 'waiting 已解除')
}

cleanup()
report(count.passed, count.failed, count.failures)
