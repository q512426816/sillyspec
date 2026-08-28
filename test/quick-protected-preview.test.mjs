/**
 * quick 受保护文件预告（坑 quick-protected-late-hint，2026-08-28 用户实证：
 * scan 类文档 ARCHITECTURE/CONCERNS 属受保护基线，--files 声明了照样拦、必须
 * --force-baseline——设计合理但提示太晚，要等 --done 审计轮才发现，白跑一轮往返）。
 *
 * 修复：predictProtectedQuickFiles（与 auditQuickCompletion 危险门同口径）+
 * stage.js quick 起步（step1）与恢复追加两处预告打印。
 */
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

import { predictProtectedQuickFiles } from '../src/run/shared.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const cliBin = join(__dirname, '..', 'bin', 'sillyspec.js')
let passed = 0, failed = 0
const failures = []
function assert(cond, msg) {
  if (cond) { passed++; console.log(`  ✅ PASS: ${msg}`) }
  else { failed++; failures.push(msg); console.log(`  ❌ FAIL: ${msg}`) }
}
const tmpRoots = []
function mkTmp(prefix) {
  const d = mkdtempSync(join(tmpdir(), `qpp-${prefix}-`))
  tmpRoots.push(d)
  return d
}

console.log('=== predictProtectedQuickFiles：与审计危险门同口径 ===\n')
{
  const SCAN = '.sillyspec/docs/app/scan/ARCHITECTURE.md'
  const r1 = predictProtectedQuickFiles(
    [SCAN, '.sillyspec/docs/app/scan/CONCERNS.md', 'src/feature.js', '.sillyspec/docs/app/modules/runtime.md'],
    {},
  )
  assert(JSON.stringify(r1) === JSON.stringify([SCAN, '.sillyspec/docs/app/scan/CONCERNS.md']),
    `scan 基线文档命中、普通源码/模块卡不命中（实际 ${JSON.stringify(r1)}）`)
  const r2 = predictProtectedQuickFiles(['src/run/command.js', 'package.json', 'src/index.js'], {})
  assert(JSON.stringify(r2) === JSON.stringify(['src/run/command.js', 'package.json']),
    `危险清单命中（src/run/ 前缀 + package.json；实际 ${JSON.stringify(r2)}）`)
  const r3 = predictProtectedQuickFiles([SCAN, 'package.json'], { forceBaseline: true })
  assert(r3.length === 0, '--force-baseline 已带 → 无预告（不会拦）')
  const linked = ['2026-08-28-my-change']
  const r4 = predictProtectedQuickFiles(
    ['.sillyspec/changes/2026-08-28-my-change/design.md', '.sillyspec/changes/other-x/design.md', SCAN],
    { linkedChanges: linked },
  )
  assert(JSON.stringify(r4) === JSON.stringify([SCAN]),
    `关联变更目录文件退栈、非关联 changes 目录按元数据豁免（实际 ${JSON.stringify(r4)}）`)
  const r5 = predictProtectedQuickFiles(null, {})
  assert(r5.length === 0, 'files null → 空不抛错')
  const r6 = predictProtectedQuickFiles(['.sillyspec\\docs\\app\\scan\\ARCHITECTURE.md'], {})
  assert(r6.length === 1 && r6[0].includes('scan/ARCHITECTURE.md'), 'Windows 反斜杠路径归一后命中')
}

console.log('\n=== e2e：quick 起步（step1）即预告 ===\n')
{
  const proj = mkTmp('e2e')
  const specBase = join(proj, '.sillyspec')
  const scanDir = join(specBase, 'docs', 'app', 'scan')
  mkdirSync(scanDir, { recursive: true })
  writeFileSync(join(scanDir, 'ARCHITECTURE.md'), '# Arch\n')
  const res = spawnSync(process.execPath, [cliBin, 'run', 'quick',
    '--input', '测试预告', '--files', '.sillyspec/docs/app/scan/ARCHITECTURE.md',
    '--spec-dir', specBase, '--non-interactive'], {
    cwd: proj, encoding: 'utf8', timeout: 120_000, stdio: ['pipe', 'pipe', 'pipe'],
  })
  const out = (res.stdout || '') + (res.stderr || '')
  assert(res.status === 0, `quick 起步 exit 0（实际 ${res.status}；${out.slice(0, 200)}）`)
  assert(out.includes('受保护/危险范围') && out.includes('--done 审计将拦截'),
    `输出含预告标题（实际片段：${out.split('\n').filter(l => l.includes('受保护') || l.includes('审计将拦截')).join(' | ').slice(0, 150)}）`)
  assert(out.includes('.sillyspec/docs/app/scan/ARCHITECTURE.md'), '预告点名具体文件')
  assert(out.includes('--force-baseline'), '预告给 --force-baseline 出路')
}

for (const d of tmpRoots) { try { rmSync(d, { recursive: true, force: true }) } catch {} }
console.log(`\n${'='.repeat(50)}`)
console.log(`✅ 通过: ${passed}  ❌ 失败: ${failed}`)
if (failures.length) console.log(`失败项: ${failures.join('; ')}`)
console.log('='.repeat(50))
process.exit(failed > 0 ? 1 : 0)
