/**
 * docs check CLI flag 行为测试（F-1，docs-signals-o12，FR-004/005）
 *
 * CLI 子进程实测三场景：--suggest 识别（不再被当文档路径）/ 未知 flag exit 2 /
 * 💡 候选行号行按 --suggest 门控。fixture 用隔离 tmp 仓（bin + 源文件 + 失效引用文档）。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const BIN = join(REPO_ROOT, 'bin', 'sillyspec.js')

function makeFixture() {
  const d = mkdtempSync(join(tmpdir(), 'dcc-'))
  execFileSync('git', ['init', '-q'], { cwd: d })
  execFileSync('git', ['config', 'user.email', 't@t.com'], { cwd: d })
  execFileSync('git', ['config', 'user.name', 't'], { cwd: d })
  execFileSync('git', ['commit', '--allow-empty', '-qm', 'init'], { cwd: d })
  mkdirSync(join(d, 'docs'), { recursive: true })
  mkdirSync(join(d, 'src'), { recursive: true })
  writeFileSync(join(d, 'src', 'alpha.js'), 'export const alphaSymbol = 1\n// l2\n// l3\n// l4\n// l5\n// l6\n// l7\n// l8\n// l9\n// l10\n')
  // 失效引用：行号 99 超界；token alphaSymbol 建议 L1
  writeFileSync(join(d, 'docs', 'api.md'), '见 `src/alpha.js:99`（`alphaSymbol` 声明处）\n')
  execFileSync('git', ['add', '.'], { cwd: d })
  execFileSync('git', ['commit', '-qm', 'c1'], { cwd: d })
  return d
}

function runCli(d, args) {
  try {
    const stdout = execFileSync('node', [BIN, '--dir', d, 'docs', 'check', ...args], { encoding: 'utf8', cwd: d, timeout: 30000 })
    return { code: 0, stdout }
  } catch (e) {
    return { code: e.status ?? 1, stdout: (e.stdout || '') + (e.stderr || '') }
  }
}

test('F-1: --suggest 被识别为 flag，不再误当文档路径报"不存在"', () => {
  const d = makeFixture()
  try {
    const r = runCli(d, ['--suggest', '--paths', 'docs/api.md'])
    assert.ok(!r.stdout.includes('--suggest:L0'), `--suggest 不应被当文档路径（输出 ${r.stdout.slice(0, 200)}）`)
    assert.ok(r.stdout.includes('❌') || r.code === 1, 'fixture 文档确有失效引用')
  } finally { rmSync(d, { recursive: true, force: true }) }
})

test('F-1: 未知 flag → exit 2 显式报错（治模式：不再静默落入文档路径）', () => {
  const d = makeFixture()
  try {
    const r = runCli(d, ['--foo'])
    assert.equal(r.code, 2, `未知 flag exit 2（实际 ${r.code}）`)
    assert.ok(r.stdout.includes('未知 flag'), `报错文案点名（输出 ${r.stdout.slice(0, 120)}）`)
  } finally { rmSync(d, { recursive: true, force: true }) }
})

test('F-1: 💡 候选行号行按 --suggest 门控（不传不打，传了打）', () => {
  const d = makeFixture()
  try {
    const without = runCli(d, ['--paths', 'docs/api.md'])
    assert.ok(!without.stdout.includes('💡'), `不传 --suggest 无 💡 行（输出 ${without.stdout.slice(0, 200)}）`)
    const withFlag = runCli(d, ['--suggest', '--paths', 'docs/api.md'])
    assert.ok(withFlag.stdout.includes('💡'), `传 --suggest 有 💡 行（输出 ${withFlag.stdout.slice(0, 300)}）`)
    assert.ok(withFlag.stdout.includes('候选行号'), '💡 行含候选行号')
  } finally { rmSync(d, { recursive: true, force: true }) }
})
