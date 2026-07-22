/**
 * quicklog CLI 接管层回归测试
 * change: B-1（CLI 接管 QUICKLOG 写入 + ql-ID 分配 + 并发加锁）
 *
 * 背景：QUICKLOG 原由 Agent 手写（漏写静默通过 + 并发丢更新）。
 * 本任务把分配/写入下沉到 src/quicklog.js，O_EXCL lockfile 串行化。
 *
 * 覆盖：
 *   1. allocateQuicklogEntry：格式 / NNN 递增 / XXXX / 描述清洗 / tasks.md 创建
 *   2. completeQuicklogEntry：翻状态 + 追加结果 + 勾选 tasks.md
 *   3. findQuicklogEntry：存在 / 不存在 / 目录缺失
 *   4. 轮转：>500 行 rename 归档，新条目写入新文件
 *   5. withFileLock：获取/释放、stale 偷锁、占用超时、无残留
 *   6. 并发：spawn N 子进程并发 allocate → 全不同 ql-ID + 全条目俱在 + 无 lock 残留
 *   7. writeAtomic：原子覆盖 + 无临时文件残留（reader 读不到半截/中间态）
 *   8. reader-writer 并发：writer 循环 complete，并发 reader 校验每次读到完整文件（非空/非半截）
 *
 * 隔离：mkdtempSync 临时 specBase，不污染真实仓库；quicklog 函数不需要 git。
 * 风格：自研 assert（无测试框架），参照 test/quick-baseline-dirty-worktree.test.mjs。
 */
import {
  mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync,
  existsSync, rmSync, utimesSync, appendFileSync,
} from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

import { allocateQuicklogEntry, completeQuicklogEntry, findQuicklogEntry, withFileLock } from '../src/quicklog.js'

const execFileP = promisify(execFile)

let total = 0
let failed = 0
function assert(condition, msg) {
  total++
  if (!condition) {
    failed++
    console.log(`  ❌ FAIL: ${msg}`)
  } else {
    console.log(`  ✅ PASS: ${msg}`)
  }
}

const tmpRoots = []
function makeTmpDir(prefix) {
  const dir = mkdtempSync(join(tmpdir(), prefix))
  tmpRoots.push(dir)
  return dir
}

const QL_RE = /^ql-\d{8}-\d{3}-[0-9a-f]{4}$/

console.log('=== quicklog CLI 接管层回归测试 ===\n')

// ─────────────────────────────────────────
// 验收 1：allocateQuicklogEntry — 格式 / NNN 递增 / 描述清洗 / tasks.md
// ─────────────────────────────────────────
console.log('--- 验收 1：allocateQuicklogEntry 分配 + tasks.md ---')
{
  const specBase = makeTmpDir('qlm-alloc-')
  const r1 = await allocateQuicklogEntry(specBase, 'alice', {
    description: '修复登录校验',
    linkedChanges: ['change-a'],
    allowedFiles: ['src/login.js'],
  })
  assert(QL_RE.test(r1.qlId), `分配的 ql-ID 格式合法（${r1.qlId}）`)
  assert(r1.qlId.includes('-001-'), `首个条目 NNN=001（${r1.qlId}）`)

  const r2 = await allocateQuicklogEntry(specBase, 'alice', { description: '第二个任务' })
  assert(r2.qlId.includes('-002-'), `次日序号递增 NNN=002（${r2.qlId}）`)
  assert(r2.qlId !== r1.qlId, `两次分配得到不同 ql-ID`)

  const log = readFileSync(join(specBase, 'quicklog', 'QUICKLOG-alice.md'), 'utf8')
  assert(log.includes(`## ${r1.qlId} |`), 'QUICKLOG 含条目 1 标题')
  assert(log.includes(`## ${r2.qlId} |`), 'QUICKLOG 含条目 2 标题')
  assert((log.match(/状态：进行中/g) || []).length === 2, '两条条目均为「状态：进行中」')
  assert(log.includes('关联变更：change-a'), '条目 1 含关联变更')
  assert(log.includes('文件：src/login.js'), '条目 1 含预估文件')

  // tasks.md：关联变更追加未勾选 task
  const tasks = readFileSync(join(specBase, 'changes', 'change-a', 'tasks.md'), 'utf8')
  assert(tasks.includes(`- [ ] ${r1.qlId} 修复登录校验`), 'tasks.md 追加未勾选 task')

  // 描述清洗：空描述回退占位、换行压一行、超长截断
  const r3 = await allocateQuicklogEntry(specBase, 'alice', { description: '' })
  const log2 = readFileSync(join(specBase, 'quicklog', 'QUICKLOG-alice.md'), 'utf8')
  assert(log2.includes('(quick 任务)'), '空描述回退占位符')

  // 幂等：重复追加同 qlId 的 tasks.md 不产生重复行
  const r1b = await allocateQuicklogEntry(specBase, 'alice', { description: '幂等任务', linkedChanges: ['change-a'] })
  const tasks2 = readFileSync(join(specBase, 'changes', 'change-a', 'tasks.md'), 'utf8')
  assert((tasks2.match(new RegExp(r1.qlId, 'g')) || []).length === 1, 'tasks.md 同 qlId 无重复行')
}

// ─────────────────────────────────────────
// 验收 2：completeQuicklogEntry — 翻状态 + 结果 + 勾选
// ─────────────────────────────────────────
console.log('\n--- 验收 2：completeQuicklogEntry 完成态 ---')
{
  const specBase = makeTmpDir('qlm-complete-')
  const r = await allocateQuicklogEntry(specBase, 'bob', {
    description: '完成我', linkedChanges: ['change-b'], allowedFiles: [],
  })
  await completeQuicklogEntry(specBase, 'bob', r.qlId, {
    resultText: '已修复并通过测试', linkedChanges: ['change-b'],
  })
  const log = readFileSync(join(specBase, 'quicklog', 'QUICKLOG-bob.md'), 'utf8')
  assert(log.includes('状态：已完成'), '条目已翻为「状态：已完成」')
  assert(!log.includes('状态：进行中'), '不再含「状态：进行中」')
  assert(log.includes('结果：已修复并通过测试'), '条目追加了结果行')
  const tasks = readFileSync(join(specBase, 'changes', 'change-b', 'tasks.md'), 'utf8')
  assert(tasks.includes(`- [x] ${r.qlId}`), 'tasks.md 已勾选为 - [x]')

  // 完成不存在的 qlId：不抛错、不产生幽灵结果行
  const before = readFileSync(join(specBase, 'quicklog', 'QUICKLOG-bob.md'), 'utf8')
  await completeQuicklogEntry(specBase, 'bob', 'ql-99999999-999-zzzz', { resultText: 'x', linkedChanges: [] })
  const after = readFileSync(join(specBase, 'quicklog', 'QUICKLOG-bob.md'), 'utf8')
  assert(after === before, '完成不存在的 qlId 不修改文件、不抛错')
}

// ─────────────────────────────────────────
// 验收 3：findQuicklogEntry — 存在 / 不存在 / 目录缺失
// ─────────────────────────────────────────
console.log('\n--- 验收 3：findQuicklogEntry 查找 ---')
{
  const specBase = makeTmpDir('qlm-find-')
  const r = await allocateQuicklogEntry(specBase, 'carol', { description: '找我' })
  assert(findQuicklogEntry(specBase, 'carol', r.qlId) === true, '能找到已分配条目')
  assert(findQuicklogEntry(specBase, 'carol', 'ql-20260101-001-dead') === false, '查不到不存在的条目')

  const emptyBase = makeTmpDir('qlm-findempty-')
  assert(findQuicklogEntry(emptyBase, 'nobody', 'ql-20260101-001-beef') === false, 'quicklog 目录缺失时返回 false')
}

// ─────────────────────────────────────────
// 验收 4：轮转 — >500 行 rename 归档
// ─────────────────────────────────────────
console.log('\n--- 验收 4：QUICKLOG 轮转 ---')
{
  const specBase = makeTmpDir('qlm-rotate-')
  mkdirSync(join(specBase, 'quicklog'), { recursive: true })
  const lines = ['## ql-20260701-001-abcd | 2026-07-01 10:00:00 | 旧记录', '状态：已完成']
  for (let i = 0; i < 501; i++) lines.push(`填充行 ${i}`)
  writeFileSync(join(specBase, 'quicklog', 'QUICKLOG-rot.md'), lines.join('\n'))

  const r = await allocateQuicklogEntry(specBase, 'rot', { description: '新任务' })
  assert(existsSync(join(specBase, 'quicklog', 'QUICKLOG-rot-2026-07-01.md')), '超过500行触发轮转归档（日期取最后记录）')
  const fresh = readFileSync(join(specBase, 'quicklog', 'QUICKLOG-rot.md'), 'utf8')
  assert(fresh.includes(`## ${r.qlId} |`), '轮转后新条目写入新主文件')
  assert(!fresh.includes('旧记录'), '新主文件不含旧记录')
}

// ─────────────────────────────────────────
// 验收 5：withFileLock — 获取/释放 / stale 偷锁 / 占用超时 / 无残留
// ─────────────────────────────────────────
console.log('\n--- 验收 5：withFileLock 锁行为 ---')
{
  const specBase = makeTmpDir('qlm-lock-')
  const lockDir = join(specBase, 'quicklog')
  mkdirSync(lockDir, { recursive: true })

  // 获取/释放
  const lpBasic = join(lockDir, '.basic.lock')
  let sawLockInside = false
  await withFileLock(lpBasic, async () => { sawLockInside = existsSync(lpBasic) })
  assert(sawLockInside, '持锁期间 lockfile 存在')
  assert(!existsSync(lpBasic), '释放后 lockfile 不存在（无残留）')

  // stale 偷锁
  const lpStale = join(lockDir, '.stale.lock')
  writeFileSync(lpStale, '')
  const past = new Date(Date.now() - 60_000)
  utimesSync(lpStale, past, past)
  let ran = false
  await withFileLock(lpStale, async () => { ran = true }, { staleMs: 1000, timeoutMs: 2000, retryMs: 20 })
  assert(ran, 'stale 锁被偷走，临界区正常执行')
  assert(!existsSync(lpStale), 'stale 偷锁后锁已释放')

  // 占用超时（fresh 锁）
  const lpFresh = join(lockDir, '.fresh.lock')
  writeFileSync(lpFresh, '')
  let threw = null
  try {
    await withFileLock(lpFresh, async () => {}, { timeoutMs: 300, retryMs: 50, staleMs: 60000 })
  } catch (e) { threw = e }
  assert(threw !== null, '锁被占用（fresh）时 withFileLock 超时抛错')
  rmSync(lpFresh, { force: true })
}

// ─────────────────────────────────────────
// 验收 6：并发 — spawn N 子进程并发 allocate，全不同 + 全俱在 + 无残留
// ─────────────────────────────────────────
console.log('\n--- 验收 6：并发分配（spawn 子进程）---')
{
  const specBase = makeTmpDir('qlm-conc-')
  const quicklogUrl = new URL('../src/quicklog.js', import.meta.url).href
  const workerPath = join(specBase, 'worker.mjs')
  writeFileSync(workerPath, [
    'const [,, quicklogUrl, specBase, gitUser, desc] = process.argv',
    'const { allocateQuicklogEntry } = await import(quicklogUrl)',
    'const r = await allocateQuicklogEntry(specBase, gitUser, { description: desc, linkedChanges: [], allowedFiles: [] })',
    'process.stdout.write(r.qlId + "\\n")',
  ].join('\n'))

  const N = 6
  const jobs = []
  for (let i = 0; i < N; i++) {
    jobs.push(execFileP(process.execPath, [workerPath, quicklogUrl, specBase, 'conc', `task-${i}`]))
  }
  const results = await Promise.all(jobs)
  const ids = results.map(r => r.stdout.trim())
  assert(new Set(ids).size === N, `并发 ${N} 进程得到 ${N} 个不同 ql-ID（无 NNN 撞号）`)
  assert(ids.every(id => QL_RE.test(id)), '并发分配的 ql-ID 全部格式合法')

  const logContent = readFileSync(join(specBase, 'quicklog', 'QUICKLOG-conc.md'), 'utf8')
  const entryCount = (logContent.match(/^## ql-\d{8}-\d{3}-[0-9a-f]{4} \|/gm) || []).length
  assert(entryCount === N, `并发写入后 QUICKLOG 有 ${N} 条条目（无丢失/无交错）`)

  const lockResidue = readdirSync(join(specBase, 'quicklog')).filter(f => f.endsWith('.lock'))
  assert(lockResidue.length === 0, '并发结束后无 lockfile 残留')
}

// ─────────────────────────────────────────
// 验收 7：writeAtomic — 原子覆盖 + 无临时文件残留
// ─────────────────────────────────────────
console.log('\n--- 验收 7：writeAtomic 原子写行为 ---')
{
  const specBase = makeTmpDir('qlm-atomic-')
  const r = await allocateQuicklogEntry(specBase, 'atomic', { description: '原子写' })
  await completeQuicklogEntry(specBase, 'atomic', r.qlId, { resultText: 'done', linkedChanges: [] })

  const userFile = join(specBase, 'quicklog', 'QUICKLOG-atomic.md')
  const log = readFileSync(userFile, 'utf8')
  assert(log.includes('状态：已完成'), 'complete 走原子写后状态已翻')
  assert(log.includes(`## ${r.qlId} |`), '条目标题完整存在（非半截）')
  // 临时文件随 rename 消失（同 pid 复用则覆盖而非堆积），不残留 .tmp-*
  const tmpResidue = readdirSync(join(specBase, 'quicklog')).filter(f => f.includes('.tmp-'))
  assert(tmpResidue.length === 0, '原子写后无 .tmp-* 临时文件残留')
}

// ─────────────────────────────────────────
// 验收 8：reader-writer 并发 — writer 循环 complete，独立 reader 进程校验每次读到完整文件
// 守护用户原始故障：「agent 读 QUICKLOG 时，quick 写入的新日志落进其读到的文件」。
// writeAtomic 保证 reader 永远看到完整旧版或完整新版，绝不读半截/空。
// reader 用独立 spawn 进程（贴近真实：dashboard / 另一 agent 是独立进程，也避免同进程 event-loop 串扰）。
// ─────────────────────────────────────────
console.log('\n--- 验收 8：reader-writer 并发（独立 reader 进程）---')
{
  const specBase = makeTmpDir('qlm-rw-')
  const quicklogUrl = new URL('../src/quicklog.js', import.meta.url).href
  // 预置多个条目，让 complete 循环逐条翻状态（多轮读改写）
  const ids = []
  for (let i = 0; i < 3; i++) {
    const r = await allocateQuicklogEntry(specBase, 'rw', { description: `rw-task-${i}` })
    ids.push(r.qlId)
  }
  const userFile = join(specBase, 'quicklog', 'QUICKLOG-rw.md')
  const resultFile = join(specBase, 'reader-result.txt')

  // 独立 reader 进程：不持锁，按固定时长循环读，校验非空、非半截；结束时把 reads/corrupt 写结果文件
  const readerPath = join(specBase, 'reader.mjs')
  writeFileSync(readerPath, [
    'import { readFileSync, writeFileSync } from "node:fs"',
    'const [,, userFile, resultFile, runMs] = process.argv',
    'const deadline = Date.now() + Number(runMs)',
    'let reads = 0, corrupt = 0',
    'while (Date.now() < deadline) {',
    '  let content = ""',
    '  try { content = readFileSync(userFile, "utf8") } catch { content = "" }',
    '  if (content === "") corrupt++',
    '  else {',
    '    const lines = content.split("\\n")',
    '    if (lines.some(l => l.startsWith("## ") && !l.includes(" | "))) corrupt++',
    '  }',
    '  reads++',
    '}',
    'writeFileSync(resultFile, JSON.stringify({ reads, corrupt }))',
  ].join('\n'))

  const readerPromise = execFileP(process.execPath, [readerPath, userFile, resultFile, '3000'])

  // writer（主进程）：循环 complete 所有条目多轮，持续触发读改写（翻转在 atomic 内完成）
  const writerStart = Date.now()
  let rounds = 0
  while (Date.now() - writerStart < 3200) {
    for (const id of ids) {
      await completeQuicklogEntry(specBase, 'rw', id, { resultText: `round-${rounds}`, linkedChanges: [] })
    }
    rounds++
  }
  await readerPromise

  const { reads, corrupt } = JSON.parse(readFileSync(resultFile, 'utf8'))
  assert(reads > 0, `reader 实际执行了读取（${reads} 次）`)
  assert(corrupt === 0, `并发期间 reader 读到 ${reads} 次，损坏次数 ${corrupt}（应为 0）`)
  const finalLog = readFileSync(userFile, 'utf8')
  assert((finalLog.match(/状态：已完成/g) || []).length === 3, '收尾后 3 条条目全部已完成')
  const tmpResidue = readdirSync(join(specBase, 'quicklog')).filter(f => f.includes('.tmp-'))
  assert(tmpResidue.length === 0, '并发结束后无 .tmp-* 临时文件残留')
}

// ─────────────────────────────────────────
// 清理 & 汇总
// ─────────────────────────────────────────
for (const dir of tmpRoots) {
  try { rmSync(dir, { recursive: true, force: true }) } catch {}
}

console.log('\n==================================================')
console.log(`✅ 通过: ${total - failed}  ❌ 失败: ${failed}`)
console.log('==================================================')
if (failed > 0) process.exit(1)
