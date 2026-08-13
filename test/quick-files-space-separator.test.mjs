/**
 * quick --files 空格分隔静默丢失 — fail-loud 检测回归
 * 坑：multi-agent-platform/docs/sillyspec/quick-files-space-separated-silently-drops.md
 *
 * --files 是单值 flag（VALUE_FLAGS），空格分隔的多文件只取首个，其余沦为位置参数被静默忽略 →
 * guard.allowedFiles 只剩首个 → --done 边界审计误拦，边界保护形同虚设。
 * 修法：detectSpaceSeparatedFiles 检测误用 → process.exit 2 fail-loud（同 run --json :109 风格）。
 *
 * 覆盖：① detectSpaceSeparatedFiles 纯函数多场景（快、稳）；② CLI 子进程端到端验证 exit 2 + stderr。
 * 隔离：mkdtempSync 临时 git 仓，不污染真实仓库。
 */
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { join, resolve, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { detectSpaceSeparatedFiles } from '../src/run/command.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const BIN = resolve(__dirname, '..', 'bin', 'sillyspec.js')

let total = 0, failed = 0
function assert(cond, msg) {
  total++
  if (!cond) { failed++; console.log(`  ❌ FAIL: ${msg}`) }
  else console.log(`  ✅ PASS: ${msg}`)
}
function eq(actual, expected, msg) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected)
  assert(a === e, `${msg} (got ${a}, want ${e})`)
}

console.log('=== quick --files 空格分隔 fail-loud 检测 ===\n')

// ── 1. detectSpaceSeparatedFiles 纯函数（runCommand 内已规范化的 flags 数组）──
console.log('--- detectSpaceSeparatedFiles 纯函数 ---')
eq(detectSpaceSeparatedFiles([]), [], '无 --files → []')
eq(detectSpaceSeparatedFiles(['--files', 'a.js']), ['a.js'], '单文件 → [a.js]（length 1 不触发，调用方判 > 1）')
eq(detectSpaceSeparatedFiles(['--files', 'a.js,b.js']), [], '逗号分隔 → []（正确用法不检测）')
eq(detectSpaceSeparatedFiles(['--files', 'a.js,b.js,c.js']), [], '逗号三分隔 → []')
eq(detectSpaceSeparatedFiles(['--files', 'a.js', 'b.js']), ['a.js', 'b.js'], '空格两文件 → [a.js,b.js]')
eq(detectSpaceSeparatedFiles(['--files', 'a.js', 'b.js', 'c.js']), ['a.js', 'b.js', 'c.js'], '空格三文件 → 全收集')
eq(detectSpaceSeparatedFiles(['--files', 'a.js', '--done']), ['a.js'], '单文件+flag → [a.js]（flag 停止收集，length 1）')
eq(detectSpaceSeparatedFiles(['--files', 'a.js', 'b.js', '--done']), ['a.js', 'b.js'], '空格+flag → [a.js,b.js]（--done 停止）')
eq(detectSpaceSeparatedFiles(['--files', '--done']), [], '--files 漏值（val 是 flag 名）→ []')
eq(detectSpaceSeparatedFiles(['--files']), [], '--files 无值 → []')
eq(detectSpaceSeparatedFiles(['--linked-changes', 'none', '--files', 'a.js', 'b.js', '--non-interactive']), ['a.js', 'b.js'], '--files 在 flags 中段 → 仍正确收集')

// ── 2. CLI 子进程 E2E：真实 bin/sillyspec.js run quick --files a.js b.js ──
console.log('\n--- CLI 子进程 fail-loud E2E ---')
const repo = mkdtempSync(join(tmpdir(), 'qf-space-'))
function git(args) { return execFileSync('git', args, { cwd: repo, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim() }
git(['init', '-q']); git(['config', 'user.email', 't@t.local']); git(['config', 'user.name', 't']); git(['config', 'commit.gpgsign', 'false'])
writeFileSync(join(repo, '.gitignore'), '.sillyspec/\n')
writeFileSync(join(repo, 'm.js'), 'console.log(1)\n')
git(['add', '.']); git(['commit', '-q', '-m', 'init'])

function spawnQuick(extraArgs) {
  // node bin/sillyspec.js run quick <desc> --linked-changes none <extraArgs> --non-interactive
  const argv = [BIN, 'run', 'quick', '测', '--linked-changes', 'none', ...extraArgs, '--non-interactive']
  try {
    const stdout = execFileSync('node', argv, { cwd: repo, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 30000 })
    return { code: 0, stdout, stderr: '' }
  } catch (e) {
    return { code: e.status ?? 1, stdout: (e.stdout || '').toString(), stderr: (e.stderr || '').toString() }
  }
}

try {
  // 空格分隔 → fail-loud exit 2 + stderr 引导逗号用法
  const r1 = spawnQuick(['--files', 'a.js', 'b.js'])
  assert(r1.code !== 0, `空格分隔非零退出（code=${r1.code}）`)
  assert(r1.stderr.includes('空格分隔'), `stderr 含"空格分隔"诊断`)
  assert(r1.stderr.includes('逗号'), `stderr 含逗号用法提示`)
  assert(r1.stderr.includes('a.js,b.js'), `stderr 给出修正建议 a.js,b.js`)

  // 逗号分隔 → 不触发 fail-loud（stderr 不含"空格分隔"；code 不强求 0，quick 启动可能自有其他输出）
  const r2 = spawnQuick(['--files', 'a.js,b.js'])
  assert(!r2.stderr.includes('空格分隔'), `逗号分隔不触发 fail-loud（stderr 无"空格分隔"）`)

  // 单文件 → 不触发 fail-loud
  const r3 = spawnQuick(['--files', 'a.js'])
  assert(!r3.stderr.includes('空格分隔'), `单文件不触发 fail-loud`)
} finally {
  try { rmSync(repo, { recursive: true, force: true }) } catch {}
}

console.log(`\n${failed === 0 ? '✅ ALL PASS' : `❌ ${failed} FAILED`} (${total} assertions)`)
if (failed > 0) process.exit(1)
