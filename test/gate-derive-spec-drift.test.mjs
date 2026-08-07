/**
 * gate/derive 顶层命令 worktree drift 锚定 e2e（坑 execute-runs-isolation，index 层遗留 gap）。
 *
 * 背景：command.js 的 drift 守卫（src/run/command.js detectWorktreeSpecDrift 段）只覆盖
 * plan/execute/verify/archive——它们走 runCommand。gate/derive 是顶层命令（index.js case
 * 'gate'/'derive'），不走 runCommand → drift 守卫不触发 → worktree cwd 下 specDriftAnchor 未设
 * → runGate/runDerive 的 resolveRuntimeRoot 走本地兜底，execute-run-id marker 读 worktree 副本
 * .runtime（副本随 cleanup 整目录删消失，archive 客观完成度 gate 误阻断）。
 *
 * 本测试验证 index.js gate/derive case 在 worktree cwd 下用 detectWorktreeSpecDrift 算 anchor
 * 并向 runGate/runDerive 传 specDriftAnchor（对齐 machine-interface 已扩展入参），使 marker
 * 读取锚主仓 .runtime。
 *
 * 抓手：validateTaskReviews（src/task-review.js）review.json 缺失时 error 文本含 executeRunId
 * （"execute run ID: <runId>"）。marker 读主仓（exec-MAIN-001）→ 主仓 pass review → 无 error；
 * 读副本（exec-COPY-999）→ 副本缺对应 review → error 含 exec-COPY-999 + "缺少 review.json"。
 *
 * 场景：
 *   A. derive task-reviews 副本 cwd → 自动 anchor 读主仓 marker（ok=true，不含 exec-COPY-999）
 *   B. derive task-reviews 显式 --spec-dir 副本（index 层 if(!specDir) 跳过 anchor）→ 读副本 marker
 *      （负对照：error 含 exec-COPY-999，证明 anchor 未生效时确实读副本）
 *   C. gate execute 副本 cwd → 自动 anchor，task-reviews check 读主仓（ok=true，不含 exec-COPY-999）
 *
 * 互补：execute-runs-isolation.test.mjs 测 consumer 侧（resolveRuntimeRoot 单元）；
 *      worktree-execute-spec-drift.test.mjs 测 command.js 守卫 producer 侧（execute 路径）；
 *      本测试补 index 层 gate/derive producer 侧（顶层命令不走 command.js 守卫的缺口）。
 *
 * 测试隔离：mkdtempSync 临时目录、非 git fixture（derive task-reviews 不调 git；gate execute 的
 * execute-evidence/artifacts 在无 git 时降级 warning 不阻断、不 crash）。结尾清理；路径全 node:path。
 */
import { ProgressManager } from '../src/progress.js'
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'fs'
import { join, dirname, resolve } from 'path'
import { tmpdir } from 'os'
import { spawnSync } from 'child_process'
import { fileURLToPath } from 'url'

let failed = 0
let passed = 0
const failures = []
function assert(cond, msg) {
  if (cond) { passed++; console.log(`  ✅ PASS: ${msg}`) }
  else { failed++; failures.push(msg); console.log(`  ❌ FAIL: ${msg}`) }
}

const tmpDirs = []
function mkTmp(prefix) {
  const d = mkdtempSync(join(tmpdir(), `gatedrift-${prefix}-`))
  tmpDirs.push(d)
  return d
}
function cleanup() {
  for (const d of tmpDirs) { try { rmSync(d, { recursive: true, force: true }) } catch {} }
}

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(__dirname, '..')
const binPath = join(repoRoot, 'bin', 'sillyspec.js')

// 子进程跑 CLI 入口（bin/sillyspec.js → src/index.js main），隔离 process.exit + 捕获 stdout/stderr/exit。
// --json 模式下 withJsonOutput 劫持 console.log 到 stderr，stdout 只留最终 JSON envelope。
function runCli(cwd, args) {
  return spawnSync(process.execPath, [binPath, ...args], {
    cwd,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
    timeout: 60_000,
  })
}

// 合法 pass review.json（REVIEW_SCHEMA_VERSION=1，VALID_VERDICTS=pass/fail/cannot_verify）
function passReview(taskId) {
  return JSON.stringify({
    schemaVersion: 1,
    task: taskId,
    specVerdict: 'pass',
    qualityVerdict: 'pass',
    base: 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeef',
    head: 'cafef00dcafef00dcafef00dcafef00dcafef00d',
    reviewerNotes: 'e2e fixture pass review',
  }, null, 2)
}

const PLAN_MD = '# Plan\n\n## Wave 1\n\n- [x] task-01: gate/derive drift 锚定\n'

console.log('=== gate/derive 顶层命令 worktree drift 锚定 e2e（index 层 gap）===\n')

// ════════════════════════════════════════════════════════════
// 共享 fixture：主仓 + worktree 副本（非 git）
// ════════════════════════════════════════════════════════════
const mainRepo = mkTmp('main-repo')
const mainSpec = join(mainRepo, '.sillyspec')
const changeName = '2026-08-07-demo-change'
const wtRoot = join(mainSpec, '.runtime', 'worktrees', changeName)
const copySpec = join(wtRoot, '.sillyspec')
const mainRuntime = join(mainSpec, '.runtime')
const copyRuntime = join(copySpec, '.runtime')

// ── 主仓：progress + plan + marker(exec-MAIN-001) + 主仓 pass review ──
mkdirSync(mainSpec, { recursive: true })
const pmMain = new ProgressManager({ specDir: mainSpec })
await pmMain.init(mainRepo)
await pmMain.initChange(mainRepo, changeName)
await pmMain.setStage(mainRepo, 'execute', changeName)
writeFileSync(join(mainSpec, 'changes', changeName, 'plan.md'), PLAN_MD, 'utf8')
mkdirSync(mainRuntime, { recursive: true })
// 主仓 marker = exec-MAIN-001（drift+anchor 应读这个 → 主仓 pass review）
writeFileSync(join(mainRuntime, `current-execute-run-id-${changeName}`), 'exec-MAIN-001\n', 'utf8')
mkdirSync(join(mainRuntime, 'execute-runs', 'exec-MAIN-001', 'tasks', 'task-01'), { recursive: true })
writeFileSync(join(mainRuntime, 'execute-runs', 'exec-MAIN-001', 'tasks', 'task-01', 'review.json'),
  passReview('task-01'), 'utf8')

// ── 副本：progress + plan + marker(exec-COPY-999) ──
// 故意不建副本 execute-runs/exec-COPY-999/...：若读副本 marker，review 缺失 → error 含 exec-COPY-999。
// runGate/runDerive 内部 pm=new ProgressManager()（无 specDir）→ pm.read(cwd=wtRoot) 走 resolveSpecDir
// (wtRoot)=copySpec → 读副本 db，故副本必须 init progress，否则 "变更不存在" exit 2。
mkdirSync(copySpec, { recursive: true })
const pmCopy = new ProgressManager({ specDir: copySpec })
await pmCopy.init(wtRoot)
await pmCopy.initChange(wtRoot, changeName)
await pmCopy.setStage(wtRoot, 'execute', changeName)
writeFileSync(join(copySpec, 'changes', changeName, 'plan.md'), PLAN_MD, 'utf8')
mkdirSync(copyRuntime, { recursive: true })
writeFileSync(join(copyRuntime, `current-execute-run-id-${changeName}`), 'exec-COPY-999\n', 'utf8')

// ════════════════════════════════════════════════════════════
// 场景 A：derive task-reviews 副本 cwd → 自动 anchor 读主仓 marker
// ════════════════════════════════════════════════════════════
console.log('--- 场景 A：derive task-reviews 副本 cwd → 自动 anchor 读主仓 marker ---')
{
  const res = runCli(wtRoot, ['derive', 'task-reviews', '--change', changeName, '--json'])
  const combined = (res.stdout || '') + (res.stderr || '')
  assert(res.status === 0, `AC-A1: derive exit=0（实际 exit=${res.status}，尾=${combined.slice(-150)})`)

  let env = null
  try { env = JSON.parse(res.stdout || '') } catch (e) { assert(false, `AC-A2: stdout 合法 JSON（${e.message}，stdout=${(res.stdout || '').slice(0, 200)})`) }
  if (env) {
    assert(env.ok === true, `AC-A3: derive task-reviews ok=true（读主仓 pass review，实际 ok=${env.ok}）`)
    const blob = JSON.stringify(env)
    assert(!blob.includes('exec-COPY-999'), `AC-A4: 未读副本 marker（envelope 不含 exec-COPY-999）`)
    assert(!blob.includes('缺少 review.json'), `AC-A5: 未报缺 review.json（读到了主仓 exec-MAIN-001 的 pass review）`)
    assert(env.data?.ok === true, `AC-A6: data.ok=true（task-01 主仓 review pass）`)
  }
}

// ════════════════════════════════════════════════════════════
// 场景 B：derive task-reviews 显式 --spec-dir 副本 → 不触发 anchor → 读副本 marker（负对照）
// ════════════════════════════════════════════════════════════
console.log('\n--- 场景 B：derive task-reviews --spec-dir 副本 → 读副本 marker（负对照）---')
{
  const res = runCli(wtRoot, ['derive', 'task-reviews', '--change', changeName, '--spec-dir', copySpec, '--json'])
  const combined = (res.stdout || '') + (res.stderr || '')
  assert(res.status === 1, `AC-B1: 读副本 marker → exit=1（BLOCKED，实际 exit=${res.status}，尾=${combined.slice(-150)})`)

  let env = null
  try { env = JSON.parse(res.stdout || '') } catch (e) { assert(false, `AC-B2: stdout 合法 JSON（${e.message}）`) }
  if (env) {
    const blob = JSON.stringify(env)
    assert(blob.includes('exec-COPY-999'), `AC-B3: 读副本 marker（envelope 含 exec-COPY-999，证明 anchor 未生效时读副本）`)
    assert(blob.includes('缺少 review.json'), `AC-B4: 报缺 review.json（副本 exec-COPY-999 review 不存在）`)
    assert(env.ok === false, `AC-B5: ok=false（副本 marker 指向不存在的 review）`)
  }
}

// ════════════════════════════════════════════════════════════
// 场景 C：gate execute 副本 cwd → 自动 anchor，task-reviews check 读主仓
// ════════════════════════════════════════════════════════════
console.log('\n--- 场景 C：gate execute 副本 cwd → 自动 anchor，task-reviews check 读主仓 ---')
{
  const res = runCli(wtRoot, ['gate', 'execute', '--change', changeName, '--json'])
  const combined = (res.stdout || '') + (res.stderr || '')
  let env = null
  try { env = JSON.parse(res.stdout || '') } catch (e) { assert(false, `AC-C1: stdout 合法 JSON（${e.message}，尾=${combined.slice(-150)})`) }
  if (env) {
    const trCheck = (env.checks || []).find(c => c.id === 'task-reviews')
    assert(!!trCheck, `AC-C2: gate execute envelope 含 task-reviews check`)
    if (trCheck) {
      assert(trCheck.ok === true, `AC-C3: task-reviews check ok=true（读主仓 pass review，实际 ok=${trCheck.ok}）`)
      const blob = JSON.stringify(trCheck)
      assert(!blob.includes('exec-COPY-999'), `AC-C4: task-reviews 未读副本 marker（不含 exec-COPY-999）`)
      assert(!blob.includes('缺少 review.json'), `AC-C5: task-reviews 未报缺 review（读主仓 exec-MAIN-001）`)
    }
  }
}

cleanup()

console.log(`\n==================================================`)
console.log(`✅ 通过: ${passed}  ❌ 失败: ${failed}`)
if (failed > 0) console.log(`❌ 失败项: ${failures.join('; ')}`)
console.log(`==================================================`)
if (failed > 0) process.exit(1)
