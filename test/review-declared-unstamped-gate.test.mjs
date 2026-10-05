/**
 * 2026-10-05-review-declared-unstamped-gate 回归：collectReviewDeclaredFiles 归属戳门控
 *
 * 背景（2026-10-05 实证）：resolver（resolveLatestExecuteRunIdWithTasks）在变更名无戳命中时
 * 回退拿 mtime 最新的无主 run——从未跑过 execute 的变更误挂 8 月无戳旧 run 的 review.json
 * changedFiles（14 个无关文件），apply 预检误报「review 声明了越权文件」且嫌疑标注误导。
 *
 * 锁定语义：
 *   1. 无戳 run（resolver 回退形态）→ 声明面空 Map（FR-01）
 *   2. 戳等值命中 → 收集行为不变：repo 切片 + .sillyspec//meta.json 产物过滤（FR-02）
 *   3. resolver 无主回退语义不变（task-done 等消费方零影响）（FR-03）
 *   4. 带戳他变更 + 无戳并存 → 回退仍拿无戳 → 门控后空（FR-04 三形态齐备）
 */
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { collectReviewDeclaredFiles } from '../src/worktree-apply.js'
import { resolveLatestExecuteRunIdWithTasks } from '../src/task-review.js'

let passed = 0, failed = 0
const failures = []
function assert(cond, msg) {
  if (cond) { passed++; console.log(`  ✅ PASS: ${msg}`) }
  else { failed++; failures.push(msg); console.log(`  ❌ FAIL: ${msg}`) }
}

console.log('=== collectReviewDeclaredFiles 归属戳门控（2026-10-05-review-declared-unstamped-gate）===\n')

const CHG = '2026-10-05-my-change'
const mkRuntime = () => mkdtempSync(join(tmpdir(), 'revdecl-gate-'))
const mkRun = (root, runId, { stamp, changedFiles = ['src-app.js', 'src-facade.js'], repo = 'main' } = {}, taskId = 'task-01') => {
  const taskDir = join(root, 'execute-runs', runId, 'tasks', taskId)
  mkdirSync(taskDir, { recursive: true })
  if (stamp !== undefined) writeFileSync(join(root, 'execute-runs', runId, 'change'), stamp + '\n')
  writeFileSync(join(taskDir, 'review.json'), JSON.stringify({
    schemaVersion: 2, task: taskId, base: '0'.repeat(40), head: '1'.repeat(40),
    changedFiles, repo, specVerdict: 'pass', qualityVerdict: 'pass',
  }))
}

console.log('--- ① 无戳 run（回退形态）声明面为空 ---')
{
  const root = mkRuntime()
  mkRun(root, 'exec-2026-08-19-112600') // 无戳旧 run（实证形态）
  const byRepo = collectReviewDeclaredFiles(root, CHG, { runtimeRoot: root })
  assert(byRepo.size === 0, `无戳 run 声明面空 Map（实际 ${JSON.stringify([...byRepo])}）`)
  rmSync(root, { recursive: true, force: true })
}

console.log('--- ② 带戳等值 run 收集行为不变（切片+产物过滤） ---')
{
  const root = mkRuntime()
  // 单 run 多 task（真实形态：resolver 只取最新 run，声明按 tasks/* 聚合）
  mkRun(root, 'exec-2026-10-05-100000', { stamp: CHG, changedFiles: ['src-app.js', '.sillyspec/quicklog/Q.md', 'meta.json'] })
  mkRun(root, 'exec-2026-10-05-100000', { stamp: CHG, changedFiles: ['src-other.js'], repo: 'other' }, 'task-02')
  const byRepo = collectReviewDeclaredFiles(root, CHG, { runtimeRoot: root })
  const main = byRepo.get('main') || []
  assert(main.includes('src-app.js'), '带戳等值收集正常（src-app.js 在列）')
  assert(!main.some(f => f.startsWith('.sillyspec/') || f === 'meta.json'), '运行时产物过滤不变')
  assert(!(byRepo.get('main') || []).includes('src-other.js') && (byRepo.get('other') || []).includes('src-other.js'), '跨仓切片不变（repo:other 不进 main）')
  rmSync(root, { recursive: true, force: true })
}

console.log('--- ③ resolver 无主回退语义不变 ---')
{
  const root = mkRuntime()
  mkRun(root, 'exec-2026-08-16-231102', { stamp: '2026-08-16-someone-else' }) // 有主（他变更）
  mkRun(root, 'exec-2026-08-19-112600') // 无戳（无主）
  const runId = resolveLatestExecuteRunIdWithTasks({ runtimeRoot: root, changeName: CHG })
  assert(runId === 'exec-2026-08-19-112600', `resolver 仍回退拿无主 run（实际 ${runId}）——task-done 等消费方零影响`)
  rmSync(root, { recursive: true, force: true })
}

console.log('--- ④ 带戳他变更 + 无戳并存仍空（三形态齐备） ---')
{
  const root = mkRuntime()
  mkRun(root, 'exec-2026-09-01-090000', { stamp: '2026-09-01-theirs' })
  mkRun(root, 'exec-2026-08-19-112600') // 无戳 mtime 更旧但无主 → 回退仍拿它
  const byRepo = collectReviewDeclaredFiles(root, CHG, { runtimeRoot: root })
  assert(byRepo.size === 0, `回退拿无戳 run 经门控后声明面仍空（实际 ${JSON.stringify([...byRepo])}）`)
  rmSync(root, { recursive: true, force: true })
}

console.log(`\n${'='.repeat(50)}`)
console.log(`✅ 通过: ${passed}  ❌ 失败: ${failed}`)
if (failures.length) { console.log('失败项:'); failures.forEach(f => console.log('  - ' + f)) }
console.log('='.repeat(50))
if (failed > 0) process.exit(1)
