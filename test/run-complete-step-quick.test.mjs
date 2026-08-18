/**
 * quick 阶段收尾 CLI 行为测试（run quick --done）。
 *
 * 从 _completeStepForTest 内部函数迁移为 CLI 子进程测试。quick 的 sessionId 解析：
 * `--change quick-<8hex>` 被 CLI 识别为本会话 sessionId（command.js:420），故预置
 * `<specBase>/.runtime/quick-sessions/<sid>/guard.json` + QUICKLOG 条目 + 种入 quick steps，
 * 再 `sillyspec run quick --done --change <sid> --output "..."` 触发收尾。
 *
 * 锁住的行为：
 *   - 结构不全：output 缺「需求：/根因：/方案：/结果：」四标签 → exit(1) + 第三步回退 pending
 *   - audit blocked：guard 存在 + 工作树删 README → audit deletedFiles → BLOCKED → exit(1)
 *   - happy：guard + audit SAFE + 四标签 + 条目 → 完成 + quicklog 翻「已完成」+ session 清理
 *
 * 构造要点：quick 三步无 requiresWait；测试产物全在 .sillyspec/（gitignore）→ git status 干净。
 */
import { writeFileSync, mkdirSync, existsSync, readFileSync, unlinkSync } from 'node:fs'
import { join } from 'node:path'
import { execSync } from 'node:child_process'
import { makeRepo, initChange, seedStage, runStage, cleanup, report } from './_cli-step-harness.mjs'
import { ProgressManager } from '../src/progress.js'

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

function writeGuard(specBase, sid, overrides = {}) {
  const guardFile = join(specBase, '.runtime', 'quick-sessions', sid, 'guard.json')
  mkdirSync(join(specBase, '.runtime', 'quick-sessions', sid), { recursive: true })
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

// 让 CLI 初始化 quick 步骤 schema，再 seedStage 覆盖为第三步 pending。
// sid 必须为 quick-<8hex> 形态才会被 CLI 识别为 sessionId（非 linkedChanges）。
async function seedQuickToThird(cwd, specBase, sid) {
  const pm = await initChange(cwd, specBase, sid)
  return seedStage(pm, cwd, sid, 'quick', quickStepsThirdPending())
}

console.log('=== quick 收尾 CLI 行为 ===\n')

// ── Case 1: 结构不全（outputText 缺四标签）→ exit(1) + 回退 ──
console.log('--- 结构不全：outputText 缺四标签 → exit(1) + 回退 ---')
{
  const { cwd, specBase } = makeRepo('cli-quick-incomplete-')
  const sid = 'quick-deadbee1'
  await seedQuickToThird(cwd, specBase, sid)

  const r = runStage('quick', sid, cwd, { done: true, output: '不完整的输出' })

  assert(r.status === 1, `exit(1)（实际 ${r.status}，输出尾：${r.combined.slice(-120)}）`)
  assert(r.combined.includes('quick 结果摘要结构不完整') || r.combined.includes('结构不完整'), 'stdout 含「结果摘要结构不完整」')
  assert(r.combined.includes('需求：'), 'stdout 点名缺失字段（需求：）')
  const after = await new ProgressManager({ specDir: specBase }).read(cwd, sid)
  assert(after.stages.quick.steps[2].status === 'pending', 'DB: 第三步回退 pending')
}

// ── Case 2: audit blocked（guard + 删 README）→ exit(1) + 回退 ──
console.log('\n--- audit blocked：删除 README → BLOCKED → exit(1) + 回退 ---')
{
  const { cwd, specBase } = makeRepo('cli-quick-blocked-')
  const sid = 'quick-deadbee2'
  await seedQuickToThird(cwd, specBase, sid)
  writeGuard(specBase, sid)
  writeQuicklogEntry(specBase)
  // 删除已提交的 README → git status 显示 D → audit deletedFiles → blocked
  unlinkSync(join(cwd, 'README.md'))

  const r = runStage('quick', sid, cwd, { done: true, output: FULL_OUTPUT })

  assert(r.status === 1, `exit(1)（实际 ${r.status}，输出尾：${r.combined.slice(-120)}）`)
  assert(r.combined.includes('BLOCKED') || r.combined.includes('边界审计'), 'stdout 含 BLOCKED 审计')
  assert(r.combined.includes('删除文件') && r.combined.includes('README.md'), 'stdout 点名删除文件')
  const after = await new ProgressManager({ specDir: specBase }).read(cwd, sid)
  assert(after.stages.quick.steps[2].status === 'pending', 'DB: 第三步回退 pending')
}

// ── Case 3: happy（guard + audit SAFE + 四标签 + 条目）→ 完成 + quicklog flip + session 清理 ──
console.log('\n--- happy：audit SAFE + 四标签齐全 + 条目存在 → 完成 ---')
{
  const { cwd, specBase } = makeRepo('cli-quick-happy-')
  const sid = 'quick-deadbee3'
  await seedQuickToThird(cwd, specBase, sid)
  writeGuard(specBase, sid)
  writeQuicklogEntry(specBase)
  const sessionDir = join(specBase, '.runtime', 'quick-sessions', sid)
  assert(existsSync(join(sessionDir, 'guard.json')), '前置：guard.json 已建')

  const r = runStage('quick', sid, cwd, { done: true, output: FULL_OUTPUT })

  assert(r.status === 0, `happy exit 0（实际 ${r.status}，输出尾：${r.combined.slice(-120)}）`)
  assert(r.combined.includes('SAFE'), 'stdout 含 audit SAFE')
  assert(r.combined.includes(QL_ID) && r.combined.includes('完成'), 'stdout 含 QUICKLOG 条目完成提示')

  // quicklog 条目翻「状态：已完成」
  const qlContent = readFileSync(join(specBase, 'quicklog', 'QUICKLOG-test.md'), 'utf8')
  assert(qlContent.includes('状态：已完成'), 'quicklog 条目翻「状态：已完成」')
  assert(!/^状态：进行中$/m.test(qlContent), 'quicklog 不再含「状态：进行中」')
  assert(qlContent.includes('结果：'), 'quicklog 追加「结果：」字段（来自 outputText）')

  // session 目录清理
  assert(!existsSync(sessionDir), 'session 目录已清理（rmSync quick-sessions/<sid>/）')

  const after = await new ProgressManager({ specDir: specBase }).read(cwd, sid)
  // quick 是辅助阶段（auxiliary）→ 完成后重置 status=pending + steps=freshSteps，让 quick 可重跑
  assert(after.stages.quick.status === 'pending', 'DB: quick 是 auxiliary → 完成后 status 重置 pending（可重跑）')
}

// ── Case 4: 归属切分 E2E（2026-08-18 误归属修复）──QUICKLOG 文件行只落声明文件，他者窗口文件进「审计：」行 ──
// ql-20260818-003 实证形态：并行会话窗口内改的文件曾被整行写进本会话「文件：」行（只能手动精修）。
console.log('\n--- 归属切分 E2E：声明 mine.js + 他者 foreign.js 同窗口脏 ---')
{
  const { cwd, specBase } = makeRepo('cli-quick-attrib-')
  const sid = 'quick-deadbee4'
  writeFileSync(join(cwd, 'mine.js'), 'v1\n')
  writeFileSync(join(cwd, 'foreign.js'), 'v1\n')
  execSync('git add .', { cwd, stdio: 'pipe' })
  execSync('git commit -q -m base', { cwd, stdio: 'pipe' })
  await seedQuickToThird(cwd, specBase, sid)
  writeGuard(specBase, sid, { allowedFiles: ['mine.js'] })
  writeQuicklogEntry(specBase)
  writeFileSync(join(cwd, 'mine.js'), 'v2\n')    // 本会话改（已声明）
  writeFileSync(join(cwd, 'foreign.js'), 'v2\n') // 模拟并行会话窗口内改（未声明）

  const r = runStage('quick', sid, cwd, { done: true, output: FULL_OUTPUT })

  assert(r.status === 0, `归属切分不阻断（warning 级）exit 0（实际 ${r.status}，输出尾：${r.combined.slice(-150)}）`)
  const qlContent = readFileSync(join(specBase, 'quicklog', 'QUICKLOG-test.md'), 'utf8')
  const fileLine = qlContent.split('\n').find(l => l.startsWith('文件：'))
  assert(fileLine !== undefined && fileLine.includes('mine.js'), `文件行含声明文件（实际 ${fileLine}）`)
  assert(fileLine !== undefined && !fileLine.includes('foreign.js'), `文件行不含他者窗口文件（实际 ${fileLine}）`)
  assert(/^审计：.*foreign\.js/m.test(qlContent), `他者窗口文件进「审计：」行落盘可追溯（实际审计行：${qlContent.split('\n').filter(l => l.startsWith('审计：')).join(' | ')}）`)
}

cleanup()
report(count.passed, count.failed, count.failures)
