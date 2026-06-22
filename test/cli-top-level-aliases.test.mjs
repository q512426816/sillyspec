/**
 * task-10: 顶层命令别名 doctor/scan/status/quick/explore 转发 runCommand
 *
 * 设计依据：task-10.md §TDD + §验收标准
 *   - sillyspec doctor / scan / status / quick / explore 不再落 default 分支报"未知命令"
 *   - 行为与 sillyspec run <stage> 字节一致
 *   - sillyspec worktree doctor 仍走 worktree 分支
 *   - sillyspec foobar 仍报未知命令
 *
 * 断言策略：
 *   stage 在空目录下可能因无 .sillyspec 进度而 exit != 0（这是 stage 自身行为，
 *   不属于本任务路由范围）。因此测试只验证"路由正确"——即 stderr 不含"未知命令"
 *   字样（default 分支的特征文案），并且 doctor/scan 两路 stdout 字节一致。
 */

import { spawnSync } from 'node:child_process'
import { mkdirSync, rmSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const cliBin = resolve(__dirname, '..', 'bin', 'sillyspec.js')

let passed = 0
let failed = 0

function assert(cond, msg) {
  if (cond) {
    console.log(`  ✅ PASS: ${msg}`)
    passed++
  } else {
    console.log(`  ❌ FAIL: ${msg}`)
    failed++
  }
}

function runCLI(args, cwd) {
  const res = spawnSync(process.execPath, [cliBin, ...args], {
    cwd,
    encoding: 'utf8',
    timeout: 15000,
    stdio: ['pipe', 'pipe', 'pipe'],
  })
  return {
    stdout: res.stdout || '',
    stderr: res.stderr || '',
    status: res.status,
    combined: (res.stdout || '') + (res.stderr || ''),
  }
}

function cleanSillySpec(cwd) {
  // 清掉 sillyspec 写入 cwd 的进度副作用，保证两路字节级环境一致
  try { rmSync(join(cwd, '.sillyspec'), { recursive: true, force: true }) } catch {}
  try { rmSync(join(cwd, '.sillyspec-platform.json'), { force: true }) } catch {}
}

const tmpRoot = join(tmpdir(), `sillyspec-cli-aliases-${Date.now()}`)
mkdirSync(tmpRoot, { recursive: true })

try {
  // ── Red/Green: 5 个顶层命令不再报"未知命令" ──
  const aliases = ['doctor', 'scan', 'status', 'quick', 'explore']
  console.log('\n=== Test 1: 顶层命令别名不落 default 分支 ===')
  for (const stage of aliases) {
    const res = runCLI([stage], tmpRoot)
    const hitUnknown =
      res.combined.includes('未知命令') ||
      /unknown command/i.test(res.combined)
    assert(
      !hitUnknown,
      `sillyspec ${stage} 不报"未知命令" (exit=${res.status})`
    )
  }

  // ── Green: doctor 顶层别名 与 sillyspec run doctor 字节一致 ──
  // 两路必须在字节级相同环境下运行：同 cwd + 每次跑前清空 .sillyspec
  // （否则 progress 持久化会让第二次跑读到旧数据触发平台同步检查）
  console.log('\n=== Test 2: sillyspec doctor 与 sillyspec run doctor 等价 ===')
  {
    const cwd = join(tmpRoot, 'doctor-cmp')
    mkdirSync(cwd, { recursive: true })
    cleanSillySpec(cwd)
    const top = runCLI(['doctor'], cwd)
    cleanSillySpec(cwd)
    const viaRun = runCLI(['run', 'doctor'], cwd)
    assert(
      top.status === viaRun.status,
      `exit code 一致: doctor=${top.status}, run doctor=${viaRun.status}`
    )
    assert(
      top.stdout === viaRun.stdout,
      `stdout 字节一致 (len=${top.stdout.length})`
    )
    assert(
      top.stderr === viaRun.stderr,
      `stderr 字节一致 (len=${top.stderr.length})`
    )
  }

  // ── Green: scan 顶层别名 与 sillyspec run scan 字节一致 ──
  console.log('\n=== Test 3: sillyspec scan 与 sillyspec run scan 等价 ===')
  {
    const cwd = join(tmpRoot, 'scan-cmp')
    mkdirSync(cwd, { recursive: true })
    cleanSillySpec(cwd)
    const top = runCLI(['scan'], cwd)
    cleanSillySpec(cwd)
    const viaRun = runCLI(['run', 'scan'], cwd)
    assert(
      top.status === viaRun.status,
      `exit code 一致: scan=${top.status}, run scan=${viaRun.status}`
    )
    assert(
      top.stdout === viaRun.stdout,
      `stdout 字节一致 (len=${top.stdout.length})`
    )
  }

  // ── 回归: worktree doctor 走 worktree 分支（与顶层 doctor 不同） ──
  console.log('\n=== Test 4: sillyspec worktree doctor 走 worktree 分支 ===')
  {
    const res = runCLI(['worktree', 'doctor'], tmpRoot)
    // worktree doctor 不应报顶层 default 的"未知命令"，也不应报"未知阶段"
    const hitUnknownCmd =
      res.combined.includes('未知命令') && !/worktree/.test(res.combined)
    assert(!hitUnknownCmd, `worktree doctor 不报顶层未知命令`)
    // worktree 子命令 default 分支会输出"未知子命令: worktree"，这里 doctor 合法不应出现
    assert(
      !res.combined.includes('未知子命令'),
      `worktree doctor 不是未知子命令`
    )
  }

  // ── 回归: foobar 仍落 default 报未知命令 ──
  console.log('\n=== Test 5: sillyspec foobar 仍报未知命令 ===')
  {
    const res = runCLI(['foobar'], tmpRoot)
    assert(
      res.combined.includes('未知命令'),
      `foobar 命中 default 分支，报"未知命令"`
    )
    assert(
      res.status !== 0,
      `foobar exit code 非 0 (got ${res.status})`
    )
  }

  // ── 选项透传: sillyspec doctor --json 与 sillyspec run doctor --json 等价 ──
  console.log('\n=== Test 6: doctor --json 选项透传正确 ===')
  {
    const top = runCLI(['doctor', '--json'], tmpRoot)
    const viaRun = runCLI(['run', 'doctor', '--json'], tmpRoot)
    assert(
      top.stdout === viaRun.stdout,
      `doctor --json stdout 与 run doctor --json 一致 (len=${top.stdout.length})`
    )
    assert(
      top.status === viaRun.status,
      `doctor --json exit 与 run doctor --json 一致`
    )
  }
} finally {
  try {
    rmSync(tmpRoot, { recursive: true, force: true })
  } catch {}
}

console.log(`\n${'='.repeat(50)}`)
console.log(`✅ 通过: ${passed}  ❌ 失败: ${failed}`)
console.log(`${'='.repeat(50)}`)
process.exit(failed > 0 ? 1 : 0)
