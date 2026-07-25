/**
 * auditQuickCompletion characterization 测试（W6 Step 0）
 *
 * 锁定 quick 完成审计的核心判定契约（safe/warning/blocked），为 W6 拆 quick-audit 到
 * src/run/quick-audit.js 冻结行为快照——拆分后跑同一断言验证行为不变。
 *
 * auditQuickCompletion(cwd, guard, options) → { status, reasons, changedFiles, newFiles, deletedFiles, baselineHit }
 *   guard: { baselineFiles, allowedFiles, allowNew, forceBaseline, linkedChanges }
 *   status: 'safe' | 'warning' | 'blocked'
 *
 * 覆盖五条核心路径：无变更/新增/删除/危险文件/forceBaseline 放行。
 */
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { execSync } from 'child_process'
import { auditQuickCompletion } from '../src/run.js'

let failed = 0, total = 0
function assert(cond, msg) {
  total++
  if (!cond) { failed++; console.log(`  ❌ FAIL: ${msg}`) }
  else console.log(`  ✅ PASS: ${msg}`)
}

const tmpRoots = []
function makeRepo() {
  const d = mkdtempSync(join(tmpdir(), 'qa-'))
  tmpRoots.push(d)
  execSync('git init -q', { cwd: d, stdio: 'pipe' })
  execSync('git config user.email t@t.com', { cwd: d, stdio: 'pipe' })
  execSync('git config user.name t', { cwd: d, stdio: 'pipe' })
  // 建 quicklog 目录（非空）避免 quicklog 检查把 safe 升级 warning
  mkdirSync(join(d, '.sillyspec', 'quicklog'), { recursive: true })
  writeFileSync(join(d, '.sillyspec', 'quicklog', 'test.md'), '# task\n')
  writeFileSync(join(d, '.gitignore'), '.sillyspec/\n')
  writeFileSync(join(d, 'package.json'), '{}\n')
  writeFileSync(join(d, 'README.md'), 'init\n')
  execSync('git add .', { cwd: d, stdio: 'pipe' })
  execSync('git commit -q -m init', { cwd: d, stdio: 'pipe' })
  return d
}

const baseGuard = { baselineFiles: [], allowedFiles: [], allowNew: false, forceBaseline: false, linkedChanges: [] }

console.log('--- auditQuickCompletion characterization ---')

// case 1: 无变更 → safe
{
  const d = makeRepo()
  const r = await auditQuickCompletion(d, baseGuard, {})
  assert(r.status === 'safe', `无变更 → safe（实际 ${r.status}）`)
}

// case 2: 新增非 .sillyspec 文件（allowNew=false）→ warning
{
  const d = makeRepo()
  writeFileSync(join(d, 'new-feature.js'), 'export const x = 1\n')
  const r = await auditQuickCompletion(d, baseGuard, {})
  assert(r.status === 'warning', `新增文件 allowNew=false → warning（实际 ${r.status}）`)
  assert(r.newFiles.includes('new-feature.js'), `newFiles 含新增文件`)
}

// case 3: 删除 tracked 文件 → blocked
{
  const d = makeRepo()
  rmSync(join(d, 'README.md'))
  const r = await auditQuickCompletion(d, baseGuard, {})
  assert(r.status === 'blocked', `删除文件 → blocked（实际 ${r.status}）`)
  assert(r.deletedFiles.includes('README.md'), `deletedFiles 含删除文件`)
}

// case 4: 改 dangerous 文件（package.json，非 force）→ blocked
{
  const d = makeRepo()
  writeFileSync(join(d, 'package.json'), '{"name":"x"}\n')
  const r = await auditQuickCompletion(d, baseGuard, {})
  assert(r.status === 'blocked', `改 package.json → blocked（危险文件，实际 ${r.status}）`)
}

// case 5: forceBaseline 放行 dangerous → 非 blocked
{
  const d = makeRepo()
  writeFileSync(join(d, 'package.json'), '{"name":"x"}\n')
  const r = await auditQuickCompletion(d, { ...baseGuard, forceBaseline: true }, {})
  assert(r.status !== 'blocked', `forceBaseline 放行 dangerous → 非 blocked（实际 ${r.status}）`)
}

for (const d of tmpRoots) { try { rmSync(d, { recursive: true, force: true }) } catch {} }
console.log(`\n${'='.repeat(50)}`)
console.log(`✅ 通过: ${total - failed}  ❌ 失败: ${failed}`)
console.log(`${'='.repeat(50)}`)
if (failed > 0) process.exit(1)
