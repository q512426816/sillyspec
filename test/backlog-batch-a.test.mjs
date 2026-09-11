/**
 * backlog 批 A 三项修复回归（ql-20260912-002）。
 *
 * 锁行为：
 *  1. task-review verifyReviewGitEvidence 主仓 WIP 并入剔除他者声明文件（坑
 *     task-review-foreign-wip-blindspot）：共享仓下他者 WIP 稀释 diffFiles 使 emptyDiff
 *     伪造检测永不触发——修复后「他者声明文件全勾 + 本变更零 diff」的伪造 review 被 error 拦截
 *  2. mcp-server tools/call 子进程超时兜底：SILLYSPEC_MCP_CALL_TIMEOUT_MS 极小时被 kill 并
 *     返回 isError envelope（不再永久挂起）
 *  3. quicklog withFileLock：释放校验持有者（被偷锁后不误删他人新锁）+ 偷锁分支超时/退避
 *     （rename 持续失败不再忙等自旋，按 timeoutMs 抛错）
 */
import { mock } from 'node:test'
import { spawnSync } from 'node:child_process'

// 自举：mock.module 需 --experimental-test-module-mocks，裸跑时 respawn 自己一次（同 junction 套件）
if (typeof mock.module !== 'function') {
  if (process.env.SILLYSPEC_MOCK_RESPAWNED === '1') {
    console.error('mock.module 在加旗标 respawn 后仍不可用，放弃')
    process.exit(1)
  }
  const r = spawnSync(process.execPath,
    ['--experimental-test-module-mocks', '--disable-warning=ExperimentalWarning', ...process.argv.slice(1)],
    { stdio: 'inherit', env: { ...process.env, SILLYSPEC_MOCK_RESPAWNED: '1' } })
  process.exit(r.status ?? 0)
}

import { mkdtempSync, mkdirSync, writeFileSync, rmSync, utimesSync, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { execSync } from 'node:child_process'

const count = { passed: 0, failed: 0, failures: [] }
const assert = (cond, msg) => { cond ? (count.passed++, console.log(`  ✅ PASS: ${msg}`)) : (count.failed++, count.failures.push(msg), console.log(`  ❌ FAIL: ${msg}`)) }
const _tmpDirs = []
function mkTmp(prefix) {
  const d = mkdtempSync(join(tmpdir(), prefix + '-'))
  _tmpDirs.push(d)
  return d
}
function git(dir, args) {
  const r = spawnSync('git', args, { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  if (r.status !== 0) throw new Error(`git ${args.join(' ')}: ${r.stderr}`)
  return (r.stdout || '').trim()
}

console.log('=== ① task-review 主仓 WIP 并入剔除他者声明（伪造检测复活）===')
{
  const { validateTaskReviews } = await import('../src/task-review.js')
  const proj = mkTmp('ba-tr-')
  git(proj, ['init', '-q'])
  git(proj, ['config', 'user.email', 't@t.local'])
  git(proj, ['config', 'user.name', 't'])
  git(proj, ['config', 'commit.gpgsign', 'false'])
  writeFileSync(join(proj, '.gitignore'), '.sillyspec/\n')
  git(proj, ['add', '.']); git(proj, ['commit', '-q', '-m', 'init'])
  const baseHash = git(proj, ['rev-parse', 'HEAD'])

  const specBase = join(proj, '.sillyspec')
  const cur = '2026-09-12-review-own'
  // 他者变更 design 声明 foreign-wip.js（在途未归档）
  const other = join(specBase, 'changes', '2026-09-12-other-session')
  mkdirSync(other, { recursive: true })
  writeFileSync(join(other, 'design.md'),
    '# 设计\n\n## 文件变更清单\n\n| 序号 | 文件 | 说明 |\n|---|---|---|\n| 1 | foreign-wip.js | 他者 |\n')
  // 本变更目录（task 卡 + plan）
  const changeDir = join(specBase, 'changes', cur)
  mkdirSync(changeDir, { recursive: true })
  writeFileSync(join(changeDir, 'plan.md'), '# Plan\n\n- [ ] task-01: 示例任务\n')
  writeFileSync(join(changeDir, 'tasks.md'), '- [ ] task-01: 示例任务\n')

  // 他者 WIP：foreign-wip.js 落主仓（未跟踪、非本变更产物）
  writeFileSync(join(proj, 'foreign-wip.js'), 'export const foreign = 1\n')

  // 伪造 review：base=head（零 commit diff）、changedFiles 冒领他者 WIP 文件
  const runId = 'exec-2026-09-12-120000'
  const reviewDir = join(specBase, '.runtime', 'execute-runs', runId, 'tasks', 'task-01')
  mkdirSync(reviewDir, { recursive: true })
  writeFileSync(join(reviewDir, 'review.json'), JSON.stringify({
    schemaVersion: 1, task: 'task-01', specVerdict: 'pass', qualityVerdict: 'pass',
    base: baseHash, head: baseHash, changedFiles: ['foreign-wip.js'],
  }))

  const r = validateTaskReviews({
    planContent: readFileSync(join(changeDir, 'plan.md'), 'utf8'),
    runtimeRoot: join(specBase, '.runtime'),
    executeRunId: runId,
    changeDir,
    gitDir: proj,
  })
  assert(!r.ok, `伪造 review（零自有 diff + 冒领他者 WIP）被拦截（ok=${r.ok}）`)
  assert(r.errors.some(e => /零改动|无代码变更/.test(e)), `error 点名零改动（${(r.errors[0] || '').slice(0, 90)}）`)
  assert(r.warnings.some(w => /排除.*并行会话|foreign-wip/.test(w)), `warning 披露剔除的他者声明文件（${(r.warnings.find(w => /排除/.test(w)) || '').slice(0, 90)}）`)

  // 对照：无他者声明时（删除 other 目录）行为回到旧口径——WIP 全量并入不判伪造（零回归）
  rmSync(other, { recursive: true, force: true })
  const r2 = validateTaskReviews({
    planContent: readFileSync(join(changeDir, 'plan.md'), 'utf8'),
    runtimeRoot: join(specBase, '.runtime'),
    executeRunId: runId,
    changeDir,
    gitDir: proj,
  })
  assert(r2.ok, `无他者声明时 WIP 全量并入照旧（ok=${r2.ok}，向后兼容）`)
}

console.log('\n=== ② mcp-server tools/call 子进程超时兜底 ===')
{
  // env 必须在模块加载（CALL_TIMEOUT_MS 模块级常量）前设置 → 动态 import
  process.env.SILLYSPEC_MCP_CALL_TIMEOUT_MS = '10'
  const { startMcpServer } = await import('../src/mcp-server.js')
  delete process.env.SILLYSPEC_MCP_CALL_TIMEOUT_MS
  const { PassThrough } = await import('node:stream')
  const input = new PassThrough()
  const output = new PassThrough()
  startMcpServer({ input, output })
  const replies = []
  output.on('data', (d) => { for (const l of String(d).split('\n')) if (l.trim()) replies.push(JSON.parse(l)) })
  const t0 = Date.now()
  input.write(JSON.stringify({ jsonrpc: '2.0', method: 'tools/call', id: 1, params: { name: 'sillyspec_progress', arguments: {} } }) + '\n')
  let reply = null
  for (let i = 0; i < 200 && !reply; i++) {
    await new Promise(r => setTimeout(r, 25))
    reply = replies.find(r => r.id === 1)
  }
  assert(reply !== null, '收到 tools/call 回包（未永久挂起）')
  const elapsed = Date.now() - t0
  const text = reply?.result?.content?.[0]?.text || ''
  assert(reply?.result?.isError === true && /超时/.test(text),
    `超时被 kill 并返回 isError envelope（${elapsed}ms，text: ${text.slice(0, 70)}）`)
  assert(elapsed < 5000, `快速返回而非挂死（${elapsed}ms）`)
}

console.log('\n=== ③ quicklog withFileLock：释放校验 + 偷锁分支超时 ===')
console.log('--- ③a 释放不误删他人新锁（被偷锁场景）---')
{
  const { withFileLock } = await import('../src/quicklog.js')
  const dir = mkTmp('ba-lock-rel-')
  const lockPath = join(dir, '.test.lock')
  const ran = await withFileLock(lockPath, async () => {
    // 模拟临界区内被偷锁：他人回收旧锁并新建自己的锁
    rmSync(lockPath, { force: true })
    writeFileSync(lockPath, 'other-process-id')
    return 'done'
  })
  assert(ran === 'done', '临界区正常执行')
  assert(existsSync(lockPath) && readFileSync(lockPath, 'utf8') === 'other-process-id',
    '他人新锁未被误删（旧版 finally 无条件 unlink 会删掉它 → 第三方抢锁形成双写者）')
}
console.log('--- ③b 偷锁 rename 持续失败 → 按超时抛错（不忙等自旋）---')
{
  const realFs = await import('node:fs')
  const dir = mkTmp('ba-lock-spin-')
  const lockPath = join(dir, '.test.lock')
  // 造一把陈旧锁（mtime 1 小时前 → 进偷锁分支）
  writeFileSync(lockPath, 'dead-holder')
  const old = new Date(Date.now() - 3600_000)
  utimesSync(lockPath, old, old)
  let renameAttempts = 0
  const fsExports = { ...realFs }
  delete fsExports.constants
  fsExports.renameSync = (from, to) => {
    if (String(from) === lockPath) { renameAttempts++; throw Object.assign(new Error('EPERM: 文件被 AV 占用'), { code: 'EPERM' }) }
    return realFs.renameSync(from, to)
  }
  await mock.module('fs', { exports: fsExports })
  // mock 注册后再动态 import：拿绑定了 mock 的模块副本
  const quicklogMod = await import('../src/quicklog.js?spin-test=' + Date.now())
  const t0 = Date.now()
  let err = null
  try {
    await quicklogMod.withFileLock(lockPath, async () => 'should-not-run', { staleMs: 1, timeoutMs: 400, retryMs: 20 })
  } catch (e) { err = e }
  const elapsed = Date.now() - t0
  assert(err !== null && /文件锁超时/.test(err.message),
    `rename 持续失败按 timeoutMs 抛错（${elapsed}ms，${err ? err.message.slice(0, 50) : '未抛'}）——旧版 continue 跳过检查会无限自旋`)
  assert(elapsed < 5000, `在超时预算内返回（${elapsed}ms）`)
  assert(renameAttempts >= 2, `偷锁分支被重试进入（attempts=${renameAttempts}）`)
}

for (const d of _tmpDirs) { try { rmSync(d, { recursive: true, force: true }) } catch {} }
console.log(`\n${'='.repeat(50)}\n✅ 通过: ${count.passed}  ❌ 失败: ${count.failed}\n${'='.repeat(50)}`)
if (count.failed > 0) process.exit(1)
