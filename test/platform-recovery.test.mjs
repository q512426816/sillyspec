/**
 * platform-recovery.test.mjs — 平台模式参数恢复 + stage-contract 路径测试
 */

import { join, resolve, dirname, basename } from 'path'
import { existsSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'fs'
import { fileURLToPath, pathToFileURL } from 'url'
import { execSync } from 'child_process'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const root = resolve(__dirname, '..')
const binCLI = join(root, 'bin', 'sillyspec.js')

let passed = 0, failed = 0

function assert(cond, msg) {
  if (cond) { console.log(`  ✅ PASS: ${msg}`); passed++ }
  else { console.log(`  ❌ FAIL: ${msg}`); failed++ }
}

const P = 'recover'
function setup(name) {
  const d = join('/tmp', `${P}-${name}`)
  mkdirSync(d, { recursive: true })
  return d
}
function spec(name) {
  const d = join('/tmp', `${P}-${name}-spec`)
  mkdirSync(d, { recursive: true })
  return d
}
function clean(...dirs) { for (const d of dirs) try { rmSync(d, { recursive: true, force: true }) } catch {} }

function run(cmd) {
  return execSync(cmd, { encoding: 'utf8', timeout: 15000, stdio: ['pipe', 'pipe', 'pipe'] })
}

const DOCS = ['ARCHITECTURE.md','CONVENTIONS.md','STRUCTURE.md','INTEGRATIONS.md','TESTING.md','CONCERNS.md','PROJECT.md']
function writeSpecDocs(dir) {
  for (const d of DOCS) {
    const p = join(dir, 'scan', d)
    mkdirSync(dirname(p), { recursive: true })
    writeFileSync(p, 'author: bot\ncreated_at: now\n# doc\n')
  }
}
function writeLocalDocs(cwd) {
  for (const d of DOCS) {
    const p = join(cwd, '.sillyspec', 'docs', basename(cwd), 'scan', d)
    mkdirSync(dirname(p), { recursive: true })
    writeFileSync(p, 'author: bot\ncreated_at: now\n# doc\n')
  }
}

// ── Test 1: platform-scan.json 写入位置 ──
console.log('\n=== Test 1: platform-scan.json 写入位置 ===')
{
  const cwd = setup('t1'), sd = spec('t1')
  run(`node "${binCLI}" init "${cwd}" --spec-dir "${sd}"`)
  run(`node "${binCLI}" --dir "${cwd}" --spec-dir "${sd}" run scan --spec-root "${sd}" --runtime-root "${sd}/runtime" --workspace-id ws1 --scan-run-id sr1`)

  const inSpecDir = join(sd, '.runtime', 'platform-scan.json')
  const pointerFile = join(cwd, '.sillyspec-platform.json')
  assert(existsSync(inSpecDir), `platform-scan.json 在 specDir/.runtime/`)
  assert(existsSync(pointerFile), `恢复指针在 cwd/.sillyspec-platform.json（不在 .sillyspec 内）`)

  const content = JSON.parse(readFileSync(inSpecDir, 'utf8'))
  assert(content.specRoot === sd, `specRoot 指向 specDir`)
  assert(content.workspaceId === 'ws1', `workspaceId 保存正确`)
  assert(content.scanRunId === 'sr1', `scanRunId 保存正确`)
  // 关键：cwd/.sillyspec/ 不应被创建
  assert(!existsSync(join(cwd, '.sillyspec')), `cwd/.sillyspec/ 未被创建（源码零污染）`)
  clean(cwd, sd)
}

// ── Test 2: 残留清理：旧版本创建的 cwd/.sillyspec 会被自动删除 ──
console.log('\n=== Test 2: 旧版本残留清理 ===')
{
  const cwd = setup('t2'), sd = spec('t2')
  // 模拟旧版本创建的残留
  mkdirSync(join(cwd, '.sillyspec', '.runtime'), { recursive: true })
  writeFileSync(join(cwd, '.sillyspec', '.runtime', 'old.db'), 'x')
  mkdirSync(join(cwd, '.sillyspec', 'changes'), { recursive: true })
  assert(existsSync(join(cwd, '.sillyspec')), `残留存在`)
  // init 时应清理
  run(`node "${binCLI}" init "${cwd}" --spec-dir "${sd}"`)
  assert(!existsSync(join(cwd, '.sillyspec')), `init 清理了 cwd/.sillyspec/`)
  // run 时也不应再创建
  run(`node "${binCLI}" --dir "${cwd}" --spec-dir "${sd}" run scan --spec-root "${sd}" --runtime-root "${sd}/runtime" --workspace-id ws --scan-run-id sr 2>&1`)
  assert(!existsSync(join(cwd, '.sillyspec')), `run 后 cwd/.sillyspec/ 仍不存在`)
  clean(cwd, sd)
}

// ── Test 3: --done 不带 --spec-root 时恢复 ──
console.log('\n=== Test 3: --done 恢复平台参数 ===')
{
  const cwd = setup('t2'), sd = spec('t2')
  run(`node "${binCLI}" init "${cwd}" --spec-dir "${sd}"`)
  run(`node "${binCLI}" --dir "${cwd}" --spec-dir "${sd}" run scan --spec-root "${sd}" --runtime-root "${sd}/runtime" --workspace-id ws2 --scan-run-id sr2`)
  // --done 不带任何平台参数
  const output = run(`node "${binCLI}" --dir "${cwd}" run scan --done --change default --dir "${cwd}" --input "test" --output "test done" 2>&1`)
  assert(output.includes('平台模式'), `恢复成功：包含平台模式指令`)
  assert(output.includes(sd), `恢复成功：包含 specDir 路径`)
  clean(cwd, sd)
}

// ── Test 3-6: stage-contract 路径（通过 runValidators） ──
const { runValidators } = await import(pathToFileURL(join(root, 'src', 'stage-contract.js')).href)

console.log('\n=== Test 5: specDir 有文档 → 校验通过 ===')
{
  const cwd = setup('t3'), sd = spec('t3')
  const proj = basename(cwd)
  const scanDir = join(sd, 'docs', proj)
  writeSpecDocs(scanDir)
  const result = runValidators('scan', cwd, 'default', { projectName: proj, specRoot: sd })
  assert(result.ok, `specDir 有文档: ok=${result.ok}, errors=${JSON.stringify(result.errors)}`)
  clean(cwd, sd)
}

console.log('\n=== Test 5: specDir 缺文档 → 校验失败，路径不含 .sillyspec ===')
{
  const cwd = setup('t4'), sd = spec('t4')
  const proj = basename(cwd)
  mkdirSync(join(sd, 'docs'), { recursive: true })
  const result = runValidators('scan', cwd, 'default', { projectName: proj, specRoot: sd })
  assert(!result.ok, `specDir 缺文档: ok=${result.ok}`)
  assert(result.errors.length > 0, `有 errors`)
  const errMsg = result.errors[0]
  assert(!errMsg.includes('.sillyspec/docs'), `路径不含 .sillyspec: ${errMsg}`)
  assert(errMsg.includes('/docs/'), `路径含 /docs/: ${errMsg}`)
  clean(cwd, sd)
}

console.log('\n=== Test 7: 非平台模式有文档 → 校验通过 ===')
{
  const cwd = setup('t5')
  const proj = basename(cwd)
  writeLocalDocs(cwd)
  const result = runValidators('scan', cwd, 'default', { projectName: proj })
  assert(result.ok, `非平台有文档: ok=${result.ok}`)
  clean(cwd)
}

console.log('\n=== Test 7: 非平台模式缺文档 → 路径含 .sillyspec ===')
{
  const cwd = setup('t6')
  const proj = basename(cwd)
  const result = runValidators('scan', cwd, 'default', { projectName: proj })
  assert(!result.ok, `非平台缺文档: ok=${result.ok}`)
  const errMsg = result.errors[0]
  assert(errMsg.includes('.sillyspec/docs'), `路径含 .sillyspec/docs/: ${errMsg}`)
  clean(cwd)
}

console.log(`\n${'='.repeat(50)}`)
console.log(`✅ 通过: ${passed}  ❌ 失败: ${failed}`)
console.log(`${'='.repeat(50)}`)
if (failed > 0) throw new Error(`${failed} test(s) failed`)
