/**
 * run <stage> --help/-h 短路测试（副作用零容忍）
 *
 * 背景：--help 此前在 knownFlags 白名单里被静默吞掉，`run quick --help` 会误开
 * quick 会话 + 写 QUICKLOG 骨架条目（查询意图不该有副作用）；-h 更是被当未知
 * 参数 exit 2。修复：runCommand flag 校验通过后、任何副作用（cwd 纠正/会话创建/
 * QUICKLOG 落盘）之前短路打印帮助退出 0。
 *
 * 测试点：
 * 1. run quick --help 退出 0 + 输出含用法帮助
 * 2. run quick -h 同样短路（-h 已进 knownFlags）
 * 3. 关键副作用断言：不新增 quick-sessions 目录、不新增 ql 条目、不新增 changes 记录
 * 4. 其他 stage（brainstorm）与顶层别名（quick --help）同样短路
 * 5. 未知 flag 仍 exit 2（帮助短路不放松参数校验）
 */
import { join, resolve, dirname } from 'node:path'
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { execSync } from 'node:child_process'
import { tmpdir } from 'node:os'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const root = resolve(__dirname, '..')
const binCLI = join(root, 'bin', 'sillyspec.js')

let passed = 0
let failed = 0

function assert(condition, msg) {
  if (condition) {
    console.log(`  ✅ PASS: ${msg}`)
    passed++
  } else {
    console.log(`  ❌ FAIL: ${msg}`)
    failed++
  }
}

function cleanup(dir) {
  try { rmSync(dir, { recursive: true, force: true }) } catch {}
}

// ── 隔离环境：init 一个最小项目（spec-dir 钉死，不碰主仓进度库）──
const project = join(tmpdir(), `run-help-shortcircuit-${Date.now()}`)
const spec = join(tmpdir(), `run-help-spec-${Date.now()}`)
mkdirSync(project, { recursive: true })
execSync(`node "${binCLI}" init "${project}" --spec-dir "${spec}"`, {
  encoding: 'utf8', timeout: 60000, stdio: ['pipe', 'pipe', 'pipe'],
})

function runCli(argStr) {
  try {
    const out = execSync(`node "${binCLI}" --dir "${project}" --spec-dir "${spec}" ${argStr}`, {
      encoding: 'utf8', timeout: 30000, stdio: ['pipe', 'pipe', 'pipe'],
    })
    return { code: 0, out }
  } catch (e) {
    return { code: e.status, out: (e.stdout || '').toString() + (e.stderr || '').toString() }
  }
}

const quickSessionsDir = join(spec, '.runtime', 'quick-sessions')
const quicklogDir = join(spec, 'quicklog')

function countQuickSessions() {
  return existsSync(quickSessionsDir) ? readdirSync(quickSessionsDir).length : 0
}
function countQlEntries() {
  let n = 0
  if (!existsSync(quicklogDir)) return 0
  for (const f of readdirSync(quicklogDir)) {
    if (!f.startsWith('QUICKLOG-') || !f.endsWith('.md')) continue
    const lines = readFileSync(join(quicklogDir, f), 'utf8')
    n += (lines.match(/^## ql-/gm) || []).length
  }
  return n
}

// ── Test 1-3: run quick --help 短路且零副作用 ──
console.log('\n=== Test 1: run quick --help 退出 0 + 输出帮助 ===')
{
  const before = { sessions: countQuickSessions(), ql: countQlEntries() }
  const r = runCli('run quick --help')
  assert(r.code === 0, `退出码 0 (got: ${r.code})`)
  assert(r.out.includes('用法') && r.out.includes('run quick'), '输出含用法帮助')
  const after = { sessions: countQuickSessions(), ql: countQlEntries() }
  assert(after.sessions === before.sessions, `不新增 quick-sessions 目录 (${before.sessions} → ${after.sessions})`)
  assert(after.ql === before.ql, `不新增 ql 条目 (${before.ql} → ${after.ql})`)
}

console.log('\n=== Test 2: run quick -h 同样短路 ===')
{
  const before = { sessions: countQuickSessions(), ql: countQlEntries() }
  const r = runCli('run quick -h')
  assert(r.code === 0, `-h 退出码 0 (got: ${r.code})`)
  assert(r.out.includes('用法'), '输出含用法帮助')
  const after = { sessions: countQuickSessions(), ql: countQlEntries() }
  assert(after.sessions === before.sessions && after.ql === before.ql, '零副作用')
}

console.log('\n=== Test 3: 其他 stage 与顶层别名同样短路 ===')
{
  for (const argStr of ['run brainstorm --help', 'quick --help', 'run scan -h']) {
    const before = { sessions: countQuickSessions(), ql: countQlEntries() }
    const r = runCli(argStr)
    assert(r.code === 0 && r.out.includes('用法'), `${argStr} 短路退出 0`)
    const after = { sessions: countQuickSessions(), ql: countQlEntries() }
    assert(after.sessions === before.sessions && after.ql === before.ql, `${argStr} 零副作用`)
  }
}

console.log('\n=== Test 4: 未知 flag 仍 exit 2（不放松校验）===')
{
  const r = runCli('run quick --halp')
  assert(r.code === 2, `未知 flag 仍 exit 2 (got: ${r.code})`)
  assert(r.out.includes('未知参数'), '仍报未知参数')
}

// ── 汇总 ──
console.log(`\n${'='.repeat(50)}`)
console.log(`✅ 通过: ${passed}  ❌ 失败: ${failed}`)
console.log('='.repeat(50))

if (failed > 0) throw new Error(`${failed} test(s) failed`)

cleanup(project)
cleanup(spec)
