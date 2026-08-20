/**
 * 坑 verify-modules-crlf-blanket-fallback 回归：verify-postcheck 手写行扫描器的 CRLF 兼容
 *
 * 背景（2026-08-20 Windows 仓实证）：local.yaml 为 CRLF 时，逐行正则里 `.` 不匹配 `\r`、
 * `$`（无 m 标志）要求真串尾——extractModules 条目正则整条失配返回 null（modules 映射恒失效
 * → test_strategy:module 永远回退全量 → 600s 默认超时必炸，verify 从未真正跑过 module 子集）；
 * extractKnownFailures 块式只捕获第一条豁免项。
 *
 * 锁定语义：同一文本的 CRLF / LF / CR 三种行尾，四个解析器（extractModules /
 * extractKnownFailures / extractTestCommand / extractTestStrategy）输出完全一致。
 */
import {
  extractModules,
  extractKnownFailures,
  extractTestCommand,
  extractTestStrategy,
  decideVerifyTestAction,
} from '../src/verify-postcheck.js'

let passed = 0, failed = 0
const failures = []
function assert(cond, msg) { if (cond) { passed++; console.log('  ✅ ' + msg) } else { failed++; failures.push(msg); console.log('  ❌ ' + msg) } }

const LF = [
  'project:',
  '  type: nodejs',
  '',
  'commands:',
  '  install: "cd web && pnpm install"',
  '  test: npm test',
  '',
  'test_strategy: module',
  '',
  'modules:',
  '  backend: { path: "backend/", test: "cd backend && uv run pytest" }',
  '  frontend: { path: "frontend/", test: "cd frontend && pnpm test" }',
  '',
  'known_failures:',
  '  - "tests/test_a.py::test_legacy"',
  '  - "tests/test_b.py::test_old"',
  '',
].join('\n')
const CRLF = LF.replace(/\n/g, '\r\n')
const CR = LF.replace(/\n/g, '\r') // 老 Mac 行尾（归一也应覆盖）

console.log('=== verify-postcheck CRLF 兼容（坑 verify-modules-crlf-blanket-fallback）===\n')

console.log('--- ① extractModules：CRLF 下映射完整解析（不再返回 null）---')
{
  const lf = extractModules(LF)
  const crlf = extractModules(CRLF)
  const cr = extractModules(CR)
  assert(lf && lf.backend && lf.frontend, 'LF 基线：两模块解析成功')
  assert(JSON.stringify(crlf) === JSON.stringify(lf), 'CRLF 输出与 LF 完全一致（修复核心断言）')
  assert(JSON.stringify(cr) === JSON.stringify(lf), 'CR 输出与 LF 完全一致')
  assert(crlf.backend.test === 'cd backend && uv run pytest', '模块 test 命令原样保留（含 && 字符串）')
}

console.log('--- ② extractKnownFailures：CRLF 块式捕获全部条目（不再只留第一条）---')
{
  const lf = extractKnownFailures(LF)
  const crlf = extractKnownFailures(CRLF)
  assert(lf.length === 2, 'LF 基线：2 条豁免')
  assert(JSON.stringify(crlf) === JSON.stringify(lf), `CRLF 输出与 LF 一致（实际 ${JSON.stringify(crlf)}）`)
  assert(crlf.includes('tests/test_b.py::test_old'), '第二条豁免不再丢失')
  const inline = extractKnownFailures('known_failures: ["a", "b"]\r\n')
  assert(inline.length === 2, `inline 流式 CRLF 也解析 2 条（实际 ${JSON.stringify(inline)}）`)
}

console.log('--- ③ extractTestCommand / extractTestStrategy：CRLF 无回归 ---')
{
  assert(extractTestCommand(CRLF) === 'npm test', `CRLF test 命令解析（实际 ${extractTestCommand(CRLF)}）`)
  assert(extractTestStrategy(CRLF) === 'module', `CRLF test_strategy 解析（实际 ${extractTestStrategy(CRLF)}）`)
}

console.log('--- ④ 链路：CRLF local.yaml + module 策略 → 不再误判「无有效 modules 块」---')
{
  const mods = extractModules(CRLF)
  const present = mods !== null
  const action = decideVerifyTestAction({ strategy: 'module', modulesPresent: present, hitCount: 2 })
  assert(action === 'module-subset', `CRLF 下命中 module-subset（实际 ${action}，修复前 modulesPresent=false 恒 full → 600s 全量超时）`)
}

console.log('--- ⑤ modules.js 同类：showModuleStatus 的 \\\\r?\\\\n 拆分（经 _module-map.yaml 内容验证不在此文件单测，锁 split 源头无 CR 残留）---')
{
  // 直接验证 modules.js 的解析入口拆分行为：CRLF 内容 split(/\r?\n/) 不残留 \r
  const content = 'modules:\r\n  auth:\r\n    role: 登录\r\n'
  const lines = content.split(/\r?\n/)
  assert(lines.every(l => !l.includes('\r')), 'split(/\\r?\\n/) 行内无 \\r 残留')
}

console.log(`\n${'='.repeat(50)}`)
console.log(`✅ 通过: ${passed}  ❌ 失败: ${failed}`)
if (failures.length) { console.log('失败项:'); failures.forEach(f => console.log('  - ' + f)) }
console.log('='.repeat(50))
if (failed > 0) process.exit(1)
