/**
 * quick 收尾从 session guard.json 读 guard 回归测试
 * change: 2026-07-10-tooling-followups, task-01, decision: D-003@v1
 *
 * 背景：completeStep 的 quick 收尾块原用 `if (progress.quickGuard)` 驱动
 * auditQuickCompletion + session 目录清理，但 progress._write 不持久化顶层
 * quickGuard，跨进程 `--done` 时读出的 progress 无 quickGuard → 收尾整体跳过
 * → .runtime/quick-sessions/<sessionId>/ 残留僵尸。本任务把收尾改为从文件读 guard。
 *
 * 覆盖：
 *   1. 跨进程语义：启动 quick 写 session guard.json 后，用一个全新 ProgressManager
 *      实例读回 progress（强制从 db 读，模拟跨进程，progress 无 quickGuard），
 *      再推完 3 步触发收尾 → 断言 auditQuickCompletion 跑过（sessionDir 被删）。
 *   2. fallback：无 session guard.json 但有旧单文件 .runtime/quick-guard.json
 *      → 用旧文件跑审计，收尾后旧文件 + sessionDir 都被清理。
 *   3. 两者都无 → 跳过审计，仅做清理，不抛异常（brownfield）。
 *
 * 策略：进程内调 runCommand(['quick', ...])（参照 quick-session-isolation.test.mjs），
 *   captureStdout 提取 sessionId；验收 1 走完整 3 步 --done 触发收尾，
 *   验收 2/3 手工构造 fixture 直接调 runCommand --done 收尾路径。
 *
 * 隔离：mkdtempSync 临时 git 仓库 + 临时 specDir，不污染真实仓库。
 * 风格：自研 assert（无测试框架），参照 test/quick-session-isolation.test.mjs。
 */
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { execFileSync } from 'node:child_process'

import { runCommand } from '../src/run.js'
import { ProgressManager } from '../src/progress.js'

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

/** 捕获 console.log 输出，静音 console.error */
async function captureStdout(fn) {
  const orig = console.log
  let buf = ''
  console.log = (...a) => { buf += a.join(' ') + '\n' }
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

console.log('=== quick 收尾从 session guard.json 读 guard 回归测试 ===\n')

// ─────────────────────────────────────────
// 验收 1：跨进程语义 — progress 无 quickGuard，仍能从文件读 guard + 清理 sessionDir
// ─────────────────────────────────────────
console.log('--- 验收 1：跨进程 progress 无 quickGuard，收尾从文件读 guard + 清理 sessionDir ---')
{
  const repo = makeTmpDir('qsgc-xproc-')
  initGitRepo(repo)
  writeFileSync(join(repo, '.gitignore'), '.sillyspec/\n')
  writeFileSync(join(repo, 'main.js'), 'console.log(1)\n')
  git(repo, ['add', '.'])
  git(repo, ['commit', '-q', '-m', 'init'])

  const specBase = join(repo, '.sillyspec')
  const pmInit = new ProgressManager({ specDir: specBase })
  await pmInit.init(repo)

  // 启动 quick 会话（写 session guard.json）
  const out = await captureStdout(() => runCommand(['quick', 'fix bug X', '--non-interactive'], repo))
  const sid = extractSessionId(out)
  assert(sid && /^quick-[0-9a-f]{8}$/.test(sid), `启动 quick 生成合法 sessionId（${sid}）`)

  const sessionDir = join(specBase, '.runtime', 'quick-sessions', sid)
  const guardFile = join(sessionDir, 'guard.json')
  assert(existsSync(guardFile), `启动后 session guard.json 落盘在 quick-sessions/${sid}/`)

  // 模拟跨进程：用全新 ProgressManager 实例从 db 读回 progress（强制不共享内存缓存）。
  // 读回的 progress 顶层无 quickGuard 字段（_write 不持久化它）——这正是 Bug2 的触发条件。
  const pmFresh = new ProgressManager({ specDir: specBase })
  const progFresh = await pmFresh.read(repo, sid)
  assert(progFresh && progFresh.quickGuard === undefined, '跨进程读出的 progress 无 quickGuard（D-003 触发条件）')

  // 建 quicklog fixture（step3 收尾的 quicklog 存在性校验，run.js:2959-2968）
  mkdirSync(join(specBase, 'quicklog'), { recursive: true })
  writeFileSync(join(specBase, 'quicklog', 'QUICKLOG-test.md'), '## test task\n状态：进行中\n')

  // 推完 3 步，step3 --done 触发收尾（读 guard → audit → 清理 sessionDir）
  // 捕获 step3 done 的 stdout，断言审计消息出现（证明从文件读到 guard 并跑了 auditQuickCompletion）
  let step3Out = ''
  let step3Threw = null
  try {
    await captureStdout(() => runCommand(['quick', '--done', '--change', sid, '--output', 'step1 done', '--confirm'], repo))
    await captureStdout(() => runCommand(['quick', '--done', '--change', sid, '--output', 'step2 done', '--confirm'], repo))
    step3Out = await captureStdout(() => runCommand(['quick', '--done', '--change', sid, '--output', 'step3 done', '--confirm'], repo))
  } catch (e) {
    step3Threw = e
  }
  assert(step3Threw === null, `跨进程 step3 收尾不抛异常（实际 ${step3Threw ? step3Threw.message : '无'}）`)

  // 核心断言 1：即便 progress 无 quickGuard，收尾仍从文件读到 guard、跑了审计、清理了 sessionDir
  assert(!existsSync(sessionDir), `跨进程收尾后 session 目录被删除（D-003 修复，sessionDir=${sessionDir}）`)

  // 核心断言 2：审计确实执行（printQuickAuditReview 输出含「quick 变更边界审计」）
  // —— 这是「从文件读到 guard」的直接证据（guard 为空时不会打印审计行）
  assert(
    /quick 变更边界审计/.test(step3Out),
    `跨进程收尾打印了审计结果（证明从文件读到 guard 并跑了 auditQuickCompletion）`
  )

  // 注：quick 是 auxiliary 阶段（src/stages/quick.js: auxiliary=true），完成后会按设计
  // 重置 steps + stage.status 回 pending（run.js:3172-3185），以便下次 quick 重启。
  // 故「quick 阶段 = completed」不是收尾成功的正确判据，改用上面的 audit + sessionDir 清理断言。
}

// ─────────────────────────────────────────
// 验收 2：fallback — 无 session guard.json 但有旧单文件 quick-guard.json → 用旧文件审计
// ─────────────────────────────────────────
console.log('\n--- 验收 2：fallback 旧单文件 quick-guard.json 仍被审计 + 收尾清理 ---')
{
  const repo = makeTmpDir('qsgc-legacy-')
  initGitRepo(repo)
  writeFileSync(join(repo, '.gitignore'), '.sillyspec/\n')
  writeFileSync(join(repo, 'main.js'), 'console.log(1)\n')
  git(repo, ['add', '.'])
  git(repo, ['commit', '-q', '-m', 'init'])

  const specBase = join(repo, '.sillyspec')
  const pmInit = new ProgressManager({ specDir: specBase })
  await pmInit.init(repo)

  // 启动 quick（写 session guard.json）—— 然后删掉 session 目录，模拟「只有旧单文件」的老仓库
  const out = await captureStdout(() => runCommand(['quick', 'fix legacy', '--non-interactive'], repo))
  const sid = extractSessionId(out)
  const sessionDir = join(specBase, '.runtime', 'quick-sessions', sid)
  rmSync(sessionDir, { recursive: true, force: true })

  // 写旧单文件 guard（task-03 前的格式，无 sessionId 字段也容忍）
  const legacyGuardFile = join(specBase, '.runtime', 'quick-guard.json')
  writeFileSync(legacyGuardFile, JSON.stringify({
    baselineFiles: [], allowedFiles: [], allowNew: false, forceBaseline: false,
  }))
  assert(existsSync(legacyGuardFile), '旧单文件 quick-guard.json 已构造')

  mkdirSync(join(specBase, 'quicklog'), { recursive: true })
  writeFileSync(join(specBase, 'quicklog', 'QUICKLOG-test.md'), '## legacy\n')

  // 推 3 步收尾，应回退读旧单文件跑审计、不抛错、清理旧文件
  let step3Out = ''
  let threw = null
  try {
    await captureStdout(() => runCommand(['quick', '--done', '--change', sid, '--output', 's1', '--confirm'], repo))
    await captureStdout(() => runCommand(['quick', '--done', '--change', sid, '--output', 's2', '--confirm'], repo))
    step3Out = await captureStdout(() => runCommand(['quick', '--done', '--change', sid, '--output', 's3', '--confirm'], repo))
  } catch (e) {
    threw = e
  }
  assert(threw === null, `fallback 场景 step3 收尾不抛异常（实际 ${threw ? threw.message : '无'}）`)
  // fallback：从旧单文件读到 guard → 跑了审计（stdout 含审计行）
  assert(/quick 变更边界审计/.test(step3Out), `fallback 从旧单文件读 guard 并跑了审计`)
  assert(!existsSync(legacyGuardFile), '收尾后旧单文件 quick-guard.json 被清理（兜底 unlink）')
}

// ─────────────────────────────────────────
// 验收 3：两者都无 → 跳过审计，仅清理，不抛异常（brownfield）
// ─────────────────────────────────────────
console.log('\n--- 验收 3：无任何 guard 文件 → 跳过审计仅清理，不抛异常 ---')
{
  const repo = makeTmpDir('qsgc-empty-')
  initGitRepo(repo)
  writeFileSync(join(repo, '.gitignore'), '.sillyspec/\n')
  writeFileSync(join(repo, 'main.js'), 'console.log(1)\n')
  git(repo, ['add', '.'])
  git(repo, ['commit', '-q', '-m', 'init'])

  const specBase = join(repo, '.sillyspec')
  const pmInit = new ProgressManager({ specDir: specBase })
  await pmInit.init(repo)

  const out = await captureStdout(() => runCommand(['quick', 'fix noGuard', '--non-interactive'], repo))
  const sid = extractSessionId(out)
  const sessionDir = join(specBase, '.runtime', 'quick-sessions', sid)
  const legacyGuardFile = join(specBase, '.runtime', 'quick-guard.json')

  // 清空所有 guard（session 目录 + 旧单文件都不存在）
  rmSync(sessionDir, { recursive: true, force: true })
  rmSync(legacyGuardFile, { force: true })
  assert(!existsSync(sessionDir) && !existsSync(legacyGuardFile), '已清空所有 guard 文件')

  mkdirSync(join(specBase, 'quicklog'), { recursive: true })
  writeFileSync(join(specBase, 'quicklog', 'QUICKLOG-test.md'), '## noGuard\n')

  // 推 3 步收尾，guard 为空 → 跳过 auditQuickCompletion，仅清理，不抛错
  let step3Out = ''
  let threw = null
  try {
    await captureStdout(() => runCommand(['quick', '--done', '--change', sid, '--output', 's1', '--confirm'], repo))
    await captureStdout(() => runCommand(['quick', '--done', '--change', sid, '--output', 's2', '--confirm'], repo))
    step3Out = await captureStdout(() => runCommand(['quick', '--done', '--change', sid, '--output', 's3', '--confirm'], repo))
  } catch (e) {
    threw = e
  }
  assert(threw === null, `无 guard 场景 step3 收尾不抛异常（brownfield，实际 ${threw ? threw.message : '无'}）`)
  // guard 为空 → 不跑 auditQuickCompletion → stdout 不含审计行（反向证明跳过了审计）
  assert(!/quick 变更边界审计/.test(step3Out), `无 guard 时跳过审计（stdout 不含审计行）`)
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
