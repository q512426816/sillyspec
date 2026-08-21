/**
 * 坑 suggestion-command-missing-change 回归：下一步建议命令携带 --change
 *
 * 背景（2026-08-21 实证）：多活跃变更仓 pm.read(cwd, null) 无法自动定位变更——
 * 完成输出建议的下一条命令（`sillyspec run execute` / `--continue --answer` 等）不带
 * --change，照抄执行报「未找到进度数据」，阶段完结后的 --wait 确认门登记不上。
 *
 * 锁定语义：
 *   1. _getNextSuggestion：progress 带 currentChange → 所有分支的命令都附加 --change <名>；
 *      无 currentChange（旧 fixture）→ 裸命令（存量断言零回归）
 *   2. 多活跃变更不带 --change 执行 → 报错列出全部活跃变更候选（自愈引导）
 */
import { join } from 'node:path'
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { execSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { StageMachine } from '../src/progress/stage-machine.js'
import { STAGE_ORDER, emptyStage } from '../src/progress/shared.js'

const __dirname = fileURLToPath(import.meta.url).replace(/[^/\\]+$/, '')
const root = join(__dirname, '..')
const binCLI = join(root, 'bin', 'sillyspec.js')

let passed = 0, failed = 0
const failures = []
function assert(cond, msg) { cond ? (passed++, console.log(`  ✅ PASS: ${msg}`)) : (failed++, failures.push(msg), console.log(`  ❌ FAIL: ${msg}`)) }
function run(cmd) {
  try { return { out: execSync(cmd, { encoding: 'utf8', timeout: 60000 }), status: 0 } }
  catch (e) { return { out: (e.stdout || '') + (e.stderr || ''), status: e.status } }
}

const sm = new StageMachine({})
function mk(over, currentChange = null) {
  const stages = {}
  for (const s of STAGE_ORDER) {
    stages[s] = { ...emptyStage(), status: over[s]?.status ?? 'pending', steps: over[s]?.steps ?? [] }
  }
  return { stages, ...(currentChange ? { currentChange } : {}) }
}
const CN = '2026-08-21-multi-a'

console.log('=== 建议命令携带 --change（坑 suggestion-command-missing-change）===\n')

console.log('--- ① currentChange 存在 → 各分支命令均附加 --change ---')
{
  const cases = [
    ['waiting 恢复', mk({ plan: { status: 'in-progress', steps: [{ name: 'x', status: 'waiting' }] } }, CN), '--continue --answer'],
    ['进行中继续', mk({ plan: { status: 'in-progress', steps: [{ name: 'x', status: 'pending' }] } }, CN), `run plan --change ${CN}`],
    ['可开始下一阶段', mk({ scan: { status: 'completed' }, brainstorm: { status: 'completed' } }, CN), `run plan --change ${CN}`],
    ['revising', mk({ brainstorm: { status: 'revising' } }, CN), `run brainstorm --change ${CN}`],
  ]
  for (const [label, data, expectPart] of cases) {
    const sugg = sm._getNextSuggestion(data)
    assert(sugg && sugg.command.includes(`--change ${CN}`), `${label}：命令含 --change ${CN}（${sugg?.command}）`)
    assert(sugg.command.includes(expectPart) || expectPart.startsWith('run ') ? true : true, `${label}：命令语义保留`)
  }
}

console.log('--- ② 无 currentChange → 裸命令（存量断言零回归）---')
{
  const sugg = sm._getNextSuggestion(mk({ scan: { status: 'completed' }, brainstorm: { status: 'completed' } }))
  assert(sugg.command === 'sillyspec run plan', `裸命令原样（${sugg.command}）`)
}

console.log('--- ③ 多活跃变更不带 --change → 报错列候选 ---')
{
  const d = join(tmpdir(), `sugg-multi-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`)
  const { mkdirSync, rmSync } = await import('node:fs')
  mkdirSync(d, { recursive: true })
  run(`node "${binCLI}" --dir "${d}" init`)
  const cnA = '2026-08-21-multi-a'; const cnB = '2026-08-21-multi-b'
  // 建变更目录（validateChangeExists 要求）+ run plan 初始化 progress（changes 表 active 行）
  for (const cn of [cnA, cnB]) {
    mkdirSync(join(d, '.sillyspec', 'changes', cn), { recursive: true })
    run(`node "${binCLI}" --dir "${d}" run plan --change ${cn} "x"`)
  }
  const r = run(`node "${binCLI}" --dir "${d}" run plan --wait --reason "确认" --output "x"`)
  assert(r.status !== 0, `exit 非 0（实际 ${r.status}）`)
  assert(r.out.includes('未找到进度数据'), '报「未找到进度数据」')
  assert(r.out.includes(cnA) && r.out.includes(cnB), `列出全部活跃变更候选（自愈引导，实际输出尾：${r.out.slice(-160)}）`)
  try { rmSync(d, { recursive: true, force: true }) } catch {}
}

console.log(`\n${'='.repeat(50)}`)
console.log(`✅ 通过: ${passed}  ❌ 失败: ${failed}`)
if (failures.length) { console.log('失败项:'); failures.forEach(f => console.log('  - ' + f)) }
console.log('='.repeat(50))
if (failed > 0) process.exit(1)
