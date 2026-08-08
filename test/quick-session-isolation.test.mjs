/**
 * quick 会话隔离回归测试（change: 2026-07-10-quick-session-isolation, task-06）
 *
 * 覆盖 plan.md 全局验收 1-5：
 *   1. 两 quick 会话 DB 状态独立（progress.quick-<uuidA> vs progress.quick-<uuidB>），steps 不互覆盖
 *   2. --done 各推各的（A 推进 step1，B 不受影响；各自收敛路径独立）
 *   3. quick-guard.json 按 session 隔离（.runtime/quick-sessions/<sid>/guard.json 各自存在，不互覆盖）
 *   4. worktree-guard hook 合并所有活跃 session guard（baselineFiles 并集，两 session 各自放行）
 *   5. 向后兼容（旧单文件 quick-guard.json 仍并入并集，hook 不崩）
 *
 * 策略：
 *   - 验收 1/2/3：进程内调 runCommand(['quick', ...])（task-01 子代理的进程内调用范例），
 *     stdout 捕获 sessionId（📌 本 quick 会话 sessionId: quick-<uuid8>），
 *     再用全新 ProgressManager 实例从 DB 读回（强制从 db 读，跨实例不共享内存缓存）。
 *   - 验收 4/5：构造 quick-sessions 下各 session 的 guard.json fixture，调 shouldBlock（公共 API）
 *     验证 hook 合并行为（readAllQuickGuards 内部合并，D-002）。
 *
 * 隔离：mkdtempSync 临时 git 仓库 + 临时 specDir，不污染真实仓库。
 * 风格：自研 assert（无测试框架），参照 test/agent-gate-hardening.test.mjs。
 */
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { execFileSync } from 'node:child_process'

import { runCommand } from '../src/run.js'
import { ProgressManager } from '../src/progress.js'
import { shouldBlock } from '../src/hooks/worktree-guard.js'
import { DB } from '../src/db.js'

// task-10 废 gate-status.json 后，readCurrentStage 直读 sillyspec.db。验收 4/5/5補 的 hook
// 场景无 runCommand（不自带建库），需手动建 sillyspec.db 并种 active change 行，既让
// findProjectRoot 命中 temp repo（否则会向上撞到用户 home 的 .sillyspec），又让
// readCurrentStage 读出 current_stage='quick' 以触发 baseline 并集保护路径。
function seedStageDb(repo, stage, { name = 'test-active', noWorktree = 0 } = {}) {
  const db = new DB(join(repo, '.sillyspec', '.runtime', 'sillyspec.db'))
  db.init()
  const sq = db.getDb()
  sq.prepare("INSERT OR IGNORE INTO project (id,name,created_at,updated_at) VALUES (1,'p','t','t')").run()
  sq.prepare('DELETE FROM changes WHERE name = ?').run(name)
  sq.prepare("INSERT INTO changes (name,current_stage,status,no_worktree,created_at,last_active) VALUES (?,?,?,?,'t','t')")
    .run(name, stage, 'active', noWorktree ? 1 : 0)
  db.close()
}

let total = 0
let failed = 0

function assert(condition, msg) {
  total++
  if (!condition) {
    failed++
    console.log(`  ❌ FAIL: ${msg}`)
  } else {
    console.log(`  ✅ PASS: ${msg}`)
  }
}

function git(dir, args) {
  return execFileSync('git', args, { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
}

function initGitRepo(dir) {
  git(dir, ['init', '-q'])
  git(dir, ['config', 'user.email', 'test@test.local'])
  git(dir, ['config', 'user.name', 'test'])
  git(dir, ['config', 'commit.gpgsign', 'false'])
}

const tmpRoots = []
function makeTmpDir(prefix) {
  const dir = mkdtempSync(join(tmpdir(), prefix))
  tmpRoots.push(dir)
  return dir
}

/** 捕获 console.log 输出（runCommand 用 console.log 打印 sessionId） */
async function captureStdout(fn) {
  const orig = console.log
  let buf = ''
  console.log = (...a) => { buf += a.join(' ') + '\n' }
  // console.error 也静音（[sync] 未连接平台 等），但不下断言信息
  const origErr = console.error
  console.error = () => {}
  try {
    await fn()
  } finally {
    console.log = orig
    console.error = origErr
  }
  return buf
}

/** 从 runCommand stdout 提取 sessionId（quick-<8hex>） */
function extractSessionId(stdout) {
  const m = stdout.match(/sessionId:\s*(quick-[0-9a-f]{8})/)
  return m ? m[1] : null
}

console.log('=== quick 会话隔离回归测试 ===\n')

// ─────────────────────────────────────────
// 验收 1/2/3：两 quick 会话 DB 独立 + --done 各推 + guard 按 session 隔离
// ─────────────────────────────────────────
console.log('--- 验收 1/2/3：多会话 DB 隔离 + --done 各推 + guard 按 session ---')
{
  const repo = makeTmpDir('qsi-repo-')
  initGitRepo(repo)
  // .sillyspec/ 加入 gitignore：避免 .sillyspec 的元数据写入污染 git status，
  // 也保证 quick 启动时记录的 baselineFiles 不含 .sillyspec/ 噪声
  writeFileSync(join(repo, '.gitignore'), '.sillyspec/\n')
  writeFileSync(join(repo, 'main.js'), 'console.log(1)\n')
  git(repo, ['add', '.'])
  git(repo, ['commit', '-q', '-m', 'init'])

  const specBase = join(repo, '.sillyspec')
  // 先用 ProgressManager 初始化 project 行（runCommand 在空 project 表下也能自愈，但显式 init 更稳）
  const pmInit = new ProgressManager({ specDir: specBase })
  await pmInit.init(repo)

  // ── 启动会话 A ──
  const outA = await captureStdout(() => runCommand(['quick', 'fix bug A', '--non-interactive'], repo))
  const sidA = extractSessionId(outA)
  assert(sidA && /^quick-[0-9a-f]{8}$/.test(sidA), `会话 A 生成合法 sessionId（${sidA}）`)

  // ── 启动会话 B（A 尚未 --done，模拟并发） ──
  const outB = await captureStdout(() => runCommand(['quick', 'fix bug B', '--non-interactive'], repo))
  const sidB = extractSessionId(outB)
  assert(sidB && /^quick-[0-9a-f]{8}$/.test(sidB), `会话 B 生成合法 sessionId（${sidB}）`)
  assert(sidA !== sidB, '两会话 sessionId 互不相同（D-003 UUID8hex 防并发撞名）')

  // ── 验收 1：两会话 DB 行独立，steps 不互覆盖 ──
  // 全新 ProgressManager 实例（强制从 db 读，跨实例不共享内存缓存）
  const pmA = new ProgressManager({ specDir: specBase })
  const progA = await pmA.read(repo, sidA)
  const pmB = new ProgressManager({ specDir: specBase })
  const progB = await pmB.read(repo, sidB)

  assert(progA && progA.stages.quick, `会话 A progress.quick-${sidA.slice(6)} 行存在`)
  assert(progB && progB.stages.quick, `会话 B progress.quick-${sidB.slice(6)} 行存在`)
  assert(
    progA && progA.stages.quick && progA.stages.quick.steps
      && progA.stages.quick.steps.length === 3,
    `会话 A quick steps = 3（实际 ${progA?.stages?.quick?.steps?.length}）`
  )
  assert(
    progB && progB.stages.quick && progB.stages.quick.steps
      && progB.stages.quick.steps.length === 3,
    `会话 B quick steps = 3（实际 ${progB?.stages?.quick?.steps?.length}）`
  )
  // 启动后两会话 step1 都应是 pending（互不干扰）
  assert(
    progA.stages.quick.steps[0].status === 'pending'
      && progB.stages.quick.steps[0].status === 'pending',
    '启动后两会话 step1 均为 pending（DB 分行，不共享单行 default）'
  )

  // ── 验收 2：--done 各推各的（A 推进 step1，B 不受影响） ──
  // 只做 step1 的 --done（避开 step3 的 auditQuickCompletion，聚焦"各推"语义）
  await captureStdout(() => runCommand(
    ['quick', '--done', '--change', sidA, '--output', 'A step1 done', '--confirm'],
    repo
  ))
  // 用全新 PM 读回，确认 A 推进了、B 没动
  const pmA2 = new ProgressManager({ specDir: specBase })
  const progA2 = await pmA2.read(repo, sidA)
  const pmB2 = new ProgressManager({ specDir: specBase })
  const progB2 = await pmB2.read(repo, sidB)
  assert(
    progA2.stages.quick.steps[0].status === 'completed',
    `A --done 后 A.step1 = completed（实际 ${progA2.stages.quick.steps[0].status}）`
  )
  assert(
    progB2.stages.quick.steps[0].status === 'pending',
    `A --done 后 B.step1 仍 = pending（不互覆盖，实际 ${progB2.stages.quick.steps[0].status}）`
  )

  // ── 验收 3：guard 按 session 隔离 ──
  const guardAPath = join(specBase, '.runtime', 'quick-sessions', sidA, 'guard.json')
  const guardBPath = join(specBase, '.runtime', 'quick-sessions', sidB, 'guard.json')
  assert(existsSync(guardAPath), `会话 A guard.json 落盘在 quick-sessions/${sidA}/`)
  assert(existsSync(guardBPath), `会话 B guard.json 落盘在 quick-sessions/${sidB}/`)
  // guard.json 含 sessionId 字段（D-002：按 session 存，guard 自带 sessionId 标识）
  if (existsSync(guardAPath) && existsSync(guardBPath)) {
    const ga = JSON.parse(readFileSync(guardAPath, 'utf8'))
    const gb = JSON.parse(readFileSync(guardBPath, 'utf8'))
    assert(ga.sessionId === sidA, `A guard.sessionId === ${sidA}（实际 ${ga.sessionId}）`)
    assert(gb.sessionId === sidB, `B guard.sessionId === ${sidB}（实际 ${gb.sessionId}）`)
  }
}

// ─────────────────────────────────────────
// 验收 4：hook 合并所有活跃 session guard（baselineFiles 并集）
// ─────────────────────────────────────────
console.log('\n--- 验收 4：worktree-guard hook 合并多 session guard ---')
{
  const repo = makeTmpDir('qsi-hook-')
  const specBase = join(repo, '.sillyspec')
  const runtimeDir = join(specBase, '.runtime')
  mkdirSync(runtimeDir, { recursive: true })
  // 设当前阶段为 quick（readCurrentStage 直读 sillyspec.db current_stage）
  seedStageDb(repo, 'quick')

  // 两 session，各自 baselineFiles 不同
  const sidA = 'quick-aaaa1111'
  const sidB = 'quick-bbbb2222'
  const sessionsDir = join(runtimeDir, 'quick-sessions')
  mkdirSync(join(sessionsDir, sidA), { recursive: true })
  mkdirSync(join(sessionsDir, sidB), { recursive: true })
  writeFileSync(join(sessionsDir, sidA, 'guard.json'), JSON.stringify({
    sessionId: sidA, baselineFiles: ['src/a.js'], allowedFiles: ['src/a-fix.js'],
  }))
  writeFileSync(join(sessionsDir, sidB, 'guard.json'), JSON.stringify({
    sessionId: sidB, baselineFiles: ['src/b.js'], allowedFiles: ['src/b-fix.js'],
  }))

  // hook 合并后，A 的 baseline 文件应被拦截（D-002：并集 = 保护所有 session 的 baseline）
  const r1 = shouldBlock({ tool: 'Bash', command: 'sed -i "s/x/y/" src/a.js' }, { cwd: repo })
  assert(r1.blocked, `hook 合并后拦截 A 的 baseline 文件 src/a.js（bash sed 重写）`)

  // B 的 baseline 文件也应被拦截（两会话各自受保护，不误放行）
  const r2 = shouldBlock({ tool: 'Bash', command: 'sed -i "s/x/y/" src/b.js' }, { cwd: repo })
  assert(r2.blocked, `hook 合并后拦截 B 的 baseline 文件 src/b.js（两会话各自受保护）`)

  // 既非 A 也非 B baseline 的安全命令应放行（hook 不过度拦截）
  const r3 = shouldBlock({ tool: 'Bash', command: 'echo hello' }, { cwd: repo })
  assert(!r3.blocked, `安全命令 echo hello 放行（不过度拦截）`)

  // 单独验证：只有 A 一个 session 时，B 的 baseline 不在并集里 → 不被 A 的 guard 拦截
  rmSync(join(sessionsDir, sidB), { recursive: true, force: true })
  const r4 = shouldBlock({ tool: 'Bash', command: 'sed -i "s/x/y/" src/b.js' }, { cwd: repo })
  assert(!r4.blocked, `删 B session 后，src/b.js 不再被 A 的 guard 误拦（并集收敛到 A）`)
}

// ─────────────────────────────────────────
// 验收 5：向后兼容 — 旧单文件 quick-guard.json 仍可读（hook 不崩，并入并集）
// ─────────────────────────────────────────
console.log('\n--- 验收 5：向后兼容（旧单文件 quick-guard.json 并入并集） ---')
{
  const repo = makeTmpDir('qsi-legacy-')
  const specBase = join(repo, '.sillyspec')
  const runtimeDir = join(specBase, '.runtime')
  mkdirSync(runtimeDir, { recursive: true })
  seedStageDb(repo, 'quick')

  // 旧格式：单文件 quick-guard.json（task-03 前，无 session 目录）
  writeFileSync(join(runtimeDir, 'quick-guard.json'), JSON.stringify({
    baselineFiles: ['src/legacy.js'], allowedFiles: [],
  }))

  // hook 读旧单文件不崩，且并入并集 → legacy baseline 被拦截
  const r1 = shouldBlock({ tool: 'Bash', command: 'sed -i "s/x/y/" src/legacy.js' }, { cwd: repo })
  assert(r1.blocked, `旧单文件 quick-guard.json 被读并入并集，src/legacy.js 被拦截`)

  // 旧 + 新 session guard 共存：并集包含两者 baseline
  const sessionsDir = join(runtimeDir, 'quick-sessions')
  mkdirSync(join(sessionsDir, 'quick-cccc3333'), { recursive: true })
  writeFileSync(join(sessionsDir, 'quick-cccc3333', 'guard.json'), JSON.stringify({
    sessionId: 'quick-cccc3333', baselineFiles: ['src/new.js'],
  }))
  const r2 = shouldBlock({ tool: 'Bash', command: 'sed -i "s/x/y/" src/new.js' }, { cwd: repo })
  assert(r2.blocked, `新 session guard + 旧单文件并存，新 baseline src/new.js 也被拦截`)
  const r3 = shouldBlock({ tool: 'Bash', command: 'sed -i "s/x/y/" src/legacy.js' }, { cwd: repo })
  assert(r3.blocked, `新 session guard + 旧单文件并存，旧 baseline src/legacy.js 仍被拦截`)
}

// ─────────────────────────────────────────
// 验收 5（补充）：无任何 guard 时 hook 不崩
// ─────────────────────────────────────────
console.log('\n--- 验收 5 补充：无 guard 目录时 hook 不崩 ---')
{
  const repo = makeTmpDir('qsi-empty-')
  const specBase = join(repo, '.sillyspec')
  const runtimeDir = join(specBase, '.runtime')
  mkdirSync(runtimeDir, { recursive: true })
  seedStageDb(repo, 'quick')

  // 无 quick-sessions/ 目录、无 quick-guard.json → hook 不崩，放行非危险命令
  let threw = false
  let result
  try {
    result = shouldBlock({ tool: 'Bash', command: 'echo hi' }, { cwd: repo })
  } catch (e) {
    threw = true
  }
  assert(!threw, `无 guard 目录时 shouldBlock 不抛异常`)
  assert(result && !result.blocked, `无 guard 时安全命令放行`)
}

// ─────────────────────────────────────────
// 清理 & 汇总
// ─────────────────────────────────────────
for (const dir of tmpRoots) {
  try { rmSync(dir, { recursive: true, force: true }) } catch {}
}

console.log('\n==================================================')
console.log(`✅ 通过: ${total - failed}  ❌ 失败: ${failed}`)
console.log('==================================================')
if (failed > 0) process.exit(1)
