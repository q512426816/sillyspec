/**
 * execute.js prompt 路径占位符化测试（坑 2）
 *
 * 验证 execute stage prompt 中 review.json / endpoints.json 路径用 {SPEC_ROOT}/.runtime/
 * 占位符，无裸 .sillyspec/.runtime/ 硬编码。平台模式下 {SPEC_ROOT} 由 run.js 平台路径
 * 重写消费（仓库内→.sillyspec，平台→specDir），修复「agent 写 cwd、gate 读 specDir」的
 * 路径错位（execute.js:623/644 原硬编码）。
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const executeSrc = readFileSync(join(here, '..', 'src', 'stages', 'execute.js'), 'utf8')

let failed = 0
const failures = []
function assertTrue(cond, msg) {
  if (cond) console.log(`  ✅ PASS: ${msg}`)
  else { failed++; failures.push(msg); console.log(`  ❌ FAIL: ${msg}`) }
}

console.log('=== execute.js prompt 路径占位符化（坑 2）===\n')

// 裸 .sillyspec/.runtime/ 硬编码应为 0（全部占位符化）
const bareHits = (executeSrc.match(/\.sillyspec\/\.runtime\//g) || []).length
assertTrue(bareHits === 0, `无裸 .sillyspec/.runtime/ 硬编码（实际 ${bareHits} 处）`)

// 长输出日志路径用占位符（review.json 面已随 2026-09-26-task-review-retire 退役——execute
// prompt 不再携带 review.json 路径；execute-runs 只剩 complete.js 门侧消费）
assertTrue(executeSrc.includes('{SPEC_ROOT}/.runtime/logs/'),
  '长输出日志路径用 {SPEC_ROOT}/.runtime/logs/ 占位符')

// endpoints.json 路径用占位符
assertTrue(executeSrc.includes('{SPEC_ROOT}/.runtime/contract-artifacts/'),
  'endpoints.json 路径用 {SPEC_ROOT}/.runtime/contract-artifacts/ 占位符')

console.log(`\n${'='.repeat(50)}`)
console.log(`✅ 通过: ${3 - failed}  ❌ 失败: ${failed}`)
if (failures.length > 0) { console.log('失败项:'); failures.forEach(f => console.log(`  - ${f}`)) }
console.log('='.repeat(50))
if (failed > 0) process.exit(1)
