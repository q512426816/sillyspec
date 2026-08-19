/**
 * 坑 archive-step3-wait-answer-hint-late 回归：--answer 要求的前置提示
 *
 * 背景：requiresWait 步骤（如 archive step3 sync-module-docs）标 --wait 后，agent 习惯性
 * 直接 --done——旧逻辑要么静默跳过 waiting 步骤推进后续步骤，要么到别处报错才知道要 --answer。
 *
 * 锁定语义：
 * 1. waiting 步骤存在时普通 --done 被拒，报错直接给 --continue --answer / --done --answer 两条出路
 * 2. --done --answer 不受影响（坑1 既有行为）
 * 3. waitStep 标记 --wait 时，requiresWait 步骤当场提示「--answer 后回待执行仍需 --done 收尾」+ 一步完成命令
 * 4. _getNextSuggestion 对 waiting 阶段建议 --continue --answer（不再泛泛「继续执行下一步」）
 */
import { join, resolve, dirname } from 'path'
import { mkdirSync, writeFileSync, rmSync } from 'fs'
import { fileURLToPath, pathToFileURL } from 'url'
import { execSync } from 'child_process'
import { tmpdir } from 'os'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const root = resolve(__dirname, '..')
const binCLI = join(root, 'bin', 'sillyspec.js')

function imp(p) { return import(pathToFileURL(p).href) }

let passed = 0, failed = 0
function assert(cond, msg) {
  if (cond) { passed++; console.log(`  ✅ PASS: ${msg}`) }
  else { failed++; console.log(`  ❌ FAIL: ${msg}`) }
}
function run(cmd) {
  try { return execSync(cmd, { encoding: 'utf8', timeout: 30000 }) }
  catch (e) { return (e.stdout || '') + (e.stderr || '') }
}
function tmpDir(label) {
  const dir = join(tmpdir(), `sillyspec-wait-frontload-${label}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`)
  mkdirSync(dir, { recursive: true })
  return dir
}
const cleanup = d => { try { rmSync(d, { recursive: true, force: true }) } catch {} }

async function readProgress(projectDir, changeName) {
  const { ProgressManager } = await imp(join(root, 'src', 'progress.js'))
  return await new ProgressManager().read(projectDir, changeName)
}
async function writeProgress(projectDir, changeName, progress) {
  const { ProgressManager } = await imp(join(root, 'src', 'progress.js'))
  await new ProgressManager()._write(projectDir, progress, changeName)
}

function setupArchive(changeName) {
  const projectDir = tmpDir('proj')
  run(`node "${binCLI}" init "${projectDir}"`)
  const changeDir = join(projectDir, '.sillyspec', 'changes', changeName)
  mkdirSync(changeDir, { recursive: true })
  writeFileSync(join(changeDir, 'design.md'), '# Design\n## 背景\nT\n## 文件变更清单\n| 操作 | 文件 |\n## 风险登记\n| 编号 | 风险 |\n## 自审\nOK\n')
  writeFileSync(join(changeDir, 'proposal.md'), '# Proposal\n## 动机\nT\n## 不在范围内\n- N\n## 成功标准\nW\n')
  writeFileSync(join(changeDir, 'requirements.md'), '# Requirements\n## 角色\n| 角色 |\n## 功能需求\n### FR-01: T\nG\nW\nT\n')
  writeFileSync(join(changeDir, 'plan.md'), '# Plan\n- [x] task-01 done\n')
  return { projectDir, changeDir }
}

const CN = '2026-08-19-wait-frontload'
console.log('\n=== 1. waiting 步骤存在 → 普通 --done 被拒 + 前置 --answer 出路 ===')
{
  const { projectDir } = setupArchive(CN)
  run(`node "${binCLI}" --dir "${projectDir}" run archive --change ${CN}`)
  const p = await readProgress(projectDir, CN)
  const sd = p.stages.archive
  const syncIdx = sd.steps.findIndex(s => s.name === 'sync-module-docs')
  for (let i = 0; i <= syncIdx; i++) {
    if (i < syncIdx) { sd.steps[i].status = 'completed'; sd.steps[i].completedAt = new Date().toISOString() }
    else {
      sd.steps[i].status = 'waiting'
      sd.steps[i].waitReason = '等待用户确认模块文档同步'
      sd.steps[i].waitOptions = '["确认写入","跳过同步"]'
      sd.steps[i].waitedAt = new Date().toISOString()
    }
  }
  await writeProgress(projectDir, CN, p)

  // 普通 --done（无 --answer）→ 拒绝 + 两条出路前置给出
  const out = run(`node "${binCLI}" --dir "${projectDir}" run archive --done --output "同步完成" --change ${CN}`)
  assert(out.includes('处于等待用户输入状态') || out.includes('waiting'), '普通 --done 被拒（waiting 守卫）')
  assert(out.includes('--continue --answer'), '报错前置给出 --continue --answer 恢复命令')
  assert(out.includes('--done --answer'), '报错前置给出 --done --answer 一步完成命令')

  // 步骤未被静默跳过推进：sync-module-docs 仍 waiting、后续步骤仍 pending
  const p2 = await readProgress(projectDir, CN)
  const sd2 = p2.stages.archive
  assert(sd2.steps[syncIdx].status === 'waiting', 'waiting 步骤未被跳过（仍 waiting）')
  assert(sd2.steps[syncIdx + 1].status === 'pending', '后续步骤未被推进（仍 pending）')

  // --done --answer 一步完成（坑1 既有行为不回归）
  const ok = run(`node "${binCLI}" --dir "${projectDir}" run archive --done --answer "确认写入" --output "已写入模块卡片" --change ${CN}`)
  const p3 = await readProgress(projectDir, CN)
  assert(p3.stages.archive.steps[syncIdx].status === 'completed', '--done --answer 一步完成（坑1 零回归）')
  assert(ok.includes('已补回答并拉回待完成') || !ok.includes('处于等待用户输入状态'), '--answer 路径不被守卫误拦')
  cleanup(projectDir)
}

console.log('\n=== 2. waitStep 标记 --wait 当场前置 requiresWait 语义 ===')
{
  const { projectDir } = setupArchive(CN + '2')
  const CN2 = CN + '2'
  run(`node "${binCLI}" --dir "${projectDir}" run archive --change ${CN2}`)
  const p = await readProgress(projectDir, CN2)
  const sd = p.stages.archive
  const syncIdx = sd.steps.findIndex(s => s.name === 'sync-module-docs')
  for (let i = 0; i < syncIdx; i++) { sd.steps[i].status = 'completed'; sd.steps[i].completedAt = new Date().toISOString() }
  await writeProgress(projectDir, CN2, p)

  const out = run(`node "${binCLI}" --dir "${projectDir}" run archive --wait --reason "等待用户确认模块文档同步" --options "确认写入,跳过同步" --output "diff 摘要" --change ${CN2}`)
  assert(out.includes('已暂停等待'), '--wait 正常落 waiting')
  assert(out.includes('requiresWait'), '当场标注本步为 requiresWait 步骤')
  assert(out.includes('回到待执行') && out.includes('--done 收尾'), '前置说明「--answer 后回待执行仍需 --done 收尾」')
  assert(out.includes('--done --answer'), '前置给出一步完成命令')
  cleanup(projectDir)
}

console.log('\n=== 3. _getNextSuggestion 对 waiting 阶段建议 --continue --answer ===')
{
  const { projectDir } = setupArchive(CN + '3')
  const CN3 = CN + '3'
  run(`node "${binCLI}" --dir "${projectDir}" run archive --change ${CN3}`)
  const p = await readProgress(projectDir, CN3)
  const sd = p.stages.archive
  const syncIdx = sd.steps.findIndex(s => s.name === 'sync-module-docs')
  for (let i = 0; i <= syncIdx; i++) {
    if (i < syncIdx) { sd.steps[i].status = 'completed'; sd.steps[i].completedAt = new Date().toISOString() }
    else { sd.steps[i].status = 'waiting'; sd.steps[i].waitReason = '等待用户确认模块文档同步'; sd.steps[i].waitedAt = new Date().toISOString() }
  }
  await writeProgress(projectDir, CN3, p)
  const { ProgressManager } = await imp(join(root, 'src', 'progress.js'))
  const pm = new ProgressManager()
  const fresh = pm.read(projectDir, CN3)
  const sugg = pm._getNextSuggestion(fresh)
  assert(sugg && sugg.command && sugg.command.includes('--continue --answer'), 'suggestion 命令含 --continue --answer')
  assert(sugg.text.includes('等待用户输入'), 'suggestion 文案点明等待用户输入')
  cleanup(projectDir)
}

console.log(`\n${'='.repeat(50)}`)
console.log(`✅ 通过: ${passed}  ❌ 失败: ${failed}`)
console.log('='.repeat(50))
if (failed > 0) process.exit(1)
