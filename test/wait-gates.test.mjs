/**
 * repeatableWait / requiresWait / 普通 wait 门控测试
 *
 * 测试点：
 * 1. repeatableWait --continue 后仍 pending（不 completed）
 * 2. requiresWait --continue 后仍 pending（不 completed）
 * 3. 普通 wait --continue 后 completed
 * 4. requiresWait 直接 --done 被拒绝
 * 5. repeatableWait 多轮后 --done 可推进
 * 6. brainstorm validator 检测四件套缺失
 */

import { join, resolve, basename, dirname } from 'path'
import { existsSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'fs'
import { fileURLToPath, pathToFileURL } from 'url'
import { execSync } from 'child_process'
import { tmpdir } from 'os'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const root = resolve(__dirname, '..')
const binCLI = join(root, 'bin', 'sillyspec.js')

function imp(path) {
  return import(pathToFileURL(path).href)
}

let passed = 0
let failed = 0

function assert(condition, msg) {
  if (condition) {
    console.log(`  ✅ PASS: ${msg}`)
    passed++
  } else {
    console.log(`  ❌ FAIL: ${msg}`)
    failed++
  }
}

function run(cmd, opts = {}) {
  try {
    return execSync(cmd, { encoding: 'utf8', timeout: 10000, ...opts })
  } catch (e) {
    return (e.stdout || '') + (e.stderr || '')
  }
}

function tmpDir(label) {
  const dir = join(tmpdir(), `sillyspec-wait-test-${label}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`)
  mkdirSync(dir, { recursive: true })
  return dir
}

function cleanup(dir) {
  try { rmSync(dir, { recursive: true, force: true }) } catch {}
}

// ── Setup helper: create initialized project with a change ──
function setupProject(label) {
  const projectDir = tmpDir(label)
  run(`node "${binCLI}" init "${projectDir}"`)
  // Create a change directory with four-piece files
  const changeName = '2026-06-14-test-change'
  const changeDir = join(projectDir, '.sillyspec', 'changes', changeName)
  mkdirSync(changeDir, { recursive: true })
  // Register the change in DB by running a harmless command
  const specDir = join(projectDir, '.sillyspec')
  return { projectDir, changeName, changeDir, specDir }
}

function writeFourFiles(changeDir) {
  writeFileSync(join(changeDir, 'design.md'), `# Design\n\n## 背景\nTest\n## 文件变更清单\n| 操作 | 文件 | 说明 |\n## 风险登记\n| 编号 | 风险 |\n## 自审\nOK\n`)
  writeFileSync(join(changeDir, 'proposal.md'), `# Proposal\n## 动机\nTest\n## 不在范围内\n- Nothing\n## 成功标准\nWorks\n`)
  writeFileSync(join(changeDir, 'requirements.md'), `# Requirements\n## 角色\n| 角色 |\n## 功能需求\n### FR-01: Test\nGiven X\nWhen Y\nThen Z\n`)
  writeFileSync(join(changeDir, 'tasks.md'), `# Tasks\n- [ ] Task 1: do something\n- [ ] Task 2: do more\n`)
}

// ── Read progress from DB ──
async function readProgress(projectDir, changeName) {
  const { ProgressManager } = await imp(join(root, 'src', 'progress.js'))
  const pm = new ProgressManager()
  const progress = await pm.read(projectDir, changeName)
  return progress
}

async function writeProgress(projectDir, changeName, progress) {
  const { ProgressManager } = await imp(join(root, 'src', 'progress.js'))
  const pm = new ProgressManager()
  await pm._write(projectDir, progress, changeName)
}

// ================================================================
// Test 1: repeatableWait --continue 后仍 pending
// ================================================================
console.log('\n=== Test 1: repeatableWait --continue 后仍 pending ===')
{
  const { projectDir, changeName } = setupProject('repeatable')

  // Init brainstorm stage for the change
  run(`node "${binCLI}" --dir "${projectDir}" run brainstorm --change ${changeName}`)

  // Read progress, find the repeatable step (对话式探索 = step 6, index 5)
  const progress = await readProgress(projectDir, changeName)
  const brainstormData = progress.stages.brainstorm
  assert(brainstormData && brainstormData.steps, 'brainstorm steps initialized')

  // Find 对话式探索 step index
  const exploreIdx = brainstormData.steps.findIndex(s => s.name === '对话式探索')
  assert(exploreIdx !== -1, '找到"对话式探索"步骤')

  // Set steps before explore to completed, set explore to waiting
  for (let i = 0; i < exploreIdx; i++) {
    brainstormData.steps[i].status = 'completed'
    brainstormData.steps[i].completedAt = new Date().toISOString()
  }
  brainstormData.steps[exploreIdx].status = 'waiting'
  brainstormData.steps[exploreIdx].waitReason = '等待用户回答需求问题'
  brainstormData.steps[exploreIdx].waitOptions = ['继续补充', '信息够了']
  brainstormData.steps[exploreIdx].waitedAt = new Date().toISOString()
  brainstormData.steps[exploreIdx].output = '你到底想要什么？'
  await writeProgress(projectDir, changeName, progress)

  // Now --continue with an answer
  const output = run(`node "${binCLI}" --dir "${projectDir}" run brainstorm --continue --answer "我想要一个用户管理系统" --change ${changeName}`)
  assert(output.includes('回到当前步骤'), 'continue 输出包含"回到当前步骤"')
  assert(output.includes('🔁'), 'continue 输出包含 🔁 标记')

  // Read progress again, check step is still pending (not completed)
  const progress2 = await readProgress(projectDir, changeName)
  const step = progress2.stages.brainstorm.steps[exploreIdx]
  assert(step.status === 'pending', `"对话式探索" --continue 后状态是 pending (实际: ${step.status})`)
  assert(Array.isArray(step.waitAnswers) && step.waitAnswers.length === 1, `waitAnswers 有 1 条记录 (实际: ${JSON.stringify(step.waitAnswers)})`)
  assert(step.waitRound === 1, `waitRound === 1 (实际: ${step.waitRound})`)

  cleanup(projectDir)
}

// ================================================================
// Test 2: requiresWait --continue 后仍 pending
// ================================================================
console.log('\n=== Test 2: requiresWait --continue 后仍 pending ===')
{
  const { projectDir, changeName } = setupProject('requires')

  run(`node "${binCLI}" --dir "${projectDir}" run brainstorm --change ${changeName}`)

  const progress = await readProgress(projectDir, changeName)
  const brainstormData = progress.stages.brainstorm

  // Find 提出 2-3 种方案 step
  const proposeIdx = brainstormData.steps.findIndex(s => s.name === '提出 2-3 种方案')
  assert(proposeIdx !== -1, '找到"提出 2-3 种方案"步骤')

  // Set all steps before it to completed, set it to waiting
  for (let i = 0; i < proposeIdx; i++) {
    brainstormData.steps[i].status = 'completed'
    brainstormData.steps[i].completedAt = new Date().toISOString()
  }
  brainstormData.steps[proposeIdx].status = 'waiting'
  brainstormData.steps[proposeIdx].waitReason = '等待用户选择方案'
  brainstormData.steps[proposeIdx].waitOptions = ['方案A', '方案B', '方案C']
  brainstormData.steps[proposeIdx].waitedAt = new Date().toISOString()
  brainstormData.steps[proposeIdx].output = '方案A vs 方案B'
  await writeProgress(projectDir, changeName, progress)

  // --continue with selection
  const output = run(`node "${binCLI}" --dir "${projectDir}" run brainstorm --continue --answer "方案A" --change ${changeName}`)
  assert(output.includes('回到当前步骤'), 'continue 输出包含"回到当前步骤"')

  // Check step is pending, not completed
  const progress2 = await readProgress(projectDir, changeName)
  const step = progress2.stages.brainstorm.steps[proposeIdx]
  assert(step.status === 'pending', `"提出方案" --continue 后状态是 pending (实际: ${step.status})`)
  assert(step.waitAnswer === '方案A', 'waitAnswer === 方案A')

  cleanup(projectDir)
}

// ================================================================
// Test 3: 普通 wait --continue 后 completed
// ================================================================
console.log('\n=== Test 3: 普通 wait --continue 后 completed ===')
{
  const { projectDir, changeName } = setupProject('normal-wait')

  run(`node "${binCLI}" --dir "${projectDir}" run brainstorm --change ${changeName}`)

  const progress = await readProgress(projectDir, changeName)
  const brainstormData = progress.stages.brainstorm

  // Find 状态检查 (step 0) — it's a normal step, not requiresWait
  // Simulate it being in waiting state (as if someone manually --wait'd it)
  brainstormData.steps[0].status = 'waiting'
  brainstormData.steps[0].waitReason = '等待原因'
  brainstormData.steps[0].waitedAt = new Date().toISOString()
  await writeProgress(projectDir, changeName, progress)

  // --continue
  const output = run(`node "${binCLI}" --dir "${projectDir}" run brainstorm --continue --answer "继续" --change ${changeName}`)

  const progress2 = await readProgress(projectDir, changeName)
  const step = progress2.stages.brainstorm.steps[0]
  assert(step.status === 'completed', `普通 wait --continue 后 completed (实际: ${step.status})`)

  cleanup(projectDir)
}

// ================================================================
// Test 4: requiresWait 直接 --done 被拒绝
// ================================================================
console.log('\n=== Test 4: requiresWait 直接 --done 被拒绝 ===')
{
  const { projectDir, changeName } = setupProject('refuse-done')

  run(`node "${binCLI}" --dir "${projectDir}" run brainstorm --change ${changeName}`)

  const progress = await readProgress(projectDir, changeName)
  const brainstormData = progress.stages.brainstorm

  // Find 提出 2-3 种方案 (requiresWait=true)
  const proposeIdx = brainstormData.steps.findIndex(s => s.name === '提出 2-3 种方案')
  for (let i = 0; i < proposeIdx; i++) {
    brainstormData.steps[i].status = 'completed'
    brainstormData.steps[i].completedAt = new Date().toISOString()
  }
  // Step is pending, no waitAnswer
  brainstormData.steps[proposeIdx].status = 'pending'
  await writeProgress(projectDir, changeName, progress)

  // Try --done directly (should fail because requiresWait && !waitAnswer)
  const output = run(`node "${binCLI}" --dir "${projectDir}" run brainstorm --done --output "推荐方案A" --change ${changeName}`)
  assert(output.includes('必须先等待用户输入') || output.includes('不能直接'), 'requiresWait 步骤直接 --done 被拒绝')

  // Verify step is still pending
  const progress2 = await readProgress(projectDir, changeName)
  const step = progress2.stages.brainstorm.steps[proposeIdx]
  assert(step.status === 'pending', `拒绝后步骤仍是 pending (实际: ${step.status})`)

  cleanup(projectDir)
}

// ================================================================
// Test 5: repeatableWait 多轮收集后 --done 可推进
// ================================================================
console.log('\n=== Test 5: repeatableWait 多轮后 --done 可推进 ===')
{
  const { projectDir, changeName } = setupProject('multi-round')

  run(`node "${binCLI}" --dir "${projectDir}" run brainstorm --change ${changeName}`)

  const progress = await readProgress(projectDir, changeName)
  const brainstormData = progress.stages.brainstorm

  const exploreIdx = brainstormData.steps.findIndex(s => s.name === '对话式探索')
  for (let i = 0; i < exploreIdx; i++) {
    brainstormData.steps[i].status = 'completed'
    brainstormData.steps[i].completedAt = new Date().toISOString()
  }
  brainstormData.steps[exploreIdx].status = 'waiting'
  brainstormData.steps[exploreIdx].waitReason = '等待用户回答'
  brainstormData.steps[exploreIdx].waitedAt = new Date().toISOString()
  brainstormData.steps[exploreIdx].output = '问题1'
  await writeProgress(projectDir, changeName, progress)

  // Round 1
  run(`node "${binCLI}" --dir "${projectDir}" run brainstorm --continue --answer "回答1" --change ${changeName}`)
  let p2 = await readProgress(projectDir, changeName)
  assert(p2.stages.brainstorm.steps[exploreIdx].status === 'pending', '第1轮后仍 pending')
  assert(p2.stages.brainstorm.steps[exploreIdx].waitAnswers.length === 1, '1 条历史回答')

  // Simulate another --wait cycle
  p2.stages.brainstorm.steps[exploreIdx].status = 'waiting'
  p2.stages.brainstorm.steps[exploreIdx].waitReason = '等待用户回答'
  p2.stages.brainstorm.steps[exploreIdx].waitedAt = new Date().toISOString()
  p2.stages.brainstorm.steps[exploreIdx].output = '问题2'
  await writeProgress(projectDir, changeName, p2)

  // Round 2
  run(`node "${binCLI}" --dir "${projectDir}" run brainstorm --continue --answer "回答2" --change ${changeName}`)
  let p3 = await readProgress(projectDir, changeName)
  assert(p3.stages.brainstorm.steps[exploreIdx].status === 'pending', '第2轮后仍 pending')
  assert(p3.stages.brainstorm.steps[exploreIdx].waitAnswers.length === 2, '2 条历史回答')

  // Now agent does --done (has waitAnswer so should pass requiresWait gate)
  run(`node "${binCLI}" --dir "${projectDir}" run brainstorm --done --output "需求已明确" --change ${changeName}`)
  let p4 = await readProgress(projectDir, changeName)
  assert(p4.stages.brainstorm.steps[exploreIdx].status === 'completed', '--done 后步骤 completed')

  cleanup(projectDir)
}

// ================================================================
// Test 6: brainstorm validator 检测四件套缺失
// ================================================================
console.log('\n=== Test 6: brainstorm validator 检测四件套缺失 ===')
{
  const { projectDir, changeName, changeDir } = setupProject('validator')
  // Don't write the four files — validator should catch this

  const { runValidators } = await imp(join(root, 'src', 'stage-contract.js'))
  const result = runValidators('brainstorm', projectDir, changeName, {})
  assert(result.ok === false, '四件套缺失时 ok=false')
  assert(result.errors.length >= 4, `至少 4 个 error (实际: ${result.errors.length})`)
  assert(result.errors.some(e => e.includes('design.md')), 'error 包含 design.md')
  assert(result.errors.some(e => e.includes('proposal.md')), 'error 包含 proposal.md')
  assert(result.errors.some(e => e.includes('requirements.md')), 'error 包含 requirements.md')
  assert(result.errors.some(e => e.includes('tasks.md')), 'error 包含 tasks.md')

  // Now write all four files
  writeFourFiles(changeDir)
  const result2 = runValidators('brainstorm', projectDir, changeName, {})
  assert(result2.ok === true, '四件套存在时 ok=true')
  assert(result2.errors.length === 0, '四件套存在时无 error')

  cleanup(projectDir)
}

// ================================================================
// Test 7: tasks.md 空列表只 warning 不 error
// ================================================================
console.log('\n=== Test 7: tasks.md 空列表只 warning 不 error ===')
{
  const { projectDir, changeName, changeDir } = setupProject('empty-tasks')

  writeFileSync(join(changeDir, 'design.md'), `# Design\n## 背景\n## 文件变更清单\n## 风险登记\n## 自审\n`)
  writeFileSync(join(changeDir, 'proposal.md'), `# Proposal\n## 不在范围内\n- x\n`)
  writeFileSync(join(changeDir, 'requirements.md'), `# Requirements\n### FR-01: x\nGiven\nWhen\nThen\n`)
  writeFileSync(join(changeDir, 'tasks.md'), `# Tasks\n(no items)\n`) // no list items

  const { runValidators } = await imp(join(root, 'src', 'stage-contract.js'))
  const result = runValidators('brainstorm', projectDir, changeName, {})
  assert(result.ok === true, '空 tasks.md → ok=true (文件存在)')
  assert(result.warnings.some(w => w.includes('任务列表')), '空 tasks.md → warning about 任务列表')

  cleanup(projectDir)
}


// ================================================================
// Test 8: 多个 waiting 步骤 → --continue 必须报错
// ================================================================
console.log('\n=== Test 8: 多个 waiting 步骤 → --continue 报错 ===')
{
  const { projectDir, changeName } = setupProject('multi-waiting')

  run(`node "${binCLI}" --dir "${projectDir}" run brainstorm --change ${changeName}`)

  const progress = await readProgress(projectDir, changeName)
  const brainstormData = progress.stages.brainstorm
  // Set two steps to waiting
  brainstormData.steps[0].status = 'waiting'
  brainstormData.steps[0].waitReason = '等待1'
  brainstormData.steps[0].waitedAt = new Date().toISOString()
  brainstormData.steps[1].status = 'waiting'
  brainstormData.steps[1].waitReason = '等待2'
  brainstormData.steps[1].waitedAt = new Date().toISOString()
  await writeProgress(projectDir, changeName, progress)

  const output = run(`node "${binCLI}" --dir "${projectDir}" run brainstorm --continue --answer "test" --change ${changeName}`)
  assert(output.includes('检测到') && output.includes('等待中的步骤'), '多个 waiting 步骤时报错')

  cleanup(projectDir)
}

// ================================================================
// Test 9: --skip-approval 不能绕过 requiresWait
// ================================================================
console.log('\n=== Test 9: --skip-approval 不能绕过 requiresWait ===')
{
  const { projectDir, changeName } = setupProject('skip-approval')

  run(`node "${binCLI}" --dir "${projectDir}" run brainstorm --change ${changeName}`)

  const progress = await readProgress(projectDir, changeName)
  const brainstormData = progress.stages.brainstorm
  const proposeIdx = brainstormData.steps.findIndex(s => s.name === '提出 2-3 种方案')
  for (let i = 0; i < proposeIdx; i++) {
    brainstormData.steps[i].status = 'completed'
    brainstormData.steps[i].completedAt = new Date().toISOString()
  }
  brainstormData.steps[proposeIdx].status = 'pending'
  await writeProgress(projectDir, changeName, progress)

  const output = run(`node "${binCLI}" --dir "${projectDir}" run brainstorm --done --skip-approval --output "推荐方案A" --change ${changeName}`)
  assert(output.includes('必须先等待用户输入') || output.includes('不能直接'), '--skip-approval 无法绕过 requiresWait')

  cleanup(projectDir)
}

// ================================================================
// Test 10: repeatableWait 达到 maxWaitRounds 后再次 --wait 被拒绝
// ================================================================
console.log('\n=== Test 10: maxWaitRounds 达到上限后 --wait 被拒绝 ===')
{
  const { projectDir, changeName } = setupProject('max-rounds')

  run(`node "${binCLI}" --dir "${projectDir}" run brainstorm --change ${changeName}`)

  const progress = await readProgress(projectDir, changeName)
  const brainstormData = progress.stages.brainstorm
  const exploreIdx = brainstormData.steps.findIndex(s => s.name === '对话式探索')
  for (let i = 0; i < exploreIdx; i++) {
    brainstormData.steps[i].status = 'completed'
    brainstormData.steps[i].completedAt = new Date().toISOString()
  }
  // Simulate already having maxRounds (3) rounds
  brainstormData.steps[exploreIdx].status = 'pending'
  brainstormData.steps[exploreIdx].waitRound = 3
  brainstormData.steps[exploreIdx].maxWaitRounds = 3
  brainstormData.steps[exploreIdx].waitAnswer = 'previous answer'
  await writeProgress(projectDir, changeName, progress)

  // Try to --wait again (should be refused)
  const output = run(`node "${binCLI}" --dir "${projectDir}" run brainstorm --wait --reason "还想再问" --output "再问一个问题" --change ${changeName}`)
  assert(output.includes('已达到最大等待轮次') || output.includes('maxWaitRounds'), '达到 maxWaitRounds 后 --wait 被拒绝')

  // But --done should still work (has waitAnswer)
  const output2 = run(`node "${binCLI}" --dir "${projectDir}" run brainstorm --done --output "需求已明确" --change ${changeName}`)
  const progress2 = await readProgress(projectDir, changeName)
  const step = progress2.stages.brainstorm.steps[exploreIdx]
  assert(step.status === 'completed', '达到上限后 --done 仍可推进')

  cleanup(projectDir)
}

// ================================================================
// Test 11: specRoot 模式下 changes 缺失 → validator error
// ================================================================
console.log('\n=== Test 11: specRoot 模式下 changes 缺失 → fail-fast ===')
{
  const specRoot = tmpDir('specroot-nofail')
  const { runValidators } = await imp(join(root, 'src', 'stage-contract.js'))
  // specRoot exists but has no changes/ directory
  const result = runValidators('brainstorm', '/some/project', 'test-change', { specRoot })
  assert(result.ok === false, 'specRoot 缺 changes 目录时 ok=false')
  assert(result.errors.some(e => e.includes('缺少 changes 目录')), 'error 包含「缺少 changes 目录」')

  cleanup(specRoot)
}

// ================================================================
// Test 12: waitRound=0 正确写入读取（不被 || 吞掉）
// ================================================================
console.log('\n=== Test 12: waitRound=0 正确持久化 ===')
{
  const { projectDir, changeName } = setupProject('waitround-zero')

  run(`node "${binCLI}" --dir "${projectDir}" run brainstorm --change ${changeName}`)

  const progress = await readProgress(projectDir, changeName)
  const brainstormData = progress.stages.brainstorm
  // Manually set waitRound=0 (simulates edge case)
  brainstormData.steps[0].status = 'pending'
  brainstormData.steps[0].waitRound = 0
  brainstormData.steps[0].maxWaitRounds = 3
  await writeProgress(projectDir, changeName, progress)

  const p2 = await readProgress(projectDir, changeName)
  // waitRound=0 should be read back as 0 (not null/undefined)
  assert(p2.stages.brainstorm.steps[0].waitRound === 0, `waitRound=0 正确读取 (实际: ${p2.stages.brainstorm.steps[0].waitRound})`)
  assert(p2.stages.brainstorm.steps[0].maxWaitRounds === 3, `maxWaitRounds=3 正确读取 (实际: ${p2.stages.brainstorm.steps[0].maxWaitRounds})`)

  cleanup(projectDir)
}

// ================================================================
// Test 13: 已有 waiting 步骤时 --wait 被拒绝
// ================================================================
console.log('\n=== Test 13: 已有 waiting 步骤时 --wait 被拒绝 ===')
{
  const { projectDir, changeName } = setupProject('existing-wait')

  run(`node "${binCLI}" --dir "${projectDir}" run brainstorm --change ${changeName}`)

  const progress = await readProgress(projectDir, changeName)
  const brainstormData = progress.stages.brainstorm
  // Set step 0 to waiting
  brainstormData.steps[0].status = 'waiting'
  brainstormData.steps[0].waitReason = '等待中'
  brainstormData.steps[0].waitedAt = new Date().toISOString()
  await writeProgress(projectDir, changeName, progress)

  // Try --wait on another step (should be refused)
  const output = run(`node "${binCLI}" --dir "${projectDir}" run brainstorm --wait --reason "新问题" --output "新等待" --change ${changeName}`)
  assert(output.includes('已有步骤处于等待状态') || output.includes('等待状态'), '已有 waiting 步骤时 --wait 被拒绝')

  cleanup(projectDir)
}

// ── Summary ──
console.log(`\n${'='.repeat(50)}`)
if (failed === 0) {
  console.log(`✅ 通过: ${passed}  ❌ 失败: ${failed}`)
  console.log(`${'='.repeat(50)}`)
  console.log('\n🎉 wait gates 测试全部通过!')
} else {
  console.log(`✅ 通过: ${passed}  ❌ 失败: ${failed}`)
  console.log(`${'='.repeat(50)}`)
}
process.exit(failed > 0 ? 1 : 0)
