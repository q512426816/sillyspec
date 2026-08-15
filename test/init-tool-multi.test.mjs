/**
 * init --tool 逗号/重复多值测试（change 2026-08-15-init-trigger-sillyspec-init task-02，FR-07 / D-005@v1）
 *
 * 验证：
 * 1. --tool claude,codex 逗号分隔 → 同时注入 CLAUDE.md 与 AGENTS.md
 * 2. 重复 flag 形式等价；去重后无重复注入
 * 3. --tool claude,foo 非法值 → exit 1 且报错含全部合法值
 * 4. 单值回归：--tool codex 行为不变
 * 5. 不带 --tool → detectTools 自动检测（零回归）
 */

import { join, resolve, dirname } from 'path'
import { existsSync, mkdirSync, readFileSync, rmSync } from 'fs'
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

const P = 'init-toolmulti'
function tmpDir(name) {
  const d = join(tmpdir(), `${P}-${name}-${Date.now()}-${Math.random().toString(36).slice(2)}`)
  mkdirSync(d, { recursive: true })
  return d
}
function gitInit(d) {
  try { execSync('git init -q', { cwd: d, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }) } catch {}
}
function runOk(cmd) {
  return execSync(cmd, { encoding: 'utf8', timeout: 30000, stdio: ['pipe', 'pipe', 'pipe'] })
}
function runFail(cmd) {
  try {
    execSync(cmd, { encoding: 'utf8', timeout: 30000, stdio: ['pipe', 'pipe', 'pipe'] })
    return null // 不该走到
  } catch (e) {
    return { status: e.status, stderr: (e.stderr || '').toString(), stdout: (e.stdout || '').toString() }
  }
}
function clean(...dirs) { for (const d of dirs) try { rmSync(d, { recursive: true, force: true }) } catch {} }

// ── Test 1: --tool claude,codex 逗号分隔 → 多指令文件注入 ──
console.log('\n=== Test 1: --tool claude,codex 同时注入 CLAUDE.md 与 AGENTS.md ===')
{
  const project = tmpDir('t1'), spec = tmpDir('t1-spec')
  gitInit(project)
  runOk(`node "${binCLI}" init "${project}" --tool claude,codex --spec-dir "${spec}" --no-skills`)
  assert(existsSync(join(project, 'CLAUDE.md')), 'claude → CLAUDE.md 已注入')
  assert(existsSync(join(project, 'AGENTS.md')), 'codex → AGENTS.md 已注入')
  clean(project, spec)
}

// ── Test 2: 重复 flag 形式等价 + 去重 ──
console.log('\n=== Test 2: --tool claude --tool codex 重复 flag 等价；claude,codex,claude 去重 ===')
{
  const project = tmpDir('t2a'), spec = tmpDir('t2a-spec')
  gitInit(project)
  runOk(`node "${binCLI}" init "${project}" --tool claude --tool codex --spec-dir "${spec}" --no-skills`)
  assert(existsSync(join(project, 'CLAUDE.md')), '重复 flag：CLAUDE.md 已注入')
  assert(existsSync(join(project, 'AGENTS.md')), '重复 flag：AGENTS.md 已注入')
  clean(project, spec)

  // 去重：--tool claude,claude 不重复注入（幂等——injectClaudeInstructions 同版本跳过，且 tools 数组无重复）
  const project2 = tmpDir('t2b'), spec2 = tmpDir('t2b-spec')
  gitInit(project2)
  runOk(`node "${binCLI}" init "${project2}" --tool claude,claude,codex --spec-dir "${spec2}" --no-skills`)
  const content = readFileSync(join(project2, 'CLAUDE.md'), 'utf8')
  // 完整态模板只应有一份（版本标记唯一）；重复注入会产生多个标记块
  const count = (content.match(/<!-- SillySpec v\S+/g) || []).length
  assert(count === 1, `去重后 CLAUDE.md SillySpec 标记仅 1 份 (got ${count})`)
  assert(existsSync(join(project2, 'AGENTS.md')), '去重场景 codex 仍注入')
  clean(project2, spec2)
}

// ── Test 3: 非法值 exit 1 且报错含全部合法值 ──
console.log('\n=== Test 3: --tool claude,foo → exit 1 报错列全部合法值 ===')
{
  const project = tmpDir('t3'), spec = tmpDir('t3-spec')
  gitInit(project)
  const r = runFail(`node "${binCLI}" init "${project}" --tool claude,foo --spec-dir "${spec}"`)
  assert(r !== null, '非法值 exit 非 0')
  assert(r.status === 1, `exit code = 1 (got ${r && r.status})`)
  const all = r ? r.stderr + r.stdout : ''
  assert(all.includes('foo'), '报错点名非法值 foo')
  for (const v of ['claude', 'cursor', 'openclaw', 'codex', 'gemini', 'opencode']) {
    assert(all.includes(v), `报错列出合法值 ${v}`)
  }
  clean(project, spec)
}

// ── Test 4: 单值回归 + 不带 --tool 自动检测 ──
console.log('\n=== Test 4: 单值回归 + 自动检测 ===')
{
  const project = tmpDir('t4'), spec = tmpDir('t4-spec')
  gitInit(project)
  runOk(`node "${binCLI}" init "${project}" --tool codex --spec-dir "${spec}" --no-skills`)
  assert(existsSync(join(project, 'AGENTS.md')), '单值 --tool codex → AGENTS.md（行为不变）')
  assert(!existsSync(join(project, 'CLAUDE.md')), '单值 --tool codex 不注入 CLAUDE.md')
  clean(project, spec)

  // 不带 --tool：detectTools 自动检测（空项目 fallback claude）
  const project2 = tmpDir('t4b'), spec2 = tmpDir('t4b-spec')
  gitInit(project2)
  runOk(`node "${binCLI}" init "${project2}" --spec-dir "${spec2}" --no-skills`)
  assert(existsSync(join(project2, 'CLAUDE.md')), '不带 --tool 自动检测 fallback claude（零回归）')
  clean(project2, spec2)
}

// ── 汇总 ──
console.log(`\n${'='.repeat(50)}`)
console.log(`✅ 通过: ${passed}  ❌ 失败: ${failed}`)
console.log('='.repeat(50))
if (failed > 0) process.exit(1)
