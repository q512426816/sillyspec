/**
 * plan.md 全局验收标准段不做执行态（2026-08-20 僵尸 checkbox 修复回归）
 *
 * 背景：full 模板的全局验收标准曾用 `- [ ]` checkbox，但机器侧零消费（无解析器/
 * 勾选器/门禁读它），执行完永远未勾——与 tasks.md 骨架修复前同款僵尸态。
 * 裁决（方案2 纯减法）：模板改编号清单；验收结论统一归 verify-result.md，
 * plan.md 彻底不做执行态文件。
 *
 * 锁定语义：
 *   1. plan.js full 模板的全局验收标准段无 `- [ ]` checkbox（编号清单形态）
 *   2. 段内指明验收结论承接方（verify-result.md）——防「清单写了但结论无处落」断链
 *   3. 镜像 docs/prompt/plan.md 与源码一致（含编号清单与承接说明）
 */
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

let passed = 0, failed = 0
const failures = []
const assert = (cond, msg) => { cond ? (passed++, console.log(`  ✅ PASS: ${msg}`)) : (failed++, failures.push(msg), console.log(`  ❌ FAIL: ${msg}`)) }

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const src = readFileSync(join(root, 'src/stages/plan.js'), 'utf8')
const mirror = readFileSync(join(root, 'docs/prompt/plan.md'), 'utf8')

function section(content, from, to) {
  const i = content.indexOf(from)
  if (i < 0) return null
  const j = to ? content.indexOf(to, i) : content.length
  return content.slice(i, j)
}

console.log('=== 全局验收标准段不做执行态（僵尸 checkbox 修复）===\n')

console.log('--- ① 源码模板：无 checkbox + 编号清单 ---')
{
  const sec = section(src, '## 全局验收标准', '## 覆盖矩阵')
  assert(sec != null, '模板含全局验收标准段')
  assert(!/- \[[ x]\]/.test(sec), '段内无 `- [ ]` checkbox（不再产生待勾执行态）')
  assert(/^1\. /m.test(sec) && /^2\. /m.test(sec), '编号清单形态（1. 2. …）')
}

console.log('\n--- ② 承接说明：验收结论指向 verify-result.md ---')
{
  const sec = section(src, '## 全局验收标准', '## 覆盖矩阵')
  assert(sec.includes('verify-result.md'), '段内指明验收结论落 verify-result.md')
  assert(sec.includes('acceptance'), 'task 级验收指向 TaskCard acceptance 字段')
}

console.log('\n--- ③ 镜像一致 ---')
{
  const sec = section(mirror, '## 全局验收标准', '## 覆盖矩阵')
  assert(sec != null && !/- \[[ x]\]/.test(sec), 'docs/prompt/plan.md 镜像段同步无 checkbox')
  assert(sec != null && sec.includes('verify-result.md'), '镜像含承接说明')
}

console.log('\n' + '='.repeat(50))
console.log(`✅ 通过: ${passed}  ❌ 失败: ${failed}`)
if (failures.length) console.log(`失败项: ${failures.join('; ')}`)
console.log('='.repeat(50))
if (failed > 0) process.exit(1)
