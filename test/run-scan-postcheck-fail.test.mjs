/**
 * task-06: scan post-check 失败补 return + completed 标记推迟 + 平台模式 exit(1)
 *
 * 验证点：
 * - AC-1: run.js:2433-2438 失败分支末尾补 return { stageCompleted:false, currentIdx, nextPendingIdx: currentIdx }
 * - AC-2: 平台模式 (platformOpts.specRoot || platformOpts.runtimeRoot) 时 process.exit(1)
 * - AC-3: 返回结构与 plan contract (run.js:2551 附近) 完全一致
 * - AC-4: 非平台模式不 exit（只有 if platformOpts 守卫内的 exit）
 */
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const runPath = join(__dirname, '..', 'src', 'run.js')
const src = readFileSync(runPath, 'utf8')

let passed = 0
let failed = 0
function check (cond, msg) {
  if (cond) { console.log(`✅ PASS: ${msg}`); passed++ }
  else { console.error(`❌ FAIL: ${msg}`); failed++ }
}

// 定位 scan post-check failed_post_check 分支
// 已知关键锚：stageData.status = SCAN_STATUS.FAILED_POST_CHECK
const failedAnchor = src.indexOf("postResult.status === 'failed_post_check'")
check(failedAnchor > 0, "源码含 'failed_post_check' 失败分支锚点")

// 从锚点向后 800 字符内应该有 return { stageCompleted: false ... }
const tail = src.slice(failedAnchor, failedAnchor + 1200)
const hasReturnFalse = /return\s*\{\s*stageCompleted:\s*false/.test(tail)
check(hasReturnFalse, '失败分支末尾补 return { stageCompleted: false, ... }')

// nextPendingIdx: currentIdx 字面出现（与 plan contract 一致）
const hasNextPendingCurrent = /nextPendingIdx:\s*currentIdx/.test(tail)
check(hasNextPendingCurrent, '失败分支返回 nextPendingIdx: currentIdx（plan contract 对齐）')

// 平台模式 process.exit(1)
const hasExitGuard = /platformOpts\.specRoot\s*\|\|\s*platformOpts\.runtimeRoot/.test(tail)
const hasExitOne = /process\.exit\(1\)/.test(tail)
check(hasExitGuard && hasExitOne, '失败分支含平台模式守卫 + process.exit(1)')

// 验证 exit(1) 在 if 守卫内（不是裸调）—— 取 exit(1) 位置向前回溯到最近的 } 或 {
const exitPos = tail.indexOf('process.exit(1)')
const segmentBeforeExit = tail.slice(0, exitPos)
const lastOpenBrace = segmentBeforeExit.lastIndexOf('{')
const lastCloseBrace = segmentBeforeExit.lastIndexOf('}')
check(lastOpenBrace > lastCloseBrace, 'process.exit(1) 在某个 if 块的 { ... } 内（受守卫保护）')

// 验证 exit 守卫表达式在 exit 之前的同一块内
const guardSegment = tail.slice(Math.max(0, exitPos - 300), exitPos)
check(/platformOpts\.(specRoot|runtimeRoot)/.test(guardSegment),
  'process.exit(1) 前的代码块内含平台模式守卫条件')

// 对照 plan contract（run.js 内 plan 失败分支 return 结构）
// 定位 plan 阶段失败分支的 stageCompleted:false return
const planFailMatch = src.match(/plan[\s\S]{0,2000}?return\s*\{\s*stageCompleted:\s*false[\s\S]{0,200}?\}/)
check(!!planFailMatch, 'plan contract 存在 stageCompleted:false return（对照基准）')

console.log(`\n${'='.repeat(50)}`)
console.log(`✅ 通过: ${passed}  ❌ 失败: ${failed}`)
console.log(`${'='.repeat(50)}`)
if (failed > 0) process.exit(1)
