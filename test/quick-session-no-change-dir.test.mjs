/**
 * quick session id 不建 change 目录回归测试
 *
 * quick 的 sessionId（quick-<uuid8>）被复用为 changeName（run.js:1440），
 * 但 quick 进度存 SQL、产物在 quicklog/ 与 .runtime/quick-sessions/，
 * 不需要实体 changes/quick-<uuid>/ 目录。
 *
 * 修复前：initChange 无条件 _ensureChangeDir → 每次跑 quick 留一个空
 * changes/quick-<uuid>/ 残留目录。修复后：initChange 识别 quick-<uuid8>
 * 形态跳过建目录，但 SQL 注册照常。
 */
import { mkdtempSync, existsSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

import { ProgressManager } from '../src/progress.js'

let total = 0
let failed = 0
function assert(condition, msg) {
  total++
  if (!condition) { failed++; console.log(`  ❌ FAIL: ${msg}`) }
  else console.log(`  ✅ PASS: ${msg}`)
}

const tmpRoots = []
function makeTmpDir(prefix) {
  const dir = mkdtempSync(join(tmpdir(), prefix))
  tmpRoots.push(dir)
  return dir
}

async function freshPm(prefix) {
  const proj = makeTmpDir(prefix)
  const specBase = join(proj, '.sillyspec')
  const pm = new ProgressManager({ specDir: specBase })
  await pm.init(proj)
  return { proj, specBase, pm }
}

console.log('=== quick session id 不建 change 目录 ===\n')

// ── Case 1: quick-<uuid8> 不建 changes 目录（核心回归点）──
console.log('--- Case 1: quick-<uuid8> 不建 changes 目录，但 SQL 照常注册 ---')
{
  const { proj, specBase, pm } = await freshPm('qs-no-changedir-')
  const quickSid = 'quick-deadbeef'
  await pm.initChange(proj, quickSid)

  assert(!existsSync(join(specBase, 'changes', quickSid)),
    'quick-<uuid8> 不建 changes/quick-deadbeef/ 目录')
  const progress = await pm.read(proj, quickSid)
  assert(!!progress, 'quick-<uuid8> 仍在 SQL 注册了 progress（跳过目录 ≠ 跳过注册）')
}

// ── Case 2: 正常变更名仍建 changes 目录（不能误伤）──
console.log('--- Case 2: 正常变更名仍建 changes 目录 ---')
{
  const { proj, specBase, pm } = await freshPm('qs-normal-')
  const normalName = '2026-07-15-my-feature'
  await pm.initChange(proj, normalName)

  assert(existsSync(join(specBase, 'changes', normalName)),
    '正常变更名仍建 changes/2026-07-15-my-feature/ 目录')
}

// ── Case 3: 边界——quick- 后非 8 位 hex 不跳过（保守，不误判）──
console.log('--- Case 3: quick-<7hex> 不匹配 sessionId 形态 → 仍建目录 ---')
{
  const { proj, specBase, pm } = await freshPm('qs-boundary-')
  await pm.initChange(proj, 'quick-abc1234')
  assert(existsSync(join(specBase, 'changes', 'quick-abc1234')),
    'quick-<7hex> 不匹配 quick-[0-9a-f]{8} → 仍建目录（不误判）')
}

// ── 清理 ──
for (const d of tmpRoots) { try { rmSync(d, { recursive: true, force: true }) } catch {} }

console.log(`\n${'='.repeat(50)}`)
console.log(`✅ 通过: ${total - failed}  ❌ 失败: ${failed}`)
console.log('='.repeat(50))
if (failed > 0) process.exit(1)
