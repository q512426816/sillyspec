/**
 * CLI 步骤完成测试共享脚手架（run-complete-step-*.test.mjs 簇使用）。
 *
 * 替代 _complete-step-harness.mjs 中与 _completeStepForTest 耦合的部分。
 * 这些测试不再 import run.js 内部函数，而是通过 CLI 子进程（sillyspec run <stage> --done）
 * 测试对外行为。中间状态仍用 ProgressManager 注入（与 wait-gates.test.mjs / archive-sync-module-docs-wait
 * 同款模式：先让 CLI 初始化步骤 schema，再 read→tweak→write）。
 *
 * - 非 .test.mjs 后缀 → run-tests.mjs 不会把它当测试文件跑，仅供 import。
 * - makeRepo：mkdtempSync 临时 git 仓库，cwd === specBase（消除 cwd/specDir 路径分裂）。
 * - initChange / seedStage：建 change + 种入任意阶段进度（手建 steps，绕开多步 --done 驱动）。
 * - runCLI / runStage：spawnSync 调 bin/sillyspec.js，返回 { stdout, stderr, status, combined }。
 */
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { spawnSync, execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { ProgressManager } from '../src/progress.js'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const binCLI = join(repoRoot, 'bin', 'sillyspec.js')

export function assert(count) {
  // count: { passed, failed, failures } 由调用方持有并传入引用对象
  return (cond, msg) => {
    if (cond) { count.passed++; console.log(`  ✅ PASS: ${msg}`) }
    else { count.failed++; count.failures.push(msg); console.log(`  ❌ FAIL: ${msg}`) }
  }
}

function git(dir, args) {
  return execFileSync('git', args, { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
}
function initGitRepo(dir) {
  git(dir, ['init', '-q']); git(dir, ['config', 'user.email', 'test@test.local'])
  git(dir, ['config', 'user.name', 'test']); git(dir, ['config', 'commit.gpgsign', 'false'])
}

const tmpRoots = []
export function makeRepo(prefix = 'cli-') {
  const cwd = mkdtempSync(join(tmpdir(), prefix)); tmpRoots.push(cwd)
  initGitRepo(cwd)
  writeFileSync(join(cwd, '.gitignore'), '.sillyspec/\n')
  writeFileSync(join(cwd, 'README.md'), 'init\n')
  git(cwd, ['add', '.']); git(cwd, ['commit', '-q', '-m', 'init'])
  const specBase = join(cwd, '.sillyspec')
  return { cwd, specBase }
}

export async function initChange(cwd, specBase, changeName) {
  const pm = new ProgressManager({ specDir: specBase })
  await pm.init(cwd)
  await pm.initChange(cwd, changeName)
  return pm
}

// 种入阶段进度：steps 为 [{name, status}, ...]；返回写盘后的 progress（currentChange 已设）
export async function seedStage(pm, cwd, changeName, stageName, steps, status = 'in-progress') {
  const progress = await pm.read(cwd, changeName)
  progress.currentChange = changeName
  progress.stages = progress.stages || {}
  progress.stages[stageName] = {
    status, startedAt: '2026/7/25 00:00:00', completedAt: null, steps,
  }
  await pm._write(cwd, progress, changeName)
  return progress
}

// 调 CLI 子进程，返回 { stdout, stderr, status, combined }。status 捕获 process.exit 真实退出码。
export function runCLI(args, { cwd, env, timeout = 30000 } = {}) {
  const r = spawnSync(process.execPath, [binCLI, ...args], {
    cwd, env, encoding: 'utf8', timeout,
    stdio: ['pipe', 'pipe', 'pipe'],
  })
  const stdout = r.stdout || ''
  const stderr = r.stderr || ''
  return { stdout, stderr, status: r.status, combined: stdout + stderr }
}

// run <stage> --change <name> + 可选 flags（done/answer/output/confirm/wait...）
export function runStage(stage, changeName, cwd, opts = {}) {
  const args = ['--dir', cwd, 'run', stage, '--change', changeName]
  if (opts.done) { args.push('--done'); if (opts.output != null) args.push('--output', opts.output) }
  if (opts.answer != null) args.push('--answer', opts.answer)
  if (opts.confirm) args.push('--confirm')
  if (opts.wait) args.push('--wait')
  if (opts.continue) args.push('--continue')
  if (opts.reason != null) args.push('--reason', opts.reason)
  return runCLI(args, { cwd, env: opts.env, timeout: opts.timeout })
}

export function cleanup() {
  for (const d of tmpRoots) { try { rmSync(d, { recursive: true, force: true }) } catch {} }
}

export function report(passed, failed, failures) {
  console.log(`\n${'='.repeat(50)}`)
  console.log(`✅ 通过: ${passed}  ❌ 失败: ${failed}`)
  if (failures.length) console.log(`失败项: ${failures.join('; ')}`)
  console.log(`${'='.repeat(50)}`)
  if (failed > 0) process.exit(1)
}
