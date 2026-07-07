/**
 * doctor-align-execute-progress 测试
 *
 * 覆盖 ProgressManager.alignExecuteToPlan（task-01 实现，FR-01/02/03）：
 *   - 正向：plan.md 全勾 + --confirm → 补 execute step 戳 + 显式置 stage status='completed'
 *   - 拒绝：plan.md 有未勾 → {ok:false, reason 含 'X/Y'}，progress 不写
 *   - dry-run vs --confirm：无 --confirm 返回 dryRun:true，不落盘；加 --confirm 才写
 *   - 边界：execute 阶段无 step → {ok:false, reason:'execute 阶段无进度数据'}
 *
 * 隔离：自建临时 spec 目录（mkTmp）+ ProgressManager({specDir}) 指向临时 specDir，
 *       不依赖真实 sillyspec.db / 真实项目 worktree。
 *
 * change 2026-07-06-execute-deps-gate-deadlock（task-05）
 */
import { ProgressManager, resolveSpecDir } from '../src/progress.js'
import { mkdtempSync, writeFileSync, mkdirSync, existsSync, rmSync, readFileSync, statSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

let failed = 0
let passed = 0
const failures = []
function assert(cond, msg) {
  if (cond) { passed++; console.log(`  ✅ PASS: ${msg}`) }
  else { failed++; failures.push(msg); console.log(`  ❌ FAIL: ${msg}`) }
}
function assertEqual(actual, expected, msg) {
  const ok = actual === expected
  if (ok) { passed++; console.log(`  ✅ PASS: ${msg}`) }
  else { failed++; failures.push(`${msg} (expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)})`); console.log(`  ❌ FAIL: ${msg} (expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)})`) }
}

const tmpDirs = []
function mkTmp(prefix) {
  const d = mkdtempSync(join(tmpdir(), `align-${prefix}-`))
  tmpDirs.push(d)
  return d
}
function cleanup() {
  for (const d of tmpDirs) {
    try { rmSync(d, { recursive: true, force: true }) } catch {}
  }
}

console.log('=== doctor-align-execute-progress 测试 ===\n')

// 测试用 plan.md 模板：fullChecked=true 全勾，false 时 task-03 留未勾
function writePlan(changeDir, { fullChecked }) {
  const box = (c) => c ? 'x' : ' '
  // 3 个 task checkbox
  const content = `# Plan\n\n## Wave 1\n\n- [x] task-01: a\n- [x] task-02: b\n- [${box(fullChecked)}] task-03: c\n`
  writeFileSync(join(changeDir, 'plan.md'), content, 'utf8')
}

/**
 * 在临时 specDir 中构造一个变更 + 初始化 execute 阶段 steps。
 * 返回 { cwd, specDir, specBase, changeName, pm }。
 * executeSteps: ['step-a','step-b'] 这些 step 初始 status 都是 pending。
 */
async function setupChange({ executeSteps = ['step-a', 'step-b'], fullChecked = true } = {}) {
  const cwd = mkTmp('cwd')
  const specDir = mkTmp('spec')        // specDir = specBase/.sillyspec 的角色
  const pm = new ProgressManager({ specDir })
  await pm.init(cwd)
  const changeName = 'test-change'
  await pm.initChange(cwd, changeName)
  // 写 plan.md 到 changeDir（specDir/changes/<changeName>/plan.md）
  const changeDir = join(specDir, 'changes', changeName)
  writePlan(changeDir, { fullChecked })
  // 在 execute 阶段塞入 pending steps
  if (executeSteps.length > 0) {
    for (const stepName of executeSteps) {
      await pm.addStep(cwd, 'execute', stepName, changeName)
    }
  }
  return { cwd, specDir, changeName, pm }
}

// ── 正向：plan 全勾 + --confirm → 补 step 戳 + 显式置 stage status ──
console.log('--- 正向：plan 全勾 + --confirm → 补 execute step 戳 + stage completed ---')
{
  const { cwd, specDir, changeName, pm } = await setupChange({ executeSteps: ['step-a', 'step-b'], fullChecked: true })
  const before = await pm.read(cwd, changeName)
  assertEqual(before.stages.execute.status, 'pending', '对齐前 execute stage status=pending')
  assertEqual(before.stages.execute.steps.length, 2, 'execute 有 2 个 step')
  assertEqual(before.stages.execute.steps[0].status, 'pending', '对齐前 step-a=pending')
  assertEqual(before.stages.execute.steps[1].status, 'pending', '对齐前 step-b=pending')

  const r = await pm.alignExecuteToPlan(cwd, changeName, specDir, { confirm: true })

  assertEqual(r.ok, true, `正向返回 ok:true（reason=${JSON.stringify(r.reason)}）`)
  assert(r.dryRun !== true, `正向 --confirm → 非 dryRun（dryRun=${r.dryRun}）`)
  assertEqual(r.planChecked >= r.planTotal && r.planTotal > 0, true, `planChecked>=planTotal (${r.planChecked}/${r.planTotal})`)
  assertEqual(r.aligned, 2, `aligned=2（补了 2 个未完成 step，实际 ${r.aligned}）`)

  const after = await pm.read(cwd, changeName)
  // AC-01：落盘后 execute stageData.status='completed' + 所有 step status='completed'
  assertEqual(after.stages.execute.status, 'completed', 'AC-01: 对齐后 execute stage status=completed（D-003@v2 显式置 stage）')
  assertEqual(after.stages.execute.steps.every(s => s.status === 'completed'), true, 'AC-01: 所有 execute step status=completed')
  assert(!!after.stages.execute.completedAt, `execute completedAt 已置（${after.stages.execute.completedAt}）`)
  assert(after.stages.execute.steps.every(s => !!s.completedAt), '每个补的 step 带 completedAt')
}

// ── 拒绝：plan 有未勾 task → {ok:false, reason 含 'X/Y'}，不写 progress ──
console.log('\n--- 拒绝：plan 有未勾 task → {ok:false}，progress 不写 ---')
{
  const { cwd, specDir, changeName, pm } = await setupChange({ executeSteps: ['step-a', 'step-b'], fullChecked: false })
  const dbPath = join(specDir, '.runtime', 'sillyspec.db')
  const mtimeBefore = statSync(dbPath).mtimeMs
  const snapshot = await pm.read(cwd, changeName)

  const r = await pm.alignExecuteToPlan(cwd, changeName, specDir, { confirm: true })

  assertEqual(r.ok, false, 'AC-02: plan 有未勾 → ok:false')
  assert(typeof r.reason === 'string' && r.reason.length > 0, `AC-02: reason 非空（${r.reason}）`)
  // reason 含 X/Y 形式的进度（如 "2/3"）
  assert(/\d+\s*\/\s*\d+/.test(r.reason), `AC-02: reason 含 X/Y 形式（${r.reason}）`)

  // AC-02：progress 未被写入（execute steps 仍 pending，stage 仍 pending）
  const after = await pm.read(cwd, changeName)
  assertEqual(after.stages.execute.status, 'pending', 'AC-02: 拒绝对齐时 stage status 未变')
  assertEqual(after.stages.execute.steps.every(s => s.status === 'pending'), true, 'AC-02: 拒绝对齐时 steps 未被补戳')
  // 内容应与快照一致（无新 completedAt 等）
  assertEqual(JSON.stringify(after) === JSON.stringify(snapshot), true, 'AC-02: progress 内容不变（未写盘）')
}

// ── dry-run：无 --confirm → dryRun:true，不落盘 ──
console.log('\n--- dry-run：无 --confirm → dryRun:true，progress 不落盘 ---')
{
  const { cwd, specDir, changeName, pm } = await setupChange({ executeSteps: ['step-a', 'step-b'], fullChecked: true })
  const snapshot = await pm.read(cwd, changeName)

  const r = await pm.alignExecuteToPlan(cwd, changeName, specDir, { confirm: false })

  assertEqual(r.ok, true, 'dry-run plan 全勾 → ok:true')
  assertEqual(r.dryRun, true, 'dry-run → dryRun:true')
  assertEqual(r.aligned, 2, `dry-run 报告将补 aligned=2（实际 ${r.aligned}）`)

  // 不落盘：execute steps 仍 pending，stage 仍 pending
  const after = await pm.read(cwd, changeName)
  assertEqual(after.stages.execute.status, 'pending', 'dry-run 不置 stage status')
  assertEqual(after.stages.execute.steps.every(s => s.status === 'pending'), true, 'dry-run 不补 step 戳')
  assertEqual(JSON.stringify(after) === JSON.stringify(snapshot), true, 'dry-run 不写 progress（内容不变）')
}

// ── dry-run 默认：完全不传 opts 也应等价 dry-run（不写）──
console.log('\n--- dry-run 默认（不传 opts）→ 不写 progress ---')
{
  const { cwd, specDir, changeName, pm } = await setupChange({ executeSteps: ['step-a'], fullChecked: true })
  const snapshot = await pm.read(cwd, changeName)

  // 不传第 4 个参数 opts
  const r = await pm.alignExecuteToPlan(cwd, changeName, specDir)

  assertEqual(r.ok, true, '无 opts plan 全勾 → ok:true')
  assertEqual(r.dryRun, true, '无 opts → dryRun:true（默认不写）')
  const after = await pm.read(cwd, changeName)
  assertEqual(after.stages.execute.steps.every(s => s.status === 'pending'), true, '无 opts 不补 step 戳')
  assertEqual(JSON.stringify(after) === JSON.stringify(snapshot), true, '无 opts 不写 progress')
}

// ── 边界：execute 阶段无 step → {ok:false, reason:'execute 阶段无进度数据'} ──
console.log('\n--- 边界：execute 阶段无 step → {ok:false} ---')
{
  const { cwd, specDir, changeName, pm } = await setupChange({ executeSteps: [], fullChecked: true })

  const r = await pm.alignExecuteToPlan(cwd, changeName, specDir, { confirm: true })

  assertEqual(r.ok, false, 'execute 无 step → ok:false')
  assert(typeof r.reason === 'string' && r.reason.length > 0, `execute 无 step reason 非空（${r.reason}）`)
  // reason 指示无进度数据语义
  assert(/无进度数据|无 step|无步骤|execute/.test(r.reason), `execute 无 step reason 语义正确（${r.reason}）`)
}

// ── 正向幂等：已全 completed 再对齐 aligned=0，不报错 ──
console.log('\n--- 幂等：execute 已全 completed 再对齐 → aligned=0 ---')
{
  const { cwd, specDir, changeName, pm } = await setupChange({ executeSteps: ['step-a', 'step-b'], fullChecked: true })
  // 第一次对齐
  await pm.alignExecuteToPlan(cwd, changeName, specDir, { confirm: true })
  // 第二次：steps 都已 completed
  const r = await pm.alignExecuteToPlan(cwd, changeName, specDir, { confirm: true })
  assertEqual(r.ok, true, '幂等再对齐 ok:true')
  assertEqual(r.aligned, 0, `幂等再对齐 aligned=0（实际 ${r.aligned}）`)
  const after = await pm.read(cwd, changeName)
  assertEqual(after.stages.execute.status, 'completed', '幂等后 stage 仍 completed')
}

// ── 正向补部分戳：已有 1 completed 1 pending → 只补 pending 那个（aligned=1）──
console.log('\n--- 补部分戳：1 completed + 1 pending → aligned=1 ---')
{
  const { cwd, specDir, changeName, pm } = await setupChange({ executeSteps: ['step-a', 'step-b'], fullChecked: true })
  // 手动把 step-a 标 completed（模拟真实场景：部分 step 已盖戳）
  await pm.updateStep(cwd, 'execute', 'step-a', { status: 'completed' }, changeName)

  const r = await pm.alignExecuteToPlan(cwd, changeName, specDir, { confirm: true })
  assertEqual(r.ok, true, '补部分戳 ok:true')
  assertEqual(r.aligned, 1, `只补 pending 的 1 个（aligned=1，实际 ${r.aligned}）`)
  const after = await pm.read(cwd, changeName)
  assertEqual(after.stages.execute.steps.every(s => s.status === 'completed'), true, '补后所有 step completed')
  assertEqual(after.stages.execute.status, 'completed', '补后 stage completed')
}

cleanup()

console.log(`\n==================================================`)
console.log(`✅ 通过: ${passed}  ❌ 失败: ${failed}`)
console.log(failed === 0 ? '全部通过' : `❌ 失败项: ${failures.join('; ')}`)
console.log(`==================================================`)
process.exit(failed === 0 ? 0 : 1)
