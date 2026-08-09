import { execFileSync } from 'node:child_process'
import { readdirSync, statSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

function collect(root) {
  const files = []
  function walk(dir) {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry)
      if (statSync(full).isDirectory()) {
        walk(full)
        continue
      }
      if (/\.(js|cjs|mjs)$/.test(entry)) files.push(full)
    }
  }
  walk(root)
  return files
}

const srcFiles = collect('src')
const testFiles = collect('test')

// 1. 语法检查（src + test）
const allFiles = [...srcFiles, ...testFiles].sort()
for (const file of allFiles) {
  execFileSync(process.execPath, ['--check', file], { stdio: 'inherit' })
}

// 2. 内容规则：test/ 禁用 console 的 assert 方法（拆字定义 BAD，避免本文件自匹配）。
//    该方法失败只打印不抛，run-tests.mjs runner 按 exit 0 判通过 → 断言全假也显示绿。
//    test/ 必须用 node:assert（失败抛错→非零 exit→runner 捕获）。
const BAD = 'console' + '.assert'
const contentErrors = []
for (const file of testFiles.sort()) {
  const content = readFileSync(file, 'utf8')
  if (content.includes(BAD)) {
    contentErrors.push(`${file}: 禁用 ${BAD}（失败不抛致 runner 误判通过），改用 node:assert 的 assert()`)
  }
}
if (contentErrors.length) {
  console.error('\n⚠️ lint 内容规则违规（test/）：')
  for (const e of contentErrors) console.error('  - ' + e)
  process.exit(1)
}

console.log(`Checked ${allFiles.length} JavaScript files (src ${srcFiles.length} + test ${testFiles.length}); test/ 内容规则通过`)
