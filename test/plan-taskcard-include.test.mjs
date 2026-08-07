/**
 * buildCoordinatorStep TaskCard 格式规则抽模板（sss.md B4 + B5）
 *
 * 背景：plan Step4 协调器 prompt 里 ~60 行 TaskCard 公共格式规则在 N 个 task 子代理模板间逐字重复
 * （真实 10-task 单步重复 10 段）。改为抽 templates/prompts/taskcard-rules.md，
 * 子代理 prompt 里用 {{include: taskcard-rules}} 引用（resolvePromptIncludes 运行时注入）。
 * 收益=维护性（规则改一处）+ 可单独校验；token 不省（include 全替换，P2.2.3 已确认机制固有）。
 * 顺带 B5：自检清单区分「硬校验字段（plan-postcheck 阻断）」vs「规范约定字段（不阻断）」。
 */
import { buildCoordinatorStep } from '../src/stages/plan.js'
import { resolvePromptIncludes } from '../src/run/shared.js'
import { existsSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const tplPath = join(__dirname, '..', 'templates', 'prompts', 'taskcard-rules.md')

let failed = 0
const failures = []
function assertTrue(cond, msg) {
  if (cond) console.log(`  ✅ PASS: ${msg}`)
  else { failed++; failures.push(msg); console.log(`  ❌ FAIL: ${msg}`) }
}

console.log('=== buildCoordinatorStep TaskCard 规则抽模板（B4+B5）===\n')

{
  const step = buildCoordinatorStep('/tmp/change', [
    { num: '01', name: '外壳' },
    { num: '02', name: 'layout' },
  ])
  const prompt = step.prompt
  assertTrue((prompt.match(/\{\{include: taskcard-rules\}\}/g) || []).length === 2,
    '每个 task 子代理 prompt 各含一个 {{include: taskcard-rules}}（2-task → 2 个）')
  assertTrue(!prompt.includes('TaskCard 格式规则（必须严格遵守）：'),
    '内联公共规则已移除（不再逐字重复）')
  assertTrue(prompt.includes('task-01: 外壳') && prompt.includes('task-02: layout'),
    'task 特定部分（编号/名称）保留')
}

{
  assertTrue(existsSync(tplPath), '模板文件 templates/prompts/taskcard-rules.md 存在')
  const injected = resolvePromptIncludes('{{include: taskcard-rules}}')
  assertTrue(injected.includes('TaskCard 格式规则（必须严格遵守）：'),
    'resolvePromptIncludes 注入模板内容')
  assertTrue(injected.includes('硬校验字段') && injected.includes('规范约定字段'),
    'B5：自检清单区分硬校验 / 规范约定字段')
  assertTrue(injected.includes('id、title、title_zh、allowed_paths、goal、implementation、acceptance、verify、constraints'),
    '硬校验 9 字段齐全（与 validatePlanFeasibility 对齐）')
  assertTrue(!injected.includes('{{include:'), '注入后无残留占位符')
}

console.log(`\n${'='.repeat(50)}`)
const total = 8
console.log(`✅ 通过: ${total - failed}  ❌ 失败: ${failed}`)
if (failures.length > 0) { console.log('失败项:'); failures.forEach(f => console.log(`  - ${f}`)) }
console.log('='.repeat(50))
if (failed > 0) process.exit(1)
