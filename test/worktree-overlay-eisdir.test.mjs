/**
 * copyUntrackedEntry 测试（坑 execute-worktree-overlay-untracked-dir-eisdir）
 *
 * _overlayBaseline 同步主仓 untracked 文件到 worktree 时，若 untracked 项是目录
 * （如 Claude Code agent worktree 隔离目录 .worktrees/<hash>/），原裸 readFileSync
 * 会 EISDIR → 整个 overlay fail-fast（execute worktree 创建失败）。copyUntrackedEntry
 * 加 statSync 守卫：目录返回 skipped-dir（调用方不进 errors → 不 fail-fast），文件正常复制。
 */
import { copyUntrackedEntry } from '../src/worktree.js'
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, readFileSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

let failed = 0
const failures = []
function eq(actual, expected, msg) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected)
  if (a !== e) { failed++; failures.push(`${msg} (got ${a}, want ${e})`); console.log(`  ❌ FAIL: ${msg}`) }
  else console.log(`  ✅ PASS: ${msg}`)
}
function ok(cond, msg) {
  if (!cond) { failed++; failures.push(msg); console.log(`  ❌ FAIL: ${msg}`) }
  else console.log(`  ✅ PASS: ${msg}`)
}

const tmp = mkdtempSync(join(tmpdir(), 'overlay-eisdir-'))
const src = join(tmp, 'src')
const dst = join(tmp, 'dst')
mkdirSync(src, { recursive: true })
mkdirSync(dst, { recursive: true })

console.log('=== worktree.js copyUntrackedEntry：untracked 目录跳过（坑 overlay-eisdir）===\n')

// ── Case 1: 普通文件 → copied + 内容正确 ──
console.log('--- Case 1: 普通文件复制 ---')
{
  writeFileSync(join(src, 'a.txt'), 'hello')
  const r = copyUntrackedEntry(join(src, 'a.txt'), join(dst, 'a.txt'))
  eq(r, { status: 'copied' }, '普通文件 → copied')
  ok(existsSync(join(dst, 'a.txt')), 'dst 文件已创建')
  ok(readFileSync(join(dst, 'a.txt'), 'utf8') === 'hello', 'dst 内容 = hello')
}

// ── Case 2（坑5 核心）: 目录 → skipped-dir，不抛 EISDIR ──
console.log('--- Case 2: untracked 目录跳过（坑5 核心，原 readFileSync EISDIR fail-fast）---')
{
  mkdirSync(join(src, '.worktrees', '300a6fb9'), { recursive: true })
  const r = copyUntrackedEntry(join(src, '.worktrees', '300a6fb9'), join(dst, '.worktrees', '300a6fb9'))
  eq(r, { status: 'skipped-dir' }, 'untracked 目录 → skipped-dir（不 readFileSync → 不 EISDIR）')
  ok(!r.error, 'skipped-dir 无 error 字段（调用方不进 errors → 不 fail-fast）')
}

// ── Case 3: 不存在 → missing ──
console.log('--- Case 3: 源不存在 ---')
{
  const r = copyUntrackedEntry(join(src, 'nope.txt'), join(dst, 'nope.txt'))
  eq(r, { status: 'missing' }, '源不存在 → missing')
}

// ── Case 4: 嵌套 dst 路径 → copied（mkdirSync recursive 建中间目录）──
console.log('--- Case 4: 嵌套 dst 路径 ---')
{
  writeFileSync(join(src, 'deep.txt'), 'x')
  const r = copyUntrackedEntry(join(src, 'deep.txt'), join(dst, 'sub', 'deep', 'deep.txt'))
  eq(r, { status: 'copied' }, '嵌套 dst 路径 → copied')
  ok(existsSync(join(dst, 'sub', 'deep', 'deep.txt')), '嵌套 dst 文件已创建（mkdirSync recursive）')
}

// ── Case 5: 坑5 现场模拟——目录被跳过，但目录内文件（ls-files 列文件项）正常复制 ──
console.log('--- Case 5: 目录内文件（ls-files 列文件项）正常复制 ---')
{
  writeFileSync(join(src, '.worktrees', '300a6fb9', 'inside.txt'), 'inner')
  const r = copyUntrackedEntry(
    join(src, '.worktrees', '300a6fb9', 'inside.txt'),
    join(dst, '.worktrees', '300a6fb9', 'inside.txt')
  )
  eq(r, { status: 'copied' }, '目录内文件项 → copied（目录本身才跳过，文件不丢）')
  ok(readFileSync(join(dst, '.worktrees', '300a6fb9', 'inside.txt'), 'utf8') === 'inner', '目录内文件内容正确')
}

// ── Case 6: statSync 失败（race 删除）→ missing 容错 ──
console.log('--- Case 6: existsSync 后被删 → missing 容错 ---')
{
  const ghost = join(src, 'ghost.txt')
  writeFileSync(ghost, 'g')
  ok(existsSync(ghost), 'ghost 存在')
  // 直接测一个 existsSync true 但 statSync 会失败的路径难以稳定构造，
  // 这里仅验证 missing 分支不抛错（Case 3 已覆盖；此 case 退化确认 existsSync 守卫优先）
  const r = copyUntrackedEntry(join(src, 'truly-absent.txt'), join(dst, 'x.txt'))
  eq(r, { status: 'missing' }, '不存在路径 → missing（existsSync 守卫，不进 statSync）')
}

try { rmSync(tmp, { recursive: true, force: true }) } catch {}

const total = 6
console.log(`\n${'='.repeat(50)}`)
console.log(`✅ 通过: ${total - failed}  ❌ 失败: ${failed}`)
if (failures.length > 0) { console.log('失败项:'); failures.forEach(f => console.log(`  - ${f}`)) }
console.log('='.repeat(50))
if (failed > 0) process.exit(1)
