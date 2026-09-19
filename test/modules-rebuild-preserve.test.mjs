/**
 * modules rebuild 顶层段保留测试（2026-09-19-ceremony-pricing-five-cuts task-01 / D-008@v2 / R-01）
 *
 * 背景（Grill P1-1 实证修正）：rebuild 非 force 是 dry-run 不写盘；--force 是唯一写盘路径且
 * merge 重发射只覆盖 modules 段 per-module 字段——顶层手工段（blast 危险面声明）此前会整体
 * 丢失。修法：--force 写盘时从 existingMap 文本提取非重建头顶层段原样回插。
 *
 * 覆盖：
 *   1. --force 写盘后顶层 blast 段在场且内容保真（逐行语义等价——generated_at 头部刷新属预期）
 *   2. 非 force（无 --force）dry-run 不写盘（mtime/内容不变）
 *   3. 无手工段的 map --force 重建 → 不产生多余空段
 *   4. 重建头五族外的其他顶层手工段同样保留（通用机制，不只为 blast 特判）
 *
 * 风格：自研 assert，tmp fixture。
 */
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync, statSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

import { rebuildModuleMap } from '../src/modules.js'

let failed = 0
let total = 0

function assert(condition, msg) {
  total++
  if (condition) {
    console.log(`  ✅ PASS: ${msg}`)
  } else {
    failed++
    console.log(`  ❌ FAIL: ${msg}`)
  }
}

const tmpRoots = []
function makeFixture(prefix, withBlast) {
  const root = mkdtempSync(join(tmpdir(), prefix))
  tmpRoots.push(root)
  const modulesDir = join(root, '.sillyspec', 'docs', 'demo', 'modules')
  mkdirSync(modulesDir, { recursive: true })
  // 一张模块卡（rebuild 需要至少一张卡或 existing 模块）
  writeFileSync(join(modulesDir, 'alpha.md'), [
    '---',
    'module_id: alpha',
    '---',
    '## 定位',
    '测试模块',
  ].join('\n'), 'utf8')
  const mapLines = [
    'schema_version: 2',
    'generated_at: 2026-01-01 00:00:00',
    'generator: sillyspec-modules-rebuild',
    '',
    'modules:',
    '  alpha:',
    '    status: active',
    '    doc: modules/alpha.md',
  ]
  if (withBlast) {
    mapLines.push(
      '',
      '# blast 段前置注释（随段保留）',
      'blast:',
      '  - prefixes:',
      '      - src/worktree.js',
      '      - src/progress/',
      '    tier: S3',
      '    evidence: true',
      '  - prefixes: [src/stage-contract.js]',
      '    tier: S2',
    )
  }
  writeFileSync(join(modulesDir, '_module-map.yaml'), mapLines.join('\n') + '\n', 'utf8')
  return { root, mapPath: join(modulesDir, '_module-map.yaml') }
}

function blastSectionOf(text) {
  const lines = text.split('\n')
  const start = lines.findIndex(l => /^blast:/.test(l))
  if (start < 0) return null
  const rest = []
  for (let i = start; i < lines.length; i++) {
    if (i > start && /^[A-Za-z_][\w-]*:/.test(lines[i])) break
    rest.push(lines[i])
  }
  return rest.join('\n').replace(/\n+$/, '')
}

console.log('\n=== modules-rebuild-preserve：--force 顶层段回插 ===\n')

// 1. --force 写盘后 blast 段在场且保真
{
  const { root, mapPath } = makeFixture('mrp-force-', true)
  const before = blastSectionOf(readFileSync(mapPath, 'utf8'))
  await rebuildModuleMap(root, { force: true })
  const after = readFileSync(mapPath, 'utf8')
  const afterBlast = blastSectionOf(after)
  assert(afterBlast != null, '--force 写盘后顶层 blast 段在场')
  assert(afterBlast === before, `blast 段内容保真（原样回插，实际：${JSON.stringify(afterBlast)}）`)
  assert(after.includes('modules:'), 'modules 段照常重建')
}

// 2. 非 force dry-run 不写盘
{
  const { root, mapPath } = makeFixture('mrp-dry-', true)
  const before = readFileSync(mapPath, 'utf8')
  const beforeMtime = statSync(mapPath).mtimeMs
  await new Promise(r => setTimeout(r, 20))
  await rebuildModuleMap(root, { force: false })
  const after = readFileSync(mapPath, 'utf8')
  assert(after === before && statSync(mapPath).mtimeMs === beforeMtime, '非 force dry-run 不写盘（内容与 mtime 不变）')
}

// 3. 无手工段 → 不产生多余空段
{
  const { root, mapPath } = makeFixture('mrp-plain-', false)
  await rebuildModuleMap(root, { force: true })
  const after = readFileSync(mapPath, 'utf8')
  assert(!/^blast:/.test(after), '无手工段重建 → 不凭空产生 blast 段')
  assert(!/\n\n\n\n/.test(after), '不产生多余连续空行')
}

// 4. 其他顶层手工段同样保留（通用机制）
{
  const { root, mapPath } = makeFixture('mrp-other-', false)
  const extra = ['extra_notes:', '  - 手工备注 A', '  - 手工备注 B'].join('\n')
  writeFileSync(mapPath, readFileSync(mapPath, 'utf8') + '\n' + extra + '\n', 'utf8')
  await rebuildModuleMap(root, { force: true })
  const after = readFileSync(mapPath, 'utf8')
  assert(after.includes('extra_notes:'), '非 blast 顶层手工段同样回插（通用机制）')
  assert(after.includes('- 手工备注 A') && after.includes('- 手工备注 B'), '段内列表项保真')
}

for (const d of tmpRoots) {
  try { rmSync(d, { recursive: true, force: true }) } catch { /* best-effort */ }
}

console.log(`\n${failed === 0 ? '✅' : '❌'} modules-rebuild-preserve：${total - failed}/${total} 通过\n`)
if (failed > 0) process.exit(1)
