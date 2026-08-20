/**
 * HUB-05 回归：writePlatformPointer 重写指针时合并保留既有生命周期字段
 * （status/completedAt/scanStatus）——scan --done 后再跑任何平台模式命令，
 * 指针状态不得从 scan_completed 回退到 active（否则 isPointerStale 恒 false、
 * `platform pointer --cleanup` 的 STALE 分支不可达）。
 */
import { writePlatformPointer } from '../src/run/shared.js'
import { writeFileSync, readFileSync, mkdtempSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

let passed = 0, failed = 0
function assert(cond, msg) {
  if (cond) { console.log(`  ✅ PASS: ${msg}`); passed++ }
  else { console.log(`  ❌ FAIL: ${msg}`); failed++ }
}

// 场景 1：既有 scan_completed → 重写（extra 为空）→ status/completedAt/scanStatus 保留
{
  const d = mkdtempSync(join(tmpdir(), 'ptr-status-'))
  const specRoot = join(d, 'spec-root')
  const opts = { specRoot, runtimeRoot: join(d, 'rt'), workspaceId: 'ws-1', scanRunId: 'sr-1' }
  writePlatformPointer(d, opts)
  // 模拟 scan 完成路径：读-改-写注入 status（与 complete-handlers.handleScanStageCompleted 同式）
  const pointerPath = join(d, '.sillyspec-platform.json')
  const p = JSON.parse(readFileSync(pointerPath, 'utf8'))
  p.status = 'scan_completed'
  p.completedAt = '2026-08-20T00:00:00.000Z'
  p.scanStatus = 'success'
  writeFileSync(pointerPath, JSON.stringify(p, null, 2) + '\n')

  // 下一次 run 重写指针（恢复链只回填四字段，extra 为空）
  const ok = writePlatformPointer(d, opts)
  const p2 = JSON.parse(readFileSync(pointerPath, 'utf8'))
  assert(ok === true, 'writePlatformPointer 返回 true')
  assert(p2.status === 'scan_completed', `重写后 status 保留（实得 ${p2.status}）`)
  assert(p2.completedAt === '2026-08-20T00:00:00.000Z', `重写后 completedAt 保留（实得 ${p2.completedAt}）`)
  assert(p2.scanStatus === 'success', `重写后 scanStatus 保留（实得 ${p2.scanStatus}）`)
  assert(p2.specRoot === specRoot && p2.scanRunId === 'sr-1', '四字段正常回填')
  rmSync(d, { recursive: true, force: true })
}

// 场景 2：extra 显式传 status → 覆盖既有值（完成路径自身仍可控）
{
  const d = mkdtempSync(join(tmpdir(), 'ptr-override-'))
  const specRoot = join(d, 'spec-root')
  const opts = { specRoot }
  writePlatformPointer(d, opts)
  const pointerPath = join(d, '.sillyspec-platform.json')
  writeFileSync(pointerPath, JSON.stringify({ ...JSON.parse(readFileSync(pointerPath, 'utf8')), status: 'stale' }, null, 2) + '\n')
  writePlatformPointer(d, opts, { status: 'active' })
  const p = JSON.parse(readFileSync(pointerPath, 'utf8'))
  assert(p.status === 'active', `extra 显式值覆盖既有 status（实得 ${p.status}）`)
  rmSync(d, { recursive: true, force: true })
}

// 场景 3：无既有指针（全新项目）→ 正常写入，无 status 字段（不凭空造状态）
{
  const d = mkdtempSync(join(tmpdir(), 'ptr-fresh-'))
  const opts = { specRoot: join(d, 'spec-root') }
  writePlatformPointer(d, opts)
  const p = JSON.parse(readFileSync(join(d, '.sillyspec-platform.json'), 'utf8'))
  assert(p.status === undefined, `全新指针不带 status（实得 ${p.status}）`)
  rmSync(d, { recursive: true, force: true })
}

console.log(`\n${failed === 0 ? '✅ platform-pointer-status-preserve 全部通过' : '❌ 存在失败'}（${passed} 通过 / ${failed} 失败）`)
process.exit(failed === 0 ? 0 : 1)
