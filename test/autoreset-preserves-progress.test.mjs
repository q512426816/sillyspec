/**
 * currentIdx===-1 崩溃中间态回归：
 *   所有 step 已 completed/skips，但 stage 未盖到 completed（最后一步完成后、stage 升级
 *   事务未提交之间崩溃）时，sillyspec run <stage> 重跑不得清空已完成步骤。
 *
 *   旧 run.js:2123 无条件把 steps 重置为 pending → 进度不可恢复丢失。
 *   修复：走 completeStage——产物齐则补盖 completed，不齐则保留进度 + actionable 提示。
 *
 *   构造要点：必须用「真实 step 名」。runStage 会 getStageSteps 刷新 steps 结构并按名做
 *   step-migration 保留已完成状态——假名会被当全新步骤重置成 pending，无法触发 currentIdx===-1。
 *   故先 in-process 跑一次 brainstorm 拿到真实 steps，再全部置 completed + stage=in-progress。
 *
 * 风格：自研 assert + mkdtemp 临时 git 仓库；spawnSync 跑 CLI 以捕获 process.exit。
 */
import { spawnSync, execFileSync } from 'node:child_process'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { runCommand } from '../src/run.js'
import { ProgressManager } from '../src/progress.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const cliBin = resolve(__dirname, '..', 'bin', 'sillyspec.js')

let passed = 0
let failed = 0
const assert = (c, m) => {
  if (c) { passed++; console.log('  ✅ ' + m) }
  else { failed++; console.error('  ❌ ' + m) }
}
const git = (dir, args) =>
  execFileSync('git', args, { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()

async function captureStdout(fn) {
  const orig = console.log
  const origErr = console.error
  const origWarn = console.warn
  console.log = () => {}
  console.error = () => {}
  console.warn = () => {}
  try { await fn() } finally { console.log = orig; console.error = origErr; console.warn = origWarn }
}

const repo = mkdtempSync(join(tmpdir(), 'autoreset-'))
try {
  git(repo, ['init', '-q'])
  git(repo, ['config', 'user.email', 't@t.local'])
  git(repo, ['config', 'user.name', 't'])
  git(repo, ['config', 'commit.gpgsign', 'false'])
  writeFileSync(join(repo, '.gitignore'), '.sillyspec/\n')
  writeFileSync(join(repo, 'main.js'), 'console.log(1)\n')
  git(repo, ['add', '.'])
  git(repo, ['commit', '-q', '-m', 'init'])

  const specBase = join(repo, '.sillyspec')
  const pm0 = new ProgressManager({ specDir: specBase })
  await pm0.init(repo)

  // 1. 先 in-process 跑一次 brainstorm，让 runStage 初始化真实 steps（名取自 stage 定义）
  await captureStdout(() => runCommand(['brainstorm', '--change', 'test-change', '--non-interactive'], repo))

  // 2. 读真实 steps，全部置 completed + stage 回退为 in-progress（模拟崩溃中间态）；
  //    不写 design.md → completeStage 产物校验将失败 → 应走"保留进度 + 提示"分支。
  const pm1 = new ProgressManager({ specDir: specBase })
  const prog = await pm1.read(repo, 'test-change')
  if (!prog.stages.brainstorm || !prog.stages.brainstorm.steps?.length) {
    console.error('  ⚠️ 前置失败：brainstorm steps 未初始化'); failed++;
  } else {
    prog.currentStage = 'brainstorm'
    prog.stages.brainstorm.steps = prog.stages.brainstorm.steps.map(s => ({ ...s, status: 'completed', completedAt: 't' }))
    prog.stages.brainstorm.status = 'in-progress'
    prog.stages.brainstorm.completedAt = null
    await pm1._write(repo, prog, 'test-change')

    // 3. spawnSync 重跑 brainstorm → steps 全 completed（真实名，migration 保留）→ currentIdx===-1
    const res = spawnSync(process.execPath,
      [cliBin, 'run', 'brainstorm', '--change', 'test-change', '--non-interactive'],
      { cwd: repo, encoding: 'utf8', timeout: 15000 })
    const combined = (res.stdout || '') + (res.stderr || '')

    // 核心：步骤进度保留，绝不被清空为 pending
    const prog2 = await new ProgressManager({ specDir: specBase }).read(repo, 'test-change')
    const allDone = prog2.stages.brainstorm.steps.every(s => s.status === 'completed')
    assert(allDone, '崩溃中间态重跑后步骤进度保留（未被清空）')

    // 不再出现破坏性的"已自动重置"
    assert(!combined.includes('已自动重置'), '不再输出"已自动重置"破坏性提示')

    // 给出 actionable 指引
    const actionable = combined.includes('补盖完成戳') || combined.includes('已保留步骤进度')
    assert(actionable, '给出补盖/保留进度的明确指引')
  }
} finally {
  try { rmSync(repo, { recursive: true, force: true }) } catch {}
}

console.log(`\n${'='.repeat(50)}`)
console.log(`✅ 通过: ${passed}  ❌ 失败: ${failed}`)
console.log(`${'='.repeat(50)}`)
if (failed > 0) process.exit(1)
