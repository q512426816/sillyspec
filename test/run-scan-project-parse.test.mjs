/**
 * scan step 2 项目列表解析 — 强契约测试
 *
 * 解析只接受两种结构化格式：
 *   A) YAML block: scan_projects:\n  - id: name
 *   B) BEGIN_PROJECT_LIST ... END_PROJECT_LIST
 *
 * 自由文本列表不再解析，防止误识别垃圾项目名。
 */
import { sanitizeProjectName, validateParsedProjects } from '../src/run.js'

let passed = 0
let failed = 0
function assertDeepEqual (actual, expected, msg) {
  const a = JSON.stringify(actual)
  const e = JSON.stringify(expected)
  if (a === e) { console.log(`✅ PASS: ${msg}`); passed++ }
  else { console.error(`❌ FAIL: ${msg}\n   expected: ${e}\n   actual:   ${a}`); failed++ }
}
function assertEqual (actual, expected, msg) {
  if (actual === expected) { console.log(`✅ PASS: ${msg}`); passed++ }
  else { console.error(`❌ FAIL: ${msg}\n   expected: ${expected}\n   actual:   ${actual}`); failed++ }
}
function assertIncludes (str, sub, msg) {
  if (str.includes(sub)) { console.log(`✅ PASS: ${msg}`); passed++ }
  else { console.error(`❌ FAIL: ${msg}\n   expected to include: ${sub}\n   actual: ${str}`); failed++ }
}

// ---- 复刻 run.js 中新的解析逻辑 ----
function parseProjectListFromOutput(outputText) {
  let parsedProjects = [] // Array<{id, path?}>
  let parsedFromStructuredOutput = false
  if (outputText) {
    // 格式 A: YAML block
    const yamlBlock = outputText.match(/scan_projects:\s*\n([\s\S]+?)(?=$|\n[^\s])/)
    if (yamlBlock) {
      const entries = [...yamlBlock[1].matchAll(/-\s+id:\s*(\S+)(?:[\s\S]*?)(?=\n\s+-\s+id:|$)/g)]
      for (const m of entries) {
        const id = sanitizeProjectName(m[1])
        if (!id) continue
        const pathMatch = m[0].match(/path:\s*(\S+)/)
        const entry = pathMatch ? { id, path: pathMatch[1].trim() } : { id }
        parsedProjects.push(entry)
      }
      parsedFromStructuredOutput = parsedProjects.length > 0
    }
    // 格式 B: BEGIN_PROJECT_LIST
    if (!parsedFromStructuredOutput) {
      const blockMatch = outputText.match(/BEGIN_PROJECT_LIST\s*\n([\s\S]*?)\n*END_PROJECT_LIST/)
      if (blockMatch) {
        const raw = [...blockMatch[1].matchAll(/^-\s+(\S+)/gm)].map(m => m[1])
        parsedProjects = raw.map(s => sanitizeProjectName(s)).filter(Boolean).map(id => ({ id }))
        parsedFromStructuredOutput = parsedProjects.length > 0
      }
    }
  }
  return { parsedProjects, parsedFromStructuredOutput }
}

// ======== 解析测试 ========

// 1. YAML block 正常解析
assertDeepEqual(
  parseProjectListFromOutput(`scan_projects:
  - id: backend
  - id: frontend
  - id: daemon
`).parsedProjects,
  [{ id: 'backend' }, { id: 'frontend' }, { id: 'daemon' }],
  'YAML block 正常解析 3 个项目'
)

// 2. YAML block 带 path 字段（多行属性）
const r2 = parseProjectListFromOutput(`scan_projects:
  - id: api
    path: backend/
  - id: web
    path: frontend/
`).parsedProjects
assertDeepEqual(r2, [{ id: 'api', path: 'backend/' }, { id: 'web', path: 'frontend/' }],
  'YAML block 带 path 字段正常解析')

// 3. BEGIN_PROJECT_LIST 正常解析
assertDeepEqual(
  parseProjectListFromOutput(`BEGIN_PROJECT_LIST
- backend
- frontend
- daemon
END_PROJECT_LIST`).parsedProjects,
  [{ id: 'backend' }, { id: 'frontend' }, { id: 'daemon' }],
  'BEGIN_PROJECT_LIST 标记块正常解析'
)

// 4. 自由文本编号列表 → 不解析
const { parsedProjects: fn, parsedFromStructuredOutput: fnParsed } =
  parseProjectListFromOutput('扫描项目列表：\n1. scan1backendmulti-agent-platform-api FastAPI Python\n2. frontendmulti-agent-platform-web Next.js TS\n3. sillyhub-daemon Node.js TS')
assertEqual(fnParsed, false, '自由文本编号列表不触发解析')
assertDeepEqual(fn, [], '自由文本编号列表不产生任何项目名')

// 5. 自由文本括号枚举 → 不解析
const { parsedProjects: fn2, parsedFromStructuredOutput: fn2Parsed } =
  parseProjectListFromOutput('子项目: backend / frontend / user-service')
assertEqual(fn2Parsed, false, '自由文本括号枚举不触发解析')
assertDeepEqual(fn2, [], '自由文本括号枚举不产生任何项目名')

// 6. 空 outputText → 不解析
const { parsedFromStructuredOutput: emptyParsed } = parseProjectListFromOutput('')
assertEqual(emptyParsed, false, '空 outputText 不触发解析')

// 7. 普通摘要文本 → 不解析
const { parsedProjects: summary, parsedFromStructuredOutput: summaryParsed } =
  parseProjectListFromOutput('确认扫描 3 个子项目：backend、frontend、daemon，全部重新扫描')
assertEqual(summaryParsed, false, '普通摘要文本不触发解析')
assertDeepEqual(summary, [], '普通摘要文本不产生任何项目名')

// ======== validateParsedProjects — 基础校验 ========

// 8. 正常列表（无 path）
assertDeepEqual(
  validateParsedProjects([{ id: 'backend' }, { id: 'frontend' }, { id: 'daemon' }], '/tmp/proj'),
  { ok: true, errors: [] },
  '正常列表校验通过（无 path）'
)

// 9. 正常列表（有合法 path）——需要用真实路径
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs'
import { join } from 'path'
import os from 'os'
const tmpDir = mkdtempSync(join(os.tmpdir(), 'sillyspec-test-'))
mkdirSync(join(tmpDir, 'backend'))
mkdirSync(join(tmpDir, 'frontend'))
assertDeepEqual(
  validateParsedProjects([
    { id: 'backend', path: 'backend' },
    { id: 'frontend', path: 'frontend' }
  ], tmpDir),
  { ok: true, errors: [] },
  '合法 path 校验通过'
)

// 10. path 不存在 → 失败
const v10 = validateParsedProjects([{ id: 'backend', path: 'nonexistent' }], tmpDir)
assertEqual(v10.ok, false, 'path 不存在校验失败')
assertIncludes(v10.errors[0], '不存在', '错误提示包含"不存在"')

// 11. path 含 .. 越界 → 失败
const v11 = validateParsedProjects([{ id: 'backend', path: '../etc/passwd' }], tmpDir)
assertEqual(v11.ok, false, 'path 包含 .. 校验失败')
assertIncludes(v11.errors[0], '..', '错误提示包含 ..')

// 12. path 解析后超出 source_root → 失败
const v12 = validateParsedProjects([{ id: 'backend', path: '/etc/passwd' }], tmpDir)
assertEqual(v12.ok, false, '绝对路径超出 source_root 校验失败')
assertIncludes(v12.errors[0], '超出', '错误提示包含"超出"')

// 13. 超过 10 个项目 → 失败
const many = Array.from({ length: 11 }, (_, i) => ({ id: `project${i}` }))
const v13 = validateParsedProjects(many, tmpDir)
assertEqual(v13.ok, false, '超过 10 个项目校验失败')
assertIncludes(v13.errors[0], '超过上限', '错误提示包含"超过上限"')

// 14. 重复项目名 → 失败
const v14 = validateParsedProjects([{ id: 'backend' }, { id: 'frontend' }, { id: 'backend' }], tmpDir)
assertEqual(v14.ok, false, '重复项目名校验失败')
assertIncludes(v14.errors[0], '重复', '错误提示包含"重复"')

// 15. 非法 slug（中文）→ 失败
const v15 = validateParsedProjects([{ id: 'backend' }, { id: '前端服务' }], tmpDir)
assertEqual(v15.ok, false, '非法 slug 校验失败')

// 16. 空列表 → 失败
const v16 = validateParsedProjects([], tmpDir)
assertEqual(v16.ok, false, '空列表校验失败')

// 17. null 列表 → 失败
const v17 = validateParsedProjects(null, tmpDir)
assertEqual(v17.ok, false, 'null 列表校验失败')

// 18. 单字符 → 失败
const v18 = validateParsedProjects([{ id: 'a' }], tmpDir)
assertEqual(v18.ok, false, '单字符项目名校验失败')

// 19. 纯数字 → 失败
const v19 = validateParsedProjects([{ id: '123' }], tmpDir)
assertEqual(v19.ok, false, '纯数字项目名校验失败')

// 20. 兼容旧 API（纯字符串数组）
assertDeepEqual(
  validateParsedProjects(['backend', 'frontend'], tmpDir),
  { ok: true, errors: [] },
  '旧 API 兼容：纯字符串数组仍通过'
)

// 清理
rmSync(tmpDir, { recursive: true, force: true })

console.log(`\n${'='.repeat(50)}`)
console.log(`✅ 通过: ${passed}  ❌ 失败: ${failed}`)
console.log(`${'='.repeat(50)}`)
if (failed > 0) process.exit(1)
