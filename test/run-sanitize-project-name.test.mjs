/**
 * task-09: sanitizeProjectName 字母校验 + 长度≥2 + 编号正则收紧
 *
 * 覆盖：
 * - 纯数字 "0"/"7" → null（核心目标，scan-projects.json 脏数据来源）
 * - "0/7" 清洗 "07" 无字母 → null
 * - "a" 长度<2 → null
 * - "fe" 含字母长度≥2 → 通过
 * - "frontend" / "order-service" → 通过
 * - "前端项目" 全中文清洗后 "" → null
 * - "" → null
 */
import { sanitizeProjectName } from '../src/run.js'

let passed = 0
let failed = 0
function assertEqual (actual, expected, msg) {
  const ok = actual === expected
  if (ok) { console.log(`✅ PASS: ${msg}`); passed++ }
  else { console.error(`❌ FAIL: ${msg}\n   expected: ${JSON.stringify(expected)}\n   actual:   ${JSON.stringify(actual)}`); failed++ }
}

// 通过用例
assertEqual(sanitizeProjectName('frontend'), 'frontend', '"frontend" 含字母长度≥2 通过')
assertEqual(sanitizeProjectName('order-service'), 'order-service', '"order-service" 含字母+横线 通过')
assertEqual(sanitizeProjectName('fe'), 'fe', '"fe" 最小长度 2 通过')
assertEqual(sanitizeProjectName('user_service'), 'user_service', '"user_service" 含下划线 通过')
assertEqual(sanitizeProjectName('app.v2'), 'app.v2', '"app.v2" 含点+数字 通过')

// 拒绝用例（核心目标）
assertEqual(sanitizeProjectName('0'), null, '"0" 纯数字拒绝')
assertEqual(sanitizeProjectName('7'), null, '"7" 纯数字拒绝')
assertEqual(sanitizeProjectName('07'), null, '"07" 纯数字拒绝（无字母）')
assertEqual(sanitizeProjectName('0/7'), null, '"0/7" 清洗后 "07" 无字母拒绝')
assertEqual(sanitizeProjectName('123'), null, '"123" 纯数字拒绝')

// 长度<2
assertEqual(sanitizeProjectName('a'), null, '"a" 长度<2 拒绝（即使含字母）')
assertEqual(sanitizeProjectName('z'), null, '"z" 长度<2 拒绝')

// 中文 / 空
assertEqual(sanitizeProjectName('前端项目'), null, '"前端项目" 全中文清洗后 "" 拒绝')
assertEqual(sanitizeProjectName(''), null, '空字符串拒绝')
assertEqual(sanitizeProjectName('   '), null, '纯空白拒绝')
assertEqual(sanitizeProjectName(null), null, 'null 拒绝')
assertEqual(sanitizeProjectName(undefined), null, 'undefined 拒绝')

console.log(`\n${'='.repeat(50)}`)
console.log(`✅ 通过: ${passed}  ❌ 失败: ${failed}`)
console.log(`${'='.repeat(50)}`)
if (failed > 0) process.exit(1)
