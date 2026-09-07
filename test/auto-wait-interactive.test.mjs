/**
 * auto wait 直通测试（change: 2026-09-08-auto-driver，FR-03，D-004@v1）。
 *
 * 锁住：
 *  1. 旗标缺省 → 不触发（零输出）
 *  2. 非 requiresUser 步（三键全缺，execute Wave 形态）→ 不触发
 *  3. requiresWait + 旗标开 + 伪 TTY + 注入 rlFactory → 直收并走续行路径（answer 送达证明）
 *  4. 非 TTY → 提示回三段式（fail-open）
 */
import { maybeWaitInteractive } from '../src/run/command.js'

const count = { passed: 0, failed: 0, failures: [] }
const assert = (cond, msg) => { cond ? (count.passed++, console.log(`  ✅ PASS: ${msg}`)) : (count.failed++, count.failures.push(msg), console.log(`  ❌ FAIL: ${msg}`)) }
const capture = async (fn) => {
  const logs = []; const ol = console.log; console.log = (...a) => logs.push(a.join(' '))
  try { await fn() } finally { console.log = ol }
  return logs.join('\n')
}
const NL = String.fromCharCode(10)

console.log('=== auto wait 直通（--wait-interactive）===' + NL)

console.log('--- ① 旗标缺省 → 不触发 ---')
{
  globalThis.__ssWaitInteractive = false
  const out = await capture(() => maybeWaitInteractive({ requiresWait: true }, 'c1', 'brainstorm'))
  assert(out === '', '缺省旗标零输出零读取')
}

console.log(NL + '--- ② 非 requiresUser 步 → 不触发 ---')
{
  globalThis.__ssWaitInteractive = true
  const out = await capture(() => maybeWaitInteractive({ name: '执行任务' }, 'c1', 'execute'))
  assert(out === '', '三键全缺步（execute Wave 形态）直通不触发')
}

console.log(NL + '--- ③ requiresWait + 伪 TTY + 注入 rl → 直收并续行 ---')
{
  globalThis.__ssWaitInteractive = true
  Object.defineProperty(process.stdin, 'isTTY', { value: true, configurable: true })
  Object.defineProperty(process.stdout, 'isTTY', { value: true, configurable: true })
  let asked = ''
  const fakeRl = () => ({ question: async (q) => { asked = q; return '用户直答内容' }, close: () => {} })
  const out = await capture(async () => {
    await maybeWaitInteractive({ requiresWait: true }, 'nonexistent-change-x', 'brainstorm', { rlFactory: fakeRl })
  })
  assert(asked.includes('⌨️'), `直通提问打印（${JSON.stringify(asked.slice(0, 30))}）`)
  assert(out.includes('已接收，自动续行') && out.includes('用户直答内容'), `answer 送达续行路径（输出：${JSON.stringify(out.slice(0, 120))}）`)
}

console.log(NL + '--- ④ 非 TTY → 提示回三段式 ---')
{
  globalThis.__ssWaitInteractive = true
  Object.defineProperty(process.stdin, 'isTTY', { value: false, configurable: true })
  const out = await capture(() => maybeWaitInteractive({ requiresWait: true }, 'c1', 'brainstorm'))
  Object.defineProperty(process.stdin, 'isTTY', { value: true, configurable: true })
  assert(out.includes('三段式') || out.includes('TTY'), '非 TTY 提示回三段式（fail-open）')
}

globalThis.__ssWaitInteractive = false
console.log(NL + '='.repeat(50) + NL + '✅ 通过: ' + count.passed + '  ❌ 失败: ' + count.failed + NL + '='.repeat(50))
if (count.failed > 0) process.exit(1)
