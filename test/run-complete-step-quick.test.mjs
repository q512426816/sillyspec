/**
 * completeStep characterization — quick 完成分支（run.js:3512-3624）
 *
 * 锁住 quick 阶段收尾（nextPendingIdx===-1 且 stageName==='quick'）的现有行为：
 *   - 结构不全：无 guard + outputText 缺「需求：/根因：/方案：/结果：」四标签 →
 *     validateQuickResult 失败 → exit(1) + 回退第三步 pending
 *   - audit blocked：guard 存在 + cwd 删 README → auditQuickCompletion deletedFiles →
 *     status=blocked → printQuickAuditReview BLOCKED → exit(1) + 回退
 *   - happy：guard + cwd 干净（audit SAFE）+ 四标签齐全 + quicklog 条目存在 →
 *     completeQuicklogEntry 翻「进行中→已完成」+ session 目录清理 + 阶段完成
 *
 * 构造要点：quick 三步无 requiresWait；测试产物全在 .sillyspec/（gitignore）→ git status 干净。
 * guard 从 <specBase>/.runtime/quick-sessions/<cn>/guard.json 读；quicklog 条目在
 * <specBase>/quicklog/QUICKLOG-<gitUser>.md（gitUser=test → QUICKLOG-test.md）。
 */
import { writeFileSync, mkdirSync, existsSync, readFileSync, unlinkSync } from 'node:fs'
import { join } from 'node:path'
import { _completeStepForTest } from '../src/run.js'
import { runCapturing, makeRepo, initChange, seedStage, cleanup, report } from './_complete-step-harness.mjs'

const count = { passed: 0, failed: 0, failures: [] }
const assert = (cond, msg) => { cond ? (count.passed++, console.log(`  ✅ PASS: ${msg}`)) : (count.failed++, count.failures.push(msg), console.log(`  ❌ FAIL: ${msg}`)) }

const QL_ID = 'ql-test-001-aaaa'
// quick 三步（与 src/stages/quick.js 一致），第三步 pending 触发完成路径
function quickStepsThirdPending() {
  return [
    { name: '理解任务', status: 'completed' },
    { name: '实现并验证', status: 'completed' },
    { name: '暂存和更新记录', status: 'pending' },
  ]
}
const FULL_OUTPUT = '需求：修复 X\n根因：无，纯新增\n方案：加文件\n结果：测试通过'

function writeGuard(specBase, cn, overrides = {}) {
  const guardFile = join(specBase, '.runtime', 'quick-sessions', cn, 'guard.json')
  mkdirSync(join(specBase, '.runtime', 'quick-sessions', cn), { recursive: true })
  writeFileSync(guardFile, JSON.stringify({
    quicklogId: QL_ID,
    baselineFiles: [],
    allowedFiles: [],
    allowNew: false,
    forceBaseline: false,
    linkedChanges: [],
    taskDescription: '测试任务',
    ...overrides,
  }))
}
function writeQuicklogEntry(specBase) {
  const dir = join(specBase, 'quicklog')
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'QUICKLOG-test.md'),
    `# QUICKLOG\n\n## ${QL_ID} | 2026/07/26 02:00:00 | 测试条目\n状态：进行中\n关联变更：（无）\n文件：（见实际改动）\n`)
}

console.log('=== completeStep characterization: quick 完成分支 ===\n')

// ── Case 1: 结构不全（无 guard + outputText 缺四标签）→ exit(1) + 回退 ──
console.log('--- 结构不全：outputText 缺四标签 → exit(1) + 回退 ---')
{
  const { cwd, specBase } = makeRepo('cs-quick-incomplete-')
  const cn = 'quick-incomplete1'
  const pm = await initChange(cwd, specBase, cn)
  const progress = await seedStage(pm, cwd, cn, 'quick', quickStepsThirdPending())

  const r = await runCapturing(() =>
    _completeStepForTest(pm, progress, 'quick', cwd, '不完整的输出', null,
      { changeName: cn, printNext: false }))

  assert(r.exitCode === 1, 'exit(1)')
  assert(r.stdout.includes('❌ quick 结果摘要结构不完整：缺少字段'), 'stdout 含「结果摘要结构不完整」')
  assert(r.stdout.includes('需求：'), 'stdout 点名缺失字段（需求：）')
  const after = await pm.read(cwd, cn)
  assert(after.stages.quick.steps[2].status === 'pending', 'DB: 第三步回退 pending')
}

// ── Case 2: audit blocked（guard + 删 README）→ exit(1) + 回退 ──
console.log('\n--- audit blocked：删除 README → BLOCKED → exit(1) + 回退 ---')
{
  const { cwd, specBase } = makeRepo('cs-quick-blocked-')
  const cn = 'quick-blocked1'
  const pm = await initChange(cwd, specBase, cn)
  writeGuard(specBase, cn)
  writeQuicklogEntry(specBase)
  const progress = await seedStage(pm, cwd, cn, 'quick', quickStepsThirdPending())
  // 删除已提交的 README → git status 显示 D → audit deletedFiles → blocked
  unlinkSync(join(cwd, 'README.md'))

  const r = await runCapturing(() =>
    _completeStepForTest(pm, progress, 'quick', cwd, FULL_OUTPUT, null,
      { changeName: cn, printNext: false }))

  assert(r.exitCode === 1, 'exit(1)')
  assert(r.stdout.includes('🚫 quick 变更边界审计 — BLOCKED'), 'stdout 含 BLOCKED 审计')
  assert(r.stdout.includes('删除文件: README.md'), 'stdout 点名删除文件')
  const after = await pm.read(cwd, cn)
  assert(after.stages.quick.steps[2].status === 'pending', 'DB: 第三步回退 pending')
}

// ── Case 3: happy（guard + audit SAFE + 四标签 + 条目）→ 完成 + quicklog flip + session 清理 ──
console.log('\n--- happy：audit SAFE + 四标签齐全 + 条目存在 → 完成 ---')
{
  const { cwd, specBase } = makeRepo('cs-quick-happy-')
  const cn = 'quick-happy1'
  const pm = await initChange(cwd, specBase, cn)
  writeGuard(specBase, cn)
  writeQuicklogEntry(specBase)
  const progress = await seedStage(pm, cwd, cn, 'quick', quickStepsThirdPending())
  const sessionDir = join(specBase, '.runtime', 'quick-sessions', cn)
  assert(existsSync(join(sessionDir, 'guard.json')), '前置：guard.json 已建')

  const r = await runCapturing(() =>
    _completeStepForTest(pm, progress, 'quick', cwd, FULL_OUTPUT, null,
      { changeName: cn, printNext: false }))

  assert(!r.error, 'happy 不应抛异常')
  assert(r.exitCode !== 1, 'happy 不 exit(1)')
  assert(r.result && r.result.stageCompleted === true, 'stageCompleted:true')
  assert(r.stdout.includes('✅ quick 变更边界审计 — SAFE'), 'stdout 含 audit SAFE')
  assert(r.stdout.includes(`📝 QUICKLOG 条目 ${QL_ID} 已标记完成`), 'stdout 含「QUICKLOG 条目已标记完成」')

  // quicklog 条目翻「状态：已完成」
  const qlContent = readFileSync(join(specBase, 'quicklog', 'QUICKLOG-test.md'), 'utf8')
  assert(qlContent.includes('状态：已完成'), 'quicklog 条目翻「状态：已完成」')
  assert(!/^状态：进行中$/m.test(qlContent), 'quicklog 不再含「状态：进行中」')
  assert(qlContent.includes('结果：'), 'quicklog 追加「结果：」字段（来自 outputText）')

  // session 目录清理
  assert(!existsSync(sessionDir), 'session 目录已清理（rmSync quick-sessions/<cn>/）')

  const after = await pm.read(cwd, cn)
  // quick 是辅助阶段（auxiliary）→ 完成后重置 status=pending + steps=freshSteps，让 quick 可重跑
  assert(after.stages.quick.status === 'pending', 'DB: quick 是 auxiliary → 完成后 status 重置 pending（可重跑）')
  assert(after.stages.quick.steps.every(s => s.status === 'pending'), 'DB: steps 重置为 freshSteps（全 pending）')
}

cleanup()
report(count.passed, count.failed, count.failures)
