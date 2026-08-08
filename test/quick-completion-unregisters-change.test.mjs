/**
 * Q1（multi-agent-review-2026-08-08）：quick 完成收尾注销 changes 行
 *
 * 背景：每个 quick sessionId（quick-<8hex>）启动时 registerChange 写入 changes 表 status='active'。
 * 旧代码 --done 成功后只清 session 目录 + 重置 steps，从不调 unregisterChange → active 的 quick-<hex>
 * 行随每次 quick 单调累积，污染 listChanges / resolveQuickLinkedChanges / doctor。
 *
 * 修复：handleQuickStageCompletion 成功路径对 quick-<8hex> sessionId 调 pm.unregisterChange。
 *
 * 本测试（e2e，参照 quick-session-guard-cleanup.test.mjs 的 harness）：
 *   1. 跑完一个 quick → 其 quick-<hex> 行从 active 注销（不再进 listChanges）
 *   2. 连跑第二个 quick → 两个 sid 都不在 active（验证「不累积」，旧 bug 会两个都留着）
 *   3. 预置一个真实关联变更 → quick 完成后真实变更仍 active（注销只针对 quick-<hex> sessionId）
 */
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { execFileSync } from 'node:child_process'

import { runCommand } from '../src/run.js'
import { ProgressManager } from '../src/progress.js'

const structured = '需求：Q1 注销测试\n根因：无，测试用例\n方案：quick 收尾注销 changes 行\n结果：listChanges 不累积'

let total = 0, failed = 0
function assert(cond, msg) {
  total++
  if (!cond) { failed++; console.log(`  ❌ FAIL: ${msg}`) }
  else console.log(`  ✅ PASS: ${msg}`)
}
function git(dir, args) { return execFileSync('git', args, { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim() }
function initGitRepo(dir) {
  git(dir, ['init', '-q']); git(dir, ['config', 'user.email', 'test@test.local'])
  git(dir, ['config', 'user.name', 'test']); git(dir, ['config', 'commit.gpgsign', 'false'])
}
const tmpRoots = []
function makeTmpDir(p) { const d = mkdtempSync(join(tmpdir(), p)); tmpRoots.push(d); return d }
async function captureStdout(fn) {
  const orig = console.log; let buf = ''; console.log = (...a) => { buf += a.join(' ') + '\n' }
  const e = console.error; console.error = () => {}
  try { await fn() } finally { console.log = orig; console.error = e }
  return buf
}
function extractSessionId(stdout) { const m = stdout.match(/sessionId:\s*(quick-[0-9a-f]{8})/); return m ? m[1] : null }

async function runQuickToCompletion(repo, taskDesc) {
  const out = await captureStdout(() => runCommand(['quick', taskDesc, '--non-interactive'], repo))
  const sid = extractSessionId(out)
  if (!sid) throw new Error(`未提取到 sessionId：${out}`)
  // 3 步 --done（最后一步带结构化 output）
  await captureStdout(() => runCommand(['quick', '--done', '--change', sid, '--output', 's1', '--confirm'], repo))
  await captureStdout(() => runCommand(['quick', '--done', '--change', sid, '--output', 's2', '--confirm'], repo))
  await captureStdout(() => runCommand(['quick', '--done', '--change', sid, '--output', structured, '--confirm'], repo))
  return sid
}

console.log('=== Q1: quick 完成收尾注销 changes 行 ===\n')

// ── 验收 1 + 2：连跑两个 quick，两个 sid 都不进 active listChanges（不累积）──
console.log('--- 验收 1+2：连跑两个 quick，sid 注销不累积 ---')
let sid1, sid2
{
  const repo = makeTmpDir('q1-unreg-')
  initGitRepo(repo)
  writeFileSync(join(repo, '.gitignore'), '.sillyspec/\n')
  writeFileSync(join(repo, 'main.js'), 'console.log(1)\n')
  git(repo, ['add', '.']); git(repo, ['commit', '-q', '-m', 'init'])

  const specBase = join(repo, '.sillyspec')
  const pmInit = new ProgressManager({ specDir: specBase })
  await pmInit.init(repo)
  const pm = new ProgressManager({ specDir: specBase })

  sid1 = await runQuickToCompletion(repo, 'fix Q1 bug one')
  let active = await pm.listChanges(repo)
  assert(!active.includes(sid1), `第 1 个 quick 完成后 sid1(${sid1}) 已从 active 注销（实际 active=${JSON.stringify(active)}）`)

  sid2 = await runQuickToCompletion(repo, 'fix Q1 bug two')
  active = await pm.listChanges(repo)
  assert(!active.includes(sid2), `第 2 个 quick 完成后 sid2(${sid2}) 已从 active 注销（实际 active=${JSON.stringify(active)}）`)
  assert(!active.includes(sid1), `第 2 个 quick 完成后 sid1(${sid1}) 仍不累积（旧 bug 会两个都留，实际 active=${JSON.stringify(active)}）`)
}

// ── 验收 3：预置真实关联变更，quick 完成后真实变更仍 active（注销只针对 quick-<hex>）──
console.log('\n--- 验收 3：真实关联变更不被误注销 ---')
{
  const repo = makeTmpDir('q1-realchange-')
  initGitRepo(repo)
  writeFileSync(join(repo, '.gitignore'), '.sillyspec/\n')
  writeFileSync(join(repo, 'main.js'), 'console.log(1)\n')
  git(repo, ['add', '.']); git(repo, ['commit', '-q', '-m', 'init'])

  const specBase = join(repo, '.sillyspec')
  const pmInit = new ProgressManager({ specDir: specBase })
  await pmInit.init(repo)
  const pm = new ProgressManager({ specDir: specBase })

  // 预置一个真实变更（非 quick-<hex>）—— registerChange 让它进 active
  const realChange = 'my-real-feature'
  await pm.registerChange(repo, realChange)
  let active = await pm.listChanges(repo)
  assert(active.includes(realChange), `预置真实变更 ${realChange} 已注册为 active`)

  // 跑一个 quick（不关联 realChange），完成后 realChange 应仍 active
  const sid = await runQuickToCompletion(repo, 'independent quick task')
  active = await pm.listChanges(repo)
  assert(!active.includes(sid), `quick sid(${sid}) 已注销`)
  assert(active.includes(realChange), `真实关联变更 ${realChange} 仍 active（未被误注销，实际 active=${JSON.stringify(active)}）`)
}

for (const dir of tmpRoots) { try { rmSync(dir, { recursive: true, force: true }) } catch {} }
console.log('\n==================================================')
console.log(`✅ 通过: ${total - failed}  ❌ 失败: ${failed}`)
console.log('==================================================')
if (failed > 0) process.exit(1)
