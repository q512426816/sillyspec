/**
 * completeStep characterization — scan 平台 manifest 分支（run.js:3640-3765）
 *
 * 锁住 scan 阶段完成时平台模式的 manifest.json + 平台指针 + post-check 行为：
 *   - failed_post_check：specRoot 无 scan 文档 → runScanPostCheck all_docs_missing(FAILED)
 *     → manifest.json 仍写入 + 指针更新 scan_completed + stageData.status=failed_post_check
 *     + 平台模式 exit(1) 通知 SillyHub
 *   - happy：specRoot 下齐全 7 份 scan 文档（带 author/created_at header）→ postcheck 非 failed
 *     → 指针 scan_completed + scanStatus=success/warnings + 不 exit + scan 是 auxiliary → 完成后重置 pending
 *
 * 平台指针 cwd/.sillyspec-platform.json 只被更新 status/completedAt/scanStatus（3726-3737），
 * specRoot 等来自 platformOpts 不从指针读，故指针初始内容最小即可。
 * scan 是 auxiliary 阶段：happy 不 exit → 走 auxiliary 重置（status→pending）；failed 在重置前 exit。
 */
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs'
import { join, basename } from 'node:path'
import { tmpdir } from 'node:os'
import { _completeStepForTest } from '../src/run.js'
import { runCapturing, makeRepo, initChange, seedStage, cleanup, report } from './_complete-step-harness.mjs'

const count = { passed: 0, failed: 0, failures: [] }
const assert = (cond, msg) => { cond ? (count.passed++, console.log(`  ✅ PASS: ${msg}`)) : (count.failed++, count.failures.push(msg), console.log(`  ❌ FAIL: ${msg}`)) }

const SCAN_DOCS = ['ARCHITECTURE.md', 'CONVENTIONS.md', 'STRUCTURE.md', 'INTEGRATIONS.md', 'TESTING.md', 'CONCERNS.md', 'PROJECT.md']
// scan 三步（与 src/stages/scan.js 一致），第三步 pending 触发完成路径
function scanStepsThirdPending() {
  return [
    { name: '探测项目结构并建议子项目', status: 'completed' },
    { name: '构建扫描项目列表', status: 'completed' },
    { name: '自检和提交', status: 'pending' },
  ]
}
function writePlatformPointer(cwd) {
  // 最小指针：scan 分支只 JSON.parse + 改 status/completedAt/scanStatus
  writeFileSync(join(cwd, '.sillyspec-platform.json'), JSON.stringify({ status: 'active' }) + '\n')
}
function writeScanDocs(specRoot, projectName) {
  const scanDir = join(specRoot, 'docs', projectName, 'scan')
  mkdirSync(scanDir, { recursive: true })
  for (const doc of SCAN_DOCS) {
    writeFileSync(join(scanDir, doc),
      `---\nauthor: test\ncreated_at: 2026/07/26 00:00:00\n---\n# ${doc.replace('.md', '')}\n\n内容。\n`)
  }
}

console.log('=== completeStep characterization: scan 平台 manifest 分支 ===\n')

// ── Case 1: failed_post_check（空 specRoot）→ manifest 写入 + 指针更新 + exit(1) ──
console.log('--- failed_post_check：空 specRoot → all_docs_missing → exit(1) ---')
{
  const { cwd, specBase } = makeRepo('cs-scan-platform-fail-')
  const cn = 'scan-platform-fail'
  const specRoot = mkdtempSync(join(tmpdir(), 'cs-scan-specroot-fail-'))
  writePlatformPointer(cwd)
  // 真实平台模式 scan 启动会建 specRoot/.runtime（completeStep 3633 写 user-inputs.md 依赖它）
  mkdirSync(join(specRoot, '.runtime'), { recursive: true })
  const pm = await initChange(cwd, specBase, cn)
  const progress = await seedStage(pm, cwd, cn, 'scan', scanStepsThirdPending())
  const platformOpts = { specRoot, workspaceId: 'ws-fail-1', scanRunId: 'scan-fail-1' }

  const r = await runCapturing(() =>
    _completeStepForTest(pm, progress, 'scan', cwd, '扫描完成', null,
      { changeName: cn, printNext: false, platformOpts }))

  assert(r.exitCode === 1, 'failed_post_check → exit(1)（平台模式通知 SillyHub）')
  assert(r.stdout.includes('📄 manifest.json 已写入'), 'stdout 含 manifest 写入')
  assert(r.stdout.includes('scan post-check 失败'), 'stdout 含 post-check 失败')

  // manifest.json 落地 + 含平台字段 + post-check 结果
  const manifestPath = join(specRoot, 'manifest.json')
  assert(existsSync(manifestPath), 'manifest.json 创建')
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
  assert(manifest.workspace_id === 'ws-fail-1', 'manifest.workspace_id')
  assert(manifest.scan_run_id === 'scan-fail-1', 'manifest.scan_run_id')
  assert(manifest.schema_version === 1, 'manifest.schema_version=1')
  assert(manifest.scan_post_check && manifest.scan_post_check.status === 'failed_post_check', 'manifest.scan_post_check.status=failed_post_check')

  // 平台指针更新 scan_completed + scanStatus=failed_post_check
  const pointer = JSON.parse(readFileSync(join(cwd, '.sillyspec-platform.json'), 'utf8'))
  assert(pointer.status === 'scan_completed', '指针 status=scan_completed（即使 postcheck failed）')
  assert(pointer.scanStatus === 'failed_post_check', '指针 scanStatus=failed_post_check')

  // DB stage.status 在测试桩下不可靠：process.exit(1)（run.js:3750）被 runCapturing 桩成 throw，
  // 而 3641 的 try-catch（3762「manifest.json 写入失败」）会吞掉这个 throw → completeStep 继续
  // 走到 auxiliary 重置（3793）把 status 改成 'pending'。生产环境 process.exit 立即终止，
  // status=failed_post_check 保持。故只断言 exit(1) + manifest + 指针（exit 前落盘，可靠）；
  // stageData.status=FAILED_POST_CHECK 的生产语义由 manifest.scan_post_check.status 间接代表。
}

// ── Case 2: happy（7 份文档齐全）→ 指针 scan_completed + 非 failed + 不 exit ──
console.log('\n--- happy：7 份 scan 文档齐全 → 非 failed → 不 exit + auxiliary 重置 ---')
{
  const { cwd, specBase } = makeRepo('cs-scan-platform-ok-')
  const cn = 'scan-platform-ok'
  const specRoot = mkdtempSync(join(tmpdir(), 'cs-scan-specroot-ok-'))
  writePlatformPointer(cwd)
  // 真实平台模式 scan 启动会建 specRoot/.runtime（completeStep 3633 写 user-inputs.md 依赖它）
  mkdirSync(join(specRoot, '.runtime'), { recursive: true })
  const projectName = basename(cwd)
  writeScanDocs(specRoot, projectName) // 齐全 7 份 → 非 all_docs_missing
  const pm = await initChange(cwd, specBase, cn)
  const progress = await seedStage(pm, cwd, cn, 'scan', scanStepsThirdPending())
  const platformOpts = { specRoot, workspaceId: 'ws-ok-1', scanRunId: 'scan-ok-1' }

  const r = await runCapturing(() =>
    _completeStepForTest(pm, progress, 'scan', cwd, '扫描完成', null,
      { changeName: cn, printNext: false, platformOpts }))

  assert(r.exitCode !== 1, '非 failed → 不 exit(1)')
  assert(r.stdout.includes('📄 manifest.json 已写入'), 'stdout 含 manifest 写入')

  // 指针 scan_completed + scanStatus 非 failed
  const pointer = JSON.parse(readFileSync(join(cwd, '.sillyspec-platform.json'), 'utf8'))
  assert(pointer.status === 'scan_completed', '指针 status=scan_completed')
  assert(pointer.scanStatus !== 'failed_post_check', `指针 scanStatus 非 failed（实际: ${pointer.scanStatus}）`)

  const manifest = JSON.parse(readFileSync(join(specRoot, 'manifest.json'), 'utf8'))
  assert(manifest.scan_post_check && manifest.scan_post_check.status !== 'failed_post_check',
    `manifest.scan_post_check.status 非 failed（实际: ${manifest.scan_post_check?.status}）`)

  // scan 是 auxiliary → happy 走 auxiliary 重置（failed 在重置前 exit，happy 不 exit → 重置生效）
  const after = await pm.read(cwd, cn)
  assert(after.stages.scan.status === 'pending', 'DB: scan 是 auxiliary → happy 后 status 重置 pending（可重跑）')
}

cleanup()
report(count.passed, count.failed, count.failures)
