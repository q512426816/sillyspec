/**
 * plan-postcheck CRLF 行尾回归测试
 * 缺陷：windows-python-crlf-taskcard —— Windows 下 python/编辑器文本模式写 task-NN.md
 * 产生 CRLF，plan-postcheck 的 frontmatter/字段正则（`^---\n`、`allowed_paths:\s*\n…`、`^goal:`）
 * 失配，报「缺 frontmatter / 缺字段」假错误。
 *
 * 修复：plan-postcheck.js 读取 .md 时统一归一化 CRLF→LF（readFileSync 包装）。
 *
 * 本测试构造字段完整但行尾为 CRLF 的 task-01.md，断言 validatePlanFeasibility 不报假错误。
 */
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { validatePlanFeasibility } from '../src/stages/plan-postcheck.js'

let total = 0, failed = 0
function assert(cond, msg) {
  total++
  if (!cond) { failed++; console.log(`  ❌ FAIL: ${msg}`) }
  else console.log(`  ✅ PASS: ${msg}`)
}

console.log('=== plan-postcheck CRLF 行尾回归 ===\n')

const LF_BODY = [
  '---',
  'id: task-01',
  'title: CRLF 兼容测试',
  'allowed_paths:',
  '  - src/app.js',
  'goal: 实现 X 功能',
  'implementation: 修改 src/app.js',
  'acceptance: 接口返回正确',
  'verify: npm test',
  'constraints: 不破坏旧接口',
  'depends_on: ',
  '---',
  '',
  '## 正文',
  '',
  '正文内容。',
].join('\n')

// 场景 1：CRLF 行尾（缺陷复现条件）—— 修复前会报一堆假错误
console.log('--- 场景 1：CRLF task 文件（核心回归）---')
{
  const changeDir = mkdtempSync(join(tmpdir(), 'plan-crlf-'))
  mkdirSync(join(changeDir, 'tasks'), { recursive: true })
  const crlfContent = LF_BODY.replace(/\n/g, '\r\n')
  writeFileSync(join(changeDir, 'tasks', 'task-01.md'), crlfContent)
  // 确认落盘确实是 CRLF
  const raw = readFileSync(join(changeDir, 'tasks', 'task-01.md'), 'utf8')
  assert(raw.includes('\r\n'), 'task 文件落盘为 CRLF（缺陷复现条件）')

  const result = validatePlanFeasibility(changeDir)
  const frontmatterErrs = result.errors.filter(e => /frontmatter|allowed_paths 为空|缺少 (goal|implementation|acceptance|verify|constraints) 字段/.test(e))
  assert(frontmatterErrs.length === 0, `CRLF task 不报 frontmatter/字段假错误（实际 errors: ${JSON.stringify(result.errors)}）`)
  assert(result.ok, `CRLF task 整体校验通过（ok=${result.ok}）`)
}

// 场景 2：LF 行尾（回归保护，确保归一化不破坏正常文件）
console.log('\n--- 场景 2：LF task 文件（回归保护）---')
{
  const changeDir = mkdtempSync(join(tmpdir(), 'plan-lf-'))
  mkdirSync(join(changeDir, 'tasks'), { recursive: true })
  writeFileSync(join(changeDir, 'tasks', 'task-01.md'), LF_BODY)
  const result = validatePlanFeasibility(changeDir)
  const frontmatterErrs = result.errors.filter(e => /frontmatter|allowed_paths 为空|缺少 (goal|implementation|acceptance|verify|constraints) 字段/.test(e))
  assert(frontmatterErrs.length === 0, `LF task 仍正常通过（归一化不破坏正常文件）`)
  assert(result.ok, `LF task 整体校验通过`)
}

// 场景 3：字段真缺失（CRLF）—— 确保归一化后真错误仍被抓到，不是「全放行」
console.log('\n--- 场景 3：CRLF 且真缺字段（确保真错误仍报）---')
{
  const changeDir = mkdtempSync(join(tmpdir(), 'plan-crlf-missing-'))
  mkdirSync(join(changeDir, 'tasks'), { recursive: true })
  const missing = [
    '---',
    'id: task-01',
    'title: 缺字段',
    'allowed_paths:',
    '  - src/app.js',
    'goal: 只有 goal',
    '---',
    '',
  ].join('\n').replace(/\n/g, '\r\n')
  writeFileSync(join(changeDir, 'tasks', 'task-01.md'), missing)
  const result = validatePlanFeasibility(changeDir)
  assert(result.errors.some(e => e.includes('缺少 implementation 字段')), 'CRLF 下真缺 implementation 仍被报错（非全放行）')
  assert(!result.ok, '真缺字段时 ok=false')
}

// 场景 4：inline allowed_paths: [path]（transcript 卡 3 轮根因 —— feasibility 旧正则只认块式，
// inline 写法被误报「allowed_paths 为空」；修复后复用 parseAllowedPaths，与 blueprint/coverage 统一）
console.log('\n--- 场景 4：inline allowed_paths（feasibility 须认，与 blueprint/coverage 统一）---')
{
  const changeDir = mkdtempSync(join(tmpdir(), 'plan-inline-'))
  mkdirSync(join(changeDir, 'tasks'), { recursive: true })
  const inlineBody = [
    '---',
    'id: task-01',
    'title: inline allowed_paths',
    'allowed_paths: [src/app.js, src/utils.js]',
    'goal: 实现 X',
    'implementation: 修改 src/app.js',
    'acceptance: 接口正确',
    'verify: npm test',
    'constraints: 不破坏旧接口',
    'depends_on: ',
    '---',
    '',
  ].join('\n')
  writeFileSync(join(changeDir, 'tasks', 'task-01.md'), inlineBody)
  const result = validatePlanFeasibility(changeDir)
  assert(!result.errors.some(e => e.includes('allowed_paths 为空')), 'inline allowed_paths 不被误报为空（feasibility 认 inline 写法）')
  assert(result.ok, 'inline allowed_paths 整体通过（ok=' + result.ok + ', errors: ' + JSON.stringify(result.errors) + ')')

  // CRLF + inline 双重容差（归一化 + inline 两种都要认）
  const changeDir2 = mkdtempSync(join(tmpdir(), 'plan-inline-crlf-'))
  mkdirSync(join(changeDir2, 'tasks'), { recursive: true })
  writeFileSync(join(changeDir2, 'tasks', 'task-01.md'), inlineBody.replace(/\n/g, '\r\n'))
  const result2 = validatePlanFeasibility(changeDir2)
  assert(!result2.errors.some(e => e.includes('allowed_paths 为空')), 'CRLF + inline allowed_paths 也不被误报为空')
}

console.log('\n==================================================')
console.log(`✅ 通过: ${total - failed}  ❌ 失败: ${failed}`)
console.log('==================================================')
if (failed > 0) process.exit(1)
