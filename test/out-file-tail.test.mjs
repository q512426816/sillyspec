/**
 * FR-03（2026-10-21-protocol-tax）：全局 --out-file/--tail 输出收集器。
 *
 * 锁定行为：
 *   1. --out-file f --tail 5：全文写 f、stdout 只有提示行+5 尾行、退出码与裸跑一致（成功命令）
 *   2. 失败命令（gate 拒绝 exit 1）：退出码仍 1 且拒绝原因进全文件（截尾不丢失败信息）
 *   3. --tail 单用（无 --out-file）→ exit 2 用法错误
 *
 * 风格：_cli-step-harness 子进程 CLI。
 */
import { writeFileSync, readFileSync, mkdirSync } from 'node:fs'
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

const stdoutLines = (s) => s.split('\n').filter((l) => l !== '')

console.log('=== FR-03 --out-file/--tail 输出收集器 ===\n')

console.log('--- Case 1: 成功命令 --out-file --tail 5 → 全文落文件、stdout ≤6 行、退出码一致 ---')
{
  const { cwd, specBase } = makeRepo('cli-outfile-1-')
  const cn = '2026-07-25-outfile-ok'
  await seedBrainstormToLast(cwd, specBase, cn)
  const bare = runCLI(['--dir', cwd, 'run', 'brainstorm', '--change', cn], { cwd })
  const outFile = join(cwd, 'out', 'full.log')
  mkdirSync(join(cwd, 'out'), { recursive: true })
  const r = runCLI(['--dir', cwd, 'run', 'brainstorm', '--change', cn, '--out-file', outFile, '--tail', '5'], { cwd })

  assert(r.status === bare.status, `退出码与裸跑一致（${r.status} vs ${bare.status}）`)
  assert(r.stdout.includes('📄 全文已写'), `stdout 含提示行（实际 stdout：${r.stdout.slice(0, 200)}）`)
  const shown = stdoutLines(r.stdout)
  assert(shown.length <= 6, `stdout ≤6 行（提示行+5 尾行，实际 ${shown.length}）`)
  const fileText = readFileSync(outFile, 'utf8')
  assert(stdoutLines(fileText).length > 10, `全文件行数 >10（实际 ${stdoutLines(fileText).length}）——全文在文件不在 stdout`)
  assert(stdoutLines(fileText).length >= shown.length * 2, `全文件行数 ≥ stdout 行数×2（${stdoutLines(fileText).length} vs ${shown.length}）——stdout 只是尾部`)
}

console.log('--- Case 2: 失败命令（gate 拒绝）→ 退出码仍 1、拒绝原因进全文件 ---')
{
  const { cwd, specBase } = makeRepo('cli-outfile-2-')
  const cn = '2026-07-25-outfile-fail'
  await seedBrainstormToLast(cwd, specBase, cn)
  // 不写四件套 → 末步 --done 被 runValidators 拒（exit 1）
  const outFile = join(cwd, 'fail.log')
  const r = runStage('brainstorm', cn, cwd, { done: true, output: '生成规范完成', answer: '确认' })
  const r2args = ['--dir', cwd, 'run', 'brainstorm', '--change', cn, '--done', '--output', '生成规范完成', '--answer', '确认', '--out-file', outFile, '--tail', '8']
  const r2 = runCLI(r2args, { cwd })

  assert(r.status !== 0, `裸跑失败命令确实 exit≠0（实际 ${r.status}）`)
  assert(r2.status === r.status, `flag 版退出码一致（${r2.status} vs ${r.status}）——收集器不拦截退出码`)
  const fileText = readFileSync(outFile, 'utf8')
  assert(/❌|拒|缺/.test(fileText), '拒绝原因可全文件读到（截尾不丢失败信息）')
}

console.log('--- Case 3: --tail 单用 → exit 2 用法错误 ---')
{
  const { cwd } = makeRepo('cli-outfile-3-')
  const r = runCLI(['--dir', cwd, 'status', '--tail', '5'], { cwd })
  assert(r.status === 2, `--tail 单用 exit 2（实际 ${r.status}，输出：${r.combined.slice(0, 150)}）`)
  assert(r.combined.includes('--out-file'), '报错指明需与 --out-file 同用')
}

cleanup()
report(count.passed, count.failed, count.failures)
