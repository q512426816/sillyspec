/**
 * 防回归测试：scan.js 中不允许硬编码 .sillyspec/docs/<project>/ 作为写入路径
 * 所有正式文档路径必须使用 {DOCS_ROOT} 占位符
 */
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const scanPath = join(__dirname, '..', 'src', 'stages', 'scan.js')
const content = readFileSync(scanPath, 'utf8')

const banned = [
  '.sillyspec/docs/<project>/scan/',
  '.sillyspec/docs/<project>/modules/',
  '.sillyspec/docs/<project>/flows/',
  '.sillyspec/docs/<project>/glossary.md',
]

const required = [
  '{DOCS_ROOT}/scan/',
  '{DOCS_ROOT}/modules/',
  '{DOCS_ROOT}/flows/',
]

let failed = false

// 禁止硬编码路径
for (const pattern of banned) {
  if (content.includes(pattern)) {
    console.error(`❌ FAIL: scan.js 仍包含硬编码路径 "${pattern}"`)
    failed = true
  } else {
    console.log(`✅ PASS: 不包含 "${pattern}"`)
  }
}

// 必须包含占位符
for (const pattern of required) {
  if (content.includes(pattern)) {
    console.log(`✅ PASS: 包含占位符 "${pattern}"`)
  } else {
    console.error(`❌ FAIL: scan.js 缺少占位符 "${pattern}"`)
    failed = true
  }
}

// 禁止硬编码 projects 路径
if (content.includes('.sillyspec/projects/')) {
  console.error('❌ FAIL: scan.js 仍包含硬编码 ".sillyspec/projects/"')
  failed = true
} else {
  console.log('✅ PASS: 不包含 ".sillyspec/projects/"')
}

if (content.includes('{PROJECTS_ROOT}/')) {
  console.log('✅ PASS: 包含占位符 "{PROJECTS_ROOT}/"')
} else {
  console.error('❌ FAIL: scan.js 缺少占位符 "{PROJECTS_ROOT}/"')
  failed = true
}

if (failed) {
  console.error('\n💥 有测试失败！scan.js 路径占位符可能被回退为硬编码。')
  throw new Error("test failed")
} else {
  console.log('\n✅ 全部通过 — scan.js 路径占位符防回归测试 OK')
}
