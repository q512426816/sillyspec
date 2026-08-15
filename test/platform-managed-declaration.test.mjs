/**
 * platform-managed-declaration.test.mjs — 平台接管声明机制八场景测试
 *
 * 机制（design.md v2）：writePlatformPointer 三写（主文件+指针+声明）；
 * 双入口 fail-closed（resolvePlatformSpecDir / runCommand 恢复链）；
 * disconnect 三清；doctor 诊断信号；--spec-dir 逃生口；幂等。
 */

import { join, resolve, dirname } from 'path'
import { existsSync, mkdirSync, writeFileSync, rmSync, readFileSync, unlinkSync } from 'fs'
import { fileURLToPath, pathToFileURL } from 'url'
import { execSync } from 'child_process'
import { tmpdir } from 'os'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const root = resolve(__dirname, '..')
const binCLI = join(root, 'bin', 'sillyspec.js')

let passed = 0, failed = 0
function assert(cond, msg) {
  if (cond) { console.log(`  ✅ PASS: ${msg}`); passed++ }
  else { console.log(`  ❌ FAIL: ${msg}`); failed++ }
}

const P = 'plmgr'
function gitInit(d) {
  try {
    execSync('git init -q', { cwd: d, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
    execSync('git config user.email t@t.local', { cwd: d, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
    execSync('git config user.name t', { cwd: d, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  } catch {}
}
function setup(name) {
  const d = join(tmpdir(), `${P}-${name}`)
  rmSync(d, { recursive: true, force: true })
  mkdirSync(d, { recursive: true })
  gitInit(d) // 隔离：防 tmpdir 落在 home git repo 内被 resolveEffectiveDir 纠正
  return d
}
function spec(name) {
  const d = join(tmpdir(), `${P}-${name}-spec`)
  rmSync(d, { recursive: true, force: true })
  mkdirSync(d, { recursive: true })
  return d
}
function clean(...dirs) { for (const d of dirs) try { rmSync(d, { recursive: true, force: true }) } catch {} }

function runOk(cmd) {
  // execSync 成功时只返回 stdout（stderr 捕获在 stdio pipe 但不进返回值），
  // 断言用 stderr 时以捕获模式重跑或改用 runFail。这里返回带空 stderr 的对象形态统一。
  const stdout = execSync(cmd, { encoding: 'utf8', timeout: 30000, stdio: ['pipe', 'pipe', 'pipe'] })
  return { stdout, stderr: '' }
}
function runFail(cmd) {
  try {
    execSync(cmd, { encoding: 'utf8', timeout: 30000, stdio: ['pipe', 'pipe', 'pipe'] })
    return { code: 0, stderr: '', stdout: '' }
  } catch (e) {
    return { code: e.status, stderr: String(e.stderr || ''), stdout: String(e.stdout || '') }
  }
}
const DECL = '.sillyspec-platform-managed'

// 平台模式接入 fixture：init 带平台 flag → 三落盘
function platformSetup(tag, wsId) {
  const cwd = setup(tag), sd = spec(tag)
  runOk(`node "${binCLI}" init "${cwd}" --spec-dir "${sd}" --workspace-id ${wsId}`)
  return { cwd, sd }
}

// ── 场景①：三落盘 + 声明四字段 ──
console.log('\n=== 场景①：init 平台模式三落盘 ===')
{
  const { cwd, sd } = platformSetup('s1', 'ws1')
  assert(existsSync(join(sd, '.runtime', 'platform-scan.json')), '主文件落盘')
  assert(existsSync(join(cwd, '.sillyspec-platform.json')), '恢复指针落盘')
  assert(existsSync(join(cwd, DECL)), '接管声明落盘')
  const decl = JSON.parse(readFileSync(join(cwd, DECL), 'utf8'))
  assert(decl.managed === true, '声明 managed:true')
  assert(decl.specRoot === sd, '声明 specRoot 副本指向 specDir')
  assert(decl.workspaceId === 'ws1', '声明 workspaceId 保存')
  assert(decl.declaredAt, '声明 declaredAt 存在')
  assert(Object.keys(decl).length === 4, '声明恰好四字段（D-E@v2 无多余字段）')
  clean(cwd, sd)
}

// ── 场景②：resolvePlatformSpecDir 直测 fail-closed（入口一）──
console.log('\n=== 场景②：入口一 resolvePlatformSpecDir fail-closed ===')
{
  const { cwd, sd } = platformSetup('s2', 'ws2')
  unlinkSync(join(cwd, '.sillyspec-platform.json')) // 模拟指针被 cleanup/挪目录
  const { resolvePlatformSpecDir, PlatformManagedError } = await import(pathToFileURL(join(root, 'src', 'progress.js')).href)
  let threw = null
  try { resolvePlatformSpecDir(cwd) } catch (e) { threw = e }
  assert(threw !== null, '删指针保声明 → 抛错')
  assert(threw instanceof PlatformManagedError, '错误类型 PlatformManagedError')
  assert(threw.name === 'PointerUnreachableError', 'name 保持父类值（顶层 catch 严格匹配，D-D@v2）')
  assert(threw.message.includes('平台接管声明生效'), 'message 首行区分场景')
  assert(threw.message.includes(sd), 'message 含原 specRoot')
  assert(threw.message.includes('disconnect'), 'message 含恢复引导（disconnect 选项）')
  clean(cwd, sd)
}

// ── 场景③：runCommand CLI 子进程 fail-closed（入口二）──
console.log('\n=== 场景③：入口二 runCommand 裸调 fail-closed ===')
{
  const { cwd, sd } = platformSetup('s3', 'ws3')
  unlinkSync(join(cwd, '.sillyspec-platform.json'))
  const r = runFail(`node "${binCLI}" --dir "${cwd}" run quick --status`)
  assert(r.code === 1, `裸调 run quick --status exit 1（实际 ${r.code}）`)
  assert(r.stderr.includes('平台接管声明生效'), 'stderr 含"平台接管声明生效"')
  assert(r.stderr.includes(sd), 'stderr 含原 specRoot')
  assert(!existsSync(join(cwd, '.sillyspec')), '未静默建本地 .sillyspec/（核心断言：防状态分裂）')
  clean(cwd, sd)
}

// ── 场景④：无声明走本地（纯本地项目零变化）──
console.log('\n=== 场景④：无声明无指针 → 行为不变 ===')
{
  const cwd = setup('s4')
  const r = runOk(`node "${binCLI}" --dir "${cwd}" run quick --status`)
  assert(!existsSync(join(cwd, DECL)), '无声明文件')
  assert(!r.stderr.includes('平台接管'), '输出无平台接管报错')
  clean(cwd)
}

// ── 场景⑤：disconnect 三清 ──
console.log('\n=== 场景⑤：platform disconnect 三清 ===')
{
  const { cwd, sd } = platformSetup('s5', 'ws5')
  // disconnect 需要 local.yaml platform 段——disconnect 对无段也三清（幂等语义）
  const r = runOk(`node "${binCLI}" --dir "${cwd}" platform disconnect`)
  assert(!existsSync(join(cwd, '.sillyspec-platform.json')), '指针已删')
  assert(!existsSync(join(cwd, DECL)), '声明已删')
  const r2 = runOk(`node "${binCLI}" --dir "${cwd}" run quick --status`)
  assert(!r2.stderr.includes('平台接管'), 'disconnect 后裸调恢复本地模式（不再 fail-closed）')
  clean(cwd, sd)
}

// ── 场景⑥：--spec-dir 逃生口 ──
console.log('\n=== 场景⑥：显式 --spec-dir 逃生口 ===')
{
  const { cwd, sd } = platformSetup('s6', 'ws6')
  unlinkSync(join(cwd, '.sillyspec-platform.json'))
  // 声明存在+指针缺失状态下显式传 --spec-dir → 不阻断
  const r = runOk(`node "${binCLI}" --dir "${cwd}" --spec-dir "${sd}" run quick --status`)
  assert(!r.stderr.includes('平台接管声明生效'), '显式 --spec-dir 不触发 fail-closed（逃生口）')
  clean(cwd, sd)
}

// ── 场景⑦：幂等（重复 init 声明仍有效）──
console.log('\n=== 场景⑦：幂等 ===')
{
  const { cwd, sd } = platformSetup('s7', 'ws7')
  runOk(`node "${binCLI}" init "${cwd}" --spec-dir "${sd}" --workspace-id ws7`)
  const decl = JSON.parse(readFileSync(join(cwd, DECL), 'utf8'))
  assert(decl.managed === true && Object.keys(decl).length === 4, '重复 init 后声明仍有效四字段')
  const { checkPlatformManaged } = await import(pathToFileURL(join(root, 'src', 'run', 'shared.js')).href)
  assert(checkPlatformManaged(cwd) !== null, 'checkPlatformManaged 读侧仍识别')
  clean(cwd, sd)
}

// ── 场景⑧：doctor 信号 pointer_missing_but_managed（FR-06 证据）──
console.log('\n=== 场景⑧：doctor --json 报 pointer_missing_but_managed ===')
{
  const { cwd, sd } = platformSetup('s8', 'ws8')
  unlinkSync(join(cwd, '.sillyspec-platform.json'))
  // doctor 既有语义：overall_status=warning → exit 1（非本机制报错），用捕获模式
  const r = runFail(`node "${binCLI}" --dir "${cwd}" doctor --json`)
  assert((r.stdout || '').includes('pointer_missing_but_managed'), 'doctor --json 含 pointer_missing_but_managed 信号')
  clean(cwd, sd)
}

console.log(`\n结果: ${passed} passed, ${failed} failed`)
process.exit(failed > 0 ? 1 : 0)
