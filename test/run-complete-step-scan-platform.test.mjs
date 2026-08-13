/**
 * scan 阶段平台模式 manifest 分支 CLI 行为测试。
 *
 * 从 _completeStepForTest 内部函数迁移为 CLI 子进程测试。平台模式 = `sillyspec --spec-dir <specRoot>
 * --workspace-id <ws> --scan-run-id <sr> run scan --done`。锁住 scan 阶段完成时平台模式的
 * manifest.json + 平台指针 + post-check 行为：
 *   - failed_post_check：specRoot 无 scan 文档 → runScanPostCheck all_docs_missing(FAILED)
 *     → manifest.json 写入 + 指针 scan_completed + scanStatus=failed_post_check + exit(1)
 *   - happy：specRoot 下齐全 7 份 scan 文档（docs/<project>/scan/，带 author/created_at header）
 *     → 指针 scan_completed + scanStatus 非 failed + manifest post-check 非 failed
 *
 * 关键：平台模式进度存 specRoot（非 cwd/.sillyspec），seedStage 必须用 specDir:specRoot 的
 * ProgressManager；scan 项目名 = basename(cwd)，docs 写到 specRoot/docs/<basename(cwd)>/scan/。
 */
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs'
import { join, basename } from 'node:path'
import { tmpdir } from 'node:os'
import { makeRepo, seedStage, runCLI, cleanup, report } from './_cli-step-harness.mjs'
import { ProgressManager } from '../src/progress.js'

const count = { passed: 0, failed: 0, failures: [] }
const assert = (cond, msg) => { cond ? (count.passed++, console.log(`  ✅ PASS: ${msg}`)) : (count.failed++, count.failures.push(msg), console.log(`  ❌ FAIL: ${msg}`)) }

const SCAN_DOCS = ['ARCHITECTURE.md', 'CONVENTIONS.md', 'STRUCTURE.md', 'INTEGRATIONS.md', 'TESTING.md', 'CONCERNS.md', 'PROJECT.md']
function writeScanDocs(specRoot, projectName) {
  const scanDir = join(specRoot, 'docs', projectName, 'scan')
  mkdirSync(scanDir, { recursive: true })
  for (const doc of SCAN_DOCS) {
    writeFileSync(join(scanDir, doc),
      `---\nauthor: test\ncreated_at: 2026/07/26 00:00:00\n---\n# ${doc.replace('.md', '')}\n\n内容。\n`)
  }
}

// 平台模式 scan：init + seed 到末步（自检和提交）pending。进度在 specRoot。
async function seedPlatformScanToLast(cwd, specRoot, cn, platformFlags) {
  writeFileSync(join(cwd, '.sillyspec-platform.json'), JSON.stringify({ status: 'active' }) + '\n')
  mkdirSync(join(specRoot, '.runtime'), { recursive: true })
  const pm = new ProgressManager({ specDir: specRoot })
  await pm.init(cwd)
  await pm.initChange(cwd, cn)
  runCLI(['--spec-dir', specRoot, '--dir', cwd, 'run', 'scan', '--deep', '--change', cn, ...platformFlags], { cwd })
  const names = (await pm.read(cwd, cn)).stages.scan.steps.map(s => s.name)
  await seedStage(pm, cwd, cn, 'scan', names.map((name, i) => ({ name, status: i < names.length - 1 ? 'completed' : 'pending' })))
  return pm
}

console.log('=== scan 平台 manifest 分支 CLI 行为 ===\n')

// ── Case 1: failed_post_check（空 specRoot）→ manifest 写入 + 指针更新 + exit(1) ──
console.log('--- failed_post_check：空 specRoot → all_docs_missing → exit(1) ---')
{
  const { cwd } = makeRepo('cli-scan-platform-fail-')
  const cn = 'scan-platform-fail'
  const specRoot = mkdtempSync(join(tmpdir(), 'cli-scan-specroot-fail-'))
  const pf = ['--workspace-id', 'ws-fail-1', '--scan-run-id', 'scan-fail-1']
  // 故意不写 scan 文档 → runScanPostCheck all_docs_missing
  await seedPlatformScanToLast(cwd, specRoot, cn, pf)

  const r = runCLI(['--spec-dir', specRoot, '--dir', cwd, 'run', 'scan', '--done', '--change', cn, '--output', '扫描完成', ...pf], { cwd })

  assert(r.status === 1, `failed_post_check → exit(1)（实际 ${r.status}）`)
  assert(r.combined.includes('manifest.json 已写入') || r.combined.includes('manifest.json 已更新'), 'stdout 含 manifest 写入')

  const manifestPath = join(specRoot, 'manifest.json')
  assert(existsSync(manifestPath), 'manifest.json 创建')
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
  assert(manifest.workspace_id === 'ws-fail-1', 'manifest.workspace_id')
  assert(manifest.scan_run_id === 'scan-fail-1', 'manifest.scan_run_id')
  assert(manifest.scan_post_check && manifest.scan_post_check.status === 'failed_post_check', 'manifest.scan_post_check.status=failed_post_check')

  const pointer = JSON.parse(readFileSync(join(cwd, '.sillyspec-platform.json'), 'utf8'))
  assert(pointer.status === 'scan_completed', '指针 status=scan_completed（即使 postcheck failed）')
  assert(pointer.scanStatus === 'failed_post_check', '指针 scanStatus=failed_post_check')
}

// ── Case 2: happy（7 份文档齐全）→ 指针 scan_completed + 非 failed ──
console.log('\n--- happy：7 份 scan 文档齐全 → 非 failed → manifest post-check 非 failed ---')
{
  const { cwd } = makeRepo('cli-scan-platform-ok-')
  const cn = 'scan-platform-ok'
  const specRoot = mkdtempSync(join(tmpdir(), 'cli-scan-specroot-ok-'))
  const pf = ['--workspace-id', 'ws-ok-1', '--scan-run-id', 'scan-ok-1']
  const projectName = basename(cwd)
  writeScanDocs(specRoot, projectName) // 齐全 7 份 → 非 all_docs_missing
  await seedPlatformScanToLast(cwd, specRoot, cn, pf)

  const r = runCLI(['--spec-dir', specRoot, '--dir', cwd, 'run', 'scan', '--done', '--change', cn, '--output', '扫描完成', ...pf], { cwd })

  assert(r.combined.includes('manifest.json 已写入') || r.combined.includes('manifest.json 已更新'), 'stdout 含 manifest 写入')

  const pointer = JSON.parse(readFileSync(join(cwd, '.sillyspec-platform.json'), 'utf8'))
  assert(pointer.status === 'scan_completed', '指针 status=scan_completed')
  assert(pointer.scanStatus !== 'failed_post_check', `指针 scanStatus 非 failed（实际: ${pointer.scanStatus}）`)

  const manifest = JSON.parse(readFileSync(join(specRoot, 'manifest.json'), 'utf8'))
  assert(manifest.scan_post_check && manifest.scan_post_check.status !== 'failed_post_check',
    `manifest.scan_post_check.status 非 failed（实际: ${manifest.scan_post_check?.status}）`)
}

cleanup()
report(count.passed, count.failed, count.failures)
