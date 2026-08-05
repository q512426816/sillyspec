/**
 * plan-postcheck.test.mjs — TaskCard 命令存在性硬阻断校验（task-06 / D-04）
 *
 * validateTaskCommands：解析每个 TaskCard 的 verify + implementation 字段，
 * 调共享 validateScriptCommands（H2），invalid 非空 → push error（硬阻断）。
 * modules 从 local.yaml 提取（parseLocalYamlModules）以感知 monorepo 子包。
 *
 * 同 helper 双严重度（D-04）：plan 阶段升 error / scan 阶段维持 warning（后者见 scan-postcheck.test.mjs）。
 */
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { validateTaskCommands, parseLocalYamlModules } from '../src/stages/plan-postcheck.js'

let total = 0, failed = 0
function assert(cond, msg) {
  total++
  if (!cond) { failed++; console.log(`  ❌ FAIL: ${msg}`) }
  else console.log(`  ✅ PASS: ${msg}`)
}

// 构造一份字段齐全的 TaskCard（verify/implementation 由参数注入）
// 注意：validateScriptCommands（task-02 helper）仅匹配 `<pm> run <script>` 形式
// （design §5 H2 正则 `/(npm|pnpm|yarn)\s+run\s+(\S+)/g`），pnpm 简写（`pnpm gen:types` 不带 run）
// 与 npm 内建别名（`npm test`/`npm start`）不在校验范围——本测试用例统一用带 run 的显式写法。
function makeTask(verify, implementation) {
  return [
    '---',
    'id: task-01',
    'title: cmd check',
    'title_zh: 命令检查',
    'allowed_paths:',
    '  - src/app.js',
    `goal: 实现 X`,
    `implementation: ${implementation}`,
    'acceptance: 接口正确',
    `verify: ${verify}`,
    'constraints: 不破坏旧接口',
    'depends_on: ',
    '---',
    '',
  ].join('\n')
}

function writeTask(changeDir, content) {
  mkdirSync(join(changeDir, 'tasks'), { recursive: true })
  writeFileSync(join(changeDir, 'tasks', 'task-01.md'), content)
}

function writePkg(root, scripts) {
  writeFileSync(join(root, 'package.json'), JSON.stringify({ name: 'pkg', scripts }, null, 2))
}

console.log('=== plan-postcheck TaskCard 命令存在性硬阻断（task-06）===\n')

// ── 1: verify 写 pnpm run gen:types，根 package.json 无，无 modules → error（D-04 阻断场景） ──
console.log('--- 场景 1：根 package.json 无此 script、无 modules → error 硬阻断 ---')
{
  const changeDir = mkdtempSync(join(tmpdir(), 'pc-cmd-1-'))
  const projectRoot = mkdtempSync(join(tmpdir(), 'pc-cmd-1-root-'))
  writeTask(changeDir, makeTask('pnpm run gen:types', '修改 src/app.js'))
  writePkg(projectRoot, { start: 'node server.js' }) // 无 gen:types
  const r = validateTaskCommands(changeDir, projectRoot, null)
  assert(!r.ok, '根无 gen:types + 无 modules → ok=false（硬阻断）')
  assert(r.errors.length > 0 && r.errors[0].includes('gen:types'), `error 文案含命令名（实际: ${JSON.stringify(r.errors)}）`)
  assert(r.errors[0].includes('task-01'), 'error 文案含 task id')
}

// ── 2: 子包有该 script + modules 块定位 → 通过（monorepo 感知，D-04 解法） ──
console.log('\n--- 场景 2：modules 块定位子包、子包有该 script → 通过 ---')
{
  const changeDir = mkdtempSync(join(tmpdir(), 'pc-cmd-2-'))
  const projectRoot = mkdtempSync(join(tmpdir(), 'pc-cmd-2-root-'))
  writeTask(changeDir, makeTask('pnpm run gen:types', '修改 src/app.js'))
  writePkg(projectRoot, { start: 'node server.js' }) // 根仍无
  mkdirSync(join(projectRoot, 'packages', 'foo'), { recursive: true })
  writePkg(join(projectRoot, 'packages', 'foo'), { 'gen:types': 'ts_codegen' }) // 子包有
  const modules = { foo: { path: 'packages/foo' } }
  const r = validateTaskCommands(changeDir, projectRoot, modules)
  assert(r.ok, `modules 定位子包、子包有 gen:types → 通过（ok=${r.ok}, errors: ${JSON.stringify(r.errors)}）`)
  assert(r.errors.length === 0, '无误报')
}

// ── 3: cd <subdir> && 前缀 → 仅查子包（与 modules 等价的另一种写法） ──
console.log('\n--- 场景 3：cd <subdir> && 前缀 → 子包有该 script → 通过 ---')
{
  const changeDir = mkdtempSync(join(tmpdir(), 'pc-cmd-3-'))
  const projectRoot = mkdtempSync(join(tmpdir(), 'pc-cmd-3-root-'))
  writeTask(changeDir, makeTask('cd packages/foo && pnpm run gen:types', '修改 src/app.js'))
  writePkg(projectRoot, { start: 'node server.js' })
  mkdirSync(join(projectRoot, 'packages', 'foo'), { recursive: true })
  writePkg(join(projectRoot, 'packages', 'foo'), { 'gen:types': 'ts_codegen' })
  // 即使不传 modules，cd 前缀也能定位（helper 内置 cd-prefix 识别）
  const r = validateTaskCommands(changeDir, projectRoot, null)
  assert(r.ok, `cd 子包前缀 + 子包有 script → 通过（ok=${r.ok}, errors: ${JSON.stringify(r.errors)}）`)
}

// ── 4: implementation 字段的 npm run build 根存在 → 通过 ──
console.log('\n--- 场景 4：implementation 的 npm run build 根存在 → 通过 ---')
{
  const changeDir = mkdtempSync(join(tmpdir(), 'pc-cmd-4-'))
  const projectRoot = mkdtempSync(join(tmpdir(), 'pc-cmd-4-root-'))
  writeTask(changeDir, makeTask('npm run test', 'npm run build'))
  writePkg(projectRoot, { test: 'node --test', build: 'tsc' })
  const r = validateTaskCommands(changeDir, projectRoot, null)
  assert(r.ok, `根有 test + build → 通过（ok=${r.ok}, errors: ${JSON.stringify(r.errors)}）`)
}

// ── 5: verify + implementation 都无 npm/pnpm/yarn run 命令 → 通过（不误报 install/typecheck） ──
console.log('\n--- 场景 5：仅 install/typecheck（非 run 形式）→ 不校验、通过 ---')
{
  const changeDir = mkdtempSync(join(tmpdir(), 'pc-cmd-5-'))
  const projectRoot = mkdtempSync(join(tmpdir(), 'pc-cmd-5-root-'))
  writeTask(changeDir, makeTask('pnpm install', 'npx tsc --noEmit'))
  writePkg(projectRoot, {}) // 空 scripts
  const r = validateTaskCommands(changeDir, projectRoot, null)
  assert(r.ok, `install/typecheck 不在 run 形式 → 不校验（ok=${r.ok}）`)
  assert(r.errors.length === 0, '无误报')
}

// ── 6: CRLF 行尾 TaskCard 仍能解析（LF 归一化覆盖） ──
console.log('\n--- 场景 6：CRLF TaskCard 仍能抓命令 ---')
{
  const changeDir = mkdtempSync(join(tmpdir(), 'pc-cmd-6-'))
  const projectRoot = mkdtempSync(join(tmpdir(), 'pc-cmd-6-root-'))
  writeTask(changeDir, makeTask('pnpm run gen:types', '修改 src/app.js').replace(/\n/g, '\r\n'))
  writePkg(projectRoot, { start: 'node server.js' })
  const r = validateTaskCommands(changeDir, projectRoot, null)
  assert(!r.ok, 'CRLF 下仍抓到 gen:types 缺失（ok=false）')
  assert(r.errors.length > 0 && r.errors[0].includes('gen:types'), 'CRLF 下 error 文案含命令名')
}

// ── 7: parseLocalYamlModules 单元（modules 块解析契约） ──
console.log('\n--- 场景 7：parseLocalYamlModules 解析 modules 块 ---')
{
  const yaml = [
    'project:',
    '  type: nodejs',
    'modules:',
    '  frontend: { path: "frontend/", test: "cd frontend && pnpm test" }',
    '  backend: { path: "backend/", test: "cd backend && uv run pytest" }',
    'commands:',
    '  build: "npm run build"',
  ].join('\n')
  const m = parseLocalYamlModules(yaml)
  assert(m !== null, '解析到 modules 块')
  assert(m && m.frontend && m.frontend.path === 'frontend/', 'frontend.path = frontend/')
  assert(m && m.backend && m.backend.path === 'backend/', 'backend.path = backend/')

  const empty = parseLocalYamlModules('project:\n  type: go\n')
  assert(empty === null, '无 modules 块 → null')
}

console.log('\n==================================================')
console.log(`✅ 通过: ${total - failed}  ❌ 失败: ${failed}`)
console.log('==================================================')
if (failed > 0) process.exit(1)
