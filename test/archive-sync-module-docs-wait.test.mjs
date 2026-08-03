/**
 * archive sync-module-docs requiresWait 回归测试（坑 verify-archive-flow-pitfalls 坑4）
 *
 * 坑4：archive step3 sync-module-docs 缺 requiresWait 时，--continue --answer "确认写入"
 * 会直接把步骤标 completed 并推进（continueStep shouldReturnToCurrentStep=false），agent 无机会
 * 按 module-impact.md 写入模块卡片（_module-map.yaml + modules/<m>.md）。
 *
 * 修复：给 sync-module-docs 加 requiresWait:true → --continue 确认后回到本步（pending），
 * agent 可执行写入；再 --done --answer 完成。本测试锁三个不变量：
 *  1. sync-module-docs 步骤定义带 requiresWait:true
 *  2. 该步骤 --wait → --continue --answer "确认写入" 后回到 pending（不直接 completed）
 *  3. 直接 --done（不带 --answer）被拒；--done --answer "确认写入" 后可推进
 */
import { join, resolve, basename, dirname } from 'path'
import { existsSync, mkdirSync, writeFileSync, rmSync } from 'fs'
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
  try { return execSync(cmd, { encoding: 'utf8', timeout: 15000, ...opts }) }
  catch (e) { return (e.stdout || '') + (e.stderr || '') }
}
function tmpDir(label) {
  const d = join(tmpdir(), `sillyspec-syncmd-${label}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`)
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
// Test 1: sync-module-docs 步骤定义必须带 requiresWait:true
// ================================================================
console.log('\n=== Test 1: sync-module-docs 步骤带 requiresWait:true ===')
{
  const { stageRegistry } = await imp(join(root, 'src', 'stages', 'index.js'))
  const step = stageRegistry.archive.steps.find(s => s.name === 'sync-module-docs')
  assert(!!step, 'archive 有 sync-module-docs 步骤')
  assert(step.requiresWait === true, `requiresWait===true（实际 ${step.requiresWait}）——坑4 修复核心`)
}

// ================================================================
// Test 2: sync-module-docs --wait → --continue --answer "确认写入" → 回到 pending
// ================================================================
console.log('\n=== Test 2: sync-module-docs --continue --answer 后回到 pending（不直接 completed） ===')
{
  const projectDir = tmpDir('cont')
  run(`node "${binCLI}" init "${projectDir}"`)
  const changeName = '2026-07-31-syncmd-test'
  const changeDir = join(projectDir, '.sillyspec', 'changes', changeName)
  mkdirSync(changeDir, { recursive: true })
  writeFileSync(join(changeDir, 'plan.md'), '# Plan\n\n## Wave 1\n- [x] task-01: a\n')
  writeFileSync(join(changeDir, 'module-impact.md'), '# 模块影响分析（Module Impact）— test\n\n| 模块 | 影响类型 |\n|------|----------|\n| runtime | 逻辑变更 |\n')

  // 初始化 archive 阶段
  run(`node "${binCLI}" --dir "${projectDir}" run archive --change ${changeName}`)
  const p = await readProgress(projectDir, changeName)
  const sd = p.stages.archive
  assert(sd && sd.steps, 'archive steps 已初始化')

  const syncIdx = sd.steps.findIndex(s => s.name === 'sync-module-docs')
  assert(syncIdx !== -1, '找到 sync-module-docs 步骤')

  // 前两步 completed，sync-module-docs 置 waiting
  for (let i = 0; i < syncIdx; i++) {
    sd.steps[i].status = 'completed'; sd.steps[i].completedAt = new Date().toISOString()
  }
  sd.steps[syncIdx].status = 'waiting'
  sd.steps[syncIdx].waitReason = '等待用户确认模块文档同步'
  sd.steps[syncIdx].waitOptions = '["确认写入","跳过同步"]'
  sd.steps[syncIdx].waitedAt = new Date().toISOString()
  sd.steps[syncIdx].output = 'diff 摘要'
  await writeProgress(projectDir, changeName, p)

  // --continue --answer "确认写入"
  const out = run(`node "${binCLI}" --dir "${projectDir}" run archive --continue --answer "确认写入" --change ${changeName}`)
  assert(out.includes('回到当前步骤') || out.includes('🔁'), 'continue 输出含「回到当前步骤」')
  const p2 = await readProgress(projectDir, changeName)
  const step = p2.stages.archive.steps[syncIdx]
  assert(step.status === 'pending', `确认后回到本步（pending，可写卡片）——实际 ${step.status}`)
  assert(step.waitAnswer === '确认写入', 'waitAnswer === 确认写入')

  cleanup(projectDir)
}

// ================================================================
// Test 3: sync-module-docs 直接 --done 被拒（requiresWait 门控）；--done --answer 可推进
// ================================================================
console.log('\n=== Test 3: sync-module-docs --done 被拒 / --done --answer 推进 ===')
{
  const projectDir = tmpDir('done')
  run(`node "${binCLI}" init "${projectDir}"`)
  const changeName = '2026-07-31-syncmd-done'
  const changeDir = join(projectDir, '.sillyspec', 'changes', changeName)
  mkdirSync(changeDir, { recursive: true })
  writeFileSync(join(changeDir, 'plan.md'), '# Plan\n\n## Wave 1\n- [x] task-01: a\n')

  run(`node "${binCLI}" --dir "${projectDir}" run archive --change ${changeName}`)
  const p = await readProgress(projectDir, changeName)
  const sd = p.stages.archive
  const syncIdx = sd.steps.findIndex(s => s.name === 'sync-module-docs')
  for (let i = 0; i < syncIdx; i++) {
    sd.steps[i].status = 'completed'; sd.steps[i].completedAt = new Date().toISOString()
  }
  // 前两步 completed 后，--done 会推进到 sync-module-docs（pending），requiresWait 门控应拒绝直接 --done
  await writeProgress(projectDir, changeName, p)

  const refuse = run(`node "${binCLI}" --dir "${projectDir}" run archive --done --output "同步完成" --change ${changeName}`)
  assert(refuse.includes('必须先等待用户输入') || refuse.includes('不能直接') || refuse.includes('等待用户确认'), 'requiresWait 步骤直接 --done 被拒')

  // --done --answer "确认写入"：complete.js doneAnswer 自动补 waitAnswer，可推进（agent 写卡片后一步完成）
  const ok = run(`node "${binCLI}" --dir "${projectDir}" run archive --done --answer "确认写入" --output "已写入模块卡片" --change ${changeName}`)
  const p2 = await readProgress(projectDir, changeName)
  const step = p2.stages.archive.steps[syncIdx]
  assert(step.status === 'completed', `--done --answer 后 sync-module-docs completed（实际 ${step.status}）`)

  cleanup(projectDir)
}

// ── Summary ──
console.log(`\n${'='.repeat(50)}`)
if (failed === 0) {
  console.log(`✅ 通过: ${passed}  ❌ 失败: ${failed}`)
  console.log(`${'='.repeat(50)}`)
  console.log('\n🎉 archive sync-module-docs requiresWait 测试全部通过!')
} else {
  console.log(`✅ 通过: ${passed}  ❌ 失败: ${failed}`)
  console.log(`${'='.repeat(50)}`)
}
process.exit(failed > 0 ? 1 : 0)
