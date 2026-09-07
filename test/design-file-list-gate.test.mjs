/**
 * design.md 文件清单行级核验测试（change: 2026-09-07-ir-hardening，FR-02，D-004@v1）。
 *
 * 锁住：
 *  1. 幻觉路径 ERROR（design_file_ref_invalid）；NEW: 前缀豁免
 *  2. glob 字符（* / ?）warning 跳过；<...> 占位段剥除后核验
 *  3. 清单缺失 → WARNING 不阻断；解析异常 fail-soft
 *  4. CLI 级：brainstorm 末步 --done 对幻觉清单 exit 1 阻断（修复后放行）
 */
import { writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
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

cleanup()
report(count.passed, count.failed, count.failures)
