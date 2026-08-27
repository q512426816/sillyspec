/**
 * facade-hint（坑 plan-facade-files-manual-backfill，2026-08-28 用户实证 ×2）：
 * daemon/service.py 类「透传必经文件」不在 allowed_paths → 执行期 apply Gate1 拦截 →
 * 手工回补两轮。plan 门预检静态引用扫描（direct import / 同目录聚合 ≥2）亮候选。
 */
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

import { findFacadeCandidates, warnFacadeCandidateFiles, extractImportSpecifiers, specRefsModule } from '../src/facade-hint.js'

let passed = 0, failed = 0
const failures = []
function assert(cond, msg) {
  if (cond) { passed++; console.log(`  ✅ PASS: ${msg}`) }
  else { failed++; failures.push(msg); console.log(`  ❌ FAIL: ${msg}`) }
}
const tmpDirs = []
function mkTmp(prefix) {
  const d = mkdtempSync(join(tmpdir(), `facade-${prefix}-`))
  tmpDirs.push(d)
  return d
}

console.log('=== facade-hint：透传/聚合候选探测 ===\n')

// ── 纯函数：import 说明符提取 + 模块命中 ──
{
  const py = extractImportSpecifiers('from daemon.routers import users\nimport os\nfrom .sibling import x\n', '.py')
  assert(py.includes('daemon.routers.users') && py.includes('os') && py.includes('.sibling.x'),
    `py 说明符提取（from-import 逐名拼接；实际 ${JSON.stringify(py)}）`)
  assert(!py.includes('users') && !py.includes('x'), 'from 行的导入名不泄漏为独立模块（裸 import 锚定行首）')
  const js = extractImportSpecifiers("const a = require('./routers/foo')\nimport b from '../x/bar'\nawait import('./m')\n", '.js')
  assert(js.includes('./routers/foo') && js.includes('../x/bar') && js.includes('./m'), `js 说明符提取（实际 ${JSON.stringify(js)}）`)
  assert(specRefsModule('daemon.routers.foo', 'foo') && specRefsModule('./foo', 'foo') && specRefsModule('foo', 'foo'), 'specRefsModule 尾部命中三形态')
  assert(!specRefsModule('daemon.routers.foobar', 'foo') && !specRefsModule('os', 'foo'), 'specRefsModule 不误命中（模块名须完整）')
}

// ── 场景：service.py 聚合挂载 + api.py 直接引用 ──
{
  const proj = mkTmp('proj')
  mkdirSync(join(proj, 'daemon', 'routers'), { recursive: true })
  // 既有模块（allowed 之外但同目录——聚合信号的比对面）
  writeFileSync(join(proj, 'daemon', 'routers', 'users.py'), 'def list_users(): pass\n')
  writeFileSync(join(proj, 'daemon', 'routers', 'orders.py'), 'def list_orders(): pass\n')
  // facade：service.py 聚合挂载同目录 ≥2 模块（新增 new_endpoint.py 几乎必然也要在此登记）
  writeFileSync(join(proj, 'daemon', 'service.py'),
    'from daemon.routers import users, orders\n\ndef mount(app):\n    app.include_router(users)\n')
  // direct：api.py 引用 allowed 的 users 模块
  writeFileSync(join(proj, 'daemon', 'api.py'),
    'from daemon.routers.users import list_users\n\ndef proxy(): return list_users()\n')
  // 无关文件：不 import 任何相关模块
  writeFileSync(join(proj, 'daemon', 'unrelated.py'), 'import os\nprint(os.name)\n')

  const r = findFacadeCandidates({
    cwd: proj,
    allowedPaths: ['daemon/routers/new_endpoint.py', 'daemon/routers/users.py'],
  })
  assert(!r.skipped, `探测执行（skipped=${r.skipped}）`)
  const svc = r.candidates.find(c => c.file.replace(/\\/g, '/').endsWith('daemon/service.py'))
  assert(!!svc, `service.py（聚合挂载形态）被亮为候选（实际 ${JSON.stringify(r.candidates.map(c => c.file))}）`)
  assert(svc && svc.via.some(v => v.includes('aggregates')), `service.py 命中聚合信号（via=${JSON.stringify(svc && svc.via)}）`)
  const api = r.candidates.find(c => c.file.replace(/\\/g, '/').endsWith('daemon/api.py'))
  assert(!!api && api.via.some(v => v.includes('direct import of users')), `api.py 命中 direct import 信号（via=${JSON.stringify(api && api.via)}）`)
  assert(!r.candidates.some(c => c.file.endsWith('unrelated.py')), '无关文件不进候选')
}

// ── 打印出口：有候选出 warning、无候选静默 ──
{
  const proj = mkTmp('empty')
  const r1 = warnFacadeCandidateFiles({ cwd: proj, changeName: 'x', allowSet: new Set() })
  assert(r1.skipped && r1.candidates.length === 0, '无 allowed_paths → 静默跳过（不打扰）')
}

for (const d of tmpDirs) { try { rmSync(d, { recursive: true, force: true }) } catch {} }
console.log(`\n${'='.repeat(50)}`)
console.log(`✅ 通过: ${passed}  ❌ 失败: ${failed}`)
if (failures.length) console.log(`失败项: ${failures.join('; ')}`)
console.log('='.repeat(50))
process.exit(failed > 0 ? 1 : 0)
