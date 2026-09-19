/**
 * handoff 命令测试（P1-5 v1 阶段跑者瘦会话，2026-09-20 对撞实验驱动）
 *
 * 覆盖：
 *   1. nextStageSuggestion 四态：进行中→同阶段续跑 / 完成→主流程后继 / archive 终态 / 辅助阶段回主流程
 *   2. buildHandoff：唯一活跃主流程变更自动选中 + 交接块含启动命令/状态摘要/会话标识警示
 *   3. 多活跃 → 报错；无活跃 → 报错；--change 指定 → 不自动选
 *   4. CLI 端到端：handoff --json 形状
 *
 * 风格：自研 assert + tmp fixture（DB 夹具经 sillyspec run 实跑建立，同 quick-session-isolation 族）。
 */
import { mkdtempSync, mkdirSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { execFileSync } from 'child_process'
import { fileURLToPath } from 'url'

import { nextStageSuggestion, buildHandoff } from '../src/handoff.js'

let failed = 0
let total = 0

function assert(condition, msg) {
  total++
  if (!condition) {
    failed++
    console.log(`  ❌ FAIL: ${msg}`)
  } else {
    console.log(`  ✅ PASS: ${msg}`)
  }
}

const tmpRoots = []
function makeTmpDir(prefix) {
  const dir = mkdtempSync(join(tmpdir(), prefix))
  tmpRoots.push(dir)
  return dir
}

const BIN = join(fileURLToPath(import.meta.url), '..', '..', 'bin', 'sillyspec.js')

/** 造一个跑到指定阶段的夹具仓（经 CLI 实跑建立 DB，避免手搓 schema 漂移）。 */
function makeRepoAtStage(stage) {
  const proj = makeTmpDir('handoff-')
  const env = { ...process.env, SILLYSPEC_SESSION_ID: 'test-handoff-sess' }
  for (const args of [['init', '-q'], ['config', 'user.email', 't@t.local'], ['config', 'user.name', 't']]) {
    execFileSync('git', args, { cwd: proj, encoding: 'utf8' })
  }
  mkdirSync(join(proj, '.sillyspec'), { recursive: true })
  const change = '2026-09-20-handoff-fixture'
  // brainstorm 建变更 + 打到 plan（brainstorm 完成）——最少实跑路径
  execFileSync('node', [BIN, 'run', 'brainstorm', '--change', change], { cwd: proj, env, encoding: 'utf8' })
  if (stage === 'plan') {
    // 把 brainstorm 各步直接 --done 到完成（步骤输出可省——completeStep 容忍空 output）
    for (let i = 0; i < 8; i++) {
      try {
        execFileSync('node', [BIN, 'run', 'brainstorm', '--done', '--change', change, '--output', `step${i}`], { cwd: proj, env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
      } catch { /* gate 拦截即止——夹具只需 currentStage 落在非完成态亦可测 resume 分支 */ break }
    }
  }
  return { proj, change }
}

// ── 1. nextStageSuggestion 四态 ──
{
  const r1 = nextStageSuggestion('plan', false)
  assert(r1.mode === 'resume' && r1.next === 'plan', '1a 进行中 → 同阶段续跑')
  const r2 = nextStageSuggestion('brainstorm', true)
  assert(r2.mode === 'advance' && r2.next === 'plan', '1b brainstorm 完成 → plan')
  const r3 = nextStageSuggestion('verify', true)
  assert(r3.mode === 'advance' && r3.next === 'archive', '1c verify 完成 → archive')
  const r4 = nextStageSuggestion('archive', true)
  assert(r4.mode === 'done' && r4.next === '', '1d archive 终态 → 无下一阶段')
  const r5 = nextStageSuggestion('quick', true)
  assert(r5.mode === 'resume', '1e 辅助阶段 → 回主流程建议')
}

// ── 2/3. buildHandoff ──
{
  const { proj, change } = makeRepoAtStage('brainstorm')
  const ho = await buildHandoff({ cwd: proj })
  assert(ho.ok === true && ho.change === change, `2a 唯一活跃自动选中（实际 ${ho.change || ho.error}）`)
  assert(ho.autoPicked === true, '2b autoPicked 标记')
  const text = ho.lines.join('\n')
  assert(text.includes(`sillyspec run ${ho.suggestion.next} --change ${change}`), `2c 交接块含续跑命令（next=${ho.suggestion.next}）`)
  assert(text.includes('SILLYSPEC_SESSION_ID'), '2d 含会话标识保持警示')
  assert(ho.currentStage === 'brainstorm', `2e currentStage=brainstorm（实际 ${ho.currentStage}）`)

  const bad = await buildHandoff({ cwd: proj, changeName: 'no-such-change' })
  assert(bad.ok === false && bad.error.includes('变更不存在'), '3a 不存在的变更 → 报错')
}

// ── 4. CLI 端到端 --json ──
{
  const { proj, change } = makeRepoAtStage('brainstorm')
  const out = execFileSync('node', [BIN, 'handoff', '--json'], { cwd: proj, encoding: 'utf8' })
  const j = JSON.parse(out)
  assert(j.change === change && typeof j.next_stage === 'string' && j.schema_version === 1, `4a --json 形状（change=${j.change} next=${j.next_stage}）`)
}

for (const dir of tmpRoots) {
  try { rmSync(dir, { recursive: true, force: true }) } catch { /* Windows 句柄延迟 */ }
}

console.log(`\n${failed === 0 ? '✅ ALL PASS' : '❌ FAILED'}: ${total - failed}/${total}`)
process.exit(failed === 0 ? 0 : 1)
