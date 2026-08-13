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
import { printQuickAuditReview } from '../src/run/quick-audit.js'

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

// case 3b: --allow-delete 显式解锁删除 → 非 blocked（默认 fail-closed，flag 即知情 opt-in）
{
  const d = makeRepo()
  rmSync(join(d, 'README.md'))
  const r = await auditQuickCompletion(d, { ...baseGuard, allowDelete: true }, {})
  assert(r.status !== 'blocked', `allowDelete 放行删除 → 非 blocked（实际 ${r.status}）`)
  assert(r.deletedFiles.includes('README.md'), `deletedFiles 仍记录删除文件供追溯`)
  assert(!r.reasons.some(x => x.startsWith('删除')), `allowDelete 时不报删除原因`)
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

// case 6 (Q5): 改 src/run/ 子目录文件（W6 后的真正逻辑所在）→ blocked
// 旧 DANGEROUS_PATTERNS 只列 'src/run.js'，file==='src/run.js' 命中不到 'src/run/command.js'，
// 致危险门静默失效。目录前缀化后须重新捕获。
{
  const d = makeRepo()
  mkdirSync(join(d, 'src', 'run'), { recursive: true })
  writeFileSync(join(d, 'src', 'run', 'command.js'), 'export const x = 1\n')
  execSync('git add .', { cwd: d, stdio: 'pipe' })
  execSync('git commit -q -m add-run', { cwd: d, stdio: 'pipe' })
  writeFileSync(join(d, 'src', 'run', 'command.js'), 'export const x = 2\n') // 改 tracked 危险文件
  const r = await auditQuickCompletion(d, baseGuard, {})
  assert(r.status === 'blocked', `改 src/run/command.js → blocked（W6 子目录危险文件，实际 ${r.status}）`)
  assert(r.reasons.some(rr => rr.includes('危险')), `reasons 含「危险文件变更: src/run/command.js」`)
}

// case 7 (Q5): 改 src/progress/ 子目录文件 → blocked
{
  const d = makeRepo()
  mkdirSync(join(d, 'src', 'progress'), { recursive: true })
  writeFileSync(join(d, 'src', 'progress', 'stage-machine.js'), 'export const x = 1\n')
  execSync('git add .', { cwd: d, stdio: 'pipe' })
  execSync('git commit -q -m add-progress', { cwd: d, stdio: 'pipe' })
  writeFileSync(join(d, 'src', 'progress', 'stage-machine.js'), 'export const x = 2\n')
  const r = await auditQuickCompletion(d, baseGuard, {})
  assert(r.status === 'blocked', `改 src/progress/stage-machine.js → blocked（实际 ${r.status}）`)
}

// case 8 (Q5): 同前缀但非 src/run/ 目录的文件（src/runtime-helpers.js）→ 不被误判危险
// 验证尾斜杠边界：'src/run/' 不会 startsWith 命中 'src/runtime-helpers.js'。
{
  const d = makeRepo()
  mkdirSync(join(d, 'src'), { recursive: true })
  writeFileSync(join(d, 'src', 'runtime-helpers.js'), 'export const x = 1\n')
  execSync('git add .', { cwd: d, stdio: 'pipe' })
  execSync('git commit -q -m add-runtime', { cwd: d, stdio: 'pipe' })
  writeFileSync(join(d, 'src', 'runtime-helpers.js'), 'export const x = 2\n')
  const r = await auditQuickCompletion(d, baseGuard, {})
  assert(r.status === 'safe', `改 src/runtime-helpers.js → safe（非危险，尾斜杠边界，实际 ${r.status}）`)
  assert(!r.reasons.some(rr => rr.includes('危险')), `src/runtime-helpers.js 不进 dangerous reasons`)
}

// case 9 (Q3): 非 git 目录上跑审计 → blocked（fail-loud，不再静默降级 warning）
// 旧实现裸 execSync 抛错被 catch 吞成 warning；safeGit 改造后读不到 git 状态须保守阻断。
{
  const nonGit = mkdtempSync(join(tmpdir(), 'qa-nongit-'))
  tmpRoots.push(nonGit)
  const r = await auditQuickCompletion(nonGit, baseGuard, {})
  assert(r.status === 'blocked', `非 git 目录审计 → blocked（fail-loud，实际 ${r.status}）`)
  assert(r.reasons.some(rr => rr.includes('审计失败')), `reasons 含「审计失败」（实际 ${JSON.stringify(r.reasons)}）`)
}

// case 10: 删除文件 + --confirm → 提示指向 --allow-delete（显式 opt-in），不再甩 --force-baseline --allow-new 误导
// 修 auditQuickCompletion 的 --confirm 提示块：deletedFiles>0 时单独提示 --allow-delete（默认 fail-closed）。
{
  const d = makeRepo()
  rmSync(join(d, 'README.md'))
  const logs = []
  const origLog = console.log
  console.log = (...args) => logs.push(args.join(' '))
  try {
    await auditQuickCompletion(d, baseGuard, { isConfirm: true })
  } finally {
    console.log = origLog
  }
  const out = logs.join('\n')
  assert(out.includes('--allow-delete'), `删除 + --confirm 提示含「--allow-delete」`)
  assert(!out.includes('--force-baseline --allow-new'), `删除 + --confirm 不再甩无效 flag 组合`)
}

// case 11: printQuickAuditReview 删除 blocked → 提示 --allow-delete，不甩 flag 误导
{
  const errs = []
  const origErr = console.error
  console.error = (...args) => errs.push(args.join(' '))
  try {
    printQuickAuditReview({ status: 'blocked', reasons: ['删除文件: README.md'], deletedFiles: ['README.md'], changedFiles: ['README.md'], newFiles: [], baselineHit: [], stagedTotal: 1 })
  } finally {
    console.error = origErr
  }
  const out = errs.join('\n')
  assert(out.includes('--allow-delete'), `printQuickAuditReview 删除 blocked 提示「--allow-delete」`)
  assert(!out.includes('--force-baseline --allow-new'), `printQuickAuditReview 删除 blocked 不甩无效 flag`)
}

// case 12 (回归): printQuickAuditReview 非删除 blocked（危险文件）→ 仍保留 flag 建议
{
  const errs = []
  const origErr = console.error
  console.error = (...args) => errs.push(args.join(' '))
  try {
    printQuickAuditReview({ status: 'blocked', reasons: ['危险文件变更: package.json'], deletedFiles: [], changedFiles: ['package.json'], newFiles: [], baselineHit: [], stagedTotal: 1 })
  } finally {
    console.error = origErr
  }
  const out = errs.join('\n')
  assert(out.includes('--force-baseline --allow-new'), `非删除 blocked 仍保留 flag 建议（回归保护）`)
}

for (const d of tmpRoots) { try { rmSync(d, { recursive: true, force: true }) } catch {} }
console.log(`\n${'='.repeat(50)}`)
console.log(`✅ 通过: ${total - failed}  ❌ 失败: ${failed}`)
console.log(`${'='.repeat(50)}`)
if (failed > 0) process.exit(1)
