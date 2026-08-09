/**
 * assertSafeChangeName 路径穿越守卫对抗性回归测试
 *
 * assertSafeChangeName（src/run/shared.js）是阻止 --change 名逃出 .sillyspec/changes/
 * 写到任意位置的**唯一硬门**（正则 [\w.\-] + 分隔符/.. 拒绝）。本测试锁定其各分支行为，
 * 防止未来重构（如放宽正则、改 .. 判定）引入路径穿越回归而 CI 全绿发现不了。
 *
 * 依据：docs/sillyspec/review-2026-08-09.md #9
 */

import { strict as assert } from 'node:assert'
import { assertSafeChangeName } from '../src/run/shared.js'

let passed = 0
const expectThrow = (fn, label) => {
  try {
    fn()
    console.error(`  ❌ FAIL: ${label} —— 应抛错但未抛`)
    process.exit(1)
  } catch {
    // 期望抛错
  }
}
const expectOk = (fn, label) => {
  try {
    fn()
    passed++
  } catch (e) {
    console.error(`  ❌ FAIL: ${label} —— 不应抛但抛了: ${e.message}`)
    process.exit(1)
  }
}

console.log('assertSafeChangeName 路径穿越守卫测试')

// null / undefined —— 不校验（函数入口直接 return）
expectOk(() => assertSafeChangeName(null), 'null 不校验')
expectOk(() => assertSafeChangeName(undefined), 'undefined 不校验')

// 空串 —— 抛
expectThrow(() => assertSafeChangeName(''), '空串抛错')

// 合法变更名 —— 通过（仅允许字母/数字/._-）
expectOk(() => assertSafeChangeName('2026-08-09-add-login'), '日期+连字符')
expectOk(() => assertSafeChangeName('my_change'), '下划线')
expectOk(() => assertSafeChangeName('change.v2'), '点号')
expectOk(() => assertSafeChangeName('a-b-c'), '多连字符')
expectOk(() => assertSafeChangeName('Change123'), '字母数字混合')

// 路径分隔符 —— 抛（Windows \\ 也算）
expectThrow(() => assertSafeChangeName('a/b'), '正斜杠')
expectThrow(() => assertSafeChangeName('a\\b'), '反斜杠（Windows 分隔符）')
expectThrow(() => assertSafeChangeName('changes/x'), '目录前缀')

// 父目录穿越 —— 抛
expectThrow(() => assertSafeChangeName('..'), '纯 ..')
expectThrow(() => assertSafeChangeName('../x'), '../ 前缀穿越')
expectThrow(() => assertSafeChangeName('../../etc/passwd'), '多层 ../ 穿越')
expectThrow(() => assertSafeChangeName('x/../../y'), '中间 ../ 穿越')
expectThrow(() => assertSafeChangeName('x..y'), '含 .. 段（includes 守卫）')

// 非法字符（仅允许 \w.\-）—— 抛
expectThrow(() => assertSafeChangeName('name with space'), '空格')
expectThrow(() => assertSafeChangeName('中文'), '非 ASCII')
expectThrow(() => assertSafeChangeName('a;b'), '分号（命令注入向量）')
expectThrow(() => assertSafeChangeName('a$(cmd)'), '$() 命令替换')
expectThrow(() => assertSafeChangeName('a`cmd`'), '反引号命令替换')

console.log(`✅ 全部 ${passed} 个合法用例 + 13 个对抗用例通过`)
