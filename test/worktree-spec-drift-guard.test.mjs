/**
 * detectWorktreeSpecDrift 单元测试(坑 worktree-execute-spec-drift)。
 *
 * 判据:specBase 路径含 `.sillyspec/.runtime/worktrees/<seg>/.sillyspec` = worktree checkout 副本。
 * 命中 → 返回 {changeName, mainSpecBase, message};主仓 specBase / monorepo 子项目 / null → 不命中。
 *
 * 纯路径函数,不需要 git fixture(与 count-ancestor-spec-dirs 的 worktree case 互补:
 * 那个测 ceiling 修复后祖先链能数到主仓 .sillyspec,这个测 execute/verify 入口的硬阻断判据)。
 */
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { detectWorktreeSpecDrift } from '../src/run/shared.js'

let total = 0, failed = 0
function assert(cond, msg) {
  total++
  if (!cond) { failed++; console.log(`  ❌ FAIL: ${msg}`) }
  else console.log(`  ✅ PASS: ${msg}`)
}

console.log('=== detectWorktreeSpecDrift worktree 副本漂移守卫测试 ===\n')

// 绝对路径基底(跨平台用 tmpdir,避免 Windows 盘符 join 陷阱)
const mainRepo = join(tmpdir(), 'wtdrift-myapp')
const mainSpec = join(mainRepo, '.sillyspec')

// ── 命中:worktree 副本 specBase = <mainRepo>/.sillyspec/.runtime/worktrees/<change>/.sillyspec ──
const changeName = '2026-07-31-custom-skill-per-user'
const copySpec = join(mainSpec, '.runtime', 'worktrees', changeName, '.sillyspec')
const hit = detectWorktreeSpecDrift(copySpec)
assert(hit !== null, 'worktree 副本 specBase → 命中(非 null)')
assert(hit && hit.changeName === changeName, `changeName 解析正确,actual=${hit && hit.changeName}`)
assert(hit && hit.mainSpecBase === mainSpec, `mainSpecBase 指向主仓 .sillyspec,actual=${hit && hit.mainSpecBase}`)
assert(hit && hit.message.includes(changeName) && hit.message.includes('--spec-dir'),
  'message 含 changeName 与 --spec-dir 指引')

// ── 不命中 ──
assert(detectWorktreeSpecDrift(mainSpec) === null, '主仓 .sillyspec 本身 → null(零误伤,无 .runtime/worktrees 段)')
assert(detectWorktreeSpecDrift(join(mainRepo, 'frontend', '.sillyspec')) === null,
  'monorepo 子项目 .sillyspec → null(路径有 .sillyspec 但无 .runtime/worktrees)')
assert(detectWorktreeSpecDrift(null) === null, 'null specBase → null')
assert(detectWorktreeSpecDrift('') === null, '空 specBase → null')

// ── 命中:更深的 changeName 段(带多级,验证 slice 切到第一个 .sillyspec)──
const deepCopy = join(mainSpec, '.runtime', 'worktrees', 'feat-x', '.sillyspec')
const deepHit = detectWorktreeSpecDrift(deepCopy)
assert(deepHit && deepHit.changeName === 'feat-x' && deepHit.mainSpecBase === mainSpec,
  '另一个 changeName 同样命中并正确解析 mainSpecBase')

// ── 不命中:.runtime/worktrees 段后无 <change>/.sillyspec(防御)──
assert(detectWorktreeSpecDrift(join(mainSpec, '.runtime', 'worktrees')) === null,
  '.runtime/worktrees 目录本身(非 spec)→ null')
assert(detectWorktreeSpecDrift(join(mainSpec, '.runtime', 'worktrees', 'feat-x')) === null,
  '.runtime/worktrees/<change> 但无尾 .sillyspec → null(这不是 specBase)')

console.log('\n==================================================')
console.log(`✅ 通过: ${total - failed}  ❌ 失败: ${failed}`)
console.log('==================================================')
if (failed > 0) process.exit(1)
