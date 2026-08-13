/**
 * scan 阶段「深度扫描」步 workflow post_check CLI 行为测试。
 *
 * 从 _completeStepForTest 内部函数迁移为 CLI 子进程测试。锁住 scan「深度扫描」步完成时的
 * workflow post-check 行为：
 *   - 无 workflow 文件 → loadWorkflow null → 静默跳过（步进正常推进）
 *   - workflow 存在 + role output file_exists 失败 → 阻断推进（步保持 pending，优雅 return exit 0）
 *
 * scan 步骤随 profile 变化：--deep 强制 full profile（11 步含「深度扫描 — 7 份文档」）。
 * seed-real-steps：init 后读真实步骤，前序 completed + 深度扫描 pending，再 --done 触发 postcheck。
 * workflow 阻断是优雅 return（不 process.exit），CLI exit 0，靠 stdout + DB 步状态判定。
 */
import { writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { makeRepo, initChange, seedStage, runStage, runCLI, cleanup, report } from './_cli-step-harness.mjs'
import { ProgressManager } from '../src/progress.js'

const count = { passed: 0, failed: 0, failures: [] }
const assert = (cond, msg) => { cond ? (count.passed++, console.log(`  ✅ PASS: ${msg}`)) : (count.failed++, count.failures.push(msg), console.log(`  ❌ FAIL: ${msg}`)) }

// workflow 定义：role output 指向确定不存在的文件 → file_exists fail
const SCAN_DOCS_YAML = `name: scan-docs
spec_version: 1
roles:
  - id: scanner
    name: 扫描器
    outputs:
      - path: docs/<project>/scan/NONEXISTENT.md
        checks:
          - type: file_exists
`

// --deep init scan，seed 到「深度扫描」步 pending。返回深度扫描 idx。
async function seedScanToDeep(cwd, specBase, cn) {
  const pm = await initChange(cwd, specBase, cn)
  runCLI(['--dir', cwd, 'run', 'scan', '--deep', '--change', cn], { cwd })
  const names = (await pm.read(cwd, cn)).stages.scan.steps.map(s => s.name)
  const deepIdx = names.findIndex(n => n.includes('深度扫描'))
  if (deepIdx < 0) throw new Error('深度扫描步未找到（--deep profile 应含）')
  const seeded = names.map((name, i) => ({ name, status: i < deepIdx ? 'completed' : 'pending' }))
  await seedStage(pm, cwd, cn, 'scan', seeded)
  return { pm, deepIdx }
}

console.log('=== scan 深度扫描 workflow post_check CLI 行为 ===\n')

// ── Case 1: 无 workflow 文件 → 静默跳过，步进正常推进 ──
console.log('--- 无 workflow 文件 → 静默跳过（深度扫描步 completed）---')
{
  const { cwd, specBase } = makeRepo('cli-wf-none-')
  const cn = 'wf-none'
  const { pm, deepIdx } = await seedScanToDeep(cwd, specBase, cn)
  // 故意不建 workflows/scan-docs.yaml

  const r = runStage('scan', cn, cwd, { done: true, output: '扫描完成' })

  assert(r.status === 0, `exit 0（实际 ${r.status}）`)
  assert(!r.combined.includes('存在检查失败项'), '无 workflow → 不触发失败阻断')
  assert(!r.combined.includes('结果已归档'), '无 workflow → 不归档 workflow run')
  const after = await pm.read(cwd, cn)
  assert(after.stages.scan.steps[deepIdx].status === 'completed', 'DB: 深度扫描步已 completed（正常推进）')
}

// ── Case 2: workflow 存在 + role output 不存在 → fail → 阻断推进（步保持 pending）──
console.log('\n--- workflow 存在 + role output file_exists fail → 阻断推进 ---')
{
  const { cwd, specBase } = makeRepo('cli-wf-fail-')
  const cn = 'wf-fail'
  mkdirSync(join(specBase, 'workflows'), { recursive: true })
  writeFileSync(join(specBase, 'workflows', 'scan-docs.yaml'), SCAN_DOCS_YAML)
  await seedScanToDeep(cwd, specBase, cn)

  const r = runStage('scan', cn, cwd, { done: true, output: '扫描完成' })

  // postcheck 失败信号（优雅 return，不 process.exit，CLI exit 0）
  assert(r.combined.includes('存在检查失败项'), 'stdout 含「存在检查失败项」')
  assert(r.combined.includes('结果已归档'), 'stdout 含 workflow run 归档')
  assert(r.combined.includes('NONEXISTENT.md'), 'stdout 点名缺失文件（file_exists fail detail）')
}

cleanup()
report(count.passed, count.failed, count.failures)
