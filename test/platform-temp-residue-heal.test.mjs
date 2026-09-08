/**
 * platform-temp-residue-heal.test.mjs — temp 残留平台声明/指针治理测试
 *
 * 2026-09-08 temp 投毒实证（multi-agent-platform 工作台「总览不可用」排障）：
 * Git Bash mktemp 临时 specRoot 的平台模式命令在真实项目根写下指针+声明；指针随后被
 * cleanup/STALE 清理，声明按设计存活（唯一删除路径 = platform disconnect）→ 双入口
 * fail-closed 全命令瘫痪，且 disconnect 会连带清 local.yaml platform 段误伤真实平台
 * 连接。修复三件套对应本文件三组场景：
 *   写侧：writePlatformPointer 拒绝 temp specRoot × 非 temp cwd 三写（场景②）；
 *   读侧双入口（resolvePlatformSpecDir / runCommand 恢复链）：temp 残留声明 warn +
 *   自动清理 + 按本地模式继续（场景③④）；
 *   回归：cwd 与 spec 同在 temp（套件隔离正常形态）与非 temp 声明的 fail-closed
 *   语义不变（场景⑤⑥，对齐 platform-managed-declaration 场景②③）。
 *
 * 隔离手法：os.tmpdir() 读 TEMP/TMP/TMPDIR 且无缓存——CLI 子进程（spawnSync env）与
 * 进程内直测（临时改 process.env）都把 temp 指到 fakeTmp，夹具 cwd 放 realTmp 下
 * （fakeTmp 之外）构成"specRoot 在 temp、cwd 不在 temp"；套件模式下 realTmp=suiteTmp
 * （run-tests.mjs childEnv 已覆写），直跑模式=真实 temp，两种形态夹具均可弃置。
 */

import { join, resolve, dirname } from 'path'
import { existsSync, mkdirSync, writeFileSync, rmSync, mkdtempSync } from 'fs'
import { fileURLToPath, pathToFileURL } from 'url'
import { spawnSync } from 'child_process'
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

const P = 'ptrh'
const realTmp = tmpdir()
const fakeTmp = mkdtempSync(join(realTmp, `${P}-fake-`))

function gitInit(d) {
  try {
    spawnSync('git', ['init', '-q'], { cwd: d })
    spawnSync('git', ['config', 'user.email', 't@t.local'], { cwd: d })
    spawnSync('git', ['config', 'user.name', 't'], { cwd: d })
  } catch {}
}
function setup(name) {
  const d = join(realTmp, `${P}-${name}`)
  rmSync(d, { recursive: true, force: true })
  mkdirSync(d, { recursive: true })
  gitInit(d) // 隔离：防 tmpdir 落在 home git repo 内被 resolveEffectiveDir 纠正
  return d
}
function clean(...dirs) { for (const d of dirs) try { rmSync(d, { recursive: true, force: true }) } catch {} }

// 声明投毒：手写四字段声明（等价 writePlatformPointer 声明产物；不经 init 是因为写侧
// 守卫会拒绝该组合——那正是场景②要断言的行为）
function poisonDecl(cwd, specRoot) {
  writeFileSync(
    join(cwd, '.sillyspec-platform-managed'),
    JSON.stringify({ managed: true, specRoot, workspaceId: null, declaredAt: new Date().toISOString() }, null, 2) + '\n',
  )
}

// CLI 子进程统一入口：env temp 三元组 → fakeTmp（子进程 os.tmpdir() 现读现算）
function runEnv(args) {
  const r = spawnSync(process.execPath, [binCLI, ...args], {
    encoding: 'utf8', timeout: 30000,
    env: { ...process.env, TEMP: fakeTmp, TMP: fakeTmp, TMPDIR: fakeTmp },
  })
  return { code: r.status, stdout: String(r.stdout || ''), stderr: String(r.stderr || '') }
}

// 进程内临时覆写 temp（finally 还原；os.tmpdir() 无缓存，调用点现读）
function withFakeTmp(fn) {
  const saved = { TEMP: process.env.TEMP, TMP: process.env.TMP, TMPDIR: process.env.TMPDIR }
  process.env.TEMP = fakeTmp; process.env.TMP = fakeTmp; process.env.TMPDIR = fakeTmp
  try { return fn() } finally {
    for (const k of Object.keys(saved)) {
      if (saved[k] === undefined) delete process.env[k]
      else process.env[k] = saved[k]
    }
  }
}

// ── 场景①：isTempResidueSpecRoot 纯函数矩阵 ──
console.log('\n=== 场景①：isTempResidueSpecRoot 判定矩阵 ===')
{
  const { isTempResidueSpecRoot } = await import(pathToFileURL(join(root, 'src', 'run', 'shared.js')).href)
  const tmpSpec = join(realTmp, 'x', 'spec')
  const outside = join(dirname(realTmp), 'proj') // realTmp 父目录=当前 temp 之外（纯路径，不落盘）
  assert(isTempResidueSpecRoot(outside, tmpSpec) === true, 'cwd 在 temp 外 + specRoot 在 temp → true')
  assert(isTempResidueSpecRoot(join(realTmp, 'proj'), tmpSpec) === false, 'cwd 同在 temp → false（套件隔离正常形态）')
  assert(isTempResidueSpecRoot(outside, join(dirname(realTmp), 'spec')) === false, 'specRoot 不在 temp → false')
  assert(isTempResidueSpecRoot(outside, null) === false, 'specRoot null → false')
  assert(isTempResidueSpecRoot(outside, '') === false, 'specRoot 空串 → false')
  assert(isTempResidueSpecRoot(outside, realTmp) === true, 'specRoot 恰为 temp 根（等值分支）→ true')
  assert(isTempResidueSpecRoot(join(realTmp, 'p'), join(`${realTmp}-sibling`, 'spec')) === false, 'temp 兄弟目录前缀不误判（tmp+sep 边界）')
}

// ── 场景②：写侧守卫（writePlatformPointer 拒绝 temp specRoot × 非 temp cwd）──
console.log('\n=== 场景②：写侧守卫拒绝投毒三写 ===')
{
  const { writePlatformPointer } = await import(pathToFileURL(join(root, 'src', 'run', 'shared.js')).href)
  const cwd = setup('wguard')
  const poisonSpec = join(fakeTmp, 'wspec') // fakeTmp 内 → withFakeTmp 视角下在 temp
  let r = null
  withFakeTmp(() => { r = writePlatformPointer(cwd, { specRoot: poisonSpec }) })
  assert(r === false, 'temp specRoot × 非 temp cwd → 拒绝三写返回 false')
  assert(!existsSync(join(cwd, '.sillyspec-platform.json')), '恢复指针未落盘')
  assert(!existsSync(join(cwd, '.sillyspec-platform-managed')), '接管声明未落盘')
  assert(!existsSync(join(poisonSpec, '.runtime')), '主文件（platform-scan.json）未落盘')
  // 正例：cwd 同在 temp → 照常三写（守卫不拦套件隔离形态，既有平台测试语义不变）
  const cwdOk = mkdtempSync(join(realTmp, `${P}-wok-`))
  const specOk = join(realTmp, `${P}-wok-spec`)
  const rOk = writePlatformPointer(cwdOk, { specRoot: specOk })
  assert(rOk === true, 'cwd 同在 temp → 三写正常')
  assert(existsSync(join(cwdOk, '.sillyspec-platform-managed')), '声明正常落盘')
  clean(cwd, cwdOk, specOk)
}

// ── 场景③：入口一 resolvePlatformSpecDir temp 残留降级 + 自动清理 ──
console.log('\n=== 场景③：入口一 temp 残留声明降级自愈 ===')
{
  const cwd = setup('e1')
  poisonDecl(cwd, join(fakeTmp, 'spec'))
  const { resolvePlatformSpecDir } = await import(pathToFileURL(join(root, 'src', 'progress.js')).href)
  let result = null, threw = null
  withFakeTmp(() => { try { result = resolvePlatformSpecDir(cwd) } catch (e) { threw = e } })
  assert(threw === null, 'temp 残留声明不抛 PlatformManagedError')
  assert(result === join(cwd, '.sillyspec'), '降级解析本地 cwd/.sillyspec')
  assert(!existsSync(join(cwd, '.sillyspec-platform-managed')), '残留声明已自动清理')
  clean(cwd)
}

// ── 场景④：入口二 runCommand 恢复链 temp 残留降级 + 自动清理 ──
console.log('\n=== 场景④：入口二裸调 run 降级自愈（CLI 子进程）===')
{
  const cwd = setup('e2')
  poisonDecl(cwd, join(fakeTmp, 'spec'))
  const r = runEnv(['--dir', cwd, 'run', 'quick', '--status'])
  assert(r.code === 0, `裸调 run quick --status exit 0（实际 ${r.code}）`)
  assert(r.stderr.includes('temp 残留平台接管声明'), 'stderr 含降级 warn')
  assert(!existsSync(join(cwd, '.sillyspec-platform-managed')), '残留声明已自动清理')
  clean(cwd)
}

// ── 场景⑤：回归——非 temp specRoot 声明仍 fail-closed ──
console.log('\n=== 场景⑤：非 temp 声明 fail-closed 不回退 ===')
{
  const cwd = setup('reg1')
  const realSpec = join(realTmp, `${P}-reg-spec`) // fakeTmp 之外 → 子进程视角非 temp
  mkdirSync(realSpec, { recursive: true })
  poisonDecl(cwd, realSpec)
  const r = runEnv(['--dir', cwd, 'run', 'quick', '--status'])
  assert(r.code === 1, `仍 exit 1（实际 ${r.code}）`)
  assert(r.stderr.includes('平台接管声明生效'), 'stderr 含 fail-closed 报错')
  assert(existsSync(join(cwd, '.sillyspec-platform-managed')), '声明未被误删')
  assert(!existsSync(join(cwd, '.sillyspec')), '未静默建本地 .sillyspec/（防状态分裂不变）')
  clean(cwd, realSpec)
}

// ── 场景⑥：回归——cwd 与 spec 同在 temp（套件夹具形态）fail-closed 保持 ──
console.log('\n=== 场景⑥：同在 temp 的声明 fail-closed 保持 ===')
{
  const cwd = mkdtempSync(join(fakeTmp, `${P}-e3-`))
  gitInit(cwd)
  poisonDecl(cwd, join(fakeTmp, `${P}-e3-spec`))
  const r = runEnv(['--dir', cwd, 'run', 'quick', '--status'])
  assert(r.code === 1, `同在 temp 仍 exit 1（实际 ${r.code}）——对齐 platform-managed-declaration 场景③`)
  clean(cwd)
}

rmSync(fakeTmp, { recursive: true, force: true })
console.log(`\n结果: ${passed} passed, ${failed} failed`)
process.exit(failed > 0 ? 1 : 0)
