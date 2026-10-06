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
import { nowWallClock, toWallClock } from '../src/datetime.js'

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

console.log('\n=== toWallClock 统一入口（2026-10-06-wallclock-entry）===\n')

{
  // 同一时刻三入口一致性：epoch 毫秒 / Date 实例 / ISO 字符串必须产出同一本地墙钟串。
  // 字符串入口不做 UTC 直显（UTC+8 下 ISO 串直显与本地轴差 8 小时，被此断言抓出；
  // tz=0 环境无偏移可抓——形状与同串断言兜底，与上方 nowWallClock 用例同一取舍）。
  const epoch = new Date(2026, 7, 23, 9, 39, 7).getTime()
  const viaDate = toWallClock(new Date(epoch))
  assert(viaDate === toWallClock(epoch), 'Date 实例与 epoch 毫秒同串（毫秒入口不偏轴）')
  assert(viaDate === toWallClock(new Date(epoch).toISOString()), 'ISO 字符串（UTC 轴）归一到同一本地串')
  assert(viaDate === '2026-08-23 09:39:07', '本地轴构造的时刻经统一入口原样输出')
  const d = new Date(2026, 0, 2, 3, 4, 5)
  assert(toWallClock(d) === nowWallClock(d), '与 nowWallClock 同形同值')
  const s = toWallClock(new Date().toISOString())
  assert(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(s), `字符串入口输出形状合法（${s}）`)
}

{
  // 无效输入：TypeError 且 message 含输入的字符串形式（不建格式枚举——解析委托 Date 构造器）
  const cases = [
    { in: 'not-a-time', label: '不可解析字符串' },
    { in: NaN, label: 'NaN 数字' },
    { in: Infinity, label: '非有限数字' },
    { in: undefined, label: 'undefined' },
    { in: null, label: 'null' },
    { in: {}, label: '普通对象' },
    { in: true, label: '布尔值' },
    { in: new Date('not-a-time'), label: 'Invalid Date 实例' },
  ]
  for (const { in: bad, label } of cases) {
    let threw = null
    try { toWallClock(bad) } catch (e) { threw = e }
    assert(threw instanceof TypeError, `${label}：抛 TypeError（实际 ${threw && threw.constructor.name}）`)
    assert(threw && String(threw.message).includes(String(bad)), `${label}：message 含输入字符串形式`)
  }
}

console.log(`\n${'='.repeat(50)}`)
console.log(`✅ 通过: ${passed}  ❌ 失败: ${failed}`)
console.log(`${'='.repeat(50)}`)
if (failed > 0) process.exit(1)
