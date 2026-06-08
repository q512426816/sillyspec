/**
 * --spec-dir 功能测试
 * 
 * 测试点：
 * 1. ProgressManager 外部 specDir 路径正确
 * 2. init 外部 specDir 不污染源码
 * 3. 默认模式不受影响
 * 4. 平台模式 prompt 注入（scan/brainstorm/plan/execute/verify/quick）
 * 5. 非 platform 模式占位符替换（无 undefined/null）
 * 6. --spec-dir 与 --spec-root 兼容
 * 7. progress 使用外部 specDir
 */

import { join, resolve, basename, dirname } from 'path'
import { existsSync, mkdirSync, writeFileSync, rmSync } from 'fs'
import { fileURLToPath, pathToFileURL } from 'url'
import { execSync } from 'child_process'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const root = resolve(__dirname, '..')
const binCLI = join(root, 'bin', 'sillyspec.js')

function imp(path) {
  return import(pathToFileURL(path).href)
}

let passed = 0
let failed = 0

function assert(condition, msg) {
  if (condition) {
    console.log(`  ✅ PASS: ${msg}`)
    passed++
  } else {
    console.log(`  ❌ FAIL: ${msg}`)
    failed++
  }
}

function tmpDir(name) {
  const dir = join('/tmp', `spec-dir-test-${name}-${Date.now()}`)
  mkdirSync(dir, { recursive: true })
  return dir
}

function cleanup(dir) {
  try { rmSync(dir, { recursive: true, force: true }) } catch {}
}

function run(cmd) {
  return execSync(cmd, { encoding: 'utf8', timeout: 10000, stdio: ['pipe', 'pipe', 'pipe'] })
}

// ── Test 1: ProgressManager 外部 specDir ──
console.log('\n=== Test 1: ProgressManager 外部 specDir ===')
{
  const { ProgressManager } = await imp(join(root, 'src', 'progress.js'))
  const tmp = tmpDir('pm')
  const specDir = join(tmp, 'external-spec')
  
  const pm = new ProgressManager({ specDir })
  assert(pm._getSpecDir(tmp) === specDir, `_getSpecDir 返回自定义路径`)
  
  const pm2 = new ProgressManager()
  assert(pm2._getSpecDir(tmp) === join(tmp, '.sillyspec'), `_getSpecDir 无自定义时返回 cwd/.sillyspec`)
  
  assert(pm._runtimePath(tmp) === join(specDir, '.runtime'), `_runtimePath 基于 specDir`)
  assert(pm._changePath(tmp, 'c') === join(specDir, 'changes', 'c'), `_changePath 基于 specDir`)
  
  // 外部 specDir 时 _ensureGitignore 应跳过
  const gitignoreResult = pm._ensureGitignore(tmp)
  assert(gitignoreResult === undefined, `外部 specDir 时 _ensureGitignore 跳过`)
  
  cleanup(tmp)
}

// ── Test 2: init 外部 specDir 不污染源码 ──
console.log('\n=== Test 2: init 外部 specDir 不污染源码 ===')
{
  const { cmdInit } = await imp(join(root, 'src', 'init.js'))
  const projectDir = tmpDir('project')
  const specDir = tmpDir('spec')
  
  await cmdInit(projectDir, { specDir })
  
  assert(!existsSync(join(projectDir, '.sillyspec')), '源码目录不含 .sillyspec')
  assert(!existsSync(join(projectDir, '.gitignore')), '外部 specDir 时不创建 .gitignore')
  assert(existsSync(join(specDir, 'projects')), `specDir/projects 存在`)
  assert(existsSync(join(specDir, 'docs')), `specDir/docs 存在`)
  assert(existsSync(join(specDir, '.runtime', 'sillyspec.db')), `specDir/.runtime/sillyspec.db 存在`)
  assert(existsSync(join(specDir, 'workflows')), `specDir/workflows 存在`)
  assert(existsSync(join(projectDir, '.claude')), `源码目录 .claude 存在（工具指令）`)
  
  cleanup(projectDir)
  cleanup(specDir)
}

// ── Test 3: 默认模式不受影响 ──
console.log('\n=== Test 3: 默认模式不受影响 ===')
{
  const { cmdInit } = await imp(join(root, 'src', 'init.js'))
  const projectDir = tmpDir('default')
  
  await cmdInit(projectDir, {})
  
  assert(existsSync(join(projectDir, '.sillyspec')), '默认模式创建 .sillyspec 在项目内')
  assert(existsSync(join(projectDir, '.sillyspec', '.runtime', 'sillyspec.db')), '默认模式 DB 在项目内')
  assert(existsSync(join(projectDir, '.gitignore')), '默认模式创建 .gitignore')
  
  cleanup(projectDir)
}

// ── Test 4: 平台模式 prompt 注入（多 stage） ──
console.log('\n=== Test 4: 平台模式 prompt 注入 ===')
{
  const projectDir = tmpDir('prompt-p')
  const specDir = tmpDir('prompt-s')
  
  run(`node "${binCLI}" init "${projectDir}" --spec-dir "${specDir}"`)
  
  const stages = ['scan', 'brainstorm', 'plan', 'execute', 'verify', 'quick']
  for (const stage of stages) {
    const output = run(`node "${binCLI}" --dir "${projectDir}" --spec-dir "${specDir}" run ${stage}`)
    assert(output.includes('平台模式'), `${stage}: 包含平台模式指令`)
    assert(output.includes(`规范目录（specDir）: \`${specDir}\``), `${stage}: 包含正确的 specDir 路径`)
  }
  
  // scan 额外检查
  const scanOutput = run(`node "${binCLI}" --dir "${projectDir}" --spec-dir "${specDir}" run scan`)
  assert(scanOutput.includes('严禁写入源码目录'), 'scan: 包含严禁写入源码目录')
  assert(scanOutput.includes('Write 工具失败时，不允许'), 'scan: 包含 Write 工具规则')
  assert(scanOutput.includes('变更目录'), 'scan: 包含变更目录')
  
  cleanup(projectDir)
  cleanup(specDir)
}

// ── Test 5: 非 platform 模式占位符替换 ──
console.log('\n=== Test 5: 非 platform 模式占位符替换 ===')
{
  const projectDir = tmpDir('noplatform')
  
  run(`node "${binCLI}" init "${projectDir}"`)
  
  const output = run(`node "${binCLI}" --dir "${projectDir}" run scan`)
  
  assert(!output.includes('平台模式 — 写入路径约束'), '非 platform 模式不含平台指令')
  assert(!output.includes('{DOCS_ROOT}'), '{DOCS_ROOT} 被正确替换')
  assert(!output.includes('undefined'), '输出不含 undefined 路径')
  assert(!output.includes('null/.sillyspec'), '输出不含 null 路径')
  
  cleanup(projectDir)
}

// ── Test 6: --spec-root 兼容 ──
console.log('\n=== Test 6: --spec-root 兼容 ===')
{
  const projectDir = tmpDir('compat-p')
  const specDir = tmpDir('compat-s')
  
  run(`node "${binCLI}" init "${projectDir}" --spec-dir "${specDir}"`)
  
  const output = run(`node "${binCLI}" --dir "${projectDir}" run scan --spec-root "${specDir}"`)
  assert(output.includes('平台模式'), '--spec-root 兼容：仍触发平台模式指令')
  
  cleanup(projectDir)
  cleanup(specDir)
}

// ── Test 7: progress 使用外部 specDir ──
console.log('\n=== Test 7: progress 使用外部 specDir ===')
{
  const { ProgressManager } = await imp(join(root, 'src', 'progress.js'))
  const projectDir = tmpDir('progress-p')
  const specDir = tmpDir('progress-s')
  
  const pm = new ProgressManager({ specDir })
  await pm.init(projectDir)
  
  assert(existsSync(join(specDir, '.runtime', 'sillyspec.db')), 'DB 创建在外部 specDir')
  assert(!existsSync(join(projectDir, '.sillyspec')), '源码目录不含 .sillyspec')
  
  await pm.initChange(projectDir, 'test-change')
  assert(existsSync(join(specDir, 'changes', 'test-change')), 'changes 创建在外部 specDir')
  
  const progress = await pm.read(projectDir, 'test-change')
  assert(progress !== null, '能从外部 specDir 读取 progress')
  assert(progress.currentChange === 'test-change', `currentChange 正确`)
  
  cleanup(projectDir)
  cleanup(specDir)
}

// ── 汇总 ──
console.log(`\n${'='.repeat(50)}`)
console.log(`✅ 通过: ${passed}  ❌ 失败: ${failed}`)
console.log(`${'='.repeat(50)}`)

process.exit(failed > 0 ? 1 : 0)
