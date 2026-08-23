/**
 * 坑 provision-preexisting-dir-fake-linked 回归：doctor --fix 报 re-provisioned 但链接没建
 *
 * 2026-08-23 实证：worktree node_modules 是 install 半途中断残留的**真实目录**时，tryLink 的
 * preexisting 分支把它当「已有依赖」返回 ok → 根快路径标 depsStatus=linked，一个链接都没建、
 * 后验证 existsSync 对空/残目录照样过 → doctor 打「re-provisioned: depsStatus=linked」成功 ✅。
 *
 * 锁定语义：
 *   1. 根：真实目录残留 → 不再假报 linked（降级 install 真重建，installed/failed 都是真话）
 *   2. 子模块（linkOneDir）：真实目录 = 本地安装过（合法）→ installed 真话，不假 linked 不误报 failed
 *   3. broken junction（目标丢失，existsSync false 但目录项占位）→ 清理后重建，不再 mklink 撞名死锁
 *   4. checkDepsFreshness：linked 子模块 node_modules 缺失 → missing（doctor 自愈闭环，原只查根）
 */
import { provisionDeps, checkDepsFreshness, lockfileHash } from '../src/worktree-deps.js'
import { mkdtempSync, writeFileSync, mkdirSync, existsSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { execFileSync } from 'child_process'

let failed = 0
let passed = 0
const failures = []
function assert(cond, msg) {
  if (cond) { passed++; console.log(`  ✅ PASS: ${msg}`) }
  else { failed++; failures.push(msg); console.log(`  ❌ FAIL: ${msg}`) }
}

const tmpDirs = []
function mkTmp(prefix) {
  const d = mkdtempSync(join(tmpdir(), `wtfake-${prefix}-`))
  tmpDirs.push(d)
  return d
}
function cleanup() {
  for (const d of tmpDirs) { try { rmSync(d, { recursive: true, force: true }) } catch {} }
}

// 标准 nodejs fixture：main 有 node_modules + lockfile；wt 同 lockfile（快路径条件成立）
function setupNodePair(prefix, { wtRealNodeModules = false } = {}) {
  const main = mkTmp(`${prefix}-main`)
  const wt = mkTmp(`${prefix}-wt`)
  mkdirSync(join(main, 'node_modules'))
  writeFileSync(join(main, 'node_modules', '.placeholder'), 'x')
  const lockContent = 'lockversion: 6.0\npackages: []\n'
  writeFileSync(join(main, 'package-lock.json'), lockContent)
  writeFileSync(join(main, 'package.json'), '{"name":"main"}')
  writeFileSync(join(wt, 'package-lock.json'), lockContent)
  writeFileSync(join(wt, 'package.json'), '{"name":"wt"}')
  if (wtRealNodeModules) {
    // install 半途中断残留：真实目录 + 零星残文件（非链接）
    mkdirSync(join(wt, 'node_modules', '.tmp-cli'), { recursive: true })
    writeFileSync(join(wt, 'node_modules', '.tmp-cli', 'partial.js'), 'x')
  }
  return { main, wt }
}

console.log('=== 坑 provision-preexisting-dir-fake-linked：真实目录残留 / broken junction / 子模块自愈 ===\n')

// ── 1. 根：真实目录残留 → 不假报 linked（降级 install 真重建）──
console.log('--- 1. provisionDeps 根真实目录残留 → 非 linked ---')
{
  const { main, wt } = setupNodePair('root-real', { wtRealNodeModules: true })
  const r = provisionDeps(wt, main, {})
  assert(r.depsStatus !== 'linked', `真实目录残留不再假报 linked（实际 ${r.depsStatus}——installed/failed 均为真话，由 install 兜底重建）`)
}

// ── 2. 子模块（linkOneDir）：真实目录 = 本地安装过 → installed 真话 ──
console.log('\n--- 2. linkOneDir 子模块真实目录 → installed（合法保留）---')
{
  const main = mkTmp('sub-real-main')
  const wt = mkTmp('sub-real-wt')
  const specBase = mkTmp('sub-real-spec')
  const lockContent = 'lockversion: 6.0\npackages: []\n'
  // local.yaml modules 块声明 frontend（path: 字段 map 形式，与 extractModulePaths 解析口径一致）
  writeFileSync(join(specBase, 'local.yaml'), 'modules:\n  frontend: { path: "frontend/" }\n')
  // wt/frontend 有 package.json + 真实 node_modules（本地安装过）；main/frontend 有 node_modules + 一致 lockfile
  mkdirSync(join(wt, 'frontend'))
  writeFileSync(join(wt, 'frontend', 'package.json'), '{"name":"frontend"}')
  writeFileSync(join(wt, 'frontend', 'pnpm-lock.yaml'), lockContent)
  mkdirSync(join(wt, 'frontend', 'node_modules', 'real-pkg'), { recursive: true })
  writeFileSync(join(wt, 'frontend', 'node_modules', 'real-pkg', 'index.js'), 'x')
  mkdirSync(join(main, 'frontend', 'node_modules'), { recursive: true })
  writeFileSync(join(main, 'frontend', 'package.json'), '{"name":"frontend"}')
  writeFileSync(join(main, 'frontend', 'pnpm-lock.yaml'), lockContent)
  // wt 根 generic（无 package.json）→ 根 n/a，子模块块独立工作

  const r = provisionDeps(wt, main, { specBase })
  const fe = Array.isArray(r.depsModules) ? r.depsModules.find(m => m.path === 'frontend') : null
  assert(fe && fe.status === 'installed', `子模块真实目录 → installed 真话（实际 ${JSON.stringify(fe)}；不假 linked 也不误报 failed）`)
  assert(existsSync(join(wt, 'frontend', 'node_modules', 'real-pkg', 'index.js')), '本地安装内容不被 clobber')
}

// ── 3. broken junction → 清理后重建 linked（Windows 专用：mklink /J 指向不存在目标）──
console.log('\n--- 3. broken junction → 清理重建（Windows only）---')
if (process.platform === 'win32') {
  const { main, wt } = setupNodePair('broken-j')
  const ghost = join(wt, 'no-such-target')
  execFileSync('cmd.exe', ['/c', 'mklink', '/J', join(wt, 'node_modules'), ghost], { stdio: ['pipe', 'pipe', 'pipe'] })
  // broken junction：lstat 是 link、existsSync false（原实现 mklink 撞名失败 → 根落 install 慢路径）
  const r = provisionDeps(wt, main, {})
  assert(r.depsStatus === 'linked', `broken junction 被清理重建 → linked（实际 ${r.depsStatus}）`)
  assert(existsSync(join(wt, 'node_modules', '.placeholder')), '重建后 junction 指向 main 内容可访问')
} else {
  console.log('  ⏭️ 跳过（非 Windows 无 junction）')
}

// ── 4. checkDepsFreshness：linked 子模块 node_modules 缺失 → missing（doctor 自愈闭环）──
console.log('\n--- 4. checkDepsFreshness 子模块 missing ---')
{
  const { main, wt } = setupNodePair('fresh-sub')
  // 根 node_modules 健在（否则根 missing 优先）；frontend 子模块链接健在/被删是本用例变量
  mkdirSync(join(wt, 'node_modules'))
  mkdirSync(join(wt, 'frontend'))
  writeFileSync(join(wt, 'frontend', 'package.json'), '{"name":"frontend"}')
  mkdirSync(join(wt, 'frontend', 'node_modules')) // 子模块链接健在
  const meta = {
    depsStatus: 'linked',
    depsLockHash: lockfileHash(wt),
    depsModules: [{ path: 'frontend', status: 'linked' }],
  }
  const ok = checkDepsFreshness(meta, wt, main)
  assert(ok.status === 'fresh', `对照：子模块链接健在 → fresh（实际 ${ok.status}: ${ok.detail}）`)

  rmSync(join(wt, 'frontend', 'node_modules'), { recursive: true, force: true }) // 模拟 junction 被删
  const missing = checkDepsFreshness(meta, wt, main)
  assert(missing.status === 'missing', `linked 子模块 node_modules 缺失 → missing（实际 ${missing.status}）`)
  assert(missing.detail.includes('frontend'), `detail 指名缺失子模块（实际 ${missing.detail}）`)
}

cleanup()
console.log(`\n${'='.repeat(50)}`)
console.log(`✅ 通过: ${passed}  ❌ 失败: ${failed}`)
if (failures.length) console.log(`失败项: ${failures.join('; ')}`)
console.log(`${'='.repeat(50)}`)
if (failed > 0) process.exit(1)
