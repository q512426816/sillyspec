/**
 * init --no-skills 开关测试（change 2026-08-15-init-trigger-sillyspec-init task-01，FR-07 / D-004@v1）
 *
 * 验证：
 * 1. --no-skills 时项目内不出现 .claude/skills/ 下 sillyspec-* 目录（走 bin CLI 全链路，
 *    覆盖 index.js 解析 → cmdInit → doInstall 透传）
 * 2. 不带 --no-skills 时 skills 照常复制（零回归）
 * 3. CLAUDE.md 指令注入不受 --no-skills 影响
 */

import { join, resolve, dirname } from 'path'
import { existsSync, mkdirSync, readdirSync, rmSync } from 'fs'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'
import { tmpdir } from 'os'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const root = resolve(__dirname, '..')
const binCLI = join(root, 'bin', 'sillyspec.js')

let passed = 0
let failed = 0
function assert(cond, msg) {
  if (cond) { console.log(`  ✅ PASS: ${msg}`); passed++ }
  else { console.log(`  ❌ FAIL: ${msg}`); failed++ }
}

const P = 'init-noskills'
function tmpDir(name) {
  const d = join(tmpdir(), `${P}-${name}-${Date.now()}-${Math.random().toString(36).slice(2)}`)
  mkdirSync(d, { recursive: true })
  return d
}
// git init 隔离：防 tmpdir 落在用户 home git repo 内被 resolveEffectiveDir 纠正
function gitInit(d) {
  try {
    execSync('git init -q', { cwd: d, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  } catch {}
}
function run(cmd) {
  return execSync(cmd, { encoding: 'utf8', timeout: 30000, stdio: ['pipe', 'pipe', 'pipe'] })
}
function sillyspecSkillsIn(d) {
  const skillsDir = join(d, '.claude', 'skills')
  if (!existsSync(skillsDir)) return []
  return readdirSync(skillsDir).filter(f => f.startsWith('sillyspec-'))
}
function clean(...dirs) { for (const d of dirs) try { rmSync(d, { recursive: true, force: true }) } catch {} }

// ── Test 1: --no-skills → .claude/skills/ 无 sillyspec-*，但 CLAUDE.md 照常注入 ──
console.log('\n=== Test 1: --no-skills 跳过 skills 复制，指令注入不受影响 ===')
{
  const project = tmpDir('t1'), spec = tmpDir('t1-spec')
  gitInit(project)
  run(`node "${binCLI}" init "${project}" --tool claude --spec-dir "${spec}" --no-skills`)

  const skills = sillyspecSkillsIn(project)
  assert(skills.length === 0, `--no-skills 后 .claude/skills/ 无 sillyspec-* (got: ${skills.join(', ')})`)
  assert(existsSync(join(project, 'CLAUDE.md')), 'CLAUDE.md 指令注入不受 --no-skills 影响')
  assert(existsSync(join(spec, '.runtime', 'sillyspec.db')), 'spec 目录照常初始化（DB 落外部 specDir）')
  clean(project, spec)
}

// ── Test 2: 不带 --no-skills → skills 照常复制（零回归）──
console.log('\n=== Test 2: 不带 flag skills 照常复制 ===')
{
  const project = tmpDir('t2'), spec = tmpDir('t2-spec')
  gitInit(project)
  run(`node "${binCLI}" init "${project}" --tool claude --spec-dir "${spec}"`)

  const skills = sillyspecSkillsIn(project)
  assert(skills.length > 0, `不带 flag 时 .claude/skills/ 含 sillyspec-* skills (${skills.length} 个)`)
  assert(existsSync(join(project, 'CLAUDE.md')), 'CLAUDE.md 照常注入')
  clean(project, spec)
}

// ── 汇总 ──
console.log(`\n${'='.repeat(50)}`)
console.log(`✅ 通过: ${passed}  ❌ 失败: ${failed}`)
console.log('='.repeat(50))
if (failed > 0) process.exit(1)
