/**
 * run <stage> 退出码三段契约测试（W1-A + W1-B）
 *
 * 验证 machine-interface 的 0/1/2 契约在 `sillyspec run <stage>` 路径也贯彻：
 *   - exit 0：成功
 *   - exit 1：事实阻断（校验失败/审批拒绝/产物缺失/guard 拦截）
 *   - exit 2：用法错（参数缺失/未知）+ 环境错 + run --json（暂不支持，fail-fast）
 *
 * W1 前：run.js 53 处 exit 中 51 处 exit(1)，用法错/环境错全塞 exit(1)，
 *       agent 无法靠退出码区分"参数错了"还是"事实阻断"，只能解析 stderr 文本。
 * W1 后：用法/环境错收敛到 exit(2)，agent 可单看退出码决定重试策略。
 *
 * 聚焦新增 exit 2 路径（事实阻断 exit 1 已被 run-complete-step-*.test.mjs 大量覆盖）。
 */
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs'
import { join, dirname } from 'path'
import { tmpdir } from 'os'
import { execSync, execFileSync } from 'child_process'
import { fileURLToPath } from 'url'

const binPath = join(dirname(fileURLToPath(import.meta.url)), '..', 'bin', 'sillyspec.js')

let failed = 0, total = 0
function assert(cond, msg) {
  total++
  if (!cond) { failed++; console.log(`  ❌ FAIL: ${msg}`) }
  else console.log(`  ✅ PASS: ${msg}`)
}

// 跑 sillyspec 子进程，返回真实退出码（process.exit 经 execFileSync 落到 e.status）
function runSilly(args, { cwd } = {}) {
  try {
    const stdout = execFileSync('node', [binPath, ...args],
      { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 15000 })
    return { status: 0, stdout, stderr: '' }
  } catch (e) {
    return { status: e.status ?? -1, stdout: e.stdout ? e.stdout.toString() : '', stderr: e.stderr ? e.stderr.toString() : '' }
  }
}

const tmpRoots = []
function makeRepo() {
  const d = mkdtempSync(join(tmpdir(), 'exit-'))
  tmpRoots.push(d)
  execSync('git init -q', { cwd: d, stdio: 'pipe' })
  execSync('git config user.email t@t.com', { cwd: d, stdio: 'pipe' })
  execSync('git config user.name t', { cwd: d, stdio: 'pipe' })
  execSync('git commit --allow-empty -q -m init', { cwd: d, stdio: 'pipe' })
  mkdirSync(join(d, '.sillyspec'), { recursive: true })
  writeFileSync(join(d, '.gitignore'), '.sillyspec/\n')
  return d
}

console.log('--- run <stage> 退出码三段契约（W1-A 用法/环境错 → exit 2）---')

// 用法错 → exit 2（每个用例同时断言 stderr/sdout 内容，不只查退出码）
{
  const r = runSilly(['run'])
  assert(r.status === 2, `run 无阶段 → exit 2（实际 ${r.status}）`)
  const msg = r.stderr + r.stdout
  assert(msg.includes('阶段') || msg.includes('stage') || msg.includes('用法'),
    `run 无阶段 stderr 含提示（实际 ${msg.slice(0, 80)}）`)
}
{
  const r = runSilly(['run', 'bogus-stage'])
  assert(r.status === 2, `run 未知阶段 → exit 2（实际 ${r.status}）`)
  const msg = r.stderr + r.stdout
  assert(msg.includes('未知') || msg.includes('unknown') || msg.includes('bogus-stage'),
    `run 未知阶段 stderr 含阶段名（实际 ${msg.slice(0, 80)}）`)
}
{
  const d = makeRepo()
  const r = runSilly(['run', 'brainstorm', '--bogus-flag'], { cwd: d })
  assert(r.status === 2, `未知参数 → exit 2（实际 ${r.status}）`)
  const msg = r.stderr + r.stdout
  assert(msg.includes('bogus') || msg.includes('未知') || msg.includes('unknown') || msg.includes('参数'),
    `未知参数 stderr 含提示（实际 ${msg.slice(0, 80)}）`)
}

// F10b（ql-20260818-010）: 语义别名定向提示——did-you-mean 按编辑距离猜形近 flag，猜中的常是
// 形近但语义错的（--title → --files，ql-20260818-003 负面③）。命中别名打定向指引替代形近猜测。
{
  const d = makeRepo()
  const r = runSilly(['run', 'quick', '--done', '--title', 'x'], { cwd: d })
  assert(r.status === 2, `--title 未知参数 → exit 2（实际 ${r.status}）`)
  const msg = r.stderr + r.stdout
  assert(msg.includes('需求：'), `--title 提示指向 --output「需求：」提取（实际 ${msg.slice(0, 200)}）`)
  assert(!msg.includes('--files'), `--title 不再误导猜 --files（实际 ${msg.slice(0, 200)}）`)
}
{
  const d = makeRepo()
  const r = runSilly(['run', 'quick', '--done', '--name', 'my-session'], { cwd: d })
  assert(r.status === 2, `--name 未知参数 → exit 2（实际 ${r.status}）`)
  const msg = r.stderr + r.stdout
  assert(msg.includes('quick-<hash>') || msg.includes('--change'),
    `--name 提示指向自动 sessionId / --change 恢复（实际 ${msg.slice(0, 200)}）`)
}
// 未命中别名的形近未知 flag 仍走 did-you-mean 路径（回归保护）
{
  const d = makeRepo()
  const r = runSilly(['run', 'quick', '--done', '--output2', 'x'], { cwd: d })
  assert(r.status === 2, `形近未知参数 → exit 2（实际 ${r.status}）`)
  const msg = r.stderr + r.stdout
  assert(msg.includes('你是想输入「--output」') || msg.includes('已知参数'),
    `形近参数仍走 did-you-mean / 已知参数路径（实际 ${msg.slice(0, 200)}）`)
}
{
  const d = makeRepo()
  const r = runSilly(['run', 'execute'], { cwd: d })
  assert(r.status === 2, `execute 无 --change → exit 2（实际 ${r.status}）`)
  const msg = r.stderr + r.stdout
  assert(msg.includes('change') || msg.includes('变更'),
    `execute 无 --change stderr 含提示（实际 ${msg.slice(0, 80)}）`)
}

// W1-B: run --json → exit 2（fail-fast，杜绝之前的静默吞）
{
  const d = makeRepo()
  const r = runSilly(['run', 'brainstorm', '--json'], { cwd: d })
  assert(r.status === 2, `run --json → exit 2 fail-fast（实际 ${r.status}）`)
  assert(r.stderr.includes('不支持') || r.stderr.includes('--json'),
    `run --json stderr 明确拒绝（实际 ${r.stderr.slice(0, 80)}）`)
}

// 对照：成功路径 → exit 0（证明三段契约区分，非"全部 exit 2"）
{
  const r = runSilly(['--version'])
  assert(r.status === 0, `--version → exit 0（实际 ${r.status}）`)
  assert(r.stdout.length > 0 && /\d+\.\d+\.\d+/.test(r.stdout),
    `--version stdout 含版本号（实际 ${r.stdout.slice(0, 40)}）`)
}

for (const d of tmpRoots) { try { rmSync(d, { recursive: true, force: true }) } catch {} }

console.log(`\n${'='.repeat(50)}`)
console.log(`✅ 通过: ${total - failed}  ❌ 失败: ${failed}`)
console.log(`${'='.repeat(50)}`)
if (failed > 0) process.exit(1)
