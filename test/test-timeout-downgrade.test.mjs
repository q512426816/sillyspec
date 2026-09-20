/**
 * 纯超时降档回归（R4 门禁价值考古落地，2026-09-21）：
 * 227 跑 106 败里 36 次（34%）是 600s 帽杀的纯超时假拦——超时=未完成非测试失败。
 * 1. isTimeoutOnlyTestFailure 纯函数语义（full/module 两形态 + 混合失败面）
 * 2. verify 门（gates.js）与 quick 门（quick-audit.js）接线源文本钉——两门同根因同修
 * 3. module 模式结果带 modules 单元数组（判定输入的精确口径，非聚合 reason 文本）
 */
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { isTimeoutOnlyTestFailure } from '../src/verify-postcheck.js'

let failed = 0
let total = 0
function assert(cond, msg) {
  total++
  if (!cond) { failed++; console.log(`  ❌ FAIL: ${msg}`) } else { console.log(`  ✅ PASS: ${msg}`) }
}
const srcOf = (rel) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8')

// ── 1. 纯函数语义 ──
{
  assert(isTimeoutOnlyTestFailure({ status: 'passed' }) === false, '1a 通过态恒 false')
  assert(isTimeoutOnlyTestFailure(null) === false && isTimeoutOnlyTestFailure(undefined) === false, '1b 空输入零崩恒 false')

  const fullTimeout = { status: 'failed', reason: '模块 sillyhub-daemon 测试超时（>600s）', mode: 'full' }
  assert(isTimeoutOnlyTestFailure(fullTimeout) === true, '1c full 纯超时 → true（降档）')

  const fullReal = { status: 'failed', reason: '测试命令退出码 1', mode: 'full' }
  assert(isTimeoutOnlyTestFailure(fullReal) === false, '1d full 真实退出码 → false（维持硬拦）')

  const modAllTimeout = {
    status: 'failed',
    reason: '模块子集测试失败：frontend, daemon',
    modules: [
      { name: 'frontend', status: 'failed', reason: '模块 frontend 测试超时（>600s）' },
      { name: 'daemon', status: 'passed', reason: null },
      { name: 'backend', status: 'failed', reason: '模块 backend 测试超时（>600s）' },
    ],
  }
  assert(isTimeoutOnlyTestFailure(modAllTimeout) === true, '1e module 全部失败单元均超时 → true（通过单元不计）')

  const modMixed = {
    status: 'failed',
    reason: '模块子集测试失败：frontend, backend',
    modules: [
      { name: 'frontend', status: 'failed', reason: '模块 frontend 测试超时（>600s）' },
      { name: 'backend', status: 'failed', reason: '模块 backend 测试退出码 1' },
    ],
  }
  assert(isTimeoutOnlyTestFailure(modMixed) === false, '1f module 混合（超时+真挂）→ false（真拦防线不动）')

  const modNoUnits = { status: 'failed', reason: 'x', modules: [] }
  assert(isTimeoutOnlyTestFailure(modNoUnits) === true || isTimeoutOnlyTestFailure(modNoUnits) === false, '1g 空 modules 回退整体 reason 口径零崩')
  assert(isTimeoutOnlyTestFailure({ status: 'failed', reason: null }) === false, '1h reason 缺失保守 false（无法鉴定不降档）')
}

// ── 2. 两门接线源文本钉 ──
{
  const g = srcOf('../src/run/gates.js')
  assert(g.includes('isTimeoutOnlyTestFailure') && g.includes('纯超时降档'), '2a verify test 门接纯超时降档分支')
  const q = srcOf('../src/run/quick-audit.js')
  assert(q.includes('isTimeoutOnlyTestFailure'), '2b quick test 门接同一判定（两门同根因同修）')

  const v = srcOf('../src/verify-postcheck.js')
  assert(/modules: perModule\.map\(r => \(\{ name: r\.name, status: r\.status, reason: r\.reason, durationMs: r\.durationMs \}\)\)/.test(v), '2c module 结果带单元数组（判定精确口径）')
}

console.log(`\n${failed === 0 ? '✅ ALL PASS' : '❌ FAILED'}: ${total - failed}/${total}`)
process.exit(failed === 0 ? 0 : 1)
