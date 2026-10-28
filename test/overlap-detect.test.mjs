/**
 * target-file 声明重叠检测测试 — 2026-10-28-overlap-route
 *
 * 覆盖矩阵：
 *   检出        双变更同声明检出（文件+归属清单）、不相交返回空、损坏声明空集 fail-open
 *   归档退出    重叠方移入 changes/archive/ 后退出判定
 *   动词        sillyspec overlap：有重叠列清单附分流与落地序列指引、零重叠确认行、恒 exit 0
 *   advisory    overlapAdvisoryFor：相交出提示行（含分流与序列）、无相交返回 null
 *   零回归      既有 verify-drafts 判定面测试复跑（FR-05——在收口动态面跑，此处以
 *               detectDeclaredOverlaps 纯函数 + 动词输出为锚）
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync, existsSync, renameSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { runCLI, report } from './_cli-step-harness.mjs'

const count = { passed: 0, failed: 0, failures: [] }
const assert = (cond, msg) => { cond ? (count.passed++, console.log(`  ✅ PASS: ${msg}`)) : (count.failed++, count.failures.push(msg), console.log(`  ❌ FAIL: ${msg}`)) }
const tmpRoots = []

/** 造一个带 design §6 声明的变更目录（表格式文件变更清单——与真实 flow 面同形态）。 */
function seedChange(specBase, name, files, { broken = false } = {}) {
  const dir = join(specBase, 'changes', name)
  mkdirSync(dir, { recursive: true })
  const rows = broken
    ? `| 修改 | ${files.join(' 与 ')}（故意缺表格闭合与规范列，解析应得空集）`
    : files.map((f) => `| 修改 | ${f} | 测试声明 |`).join('\n')
  writeFileSync(join(dir, 'design.md'), [
    '# 设计记录（Design Record）',
    '',
    '## 做法概述',
    '',
    'fixture。',
    '',
    '## 文件变更清单',
    '',
    '| 操作 | 路径 | 说明 |',
    '| --- | --- | --- |',
    rows,
    '',
  ].join('\n'))
  return dir
}

const { detectDeclaredOverlaps, overlapAdvisoryFor } = await import('../src/overlap-detect.js')

// ── FR-01 检出 / 不相交空 / fail-open 空集 ──
{
  const root = mkdtempSync(join(tmpdir(), 'ovl-')); tmpRoots.push(root)
  const specBase = join(root, '.sillyspec')
  const A = '2026-10-28-ovl-a', B = '2026-10-28-ovl-b', C = '2026-10-28-ovl-c', D = '2026-10-28-ovl-d'
  seedChange(specBase, A, ['src/main.js', 'src/a-only.js'])
  seedChange(specBase, B, ['src\\main.js', 'src/b-only.js']) // 反斜杠形态：归一后同文件
  seedChange(specBase, C, ['src/c-only.js'])
  seedChange(specBase, D, ['src/main.js'], { broken: true }) // 损坏声明：空集不喂重叠
  const r = detectDeclaredOverlaps({ cwd: root })
  assert(r.length === 1 && r[0].file === 'src/main.js' && r[0].changes.join(',') === [A, B].join(','),
    `双变更同声明检出（实际 ${JSON.stringify(r)}）——含反斜杠归一、损坏声明空集、不相交集不计`)
  const adv = overlapAdvisoryFor(A, { cwd: root })
  assert(adv !== null && adv.includes(B) && adv.includes('src/main.js') && adv.includes('worktree apply') && adv.includes('3way'),
    `advisory 文案含对方变更/文件/分流与落地序列（${adv ? adv.slice(0, 80) + '…' : 'null'}）`)
  assert(overlapAdvisoryFor(C, { cwd: root }) === null, '不相交变更 advisory 为 null（零输出）')

  // ── FR-02 归档退出 ──
  mkdirSync(join(specBase, 'changes', 'archive'), { recursive: true })
  renameSync(join(specBase, 'changes', B), join(specBase, 'changes', 'archive', B))
  const r2 = detectDeclaredOverlaps({ cwd: root })
  assert(r2.length === 0, `重叠方归档后退出判定（实际 ${JSON.stringify(r2)}）`)

  // ── FR-03 动词：有重叠 ──
  const B2 = '2026-10-28-ovl-b2'
  seedChange(specBase, B2, ['src/main.js'])
  const c1 = runCLI(['overlap'], { cwd: root })
  assert(c1.status === 0 && c1.stdout.includes('src/main.js') && c1.stdout.includes(A) && c1.stdout.includes(B2),
    `overlap 动词列重叠（exit ${c1.status}，输出含文件与两变更）`)
  assert(c1.stdout.includes('worktree apply') && c1.stdout.includes('3way') && c1.stdout.includes('main-repo.lock'),
    '动词输出附分流与落地序列指引（worktree apply / 3way / main-repo.lock）')

  // ── FR-03 动词：零重叠 ──
  const root2 = mkdtempSync(join(tmpdir(), 'ovl2-')); tmpRoots.push(root2)
  const specBase2 = join(root2, '.sillyspec')
  seedChange(specBase2, '2026-10-28-ovl-solo', ['src/x.js'])
  const c2 = runCLI(['overlap'], { cwd: root2 })
  assert(c2.status === 0 && c2.stdout.includes('无 target-file 声明重叠'), `零重叠确认行恒 exit 0（exit ${c2.status}）`)

  // 空仓（无 changes/）：fail-open 空数组 + 动词零重叠
  const root3 = mkdtempSync(join(tmpdir(), 'ovl3-')); tmpRoots.push(root3)
  assert(detectDeclaredOverlaps({ cwd: root3 }).length === 0, '无 .sillyspec/changes 目录 fail-open 空数组')
}

for (const d of tmpRoots) { try { rmSync(d, { recursive: true, force: true }) } catch {} }
report(count.passed, count.failed, count.failures)
