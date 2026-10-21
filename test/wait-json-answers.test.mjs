/**
 * FR-04（2026-10-21-protocol-tax）：--wait --json 结构化问询 + --continue --answers 批量回填。
 *
 * 锁定行为：
 *   1. run <stage> --wait --json：stdout 唯一可 JSON.parse 的对象
 *      （change/stage/step/stepName/question/options[{label,description}]/resumeCommand），
 *      退出码与文本模式 --wait 一致（0）
 *   2. --continue --answers "2=A,3=B,4=C" 一次回填 3 个 waiting 步骤（升序逐个），全部回填成功
 *   3. answers 含不存在键 → 整单拒绝 exit≠0、列出未匹配键、无任何步骤被回填（原子性）
 *   4. 值含逗号的引号形态 k="v,含逗号" 解析正确
 *
 * 风格：_cli-step-harness 子进程 CLI；waiting 态用 seedStage 直造（多 waiting 场景）。
 */
import { join } from 'node:path'
import { makeRepo, initChange, seedStage, runCLI, cleanup, report } from './_cli-step-harness.mjs'
import { ProgressManager } from '../src/progress.js'

const count = { passed: 0, failed: 0, failures: [] }
const assert = (cond, msg) => { cond ? (count.passed++, console.log(`  ✅ PASS: ${msg}`)) : (count.failed++, count.failures.push(msg), console.log(`  ❌ FAIL: ${msg}`)) }

const BRAINSTORM_STEPS = [
  '进度确认', '加载项目上下文', '对话式探索与需求澄清', '提出 2-3 种方案',
  '分段展示设计', '写设计文档并自审', 'Design Grill 交叉审查', '生成规范文件',
]

// 直造多 waiting：步 2/3/4 waiting（步 1 completed，其后 pending）
const multiWaitingSteps = () => BRAINSTORM_STEPS.map((name, i) => ({
  name,
  status: i === 0 ? 'completed' : (i >= 1 && i <= 3 ? 'waiting' : 'pending'),
}))

async function readSteps(specBase, cn) {
  const pm = new ProgressManager({ specDir: specBase })
  const progress = await pm.read(null, cn)
  return progress.stages.brainstorm.steps
}

const runBrainstorm = (cwd, cn, extra = []) =>
  runCLI(['--dir', cwd, 'run', 'brainstorm', '--change', cn, ...extra], { cwd })

console.log('=== FR-04 --wait --json 与 --answers 批量回填 ===\n')

console.log('--- Case 1: --wait --json → 唯一 JSON 对象、退出码与文本模式一致 ---')
{
  const { cwd, specBase } = makeRepo('cli-wjson-1-')
  const cn = '2026-07-25-wjson-demo'
  const pm = await initChange(cwd, specBase, cn)
  await seedStage(pm, cwd, cn, 'brainstorm',
    BRAINSTORM_STEPS.map((name, i) => ({ name, status: i < 1 ? 'completed' : 'pending' })))

  const textMode = runBrainstorm(cwd, cn, ['--wait', '--reason', '选哪个方案', '--options', '方案A,方案B,方案C'])
  // 恢复 waiting 后再测 json 模式（waitStep 拒绝双 waiting，先 continue 掉）
  await runBrainstorm(cwd, cn, ['--continue', '--answer', '先答文本轮'])

  const jsonMode = runBrainstorm(cwd, cn, ['--wait', '--reason', '选哪个方案', '--options', '方案A,方案B,方案C', '--json'])

  assert(textMode.status === 0, `文本模式 --wait exit 0（实际 ${textMode.status}）`)
  assert(jsonMode.status === 0, `--wait --json exit 0 与文本模式一致（实际 ${jsonMode.status}）`)
  let obj = null
  try { obj = JSON.parse(jsonMode.stdout) } catch { }
  assert(obj !== null, `stdout 可整体 JSON.parse（实际头 120 字符：${jsonMode.stdout.slice(0, 120)}）`)
  if (obj) {
    assert(obj.stage === 'brainstorm' && typeof obj.step === 'number' && typeof obj.stepName === 'string', `JSON 含 stage/step/stepName（${obj.stage}/${obj.step}/${obj.stepName}）`)
    assert(obj.change === cn, `JSON 含 change（${obj.change}）`)
    assert(typeof obj.question === 'string' && obj.question.length > 0, 'JSON question 非空')
    assert(Array.isArray(obj.options) && obj.options.length === 3 && obj.options[0].label === '方案A' && 'description' in obj.options[0], `options 结构化 3 项含 label/description（实际 ${JSON.stringify(obj.options)}）`)
    assert(typeof obj.resumeCommand === 'string' && obj.resumeCommand.includes('--continue'), 'resumeCommand 指 --continue')
  }
}

console.log('--- Case 2: --answers 一次回填 3 个 waiting ---')
{
  const { cwd, specBase } = makeRepo('cli-wjson-2-')
  const cn = '2026-07-25-answers-multi'
  const pm = await initChange(cwd, specBase, cn)
  await seedStage(pm, cwd, cn, 'brainstorm', multiWaitingSteps())

  const r = runBrainstorm(cwd, cn, ['--continue', '--answers', '2=答案A,3=答案B,4=答案C'])
  assert(r.status === 0, `批量回填 exit 0（实际 ${r.status}，尾：${r.combined.slice(-200)}）`)
  assert(r.combined.includes('--answers 批量回填完成：3 步'), '输出批量完成汇总（3 步）')
  const steps = await readSteps(specBase, cn)
  const waitingAfter = steps.filter(s => s.status === 'waiting').length
  assert(waitingAfter === 0, `回填后 0 个 waiting（实际 ${waitingAfter}）`)
  assert(steps[1].waitAnswer === '答案A' && steps[2].waitAnswer === '答案B' && steps[3].waitAnswer === '答案C', '三步答案按序号各就各位')
}

console.log('--- Case 3: 键未命中 → 整单拒绝、零回填（原子性） ---')
{
  const { cwd, specBase } = makeRepo('cli-wjson-3-')
  const cn = '2026-07-25-answers-miss'
  const pm = await initChange(cwd, specBase, cn)
  await seedStage(pm, cwd, cn, 'brainstorm', multiWaitingSteps())

  const r = runBrainstorm(cwd, cn, ['--continue', '--answers', '2=答案A,99=不存在的键'])
  assert(r.status !== 0, `整单拒绝 exit≠0（实际 ${r.status}）`)
  assert(r.combined.includes('99'), '错误信息列出未匹配键')
  const steps = await readSteps(specBase, cn)
  assert(steps.filter(s => s.status === 'waiting').length === 3, '原子性：无任何步骤被回填（仍 3 waiting）')
  assert(!steps[1].waitAnswer, '命中的键也未落盘（整单拒绝不留半程状态）')
}

console.log('--- Case 4: 引号值含逗号 ---')
{
  const { cwd, specBase } = makeRepo('cli-wjson-4-')
  const cn = '2026-07-25-answers-quote'
  const pm = await initChange(cwd, specBase, cn)
  await seedStage(pm, cwd, cn, 'brainstorm', multiWaitingSteps())

  const r = runBrainstorm(cwd, cn, ['--continue', '--answers', '2="值含,逗号",3=普通值'])
  assert(r.status === 0, `引号形态 exit 0（实际 ${r.status}，尾：${r.combined.slice(-160)}）`)
  const steps = await readSteps(specBase, cn)
  assert(steps[1].waitAnswer === '值含,逗号', `引号内逗号不切分（实际：${steps[1].waitAnswer}）`)
  assert(steps[2].waitAnswer === '普通值', '后续键照常解析')
}

cleanup()
report(count.passed, count.failed, count.failures)
