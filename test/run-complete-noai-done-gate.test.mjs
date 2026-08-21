/**
 * noAI 步骤 --done 硬门 CLI 行为测试（坑 noai-done-bypass）。
 *
 * 锁住：completeStep(--done 路径) 检测到 noAI step 时必须执行 _cliAction 的 CLI 确定性校验——
 * 此前 completeStep 无 noAI 检测，agent 对 planPostcheck step 直接 --done 会静默标 completed，
 * 绕过 executePlanPostcheck 的 tasks/ 硬校验（实证：multi-agent-platform
 * 2026-08-13-spec-sync-visibility tasks/ 从未生成但 plan 阶段 completed）。
 *
 * 用例：
 *  1. 拦截：postcheck step --done + tasks/ 缺失 → CLI 校验 throw → exit 非 0 + step 未 completed
 *  2. 通过：postcheck step --done + 合法 task 卡 → CLI 校验执行并放行 → step completed
 */
import { writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { makeRepo, initChange, seedStage, runCLI, runStage, cleanup, report } from './_cli-step-harness.mjs'
import { ProgressManager } from '../src/progress.js'

const count = { passed: 0, failed: 0, failures: [] }
const assert = (cond, msg) => { cond ? (count.passed++, console.log(`  ✅ PASS: ${msg}`)) : (count.failed++, count.failures.push(msg), console.log(`  ❌ FAIL: ${msg}`)) }

const PLAN_WITH_TASK = '---\nplan_level: light\n---\n\n# Plan\n\n## Wave 1\n\n- task-01\n'
const TASKS_MD = '- [ ] task-01: 做 foo\n'

console.log('=== noAI 步骤 --done 硬门（planPostcheck）===\n')

console.log('--- 用例1: postcheck --done + tasks/ 缺失 → 校验拦截，不推进 ---')
{
  const { cwd, specBase } = makeRepo('cli-noai-blk-')
  const cn = '2026-08-14-noai-bypass-block'
  const pm = await initChange(cwd, specBase, cn)
  const changeDir = join(specBase, 'changes', cn)
  writeFileSync(join(changeDir, 'plan.md'), PLAN_WITH_TASK)
  // init 步骤 schema（任务清单 → 5 步；2026-08-20-task-truth-unify：注册表在 tasks.md）
  runCLI(['--dir', cwd, 'run', 'plan', '--change', cn], { cwd })
  // seed：前 4 步 completed，postcheck（Wave 重排与可行性校验）pending——模拟 agent 直奔 noAI step --done
  const progress = await pm.read(cwd, cn)
  const seeded = progress.stages.plan.steps.map(s => ({ name: s.name, status: s.name === 'Wave 重排与可行性校验' ? 'pending' : 'completed' }))
  await seedStage(pm, cwd, cn, 'plan', seeded)
  // tasks/ 故意不建（generate_blueprints 被跳过的实证场景）；tasks.md 用例1 也不建（聚焦 tasks/ 缺失拦截）

  const r = runStage('plan', cn, cwd, { done: true, output: 'plan 阶段完成，转 execute' })

  assert(r.status !== 0, `exit 非 0（实际 ${r.status}）`)
  assert(r.combined.includes('tasks/ 目录不存在') || r.combined.includes('蓝图一致性校验失败'),
    `stdout 含 tasks/ 缺失拦截信息（实际尾：${r.combined.slice(-120)}）`)
  const after = await new ProgressManager({ specDir: specBase }).read(cwd, cn)
  const pc = after.stages.plan.steps.find(s => s.name === 'Wave 重排与可行性校验')
  assert(pc && pc.status !== 'completed', `DB: postcheck step 未被标 completed（实际 ${pc?.status}）`)
}

console.log('\n--- 用例2: postcheck --done + 合法 task 卡 → 校验执行并放行 ---')
{
  const { cwd, specBase } = makeRepo('cli-noai-ok-')
  const cn = '2026-08-14-noai-bypass-pass'
  const pm = await initChange(cwd, specBase, cn)
  const changeDir = join(specBase, 'changes', cn)
  writeFileSync(join(changeDir, 'plan.md'), PLAN_WITH_TASK)
  writeFileSync(join(changeDir, 'tasks.md'), TASKS_MD)
  // 阶段收尾 gate 要求的产物：module-impact.md 首版（与 noAI 门无关，缺了会被产物校验拦）
  writeFileSync(join(changeDir, 'module-impact.md'), '# 模块影响分析（Module Impact）— 测试\n\n无模块映射，unmapped。\n')
  runCLI(['--dir', cwd, 'run', 'plan', '--change', cn], { cwd })
  const progress = await pm.read(cwd, cn)
  const seeded = progress.stages.plan.steps.map(s => ({ name: s.name, status: s.name === 'Wave 重排与可行性校验' ? 'pending' : 'completed' }))
  await seedStage(pm, cwd, cn, 'plan', seeded)
  // 合法 task 卡（frontmatter 全字段 + allowed_paths 指向真实文件）
  writeFileSync(join(cwd, 'notes.md'), 'hello\n')
  mkdirSync(join(changeDir, 'tasks'))
  writeFileSync(join(changeDir, 'tasks', 'task-01.md'), [
    '---',
    'id: task-01',
    'title: 做 foo',
    'title_zh: 做 foo',
    'author: test',
    'created_at: 2026-08-14 00:00:00',
    'priority: P0',
    'depends_on: []',
    'blocks: []',
    'allowed_paths:',
    '  - notes.md',
    'goal: >',
    '  测试用最小任务卡。',
    'implementation:',
    '  - 写 notes.md',
    'acceptance:',
    '  - notes.md 存在',
    'verify:',
    '  - echo ok',
    'constraints:',
    '  - 无',
    '---',
    ''
  ].join('\n'))

  const r = runStage('plan', cn, cwd, { done: true, output: 'plan 阶段完成，转 execute' })

  assert(r.combined.includes('noAI，--done 路径执行 CLI 校验'), 'stdout 含 noAI 校验执行提示')
  assert(r.combined.includes('Plan postcheck 完成'), `stdout 含 postcheck 成功输出（实际尾：${r.combined.slice(-150)}）`)
  const after = await new ProgressManager({ specDir: specBase }).read(cwd, cn)
  const pc = after.stages.plan.steps.find(s => s.name === 'Wave 重排与可行性校验')
  assert(pc && pc.status === 'completed', `DB: postcheck step 已 completed（实际 ${pc?.status}）`)
}

cleanup()
report(count.passed, count.failed, count.failures)
