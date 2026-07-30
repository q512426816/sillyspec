/**
 * validateChangeExists 回归测试
 * 缺陷：execute-in-place-windows-pitfalls 坑5 —— cwd 在子项目目录跑根项目变更命令时，
 * resolveChangeDir 纯拼路径不校验存在，CLI 不报错而误启动子项目流程。
 *
 * 修复：stage-contract.js validateChangeExists —— plan/execute/verify/archive 阶段、
 * 非 quick-<8hex> sessionId 时，强制 changes/<changeName> 存在，不存在返回失败对象。
 *
 * 豁免：scan/brainstorm/quick/explore 阶段、quick sessionId、changeName 为空。
 */
import { mkdtempSync, mkdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { validateChangeExists } from '../src/stage-contract.js'

let total = 0, failed = 0
function assert(cond, msg) {
  total++
  if (!cond) { failed++; console.log(`  ❌ FAIL: ${msg}`) }
  else console.log(`  ✅ PASS: ${msg}`)
}

console.log('=== validateChangeExists 校验测试 ===\n')

// 建 specBase，含一个已存在变更
const specBase = mkdtempSync(join(tmpdir(), 'vce-'))
mkdirSync(join(specBase, 'changes', 'real-change'), { recursive: true })

// 1. plan + 已存在变更 → 通过
assert(validateChangeExists(specBase, 'plan', 'real-change') === null, 'plan 阶段 + 已存在变更 → 通过')
// 2. plan + 不存在变更 → 失败（核心：治 cwd 漂移误匹配）
{
  const r = validateChangeExists(specBase, 'plan', 'ghost-change')
  assert(r !== null, 'plan 阶段 + 不存在变更 → 失败')
  assert(r && r.changeName === 'ghost-change', '失败对象含 changeName')
  assert(r && r.message.includes('ghost-change'), '失败 message 含变更名')
}
// 3. execute/verify/archive 同样校验
assert(validateChangeExists(specBase, 'execute', 'ghost-change') !== null, 'execute 阶段校验不存在变更 → 失败')
assert(validateChangeExists(specBase, 'verify', 'ghost-change') !== null, 'verify 阶段校验不存在变更 → 失败')
assert(validateChangeExists(specBase, 'archive', 'ghost-change') !== null, 'archive 阶段校验不存在变更 → 失败')

// 4. 豁免阶段（scan/brainstorm/quick/explore）→ 即使变更不存在也通过
assert(validateChangeExists(specBase, 'brainstorm', 'ghost-change') === null, 'brainstorm 阶段豁免（可新建变更）')
assert(validateChangeExists(specBase, 'scan', 'ghost-change') === null, 'scan 阶段豁免（无 change 语义）')
assert(validateChangeExists(specBase, 'explore', 'ghost-change') === null, 'explore 阶段豁免')
assert(validateChangeExists(specBase, 'quick', 'ghost-change') === null, 'quick 阶段豁免')

// 5. quick-<8hex> sessionId 豁免（即使 plan 阶段也不校验，防误杀 quick 会话）
assert(validateChangeExists(specBase, 'plan', 'quick-5f41e818') === null, 'quick-<8hex> sessionId 豁免')
assert(validateChangeExists(specBase, 'execute', 'quick-a3f2b7c1') === null, 'execute 阶段 quick sessionId 豁免')

// 6. changeName 为空 → 通过（无 --change，不校验）
assert(validateChangeExists(specBase, 'plan', '') === null, 'changeName 为空 → 通过')
assert(validateChangeExists(specBase, 'plan', null) === null, 'changeName null → 通过')

// 7. 已存在变更 + 各阶段 → 通过（回归保护）
assert(validateChangeExists(specBase, 'execute', 'real-change') === null, 'execute + 已存在变更 → 通过')

// 8. archive 特例：变更已被 step4 移到 changes/archive/<date>-<name>/ → 放行（修复 verify-archive-pitfalls 坑3）
{
  mkdirSync(join(specBase, 'changes', 'archive', '2026-07-23-archived-change'), { recursive: true })
  assert(validateChangeExists(specBase, 'archive', 'archived-change') === null, 'archive + 已归档变更（changes/<name>/ 已移走）→ 放行')
  // 精确匹配：后缀子串不算（auth ≠ deep-auth）
  mkdirSync(join(specBase, 'changes', 'archive', '2026-07-22-deep-auth'), { recursive: true })
  assert(validateChangeExists(specBase, 'archive', 'auth') !== null, 'archive + 后缀子串不算已归档（auth ≠ deep-auth）→ 失败')
  // 其他阶段不享受 archive 特例
  assert(validateChangeExists(specBase, 'plan', 'archived-change') !== null, 'plan 阶段不享受 archive 已归档放行 → 失败')
}
// 9. archive 特例回归：变更名本身带日期前缀（brainstorm 源名约定），归档目录已 strip 前缀重拼为
//    <归档日>-<纯描述>。校验侧同样 strip 再比 → 放行。
//    （修复 archive-step5-leading-date-change-name：原实现 m[1]===changeName 对带前缀源名恒 false，
//     step4 已移走、step5 --change <源名> 被前置校验误拦。归档日 07-30 ≠ 源名日期 07-29 更能体现写读对齐）
{
  mkdirSync(join(specBase, 'changes', 'archive', '2026-07-30-sidebar-menu-restructure'), { recursive: true })
  assert(validateChangeExists(specBase, 'archive', '2026-07-29-sidebar-menu-restructure') === null, 'archive + 带日期前缀源名（归档目录已去前缀重拼）→ 放行')
  // 纯描述 changeName（无前缀）仍兼容，strip 无效原值不变
  assert(validateChangeExists(specBase, 'archive', 'sidebar-menu-restructure') === null, 'archive + 纯描述源名 → 放行（向后兼容）')
}
// 清理
try { rmSync(specBase, { recursive: true, force: true }) } catch {}

console.log('\n==================================================')
console.log(`✅ 通过: ${total - failed}  ❌ 失败: ${failed}`)
console.log('==================================================')
if (failed > 0) process.exit(1)
