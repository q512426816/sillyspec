/**
 * worktree-deps-provision 测试
 * 覆盖 FR-01/02/03/05：lockfileHash + provisionDeps（junction 快路径 / install 兜底判定 / generic→n/a）
 * change 2026-06-28-worktree-deps-provision
 */
import { provisionDeps, lockfileHash } from '../src/worktree-deps.js'
import { mkdtempSync, writeFileSync, mkdirSync, existsSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

let failed = 0
let passed = 0
const failures = []
function assert(cond, msg) {
  if (cond) { passed++; console.log(`  ✅ PASS: ${msg}`) }
  else { failed++; failures.push(msg); console.log(`  ❌ FAIL: ${msg}`) }
}

const tmpDirs = []
function mkTmp(prefix) {
  const d = mkdtempSync(join(tmpdir(), `wtdeps-${prefix}-`))
  tmpDirs.push(d)
  return d
}
function cleanup() {
  for (const d of tmpDirs) {
    try { rmSync(d, { recursive: true, force: true }) } catch {}
  }
}

console.log('=== worktree-deps-provision 测试 ===\n')

// ── lockfileHash ──
console.log('--- lockfileHash ---')
{
  const d = mkTmp('lh')
  assert(lockfileHash(d) === null, '空目录返回 null')
  writeFileSync(join(d, 'pnpm-lock.yaml'), 'lockversion: 6.0\npackages: []\n')
  const h1 = lockfileHash(d)
  assert(typeof h1 === 'string' && h1.length === 16, `pnpm-lock 返回 16 位 hash: ${h1}`)

  const d2 = mkTmp('lh2')
  writeFileSync(join(d2, 'package-lock.json'), '{"lockfileVersion":3}')
  const h2 = lockfileHash(d2)
  assert(typeof h2 === 'string' && h2.length === 16, `package-lock 返回 hash: ${h2}`)
  assert(h1 !== h2, '不同 lockfile 内容产生不同 hash')

  const d3 = mkTmp('lh3')
  writeFileSync(join(d3, 'yarn.lock'), '# yarn lock v1\n')
  assert(typeof lockfileHash(d3) === 'string', 'yarn.lock 返回 hash')

  const d4 = mkTmp('lh4')
  writeFileSync(join(d4, 'package.json'), '{"name":"x"}')
  assert(typeof lockfileHash(d4) === 'string', '无 lockfile 时回退 hash package.json')

  // 一致性：相同内容相同 hash
  const d5 = mkTmp('lh5')
  writeFileSync(join(d5, 'pnpm-lock.yaml'), 'lockversion: 6.0\npackages: []\n')
  assert(lockfileHash(d5) === h1, '相同 lockfile 内容产生相同 hash（快路径判定基础）')
}

// ── provisionDeps: generic → n/a ──
console.log('\n--- provisionDeps: generic / 无依赖 → n/a ---')
{
  const wt = mkTmp('gen-wt')
  const main = mkTmp('gen-main')
  const r = provisionDeps(wt, main, {})
  assert(r.depsStatus === 'n/a', `无 package.json/lockfile 的目录 → n/a（实际 ${r.depsStatus}）`)
  assert(!existsSync(join(wt, 'node_modules')), 'n/a 不创建 node_modules')
}

// ── provisionDeps: nodejs junction 快路径（lockfile 一致）──
console.log('\n--- provisionDeps: nodejs lockfile 一致 → linked (junction/symlink) ---')
{
  const main = mkTmp('link-main')
  const wt = mkTmp('link-wt')
  // 主 checkout：有 node_modules + lockfile
  mkdirSync(join(main, 'node_modules'))
  writeFileSync(join(main, 'node_modules', '.placeholder'), 'x')
  const lockContent = 'lockversion: 6.0\npackages: []\n'
  writeFileSync(join(main, 'package-lock.json'), lockContent)
  writeFileSync(join(main, 'package.json'), '{"name":"main","scripts":{}}')
  // worktree：相同 lockfile（hash 一致）+ package.json
  writeFileSync(join(wt, 'package-lock.json'), lockContent)
  writeFileSync(join(wt, 'package.json'), '{"name":"wt","scripts":{}}')

  const r = provisionDeps(wt, main, {})
  assert(r.depsStatus === 'linked', `lockfile 一致 → linked（实际 ${r.depsStatus}）`)
  assert(['junction', 'symlink', 'install'].includes(r.depsMethod), `depsMethod 合法（${r.depsMethod}）`)
  assert(r.depsSource === 'main-checkout', `depsSource=main-checkout（${r.depsSource}）`)
  assert(existsSync(join(wt, 'node_modules')), 'worktree/node_modules 已创建（junction/symlink）')
  assert(existsSync(join(wt, 'node_modules', '.placeholder')), 'junction 指向 main 的内容可访问')
  assert(typeof r.depsLockHash === 'string', 'depsLockHash 已记录')
}

// ── provisionDeps: lockfile 不一致 → 走 install 兜底（不验证真实 install，只验证不走 linked）──
console.log('\n--- provisionDeps: lockfile 不一致 → 不走 linked 快路径 ---')
{
  const main = mkTmp('mis-main')
  const wt = mkTmp('mis-wt')
  mkdirSync(join(main, 'node_modules'))
  writeFileSync(join(main, 'package-lock.json'), 'lockversion-A')
  writeFileSync(join(main, 'package.json'), '{"name":"main"}')
  writeFileSync(join(wt, 'package-lock.json'), 'lockversion-B-DIFFERENT') // 不一致
  writeFileSync(join(wt, 'package.json'), '{"name":"wt"}')

  const r = provisionDeps(wt, main, {})
  // lockfile 不一致 → 不会 linked；会尝试 install（真实 install 在 CI 可能失败/超时）
  assert(r.depsStatus !== 'linked', `lockfile 不一致时不应 linked（实际 ${r.depsStatus}）`)
  assert(['installed', 'failed'].includes(r.depsStatus), `兜底为 installed 或 failed（实际 ${r.depsStatus}）`)
  // install 失败时应带 depsError
  if (r.depsStatus === 'failed') {
    assert(typeof r.depsError === 'string' && r.depsError.length > 0, 'failed 带 depsError 信息')
  }
}

// ── provisionDeps: main 无 node_modules → 不走 linked ──
console.log('\n--- provisionDeps: main 无 node_modules → 不走 linked ---')
{
  const main = mkTmp('nomain-main')
  const wt = mkTmp('nomain-wt')
  const lockContent = 'same-lock\n'
  writeFileSync(join(main, 'package-lock.json'), lockContent)
  writeFileSync(join(main, 'package.json'), '{"name":"main"}')
  writeFileSync(join(wt, 'package-lock.json'), lockContent)
  writeFileSync(join(wt, 'package.json'), '{"name":"wt"}')
  // main 无 node_modules

  const r = provisionDeps(wt, main, {})
  assert(r.depsStatus !== 'linked', `main 无 node_modules 时不应 linked（实际 ${r.depsStatus}）`)
}

// ── provisionDeps: maven/gradle 推断（无 node_modules，验证不崩）──
console.log('\n--- provisionDeps: 非 nodejs 项目类型不崩 ---')
{
  const wt = mkTmp('maven-wt')
  writeFileSync(join(wt, 'pom.xml'), '<project></project>')
  const r = provisionDeps(wt, mkTmp('maven-main'), {})
  assert(['installed', 'failed'].includes(r.depsStatus), `maven 项目返回 installed/failed（${r.depsStatus}，mvn 可能不可用）`)
}

cleanup()

console.log(`\n==================================================`)
console.log(`✅ 通过: ${passed}  ❌ 失败: ${failed}`)
console.log(failed === 0 ? '全部通过' : `❌ 失败项: ${failures.join('; ')}`)
console.log(`==================================================`)
process.exit(failed === 0 ? 0 : 1)
