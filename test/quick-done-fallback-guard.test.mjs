/**
 * Q7：quick --done 不带 --change 时 fallback 读 current-quick-run-id 命中他者/已完成会话的并发污染守卫
 * change: multi-agent-review P1 #13 (Q7) — src/run/command.js
 *
 * 并发两 quick 会话，B 后启动覆盖 A 写入 .runtime/current-quick-run-id（单文件 last-writer-wins）；
 * A 的 --done 不带 --change 会 fallback 读到 B（或已完成的 A）的 sessionId → 误操作他者会话的
 * progress/QUICKLOG。守卫：fallback 命中的会话若已完成或无可推进步骤，拒绝（exit 2）并要求显式 --change。
 *
 * 覆盖：
 *   1. 正向：fallback 命中「已完成」会话 → 守卫 exit 2（非 rule 655 的 exit 1 误推 --reopen）
 *   2. 负向：fallback 命中「可推进」会话（step1 pending）→ 守卫不拦截，正常推进 step1
 *
 * 隔离：mkdtempSync 临时 git 仓库 + 临时 specDir，不污染真实仓库。
 */
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs'
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
  return execFileSync('git', args, { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
}
function initGitRepo(dir) {
  git(dir, ['init', '-q']); git(dir, ['config', 'user.email', 'test@test.local'])
  git(dir, ['config', 'user.name', 'test']); git(dir, ['config', 'commit.gpgsign', 'false'])
}
async function captureStdout(fn) {
  const orig = console.log; let buf = ''
  console.log = (...a) => { buf += a.join(' ') + '\n' }
  const origErr = console.error; let errBuf = ''
  console.error = (...a) => { errBuf += a.join(' ') + '\n' }
  try { await fn() } finally { console.log = orig; console.error = origErr }
  return { stdout: buf, stderr: errBuf }
}
function extractSessionId(s) {
  const m = s.match(/sessionId:\s*(quick-[0-9a-f]{8})/)
  return m ? m[1] : null
}

console.log('=== Q7：quick --done fallback 并发污染守卫 ===\n')

const repo = mkdtempSync(join(tmpdir(), 'q7-guard-'))
initGitRepo(repo)
writeFileSync(join(repo, '.gitignore'), '.sillyspec/\n')
writeFileSync(join(repo, 'm.js'), 'console.log(1)\n')
git(repo, ['add', '.']); git(repo, ['commit', '-q', '-m', 'init'])
const specBase = join(repo, '.sillyspec')
await new ProgressManager({ specDir: specBase }).init(repo)
const idFile = join(specBase, '.runtime', 'current-quick-run-id')

// ── 正向：fallback 命中「已完成」会话 → 守卫拒绝（exit 2）──
const outA = await captureStdout(() => runCommand(['quick', 'Q7 正向', '--linked-changes', 'none', '--non-interactive'], repo))
const sidA = extractSessionId(outA.stdout)
assert(sidA !== null, `启动 quick 会话 A 分配 sidA: ${sidA}`)
assert(readFileSync(idFile, 'utf8').trim() === sidA, 'A 启动写入 current-quick-run-id = sidA')

// 模拟 A 已是「已完成」会话（并发场景：他者会话已收尾，current-quick-run-id 仍指向它）
const pm = new ProgressManager({ specDir: specBase })
const progA = await pm.read(repo, sidA)
progA.stages.quick.status = 'completed'
progA.stages.quick.steps = (progA.stages.quick.steps || []).map(s => ({ ...s, status: 'completed' }))
await pm._write(repo, progA, sidA)

// --done 不带 --change → fallback 读 sidA（已完成）→ 守卫命中
let posExit = null
let posErr = ''
const origExit1 = process.exit
process.exit = (code) => { throw new Error('EXIT_' + code) }
const origErrLog1 = console.error
console.error = (...a) => { posErr += a.join(' ') + '\n' }
try {
  await runCommand(['quick', '--done', '--output', '需求：x 根因：y 方案：z 结果：w'], repo)
} catch (e) { posExit = e }
process.exit = origExit1
console.error = origErrLog1
assert(posExit && posExit.message === 'EXIT_2', `fallback 命中已完成会话被守卫拒绝 exit 2（非 rule 655 的 exit 1）: ${posExit && posExit.message}`)
assert(posErr.includes('已不可推进') && posErr.includes('--change'), '拒绝信息提示并发污染 + 要求显式 --change')

// ── 负向：fallback 命中「可推进」会话 → 守卫不拦截，正常推进 ──
const outB = await captureStdout(() => runCommand(['quick', 'Q7 负向', '--linked-changes', 'none', '--non-interactive'], repo))
const sidB = extractSessionId(outB.stdout)
assert(sidB !== null && sidB !== sidA, `启动 quick 会话 B（新 sid，覆盖 current-quick-run-id）: ${sidB}`)
assert(readFileSync(idFile, 'utf8').trim() === sidB, 'B 启动覆盖 current-quick-run-id = sidB（last-writer-wins）')

let negExit = null
const origExit2 = process.exit
process.exit = (code) => { throw new Error('EXIT_' + code) }
try {
  await captureStdout(() => runCommand(['quick', '--done', '--output', 'step1 理解完成'], repo))
} catch (e) { negExit = e }
process.exit = origExit2
assert(!(negExit && negExit.message === 'EXIT_2'), 'fallback 命中可推进会话不被守卫拦截（守卫只兜 stale/completed）')
const progB = await new ProgressManager({ specDir: specBase }).read(repo, sidB)
assert(progB.stages.quick.steps[0].status === 'completed', 'B 的 step1 经 fallback --done 正常完成（守卫未误伤正常流）')

console.log('\n==================================================')
console.log(`✅ 通过: ${total - failed}  ❌ 失败: ${failed}`)
console.log('==================================================')
if (failed > 0) process.exit(1)
