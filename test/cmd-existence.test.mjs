/**
 * cmd-existence.test.mjs — H2 validateScriptCommands 单测（task-02）
 *
 * 覆盖（acceptance）：
 *   - npm / pnpm / yarn run 各一例
 *   - `cd <subdir> &&` 前缀（锁定子目录，不回退根）
 *   - modules 块定位（无 cd 前缀时按 module.path 查子包 + 根）
 *   - 根 package.json 命中
 *   - 找不到 script 入 invalid 且 reason 含 script 名
 *   - 无 package.json 入 invalid
 *   - JSON 解析失败入 invalid
 *   - 非 npm/pnpm/yarn run 命令不校验
 */

import { join } from 'path'
import { mkdirSync, mkdtempSync, writeFileSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { validateScriptCommands } from '../src/stages/cmd-existence.js'

let passed = 0
let failed = 0

function assert(name, cond, detail = '') {
  if (cond) {
    console.log(`  ✅ PASS: ${name}`)
    passed++
  } else {
    console.error(`  ❌ FAIL: ${name}${detail ? ' — ' + detail : ''}`)
    failed++
  }
}

function assertEqual(name, actual, expected) {
  const a = JSON.stringify(actual)
  const e = JSON.stringify(expected)
  assert(name, a === e, `actual=${a} expected=${e}`)
}

function makeRoot(name) {
  return mkdtempSync(join(tmpdir(), `cmd-${name}-`))
}
function clean(...dirs) {
  for (const d of dirs) {
    try { rmSync(d, { recursive: true, force: true }) } catch {}
  }
}
function writePkg(dir, scripts) {
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'x', version: '1.0.0', scripts }, null, 2))
}

// ── 1: npm run 存在 ─────────────────────────────────────────────
console.log('\n=== Test 1: npm run <existing> 不入 invalid ===')
{
  const root = makeRoot('t1')
  writePkg(root, { build: 'tsc' })
  const r = validateScriptCommands('运行 npm run build 即可', { projectRoot: root })
  assertEqual('npm run 命中 → invalid 空', r.invalid, [])
  assert('checked=1', r.checked === 1, `checked=${r.checked}`)
  clean(root)
}

// ── 2: pnpm run 存在 ────────────────────────────────────────────
console.log('\n=== Test 2: pnpm run <existing> 不入 invalid ===')
{
  const root = makeRoot('t2')
  writePkg(root, { test: 'vitest' })
  const r = validateScriptCommands('pnpm run test', { projectRoot: root })
  assertEqual('pnpm run 命中 → invalid 空', r.invalid, [])
  assert('checked=1', r.checked === 1, `checked=${r.checked}`)
  clean(root)
}

// ── 3: yarn run 存在 ────────────────────────────────────────────
console.log('\n=== Test 3: yarn run <existing> 不入 invalid ===')
{
  const root = makeRoot('t3')
  writePkg(root, { lint: 'eslint src' })
  const r = validateScriptCommands('yarn run lint', { projectRoot: root })
  assertEqual('yarn run 命中 → invalid 空', r.invalid, [])
  assert('checked=1', r.checked === 1, `checked=${r.checked}`)
  clean(root)
}

// ── 4: cd <subdir> && 前缀锁定子目录 ────────────────────────────
console.log('\n=== Test 4: cd <subdir> && 命中子包 scripts ===')
{
  const root = makeRoot('t4')
  writePkg(join(root, 'backend'), { build: 'tsc' })
  writePkg(root, { dev: 'node .' }) // 根没有 build
  const r = validateScriptCommands('cd backend && npm run build', { projectRoot: root })
  assertEqual('cd backend && npm run build 命中子包', r.invalid, [])
  assert('checked=1', r.checked === 1, `checked=${r.checked}`)
  clean(root)
}

// ── 4b: cd <subdir> 但 script 只在根 → invalid（不回退根） ───────
console.log('\n=== Test 4b: cd 锁定子目录，script 仅在根 → invalid ===')
{
  const root = makeRoot('t4b')
  writePkg(join(root, 'backend'), { other: 'x' }) // backend 没有 build
  writePkg(root, { build: 'tsc' }) // 根有 build
  const r = validateScriptCommands('cd backend && npm run build', { projectRoot: root })
  assert('cd 锁定子目录、script 仅在根 → invalid', r.invalid.length === 1, `invalid=${JSON.stringify(r.invalid)}`)
  assert('reason 含 script 名', r.invalid[0].reason.includes('build'), `reason=${r.invalid[0].reason}`)
  assert('cmd 字段 = npm run build', r.invalid[0].cmd === 'npm run build', `cmd=${r.invalid[0].cmd}`)
  clean(root)
}

// ── 5: modules 块定位（无 cd 前缀） ─────────────────────────────
console.log('\n=== Test 5: modules 块定位子包 script ===')
{
  const root = makeRoot('t5')
  writePkg(join(root, 'frontend'), { 'gen:types': 'tscodegen' })
  // 根 package.json 不写 gen:types（模拟 design.md 背景：脚本实际在 frontend/）
  writePkg(root, { build: 'turbo build' })
  const modules = { frontend: { path: 'frontend/', test: 'cd frontend && pnpm test' } }
  const r = validateScriptCommands('pnpm run gen:types', { projectRoot: root, modules })
  assertEqual('modules 块定位 frontend/gen:types → invalid 空', r.invalid, [])
  assert('checked=1', r.checked === 1, `checked=${r.checked}`)
  clean(root)
}

// ── 5b: modules 提供时根 package.json 命中（多候选任一即可） ─────
console.log('\n=== Test 5b: modules 提供，根 package.json 也有该 script → 命中 ===')
{
  const root = makeRoot('t5b')
  writePkg(join(root, 'frontend'), { build: 'tsc' })
  writePkg(root, { dev: 'node .' }) // 根有 dev，frontend 没有
  const modules = { frontend: { path: 'frontend/', test: 'cd frontend && pnpm test' } }
  const r = validateScriptCommands('npm run dev', { projectRoot: root, modules })
  assertEqual('modules + 根命中 dev → invalid 空', r.invalid, [])
  clean(root)
}

// ── 6: 根 package.json（无 modules） ────────────────────────────
console.log('\n=== Test 6: 无 modules → 根 package.json 命中 ===')
{
  const root = makeRoot('t6')
  writePkg(root, { build: 'tsc' })
  const r = validateScriptCommands('npm run build', { projectRoot: root })
  assertEqual('根命中 → invalid 空', r.invalid, [])
  clean(root)
}

// ── 7: script 不存在 → invalid ===================================
console.log('\n=== Test 7: script 不存在 → invalid ===')
{
  const root = makeRoot('t7')
  writePkg(root, { build: 'tsc' })
  const r = validateScriptCommands('npm run nonexistent', { projectRoot: root })
  assert('不存在的 script 入 invalid', r.invalid.length === 1, `invalid=${JSON.stringify(r.invalid)}`)
  assert('cmd 字段', r.invalid[0].cmd === 'npm run nonexistent', `cmd=${r.invalid[0].cmd}`)
  assert('reason 含 script 名', r.invalid[0].reason.includes('nonexistent'), `reason=${r.invalid[0].reason}`)
  assert('reason 沿用 scan-postcheck 文案', r.invalid[0].reason === 'package.json 无 nonexistent script', `reason=${r.invalid[0].reason}`)
  clean(root)
}

// ── 8: 无 package.json → invalid =================================
console.log('\n=== Test 8: 无 package.json → invalid ===')
{
  const root = makeRoot('t8')
  mkdirSync(root, { recursive: true }) // 不写 package.json
  const r = validateScriptCommands('npm run build', { projectRoot: root })
  assert('无 package.json 入 invalid', r.invalid.length === 1, `invalid=${JSON.stringify(r.invalid)}`)
  assert('reason 标注 package.json 不存在', r.invalid[0].reason.includes('package.json 不存在'), `reason=${r.invalid[0].reason}`)
  clean(root)
}

// ── 9: package.json 解析失败 → invalid ===========================
console.log('\n=== Test 9: package.json JSON 解析失败 → invalid ===')
{
  const root = makeRoot('t9')
  mkdirSync(root, { recursive: true })
  writeFileSync(join(root, 'package.json'), '{ invalid json ,, }')
  const r = validateScriptCommands('npm run build', { projectRoot: root })
  assert('解析失败入 invalid', r.invalid.length === 1, `invalid=${JSON.stringify(r.invalid)}`)
  assert('reason 标注解析失败', r.invalid[0].reason.includes('解析失败'), `reason=${r.invalid[0].reason}`)
  clean(root)
}

// ── 10: 多命令混合（存在 + 不存在） ==============================
console.log('\n=== Test 10: 多命令混合，checked 计数 + 选择性 invalid ===')
{
  const root = makeRoot('t10')
  writePkg(root, { build: 'tsc', test: 'vitest' })
  const r = validateScriptCommands('npm run build && npm run missing', { projectRoot: root })
  assert('checked=2', r.checked === 2, `checked=${r.checked}`)
  assert('仅 missing 入 invalid', r.invalid.length === 1 && r.invalid[0].cmd === 'npm run missing', `invalid=${JSON.stringify(r.invalid)}`)
  clean(root)
}

// ── 11: 非 npm/pnpm/yarn run 不校验 ==============================
console.log('\n=== Test 11: pnpm install / npx tsc / uv run 不在范围 ===')
{
  const root = makeRoot('t11')
  writePkg(root, {})
  const r = validateScriptCommands('pnpm install && npx tsc && uv run pytest', { projectRoot: root })
  assert('checked=0', r.checked === 0, `checked=${r.checked}`)
  assertEqual('invalid 空', r.invalid, [])
  clean(root)
}

// ── 12: 空文本 / null / undefined ================================
console.log('\n=== Test 12: 空文本 / null / undefined ===')
{
  const root = makeRoot('t12')
  assertEqual('空文本', validateScriptCommands('', { projectRoot: root }), { invalid: [], checked: 0 })
  assertEqual('null', validateScriptCommands(null, { projectRoot: root }), { invalid: [], checked: 0 })
  assertEqual('undefined', validateScriptCommands(undefined, { projectRoot: root }), { invalid: [], checked: 0 })
  clean(root)
}

// ── 13: modules 块定位失败（script 都没有）→ invalid ============
console.log('\n=== Test 13: modules 块提供但无该 script → invalid ===')
{
  const root = makeRoot('t13')
  writePkg(join(root, 'frontend'), { build: 'tsc' })
  writePkg(root, { dev: 'node .' })
  const modules = { frontend: { path: 'frontend/', test: 'cd frontend && pnpm test' } }
  const r = validateScriptCommands('pnpm run gen:types', { projectRoot: root, modules })
  assert('modules 都无该 script → invalid', r.invalid.length === 1, `invalid=${JSON.stringify(r.invalid)}`)
  assert('reason 含 script 名', r.invalid[0].reason.includes('gen:types'), `reason=${r.invalid[0].reason}`)
  clean(root)
}

// ── 汇总 =========================================================
console.log(`\n=== ${passed} passed, ${failed} failed ===`)
if (failed > 0) process.exit(1)
