/**
 * classifyAllowListViolations 容差匹配回归测试 —— 锁定 worktree-apply §4 校验契约
 *
 * 背景（feedback ③）：apply 阶段曾用字面 Set.has 校验，而 plan-postcheck validateDesignFileCoverage
 * 用 pathMatches 双向容差。导致「design 写 glob/目录简写 → plan 放过 → apply 卡死 → 逼用户补字面文件名」。
 * 抽出 classifyAllowListViolations 固化「apply 与 plan 同语义」契约：design 写 glob/目录也能覆盖 git diff 具体路径。
 */
import { classifyAllowListViolations, resolveApplyAllowSet } from '../src/worktree-apply.js'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

let failed = 0
const failures = []
function assertDeep(actual, expected, msg) {
  const a = JSON.stringify(actual)
  const e = JSON.stringify(expected)
  if (a !== e) { failed++; failures.push(`${msg} (got ${a}, want ${e})`); console.log(`  ❌ FAIL: ${msg}`) }
  else console.log(`  ✅ PASS: ${msg}`)
}
const S = arr => new Set(arr)

console.log('=== classifyAllowListViolations（apply §4 容差匹配，与 plan-postcheck 同语义）===\n')

// ── ① 字面相等：旧行为不破 ──
console.log('--- ① 字面路径 → 命中（保持原 Set.has 行为）---')
{
  assertDeep(
    classifyAllowListViolations(['src/run.js'], S(['src/run.js'])),
    [],
    '字面相等 → 无违规'
  )
}

// ── ② glob 覆盖（③ 核心修复点）──
console.log('--- ② design 写 glob → 覆盖具体路径（修复前会被字面匹配误判违规）---')
{
  assertDeep(
    classifyAllowListViolations(['src/run.js', 'src/sub/deep/a.js'], S(['src/**/*.js'])),
    [],
    'design src/**/*.js → 覆盖 src/run.js 与 src/sub/deep/a.js，无违规'
  )
}

// ── ③ 目录前缀覆盖 ──
console.log('--- ③ design 写目录（src 或 src/）→ 覆盖其下所有文件 ---')
{
  assertDeep(
    classifyAllowListViolations(['src/run.js', 'src/sub/b.js'], S(['src'])),
    [],
    'design src → 覆盖 src/run.js 与 src/sub/b.js'
  )
  assertDeep(
    classifyAllowListViolations(['src/run.js'], S(['src/'])),
    [],
    'design src/（带尾斜杠，normalize 去掉）→ 仍覆盖 src/run.js'
  )
}

// ── ④ 真·违规：不在清单的文件必须拦下（不能因容差而放过）──
console.log('--- ④ 真正不在清单的文件 → 仍判违规（容差不等于放行）---')
{
  assertDeep(
    classifyAllowListViolations(['docs/x.md', 'test/y.test.mjs'], S(['src/run.js'])),
    ['docs/x.md', 'test/y.test.mjs'],
    '无关文件全部违规'
  )
}

// ── ⑤ 混合：部分被清单覆盖、部分违规 ──
console.log('--- ⑤ 混合：glob 命中 + 字面命中 + 两个违规 ---')
{
  assertDeep(
    classifyAllowListViolations(
      ['src/a.js', 'src/b.ts', 'README.md', 'CHANGELOG.md'],
      S(['src/**/*.js', 'README.md'])
    ),
    ['src/b.ts', 'CHANGELOG.md'],
    'src/a.js(glob✓) README.md(字面✓) 放行；src/b.ts(扩展名不符) CHANGELOG.md(无) 违规'
  )
}

// ── ⑥ 边界：空变更 → 空违规 ──
console.log('--- ⑥ 边界 ---')
{
  assertDeep(classifyAllowListViolations([], S(['src'])), [], '空 changedFiles → []')
  // 注：空 allowSet 时调用方（applyWorktree）已用 hasAllowList=false 跳过校验；
  // 纯函数本身按字面返回全部违规，不在本契约覆盖范围，故不测空 Set。
}

// ── ⑦ resolveApplyAllowSet：design §6 清单 ∪ plan TaskCard allowed_paths（execute 复盘 c）──
// apply 原只认 design 清单，测试/产物文件 design §6 常漏列而 task allowed_paths 已含 → apply 误拦
//（assess 用 task allowed_paths 放行、apply 用 design 清单又拦，口径不一致）。union 后两源并集为准。
console.log('\n--- ⑦ resolveApplyAllowSet：design 清单 ∪ plan allowed_paths ---')
{
  const tmpDir = mkdtempSync(join(tmpdir(), 'apply-union-'))
  const cn = 'mychange'
  const changesDir = join(tmpDir, '.sillyspec', 'changes', cn)
  mkdirSync(join(changesDir, 'tasks'), { recursive: true })
  writeFileSync(join(changesDir, 'design.md'), '# Design\n\n## 6. 文件变更清单\n- src/app.js\n- src/util.js\n')
  writeFileSync(join(changesDir, 'tasks', 'task-01.md'), `---
id: task-01
allowed_paths:
  - src/app.js
  - test/app.test.mjs
  - dist/types.d.ts
---
`)
  const allowSet = resolveApplyAllowSet(tmpDir, cn)
  assertDeep([...allowSet].sort(), ['dist/types.d.ts', 'src/app.js', 'src/util.js', 'test/app.test.mjs'], '并集 = design 清单 ∪ task allowed_paths（含测试/产物）')
  const viol = classifyAllowListViolations(['src/app.js', 'src/util.js', 'test/app.test.mjs', 'dist/types.d.ts'], allowSet)
  assertDeep(viol, [], 'test/产物文件不再被判「不在清单」（原 apply 只认 design §6 会拦）')
  // 完全越界文件仍拦（union 不放开水面）
  const viol2 = classifyAllowListViolations(['src/run.js', 'test/app.test.mjs'], allowSet)
  assertDeep(viol2, ['src/run.js'], 'design 与 task 都未声明的越界文件仍违规')
  rmSync(tmpDir, { recursive: true, force: true })
}

// ── 结果 ──
console.log(`\n${'='.repeat(50)}`)
console.log(`✅ 通过: ${7 - failed}  ❌ 失败: ${failed}`)
if (failures.length > 0) { console.log('失败项:'); failures.forEach(f => console.log(`  - ${f}`)) }
console.log('='.repeat(50))
if (failed > 0) process.exit(1)
