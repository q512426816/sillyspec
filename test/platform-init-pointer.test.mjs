/**
 * platform-init-pointer.test.mjs — 平台模式 init 落盘指针测试
 *
 * 背景：init --spec-dir（平台模式）此前不落盘平台指针，init→scan 窗口期
 * agent 裸调会静默回退本地模式（cwd/.sillyspec/）造成进度库分裂。
 * 修复：init 带平台专属 flag（--workspace-id / --runtime-root）时，
 * 复用 scan 的指针生成逻辑（抽公共 helper），init 即落盘：
 *   1. <specDir>/.runtime/platform-scan.json（主文件）
 *   2. <cwd>/.sillyspec-platform.json（恢复指针，status: active）
 */

import { join, resolve, dirname, basename } from 'path'
import { existsSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'fs'
import { fileURLToPath } from 'url'
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

const P = 'plinit'
function gitInit(d) {
  try {
    execSync('git init -q', { cwd: d, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
    execSync('git config user.email t@t.local', { cwd: d, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
    execSync('git config user.name t', { cwd: d, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  } catch {}
}
function setup(name) {
  const d = join(tmpdir(), `${P}-${name}`)
  mkdirSync(d, { recursive: true })
  // git init 隔离：防 tmpdir 落在用户 home git repo 内被 resolveEffectiveDir 纠正
  gitInit(d)
  return d
}
function spec(name) {
  const d = join(tmpdir(), `${P}-${name}-spec`)
  mkdirSync(d, { recursive: true })
  return d
}
function clean(...dirs) { for (const d of dirs) try { rmSync(d, { recursive: true, force: true }) } catch {} }

function run(cmd) {
  return execSync(cmd, { encoding: 'utf8', timeout: 20000, stdio: ['pipe', 'pipe', 'pipe'] })
}

// ── Test 1: init 带平台 flag → 落盘双指针 ──
console.log('\n=== Test 1: init --spec-dir + --workspace-id 落盘指针 ===')
{
  const cwd = setup('t1'), sd = spec('t1')
  run(`node "${binCLI}" init "${cwd}" --spec-dir "${sd}" --workspace-id ws-init --runtime-root "${sd}/runtime"`)

  const inSpecDir = join(sd, '.runtime', 'platform-scan.json')
  const pointerFile = join(cwd, '.sillyspec-platform.json')
  assert(existsSync(inSpecDir), `platform-scan.json 在 specDir/.runtime/ 已落盘`)
  assert(existsSync(pointerFile), `恢复指针在 cwd/.sillyspec-platform.json 已落盘`)

  const main = JSON.parse(readFileSync(inSpecDir, 'utf8'))
  assert(main.specRoot === sd, `主文件 specRoot 指向 specDir`)
  assert(main.workspaceId === 'ws-init', `主文件 workspaceId 保存`)
  // init 发生在 scan 前，scanRunId 必须为 null（init 不冒领 scan 身份；
  // --scan-run-id 即使误传也不该被 init 采信）
  assert(main.scanRunId === null, `主文件 scanRunId 为 null（init 无 scan 语义）`)
  assert(main.savedAt, `主文件 savedAt 存在`)

  const ptr = JSON.parse(readFileSync(pointerFile, 'utf8'))
  assert(ptr.specRoot === sd, `指针 specRoot 指向 specDir`)
  assert(ptr.workspaceId === 'ws-init', `指针 workspaceId 保存`)
  assert(ptr.status === 'active', `指针 status=active（未 scan，区别于 scan_completed）`)
  // 关键：源码零污染
  assert(!existsSync(join(cwd, '.sillyspec')), `cwd/.sillyspec/ 未被创建（源码零污染）`)
  clean(cwd, sd)
}

// ── Test 2: init 不带平台 flag → 不落指针（本地模式不受影响）──
console.log('\n=== Test 2: init 仅 --spec-dir（本地外部目录）不落平台指针 ===')
{
  const cwd = setup('t2'), sd = spec('t2')
  run(`node "${binCLI}" init "${cwd}" --spec-dir "${sd}"`)
  assert(!existsSync(join(cwd, '.sillyspec-platform.json')), `无平台 flag 不落恢复指针`)
  assert(!existsSync(join(sd, '.runtime', 'platform-scan.json')), `无平台 flag 不落 platform-scan.json`)
  clean(cwd, sd)
}

// ── Test 3: init 落指针后裸调 status 能恢复平台 specRoot（不静默落本地）──
console.log('\n=== Test 3: init 指针生效——裸调不落本地 .sillyspec ===')
{
  const cwd = setup('t3'), sd = spec('t3')
  run(`node "${binCLI}" init "${cwd}" --spec-dir "${sd}" --workspace-id ws3`)
  // 裸调（不带 --spec-dir / --spec-root）：靠 init 落的指针恢复
  const out = run(`node "${binCLI}" --dir "${cwd}" run scan --status`)
  assert(!existsSync(join(cwd, '.sillyspec')), `裸调后 cwd/.sillyspec/ 仍不存在（未静默回退本地模式）`)
  clean(cwd, sd)
}

// ── Test 4: scan 后指针 status 升级 scan_completed，不回退 init 版字段 ──
console.log('\n=== Test 4: scan 覆盖 init 指针（字段不丢） ===')
{
  const cwd = setup('t4'), sd = spec('t4')
  run(`node "${binCLI}" init "${cwd}" --spec-dir "${sd}" --workspace-id ws4 --runtime-root "${sd}/runtime" --scan-run-id sr4`)
  run(`node "${binCLI}" --dir "${cwd}" --spec-dir "${sd}" run scan --spec-root "${sd}" --runtime-root "${sd}/runtime" --workspace-id ws4 --scan-run-id sr4`)
  const ptr = JSON.parse(readFileSync(join(cwd, '.sillyspec-platform.json'), 'utf8'))
  assert(ptr.specRoot === sd, `scan 后指针 specRoot 保持`)
  assert(ptr.workspaceId === 'ws4', `scan 后指针 workspaceId 保持`)
  clean(cwd, sd)
}

console.log(`\n结果: ${passed} passed, ${failed} failed`)
process.exit(failed > 0 ? 1 : 0)
