/**
 * completeStep characterization 测试共享脚手架。
 *
 * - 非 .test.mjs 后缀 → run-tests.mjs 不会把它当测试文件跑，仅供 import。
 * - runCapturing：统一捕获 console.log/error/warn + 桩 process.exit（completeStep
 *   多处 process.exit(1)，桩成 throw 以在进程内捕获，避免杀掉整个测试文件），
 *   返回 { stdout, result, exitCode, error }。
 * - makeRepo：mkdtempSync 临时 git 仓库，cwd === specBase（消除 cwd/specDir 路径分裂）。
 * - seedStage：种入任意阶段的进度（手建 steps，绕开多步 --done 驱动）。
 */
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { execFileSync } from 'node:child_process'
import { ProgressManager } from '../src/progress.js'

export function assert(count) {
  // count: { passed, failed, failures } 由调用方持有并传入引用对象
  return (cond, msg) => {
    if (cond) { count.passed++; console.log(`  ✅ PASS: ${msg}`) }
    else { count.failed++; count.failures.push(msg); console.log(`  ❌ FAIL: ${msg}`) }
  }
}

export async function runCapturing(fn) {
  const origLog = console.log, origErr = console.error, origWarn = console.warn, origExit = process.exit
  let buf = '', exitCode = null, error = null, result
  console.log = (...a) => { buf += a.join(' ') + '\n' }
  console.error = (...a) => { buf += a.join(' ') + '\n' }
  console.warn = (...a) => { buf += a.join(' ') + '\n' }
  process.exit = (code) => { exitCode = code; throw new Error('EXIT_' + code) }
  try { result = await fn() }
  catch (e) { error = e }
  finally { console.log = origLog; console.error = origErr; console.warn = origWarn; process.exit = origExit }
  return { stdout: buf, result, exitCode, error }
}

function git(dir, args) {
  return execFileSync('git', args, { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
}
function initGitRepo(dir) {
  git(dir, ['init', '-q']); git(dir, ['config', 'user.email', 'test@test.local'])
  git(dir, ['config', 'user.name', 'test']); git(dir, ['config', 'commit.gpgsign', 'false'])
}

const tmpRoots = []
export function makeRepo(prefix = 'cs-') {
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
