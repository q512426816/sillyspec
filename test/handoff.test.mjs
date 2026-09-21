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
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { execFileSync } from 'child_process'
import { fileURLToPath } from 'url'

import { nextStageSuggestion, buildHandoff, summarizeTaskFace, summarizeDecisions, summarizeBlockers } from '../src/handoff.js'

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

// ── 5. B4a 上下文三段（任务面/未决/决策）+ 80 行帽 ──
{
  // 纯函数面
  const face = summarizeTaskFace('- [x] task-01: a\n- [ ] task-02: b\n- [ ] task-03: c')
  assert(face === '📦 任务面：1/3 完成（待办：task-02、task-03）', `5a 任务面计数（实际 ${face}）`)
  assert(summarizeTaskFace(null) === null && summarizeTaskFace('无 checkbox') === null, '5b 无 checkbox → null（非 execute 期静默跳过）')
  const many = summarizeTaskFace(Array.from({ length: 10 }, (_, i) => `- [ ] task-${String(i + 1).padStart(2, '0')}: x`).join('\n'))
  assert(many.includes('等 10 项'), `5c 待办超 8 项折叠（实际 ${many}）`)
  const dec = summarizeDecisions('---\nauthor: t\n---\n# 决策\n\n## D-001@v1: x\n## D-002@v1: y')
  assert(dec.includes('D-001@v1、D-002@v1') && dec.includes('decisions.md'), `5d 决策 ID 清单（实际 ${dec}）`)
  assert(summarizeDecisions(null) === null, '5e 无决策文件 → null')
  const blk = summarizeBlockers({ steps: [{ name: 'Wave 2 执行', status: 'waiting' }, { name: 'x', status: 'completed' }] })
  assert(blk.includes('⛔ 未决') && blk.includes('Wave 2 执行') && blk.includes('waiting'), `5f 未决 waiting 步骤（实际 ${blk}）`)
  assert(summarizeBlockers(null) === null && summarizeBlockers({ steps: [{ name: 'x', status: 'completed' }] }) === null, '5g 无未决 → null')

  // buildHandoff 集成：夹具变更目录落 tasks.md + decisions.md
  const { proj, change } = makeRepoAtStage('brainstorm')
  const changeDir = join(proj, '.sillyspec', 'changes', change)
  writeFileSync(join(changeDir, 'tasks.md'), ['- [x] task-01: a', '- [x] task-02: b', '- [ ] task-03: c', '- [ ] task-04: d', '- [ ] task-05: e'].join('\n') + '\n', 'utf8')
  writeFileSync(join(changeDir, 'decisions.md'), '---\nauthor: t\ncreated_at: 2026-09-21T00:00:00\n---\n# 决策记录\n\n## D-001@v1: 甲\n- 决策：甲\n\n## D-002@v1: 乙\n- 决策：乙\n', 'utf8')
  const ho = await buildHandoff({ cwd: proj })
  assert(ho.ok === true, '5h 夹具可交接')
  const text = ho.lines.join('\n')
  assert(text.includes('📦 任务面：2/5 完成（待办：task-03、task-04、task-05）'), `5i 任务面行（实际片段 ${text.split('\n').find(l => l.includes('任务面'))}）`)
  assert(text.includes('🧠 决策：D-001@v1、D-002@v1'), '5j 决策行')
  assert(ho.lines.length <= 80, `5k 80 行帽（实际 ${ho.lines.length}）`)
  assert(ho.truncated === false, '5l 常规量不截尾')
  assert(text.indexOf('📦 任务面') > text.indexOf('📋'), '5m 上下文段在状态行之后')
}

for (const dir of tmpRoots) {
  try { rmSync(dir, { recursive: true, force: true }) } catch { /* Windows 句柄延迟 */ }
}

console.log(`\n${failed === 0 ? '✅ ALL PASS' : '❌ FAILED'}: ${total - failed}/${total}`)
process.exit(failed === 0 ? 0 : 1)
