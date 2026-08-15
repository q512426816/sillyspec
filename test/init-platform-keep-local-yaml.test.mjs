/**
 * init 平台模式跳过项目内 .sillyspec/ 清理段测试
 * （change 2026-08-15-init-trigger-sillyspec-init task-03，FR-07 / D-008@v2）
 *
 * 背景：平台成员项目内 .sillyspec/ 通常只有 local.yaml（平台 init lease 第 5 步写，
 * 含用户手调 mcp 段），本地模式 init 外部 --spec-dir 时的清理段（无资产 rmSync 整删 +
 * cleanupRuntimeResidue 删 local.yaml）会丢配置。平台模式（--workspace-id）整体跳过。
 *
 * 验证：
 * 1. 平台模式（--workspace-id + 外部 --spec-dir）下项目内 .sillyspec/local.yaml 内容不变
 * 2. 本地模式（无平台 flag）仍清理（零回归）
 */

import { join, resolve, dirname } from 'path'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'
import { tmpdir } from 'os'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const root = resolve(__dirname, '..')
const binCLI = join(root, 'bin', 'sillyspec.js')

let passed = 0
let failed = 0
function assert(cond, msg) {
  if (cond) { console.log(`  ✅ PASS: ${msg}`); passed++ }
  else { console.log(`  ❌ FAIL: ${msg}`); failed++ }
}

const P = 'init-plt-keep'
function tmpDir(name) {
  const d = join(tmpdir(), `${P}-${name}-${Date.now()}-${Math.random().toString(36).slice(2)}`)
  mkdirSync(d, { recursive: true })
  return d
}
function gitInit(d) {
  try { execSync('git init -q', { cwd: d, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }) } catch {}
}
function run(cmd) {
  return execSync(cmd, { encoding: 'utf8', timeout: 30000, stdio: ['pipe', 'pipe', 'pipe'] })
}
function clean(...dirs) { for (const d of dirs) try { rmSync(d, { recursive: true, force: true }) } catch {} }

// 平台 lease 第 5 步会写的 local.yaml 形态（含用户手调 mcp 段）
const LOCAL_YAML = `platform:
  url: http://127.0.0.1:8001
  token: shpsync_demo
mcp:
  url: http://127.0.0.1:8001
  token: shmcp_demo
`

// ── Test 1: 平台模式 → local.yaml 内容不变（含手调 mcp 段）──
console.log('\n=== Test 1: 平台模式（--workspace-id + 外部 --spec-dir）保留 local.yaml ===')
{
  const project = tmpDir('t1'), spec = tmpDir('t1-spec')
  gitInit(project)
  // 模拟平台 init lease 已写 local.yaml 的项目内 .sillyspec/（无其它资产）
  mkdirSync(join(project, '.sillyspec'), { recursive: true })
  writeFileSync(join(project, '.sillyspec', 'local.yaml'), LOCAL_YAML)

  const out = run(`node "${binCLI}" init "${project}" --spec-dir "${spec}" --workspace-id ws-keep --no-skills`)
  const kept = join(project, '.sillyspec', 'local.yaml')
  assert(existsSync(kept), '平台模式下项目内 .sillyspec/local.yaml 仍存在（未整删）')
  assert(readFileSync(kept, 'utf8') === LOCAL_YAML, 'local.yaml 内容前后不变（含手调 mcp 段）')
  assert(existsSync(join(project, '.sillyspec')), '平台模式下项目内 .sillyspec/ 目录保留')
  assert(out.includes('跳过项目内 .sillyspec/ 清理') || out.includes('平台模式'), '输出含跳过清理说明')
  assert(existsSync(join(spec, '.runtime', 'sillyspec.db')), '外部 specDir 照常初始化')
  clean(project, spec)
}

// ── Test 2: 本地模式（无平台 flag）→ 仍清理（零回归）──
console.log('\n=== Test 2: 本地模式仍清理无资产的 .sillyspec/ ===')
{
  const project = tmpDir('t2'), spec = tmpDir('t2-spec')
  gitInit(project)
  // 同样无资产形态（仅 local.yaml）——本地模式视为旧残留，应整删
  mkdirSync(join(project, '.sillyspec'), { recursive: true })
  writeFileSync(join(project, '.sillyspec', 'local.yaml'), LOCAL_YAML)

  const out = run(`node "${binCLI}" init "${project}" --spec-dir "${spec}" --no-skills`)
  assert(!existsSync(join(project, '.sillyspec')), '本地模式：无资产 .sillyspec/ 被整删（行为不变）')
  assert(out.includes('已清理旧版本残留'), '输出含清理提示')
  clean(project, spec)
}

// ── 汇总 ──
console.log(`\n${'='.repeat(50)}`)
console.log(`✅ 通过: ${passed}  ❌ 失败: ${failed}`)
console.log('='.repeat(50))
if (failed > 0) process.exit(1)
