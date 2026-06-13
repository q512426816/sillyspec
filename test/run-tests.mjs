import { readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'

const testDir = dirname(fileURLToPath(import.meta.url))
const files = readdirSync(testDir)
  .filter(file => file.endsWith('.test.mjs'))
  .sort()

if (files.length === 0) {
  console.log('No test files found')
  process.exit(0)
}

let passed = 0
let failed = 0
const failures = []

for (const file of files) {
  const fullPath = join(testDir, file)
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

process.exit(failed > 0 ? 1 : 0)
