/**
 * archive 阶段「确认归档」收尾 CLI 行为测试（run archive --done --confirm）。
 *
 * 从 _completeStepForTest 内部函数迁移为 CLI 子进程测试。锁住 archive 确认归档分支的对外行为：
 *   - 确认归档 + --confirm → archiveChangeDirectory 把 changes/<cn>/ 移到
 *     changes/archive/<归档日期>-<纯描述>/（源名前导日期去重，避免双日期）
 *   - 归档后推荐文档校验（design.md / module-impact.md）齐全 → ✅；缺失 → ⚠️ 但不阻断
 *   - 缺 --confirm → 不移动、step 回退 pending、警告
 *   - 归档清理该 change 的 execute/stage-review runId marker
 *
 * 内部返回值 {stageCompleted:false, currentIdx, nextPendingIdx} 不可直接断言，改断 DB 步骤状态。
 */
import { writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { archiveDestDirName } from '../src/stage-contract.js'
import { makeRepo, initChange, seedStage, runStage, runCLI, cleanup, report } from './_cli-step-harness.mjs'
import { ProgressManager } from '../src/progress.js'

const count = { passed: 0, failed: 0, failures: [] }
const assert = (cond, msg) => { cond ? (count.passed++, console.log(`  ✅ PASS: ${msg}`)) : (count.failed++, count.failures.push(msg), console.log(`  ❌ FAIL: ${msg}`)) }

const ARCHIVE_STEPS = (lastStatus) => [
  { name: '任务完成度检查', status: 'completed' },
  { name: 'extract-module-impact', status: 'completed' },
  { name: 'sync-module-docs', status: 'completed' },
  { name: '确认归档', status: 'pending' },
  { name: '更新路线图和提交', status: lastStatus },
]

// 让 CLI 初始化 archive 步骤 schema，再 seedStage 覆盖为「确认归档 pending」。
async function seedArchiveToConfirm(cwd, specBase, cn, lastStatus = 'pending') {
  const pm = await initChange(cwd, specBase, cn)
  runCLI(['--dir', cwd, 'run', 'archive', '--change', cn], { cwd })
  return seedStage(pm, cwd, cn, 'archive', ARCHIVE_STEPS(lastStatus))
}

console.log('=== archive 确认归档 CLI 行为 ===\n')

// ── Case 1: --confirm + 推荐文档齐全 → 归档移动 + ✅ 校验通过 + 非末步 ──
console.log('--- Case 1: confirm + 推荐文档齐全 → 移动 + ✅ 通过 ---')
{
  const { cwd, specBase } = makeRepo('cli-archive-1-')
  const cn = '2026-07-25-archive-demo'
  await seedArchiveToConfirm(cwd, specBase, cn)
  const changeDir = join(specBase, 'changes', cn)
  writeFileSync(join(changeDir, 'plan.md'), '# Plan\n\n## Wave 1\n\n- [x] task-01: a\n')
  writeFileSync(join(changeDir, 'design.md'), '# Design\n')
  writeFileSync(join(changeDir, 'module-impact.md'), '# 模块影响分析\n')

  const r = runStage('archive', cn, cwd, { done: true, confirm: true, output: '确认归档完成' })

  const date = new Date().toISOString().slice(0, 10)
  const destName = archiveDestDirName(date, cn)
  const archivedDir = join(specBase, 'changes', 'archive', destName)
  assert(r.status === 0, `exit 0（实际 ${r.status}，输出尾：${r.combined.slice(-120)}）`)
  assert(existsSync(archivedDir), `变更目录已移到 archive/${destName}/（源名 ${cn} 去重日期后）`)
  assert(!existsSync(changeDir), '原 changes/<cn>/ 已移走')
  assert(existsSync(join(archivedDir, 'plan.md')), '归档目录保留 plan.md')
  assert(r.combined.includes('已归档'), 'stdout 含「已归档」')
  assert(r.combined.includes('归档校验通过'), '推荐文档齐全 → ✅ 归档校验通过')

  const after = await new ProgressManager({ specDir: specBase }).read(cwd, cn)
  assert(after.stages.archive.steps[3].status === 'completed', 'DB: 确认归档 step 已标 completed')
  assert(after.stages.archive.steps[4].status === 'pending', 'DB: 更新路线图和提交仍 pending（非末步推进）')
}

// ── Case 2: --confirm + 缺 module-impact.md → ⚠️ 警告但不阻断，仍移动 ──
console.log('\n--- Case 2: confirm + 缺推荐文档 → ⚠️ 警告不阻断 ---')
{
  const { cwd, specBase } = makeRepo('cli-archive-2-')
  const cn = '2026-07-25-archive-miss'
  await seedArchiveToConfirm(cwd, specBase, cn)
  const changeDir = join(specBase, 'changes', cn)
  writeFileSync(join(changeDir, 'plan.md'), '# Plan\n')
  writeFileSync(join(changeDir, 'design.md'), '# Design\n')

  const r = runStage('archive', cn, cwd, { done: true, confirm: true, output: '确认归档' })

  const date = new Date().toISOString().slice(0, 10)
  assert(r.status === 0, `缺推荐文档 exit 0（实际 ${r.status}）`)
  assert(existsSync(join(specBase, 'changes', 'archive', archiveDestDirName(date, cn))), '缺推荐文档仍完成归档移动')
  assert(r.combined.includes('归档校验警告'), 'stdout 含归档校验警告')
  assert(r.combined.includes('module-impact.md'), '警告点名缺失的 module-impact.md')
}

// ── Case 3: 缺 --confirm → 不移动、step 回退 pending、警告 ──
console.log('\n--- Case 3: 缺 --confirm → 不移动 + step 回退 ---')
{
  const { cwd, specBase } = makeRepo('cli-archive-3-')
  const cn = '2026-07-25-archive-noconfirm'
  await seedArchiveToConfirm(cwd, specBase, cn)
  const changeDir = join(specBase, 'changes', cn)
  writeFileSync(join(changeDir, 'plan.md'), '# Plan\n')

  const r = runStage('archive', cn, cwd, { done: true, output: '想归档' })

  assert(existsSync(changeDir), '缺 confirm → 不移动，changes/<cn>/ 仍在')
  assert(r.combined.includes('请添加 --confirm') || r.combined.includes('--confirm'), 'stdout 含「请添加 --confirm」提示')

  const after = await new ProgressManager({ specDir: specBase }).read(cwd, cn)
  assert(after.stages.archive.steps[3].status === 'pending', 'DB: 缺 confirm 时确认归档 step 回退为 pending')
}

// ── Case 4: 归档时清理该 change 的 runId marker（execute / stage-review）──
console.log('\n--- Case 4: 归档清理 execute/stage-review runId marker ---')
{
  const { cwd, specBase } = makeRepo('cli-archive-4-')
  const cn = '2026-07-25-archive-marker'
  await seedArchiveToConfirm(cwd, specBase, cn)
  const changeDir = join(specBase, 'changes', cn)
  writeFileSync(join(changeDir, 'plan.md'), '# Plan\n')
  writeFileSync(join(changeDir, 'design.md'), '# Design\n')
  // 预置该 change 的 execute + stage-review marker（归档后应被清理）
  const runtimeRoot = join(specBase, '.runtime')
  mkdirSync(runtimeRoot, { recursive: true })
  const execMarker = join(runtimeRoot, `current-execute-run-id-${cn}`)
  const stageMarker = join(runtimeRoot, `current-stage-review-run-id-execute-${cn}`)
  // 其他 change 的 marker（不应被误删）
  const otherExecMarker = join(runtimeRoot, 'current-execute-run-id-other-change')
  writeFileSync(execMarker, 'exec-1\n')
  writeFileSync(stageMarker, 'review-1\n')
  writeFileSync(otherExecMarker, 'exec-2\n')

  const r = runStage('archive', cn, cwd, { done: true, confirm: true, output: '确认归档' })

  assert(r.status === 0, `exit 0（实际 ${r.status}）`)
  assert(!existsSync(execMarker), `execute marker 已清理（current-execute-run-id-${cn}）`)
  assert(!existsSync(stageMarker), `stage-review marker 已清理（current-stage-review-run-id-execute-${cn}）`)
  assert(existsSync(otherExecMarker), '其他 change 的 marker 不受影响')
}

cleanup()
report(count.passed, count.failed, count.failures)
