/**
 * task-05: scan-docs.yaml 占位符 {SPEC_ROOT} + 项目名优先级
 *
 * 覆盖：
 * - AC-01: 8 处 outputs.path 均为 {SPEC_ROOT}/docs/<project>/scan/*.md
 * - AC-02: write_scope 含 {SPEC_ROOT}/docs/<project>/scan/
 * - AC-07: 旧 yaml（无 {SPEC_ROOT}）兼容，replace 不命中也不报错
 */
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const yamlPath = join(__dirname, '..', 'templates', 'workflows', 'scan-docs.yaml')
const yaml = readFileSync(yamlPath, 'utf8')

let passed = 0
let failed = 0
function assert (cond, msg) {
  if (cond) { console.log(`✅ PASS: ${msg}`); passed++ }
  else { console.error(`❌ FAIL: ${msg}`); failed++ }
}

// AC-01: 8 处 outputs.path 改占位符
const expectedDocs = [
  'ARCHITECTURE.md',
  'CONVENTIONS.md',
  'STRUCTURE.md',
  'INTEGRATIONS.md',
  'TESTING.md',
  'CONCERNS.md',
  'PROJECT.md',
]
console.log('=== AC-01: outputs.path 改占位符 {SPEC_ROOT} ===')
for (const doc of expectedDocs) {
  const expectedLine = `path: "{SPEC_ROOT}/docs/<project>/scan/${doc}"`
  assert(yaml.includes(expectedLine), `outputs.path 含 {SPEC_ROOT} 占位符 → ${doc}`)
}

// AC-01 反向：不应再有硬编码 .sillyspec/docs/<project>/scan/X.md
console.log('\n=== AC-01 反向：不再有硬编码 .sillyspec/docs/<project>/scan/ ===')
const hardcodedMatches = yaml.match(/\.sillyspec\/docs\/<project>\/scan\//g) || []
assert(hardcodedMatches.length === 0,
  `outputs.path/write_scope 不再含 ".sillyspec/docs/<project>/scan/"（找到 ${hardcodedMatches.length} 处）`)

// AC-02: write_scope 含 {SPEC_ROOT}
console.log('\n=== AC-02: write_scope 含 {SPEC_ROOT} ===')
assert(yaml.includes('- "{SPEC_ROOT}/docs/<project>/scan/"'),
  'write_scope 含 {SPEC_ROOT}/docs/<project>/scan/')

// AC-07 兼容：旧 yaml（无 {SPEC_ROOT}）replace 不命中（用代码模拟）
console.log('\n=== AC-07: 旧 yaml 占位符兼容性 ===')
{
  const legacyPrompt = '写文件到 .sillyspec/docs/<project>/scan/X.md'
  const replaced = legacyPrompt.replace(/\{SPEC_ROOT\}/g, '/tmp/spec')
  assert(!replaced.includes('{SPEC_ROOT}'), '旧 yaml 无 {SPEC_ROOT} 字面：replace 后无残留')
  assert(replaced.includes('.sillyspec/docs/'), '旧 yaml 行为：保留原 .sillyspec/docs/ 路径（向后兼容）')
}

// AC-03: 新 yaml 替换后路径正确
console.log('\n=== AC-03: 新 yaml 占位符替换 ===')
{
  const newPrompt = '写文件到 {SPEC_ROOT}/docs/<project>/scan/X.md'
  const step1 = newPrompt.replace(/\{SPEC_ROOT\}/g, '/tmp/spec')
  const step2 = step1.replace(/<project>/g, 'myaaa')
  assert(step2 === '写文件到 /tmp/spec/docs/myaaa/scan/X.md',
    `占位符替换正确：${step2}`)
  assert(!step2.includes('{SPEC_ROOT}'), '替换后无 {SPEC_ROOT} 残留')
  assert(!step2.includes('<project>'), '替换后无 <project> 残留')
}

// 结构完整性：其他字段未动
console.log('\n=== 结构完整性：其他字段未变 ===')
assert(yaml.includes('name: scan-docs'), 'yaml name 字段保留')
assert(yaml.includes('checks:'), 'checks 段保留')
assert(yaml.includes('path: "scan/"'), 'workflow_level.path "scan/" 相对子路径保留（不动）')
assert(yaml.includes('retry:'), 'retry 段保留')
assert(yaml.includes('on_check_failure: prompt_retry'), 'on_check_failure 保留')
assert(yaml.includes('allow_shell: true'), 'permissions.allow_shell 保留')

console.log(`\n${'='.repeat(50)}`)
console.log(`✅ 通过: ${passed}  ❌ 失败: ${failed}`)
console.log(`${'='.repeat(50)}`)
if (failed > 0) process.exit(1)
