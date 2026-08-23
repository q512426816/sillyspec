/**
 * 坑 foreign-session-declared-false-block 回归：他者 active quick 会话已声明文件的审计豁免
 *
 * 背景：多 agent 并发时，并行 quick 会话在**本会话启动后**改的文件不在本会话 baseline →
 * auditQuickCompletion 把它算进本会话窗口 → 命中危险清单（src/run/、package.json 等）或
 * .sillyspec/ 判定 → blocked，只能 --force-baseline 无差别逃生（2026-08-23 实证：并行会话的
 * daemon/router.py 被判本 quick 的危险变更直接 BLOCK）。
 *
 * 豁免口径（声明即归属的他向版本）：
 *   - 只信他者**显式声明**（guard.allowedFiles，--files 传入）；他者 baselineFiles 是快照非所有权，不作豁免依据
 *   - 命中 → 完全退栈（危险/删除/新增/越界/baseline 全部门跳过）归该会话审计 + 软警告可见放行
 *   - 本会话重叠声明（--files 同文件）不豁免——同文件并发归本会话审计
 *   - 未被他者声明的文件照旧拦截（fail-closed 不放大豁免面）
 */
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { execSync } from 'node:child_process'
import { auditQuickCompletion, collectOtherQuickSessionDeclarations } from '../src/run/shared.js'
import { printQuickAuditReview } from '../src/run/quick-audit.js'
import { makeRepo, initChange, seedStage, runStage, cleanup, report } from './_cli-step-harness.mjs'

let failed = 0, total = 0
function assert(cond, msg) {
  total++
  if (!cond) { failed++; console.log(`  ❌ FAIL: ${msg}`) }
  else console.log(`  ✅ PASS: ${msg}`)
}

const tmpRoots = []
function makeUnitRepo({ ignoreSillyspec = true } = {}) {
  const d = mkdtempSync(join(tmpdir(), 'qfd-'))
  tmpRoots.push(d)
  execSync('git init -q', { cwd: d, stdio: 'pipe' })
  execSync('git config user.email t@t.com', { cwd: d, stdio: 'pipe' })
  execSync('git config user.name t', { cwd: d, stdio: 'pipe' })
  mkdirSync(join(d, '.sillyspec', 'quicklog'), { recursive: true })
  writeFileSync(join(d, '.sillyspec', 'quicklog', 'test.md'), '# task\n')
  writeFileSync(join(d, '.gitignore'), ignoreSillyspec ? '.sillyspec/\n' : 'node_modules/\n')
  writeFileSync(join(d, 'package.json'), '{}\n')
  writeFileSync(join(d, 'README.md'), 'init\n')
  execSync('git add .', { cwd: d, stdio: 'pipe' })
  execSync('git commit -q -m init', { cwd: d, stdio: 'pipe' })
  return d
}

const baseGuard = { baselineFiles: [], allowedFiles: [], allowNew: false, forceBaseline: false, linkedChanges: [] }
const FOREIGN = [{ sessionId: 'quick-aaaa1111', files: ['src/run/foo.js'] }]

console.log('--- auditQuickCompletion：他者声明豁免判定 ---')

// A1: 他者声明的危险文件（src/run/foo.js modified）→ 退栈非 blocked，不进本会话归属
{
  const d = makeUnitRepo()
  mkdirSync(join(d, 'src', 'run'), { recursive: true })
  writeFileSync(join(d, 'src', 'run', 'foo.js'), 'export const x = 1\n')
  execSync('git add .', { cwd: d, stdio: 'pipe' })
  execSync('git commit -q -m add-run', { cwd: d, stdio: 'pipe' })
  writeFileSync(join(d, 'src', 'run', 'foo.js'), 'export const x = 2\n') // 模拟他者窗口内改
  const r = await auditQuickCompletion(d, { ...baseGuard, otherSessionsDeclared: FOREIGN }, {})
  assert(r.status !== 'blocked', `他者声明危险文件 → 非 blocked（实际 ${r.status}）`)
  assert(!r.changedFiles.includes('src/run/foo.js'), `退栈文件不进 changedFiles（实际 ${JSON.stringify(r.changedFiles)}）`)
  assert(!r.attributedFiles.includes('src/run/foo.js'), `退栈文件不进 attributedFiles`)
  assert(r.foreignSessionDeclared.some(x => x.file === 'src/run/foo.js' && x.sessions.includes('quick-aaaa1111')),
    `foreignSessionDeclared 记录归属会话（实际 ${JSON.stringify(r.foreignSessionDeclared)}）`)
}

// A1b: 对照——同一形态无他者声明 → 照旧 blocked（fail-closed 零回归）
{
  const d = makeUnitRepo()
  mkdirSync(join(d, 'src', 'run'), { recursive: true })
  writeFileSync(join(d, 'src', 'run', 'foo.js'), 'export const x = 1\n')
  execSync('git add .', { cwd: d, stdio: 'pipe' })
  execSync('git commit -q -m add-run', { cwd: d, stdio: 'pipe' })
  writeFileSync(join(d, 'src', 'run', 'foo.js'), 'export const x = 2\n')
  const r = await auditQuickCompletion(d, baseGuard, {})
  assert(r.status === 'blocked', `无他者声明的危险文件照旧 blocked（实际 ${r.status}）`)
  assert(r.foreignSessionDeclared.length === 0, `无豁免记录（实际 ${JSON.stringify(r.foreignSessionDeclared)}）`)
}

// A2: 全新 untracked 目录被 git 折叠成 `?? daemon/`，他者声明其成员文件 → 整目录退栈 safe
//     （对照：无豁免时折叠 token 进 newFiles → warning 需 --allow-new）
{
  const d = makeUnitRepo()
  mkdirSync(join(d, 'daemon'), { recursive: true })
  writeFileSync(join(d, 'daemon', 'router.py'), 'x = 1\n') // daemon/ 整体 untracked → porcelain 折叠
  const noExempt = await auditQuickCompletion(d, baseGuard, {})
  assert(noExempt.newFiles.includes('daemon/'), `对照：无豁免时折叠 token 进 newFiles（实际 ${JSON.stringify(noExempt.newFiles)}）`)
  assert(noExempt.status === 'warning', `对照：新增需 --allow-new → warning（实际 ${noExempt.status}）`)
  const exempt = await auditQuickCompletion(d, { ...baseGuard, otherSessionsDeclared: [{ sessionId: 'quick-bbbb2222', files: ['daemon/router.py'] }] }, {})
  assert(exempt.status === 'safe', `折叠目录被他者声明成员文件 → 整目录退栈 safe（实际 ${exempt.status}）`)
  assert(exempt.foreignSessionDeclared.some(x => x.file === 'daemon/'), `折叠 token 记入豁免（实际 ${JSON.stringify(exempt.foreignSessionDeclared)}）`)
}

// A3: 他者声明的删除 → 不再 blocked（删除归该会话 --allow-delete 管）
{
  const d = makeUnitRepo()
  rmSync(join(d, 'README.md'))
  const noExempt = await auditQuickCompletion(d, baseGuard, {})
  assert(noExempt.status === 'blocked', `对照：无豁免时删除 blocked（实际 ${noExempt.status}）`)
  const exempt = await auditQuickCompletion(d, { ...baseGuard, otherSessionsDeclared: [{ sessionId: 'quick-cccc3333', files: ['README.md'] }] }, {})
  assert(exempt.status !== 'blocked', `他者声明的删除 → 非 blocked（实际 ${exempt.status}）`)
  assert(!exempt.deletedFiles.includes('README.md'), `删除退栈不进 deletedFiles`)
}

// A4: 本会话也声明同一文件（--files 重叠）→ 不豁免（同文件并发归本会话审计）
{
  const d = makeUnitRepo()
  mkdirSync(join(d, 'src', 'run'), { recursive: true })
  writeFileSync(join(d, 'src', 'run', 'foo.js'), 'export const x = 1\n')
  execSync('git add .', { cwd: d, stdio: 'pipe' })
  execSync('git commit -q -m add-run', { cwd: d, stdio: 'pipe' })
  writeFileSync(join(d, 'src', 'run', 'foo.js'), 'export const x = 2\n')
  const r = await auditQuickCompletion(d, { ...baseGuard, allowedFiles: ['src/run/foo.js'], otherSessionsDeclared: FOREIGN }, {})
  assert(r.status === 'blocked', `重叠声明不豁免，危险门照旧 blocked（实际 ${r.status}）`)
  assert(r.changedFiles.includes('src/run/foo.js'), `重叠声明文件留在 changedFiles（归本会话审计）`)
}

// A5: 折叠目录 token（?? daemon/）+ 本会话声明同目录成员 → 不退栈（目录内混双方文件，fail-closed）
{
  const d = makeUnitRepo()
  mkdirSync(join(d, 'daemon'), { recursive: true })
  writeFileSync(join(d, 'daemon', 'router.py'), 'x = 1\n') // daemon/ 折叠 untracked
  const r = await auditQuickCompletion(d, {
    ...baseGuard,
    allowedFiles: ['daemon/mine.js'],
    otherSessionsDeclared: [{ sessionId: 'quick-dddd4444', files: ['daemon/router.py'] }],
  }, {})
  assert(r.foreignSessionDeclared.length === 0, `同目录有本会话声明 → 折叠 token 不退栈（实际 ${JSON.stringify(r.foreignSessionDeclared)}）`)
  assert(r.changedFiles.includes('daemon/'), `折叠 token 留在 changedFiles 走各门判定（实际 ${JSON.stringify(r.changedFiles)}）`)
}

// A6: .sillyspec/ 下非元数据文件被他者声明 → 危险门豁免（.sillyspec/ 被 git 跟踪的仓库形态）
{
  const d = makeUnitRepo({ ignoreSillyspec: false })
  writeFileSync(join(d, '.sillyspec', 'settings.yaml'), 'a: 1\n')
  execSync('git add .', { cwd: d, stdio: 'pipe' })
  execSync('git commit -q -m add-settings', { cwd: d, stdio: 'pipe' })
  writeFileSync(join(d, '.sillyspec', 'settings.yaml'), 'a: 2\n')
  const noExempt = await auditQuickCompletion(d, baseGuard, {})
  assert(noExempt.status === 'blocked', `对照：无豁免时 .sillyspec/ 非元数据 blocked（实际 ${noExempt.status}）`)
  const exempt = await auditQuickCompletion(d, { ...baseGuard, otherSessionsDeclared: [{ sessionId: 'quick-eeee5555', files: ['.sillyspec/settings.yaml'] }] }, {})
  assert(exempt.status !== 'blocked', `他者声明的 .sillyspec/ 文件 → 非 blocked（实际 ${exempt.status}）`)
}

// ── collectOtherQuickSessionDeclarations：枚举/排除/僵尸/容错 ──
console.log('\n--- collectOtherQuickSessionDeclarations ---')

function writeSessionGuard(specBase, sid, allowedFiles, startedAt) {
  const dir = join(specBase, '.runtime', 'quick-sessions', sid)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'guard.json'), JSON.stringify({
    sessionId: sid, baselineFiles: [], allowedFiles, startedAt: startedAt || new Date().toISOString(),
  }))
}

// B1: 多会话枚举 + 排除当前会话 + 空 allowedFiles 会话不进结果
{
  const d = mkdtempSync(join(tmpdir(), 'qfd-c1-')); tmpRoots.push(d)
  const specBase = join(d, '.sillyspec')
  writeSessionGuard(specBase, 'quick-cur000', ['mine.js'])
  writeSessionGuard(specBase, 'quick-aaaa1111', ['daemon/router.py', 'src/run/foo.js'])
  writeSessionGuard(specBase, 'quick-bbbb2222', ['README.md'])
  writeSessionGuard(specBase, 'quick-empty77', [])
  const out = collectOtherQuickSessionDeclarations(null, specBase, 'quick-cur000')
  assert(out.length === 2, `枚举到 2 个非空声明会话（实际 ${JSON.stringify(out)}）`)
  assert(!out.some(s => s.sessionId === 'quick-cur000'), `当前会话被排除`)
  assert(out.some(s => s.sessionId === 'quick-bbbb2222' && s.files.includes('README.md')), `各会话文件带出`)
}

// B2: 超 7 天僵尸会话跳过（FOREIGN_SESSION_STALE_MS 同 doctor 口径）
{
  const d = mkdtempSync(join(tmpdir(), 'qfd-c2-')); tmpRoots.push(d)
  const specBase = join(d, '.sillyspec')
  const stale = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString()
  writeSessionGuard(specBase, 'quick-stale88', ['old.js'], stale)
  writeSessionGuard(specBase, 'quick-fresh99', ['new.js'])
  const out = collectOtherQuickSessionDeclarations(null, specBase, 'quick-cur000')
  assert(out.length === 1 && out[0].sessionId === 'quick-fresh99', `超龄僵尸声明失效、新鲜会话保留（实际 ${JSON.stringify(out)}）`)
}

// B3: 损坏 guard.json 跳过；目录不存在 → []
{
  const d = mkdtempSync(join(tmpdir(), 'qfd-c3-')); tmpRoots.push(d)
  const sessionsDir = join(d, '.sillyspec', '.runtime', 'quick-sessions', 'quick-broken1')
  mkdirSync(sessionsDir, { recursive: true })
  writeFileSync(join(sessionsDir, 'guard.json'), '{not json')
  const out = collectOtherQuickSessionDeclarations(null, join(d, '.sillyspec'), 'quick-cur000')
  assert(out.length === 0, `损坏 guard 跳过（实际 ${JSON.stringify(out)}）`)
  const none = collectOtherQuickSessionDeclarations(null, join(d, '.sillyspec', 'nope'), 'quick-cur000')
  assert(none.length === 0, `目录不存在 → []`)
}

// B4: platformOpts.runtimeRoot 生效（平台模式 quick-sessions 在 runtimeRoot 下，与 guard 读同源）
{
  const d = mkdtempSync(join(tmpdir(), 'qfd-c4-')); tmpRoots.push(d)
  const runtimeRoot = join(d, 'platform-runtime')
  const specBase = join(d, '.sillyspec')
  writeSessionGuard(join(d, 'platform-runtime-parent-x'), 'quick-nowhere1', ['ghost.js']) // 写错位置，不应被读到
  mkdirSync(join(runtimeRoot, 'quick-sessions', 'quick-plat123'), { recursive: true })
  writeFileSync(join(runtimeRoot, 'quick-sessions', 'quick-plat123', 'guard.json'),
    JSON.stringify({ sessionId: 'quick-plat123', allowedFiles: ['plat.js'], startedAt: new Date().toISOString() }))
  const out = collectOtherQuickSessionDeclarations({ runtimeRoot }, specBase, 'quick-cur000')
  assert(out.length === 1 && out[0].sessionId === 'quick-plat123', `runtimeRoot 下会话被枚举（实际 ${JSON.stringify(out)}）`)
}

// ── printQuickAuditReview：软警告渲染（放行可见可审计不静默）──
console.log('\n--- printQuickAuditReview 软警告渲染 ---')

{
  const warns = []
  const origWarn = console.warn, origErr = console.error
  console.warn = (...a) => { warns.push(a.join(' ')) }
  console.error = (...a) => { warns.push(a.join(' ')) }
  try {
    printQuickAuditReview({
      status: 'safe', reasons: [], changedFiles: [], newFiles: [], deletedFiles: [], baselineHit: [], stagedTotal: 1,
      foreignSessionDeclared: [{ file: 'daemon/router.py', sessions: ['quick-aaaa1111'] }],
    })
  } finally { console.warn = origWarn; console.error = origErr }
  const out = warns.join('\n')
  assert(out.includes('已由其他 active quick 会话声明'), `软警告标识出现（实际 ${JSON.stringify(out)}）`)
  assert(out.includes('daemon/router.py') && out.includes('quick-aaaa1111'), `逐文件列出归属会话`)
  assert(out.includes('--force-baseline'), `点明无需 --force-baseline`)
  assert(out.includes('--files'), `给确系本会话改动的 --files 出口`)
  assert(out.includes('--cancel'), `给僵尸会话 --cancel 清理指引`)
}

// ── 端到端（CLI 子进程）：--done 审计注入链路 ──
console.log('\n--- 端到端：--done 审计注入他者声明 ---')

const QL_ID = 'ql-test-foreign-01'
const FULL_OUTPUT = '需求：修复 X\n根因：无，纯新增\n方案：加文件\n结果：测试通过'
function writeGuardE2E(specBase, sid, allowedFiles = []) {
  const dir = join(specBase, '.runtime', 'quick-sessions', sid)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'guard.json'), JSON.stringify({
    quicklogId: QL_ID, baselineFiles: [], allowedFiles, allowNew: false,
    forceBaseline: false, linkedChanges: [], taskDescription: '测试任务',
    startedAt: new Date().toISOString(),
  }))
}
function writeQuicklogEntry(specBase) {
  const dir = join(specBase, 'quicklog')
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'QUICKLOG-test.md'),
    `# QUICKLOG\n\n## ${QL_ID} | 2026/08/23 02:00:00 | 测试条目\n状态：进行中\n关联变更：（无）\n文件：（见实际改动）\n`)
}
async function seedQuick(cwd, specBase, sid) {
  const pm = await initChange(cwd, specBase, sid)
  return seedStage(pm, cwd, sid, 'quick', [
    { name: '理解任务', status: 'completed' },
    { name: '实现并验证', status: 'completed' },
    { name: '暂存和更新记录', status: 'pending' },
  ])
}

// D1: 并行会话声明的危险文件出现在本会话窗口 → --done 通过 + 软警告（不再只能 --force-baseline）
//     sid 须为 quick-[0-9a-f]{8}（command.js sessionId 守卫正则），否则 CLI 视为变更名新开会话。
{
  const { cwd, specBase } = makeRepo('qfd-e2e-')
  const sid = 'quick-a11ce001', other = 'quick-b22df002'
  await seedQuick(cwd, specBase, sid)
  writeGuardE2E(specBase, sid)
  writeQuicklogEntry(specBase)
  writeGuardE2E(specBase, other, ['src/run/foo.js'])
  // 模拟并行会话窗口内改危险文件（本会话 baseline 为空、文件启动后变脏）
  mkdirSync(join(cwd, 'src', 'run'), { recursive: true })
  writeFileSync(join(cwd, 'src', 'run', 'foo.js'), 'export const x = 1\n')
  execSync('git add .', { cwd, stdio: 'pipe' })
  execSync('git commit -q -m add-run', { cwd, stdio: 'pipe' })
  writeFileSync(join(cwd, 'src', 'run', 'foo.js'), 'export const x = 2\n')

  const r = runStage('quick', sid, cwd, { done: true, output: FULL_OUTPUT })
  assert(r.status === 0, `他者声明 → --done 通过（实际 exit ${r.status}）\n    输出: ${r.combined.slice(-800)}`)
  assert(r.combined.includes('已由其他 active quick 会话声明'), `CLI 输出含软警告`)
  assert(!r.combined.includes('BLOCKED'), `不再 BLOCKED`)
  cleanup()
}

// D2: 对照——同样的危险改动但无他者声明 → 照旧 blocked（拦截兜底零回归）
{
  const { cwd, specBase } = makeRepo('qfd-e2e-ctl-')
  const sid = 'quick-c33ef003'
  await seedQuick(cwd, specBase, sid)
  writeGuardE2E(specBase, sid)
  writeQuicklogEntry(specBase)
  mkdirSync(join(cwd, 'src', 'run'), { recursive: true })
  writeFileSync(join(cwd, 'src', 'run', 'foo.js'), 'export const x = 1\n')
  execSync('git add .', { cwd, stdio: 'pipe' })
  execSync('git commit -q -m add-run', { cwd, stdio: 'pipe' })
  writeFileSync(join(cwd, 'src', 'run', 'foo.js'), 'export const x = 2\n')

  const r = runStage('quick', sid, cwd, { done: true, output: FULL_OUTPUT })
  assert(r.status === 1, `无声明 → 照旧 blocked（实际 exit ${r.status}）`)
  assert(r.combined.includes('BLOCKED'), `对照仍 BLOCKED`)
  cleanup()
}

for (const d of tmpRoots) { try { rmSync(d, { recursive: true, force: true }) } catch {} }
console.log(`\n${'='.repeat(50)}`)
console.log(`✅ 通过: ${total - failed}  ❌ 失败: ${failed}`)
console.log(`${'='.repeat(50)}`)
if (failed > 0) process.exit(1)
