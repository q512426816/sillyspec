/**
 * enrichJsonParseError 定位增强测试 —— 锁定 readReview parse 失败分支的可定位性（feedback ②）
 *
 * 背景：readReview 旧实现只吐 V8 原始 e.message（"at position N"），agent 无法快速定位行列、
 * 也不知道 \s 这类正则转义在 JSON 里非法。enrichJsonParseError 把 position 换算成 line:col +
 * 出错行上下文（caret 指向），并对非法转义给「双写反斜杠 / JSON.stringify 重写」指引。
 *
 * 直测 helper（而非走 readReview）——避免测试依赖 V8 跨版本的消息格式漂移。
 */
import { enrichJsonParseError } from '../src/task-review.js'

let passed = 0, failed = 0
const failures = []
function assert(cond, msg) { if (cond) { passed++; console.log('  ✅ ' + msg) } else { failed++; failures.push(msg); console.log('  ❌ ' + msg) } }

console.log('=== enrichJsonParseError（readReview parse 失败定位增强）===\n')

console.log('--- ① 非法转义（\\s）单行 → line:col + caret + 转义修复指引 ---')
{
  // raw 实际内容：{"a": "foo\sbar"}  （\ 在索引 10）
  const raw = '{"a": "foo\\sbar"}'
  const out = enrichJsonParseError(raw, 'Bad escaped character in JSON at position 10')
  assert(out.includes('第 1 行第 11 列'), 'position 10 → 第 1 行第 11 列')
  assert(out.includes('^'), '含 caret 指示符')
  assert(out.includes('foo\\sbar') || out.includes('foo'), '含出错行上下文片段')
  assert(out.includes('疑似正则转义'), '识别为非法转义并提示')
  assert(out.includes('双写反斜杠') && out.includes('JSON.stringify'), '给双写反斜杠 / JSON.stringify 修复指引')
}

console.log('\n--- ② 多行 JSON → line/col 跨行正确换算 ---')
{
  // 实际内容（两行后接 }）：
  //   {
  //     "x": \d
  //   }
  // \d 的 \ 在索引 9（第 2 行第 8 列：2 空格 + " x " : 空格 + \）
  const raw = '{\n  "x": \\d\n}'
  const out = enrichJsonParseError(raw, "Unexpected token 'd' in JSON at position 9")
  assert(out.includes('第 2 行第 8 列'), 'position 9（换行后）→ 第 2 行第 8 列')
}

console.log('\n--- ③ 非 "at position" 消息（如 Unexpected end of JSON input）→ 原样返回，不崩 ---')
{
  const msg = 'Unexpected end of JSON input'
  const out = enrichJsonParseError('{"a": ', msg)
  assert(out === msg, '无 position 的消息原样透传')
}

console.log('\n--- ④ 非转义语法错（缺值/trailing comma）→ 给 line:col，但不附转义指引 ---')
{
  const raw = '{"a": }'
  const out = enrichJsonParseError(raw, "Unexpected token '}' in JSON at position 6")
  assert(out.includes('第 1 行'), '仍给出行定位')
  assert(!out.includes('疑似正则转义'), '非转义错不附转义修复指引（避免误导）')
}

console.log('\n--- ⑤ position 越界（> raw.length）→ clamp 不崩，仍输出定位 ---')
{
  const raw = '{}'
  const out = enrichJsonParseError(raw, 'Unexpected token in JSON at position 9999')
  assert(typeof out === 'string' && out.includes('第'), 'position 越界被 clamp，不抛错且仍输出定位')
}

console.log('\n--- ⑥ 合法转义（\\" \\\\ \\n \\t \\uXXXX）不被误判为非法转义 ---')
{
  // snippet 含合法转义 \" \\ \n \t，不应触发「疑似正则转义」
  const raw = '{"a": "x\\"y\\\\z"}'
  const out = enrichJsonParseError(raw, "Unexpected token in JSON at position 6")
  assert(!out.includes('疑似正则转义'), '合法转义不误报为正则转义')
}

console.log(`\n${'='.repeat(50)}`)
console.log(`✅ 通过: ${passed}  ❌ 失败: ${failed}`)
if (failures.length) { console.log('失败项:'); failures.forEach(f => console.log('  - ' + f)) }
console.log('='.repeat(50))
if (failed > 0) process.exit(1)
