/**
 * plan 审查计划 conditionalWait --continue 回 pending 回归测试（坑
 * continue-conditionalwait-premature-complete，2026-09-01 实证）
 *
 * 坑：waitStep 的提示对 requiresWait/conditionalWait 同文——「--continue --answer 后本步回到
 * 待执行，完成动作后需再 --done 收尾」，但 continueStep 的 shouldReturnToCurrentStep 谓词漏了
 * conditionalWait。审查计划（conditionalWait、无 repeatableWait）被 --answer 直接收尾 completed，
 * agent 手里已备好的 --done（本步真实产出摘要）随即落到下一步上——multi-agent-platform
 * 2026-09-01-session-group-chat plan 阶段 --continue 后 2 秒 --done 把「生成 TaskCard」假完成
 * （user-inputs.md 实证：00:32:45 CONTINUED → 00:32:47 生成 TaskCard --done），靠
 * --reopen --from-step 4 重做浪费一轮。
 *
 * 本测试锁三个不变量：
 *  1. 审查计划步骤定义 conditionalWait===true 且无 requiresWait/repeatableWait（坑形态前提）
 *  2. --continue --answer 后本步回 pending（不被答案直接收尾 completed）
 *  3. 随后的 --done 落在审查计划本步——下一步「生成 TaskCard」不被假完成
 */
import { join, resolve, basename, dirname } from 'path'
import { mkdirSync, writeFileSync, rmSync } from 'fs'
import { fileURLToPath, pathToFileURL } from 'url'
import { execSync } from 'child_process'
import { tmpdir } from 'os'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const root = resolve(__dirname, '..')
const binCLI = join(root, 'bin', 'sillyspec.js')

function imp(path) { return import(pathToFileURL(path).href) }

let passed = 0, failed = 0
const assert = (cond, msg) => { cond ? (passed++, console.log(`  ✅ PASS: ${msg}`)) : (failed++, console.log(`  ❌ FAIL: ${msg}`)) }

function run(cmd, opts = {}) {
  try { return execSync(cmd, { encoding: 'utf8', timeout: 30000, ...opts }) }
  catch (e) { return (e.stdout || '') + (e.stderr || '') }
}
function tmpDir(label) {
  const d = join(tmpdir(), `sillyspec-plancw-${label}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`)
  mkdirSync(d, { recursive: true }); return d
}
function cleanup(d) { try { rmSync(d, { recursive: true, force: true }) } catch {} }

async function readProgress(projectDir, changeName) {
  const { ProgressManager } = await imp(join(root, 'src', 'progress.js'))
  return await new ProgressManager().read(projectDir, changeName)
}
async function writeProgress(projectDir, changeName, progress) {
  const { ProgressManager } = await imp(join(root, 'src', 'progress.js'))
  await new ProgressManager()._write(projectDir, progress, changeName)
}

// ================================================================
// Test 1: 审查计划步骤定义——conditionalWait 且无 repeatableWait/requiresWait（坑形态前提：
//         修复前该组合的 --continue 会直接 completed）
// ================================================================
console.log('\n=== Test 1: 审查计划步骤定义（conditionalWait、无 repeatableWait/requiresWait） ===')
{
  const { fixedPrefix } = await imp(join(root, 'src', 'stages', 'plan.js'))
  const step = fixedPrefix.find(s => s.name === '审查计划')
  assert(!!step, 'plan fixedPrefix 有审查计划步骤')
  assert(step.conditionalWait === true, `conditionalWait===true（实际 ${step.conditionalWait}）`)
  assert(step.repeatableWait !== true, `repeatableWait!==true（实际 ${step.repeatableWait}）——修复前 --continue 直接收尾的形态`)
  assert(step.requiresWait !== true, `requiresWait!==true（实际 ${step.requiresWait}）`)
}

// ================================================================
// Test 2+3: --continue 回 pending，随后 --done 落本步（下一步不被假完成）
// ================================================================
console.log('\n=== Test 2+3: --wait → --continue --answer → pending → --done 落审查计划本步 ===')
{
  const projectDir = tmpDir('flow')
  run(`node "${binCLI}" init "${projectDir}"`)
  const changeName = '2026-09-01-plan-cw-test'
  const changeDir = join(projectDir, '.sillyspec', 'changes', changeName)
  mkdirSync(changeDir, { recursive: true })
  // 2 个 task → buildPlanSteps 产出 5 步表（idx2=审查计划 / idx3=生成 TaskCard）
  writeFileSync(join(changeDir, 'tasks.md'), '# 任务注册表\n\n- [ ] task-01: 甲\n- [ ] task-02: 乙\n')
  writeFileSync(join(changeDir, 'plan.md'), '# 计划\n\n## Wave 1\n- task-01\n\n## Wave 2\n- task-02\n')

  run(`node "${binCLI}" --dir "${projectDir}" run plan --change ${changeName} --skip-approval`)
  const p = await readProgress(projectDir, changeName)
  const sd = p.stages.plan
  assert(sd && Array.isArray(sd.steps) && sd.steps.length === 5, `plan steps 已初始化为 5 步（实际 ${sd.steps.length}）`)
  const reviewIdx = sd.steps.findIndex(s => s.name === '审查计划')
  const cardIdx = sd.steps.findIndex(s => s.name.startsWith('生成 TaskCard'))
  assert(reviewIdx === 2, `审查计划在 idx2（实际 ${reviewIdx}）`)
  assert(cardIdx === 3, `生成 TaskCard 在 idx3（实际 ${cardIdx}）`)

  // 前置两步 completed；审查计划置 waiting（plan_level=full 的执行前确认门形态）
  for (let i = 0; i < reviewIdx; i++) {
    sd.steps[i].status = 'completed'; sd.steps[i].completedAt = new Date().toISOString()
  }
  sd.steps[reviewIdx].status = 'waiting'
  sd.steps[reviewIdx].waitReason = '等待用户确认计划'
  sd.steps[reviewIdx].waitOptions = '["确认，进入执行","需要调整"]'
  sd.steps[reviewIdx].waitedAt = new Date().toISOString()
  sd.steps[reviewIdx].output = '计划摘要（Wave 分组 + task 总数）'
  await writeProgress(projectDir, changeName, p)

  // 事件序列还原：--continue（答案解 waiting）后 agent 手里已备好本步的 --done
  const outCont = run(`node "${binCLI}" --dir "${projectDir}" run plan --continue --answer "确认，进入执行" --change ${changeName}`)
  assert(outCont.includes('回到当前步骤') || outCont.includes('🔁'), 'continue 输出含「回到当前步骤」提示')
  const p2 = await readProgress(projectDir, changeName)
  const s2 = p2.stages.plan.steps[reviewIdx]
  assert(s2.status === 'pending', `审查计划回 pending（修复前被答案直接 completed，实际 ${s2.status}）`)
  assert(s2.waitAnswer === '确认，进入执行', 'waitAnswer 已记录')
  assert(p2.stages.plan.status !== 'completed', '阶段未被 --continue 收尾')

  // 随后的 --done（agent 备好的审查产出摘要）应落在审查计划本步，而非下一步
  const outDone = run(`node "${binCLI}" --dir "${projectDir}" run plan --done --output "计划审查完成：9 项全 pass" --change ${changeName}`)
  const p3 = await readProgress(projectDir, changeName)
  assert(p3.stages.plan.steps[reviewIdx].status === 'completed', '审查计划本步 --done 推进 completed')
  assert(p3.stages.plan.steps[cardIdx].status === 'pending', `下一步「生成 TaskCard」不被假完成（实际 ${p3.stages.plan.steps[cardIdx].status}）——修复前 --done 落到这里`)
  assert(outDone.includes('审查计划'), '--done 输出确认落在审查计划步骤')

  cleanup(projectDir)
}

// ── Summary ──
console.log(`\n${'='.repeat(50)}`)
console.log(`✅ 通过: ${passed}  ❌ 失败: ${failed}`)
console.log(`${'='.repeat(50)}`)
if (failed > 0) process.exit(1)
