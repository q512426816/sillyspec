import { readdirSync, existsSync, rmSync, readFileSync, mkdtempSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFile } from 'node:child_process'
import { homedir, tmpdir } from 'node:os'
import { promisify } from 'node:util'

const execFileP = promisify(execFile)

const testDir = dirname(fileURLToPath(import.meta.url))

// 套件级 TEMP 隔离：不少测试用 join(tmpdir(), 固定名) + 预清理 rmSync 建 fixture，
// 两个 npm test 并发时（agent 与人各跑一次是 dogfood 常态）同路径互踩——
// EPERM/ENOENT/git init 失败级联（2026-08-08 曾全量 102 文件污染，2026-08-21 双套件压测复现 5 处）。
// 子进程 TEMP/TMP/TMPDIR 统一指向套件唯一目录后固定路径天然分家，无需逐个改测试；
// os.tmpdir() 读 TMPDIR（POSIX）/ TEMP、TMP（Windows），三个都覆写。
// HOME/USERPROFILE 一并隔离（2026-08-21 审查 BUG-12③）：mid-run 窗口内 ~/.sillyspec-platform.json
// 指针仍可能写进真实 HOME（套件首尾清理护不住并发双套件的中间窗口）。os.homedir() 在
// Windows 读 USERPROFILE、POSIX 读 HOME，两个都覆写；git 子进程因此读不到全局 .gitconfig，
// 预置最小 .gitconfig（user 身份 + init.defaultBranch=main）保住 git fixture 的 commit/init。
const suiteTmp = mkdtempSync(join(tmpdir(), 'sillyspec-suite-'))
mkdirSync(join(suiteTmp, 'home'), { recursive: true })
writeFileSync(join(suiteTmp, 'home', '.gitconfig'), '[user]\n\tname = sillyspec-test\n\temail = sillyspec-test@localhost\n[init]\n\tdefaultBranch = main\n')
const childEnv = {
  ...process.env,
  TEMP: suiteTmp,
  TMP: suiteTmp,
  TMPDIR: suiteTmp,
  HOME: join(suiteTmp, 'home'),
  USERPROFILE: join(suiteTmp, 'home'),
}

// 全局指针污染防护：测试可能把 ~/.sillyspec-platform.json 写到 HOME（cwd 纠正到 home 的缝隙），
// 不清理则污染用户真实环境——之后任何项目跑 sillyspec 都被静默引向死 temp 库。
// 套件前后各清一次，兜底所有测试（无论哪个写 home）。
// 平台接管声明（.sillyspec-platform-managed）同源防护：泄漏到 HOME 会让 home 下所有
// 命令 fail-closed（PlatformManagedError）且套件不自愈——与指针一并清理。
const homePointer = join(homedir(), '.sillyspec-platform.json')
const homeManaged = join(homedir(), '.sillyspec-platform-managed')
function cleanHomePointer() {
  for (const [p, kind] of [[homePointer, '指针'], [homeManaged, '接管声明']]) {
    if (!existsSync(p)) continue
    try {
      const before = readFileSync(p, 'utf8')
      rmSync(p, { force: true, maxRetries: 3, retryDelay: 200 })
      console.log(`[teardown] 清理 HOME ${kind}污染：${p}（原内容 ${before.slice(0, 80)}...）`)
    } catch (e) {
      // 清理失败必须留痕：静默吞掉会让 HOME 污染原样留存——正是本函数要防的事故
      console.error(`[teardown] ⚠️ 清理 HOME ${kind}污染失败：${p}（${e && e.message ? e.message : e}）——请手动删除`)
    }
  }
}
cleanHomePointer()

// 递归收集所有 .test.mjs（含子目录如 test/dispatch/），便于按模块组织测试
function collectTestFiles(dir) {
  const out = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      out.push(...collectTestFiles(join(dir, entry.name)))
    } else if (entry.name.endsWith('.test.mjs')) {
      out.push(join(dir, entry.name))
    }
  }
  return out
}
const files = collectTestFiles(testDir).sort()

if (files.length === 0) {
  console.log('No test files found')
  process.exit(0)
}

// 并发度：CPU 核数，最少 4，最多 12
const CONCURRENCY = Math.max(4, Math.min(12, (await import('node:os')).cpus().length))

let passed = 0
let failed = 0
const failures = []
const timings = []

// 进度输出锁 —— 并行打印不交错
let printLock = Promise.resolve()
function lockedPrint(fn) {
  const p = printLock.then(() => {
    fn()
    return new Promise(r => setImmediate(r))
  })
  printLock = p
  return p
}

async function runOne(fullPath) {
  const file = relative(testDir, fullPath)
  const t0 = performance.now()
  try {
    const { stdout, stderr } = await execFileP(process.execPath, [fullPath], {
      cwd: testDir,
      env: childEnv,
      timeout: 120_000,
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024
    })
    const ms = Math.round(performance.now() - t0)
    timings.push({ file, ms })
    await lockedPrint(() => {
      console.log(`\nRunning ${file}`)
      if (stdout) process.stdout.write(stdout)
      if (stderr) process.stderr.write(stderr)
      console.log(`  ⏱️ ${ms}ms`)
    })
    passed++
  } catch (err) {
    const ms = Math.round(performance.now() - t0)
    timings.push({ file, ms, failed: true })
    await lockedPrint(() => {
      console.log(`\nRunning ${file}`)
      if (err.stdout) process.stdout.write(err.stdout)
      if (err.stderr) process.stderr.write(err.stderr)
      console.log(`  ❌ ${file} exited with code ${err.code || err.status || 1} (${ms}ms)`)
    })
    failed++
    failures.push(file)
  }
}

// 并发池：一次跑 CONCURRENCY 个，完成一个补一个
async function runAll() {
  const queue = [...files]
  const running = new Set()

  async function worker() {
    while (queue.length > 0) {
      const file = queue.shift()
      const p = runOne(file)
      running.add(p)
      p.finally(() => running.delete(p))
      await p
    }
  }

  // 启动 CONCURRENCY 个 worker
  const workers = Array.from({ length: Math.min(CONCURRENCY, queue.length) }, () => worker())
  await Promise.all(workers)

  // 兜底：等待所有仍在跑的完成（理论上 worker 返回时已全部完成）
  if (running.size > 0) await Promise.all(Array.from(running))
}

const totalT0 = performance.now()
await runAll()
const totalMs = Math.round(performance.now() - totalT0)

// 按原始顺序排序 timings 后再打印汇总
timings.sort((a, b) => files.indexOf(join(testDir, a.file)) - files.indexOf(join(testDir, b.file)))

console.log(`\n${'='.repeat(50)}`)
console.log(`✅ 通过: ${passed}  ❌ 失败: ${failed}`)
if (failures.length > 0) {
  console.log(`失败文件: ${failures.join(', ')}`)
}
console.log(`${'='.repeat(50)}`)

// 慢测试排行（Top 20）
console.log(`\n⏱️  总耗时: ${(totalMs / 1000).toFixed(1)}s (${timings.length} 个文件，并发 ${CONCURRENCY})`)
console.log(`\n🐌 最慢 20 个测试:`)
const sorted = [...timings].sort((a, b) => b.ms - a.ms)
sorted.slice(0, 20).forEach((t, i) => {
  const flag = t.failed ? ' ❌' : ''
  console.log(`  ${String(i + 1).padStart(2)}. ${(t.ms / 1000).toFixed(1)}s  ${t.file}${flag}`)
})

cleanHomePointer()

// 套件 TEMP 目录回收：子进程均已退出，句柄应已释放；Windows 偶发 EPERM 由
// maxRetries 兜底，仍失败则放弃（留在系统 Temp 下由 OS 回收，不影响隔离语义）
try {
  rmSync(suiteTmp, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 })
} catch {}

process.exit(failed > 0 ? 1 : 0)
