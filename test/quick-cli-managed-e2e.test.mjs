/**
 * quick CLI 接管 QUICKLOG — 端到端集成回归测试
 * change: B-1（CLI 接管 QUICKLOG 写入 + ql-ID 分配 + 并发加锁）
 *
 * 覆盖真实 quick 流程：
 *   1. 启动 quick（带 --linked-changes）→ CLI 分配 ql-ID + 写「进行中」条目 + tasks.md 未勾选
 *   2. 幂等：同 sessionId 重入 run quick（新 ProgressManager 模拟跨进程）不重复分配/写条目
 *   3. step1/2/3 done → 条目翻「已完成」+ 结果行 + tasks.md 勾选 - [x]
 *   4. 强校验：手动删除条目后 step3 done 被阻断（桩 process.exit 捕获）
 *
 * 隔离：mkdtempSync 临时 git 仓库 + 临时 specDir，不污染真实仓库。
 */
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, existsSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { execFileSync } from 'node:child_process'
import { runCommand } from '../src/run.js'
import { ProgressManager } from '../src/progress.js'

let total = 0, failed = 0
function assert(condition, msg) {
  total++
  if (!condition) { failed++; console.log(`  ❌ FAIL: ${msg}`) }
  else console.log(`  ✅ PASS: ${msg}`)
}
function git(dir, args) {
  return execFileSync('git', args, { cwd: dir, encoding: 'utf8', stdio: ['ignore','pipe','pipe'] }).trim()
}
function initGitRepo(dir) {
  git(dir, ['init','-q']); git(dir, ['config','user.email','test@test.local'])
  git(dir, ['config','user.name','test']); git(dir, ['config','commit.gpgsign','false'])
}
async function captureStdout(fn) {
  const orig = console.log; let buf = ''
  console.log = (...a) => { buf += a.join(' ') + '\n' }
  const origErr = console.error; console.error = () => {}
  try { await fn() } finally { console.log = orig; console.error = origErr }
  return buf
}
function extractSessionId(stdout) {
  const m = stdout.match(/sessionId:\s*(quick-[0-9a-f]{8})/)
  return m ? m[1] : null
}

const tmpRoots = []
function makeTmpDir(prefix) { const d = mkdtempSync(join(tmpdir(), prefix)); tmpRoots.push(d); return d }

console.log('=== quick CLI 接管 QUICKLOG 端到端集成测试 ===\n')

const repo = makeTmpDir('ql-e2e-')
initGitRepo(repo)
writeFileSync(join(repo, '.gitignore'), '.sillyspec/\n')
writeFileSync(join(repo, 'm.js'), 'console.log(1)\n')
git(repo, ['add', '.']); git(repo, ['commit', '-q', '-m', 'init'])
const specBase = join(repo, '.sillyspec')
await new ProgressManager({ specDir: specBase }).init(repo)
const qlog = () => readdirSync(join(specBase, 'quicklog'))
  .filter(f => f.startsWith('QUICKLOG') && f.endsWith('.md'))
  .map(f => readFileSync(join(specBase, 'quicklog', f), 'utf8')).join('\n')

// 验收 1：启动分配 ql-ID + 写条目 + tasks.md
const out = await captureStdout(() => runCommand(['quick', '修手机校验', '--linked-changes', '2026-07-06-kanban-better-board', '--non-interactive'], repo))
const sid = extractSessionId(out)
const guard = JSON.parse(readFileSync(join(specBase, '.runtime', 'quick-sessions', sid, 'guard.json'), 'utf8'))
assert(/^ql-\d{8}-001-[0-9a-f]{4}$/.test(guard.quicklogId), `启动分配 ql-ID: ${guard.quicklogId}`)
assert(qlog().includes(`## ${guard.quicklogId} |`), 'QUICKLOG 有进行中条目')
assert(qlog().includes('状态：进行中'), '条目为「状态：进行中」')
assert(readFileSync(join(specBase, 'changes', '2026-07-06-kanban-better-board', 'tasks.md'), 'utf8').includes(`- [ ] ${guard.quicklogId}`), 'tasks.md 追加未勾选 task')

// 验收 2：同 sessionId 重入（新 ProgressManager 模拟跨进程，无 progress.quickGuard）不重复分配
{
  const pmFresh = new ProgressManager({ specDir: specBase })
  await captureStdout(() => runCommand(['quick', '--change', sid, '--non-interactive'], repo))
  const count = (qlog().match(/^## ql-\d{8}-\d{3}-[0-9a-f]{4} \|/gm) || []).length
  assert(count === 1, `同 sessionId 重入 run quick 不重复写条目（当前 ${count} 条）`)
}

// 验收 3：step1/2/3 done → 翻完成 + 结果 + 勾 tasks.md
await captureStdout(() => runCommand(['quick', '--done', '--change', sid, '--output', '理解完成', '--confirm'], repo))
await captureStdout(() => runCommand(['quick', '--done', '--change', sid, '--output', '实现完成', '--confirm'], repo))
await captureStdout(() => runCommand(['quick', '--done', '--change', sid, '--output', '暂存完成', '--confirm'], repo))
assert(qlog().includes('状态：已完成'), 'step3 done 后条目翻为「已完成」')
assert(qlog().includes('结果：'), 'step3 done 后追加结果行')
assert(readFileSync(join(specBase, 'changes', '2026-07-06-kanban-better-board', 'tasks.md'), 'utf8').includes(`- [x] ${guard.quicklogId}`), 'tasks.md 已勾选 - [x]')

// 验收 4：强校验 — 手动删条目后 step3 done 被阻断（桩 process.exit 捕获）
{
  const out3 = await captureStdout(() => runCommand(['quick', '删条目测试', '--linked-changes', 'none', '--non-interactive'], repo))
  const sid2 = extractSessionId(out3)
  const guard2 = JSON.parse(readFileSync(join(specBase, '.runtime', 'quick-sessions', sid2, 'guard.json'), 'utf8'))
  const qfile = join(specBase, 'quicklog', 'QUICKLOG-test.md')
  let lines = readFileSync(qfile, 'utf8').split('\n')
  const idx = lines.findIndex(l => l.startsWith(`## ${guard2.quicklogId} |`))
  lines.splice(idx, 4)
  writeFileSync(qfile, lines.join('\n'))
  await captureStdout(() => runCommand(['quick', '--done', '--change', sid2, '--output', 's1', '--confirm'], repo))
  await captureStdout(() => runCommand(['quick', '--done', '--change', sid2, '--output', 's2', '--confirm'], repo))
  const origExit = process.exit
  let exitErr = null
  process.exit = (code) => { throw new Error('EXIT_' + code) }
  try { await captureStdout(() => runCommand(['quick', '--done', '--change', sid2, '--output', 's3', '--confirm'], repo)) }
  catch (e) { exitErr = e }
  process.exit = origExit
  assert(exitErr && exitErr.message === 'EXIT_1', `删条目后 step3 done 被强校验阻断（process.exit(1)）`)
}

for (const dir of tmpRoots) { try { rmSync(dir, { recursive: true, force: true }) } catch {} }
console.log('\n==================================================')
console.log(`✅ 通过: ${total - failed}  ❌ 失败: ${failed}`)
console.log('==================================================')
if (failed > 0) process.exit(1)
