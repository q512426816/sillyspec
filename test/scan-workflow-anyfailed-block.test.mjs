/**
 * task-07: run.js workflow post_check anyFailed 阻断
 *
 * 覆盖：
 * - AC: workflow post_check anyFailed 时返回 { stageCompleted:false, currentIdx, nextPendingIdx: currentIdx }
 *       （与 task-06 平台模式 scan-postcheck 失败分支 return 结构对齐）
 *
 * 用源码字符串匹配 + 行为模拟。
 */
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const runPath = join(__dirname, '..', 'src', 'run.js')
const src = readFileSync(runPath, 'utf8')

let passed = 0
let failed = 0
function assert (cond, msg) {
  if (cond) { console.log(`✅ PASS: ${msg}`); passed++ }
  else { console.error(`❌ FAIL: ${msg}`); failed++ }
}

console.log('=== workflow post_check anyFailed 阻断 ===')

// 锚点：scan 深度扫描 workflow post_check 段
const anchor = src.indexOf('if (anyFailed)')
assert(anchor > 0, '找到 if (anyFailed) 锚点')

// 取该 if 块前后 500 字符（向前找变量声明，向后找 return）
const tail = src.slice(anchor, anchor + 500)

// 必须有 return { stageCompleted: false ... }
assert(/return\s*\{\s*stageCompleted:\s*false/.test(tail),
  'anyFailed 分支含 return { stageCompleted: false }')

// 必须有 nextPendingIdx: currentIdx
assert(/nextPendingIdx:\s*currentIdx/.test(tail),
  'anyFailed 分支返回 nextPendingIdx: currentIdx')

// 必须有 currentIdx（保持当前 step 不推进）
assert(/currentIdx/.test(tail), 'anyFailed 分支保留 currentIdx 字段')

// 必须有 console.log 警告（保留用户可见提示）
assert(/console\.log/.test(tail) && /存在检查失败项|重试提示/.test(src.slice(anchor - 200, anchor + 300)),
  'anyFailed 分支保留 console.log 用户提示')

console.log(`\n${'='.repeat(50)}`)
console.log(`✅ 通过: ${passed}  ❌ 失败: ${failed}`)
console.log(`${'='.repeat(50)}`)
if (failed > 0) process.exit(1)
