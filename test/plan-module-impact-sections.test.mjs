/**
 * plan/archive 阶段 module-impact 生成 prompt 与 archive-impact.yaml contains_sections 章节名同源回归
 * （troubleshooting 第 12 条，ql-20260819-007-d4f0）。
 *
 * 锁住的不变量：module-impact.md 的两个「生成方 prompt」（plan 审查计划步首版 + archive
 * extract-module-impact 步降级补写）与唯一机械校验方（archive-impact.yaml contains_sections）
 * 章节名三方一致。历史缺陷：plan prompt 只说「生成模块影响矩阵」未钉死标题，agent 写成
 * 「## 影响矩阵」变体 → verify advisory 不查章节名放行 → archive 机械校验硬拦返工。
 *
 * 覆盖：
 *   - templates/workflows/archive-impact.yaml（npm 分发正源）与 .sillyspec/workflows/ 活副本一致（防分发漂移）
 *   - yaml contains_sections 期望「模块影响矩阵」「未匹配文件」两章节
 *   - plan 审查计划步 prompt 含两章节标题字面（buildPlanSteps 动态取，非源码字符串匹配）
 *   - archive extract-module-impact 步 prompt 同样含两章节名（降级补写路径不脱锚）
 */
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import jsYaml from 'js-yaml'
import { buildPlanSteps } from '../src/stages/plan.js'
import { definition as archiveDef } from '../src/stages/archive.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(__dirname, '..')

const count = { passed: 0, failed: 0, failures: [] }
const assert = (cond, msg) => { cond ? (count.passed++, console.log(`  ✅ PASS: ${msg}`)) : (count.failed++, count.failures.push(msg), console.log(`  ❌ FAIL: ${msg}`)) }

console.log('=== module-impact 章节名三方同源（yaml 契约 × plan prompt × archive prompt）===\n')

// ── 1. 分发正源与 dogfood 活副本一致 ──
const templateYaml = readFileSync(join(repoRoot, 'templates', 'workflows', 'archive-impact.yaml'), 'utf8')
const liveYaml = readFileSync(join(repoRoot, '.sillyspec', 'workflows', 'archive-impact.yaml'), 'utf8')
assert(templateYaml === liveYaml, 'templates/workflows/archive-impact.yaml 与 .sillyspec/workflows/ 活副本逐字节一致（分发不漂移）')

// ── 2. 提取 yaml 契约的 contains_sections 期望 ──
const wf = jsYaml.load(templateYaml)
const impactRole = (wf.roles || []).find(r => r.id === 'impact-analyzer')
assert(!!impactRole, 'yaml 含 impact-analyzer 角色')
const sectionChecks = ((impactRole?.outputs) || []).flatMap(o => (o.checks || []).filter(c => c.type === 'contains_sections'))
assert(sectionChecks.length > 0, 'impact-analyzer 输出含 contains_sections 检查')
const expectedSections = sectionChecks.flatMap(c => c.sections || [])
assert(expectedSections.includes('模块影响矩阵') && expectedSections.includes('未匹配文件'),
  `contains_sections 期望含「模块影响矩阵」「未匹配文件」（实际：${expectedSections.join('、')}）`)

// ── 3. plan 审查计划步 prompt 含全部期望章节标题字面 ──
const planSteps = buildPlanSteps(null, null)
const reviewStep = planSteps.find(s => s.name === '审查计划')
assert(!!reviewStep, 'buildPlanSteps 产出「审查计划」步（fixedPrefix）')
for (const sec of expectedSections) {
  assert(reviewStep.prompt.includes(`## ${sec}`), `plan 审查计划步 prompt 含章节标题字面「## ${sec}」`)
}
assert(reviewStep.prompt.includes('未命中的归「未匹配文件」章节'), 'plan prompt 步骤 2 指引未命中文件归「未匹配文件」章节')

// ── 4. archive extract-module-impact 步 prompt（降级补写路径）同样含两章节名 ──
const archiveSteps = (archiveDef.steps || [])
const impactStep = archiveSteps.find(s => (s.name || '').includes('extract-module-impact'))
assert(!!impactStep, 'archive definition 含 extract-module-impact 步')
for (const sec of expectedSections) {
  assert(impactStep.prompt.includes(sec), `archive extract-module-impact 步 prompt 含「${sec}」`)
}

console.log(`\n${'='.repeat(50)}`)
console.log(`✅ 通过: ${count.passed}  ❌ 失败: ${count.failed}`)
console.log(`${'='.repeat(50)}`)
if (count.failed > 0) process.exit(1)
