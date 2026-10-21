/**
 * FR-01（2026-10-21-protocol-tax）：DEBUG_SILLYSPEC_TIMING 分段计时。
 *
 * 锁定行为：
 *   1. env DEBUG_SILLYSPEC_TIMING=1 时，run 命令输出含 [timing] 行，且四个段名
 *      （sync/gates/render/state-write）全部在场（未触达段为 n/a，不许缺段名）
 *   2. 末步 --done（走 completeStageGates + 状态写盘 + triggerSync）时 gates 与
 *      state-write 段为数字值（非 n/a）
 *   3. 不设 env 时输出无 [timing] 字样（零输出变化）
 *
 * 风格：_cli-step-harness 子进程 CLI（同 run-complete-step-brainstorm 模式）。
 */
import { writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { makeRepo, initChange, seedStage, runStage, runCLI, cleanup, report } from './_cli-step-harness.mjs'

const count = { passed: 0, failed: 0, failures: [] }
const assert = (cond, msg) => { cond ? (count.passed++, console.log(`  ✅ PASS: ${msg}`)) : (count.failed++, count.failures.push(msg), console.log(`  ❌ FAIL: ${msg}`)) }

const BRAINSTORM_STEPS = [
  '进度确认', '加载项目上下文', '对话式探索与需求澄清', '提出 2-3 种方案',
  '分段展示设计', '写设计文档并自审', 'Design Grill 交叉审查', '生成规范文件',
]

async function seedBrainstormToLast(cwd, specBase, cn) {
  const pm = await initChange(cwd, specBase, cn)
  runCLI(['--dir', cwd, 'run', 'brainstorm', '--change', cn], { cwd })
  return seedStage(pm, cwd, cn, 'brainstorm',
    BRAINSTORM_STEPS.map((name, i) => ({ name, status: i < BRAINSTORM_STEPS.length - 1 ? 'completed' : 'pending' })))
}

function writeFourPieceFixture(cwd, specBase, cn) {
  const changeDir = join(specBase, 'changes', cn)
  writeFileSync(join(changeDir, 'proposal.md'), '# Proposal\n\n## 不在范围内\n无\n')
  writeFileSync(join(changeDir, 'requirements.md'), '# Requirements\n\n- FR-001: 列表默认最新在前\n')
  writeFileSync(join(changeDir, 'tasks.md'), '# Tasks\n\n- [ ] task-01: 改 a\n')
  mkdirSync(join(cwd, 'src'), { recursive: true })
  writeFileSync(join(cwd, 'src', 'list.js'), '// fixture stub' + String.fromCharCode(10))
  writeFileSync(join(changeDir, 'design.md'),
    '# Design: 列表排序\n\n## 背景\n列表需默认最新在前。\n\n## 总体方案\nservice 兜底 order_by。\n\n## 决策\nD-001@v1: 直接改。\n\n## 文件变更清单\n| 操作 | 文件路径 | 说明 |\n|------|---------|------|\n| 修改 | src/list.js | 排序兜底 |\n\n## 风险登记\n低风险。\n\n## 自审\n已核对。\n')
}

const TIMING_ENV = { DEBUG_SILLYSPEC_TIMING: '1' }
const timingLine = (s) => (s.match(/\[timing\][^\n]*/) || [null])[0]

console.log('=== FR-01 timing 分段计时 ===\n')

console.log('--- Case 1: env=1 渲染命令 → [timing] 行四段名齐全 ---')
{
  const { cwd, specBase } = makeRepo('cli-timing-1-')
  const cn = '2026-07-25-timing-render'
  await seedBrainstormToLast(cwd, specBase, cn)
  const r = runCLI(['--dir', cwd, 'run', 'brainstorm', '--change', cn], { cwd, env: TIMING_ENV })
  const line = timingLine(r.combined)
  assert(r.status === 0, `exit 0（实际 ${r.status}）`)
  assert(line !== null, `输出含 [timing] 行（实际：${r.combined.slice(-160)}）`)
  if (line) {
    for (const seg of ['sync=', 'gates=', 'render=', 'state-write=']) {
      assert(line.includes(seg), `[timing] 行含段名 ${seg}（行：${line}）`)
    }
  }
}

console.log('--- Case 2: env=1 末步 --done → gates/state-write 为数字值 ---')
{
  const { cwd, specBase } = makeRepo('cli-timing-2-')
  const cn = '2026-07-25-timing-done'
  await seedBrainstormToLast(cwd, specBase, cn)
  writeFourPieceFixture(cwd, specBase, cn)
  const r = runStage('brainstorm', cn, cwd, { done: true, output: '生成规范完成', answer: '确认', env: TIMING_ENV })
  const line = timingLine(r.combined)
  assert(r.status === 0, `exit 0（实际 ${r.status}，尾：${r.combined.slice(-150)}）`)
  assert(line !== null, `--done 输出含 [timing] 行`)
  if (line) {
    assert(/\[timing\].*\bgates=\d+ms/.test(line), `gates 段为数字值（行：${line}）`)
    assert(/\[timing\].*\bstate-write=\d+ms/.test(line), `state-write 段为数字值（行：${line}）`)
  }
}

console.log('--- Case 3: 不设 env → 无 [timing] 字样（零输出变化） ---')
{
  const { cwd, specBase } = makeRepo('cli-timing-3-')
  const cn = '2026-07-25-timing-off'
  await seedBrainstormToLast(cwd, specBase, cn)
  const r = runCLI(['--dir', cwd, 'run', 'brainstorm', '--change', cn], { cwd })
  assert(r.status === 0, `exit 0（实际 ${r.status}）`)
  assert(!r.combined.includes('[timing]'), '默认环境输出无 [timing]')
}

cleanup()
report(count.passed, count.failed, count.failures)
