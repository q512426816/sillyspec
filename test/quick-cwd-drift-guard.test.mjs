/**
 * quick 会话 cwd 漂移 fail-fast 守卫测试（坑 quick-cwd-drift-splits-specdir）。
 *
 * 根因：quick 被 validateChangeExists 的 sessionId 豁免（quick-<8hex> 不在 changes/ 下），
 * 漂移时除 countAncestorSpecDirs 的 warn 外无硬守卫 → 无声分裂（progress/artifact/QUICKLOG
 * 落子项目、根会话停滞）。
 *
 * 修复链：ancestorSpecDirs（祖先链枚举，与 countAncestorSpecDirs 单源）→ locateQuickSessionGuard
 * （按 sessionId 在祖先链定位真 guard）→ detectQuickSessionDrift（当前 specBase 无 + 别处有 = 漂移）。
 *
 * 用真实 git 临时仓 + 根/frontend 双 .sillyspec 实例验证（与 count-ancestor-spec-dirs /
 * verify-postcheck-worktree 同风格）。
 */
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { ancestorSpecDirs, locateQuickSessionGuard, detectQuickSessionDrift } from '../src/run/shared.js'

let total = 0, failed = 0
function assert(cond, msg) {
  total++
  if (!cond) { failed++; console.log(`  ❌ FAIL: ${msg}`) }
  else console.log(`  ✅ PASS: ${msg}`)
}

console.log('=== quick cwd 漂移守卫测试 ===\n')

// monorepo: root/.sillyspec(根) + root/frontend/.sillyspec(子项目独立实例)
const root = mkdtempSync(join(tmpdir(), 'qdrift-'))
execSync('git init', { cwd: root, stdio: 'ignore' })
mkdirSync(join(root, '.sillyspec'), { recursive: true })
mkdirSync(join(root, 'frontend', '.sillyspec'), { recursive: true })

const rootSpec = join(root, '.sillyspec')
const feSpec = join(root, 'frontend', '.sillyspec')
const SID = 'quick-abcd1234'

// 写入某 specBase 的 session guard（模拟 step1 在该 spec 启动 quick 建的 guard）
function writeGuard(specBase, sid) {
  const dir = join(specBase, '.runtime', 'quick-sessions', sid)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'guard.json'), JSON.stringify({ sessionId: sid, specDir: specBase }))
}

// ── ancestorSpecDirs（重构后与 countAncestorSpecDirs 单源）──
const fromFe = ancestorSpecDirs(join(root, 'frontend'))
assert(fromFe.length === 2, `frontend 祖先链 2 个实例（frontend + 根），actual=${fromFe.length}`)
assert(fromFe[0] === feSpec && fromFe[1] === rootSpec, 'frontend 祖先链顺序：最近 frontend 在前、根在后')
assert(ancestorSpecDirs(root).length === 1, 'git root 自身 1 个实例')

// ── locateQuickSessionGuard ──
writeGuard(rootSpec, SID)
assert(locateQuickSessionGuard(join(root, 'frontend'), SID)?.specBase === rootSpec,
  'cwd=frontend、根有 guard → 定位到根 specBase')
assert(locateQuickSessionGuard(join(root, 'frontend'), 'quick-00000000') === null,
  'cwd=frontend、sessionId 不存在于任何 spec → null')
assert(locateQuickSessionGuard(root, SID)?.specBase === rootSpec,
  'cwd=根、根有 guard → 定位到根')

// ── detectQuickSessionDrift ──
// 漂移：cwd=frontend、currentSpecBase=frontend/.sillyspec、根有本 session guard
const drifted = detectQuickSessionDrift(join(root, 'frontend'), feSpec, SID)
assert(drifted !== null && drifted.realSpecBase === rootSpec,
  '漂移：frontend 无本 session guard + 根有 → 返回 {realSpecBase:根}')
assert(drifted && drifted.message.includes(SID) && drifted.message.includes(rootSpec),
  '漂移 message 含 sessionId 与 realSpecBase 指引')

// 无漂移：cwd=根、currentSpecBase=根/.sillyspec、根有 guard（当前已有）
assert(detectQuickSessionDrift(root, rootSpec, SID) === null,
  '无漂移：当前 specBase 已有本 session guard → null')

// 新会话首次启动：cwd=frontend、别处无该 sessionId guard → 放行
assert(detectQuickSessionDrift(join(root, 'frontend'), feSpec, 'quick-9999aaaa') === null,
  '新会话：别处无 guard → null 放行（不误伤子项目主动启新 quick）')

// frontend 自己也建了同 sessionId guard → 当前已有 → null（即便别处也有，以当前为准）
writeGuard(feSpec, SID)
assert(detectQuickSessionDrift(join(root, 'frontend'), feSpec, SID) === null,
  '当前 specBase 已有 guard → null（即便别处也有，以当前为准，不误判漂移）')

try { rmSync(root, { recursive: true, force: true }) } catch {}

console.log('\n==================================================')
console.log(`✅ 通过: ${total - failed}  ❌ 失败: ${failed}`)
console.log('==================================================')
if (failed > 0) process.exit(1)
