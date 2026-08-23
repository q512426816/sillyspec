/**
 * 坑 taskcard-created-at-utc 回归：人读时间字段统一本地墙钟 nowWallClock
 *
 * 2026-08-23 实证：taskcard 骨架 created_at 用 toISOString() 落 UTC——本地 09:39（UTC+8）
 * 生成写 01:39，子代理两次手工改。同类：scan 文档头 created_at / scan updated_at
 * （<now-iso-datetime> 占位符）/ _module-map generated_at。
 *
 * 锁定语义：本地时区 + YYYY-MM-DD HH:mm:ss（各段补零），构造参数用本地时间轴（new Date(y,m,d,h,m,s)）
 * ——断言值与构造参数一致即证明无时区偏移（toISOString 会差一个时区）。
 */
import { nowWallClock } from '../src/datetime.js'

let failed = 0
let passed = 0
const failures = []
function assert(cond, msg) {
  if (cond) { passed++; console.log(`  ✅ PASS: ${msg}`) }
  else { failed++; failures.push(msg); console.log(`  ❌ FAIL: ${msg}`) }
}

console.log('=== nowWallClock 本地墙钟 ===\n')

{
  // new Date(年, 月Index, 日, 时, 分, 秒) 按本地时区解释——与 nowWallClock 同轴。
  // 若实现误用 toISOString()，结果会偏（如 UTC+8 差 8 小时）被断言抓出。
  assert(nowWallClock(new Date(2026, 7, 23, 9, 39, 7)) === '2026-08-23 09:39:07',
    '标准形态：YYYY-MM-DD HH:mm:ss（月 index 7 = 8 月）')
  assert(nowWallClock(new Date(2026, 0, 1, 0, 0, 0)) === '2026-01-01 00:00:00', '月/日/时分秒个位补零')
  assert(nowWallClock(new Date(2026, 11, 31, 23, 59, 59)) === '2026-12-31 23:59:59', '年末深夜形态')
  assert(nowWallClock(new Date(2026, 7, 23, 1, 39, 0)) === '2026-08-23 01:39:00',
    '本地凌晨 01:39 原样输出（UTC 实现会在此形态偏移被上面的标准用例抓出）')
  const s = nowWallClock()
  assert(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(s), `缺省时钟输出形状合法（${s}）`)
}

console.log(`\n${'='.repeat(50)}`)
console.log(`✅ 通过: ${passed}  ❌ 失败: ${failed}`)
console.log(`${'='.repeat(50)}`)
if (failed > 0) process.exit(1)
