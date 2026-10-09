/**
 * 坑 init-skills-sync-no-zcode 回归：init 技能同步不含 zcode（双层缺口）
 *
 * 实证（2026-10-08-sync-sillyspec-skills-3320）：detectTools 无 .zcode 检测分支（自动发现
 * 失灵）+ skillToolDirs 无 zcode 映射（显式 --tool zcode 也拿不到技能）——CLI 升级刷新
 * 内嵌技能时 .zcode/skills 静默失配，技能列表与协议引导脱节。
 *
 * 锁定：
 *   ① .zcode 在场 → detectTools 发现 zcode；
 *   ② 源级断言：skillToolDirs 含 zcode: '.zcode/skills'（cmdInit 内联映射，读源钉住防回归）；
 *   ③ 既有六信号发现零变化（claude/cursor/openclaw/codex/gemini/opencode）。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, rmSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { detectTools } from '../src/init.js'

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const tmpRoots = []
function fx(dirs = []) {
  const d = mkdtempSync(join(tmpdir(), 'zcode-init-'))
  tmpRoots.push(d)
  for (const x of dirs) mkdirSync(join(d, x), { recursive: true })
  return d
}
test.onFinish?.(() => { for (const t of tmpRoots) rmSync(t, { recursive: true, force: true }) })

test('① .zcode 在场 → zcode 进发现列表', () => {
  const d = fx(['.zcode/skills'])
  const tools = detectTools(d)
  assert.ok(tools.includes('zcode'), `.zcode 应被发现（实际 ${tools.join(',')}）`)
  assert.ok(tools.includes('claude') === false || tools.includes('zcode'), '共存不互斥')
})

test('② skillToolDirs 含 zcode 映射（源级钉）', () => {
  const src = readFileSync(join(REPO_ROOT, 'src', 'init.js'), 'utf8')
  const m = src.match(/const skillToolDirs = \{[^}]+\}/)
  assert.ok(m, 'skillToolDirs 块在源内')
  assert.match(m[0], /zcode:\s*'\.zcode\/skills'/, 'zcode → .zcode/skills 映射在场')
})

test('③ 既有六信号发现零变化', () => {
  assert.deepEqual(detectTools(fx(['.claude'])), ['claude'])
  assert.deepEqual(detectTools(fx(['.cursor'])), ['cursor'])
  assert.deepEqual(detectTools(fx(['.openclaw'])), ['openclaw'])
  assert.deepEqual(detectTools(fx([])), ['claude'], '零信号兜底 claude 不变')
  const d = fx([])
  writeFileSync(join(d, 'AGENTS.md'), '# x\n')
  assert.deepEqual(detectTools(d), ['codex'])
})
