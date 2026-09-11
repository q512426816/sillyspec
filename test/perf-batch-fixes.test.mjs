/**
 * 性能包三项优化回归（2026-09-11 审查性能包，ql-20260912-001）。
 *
 * 锁行为：
 *  1. quicklog 平台推送移出 withFileLock 临界区：慢推送（3s 握持）期间锁必须可用——
 *     否则临界区可破 30s stale 偷锁阈值（5s 推送超时 + 逐变更 tasks 锁最坏叠加），
 *     他进程偷锁后双写者并发丢更新
 *  2. worktree-guard queryDbFirstCell 进程内直连 node:sqlite：查询语义不变
 *     （字符串/数值列、无行→null）、损坏 db fail-closed null
 *  3. autoCheck 卡片读取延后：行为等价（由既有 execute autocheck 套件覆盖），
 *     此处不重复——见 --result 说明
 */
import { mkdirSync, rmSync, writeFileSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { createServer } from 'node:http'
import { allocateQuicklogEntry, completeQuicklogEntry, withFileLock } from '../src/quicklog.js'
import { _queryDbFirstCellForTest } from '../src/hooks/worktree-guard.js'
import { DB } from '../src/db.js'
import { makeRepo, cleanup, report } from './_cli-step-harness.mjs'

const count = { passed: 0, failed: 0, failures: [] }
const assert = (cond, msg) => { cond ? (count.passed++, console.log(`  ✅ PASS: ${msg}`)) : (count.failed++, count.failures.push(msg), console.log(`  ❌ FAIL: ${msg}`)) }
const sleep = (ms) => new Promise(r => setTimeout(r, ms))

console.log('=== ① quicklog 推送出锁：慢推送期间锁可用 ===')
{
  // 慢服务器：接受连接后 3s 才响应（模拟平台高延迟；3s < PUSH_TIMEOUT_MS 5s，推送走成功路径）
  const DELAY_MS = 3000
  let hits = 0
  const server = createServer((req, res) => {
    hits++
    setTimeout(() => { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('{}') }, DELAY_MS)
  })
  await new Promise(r => server.listen(0, '127.0.0.1', r))
  const port = server.address().port

  const { cwd, specBase } = makeRepo('perf-push-')
  mkdirSync(specBase, { recursive: true })
  writeFileSync(join(specBase, 'local.yaml'), `platform:\n  url: http://127.0.0.1:${port}\n  token: test-token\n`)

  const t0 = Date.now()
  const allocating = allocateQuicklogEntry(specBase, 'tester', { description: '推送出锁验证' })
  await sleep(400) // 本地段（锁内）早已完成，推送在途
  const tProbe = Date.now()
  let lockFree = false
  let lockErr = null
  try {
    await withFileLock(join(specBase, 'quicklog', '.QUICKLOG-tester.md.lock'), async () => { lockFree = true }, { timeoutMs: 1500 })
  } catch (e) { lockErr = e }
  const lockElapsed = Date.now() - tProbe
  assert(lockFree && lockErr === null,
    `推送在途时锁可立即获取（${lockErr ? '超时: ' + lockErr.message : '获取耗时 ' + lockElapsed + 'ms'}——旧版锁被推送握持 3s 会超时）`)

  const { qlId } = await allocating
  assert(Boolean(qlId), `分配成功（${qlId}）`)
  assert(hits >= 1, `平台收到推送（hits=${hits}）`)
  const content = readFileSync(join(specBase, 'quicklog', 'QUICKLOG-tester.md'), 'utf8')
  assert(content.includes(qlId) && content.includes('进行中'), '条目已落盘（进行中）')

  // 无平台配置路径：complete 翻完成（推送跳过）——重构后本地链路回归保险
  rmSync(join(specBase, 'local.yaml'))
  await completeQuicklogEntry(specBase, 'tester', qlId, { resultText: '需求：t\n根因：无\n方案：t\n结果：t' })
  const after = readFileSync(join(specBase, 'quicklog', 'QUICKLOG-tester.md'), 'utf8')
  assert(after.includes('已完成'), 'completeQuicklogEntry 翻完成（无平台配置跳过推送）')

  server.close()
}

console.log('\n=== ② guard 直连 sqlite：查询语义 + fail-closed ===')
{
  const root = join(tmpdir(), 'perf-guard-' + Date.now())
  const runtime = join(root, '.sillyspec', '.runtime')
  mkdirSync(runtime, { recursive: true })
  const db = new DB(join(runtime, 'sillyspec.db'))
  db.init()
  const sq = db.getDb()
  sq.prepare("INSERT OR IGNORE INTO project (id,name,created_at,updated_at) VALUES (1,'p','t','t')").run()
  sq.prepare("INSERT INTO changes (name,current_stage,status,no_worktree,created_at,last_active) VALUES ('c','quick','active',0,'t','t')").run()
  db.close()
  assert(_queryDbFirstCellForTest(root, "SELECT current_stage FROM changes WHERE status='active' LIMIT 1") === 'quick',
    '字符串列读取正常')
  assert(_queryDbFirstCellForTest(root, "SELECT no_worktree FROM changes LIMIT 1") === '0',
    '数值列归一字符串（isNoWorktreeMode === \'1\' 语义不变）')
  assert(_queryDbFirstCellForTest(root, "SELECT current_stage FROM changes WHERE name='nope'") === null,
    '无行 → null')
  rmSync(join(runtime, 'sillyspec.db'))
  writeFileSync(join(runtime, 'sillyspec.db'), 'not-a-sqlite-file')
  assert(_queryDbFirstCellForTest(root, 'SELECT 1') === null, '损坏 db → fail-closed null')
  rmSync(root, { recursive: true, force: true })
}

cleanup()
report(count.passed, count.failed, count.failures)
