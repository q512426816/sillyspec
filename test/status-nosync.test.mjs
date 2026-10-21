/**
 * FR-06（2026-10-21-protocol-tax）：只读命令不触发平台同步。
 *
 * 锁定行为（用 DEBUG_SILLYSPEC_TIMING 的 sync 段做确定性判据——sync 段包住
 * triggerSync/triggerSyncTerminalStrict/syncSpecTree/triggerPullActiveChange 全族，
 * n/a ⟺ 本命令零调用同步族；数字 ⟺ 调过）：
 *   1. status --change <名>（只读查看）→ sync=n/a（入口 pull 跳过、重播种后不推）
 *   2. progress show（只读）→ sync=n/a
 *   3. task tick（写命令对照）→ sync=<数字>ms（写路径同步语义不变）
 *
 * 验收计时（消费仓 status 6.3s→<1.5s）属真实平台环境实测，记录在变更 decisions.md，
 * 不在无平台的单测 fixture 里伪造。
 */
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { makeRepo, initChange, seedStage, runCLI, cleanup, report } from './_cli-step-harness.mjs'

const count = { passed: 0, failed: 0, failures: [] }
const assert = (cond, msg) => { cond ? (count.passed++, console.log(`  ✅ PASS: ${msg}`)) : (count.failed++, count.failures.push(msg), console.log(`  ❌ FAIL: ${msg}`)) }

const BRAINSTORM_STEPS = [
  '进度确认', '加载项目上下文', '对话式探索与需求澄清', '提出 2-3 种方案',
  '分段展示设计', '写设计文档并自审', 'Design Grill 交叉审查', '生成规范文件',
]
const TIMING_ENV = { DEBUG_SILLYSPEC_TIMING: '1' }
const timingLine = (s) => (s.match(/\[timing\][^\n]*/) || [null])[0]

async function seedFixture(cwd, specBase, cn) {
  const pm = await initChange(cwd, specBase, cn)
  runCLI(['--dir', cwd, 'run', 'brainstorm', '--change', cn], { cwd })
  await seedStage(pm, cwd, cn, 'brainstorm',
    BRAINSTORM_STEPS.map((name, i) => ({ name, status: i < 1 ? 'completed' : 'pending' })))
  writeFileSync(join(specBase, 'changes', cn, 'tasks.md'), '# Tasks\n\n- [ ] task-01: 示例任务\n')
}

console.log('=== FR-06 只读命令不触发平台同步（sync 段确定性判据）===\n')

console.log('--- Case 1: status --change → sync=n/a（零调用同步族） ---')
{
  const { cwd, specBase } = makeRepo('cli-nosync-1-')
  const cn = '2026-07-25-nosync-status'
  await seedFixture(cwd, specBase, cn)
  const r = runCLI(['--dir', cwd, 'status', '--change', cn], { cwd, env: TIMING_ENV })
  const line = timingLine(r.combined)
  assert(line !== null, `输出含 [timing] 行（实际：${r.combined.slice(-140)}）`)
  if (line) {
    assert(/\bsync=n\/a\b/.test(line), `status 的 sync=n/a（行：${line}）——只读零调用同步族`)
  }
}

console.log('--- Case 2: progress show → sync=n/a ---')
{
  const { cwd, specBase } = makeRepo('cli-nosync-2-')
  const cn = '2026-07-25-nosync-progress'
  await seedFixture(cwd, specBase, cn)
  const r = runCLI(['--dir', cwd, 'progress', 'show', '--change', cn], { cwd, env: TIMING_ENV })
  const line = timingLine(r.combined)
  assert(line !== null, `输出含 [timing] 行`)
  if (line) {
    assert(/\bsync=n\/a\b/.test(line), `progress show 的 sync=n/a（行：${line}）`)
  }
}

console.log('--- Case 3: task tick（写命令对照）→ sync=<数字>ms ---')
{
  const { cwd, specBase } = makeRepo('cli-nosync-3-')
  const cn = '2026-07-25-nosync-write'
  await seedFixture(cwd, specBase, cn)
  const r = runCLI(['--dir', cwd, 'task', 'tick', '--change', cn, '--task', 'task-01'], { cwd, env: TIMING_ENV })
  const line = timingLine(r.combined)
  assert(r.status === 0, `tick exit 0（实际 ${r.status}，尾：${r.combined.slice(-120)}）`)
  assert(line !== null, `输出含 [timing] 行`)
  if (line) {
    assert(/\bsync=\d+ms\b/.test(line), `写命令 sync 为数字值（行：${line}）——写路径同步语义不变`)
  }
}

cleanup()
report(count.passed, count.failed, count.failures)
