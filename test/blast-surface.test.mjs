/**
 * blast 声明面测试（2026-09-19-ceremony-pricing-five-cuts task-01 / FR-01 / D-008/D-010）
 *
 * 覆盖：
 *   1. 前缀匹配形态：字面量文件、目录前缀（含尾斜杠）、段边界不误命中（src/a 不命中 src/ab.js）、
 *      Windows 反斜杠归一
 *   2. 无命中 → tier S1（BLAST_NO_HIT_TIER，禁词表兜底口径）
 *   3. 多条目命中取最高档；evidence 位传递（任一命中条目 true 即 true）
 *   4. 非法条目容错：tier 越界/prefixes 非数组/条目非对象 → 逐条跳过不抛错
 *   5. loadBlastDeclarations：map blast 段装载（好形态）、map 缺失/坏 YAML/段缺失 → 空表
 *   6. local 只升不降：local 高档 → 升；local 低于 map → 不压低；local 不承载 evidence
 *   7. D-010 自举口径验收：api-matrix 类文件面 → S2、会话/worktree 域 → S3+evidence（合成声明面，
 *      不依赖真实 map——真实 map 的走位由 task-04 自指验收覆盖）
 *
 * 风格：自研 assert（与 quick-session-owner.test.mjs 同），tmp fixture 不引入测试框架。
 */
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

import { resolveBlastSurfaces, loadBlastDeclarations, blastPrefixMatches, BLAST_NO_HIT_TIER } from '../src/blast-surface.js'

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
function makeTmpDir(prefix) {
  const dir = mkdtempSync(join(tmpdir(), prefix))
  tmpRoots.push(dir)
  return dir
}

console.log('\n=== blast-surface：声明面解析与装载 ===\n')

// 1. 前缀匹配形态
{
  assert(blastPrefixMatches('src/a.js', 'src/a.js') === true, '字面量文件命中')
  assert(blastPrefixMatches('src/a/x.js', 'src/a') === true, '目录前缀命中')
  assert(blastPrefixMatches('src/a/x.js', 'src/a/') === true, '尾斜杠目录前缀命中')
  assert(blastPrefixMatches('src/ab.js', 'src/a') === false, '段边界不误命中（src/a ≠ src/ab.js）')
  assert(blastPrefixMatches('src\\a.js', 'src/a.js') === true, 'Windows 反斜杠归一命中')
  assert(blastPrefixMatches('src/a.js', '') === false, '空前缀不命中')
}

// 2. 无命中 → S1
{
  const v = resolveBlastSurfaces(['docs/x.md', 'src/datetime.js'], [{ prefixes: ['src/worktree.js'], tier: 'S3', evidence: true }])
  assert(v.tier === BLAST_NO_HIT_TIER && v.tier === 'S1', `无命中 → S1（实际 ${v.tier}）`)
  assert(v.evidence === false && v.hitPrefixes.length === 0, '无命中 → evidence false / hits 空')
  assert(resolveBlastSurfaces([], [{ prefixes: ['src/a'], tier: 'S3' }]).tier === 'S1', '空文件面 → S1')
}

// 3. 多条目取最高档 + evidence 传递
{
  const decls = [
    { prefixes: ['src/stage-contract.js'], tier: 'S2' },
    { prefixes: ['src/worktree.js'], tier: 'S3', evidence: true },
  ]
  const v = resolveBlastSurfaces(['src/stage-contract.js', 'src/worktree.js'], decls)
  assert(v.tier === 'S3', '多条目命中取最高档')
  assert(v.evidence === true, '任一命中条目 evidence:true → true')
  const v2 = resolveBlastSurfaces(['src/stage-contract.js'], decls)
  assert(v2.tier === 'S2' && v2.evidence === false, '仅 S2 条目命中 → S2 无 evidence')
  assert(v.hitPrefixes.length === 2, 'hitPrefixes 记录两条命中前缀')
}

// 4. 非法条目容错
{
  const v = resolveBlastSurfaces(['src/a.js'], [
    { prefixes: ['src/a.js'], tier: 'SX' },            // tier 越界 → 跳过
    { prefixes: 'not-array', tier: 'S3' },              // prefixes 非数组 → 跳过
    'garbage',                                          // 非对象 → 跳过
    null,                                               // null → 跳过
    { prefixes: ['src/a.js'] },                          // 无 tier 无 evidence → 跳过
    { prefixes: ['src/a.js'], tier: 'S2' },             // 合法
  ])
  assert(v.tier === 'S2', `非法条目逐条跳过、合法条目生效（实际 ${v.tier}）`)
}

// 5. loadBlastDeclarations：map 装载与容错
{
  const rt = makeTmpDir('bs-load-')
  const projDir = join(rt, 'docs', 'demo', 'modules')
  mkdirSync(projDir, { recursive: true })
  // 好形态 map
  writeFileSync(join(projDir, '_module-map.yaml'), [
    'schema_version: 2',
    'modules:',
    '  a:',
    '    status: active',
    'blast:',
    '  - prefixes:',
    '      - src/daemon/',
    '    tier: S3',
    '    evidence: true',
    '  - prefixes: [src/gate.js]',
    '    tier: S2',
  ].join('\n'), 'utf8')
  const { declarations, mapDeclarations } = loadBlastDeclarations({ specBase: rt, project: 'demo' })
  assert(mapDeclarations.length === 2, `map blast 段装载 2 条（实际 ${mapDeclarations.length}）`)
  assert(declarations[0].evidence === true && declarations[1].tier === 'S2', '条目字段形态正确（块式/流式 YAML 均可）')
  // map 缺失 → 空表
  const none = loadBlastDeclarations({ specBase: rt, project: 'no-such' })
  assert(none.declarations.length === 0, 'map 缺失 → 空表不缺省不拦截')
  // 坏 YAML → 空表
  writeFileSync(join(projDir, '_module-map.yaml'), '{not yaml', 'utf8')
  const bad = loadBlastDeclarations({ specBase: rt, project: 'demo' })
  assert(bad.declarations.length === 0, '坏 YAML → 空表')
  // 段缺失（无 blast: 键）→ 空表
  writeFileSync(join(projDir, '_module-map.yaml'), 'modules:\n  a:\n    status: active\n', 'utf8')
  const noBlast = loadBlastDeclarations({ specBase: rt, project: 'demo' })
  assert(noBlast.declarations.length === 0, 'map 无 blast 段 → 空表（S1 起步）')
}

// 6. local 只升不降（经 loadBlastDeclarations 合并 + resolveBlastSurfaces 取 max）
{
  const rt = makeTmpDir('bs-local-')
  const projDir = join(rt, 'docs', 'demo', 'modules')
  mkdirSync(projDir, { recursive: true })
  writeFileSync(join(projDir, '_module-map.yaml'), [
    'blast:',
    '  - prefixes: [src/gate.js]',
    '    tier: S2',
    '  - prefixes: [src/other.js]',
    '    tier: S3',
  ].join('\n'), 'utf8')
  writeFileSync(join(rt, 'local.yaml'), [
    'ceremony:',
    '  blast_surfaces:',
    '    - prefixes: [src/gate.js]',
    '      tier: S3',           // local 高 → 升
    '    - prefixes: [src/other.js]',
    '      tier: S1',           // local 低 → 不压低
    '    - prefixes: [src/mine.js]',
    '      tier: S3',           // local-only 前缀 → 生效
  ].join('\n'), 'utf8')
  const { declarations, localDeclarations } = loadBlastDeclarations({ specBase: rt, project: 'demo' })
  assert(localDeclarations.length === 3, `local 条目装载 3 条（实际 ${localDeclarations.length}）`)
  assert(localDeclarations.every(d => d.evidence === false), 'local 条目 evidence 恒 false（不承载证据语义）')
  const raised = resolveBlastSurfaces(['src/gate.js'], declarations)
  assert(raised.tier === 'S3', `local 高档 → 升（实际 ${raised.tier}）`)
  const kept = resolveBlastSurfaces(['src/other.js'], declarations)
  assert(kept.tier === 'S3', `local 低于 map → 不压低（实际 ${kept.tier}）`)
  const mine = resolveBlastSurfaces(['src/mine.js'], declarations)
  assert(mine.tier === 'S3' && mine.evidence === false, 'local-only 前缀生效')
}

// 7. D-010 自举口径（合成声明面）
{
  const decls = [
    { prefixes: ['src/friction-ledger.js', 'src/worktree.js', 'src/progress/'], tier: 'S3', evidence: true },
    { prefixes: ['src/stage-contract.js', 'src/verify-probes.js', 'src/probe7-anchor-check.js', 'src/ceremony-tier.js', 'src/run/gates.js'], tier: 'S2' },
  ]
  const apiMatrix = ['src/stage-contract.js', 'src/verify-probes.js', 'src/probe7-anchor-check.js', 'src/index.js', 'src/stages/verify.js', 'templates/prompts/verify-probes.md', 'test/api-coverage-matrix.test.mjs', 'test/acceptance-matrix-probe.test.mjs']
  const am = resolveBlastSurfaces(apiMatrix, decls)
  assert(am.tier === 'S2' && am.evidence === false, `D-010 验收：api-matrix 类文件面 → S2 无 evidence（实际 ${am.tier}/${am.evidence}）`)
  const session = resolveBlastSurfaces(['src/friction-ledger.js', 'src/progress/x.js'], decls)
  assert(session.tier === 'S3' && session.evidence === true, '真会话/租约域 → S3 + evidence')
  const plain = resolveBlastSurfaces(['src/datetime.js', 'src/constants.js', 'packages/dashboard/src/App.vue'], decls)
  assert(plain.tier === 'S1', 'core-engine 轻文件/dashboard → S1（不整模块标价）')
}

for (const d of tmpRoots) {
  try { rmSync(d, { recursive: true, force: true }) } catch { /* best-effort */ }
}

console.log(`\n${failed === 0 ? '✅' : '❌'} blast-surface：${total - failed}/${total} 通过\n`)
if (failed > 0) process.exit(1)
