/**
 * archive sync-module-docs conditionalWait 回归测试（坑 verify-archive-flow-pitfalls 坑4 →
 * 坑 archive-subconfirm-redundant 2026-08-23 演进）
 *
 * 坑4（历史）：步骤无 wait 机制时 --continue 直接标 completed，agent 无机会写模块卡片——曾用
 * requiresWait:true 硬门修（三段式 --wait → --continue --answer → --done）。
 * 坑 archive-subconfirm-redundant（2026-08-23 实证）：硬门与 verify 文档同步阻断门、归档移动前
 * 死信校验、「确认归档 --confirm」四层确认重复，交互碎——降级 conditionalWait（brainstorm-auto
 * 先例）：常规同步 agent 直接写入 + --done（写入动作在 --done 前，坑4 不回归）；仅异常
 * （needs_review/未映射/标记缺失）才 --wait 请用户裁决。
 *
 * 本测试锁三个不变量：
 *  1. 步骤定义 conditionalWait===true 且非 requiresWait（硬门已撤）
 *  2. 常规路径：直接 --done（不带 --answer）推进 completed——agent 写入在 --done 前完成
 *  3. 异常路径：--wait → --continue --answer 后回到 pending（写入后再 --done）仍可用
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
// Test 1: 步骤定义 conditionalWait===true、requiresWait 已撤（硬门 → 软门）
// ================================================================
console.log('\n=== Test 1: sync-module-docs 步骤 conditionalWait（非 requiresWait 硬门） ===')
{
  const { stageRegistry } = await imp(join(root, 'src', 'stages', 'index.js'))
  const step = stageRegistry.archive.steps.find(s => s.name === 'sync-module-docs')
  assert(!!step, 'archive 有 sync-module-docs 步骤')
  assert(step.conditionalWait === true, `conditionalWait===true（实际 ${step.conditionalWait}）——常规路径直接 --done`)
  assert(step.requiresWait !== true, `requiresWait 硬门已撤（实际 ${step.requiresWait}）——坑 archive-subconfirm-redundant`)
}

// ================================================================
// Test 2: 常规路径直接 --done 推进（agent 写入在 --done 前；坑4 的「无机会写入」不回归——
//         写入是 agent 在本步内做的，CLI 不再强制 --answer 三段式）
// ================================================================
console.log('\n=== Test 2: 常规路径直接 --done 推进（无子确认） ===')
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
  assert(syncIdx !== -1, '找到 sync-module-docs 步骤')
  for (let i = 0; i < syncIdx; i++) {
    sd.steps[i].status = 'completed'; sd.steps[i].completedAt = new Date().toISOString()
  }
  await writeProgress(projectDir, changeName, p)

  // 常规同步：agent 已写入卡片（本测试不真写卡片——CLI 不校验写入产物，坑4 的写入时机由
  // prompt 约定 agent 在 --done 前完成），直接 --done 不被硬门拒
  const ok = run(`node "${binCLI}" --dir "${projectDir}" run archive --done --output "已写入模块卡片 + diff 摘要" --change ${changeName}`)
  const p2 = await readProgress(projectDir, changeName)
  const step = p2.stages.archive.steps[syncIdx]
  assert(step.status === 'completed', `常规 --done（无 --answer）直接推进 completed（实际 ${step.status}；输出 ${ok.slice(0, 120)}）`)
  assert(!ok.includes('必须先等待用户输入'), '无 requiresWait 硬门拦截')

  cleanup(projectDir)
}

// ================================================================
// Test 3: 异常路径 --wait → --continue --answer 回 pending（写入后再 --done）仍可用
// ================================================================
console.log('\n=== Test 3: 异常路径 --wait → --continue --answer → pending → --done ===')
{
  const projectDir = tmpDir('cont')
  run(`node "${binCLI}" init "${projectDir}"`)
  const changeName = '2026-07-31-syncmd-test'
  const changeDir = join(projectDir, '.sillyspec', 'changes', changeName)
  mkdirSync(changeDir, { recursive: true })
  writeFileSync(join(changeDir, 'plan.md'), '# Plan\n\n## Wave 1\n- [x] task-01: a\n')
  writeFileSync(join(changeDir, 'module-impact.md'), '# 模块影响分析（Module Impact）— test\n\n| 模块 | 影响类型 |\n|------|----------|\n| runtime | 逻辑变更 |\n')

  run(`node "${binCLI}" --dir "${projectDir}" run archive --change ${changeName}`)
  const p = await readProgress(projectDir, changeName)
  const sd = p.stages.archive
  assert(sd && sd.steps, 'archive steps 已初始化')

  const syncIdx = sd.steps.findIndex(s => s.name === 'sync-module-docs')
  for (let i = 0; i < syncIdx; i++) {
    sd.steps[i].status = 'completed'; sd.steps[i].completedAt = new Date().toISOString()
  }
  // 异常形态：needs_review 影响项 → agent --wait 请用户裁决
  sd.steps[syncIdx].status = 'waiting'
  sd.steps[syncIdx].waitReason = '等待用户裁决模块文档同步异常'
  sd.steps[syncIdx].waitOptions = '["确认写入","跳过同步"]'
  sd.steps[syncIdx].waitedAt = new Date().toISOString()
  sd.steps[syncIdx].output = 'diff 摘要 + 异常说明'
  await writeProgress(projectDir, changeName, p)

  const out = run(`node "${binCLI}" --dir "${projectDir}" run archive --continue --answer "确认写入" --change ${changeName}`)
  assert(out.includes('回到当前步骤') || out.includes('🔁'), 'continue 输出含「回到当前步骤」')
  const p2 = await readProgress(projectDir, changeName)
  const step = p2.stages.archive.steps[syncIdx]
  assert(step.status === 'pending', `裁决后回到本步（pending，可写卡片）——实际 ${step.status}`)
  assert(step.waitAnswer === '确认写入', 'waitAnswer === 确认写入')

  // 写入完成后 --done 推进
  run(`node "${binCLI}" --dir "${projectDir}" run archive --done --output "已按裁决写入" --change ${changeName}`)
  const p3 = await readProgress(projectDir, changeName)
  assert(p3.stages.archive.steps[syncIdx].status === 'completed', '写入后 --done 推进 completed')

  cleanup(projectDir)
}

// ── Summary ──
console.log(`\n${'='.repeat(50)}`)
console.log(`✅ 通过: ${passed}  ❌ 失败: ${failed}`)
console.log(`${'='.repeat(50)}`)
if (failed > 0) process.exit(1)
