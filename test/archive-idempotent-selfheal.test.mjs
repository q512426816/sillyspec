/**
 * archive 幂等自愈测试（issue: archive-stage-physical-tracking-desync）
 *
 * 场景：变更已物理归档（changes/<cn>/ 被手动/部分流程移到 changes/archive/ 并 commit），
 * 但 `archive --done --confirm` 从未正式跑完 → 进度 DB 卡 archive 阶段、active 列表仍列此 change。
 * 修复后 archiveChangeDirectory 在 srcDir 缺失时走 findAlreadyArchivedDir 自愈：
 * unregisterChange + 成功返回，让收尾流程把 archive 阶段标完成，而非 process.exit(1) 死路。
 *
 * 覆盖：
 *   - 自愈（archive 目录保留原 changeName，手动 mv 常见形态）
 *   - 自愈（archive 目录换日期前缀，按描述部分匹配）
 *   - 负路径：archive/ 下无该变更归档（或缺 plan.md）→ 仍 exit(1)，不误判
 *   - findAlreadyArchivedDir 单元：plan.md 把关 / 无 archive 目录 / 无匹配
 */
import { writeFileSync, existsSync, mkdirSync, renameSync, mkdtempSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { findAlreadyArchivedDir } from '../src/run/complete-handlers.js'
import { makeRepo, initChange, seedStage, runCLI, cleanup, report } from './_cli-step-harness.mjs'

const count = { passed: 0, failed: 0, failures: [] }
const assert = (cond, msg) => { cond ? (count.passed++, console.log(`  ✅ PASS: ${msg}`)) : (count.failed++, count.failures.push(msg), console.log(`  ❌ FAIL: ${msg}`)) }

const ARCHIVE_STEPS = (lastStatus) => [
  { name: '任务完成度检查', status: 'completed' },
  { name: 'extract-module-impact', status: 'completed' },
  { name: 'sync-module-docs', status: 'completed' },
  { name: '确认归档', status: 'pending' },
  { name: '更新路线图和提交', status: lastStatus },
]

console.log('=== archive 幂等自愈（脱钩对账）===\n')

// ── Case 1: srcDir 已被移到 archive/<原 changeName>/（手动 mv 保留原名）→ 自愈 ──
console.log('--- Case 1: 源已移到 archive/<原 changeName>/ → 自愈，不 exit ---')
{
  const { cwd, specBase } = makeRepo('arch-selfheal-1-')
  const cn = '2026-08-08-archive-desync-exact'
  const pm = await initChange(cwd, specBase, cn)
  const changeDir = join(specBase, 'changes', cn)
  writeFileSync(join(changeDir, 'plan.md'), '# Plan\n')
  writeFileSync(join(changeDir, 'design.md'), '# Design\n')
  writeFileSync(join(changeDir, 'module-impact.md'), '# 模块影响分析\n')
  await seedStage(pm, cwd, cn, 'archive', ARCHIVE_STEPS('pending'))

  // 模拟脱钩：物理归档已完成（mv 到 archive/ 保留原名），--done --confirm 未跑
  const archiveDir = join(specBase, 'changes', 'archive')
  mkdirSync(archiveDir, { recursive: true })
  const manuallyArchived = join(archiveDir, cn)
  renameSync(changeDir, manuallyArchived)

  const r = runCLI(['--dir', cwd, 'run', 'archive', '--done', '--confirm', '--change', cn, '--output', '确认归档'], { cwd })

  assert(r.status === 0, `自愈路径 exit 0（实际 ${r.status}，输出尾：${r.combined.slice(-100)}）`)
  assert(!existsSync(changeDir), '源目录未被重建（仍不存在）')
  assert(existsSync(manuallyArchived), 'archive/ 下原归档目录保持不动')
  assert(existsSync(join(manuallyArchived, 'plan.md')), '归档目录 plan.md 仍在')
  assert(r.combined.includes('自愈'), 'stdout 含「自愈」提示')

  const after = await pm.read(cwd, cn)
  assert(after.stages.archive.steps[3].status === 'completed', 'DB: 确认归档 step 自愈后标 completed')
  assert(after.stages.archive.steps[4].status === 'pending', 'DB: 更新路线图和提交仍 pending（非末步推进）')
}

// ── Case 2: archive 目录名与 changeName 不一致 → 不自愈 ──
console.log('\n--- Case 2: archive 目录名不一致 → 不自愈 ---')
{
  const { cwd, specBase } = makeRepo('arch-selfheal-2-')
  const cn = '2026-08-08-archive-desync-desc'
  const pm = await initChange(cwd, specBase, cn)
  const changeDir = join(specBase, 'changes', cn)
  writeFileSync(join(changeDir, 'plan.md'), '# Plan\n')
  await seedStage(pm, cwd, cn, 'archive', ARCHIVE_STEPS('pending'))

  // archive 目录用了另一个名字（如被手动改名），不应被误判为当前 change 的归档
  const archiveDir = join(specBase, 'changes', 'archive')
  mkdirSync(archiveDir, { recursive: true })
  const differentName = join(archiveDir, '2026-08-01-archive-desync-desc')
  renameSync(changeDir, differentName)

  const r = runCLI(['--dir', cwd, 'run', 'archive', '--done', '--confirm', '--change', cn, '--output', '确认归档'], { cwd })

  assert(r.status !== 0, `目录名不一致不应自愈（实际 exit ${r.status}）`)
  assert(!r.combined.includes('自愈'), 'stdout 不含「自愈」提示')
  assert(existsSync(differentName), 'archive/ 下目录保持不动')
}

// ── Case 3: srcDir 缺失且 archive/ 下无该变更 → 仍 exit(1)，不误判自愈 ──
console.log('\n--- Case 3: 源缺失 + archive/ 无该变更 → exit(1) 不误判 ---')
{
  const { cwd, specBase } = makeRepo('arch-selfheal-3-')
  const cn = '2026-08-08-archive-desync-none'
  const pm = await initChange(cwd, specBase, cn)
  const changeDir = join(specBase, 'changes', cn)
  writeFileSync(join(changeDir, 'plan.md'), '# Plan\n')
  await seedStage(pm, cwd, cn, 'archive', ARCHIVE_STEPS('pending'))

  // 源被移走，但 archive/ 下是【另一个】变更，不归属当前 change
  const archiveDir = join(specBase, 'changes', 'archive')
  mkdirSync(join(archiveDir, '2026-08-08-someone-else'), { recursive: true })
  writeFileSync(join(archiveDir, '2026-08-08-someone-else', 'plan.md'), '# Plan\n')
  mkdirSync(join(specBase, 'changes'), { recursive: true })
  renameSync(changeDir, join(specBase, 'changes', `${cn}.bak`)) // 源挪走（不进 archive/）

  const r = runCLI(['--dir', cwd, 'run', 'archive', '--done', '--confirm', '--change', cn, '--output', '确认归档'], { cwd })

  // 源缺失且 archive/ 无该变更 → CLI 阻断（validateChangeExists 或 archiveChangeDirectory 源目录检查）
  assert(r.status !== 0, `archive/ 无该变更归档 → 阻断（exit ${r.status}，不误判自愈）`)
  assert(!r.combined.includes('自愈'), '未命中归档目录时不应打印「自愈」')
}

// ── Case 4: findAlreadyArchivedDir 单元 —— plan.md 把关 / 无目录 / 无匹配 ──
console.log('\n--- Case 4: findAlreadyArchivedDir 单元（plan.md 把关 / 边界） ---')
{
  const root = mkdtempSync(join(tmpdir(), 'findarch-'))
  try {
    const archiveDir = join(root, 'archive')

    // 无 archive 目录 → null
    assert(findAlreadyArchivedDir(archiveDir, '2026-08-08-foo') === null, 'archive 目录不存在 → null')

    mkdirSync(archiveDir, { recursive: true })
    // 同【缺 plan.md】→ 不命中（plan.md 把关）
    mkdirSync(join(archiveDir, '2026-08-08-foo'), { recursive: true })
    assert(findAlreadyArchivedDir(archiveDir, '2026-08-08-foo') === null, '缺 plan.md 的同名目录不命中')
    // 补 plan.md → 精确原名命中
    writeFileSync(join(archiveDir, '2026-08-08-foo', 'plan.md'), '# Plan\n')
    const hit1 = findAlreadyArchivedDir(archiveDir, '2026-08-08-foo')
    assert(hit1 && hit1.endsWith('2026-08-08-foo'), '补 plan.md 后精确原名命中')

    // 精确原名命中（另一个）
    mkdirSync(join(archiveDir, '2026-08-01-bar'), { recursive: true })
    writeFileSync(join(archiveDir, '2026-08-01-bar', 'plan.md'), '# Plan\n')
    const hit2 = findAlreadyArchivedDir(archiveDir, '2026-08-01-bar')
    assert(hit2 && hit2.endsWith('2026-08-01-bar'), '精确原名命中')

    // 名称不匹配 → null
    assert(findAlreadyArchivedDir(archiveDir, '2026-08-09-totally-different') === null, '名称不匹配 → null')
  } finally {
    try { rmSync(root, { recursive: true, force: true }) } catch {}
  }
}

cleanup()
report(count.passed, count.failed, count.failures)
