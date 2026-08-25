/**
 * 坑 foreign-declared-stale-noise 回归：他者声明的活性收敛（2026-08-25 用户实证）
 *
 * 背景：并行会话 pathspec 重叠期，execute/verify 每轮重复刷「已排除 N 个并行会话声明的文件」，
 * 其中大量是对方早已 apply+commit 的存量声明（design §6 清单不随 commit 失效、quick 会话目录
 * 残留）——纯噪音。collectForeignDeclaredFiles 现在做活性收敛：声明只在「工作仍在途」时有效。
 *
 * 锁定语义：
 *   1. quick 会话声明的文件已 commit（主仓干净）→ 收敛掉；仍 dirty → 保留
 *   2. 变更无存活隔离 worktree 时与 quick 同口径（主仓 dirty 才保留）
 *   3. 有存活隔离 worktree（meta 且目录在、非 in-place）→ 整份声明保留（WIP 主仓不可见）
 *   4. in-place-fallback meta → 按主仓 dirty 判定
 *   5. 事实源读不出（非 git 仓）→ fail-closed 全保留
 */
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { execFileSync } from 'node:child_process'
import { collectForeignDeclaredFiles, splitOwnVsForeignDiffFiles } from '../src/foreign-declared.js'

let passed = 0, failed = 0
const failures = []
function assert(cond, msg) { cond ? (passed++, console.log('  ✅ ' + msg)) : (failed++, failures.push(msg), console.log('  ❌ ' + msg)) }

const tmpRoots = []
function makeRepo() {
  const d = mkdtempSync(join(tmpdir(), 'fds-'))
  tmpRoots.push(d)
  const g = (args) => execFileSync('git', args, { cwd: d, stdio: 'pipe' })
  g(['init', '-q'])
  g(['config', 'user.email', 't@t.com'])
  g(['config', 'user.name', 't'])
  mkdirSync(join(d, 'src'), { recursive: true })
  writeFileSync(join(d, 'src', 'a.js'), 'v1\n')
  g(['add', '.'])
  g(['commit', '-qm', 'init'])
  return d
}
function git(d, args) { execFileSync('git', args, { cwd: d, stdio: 'pipe' }) }
function writeGuard(d, sid, allowedFiles) {
  const dir = join(d, '.sillyspec', '.runtime', 'quick-sessions', sid)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'guard.json'), JSON.stringify({ sessionId: sid, allowedFiles }))
}
function writeChangeWithDesign(d, cn, files) {
  const dir = join(d, '.sillyspec', 'changes', cn)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'design.md'),
    `# x\n\n## 文件变更清单\n\n### 修改文件\n${files.map(f => `- ${f}`).join('\n')}\n`)
}
function writeWorktreeMeta(d, cn, meta) {
  const dir = join(d, '.sillyspec', '.runtime', 'worktrees', cn)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'meta.json'), JSON.stringify({ changeName: cn, ...meta }))
}

console.log('=== foreign-declared 活性收敛（坑 foreign-declared-stale-noise）===\n')

// 1. quick 声明 + 文件已 commit 干净 → 收敛
{
  const d = makeRepo()
  writeGuard(d, 'quick-deadbeef', ['src/a.js'])
  const m = collectForeignDeclaredFiles(d, 'quick-self')
  assert(!m.has('src/a.js'), 'quick 声明文件已 commit → 收敛（不再排除）')
  const s = splitOwnVsForeignDiffFiles(d, 'quick-self', ['src/a.js'])
  assert(s.foreign.length === 0 && s.own.includes('src/a.js'), 'splitOwnVsForeign 同步收敛')
}
// 2. quick 声明 + 文件 dirty → 保留
{
  const d = makeRepo()
  writeGuard(d, 'quick-deadbeef', ['src/a.js'])
  writeFileSync(join(d, 'src', 'a.js'), 'v2 dirty\n')
  const m = collectForeignDeclaredFiles(d, 'quick-self')
  assert(m.get('src/a.js')?.includes('quick-deadbeef'), 'quick 声明文件仍 dirty → 保留排除')
}
// 3. 变更无 worktree meta：干净收敛 / dirty 保留
{
  const d = makeRepo()
  writeChangeWithDesign(d, '2026-08-20-other-change', ['src/a.js'])
  assert(!collectForeignDeclaredFiles(d, 'my-change').has('src/a.js'), '变更无 meta 且文件已 commit → 收敛')
  writeFileSync(join(d, 'src', 'a.js'), 'v2 dirty\n')
  assert(collectForeignDeclaredFiles(d, 'my-change').get('src/a.js')?.includes('2026-08-20-other-change'),
    '变更无 meta 但文件 dirty → 保留（他者在途 WIP）')
}
// 4. 存活隔离 worktree → 整份保留（即使主仓干净）
{
  const d = makeRepo()
  writeChangeWithDesign(d, '2026-08-20-other-change', ['src/a.js'])
  const wtDir = mkdtempSync(join(tmpdir(), 'fds-wt-'))
  tmpRoots.push(wtDir)
  writeWorktreeMeta(d, '2026-08-20-other-change', { mode: 'worktree', worktreePath: wtDir })
  const m = collectForeignDeclaredFiles(d, 'my-change')
  assert(m.get('src/a.js')?.includes('2026-08-20-other-change'), '存活隔离 worktree → 声明整份保留')
}
// 5. in-place-fallback meta → 按主仓 dirty 判定（干净则收敛）
{
  const d = makeRepo()
  writeChangeWithDesign(d, '2026-08-20-other-change', ['src/a.js'])
  writeWorktreeMeta(d, '2026-08-20-other-change', { mode: 'in-place-fallback', worktreePath: d })
  assert(!collectForeignDeclaredFiles(d, 'my-change').has('src/a.js'), 'in-place meta + 主仓干净 → 收敛')
}
// 6. worktreePath 已不存在（幽灵 meta）→ 按主仓 dirty 判定
{
  const d = makeRepo()
  writeChangeWithDesign(d, '2026-08-20-other-change', ['src/a.js'])
  writeWorktreeMeta(d, '2026-08-20-other-change', { mode: 'worktree', worktreePath: join(d, 'no-such-dir') })
  assert(!collectForeignDeclaredFiles(d, 'my-change').has('src/a.js'), '幽灵 meta（目录不在）+ 干净 → 收敛')
}
// 7. 非 git 仓 → fail-closed 全保留
{
  const d = mkdtempSync(join(tmpdir(), 'fds-nogit-'))
  tmpRoots.push(d)
  writeGuard(d, 'quick-deadbeef', ['src/a.js'])
  writeChangeWithDesign(d, '2026-08-20-other-change', ['src/b.js'])
  const m = collectForeignDeclaredFiles(d, 'my-change')
  assert(m.get('src/a.js')?.includes('quick-deadbeef') && m.get('src/b.js')?.includes('2026-08-20-other-change'),
    'git 不可用 → fail-closed 保留全部声明')
}
// 8. 自身排除不受影响：本会话名传入仍跳过自身声明
{
  const d = makeRepo()
  writeGuard(d, 'quick-self', ['src/a.js'])
  writeFileSync(join(d, 'src', 'a.js'), 'v2 dirty\n')
  assert(!collectForeignDeclaredFiles(d, 'quick-self').has('src/a.js'), '自身会话声明本就不进 foreign（回归）')
}

for (const d of tmpRoots) { try { rmSync(d, { recursive: true, force: true }) } catch {} }
console.log(`\n${'='.repeat(50)}`)
console.log(`✅ 通过: ${passed}  ❌ 失败: ${failed}`)
if (failures.length) { console.log('失败项:'); failures.forEach(f => console.log('  - ' + f)) }
console.log('='.repeat(50))
if (failed > 0) process.exit(1)
