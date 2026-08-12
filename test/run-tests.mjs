import { readdirSync, existsSync, rmSync, readFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFile } from 'node:child_process'
import { homedir } from 'node:os'
import { promisify } from 'node:util'

const execFileP = promisify(execFile)

const testDir = dirname(fileURLToPath(import.meta.url))

// 全局指针污染防护：测试可能把 ~/.sillyspec-platform.json 写到 HOME（cwd 纠正到 home 的缝隙），
// 不清理则污染用户真实环境——之后任何项目跑 sillyspec 都被静默引向死 temp 库。
// 套件前后各清一次，兜底所有测试（无论哪个写 home）。
const homePointer = join(homedir(), '.sillyspec-platform.json')
function cleanHomePointer() {
  if (!existsSync(homePointer)) return
  try {
    const before = readFileSync(homePointer, 'utf8')
    rmSync(homePointer, { force: true })
    console.log(`[teardown] 清理 HOME 指针污染：${homePointer}（原指向 ${before.slice(0, 80)}...）`)
  } catch {}
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

process.exit(failed > 0 ? 1 : 0)
