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
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'fs'
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

// ── D-8 文档欠账显性化：改源码没动文档 → docSyncHint 打标记（advisory 不改 status）──
console.log('\n--- D-8 文档欠账标记 ---')

// case D-8a: 修改 tracked 源码、无文档改动 → docSyncHint 标记 + reasons 记欠账 + status 不变
{
  const d = makeRepo()
  writeFileSync(join(d, 'src-index.js'), 'export const x = 2\n') // 已 commit 的 tracked 文件 → modified 非 new
  const r = await auditQuickCompletion(d, { ...baseGuard }, {})
  assert(r.docSyncHint && r.docSyncHint.touchedSource === 1 && r.docSyncHint.docFiles.length === 0,
    `改源码无文档 → docSyncHint 标记（实际 ${JSON.stringify(r.docSyncHint)}）`)
  assert(r.reasons.some(x => x.includes('未同步模块文档')), `reasons 记录欠账标记`)
  assert(r.status !== 'blocked', `D-8 标记不阻断（status=${r.status}）`)
}

// case D-8e（O-1 docs-signals-o12）: specBase/projectName 透传 + map 命中 → modules 含归属
{
  const d = makeRepo()
  // map: runtime 模块登记 src-index.js
  mkdirSync(join(d, '.sillyspec', 'docs', 'demo', 'modules'), { recursive: true })
  writeFileSync(join(d, '.sillyspec', 'docs', 'demo', 'modules', '_module-map.yaml'),
    'modules:\n  runtime:\n    status: active\n    doc: modules/runtime.md\n    paths:\n      - src-index.js\n')
  writeFileSync(join(d, '.sillyspec', 'docs', 'demo', 'modules', 'runtime.md'), 'card\n')
  writeFileSync(join(d, 'src-index.js'), 'export const x = 3\n')
  const r = await auditQuickCompletion(d, { ...baseGuard, specBase: join(d, '.sillyspec'), projectName: 'demo' }, {})
  assert(r.docSyncHint && Array.isArray(r.docSyncHint.modules) && r.docSyncHint.modules.some(m => m.id === 'runtime'),
    `O-1 modules 归属（实际 ${JSON.stringify(r.docSyncHint?.modules)}）`)
}

// case D-8f（FR-002）: map 缺失 / specBase 不传 → modules 空数组降级（现文案不变零回归）
{
  const d = makeRepo()
  writeFileSync(join(d, 'src-index.js'), 'export const x = 4\n')
  const r1 = await auditQuickCompletion(d, { ...baseGuard }, {}) // 不传 specBase
  assert(r1.docSyncHint && (!r1.docSyncHint.modules || r1.docSyncHint.modules.length === 0),
    `不传 specBase → modules 降级空（实际 ${JSON.stringify(r1.docSyncHint?.modules)}）`)
  const r2 = await auditQuickCompletion(d, { ...baseGuard, specBase: join(d, '.sillyspec'), projectName: 'demo' }, {}) // 无 map 文件
  assert(r2.docSyncHint && (!r2.docSyncHint.modules || r2.docSyncHint.modules.length === 0),
    `map 缺失 → modules 降级空（实际 ${JSON.stringify(r2.docSyncHint?.modules)}）`)
  assert(r2.reasons.some(x => x.includes('未同步模块文档')), `降级不丢基础欠账 reason`)
}

// case D-8g（O-1 渲染）: printQuickAuditReview 输出"涉及模块"行
{
  const origWarn = console.warn
  const warns = []
  console.warn = (...a) => { warns.push(a.join(' ')) }
  try {
    printQuickAuditReview({ status: 'safe', changedFiles: ['src-index.js'], newFiles: [], reasons: [], docSyncHint: { touchedSource: 1, docFiles: [], modules: [{ id: 'runtime', doc: 'modules/runtime.md' }] } })
  } finally { console.warn = origWarn }
  assert(warns.some(w => w.includes('涉及模块：runtime')), `O-1 渲染含模块行（实际 ${JSON.stringify(warns)}）`)
}

// case D-8b: 源码 + 文档都改 → docSyncHint 记录但无欠账 reason
{
  const d = makeRepo()
  mkdirSync(join(d, 'docs'), { recursive: true }) // 根 docs/（fixture gitignore 只忽略 .sillyspec/）
  writeFileSync(join(d, 'docs', 'x.md'), '---\nauthor: t\ncreated_at: 2026-08-15 00:00:00\n---\n# x\n')
  writeFileSync(join(d, 'src-index.js'), 'export const x = 2\n')
  const r = await auditQuickCompletion(d, { ...baseGuard }, {})
  assert(r.docSyncHint && r.docSyncHint.touchedSource === 1 && r.docSyncHint.docFiles.length === 1,
    `源码+文档 → docSyncHint 记录两向（实际 ${JSON.stringify(r.docSyncHint)}）`)
  assert(!r.reasons.some(x => x.includes('未同步模块文档')), `已同步文档不打欠账 reason`)
}

// case D-8c: 纯文档改动（无源码）→ 无 docSyncHint（不误报）
{
  const d = makeRepo()
  writeFileSync(join(d, 'README.md'), 'updated\n')
  const r = await auditQuickCompletion(d, baseGuard, {})
  assert(!r.docSyncHint, `纯文档改动无 docSyncHint（实际 ${JSON.stringify(r.docSyncHint)}）`)
}

// case D-8d: printQuickAuditReview 打印欠账标记（SAFE 分支也打）
{
  const d = makeRepo()
  writeFileSync(join(d, 'src-index.js'), 'x\n')
  const r = await auditQuickCompletion(d, { ...baseGuard }, {})
  const origWarn = console.warn, origErr = console.error
  const warns = []
  console.warn = (...a) => { warns.push(a.join(' ')) }
  console.error = (...a) => { warns.push(a.join(' ')) } // blocked 分支走 error，一并抓
  try { printQuickAuditReview(r) } finally { console.warn = origWarn; console.error = origErr }
  assert(warns.some(w => w.includes('文档欠账标记')), `打印欠账标记 warn（实际 ${JSON.stringify(warns)}）`)
}

// ── docs check advisory：本次改动的 .md 含失效 file:line 引用 → docsCheckHint + warning ──
console.log('\n--- docs check advisory ---')

// case DC-1: 改动的文档引用失效（文件不存在）→ docsCheckHint + reasons + warning
{
  const d = makeRepo()
  writeFileSync(join(d, 'README.md'), '见 `src/ghost.js:1`（不存在文件）\n')
  const r = await auditQuickCompletion(d, baseGuard, {})
  assert(r.docsCheckHint && r.docsCheckHint.invalid === 1,
    `失效引用 → docsCheckHint（实际 ${JSON.stringify(r.docsCheckHint)}）`)
  assert(r.reasons.some(x => x.includes('失效 file:line 引用')), `reasons 记录引用失效`)
  assert(r.status === 'warning', `引用失效升 warning 不阻断（实际 ${r.status}）`)
}

// case DC-2: 改动的文档引用全合法 → 无 docsCheckHint、status 不受影响
{
  const d = makeRepo()
  mkdirSync(join(d, 'src'), { recursive: true })
  writeFileSync(join(d, 'src', 'index.js'), 'export const alpha = 1\n')
  writeFileSync(join(d, 'README.md'), '见 `index.js:1`（`alpha` 定义，裸名在 src/ 递归解析）\n')
  const r = await auditQuickCompletion(d, baseGuard, {})
  assert(!r.docsCheckHint, `合法引用无 docsCheckHint（实际 ${JSON.stringify(r.docsCheckHint)}）`)
  assert(!r.reasons.some(x => x.includes('file:line')), `无引用失效 reason`)
}

// case DC-3: 纯源码改动（无 .md）→ 不触发 docs check（DC 与 D-8 独立）
{
  const d = makeRepo()
  writeFileSync(join(d, 'src-index.js'), 'export const x = 2\n')
  const r = await auditQuickCompletion(d, baseGuard, {})
  assert(!r.docsCheckHint, `无文档改动不跑 docs check（实际 ${JSON.stringify(r.docsCheckHint)}）`)
}

// case DC-4: printQuickAuditReview 打印引用失效提示（含引用格式引导行）
{
  const d = makeRepo()
  writeFileSync(join(d, 'README.md'), '见 `src/ghost.js:1`\n')
  const r = await auditQuickCompletion(d, baseGuard, {})
  const origWarn = console.warn, origErr = console.error
  const warns = []
  console.warn = (...a) => { warns.push(a.join(' ')) }
  console.error = (...a) => { warns.push(a.join(' ')) }
  try { printQuickAuditReview(r) } finally { console.warn = origWarn; console.error = origErr }
  assert(warns.some(w => w.includes('文档引用失效')), `打印引用失效 warn（实际 ${JSON.stringify(warns)}）`)
  assert(warns.some(w => w.includes('引用格式')), `打印引用格式引导行（实际 ${JSON.stringify(warns)}）`)
}

// case DC-5（troubleshooting #9）: 删除的 .md 不进 docsCheckHint（无「文档不存在」假失效）
//   并行会话删除并暂存的 .md 曾被算进本会话 mdChanged → 文件不在盘 → 假失效 + 危险/删除三重拦截。
//   删除语义归 --allow-delete，mdChanged 必须滤掉 deleted 状态。
{
  const d = makeRepo()
  // README.md 是 makeRepo 提交过的 tracked 文件，删它模拟他人删除（本会话 guard 不含它）
  rmSync(join(d, 'README.md'))
  const r = await auditQuickCompletion(d, baseGuard, {})
  assert(r.deletedFiles.includes('README.md'), `删除仍被 deletedFiles 拦（fail-closed 不变）`)
  assert(r.status === 'blocked', `删除默认 blocked（--allow-delete 语义不变，实际 ${r.status}）`)
  assert(!r.docsCheckHint, `删除的 .md 不产生 docsCheckHint 假失效（实际 ${JSON.stringify(r.docsCheckHint)}）`)
  assert(!r.reasons.some(x => x.includes('失效 file:line')), `reasons 无假失效条目（实际 ${JSON.stringify(r.reasons)}）`)
}

// ── 归属切分（2026-08-18 误归属修复）：声明即归属，窗口内他者文件不进 attributedFiles ──
console.log('\n--- 归属切分（attributedFiles / undeclaredFiles）---')

// case AT-1: 声明会话窗口含他者文件 → attributed 只含声明命中，undeclared 记他者（QUICKLOG 文件行数据源）
// ql-20260818-003 实证形态：并行会话在 quick 窗口内改的文件被算进本会话 changedFiles 污染文件行。
{
  const d = makeRepo()
  writeFileSync(join(d, 'mine.js'), 'v1\n')
  writeFileSync(join(d, 'foreign.js'), 'v1\n')
  execSync('git add .', { cwd: d, stdio: 'pipe' })
  execSync('git commit -q -m base', { cwd: d, stdio: 'pipe' })
  writeFileSync(join(d, 'mine.js'), 'v2\n')    // 本会话改（已声明）
  writeFileSync(join(d, 'foreign.js'), 'v2\n') // 模拟并行会话窗口内改（未声明）
  const r = await auditQuickCompletion(d, { ...baseGuard, allowedFiles: ['mine.js'] }, {})
  assert(r.attributedFiles.includes('mine.js'), `attributedFiles 含声明文件（实际 ${JSON.stringify(r.attributedFiles)}）`)
  assert(!r.attributedFiles.includes('foreign.js'), `他者文件不进 attributedFiles（实际 ${JSON.stringify(r.attributedFiles)}）`)
  assert(r.undeclaredFiles.includes('foreign.js'), `undeclaredFiles 记他者文件（实际 ${JSON.stringify(r.undeclaredFiles)}）`)
  assert(r.reasons.some(x => x.startsWith('超出')), `超出声明 warning 口径保留（不变）`)
}

// case AT-2: 未声明会话（allowedFiles 空）→ attributed = changedFiles 全量、undeclared 空（口径不回归）
{
  const d = makeRepo()
  writeFileSync(join(d, 'README.md'), 'updated\n')
  const r = await auditQuickCompletion(d, baseGuard, {})
  assert(r.attributedFiles.includes('README.md'), `未声明会话 attributed = changed 全量（实际 ${JSON.stringify(r.attributedFiles)}）`)
  assert(r.undeclaredFiles.length === 0, `未声明会话 undeclared 空（实际 ${JSON.stringify(r.undeclaredFiles)}）`)
}

// case AT-3: 声明文件在 baseline（他者先改过）且本会话又改（hash 变化）→ 经同文件并发并入 attributed
// 该形态文件被 isBaselineFile 跳过不进 changedFiles，但确属本会话产物，须靠 allowedFilesHash 差异捕获。
{
  const d = makeRepo()
  writeFileSync(join(d, 'shared.js'), 'v1\n')
  execSync('git add .', { cwd: d, stdio: 'pipe' })
  execSync('git commit -q -m base', { cwd: d, stdio: 'pipe' })
  writeFileSync(join(d, 'shared.js'), 'v1-his\n') // 他者先改（= step1 baseline 脏）
  const { createHash } = await import('node:crypto')
  const hash = createHash('sha256').update(readFileSync(join(d, 'shared.js'))).digest('hex')
  writeFileSync(join(d, 'shared.js'), 'v1-his-mine\n') // 本会话再改（hash ≠ 启动时）
  const r = await auditQuickCompletion(d, {
    ...baseGuard,
    baselineFiles: ['shared.js'],
    allowedFiles: ['shared.js'],
    allowedFilesHash: { 'shared.js': hash },
  }, {})
  assert(r.attributedFiles.includes('shared.js'), `baseline 声明文件 hash 变化并入 attributed（实际 ${JSON.stringify(r.attributedFiles)}）`)
  assert(r.reasons.some(x => x.includes('同文件并发')), `同文件并发 warn 口径保留（不变）`)
}

for (const d of tmpRoots) { try { rmSync(d, { recursive: true, force: true }) } catch {} }
console.log(`\n${'='.repeat(50)}`)
console.log(`✅ 通过: ${total - failed}  ❌ 失败: ${failed}`)
console.log(`${'='.repeat(50)}`)
if (failed > 0) process.exit(1)
