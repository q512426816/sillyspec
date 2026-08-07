import { readdirSync, existsSync, rmSync, readFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'
import { homedir } from 'node:os'

const testDir = dirname(fileURLToPath(import.meta.url))

// 全局指针污染防护：测试可能把 ~/.sillyspec-platform.json 写到 HOME（cwd 纠正到 home 的缝隙），
// 不清理则污染用户真实环境——之后任何项目跑 sillyspec 都被静默引向死 temp 库。
// 套件前后各清一次，兜底所有测试（无论哪个写 home）。
const homePointer = join(homedir(), '.sillyspec-platform.json')
function cleanHomePointer() {
  if (!existsSync(homePointer)) return
  try {
    const before = readFileSync(homePointer, 'utf8')
    rmSync(homePointer, { force: true })
    console.log(`[teardown] 清理 HOME 指针污染：${homePointer}（原指向 ${before.slice(0, 80)}...）`)
  } catch {}
}
cleanHomePointer()

// 递归收集所有 .test.mjs（含子目录如 test/dispatch/），便于按模块组织测试
function collectTestFiles(dir) {
  const out = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      out.push(...collectTestFiles(join(dir, entry.name)))
    } else if (entry.name.endsWith('.test.mjs')) {
      out.push(join(dir, entry.name))
    }
  }
  return out
}
const files = collectTestFiles(testDir).sort()

if (files.length === 0) {
  console.log('No test files found')
  process.exit(0)
}

let passed = 0
let failed = 0
const failures = []

for (const fullPath of files) {
  const file = relative(testDir, fullPath)
  console.log(`\nRunning ${file}`)
  try {
    const output = execFileSync(process.execPath, [fullPath], {
      cwd: testDir,
      stdio: ['pipe', 'pipe', 'pipe'],
      encoding: 'utf8',
      timeout: 120_000
    })
    if (output) process.stdout.write(output)
    passed++
  } catch (err) {
    if (err.stdout) process.stdout.write(err.stdout)
    if (err.stderr) process.stderr.write(err.stderr)
    failed++
    failures.push(file)
    console.log(`  ❌ ${file} exited with code ${err.status || 1}`)
  }
}

console.log(`\n${'='.repeat(50)}`)
console.log(`✅ 通过: ${passed}  ❌ 失败: ${failed}`)
if (failures.length > 0) {
  console.log(`失败文件: ${failures.join(', ')}`)
}
console.log(`${'='.repeat(50)}`)

cleanHomePointer()

process.exit(failed > 0 ? 1 : 0)
