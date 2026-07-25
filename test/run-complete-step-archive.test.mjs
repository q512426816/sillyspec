/**
 * completeStep characterization — archive 阶段「确认归档」收尾处理器
 *
 * 行为保持重构的回归网。直接驱动 _completeStepForTest（有先例：worktree-guard.js
 * 的 _queryDbFirstCellForTest），避免跑完整 5 步 archive，专注锁住 completeStep 内
 * archive 分支（run.js:2990-3017）的现有行为：
 *   - 确认归档 + --confirm → archiveChangeDirectory 把 changes/<cn>/ 移到
 *     changes/archive/<date>-<cn>/，返回 {stageCompleted:false, nextPendingIdx:4}（非末步）
 *   - 归档后推荐文档校验（design.md / module-impact.md）齐全 → ✅；缺失 → ⚠️ 但不阻断
 *   - 缺 --confirm → 不移动、step 回退 pending、警告、返回 nextPendingIdx=3
 *
 * 断言三件套：DB 状态（pm.read）+ 关键 stdout + 产物文件存在性。
 */
import { writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { _completeStepForTest } from '../src/run.js'
import { runCapturing, makeRepo, initChange, seedStage, cleanup, report } from './_complete-step-harness.mjs'

const count = { passed: 0, failed: 0, failures: [] }
const assert = (cond, msg) => { cond ? (count.passed++, console.log(`  ✅ PASS: ${msg}`)) : (count.failed++, count.failures.push(msg), console.log(`  ❌ FAIL: ${msg}`)) }

const ARCHIVE_STEPS = (lastStatus) => [
  { name: '任务完成度检查', status: 'completed' },
  { name: 'extract-module-impact', status: 'completed' },
  { name: 'sync-module-docs', status: 'completed' },
  { name: '确认归档', status: 'pending' },
  { name: '更新路线图和提交', status: lastStatus },
]

console.log('=== completeStep characterization: archive 确认归档 ===\n')

// ── Case 1: --confirm + 推荐文档齐全 → 归档移动 + ✅ 校验通过 + 非末步返回 ──
console.log('--- Case 1: confirm + 推荐文档齐全 → 移动 + ✅ 通过 ---')
{
  const { cwd, specBase } = makeRepo('cs-archive-1-')
  const cn = '2026-07-25-archive-demo'
  const pm = await initChange(cwd, specBase, cn)
  const changeDir = join(specBase, 'changes', cn)
  writeFileSync(join(changeDir, 'plan.md'), '# Plan\n\n## Wave 1\n\n- [x] task-01: a\n')
  writeFileSync(join(changeDir, 'design.md'), '# Design\n')
  writeFileSync(join(changeDir, 'module-impact.md'), '# 模块影响分析\n')
  const progress = await seedStage(pm, cwd, cn, 'archive', ARCHIVE_STEPS('pending'))

  const r = await runCapturing(() =>
    _completeStepForTest(pm, progress, 'archive', cwd, '确认归档完成', null,
      { confirm: true, changeName: cn, printNext: false }))

  const date = new Date().toISOString().slice(0, 10)
  const archivedDir = join(specBase, 'changes', 'archive', `${date}-${cn}`)
  assert(!r.error, 'confirm 归档不应 process.exit')
  assert(existsSync(archivedDir), `变更目录已移到 archive/${date}-${cn}/`)
  assert(!existsSync(changeDir), '原 changes/<cn>/ 已移走')
  assert(existsSync(join(archivedDir, 'plan.md')), '归档目录保留 plan.md')
  assert(r.stdout.includes('已归档'), 'stdout 含「已归档」')
  assert(r.stdout.includes('归档校验通过'), '推荐文档齐全 → ✅ 归档校验通过')
  assert(r.result && r.result.stageCompleted === false, '非末步 → stageCompleted:false')
  assert(r.result && r.result.currentIdx === 3, 'currentIdx=3（确认归档）')
  assert(r.result && r.result.nextPendingIdx === 4, 'nextPendingIdx=4（更新路线图和提交）')

  const after = await pm.read(cwd, cn)
  assert(after.stages.archive.steps[3].status === 'completed', 'DB: 确认归档 step 已标 completed')
}

// ── Case 2: --confirm + 缺 module-impact.md → ⚠️ 警告但不阻断，仍移动 ──
console.log('\n--- Case 2: confirm + 缺推荐文档 → ⚠️ 警告不阻断 ---')
{
  const { cwd, specBase } = makeRepo('cs-archive-2-')
  const cn = '2026-07-25-archive-miss'
  const pm = await initChange(cwd, specBase, cn)
  const changeDir = join(specBase, 'changes', cn)
  writeFileSync(join(changeDir, 'plan.md'), '# Plan\n')
  writeFileSync(join(changeDir, 'design.md'), '# Design\n')
  const progress = await seedStage(pm, cwd, cn, 'archive', ARCHIVE_STEPS('pending'))

  const r = await runCapturing(() =>
    _completeStepForTest(pm, progress, 'archive', cwd, '确认归档', null,
      { confirm: true, changeName: cn, printNext: false }))

  const date = new Date().toISOString().slice(0, 10)
  assert(!r.error, '缺推荐文档不应 process.exit（非阻断）')
  assert(existsSync(join(specBase, 'changes', 'archive', `${date}-${cn}`)), '缺推荐文档仍完成归档移动')
  assert(r.stdout.includes('归档校验警告'), 'stdout 含归档校验警告')
  assert(r.stdout.includes('module-impact.md'), '警告点名缺失的 module-impact.md')
}

// ── Case 3: 缺 --confirm → 不移动、step 回退 pending、警告、nextPendingIdx=3 ──
console.log('\n--- Case 3: 缺 --confirm → 不移动 + step 回退 ---')
{
  const { cwd, specBase } = makeRepo('cs-archive-3-')
  const cn = '2026-07-25-archive-noconfirm'
  const pm = await initChange(cwd, specBase, cn)
  const changeDir = join(specBase, 'changes', cn)
  writeFileSync(join(changeDir, 'plan.md'), '# Plan\n')
  const progress = await seedStage(pm, cwd, cn, 'archive', ARCHIVE_STEPS('pending'))

  const r = await runCapturing(() =>
    _completeStepForTest(pm, progress, 'archive', cwd, '想归档', null,
      { confirm: false, changeName: cn, printNext: false }))

  assert(!r.error, '缺 confirm 不应 process.exit（优雅返回）')
  assert(existsSync(changeDir), '缺 confirm → 不移动，changes/<cn>/ 仍在')
  assert(r.stdout.includes('请添加 --confirm'), 'stdout 含「请添加 --confirm」提示')
  assert(r.result && r.result.stageCompleted === false, 'stageCompleted:false')
  assert(r.result && r.result.nextPendingIdx === 3, 'nextPendingIdx=3（回退到确认归档）')

  const after = await pm.read(cwd, cn)
  assert(after.stages.archive.steps[3].status === 'pending', 'DB: 缺 confirm 时确认归档 step 回退为 pending')
}

cleanup()
report(count.passed, count.failed, count.failures)
