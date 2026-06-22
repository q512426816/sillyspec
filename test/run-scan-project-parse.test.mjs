/**
 * task-09 集成：编号正则收紧 + sanitize 联动
 *
 * 模拟 run.js:2176 处的解析逻辑（正则 + raw 处理 + sanitizeProjectName + filter(Boolean)）
 * 验证：
 * - "1. frontend\n2. 0\n3. 7\n4. order-service" → ['frontend', 'order-service']（"0"/"7" 被拒）
 * - 步骤说明"1. 执行 init"不进 projectNames（中文不匹配 [a-zA-Z] 开头）
 * - 兜底分支不被污染（outputText 为空 → 走兜底）
 */
import { sanitizeProjectName } from '../src/run.js'

let passed = 0
let failed = 0
function assertDeepEqual (actual, expected, msg) {
  const a = JSON.stringify(actual)
  const e = JSON.stringify(expected)
  if (a === e) { console.log(`✅ PASS: ${msg}`); passed++ }
  else { console.error(`❌ FAIL: ${msg}\n   expected: ${e}\n   actual:   ${a}`); failed++ }
}

// 复刻 run.js:2175-2179 的解析链路
// task-05 B2 延伸修正：编号解析链 .replace 只针对中文长破折号 `—`，
// 不再误伤 ASCII `-`（否则 order-service 会被切成 order）。
function parseNumberedList(outputText) {
  if (!outputText) return []
  const numbered = outputText.match(/^\s*\d+\.\s+([a-zA-Z][\w\-.]*)/gm)
  if (!numbered) return []
  const raw = numbered.map(m => m.replace(/^\s*\d+\.\s+/, '').replace(/—.*$/, '').trim())
  return raw.map(sanitizeProjectName).filter(Boolean)
}

// 用例 1：脏数据列表（task-09 核心场景）+ ASCII 连字符保留（task-05 B2 延伸修正）
assertDeepEqual(
  parseNumberedList('扫描项目列表：\n1. frontend\n2. 0\n3. 7\n4. order-service\n'),
  ['frontend', 'order-service'],
  '脏数据列表：纯数字被拒（task-09）；order-service 完整保留（ASCII - 不再被误切）'
)

// 用例 2：步骤说明干扰（方案 A 边界）
assertDeepEqual(
  parseNumberedList('以下是步骤：\n1. 执行 init\n2. 启动 scan\n3. frontend\n'),
  ['frontend'],
  '步骤说明中"1. 执行 init"中文不匹配，仅"3. frontend"入选'
)

// 用例 3：英文步骤说明干扰（方案 A 已知边界，task-09 §TDD 第 5 步）
// 注：英文"1. Run scan"会匹配到 "Run"，经 sanitize 通过。这是方案 A 的已知边界，
// task-09 §实现要求 2 选 A 的前提是"sanitizeProjectName 字母校验双保险"——
// 纯数字场景已解决（本任务目标），英文步骤误匹配留待 execute 发现再切方案 B。
const r3 = parseNumberedList('Steps:\n1. Run scan first\n2. backend\n')
assertDeepEqual(
  r3,
  ['Run', 'backend'],
  '英文步骤会误匹配（方案 A 已知边界，纯数字目标已达成）'
)

// 用例 4：空 outputText
assertDeepEqual(parseNumberedList(''), [], '空 outputText 返回空列表')

// 用例 5：含下划线/点的项目名（避开既有 -replace bug，专测 sanitize）
assertDeepEqual(
  parseNumberedList('1. app.v2\n2. web_api\n'),
  ['app.v2', 'web_api'],
  '合法项目名（点/下划线）保留'
)

// 用例 6：0/7 这种斜杠分隔的会被单条编号捕获再 sanitize 拒绝
assertDeepEqual(
  parseNumberedList('1. 0/7\n2. frontend\n'),
  ['frontend'],
  '"0/7" 单条：正则匹配失败（首字符 0 非字母）→ 整条丢弃'
)

console.log(`\n${'='.repeat(50)}`)
console.log(`✅ 通过: ${passed}  ❌ 失败: ${failed}`)
console.log(`${'='.repeat(50)}`)
if (failed > 0) process.exit(1)
