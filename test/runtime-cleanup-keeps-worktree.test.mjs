/**
 * Bug A 回归：清理逻辑不得摧毁 worktree meta / 进度状态
 *
 * 平台模式（specRoot 指向外部）下，源码目录 .sillyspec/ 含真实资产时，
 * cleanupRuntimeResidue 应只清缓存，保留 worktrees/、sillyspec.db、
 * global.json、gate-status.json、contract-artifacts/、execute-runs/。
 * 详见 docs/sillyspec/runtime-cleanup-destroys-worktree-meta.md
 */
import { cleanupRuntimeResidue } from '../src/init.js'
import { existsSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'fs'
import { join } from 'path'
import os from 'os'

let failed = 0
const failures = []
function assert(condition, msg) {
  if (!condition) { failed++; failures.push(msg); console.log(`  ❌ FAIL: ${msg}`) }
  else console.log(`  ✅ PASS: ${msg}`)
}

function makeTempLegacy() {
  const root = join(os.tmpdir(), `sillyspec-bugA-${Date.now()}-${Math.random().toString(36).slice(2)}`)
  const legacyDir = join(root, '.sillyspec')
  mkdirSync(join(legacyDir, '.runtime'), { recursive: true })
  return { root, legacyDir }
}

console.log('=== Bug A 回归: cleanupRuntimeResidue 保留权威状态 ===\n')

// ── Case 1: 权威状态全部保留 ──
console.log('--- Case 1: worktrees / db / global.json / gate-status 保留 ---')
{
  const { root, legacyDir } = makeTempLegacy()
  const runtime = join(legacyDir, '.runtime')
  // 权威状态
  mkdirSync(join(runtime, 'worktrees', 'my-change'), { recursive: true })
  writeFileSync(join(runtime, 'worktrees', 'my-change', 'meta.json'), '{"depsStatus":"installed"}')
  writeFileSync(join(runtime, 'sillyspec.db'), 'sqlite-bytes')
  writeFileSync(join(runtime, 'global.json'), '{"projectName":"x"}')
  writeFileSync(join(runtime, 'gate-status.json'), '{}')
  mkdirSync(join(runtime, 'contract-artifacts'), { recursive: true })
  writeFileSync(join(runtime, 'contract-artifacts', 'foo.json'), '{}')
  mkdirSync(join(runtime, 'execute-runs'), { recursive: true })
  // 可删缓存
  mkdirSync(join(runtime, 'artifacts'), { recursive: true })
  mkdirSync(join(runtime, 'scan-runs'), { recursive: true })
  writeFileSync(join(runtime, 'scan-projects.json'), '{}')
  writeFileSync(join(runtime, 'user-inputs.md'), 'x')
  writeFileSync(join(runtime, 'postcheck-result.json'), '{}')
  // local.yaml / codebase（非权威，应删）
  writeFileSync(join(legacyDir, 'local.yaml'), 'x')
  mkdirSync(join(legacyDir, 'codebase'), { recursive: true })

  cleanupRuntimeResidue(legacyDir)

  assert(existsSync(join(runtime, 'worktrees', 'my-change', 'meta.json')), 'worktrees/meta.json 应保留')
  assert(existsSync(join(runtime, 'sillyspec.db')), 'sillyspec.db 应保留')
  assert(existsSync(join(runtime, 'global.json')), 'global.json 应保留')
  assert(existsSync(join(runtime, 'gate-status.json')), 'gate-status.json 应保留')
  assert(existsSync(join(runtime, 'contract-artifacts', 'foo.json')), 'contract-artifacts/ 应保留')
  assert(existsSync(join(runtime, 'execute-runs')), 'execute-runs/ 应保留')
  assert(!existsSync(join(runtime, 'artifacts')), 'artifacts/ 缓存应删除')
  assert(!existsSync(join(runtime, 'scan-runs')), 'scan-runs/ 缓存应删除')
  assert(!existsSync(join(runtime, 'scan-projects.json')), 'scan-projects.json 缓存应删除')
  assert(!existsSync(join(runtime, 'user-inputs.md')), 'user-inputs.md 缓存应删除')
  assert(!existsSync(join(legacyDir, 'local.yaml')), 'local.yaml 应删除')
  assert(!existsSync(join(legacyDir, 'codebase')), 'codebase/ 应删除')

  rmSync(root, { recursive: true, force: true })
}

// ── Case 2: worktree meta 内容不被破坏（depsStatus 不丢） ──
console.log('\n--- Case 2: 清理后 worktree meta 内容完整 ---')
{
  const { root, legacyDir } = makeTempLegacy()
  const runtime = join(legacyDir, '.runtime')
  mkdirSync(join(runtime, 'worktrees', 'c1'), { recursive: true })
  const metaPath = join(runtime, 'worktrees', 'c1', 'meta.json')
  const original = '{"depsStatus":"installed","worktreePath":"/x","branch":"sillyspec/c1"}'
  writeFileSync(metaPath, original)

  cleanupRuntimeResidue(legacyDir)

  assert(existsSync(metaPath), 'meta.json 应仍存在')
  const read = readFileSync(metaPath, 'utf8')
  assert(read === original, 'meta.json 内容应未被改写')

  rmSync(root, { recursive: true, force: true })
}

// ── Case 3: .runtime/ 不存在时不报错 ──
console.log('\n--- Case 3: 无 .runtime/ 时安全无副作用 ---')
{
  const { root, legacyDir } = makeTempLegacy()
  rmSync(join(legacyDir, '.runtime'), { recursive: true, force: true })
  let threw = false
  try { cleanupRuntimeResidue(legacyDir) } catch { threw = true }
  assert(!threw, '无 .runtime/ 时不应抛错')
  rmSync(root, { recursive: true, force: true })
}

// ── 结果 ──
console.log(`\n${'='.repeat(50)}`)
console.log(`✅ 通过: ${28 - failed}  ❌ 失败: ${failed}`)
if (failures.length > 0) { console.log('失败项:'); failures.forEach(f => console.log(`  - ${f}`)) }
console.log('='.repeat(50))
if (failed > 0) process.exit(1)
