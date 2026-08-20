/**
 * 坑 doctor-align-bypass-review-gate 回归：doctor --align-execute-progress --confirm 前置 review 门
 *
 * 背景（2026-08-20 实证）：alignExecuteToPlan 直写 completed「绕过 completeStep 推导」，
 * execute 的 Stage Review Gate 与 Task Review Gate 被整体跳过——worktree 清理后的恢复场景
 * 恰是最需要审计的时刻（实证靠 15 份 task review + verify 全程补足覆盖）。
 *
 * 锁定语义：
 *   1. task review 缺失 → --confirm 对齐被前置门阻断（exit 1，execute 仍 in-progress）
 *   2. plan_level=full（tier=independent）且无 stage review → 阻断并给出 register-stage-review 指引
 *   3. tier=self + task review 齐备且 pass → 门放行，对齐正常落盘（execute completed）
 *   4. dry-run 不触发前置门（保持只读语义）
 */
import { join } from 'node:path'
import { writeFileSync, mkdirSync, readFileSync, rmSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { execSync } from 'node:child_process'
import { tmpdir } from 'node:os'

const __dirname = fileURLToPath(import.meta.url).replace(/[^/\\]+$/, '')
const root = join(__dirname, '..')
const binCLI = join(root, 'bin', 'sillyspec.js')
function imp(p) { return import(pathToFileURL(join(root, p)).href) }

let passed = 0, failed = 0
function assert(cond, msg) { cond ? (passed++, console.log(`  ✅ PASS: ${msg}`)) : (failed++, console.log(`  ❌ FAIL: ${msg}`)) }
function run(cmd) {
  try { return { out: execSync(cmd, { encoding: 'utf8', timeout: 60000 }), status: 0 } }
  catch (e) { return { out: (e.stdout || '') + (e.stderr || ''), status: e.status } }
}
const tmpDirs = []
function mkRepo(prefix) {
  const repo = join(tmpdir(), `align-gate-${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`)
  mkdirSync(repo, { recursive: true })
  tmpDirs.push(repo)
  execSync('git init -b main', { cwd: repo, stdio: 'ignore' })
  execSync('git config user.email t@t && git config user.name t', { cwd: repo, stdio: 'ignore' })
  writeFileSync(join(repo, 'README.md'), 'x')
  execSync('git add . && git commit -m init', { cwd: repo, stdio: 'ignore' })
  mkdirSync(join(repo, '.sillyspec', 'changes'), { recursive: true })
  return repo
}
const cleanup = () => { for (const d of tmpDirs) { try { rmSync(d, { recursive: true, force: true }) } catch {} } }

async function seed(repo, cn, { planLevel = 'none' } = {}) {
  const { ProgressManager } = await imp('src/progress.js')
  const pm = new ProgressManager({ specDir: join(repo, '.sillyspec') })
  pm.init(repo)
  pm.initChange(repo, cn)
  const changeDir = join(repo, '.sillyspec', 'changes', cn)
  mkdirSync(changeDir, { recursive: true })
  writeFileSync(join(changeDir, 'plan.md'),
    `---\nplan_level: ${planLevel}\n---\n# Plan\n\n- [x] task-01: 修复 X\n- [x] task-02: 修复 Y\n`)
  // execute 阶段 in-progress（3 步全 pending）
  const progress = pm.read(repo, cn) || {}
  progress.currentChange = cn
  progress.currentStage = 'execute'
  progress.stages = progress.stages || {}
  progress.stages.execute = {
    status: 'in-progress', startedAt: '2026/8/20 01:00:00', completedAt: null,
    steps: [
      { name: '加载上下文', status: 'completed' },
      { name: 'Wave 1 执行', status: 'pending' },
      { name: '收尾', status: 'pending' },
    ],
  }
  pm._write(repo, progress, cn)
  // 未提交代码改动（align 的 2.5 最低事实核验 → changed，不拦截）
  writeFileSync(join(repo, 'src-fix.js'), 'export const fix = 1\n')
  return { pm, changeDir, specBase: join(repo, '.sillyspec') }
}
function writeReviews(repo, cn, runId, ids, { base, head, files } = {}) {
  const runtimeRoot = join(repo, '.sillyspec', '.runtime')
  for (const id of ids) {
    const dir = join(runtimeRoot, 'execute-runs', runId, 'tasks', id)
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, 'review.json'), JSON.stringify({
      schemaVersion: 1, task: id, specVerdict: 'pass', qualityVerdict: 'pass',
      base: base || 'aaaaaaa', head: head || 'bbbbbbb',
      ...(files ? { changedFiles: files } : {}),
    }))
  }
  mkdirSync(join(runtimeRoot, 'execute-runs', runId, 'tasks'), { recursive: true })
  writeFileSync(join(runtimeRoot, `current-execute-run-id-${cn}`), runId + '\n')
}
/** 真实提交一次 src-fix.js，返回 { base, head }（git 证据核验用真实 hash） */
function commitFix(repo) {
  writeFileSync(join(repo, 'src-fix.js'), `export const fix = ${Math.random()}\n`)
  const base = execSync('git rev-parse HEAD', { cwd: repo, encoding: 'utf8' }).trim()
  execSync('git add src-fix.js && git commit -m fix', { cwd: repo, stdio: 'ignore' })
  const head = execSync('git rev-parse HEAD', { cwd: repo, encoding: 'utf8' }).trim()
  return { base, head }
}

console.log('=== doctor align 前置 review 门（坑 doctor-align-bypass-review-gate）===\n')

console.log('--- ① task review 缺失 → --confirm 被阻断，execute 仍 in-progress ---')
{
  const repo = mkRepo('miss')
  const cn = '2026-08-20-align-miss'
  const { pm } = await seed(repo, cn)
  const r = run(`node "${binCLI}" --dir "${repo}" doctor --align-execute-progress --change ${cn} --confirm`)
  assert(r.status !== 0, `exit 非 0（实际 ${r.status}）`)
  assert(r.out.includes('前置 review 校验未过') || r.out.includes('缺少 review.json'), '输出点名 review 缺失')
  const after = pm.read(repo, cn)
  assert(after.stages.execute.status === 'in-progress', 'execute 未被置 completed（门生效）')
  cleanup()
}

console.log('--- ② plan_level=full 无 stage review → 阻断并给 register-stage-review 指引 ---')
{
  const repo = mkRepo('full')
  const cn = '2026-08-20-align-full'
  const { pm } = await seed(repo, cn, { planLevel: 'full' })
  writeReviews(repo, cn, 'exec-2026-08-20-100000', ['task-01', 'task-02'])
  const r = run(`node "${binCLI}" --dir "${repo}" doctor --align-execute-progress --change ${cn} --confirm`)
  assert(r.status !== 0, `exit 非 0（实际 ${r.status}）`)
  assert(r.out.includes('register-stage-review'), '给出 register-stage-review 补救指引')
  const after = pm.read(repo, cn)
  assert(after.stages.execute.status === 'in-progress', 'execute 未被置 completed')
  cleanup()
}

console.log('--- ③ tier=self + task review 齐 → 门放行，对齐落盘 ---')
{
  const repo = mkRepo('pass')
  const cn = '2026-08-20-align-pass'
  const { pm } = await seed(repo, cn, { planLevel: 'none' })
  const { base, head } = commitFix(repo)
  writeReviews(repo, cn, 'exec-2026-08-20-110000', ['task-01', 'task-02'], { base, head, files: ['src-fix.js'] })
  const r = run(`node "${binCLI}" --dir "${repo}" doctor --align-execute-progress --change ${cn} --confirm`)
  assert(r.status === 0, `exit 0（实际 ${r.status}，输出尾：${r.out.slice(-300)}）`)
  assert(r.out.includes('前置 review 校验通过'), '前置门放行日志')
  const after = pm.read(repo, cn)
  assert(after && after.stages.execute.status === 'completed', 'execute 对齐为 completed（正常路径不受损）')
  cleanup()
}

console.log('--- ④ dry-run 不触发前置门（只读语义保持）---')
{
  const repo = mkRepo('dry')
  const cn = '2026-08-20-align-dry'
  const { pm } = await seed(repo, cn)
  const r = run(`node "${binCLI}" --dir "${repo}" doctor --align-execute-progress --change ${cn}`)
  assert(!r.out.includes('前置 review 校验未过'), 'dry-run 不跑前置门')
  assert(r.out.includes('dry-run'), 'dry-run 报告正常输出')
  const after = pm.read(repo, cn)
  assert(after.stages.execute.status === 'in-progress', 'dry-run 不落盘')
  cleanup()
}

console.log(`\n${'='.repeat(50)}`)
console.log(`✅ 通过: ${passed}  ❌ 失败: ${failed}`)
console.log('='.repeat(50))
if (failed > 0) process.exit(1)
