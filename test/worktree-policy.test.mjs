/**
 * worktree-policy 选择记忆测试（R16 减负批次，2026-09-24）
 *
 * 验证：readWorktreePolicy 读 local.yaml worktree.policy 段三键（adopt_branch / apply_overlap /
 * stash_dirty），文件缺/段缺/非法值/解析失败全落 fail-closed 缺省（false/'manual'/false）——
 * policy 只消「重复选择」，缺省不开新权限面。纯函数单测，不碰真实 worktree。
 *
 * 设计依据：src/worktree-policy.js。
 */
import { readWorktreePolicy } from '../src/worktree-policy.js'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

let failures = 0
const tmpRoots = []
const assert = (cond, msg) => {
  if (cond) console.log('  ✅ ' + msg)
  else { console.error('  ❌ ' + msg); failures++ }
}
const newDir = (prefix) => {
  const d = mkdtempSync(join(tmpdir(), prefix))
  tmpRoots.push(d)
  return d
}
const writeYaml = (root, text) => {
  mkdirSync(join(root, '.sillyspec'), { recursive: true })
  writeFileSync(join(root, '.sillyspec', 'local.yaml'), text, 'utf8')
}

console.log('\n[worktree-policy] 选择记忆读取：三键 + fail-closed 缺省')

const DEFAULTS = { adoptBranch: false, applyOverlap: 'manual', stashDirty: false }

// Case 1: 无 local.yaml → 全缺省
{
  const root = newDir('wp-none-')
  const p = readWorktreePolicy(root)
  assert(JSON.stringify(p) === JSON.stringify(DEFAULTS), '无 local.yaml → 全缺省 fail-closed')
}

// Case 2: 段缺 → 全缺省
{
  const root = newDir('wp-nosec-')
  writeYaml(root, 'commands:\n  test: "npm test"\n')
  const p = readWorktreePolicy(root)
  assert(JSON.stringify(p) === JSON.stringify(DEFAULTS), '无 worktree.policy 段 → 全缺省')
}

// Case 3: 三键齐配 → 正确读取
{
  const root = newDir('wp-full-')
  writeYaml(root, 'worktree:\n  policy:\n    adopt_branch: true\n    apply_overlap: force\n    stash_dirty: true\n')
  const p = readWorktreePolicy(root)
  assert(p.adoptBranch === true, 'adopt_branch: true → adoptBranch=true')
  assert(p.applyOverlap === 'force', 'apply_overlap: force → force')
  assert(p.stashDirty === true, 'stash_dirty: true → stashDirty=true')
}

// Case 4: apply_overlap 非法值 → 回 manual（不透传未知值）
{
  const root = newDir('wp-bad-')
  writeYaml(root, 'worktree:\n  policy:\n    apply_overlap: nuke\n')
  const p = readWorktreePolicy(root)
  assert(p.applyOverlap === 'manual', 'apply_overlap 非法值 → manual（fail-closed）')
}

// Case 5: skip 档合法
{
  const root = newDir('wp-skip-')
  writeYaml(root, 'worktree:\n  policy:\n    apply_overlap: skip\n')
  const p = readWorktreePolicy(root)
  assert(p.applyOverlap === 'skip', 'apply_overlap: skip → skip')
}

// Case 6: YAML 语法坏 → 全缺省不抛
{
  const root = newDir('wp-broken-')
  writeYaml(root, 'worktree:\n  policy: [unclosed\n')
  let p = null
  let threw = false
  try { p = readWorktreePolicy(root) } catch { threw = true }
  assert(!threw, 'YAML 坏不抛（best-effort）')
  assert(JSON.stringify(p) === JSON.stringify(DEFAULTS), 'YAML 坏 → 全缺省')
}

// Case 7: policy 段非对象（标量）→ 全缺省
{
  const root = newDir('wp-scalar-')
  writeYaml(root, 'worktree:\n  policy: true\n')
  const p = readWorktreePolicy(root)
  assert(JSON.stringify(p) === JSON.stringify(DEFAULTS), 'policy 段标量 → 全缺省')
}

console.log(`\n${'='.repeat(50)}`)
console.log(`✅ 通过: ${7 - failures}  ❌ 失败: ${failures}`)
for (const d of tmpRoots) { try { rmSync(d, { recursive: true, force: true }) } catch {} }
if (failures > 0) throw new Error(`${failures} test(s) failed`)
