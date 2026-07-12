/**
 * quick 中途启动不 reset steps 回归测试
 *
 * 对应 docs/sillyspec/quick-state-reset-platform-mode.md：
 * in-progress 的 quick（部分 step 已 --done）再次 `sillyspec run quick`（非 --done，如查 prompt）
 * 时，原 run.js 无条件 reset 所有 steps 为 pending → 丢已 done 的进度，progress 回退 Step 1。
 *
 * 修复：去掉无条件 reset；in-progress 保留进度（completed 重跑由 runStage currentIdx===-1 兜底）。
 *
 * 风格：自研 assert + mkdtemp 临时 git 仓库，参照 quick-session-isolation.test.mjs
 */
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
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

const tmpRoots = []
function makeTmpDir(prefix) {
  const dir = mkdtempSync(join(tmpdir(), prefix))
  tmpRoots.push(dir)
  return dir
}

async function captureStdout(fn) {
  const orig = console.log
  const origErr = console.error
  const origWarn = console.warn
  let buf = ''
  console.log = (...a) => { buf += a.join(' ') + '\n' }
  console.error = () => {}
  console.warn = () => {}
  try { await fn(); return buf } finally { console.log = orig; console.error = origErr; console.warn = origWarn }
}

function extractSessionId(out) {
  const m = out.match(/sessionId:\s*(quick-[0-9a-f]{8})/)
  return m ? m[1] : null
}

async function main() {
  const repo = makeTmpDir('qk-reset-')
  git(repo, ['init', '-q'])
  git(repo, ['config', 'user.email', 't@t.local'])
  git(repo, ['config', 'user.name', 't'])
  git(repo, ['config', 'commit.gpgsign', 'false'])
  writeFileSync(join(repo, '.gitignore'), '.sillyspec/\n')
  writeFileSync(join(repo, 'main.js'), 'console.log(1)\n')
  git(repo, ['add', '.'])
  git(repo, ['commit', '-q', '-m', 'init'])
  const specBase = join(repo, '.sillyspec')
  const pmInit = new ProgressManager({ specDir: specBase })
  await pmInit.init(repo)

  // 1. 启动 quick 会话
  const out1 = await captureStdout(() => runCommand(['quick', 'fix bug', '--non-interactive'], repo))
  const sid = extractSessionId(out1)
  assert(sid && /^quick-[0-9a-f]{8}$/.test(sid), `sessionId 生成（${sid}）`)

  // 2. --done step0（理解任务）→ step0 completed
  await captureStdout(() => runCommand(
    ['quick', '--done', '--change', sid, '--output', 'understood', '--confirm'],
    repo
  ))
  const pm1 = new ProgressManager({ specDir: specBase })
  const prog1 = await pm1.read(repo, sid)
  assert(
    prog1.stages.quick.steps[0].status === 'completed',
    `--done 后 step0 = completed（实际 ${prog1.stages.quick.steps[0].status}）`
  )

  // 3. 再次 runCommand ['quick', '--change', sid]（非 --done，模拟查 prompt）
  //    修复前：run.js 1647 无条件 reset → step0 变 pending；修复后：保留 completed
  await captureStdout(() => runCommand(['quick', '--change', sid, '--non-interactive'], repo))

  // 4. 核心：step0 应仍 completed（in-progress 不被 reset）
  const pm2 = new ProgressManager({ specDir: specBase })
  const prog2 = await pm2.read(repo, sid)
  assert(
    prog2.stages.quick.steps[0].status === 'completed',
    `再次启动 quick 不 reset step0（实际 ${prog2.stages.quick.steps[0].status}，修复前会 pending）`
  )
  assert(
    prog2.stages.quick.steps.length === 3 && prog2.stages.quick.steps[1].status === 'pending',
    `step1 仍 pending（未倒退，进度保留）`
  )

  for (const d of tmpRoots) {
    try { rmSync(d, { recursive: true, force: true }) } catch {}
  }

  console.log('')
  console.log('==================================================')
  console.log(`✅ 通过: ${total - failed}  ❌ 失败: ${failed}`)
  console.log('==================================================')
  if (failed > 0) process.exit(1)
}

main().catch(e => {
  console.error('测试异常:', e)
  process.exit(1)
})
