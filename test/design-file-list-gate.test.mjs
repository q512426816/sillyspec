/**
 * design.md 文件清单行级核验测试（change: 2026-09-07-ir-hardening，FR-02，D-004@v1）。
 *
 * 锁住：
 *  1. 幻觉路径 ERROR（design_file_ref_invalid）；NEW: 前缀豁免
 *  2. glob 字符（* / ?）warning 跳过；<...> 占位段剥除后核验
 *  3. 清单缺失 → WARNING 不阻断；解析异常 fail-soft
 *  4. CLI 级：brainstorm 末步 --done 对幻觉清单 exit 1 阻断（修复后放行）
 */
import { writeFileSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { makeRepo, initChange, runCLI, runStage, cleanup, report } from './_cli-step-harness.mjs'
import { ProgressManager } from '../src/progress.js'
import { validateDesignFileList } from '../src/design-facts.js'

const count = { passed: 0, failed: 0, failures: [] }
const assert = (cond, msg) => { cond ? (count.passed++, console.log(`  ✅ PASS: ${msg}`)) : (count.failed++, count.failures.push(msg), console.log(`  ❌ FAIL: ${msg}`)) }

const FM = '---\nauthor: t\ncreated_at: 2026-09-07T00:00:00\nscale: large\n---\n\n# Design\n'
const list = (rows) => FM + '\n## 文件变更清单\n\n| 操作 | 文件路径 | 说明 |\n|---|---|---|\n' + rows.map(r => `| ${r[0]} | ${r[1]} | x |`).join('\n') + '\n'

console.log('=== design 清单行级核验（validateDesignFileList + brainstorm gate）===\n')

console.log('--- ① 分级核验单元 ---')
{
  const { cwd, specBase } = makeRepo('dfl-u-')
  const cn = '2026-09-08-dfl-x'
  const changeDir = join(specBase, 'changes', cn)
  mkdirSync(changeDir, { recursive: true })

  // 幻觉 + NEW: + glob + 占位 混合
  writeFileSync(join(changeDir, 'design.md'), list([
    ['修改', 'README.md'],
    ['修改', 'src/nope-ghost.js'],        // 幻觉
    ['新增', 'NEW:src/new-thing.js'],      // NEW: 豁免
    ['修改', 'docs/**/*.md'],              // glob 跳过
    ['修改', 'docs/<project>/scan/x.md'],  // 占位剥除后 docs/scan/x.md —— 仍不存在 → 幻觉？占位段剥除后为 docs/scan/x.md 不存在 → ERROR
  ]))
  const r = validateDesignFileList({ changeDir, cwd })
  const ghostPaths = r.errors.map(e => e.path)
  assert(r.ok === false, '含幻觉 → ok=false')
  assert(ghostPaths.includes('src/nope-ghost.js'), '幻觉路径进 errors')
  assert(!ghostPaths.some(p => p.startsWith('NEW:')), 'NEW: 前缀豁免')
  assert(r.warnings.some(w => w.includes('glob') && w.includes('docs/**/*.md')), 'glob 条目 warning 跳过')
  assert(r.errors.every(e => e.message.includes('design_file_ref_invalid')), 'errors 消息含信封 code')
  assert(r.errors.every(e => e.message.includes('NEW:')), 'errors 消息含 NEW: 出路指引')

  // 全合法 → ok
  writeFileSync(join(changeDir, 'design.md'), list([['修改', 'README.md'], ['新增', 'NEW:src/brand.js']]))
  const r2 = validateDesignFileList({ changeDir, cwd })
  assert(r2.ok === true && r2.errors.length === 0, '全合法 → ok')

  // 占位段剥除后存在（docs/<project>/... 实际命中 docs/proj/...）→ 通过：构造真实路径
  // 占位段剥除语义：docs/<project>/scan/y.md → docs/scan/y.md（<...> 段整体移除后判存在）
  mkdirSync(join(cwd, 'docs', 'scan'), { recursive: true })
  writeFileSync(join(cwd, 'docs', 'scan', 'y.md'), 'x')
  writeFileSync(join(changeDir, 'design.md'), list([['修改', 'docs/<project>/scan/y.md']]))
  const r3 = validateDesignFileList({ changeDir, cwd })
  assert(r3.ok === true, '占位段剥除后存在 → 通过')

  // 无清单段 → warning 不阻断
  writeFileSync(join(changeDir, 'design.md'), FM + '\n## 总体方案\n无清单。\n')
  const r4 = validateDesignFileList({ changeDir, cwd })
  assert(r4.ok === true && r4.warnings.some(w => w.includes('无文件变更清单段')), '清单缺失 → WARNING 放行')
}

console.log('\n--- ② CLI 级：brainstorm 末步幻觉清单阻断 ---')
{
  const { cwd, specBase } = makeRepo('dfl-cli-')
  const cn = '2026-09-08-dfl-cli'
  const pm = await initChange(cwd, specBase, cn)
  const changeDir = join(specBase, 'changes', cn)
  // 四件套最小可用（过 brainstorm 末步既有 gate：产物校验 + 决策模块域——用 small 免四件套？scale 分叉在 frontmatter）
  writeFileSync(join(changeDir, 'design.md'), '---\nauthor: t\ncreated_at: 2026-09-07T00:00:00\nscale: small\n---\n\n# Design\n\n## 文件变更清单\n\n| 操作 | 文件路径 | 说明 |\n|---|---|---|\n| 修改 | src/ghost-path.js | 幽灵 |\n')
  // 推进到末步：首跑建 schema → seed 前 7 步 completed 末步 pending
  runStage('brainstorm', cn, cwd)
  const p1 = await pm.read(cwd, cn)
  const seeded = p1.stages.brainstorm.steps.map(s => ({ name: s.name, status: s.name === '生成规范文件' ? 'pending' : 'completed' }))
  await (async () => { const pr = await pm.read(cwd, cn); pr.currentChange = cn; pr.currentStage = 'brainstorm'; pr.stages.brainstorm = { status: 'in-progress', startedAt: '2026/9/8 00:00:00', completedAt: null, steps: seeded }; await pm._write(cwd, pr, cn) })()

  const r = runStage('brainstorm', cn, cwd, { done: true, output: '收尾' })
  assert(r.status !== 0, `幻觉清单 → exit 非 0（实际 ${r.status}）`)
  assert(r.combined.includes('design_file_ref_invalid'), '阻断文案含信封 code')

  // 修复清单（NEW: 前缀）→ 放行
  writeFileSync(join(changeDir, 'design.md'), '---\nauthor: t\ncreated_at: 2026-09-07T00:00:00\nscale: small\n---\n\n# Design\n\n## 文件变更清单\n\n| 操作 | 文件路径 | 说明 |\n|---|---|---|\n| 新增 | NEW:src/ghost-path.js | 修复为新建 |\n')
  const r2 = runStage('brainstorm', cn, cwd, { done: true, output: '修复后收尾' })
  assert(r2.status === 0 || !r2.combined.includes('design_file_ref_invalid'), `NEW: 修复后不再被清单核验拦（exit ${r2.status}；输出尾：${r2.combined.slice(-120)}）`)
}

console.log('\n--- ③ gate 预检前移：幻觉清单在 gate brainstorm 即红（坑 design-file-ref-late-feedback，2026-09-15 wp EHS 41 条实证）---')
{
  const { cwd, specBase } = makeRepo('dfl-gate-')
  const cn = '2026-09-08-dfl-gate'
  const pm = await initChange(cwd, specBase, cn)
  const changeDir = join(specBase, 'changes', cn)
  writeFileSync(join(changeDir, 'design.md'), '---\nauthor: t\ncreated_at: 2026-09-07T00:00:00\nscale: small\n---\n\n# Design\n\n## 文件变更清单\n\n| 操作 | 文件路径 | 说明 |\n|---|---|---|\n| 修改 | src/ghost-gate.js | 幽灵 |\n')
  // 推进到末步（同 ② 的 seeding 手法）
  runStage('brainstorm', cn, cwd)
  const pr = await pm.read(cwd, cn)
  const seeded = pr.stages.brainstorm.steps.map(s => ({ name: s.name, status: s.name === '生成规范文件' ? 'pending' : 'completed' }))
  await (async () => { const p = await pm.read(cwd, cn); p.currentChange = cn; p.currentStage = 'brainstorm'; p.stages.brainstorm = { status: 'in-progress', startedAt: '2026/9/8 00:00:00', completedAt: null, steps: seeded }; await pm._write(cwd, p, cn) })()

  const g1 = runCLI(['gate', 'brainstorm', '--change', cn], { cwd })
  assert(g1.combined.includes('design-file-list'), 'gate 输出含 design-file-list check（前移生效）')
  assert(g1.combined.includes('design_file_ref_invalid'), 'gate 预检即报幻觉路径（不必等 --done 末步）')

  // NEW: 修复 → 该 check 转绿（信号消失；整体 exit 可因其他 artifacts 未备而被其他 check 占用，只断言本 check 面）
  writeFileSync(join(changeDir, 'design.md'), '---\nauthor: t\ncreated_at: 2026-09-07T00:00:00\nscale: small\n---\n\n# Design\n\n## 文件变更清单\n\n| 操作 | 文件路径 | 说明 |\n|---|---|---|\n| 新增 | NEW:src/ghost-gate.js | 修复为新建 |\n')
  const g2 = runCLI(['gate', 'brainstorm', '--change', cn], { cwd })
  assert(!g2.combined.includes('design_file_ref_invalid'), `NEW: 修复后 gate 清单信号消失（输出尾：${g2.combined.slice(-120)}）`)
}

console.log('\n--- ④ 跨仓分段核验（坑 design-file-ref-cross-repo-blind，2026-09-15 wp 会话 41 条误报回归）---')
{
  const { cwd, specBase } = makeRepo('dfl-xr-')
  const cn = '2026-09-08-dfl-xrepo'
  const changeDir = join(specBase, 'changes', cn)
  mkdirSync(changeDir, { recursive: true })
  // 跨仓 fixture：独立仓根 + 真实既有文件（模拟 sub-grid-security 的 src/common/router.js）
  const crossRoot = mkdtempSync(join(tmpdir(), 'dfl-cross-'))
  mkdirSync(join(crossRoot, 'src', 'common'), { recursive: true })
  writeFileSync(join(crossRoot, 'src', 'common', 'router.js'), 'x')
  // 注册跨仓（validateDesignFileList 读侧口径 = <cwd>/.sillyspec/local.yaml repos:）
  mkdirSync(join(cwd, '.sillyspec'), { recursive: true })
  writeFileSync(join(cwd, '.sillyspec', 'local.yaml'), `repos:\n  sub-grid-security: ${crossRoot.split('\\').join('/')}\n`)

  const tbl = rows => '| 操作 | 文件路径 | 说明 |\n|---|---|---|\n' + rows.map(r => `| ${r[0]} | ${r[1]} | x |`).join('\n') + '\n'
  writeFileSync(join(changeDir, 'design.md'),
    FM + '\n## 文件变更清单\n\n' + tbl([['修改', 'README.md'], ['新增', 'NEW:src/new.js']])
    + '\n## sub-grid-security 仓变更\n\n' + tbl([['修改', 'src/common/router.js'], ['修改', 'src/ghost.js']]))
  const r = validateDesignFileList({ changeDir, cwd })
  assert(r.ok === false, '跨仓段内幻觉路径仍报错')
  assert(r.errors.length === 1 && r.errors[0].path === 'src/ghost.js', `仅跨仓幻觉报错（实际：${r.errors.map(e => e.path).join(',')}）`)
  assert(r.errors[0].message.includes('sub-grid-security 仓'), '错误信息指明核验根为该跨仓仓')
  assert(!r.errors.some(e => e.path === 'src/common/router.js'), '关键回归：跨仓「修改」既有文件不再被误报逼标 NEW:')

  // 未注册 repo 段 → warning 跳过（指引 register-repo），不误报
  writeFileSync(join(changeDir, 'design.md'),
    FM + '\n## 文件变更清单\n\n' + tbl([['修改', 'README.md']])
    + '\n## unregistered-repo 仓变更\n\n' + tbl([['修改', 'src/whatever.js']]))
  const r2 = validateDesignFileList({ changeDir, cwd })
  assert(r2.ok === true, '未注册段跳过核验不误报')
  assert(r2.warnings.some(w => w.includes('unregistered-repo') && w.includes('register-repo')), 'warning 指引 register-repo')

  try { rmSync(crossRoot, { recursive: true, force: true }) } catch { /* Windows EPERM best-effort */ }
}

cleanup()
report(count.passed, count.failed, count.failures)
