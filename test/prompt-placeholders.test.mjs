/**
 * applyRootPlaceholders 纯函数单测
 *
 * 该 helper 是平台模式与常规模式共用的 {SPEC_ROOT}/{DOCS_ROOT}/
 * {PROJECTS_ROOT}/{WORKFLOWS_ROOT}/{KNOWLEDGE_ROOT} 路径根占位符替换逻辑
 * （从 outputStep 两处逐字重复抽取）。锁死其契约，防回归。
 *
 * 覆盖：
 * - 5 个占位符全部替换为传入的 roots 值
 * - 多次出现的占位符全局替换（/g）
 * - 非占位符文本原样保留
 * - 值是绝对路径、互不含其它占位符 → 替换顺序无关（SPEC_ROOT 先后都不影响）
 * - 混合占位符与普通文本的 prompt 片段
 */
import { applyRootPlaceholders } from '../src/run.js'

let passed = 0
let failed = 0
function assertEqual(actual, expected, msg) {
  const ok = actual === expected
  if (ok) { console.log(`✅ PASS: ${msg}`); passed++ }
  else { console.error(`❌ FAIL: ${msg}\n   expected: ${JSON.stringify(expected)}\n   actual:   ${JSON.stringify(actual)}`); failed++ }
}

const roots = {
  specRoot: '/repo/.sillyspec',
  docsRoot: '/repo/.sillyspec/docs/frontend',
  projectsRoot: '/repo/.sillyspec/projects',
  workflowsRoot: '/repo/.sillyspec/workflows',
  knowledgeRoot: '/repo/.sillyspec/knowledge',
}

// 5 个占位符全部替换
assertEqual(
  applyRootPlaceholders('{SPEC_ROOT}', roots),
  '/repo/.sillyspec',
  '{SPEC_ROOT} 单独替换'
)
assertEqual(
  applyRootPlaceholders('{DOCS_ROOT}', roots),
  '/repo/.sillyspec/docs/frontend',
  '{DOCS_ROOT} 单独替换'
)
assertEqual(
  applyRootPlaceholders('{PROJECTS_ROOT}', roots),
  '/repo/.sillyspec/projects',
  '{PROJECTS_ROOT} 单独替换'
)
assertEqual(
  applyRootPlaceholders('{WORKFLOWS_ROOT}', roots),
  '/repo/.sillyspec/workflows',
  '{WORKFLOWS_ROOT} 单独替换'
)
assertEqual(
  applyRootPlaceholders('{KNOWLEDGE_ROOT}', roots),
  '/repo/.sillyspec/knowledge',
  '{KNOWLEDGE_ROOT} 单独替换'
)

// 全局替换：同一占位符多次出现全部替换
assertEqual(
  applyRootPlaceholders('{SPEC_ROOT}/a {SPEC_ROOT}/b', roots),
  '/repo/.sillyspec/a /repo/.sillyspec/b',
  '同一占位符多次出现全局替换'
)

// 非占位符文本原样保留
assertEqual(
  applyRootPlaceholders('hello world', roots),
  'hello world',
  '无占位符文本原样保留'
)
assertEqual(
  applyRootPlaceholders('{SPEC_ROOT}/scan/ARCHITECTURE.md 是文档', roots),
  '/repo/.sillyspec/scan/ARCHITECTURE.md 是文档',
  '占位符 + 普通文本（含中文）混合保留'
)

// 未识别的伪占位符不动（不应误伤 {CHANGE_ROOT} 之类）
assertEqual(
  applyRootPlaceholders('{SPEC_ROOT} {CHANGE_ROOT}', roots),
  '/repo/.sillyspec {CHANGE_ROOT}',
  '未声明的 {CHANGE_ROOT} 不被替换'
)

// 模拟真实 prompt 片段：多占位符 + 路径拼接
assertEqual(
  applyRootPlaceholders('写入 {DOCS_ROOT}/scan/ARCHITECTURE.md，注册到 {PROJECTS_ROOT}/registry.json', roots),
  '写入 /repo/.sillyspec/docs/frontend/scan/ARCHITECTURE.md，注册到 /repo/.sillyspec/projects/registry.json',
  '真实 prompt 片段多占位符替换'
)

// 替换顺序无关：值是绝对路径、互不含其它占位符，SPEC_ROOT 无论含不含都不二次展开
const nestedRoots = {
  specRoot: '/repo/.sillyspec',
  docsRoot: '/repo/.sillyspec/docs/frontend',
  projectsRoot: '/repo/.sillyspec/projects',
  workflowsRoot: '/repo/.sillyspec/workflows',
  knowledgeRoot: '/repo/.sillyspec/knowledge',
}
assertEqual(
  applyRootPlaceholders('{SPEC_ROOT} {DOCS_ROOT}', nestedRoots),
  '/repo/.sillyspec /repo/.sillyspec/docs/frontend',
  'docsRoot 含 specRoot 路径前缀但非占位符 → 不二次展开'
)

console.log(`\n${'='.repeat(50)}`)
console.log(`✅ 通过: ${passed}  ❌ 失败: ${failed}`)
console.log(`${'='.repeat(50)}`)
if (failed > 0) process.exit(1)
