/**
 * done-like 步骤动作的存在性守卫（坑 done-phantom-change-silent-create，2026-09-04 事故元凶①）
 * change: 2026-09-04 工单① — src/run/command.js doneLikeTargetMaterialized + runCommand 守卫
 *
 * 背景：平台接管指针切换/重建进度库后，--change 指向旧库的变更名；新库 !progress 时
 * runCommand 无条件 initChange 静默新建幻影变更，--done 被记到幻影上（本次事故直接元凶）。
 *
 * 覆盖：
 *   1. 纯函数 doneLikeTargetMaterialized：普通变更存在/缺失/已归档、quick sid guard 有无、空 target
 *   2. 集成（本地模式）：explore --done --change <不存在> → exit 2 + 拒绝静默新建 + 不建幻影
 *   3. 集成（指针切库）：pointer → 新空库，旧变更名 --done → exit 2 + 报平台指针排查方向
 *   4. 集成（quick）：--done --change quick-<8hex>（本库无会话 guard）→ exit 2 + quick 专属提示
 *   5. 负向（自愈保留）：changes/<名>/ 目录存在但 DB 行缺失 → 守卫放行走 initChange 物化
 *
 * 隔离：mkdtempSync 临时目录 + 临时 specDir，不污染真实仓库。
 */
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { runCommand } from '../src/run.js'
import { doneLikeTargetMaterialized } from '../src/run/command.js'
import { ProgressManager } from '../src/progress.js'

let total = 0, failed = 0
function assert(condition, msg) {
  total++
  if (!condition) { failed++; console.log(`  ❌ FAIL: ${msg}`) }
  else console.log(`  ✅ PASS: ${msg}`)
}
async function captureExit(fn) {
  const origExit = process.exit
  const origLog = console.log
  const origErr = console.error
  let exitCode = null
  let stdout = ''
  let stderr = ''
  process.exit = (code) => { exitCode = code; throw new Error('EXIT_' + code) }
  console.log = (...a) => { stdout += a.join(' ') + '\n' }
  console.error = (...a) => { stderr += a.join(' ') + '\n' }
  try {
    await fn()
  } catch (e) {
    if (!/^EXIT_\d+$/.test(e.message)) { exitCode = null; throw e }
  } finally {
    process.exit = origExit
    console.log = origLog
    console.error = origErr
  }
  return { exitCode, stdout, stderr }
}

console.log('=== done-phantom-change-silent-create 守卫 ===\n')

// ── 1. 纯函数 doneLikeTargetMaterialized ──
{
  const base = mkdtempSync(join(tmpdir(), 'dpm-pure-'))
  mkdirSync(join(base, 'changes', 'real-change'), { recursive: true })
  mkdirSync(join(base, 'changes', 'archive', 'archived-change'), { recursive: true })
  mkdirSync(join(base, '.runtime', 'quick-sessions', 'quick-1a2b3c4d'), { recursive: true })
  writeFileSync(join(base, '.runtime', 'quick-sessions', 'quick-1a2b3c4d', 'guard.json'), '{}')

  assert(doneLikeTargetMaterialized({ target: 'real-change', specBase: base }) === true, '纯函数：changes/<名>/ 存在 → 物化')
  assert(doneLikeTargetMaterialized({ target: 'ghost-change', specBase: base }) === false, '纯函数：changes/<名>/ 缺失 → 幻影')
  assert(doneLikeTargetMaterialized({ target: 'archived-change', specBase: base }) === true, '纯函数：已归档目录也算物化（自愈路径）')
  assert(doneLikeTargetMaterialized({ target: 'quick-1a2b3c4d', specBase: base }) === true, '纯函数：quick sid 会话 guard 存在 → 物化')
  assert(doneLikeTargetMaterialized({ target: 'quick-deadbeef', specBase: base }) === false, '纯函数：quick sid 无会话 guard → 幻影')
  assert(doneLikeTargetMaterialized({ target: null, specBase: base }) === false, '纯函数：空 target → 幻影（无可物化对象）')
  assert(doneLikeTargetMaterialized({ target: 'real-change', specBase: join(base, 'nope') }) === false, '纯函数：specBase 不存在 → 幻影')
  try { rmSync(base, { recursive: true, force: true }) } catch {}
}

// ── 公共 fixture：本地模式仓库 ──
const repo = mkdtempSync(join(tmpdir(), 'dpm-repo-'))
const specBase = join(repo, '.sillyspec')
await new ProgressManager({ specDir: specBase }).init(repo)
mkdirSync(join(specBase, 'changes', '2026-09-01-real-work'), { recursive: true })
await new ProgressManager({ specDir: specBase }).initChange(repo, '2026-09-01-real-work')

// ── 2. 本地模式：--done --change <不存在> → exit 2，不建幻影 ──
{
  const r = await captureExit(() => runCommand(['explore', '--done', '--change', '2026-08-30-old-lib-change', '--output', 'x'], repo))
  assert(r.exitCode === 2, `本地模式：explore --done 幻影变更 → exit 2（实际 ${r.exitCode}）`)
  assert(r.stderr.includes('拒绝静默新建'), '本地模式：报错含「拒绝静默新建」')
  assert(r.stderr.includes('2026-08-30-old-lib-change'), '本地模式：报错含目标变更名')
  assert(!existsSync(join(specBase, 'changes', '2026-08-30-old-lib-change')), '本地模式：幻影变更目录未被创建')
  const pm = new ProgressManager({ specDir: specBase })
  assert(pm.read(repo, '2026-08-30-old-lib-change') === null, '本地模式：DB 无幻影行')
}

// ── 3. 指针切库：pointer → 新空库，旧变更名 --done → exit 2 + 指针排查方向 ──
{
  const repoP = mkdtempSync(join(tmpdir(), 'dpm-ptr-'))
  const libOld = mkdtempSync(join(tmpdir(), 'dpm-ptr-old-'))
  const libNew = mkdtempSync(join(tmpdir(), 'dpm-ptr-new-'))
  // 旧库：变更存在且活跃
  await new ProgressManager({ specDir: libOld }).init(repoP)
  mkdirSync(join(libOld, 'changes', '2026-08-30-switched-away'), { recursive: true })
  await new ProgressManager({ specDir: libOld }).initChange(repoP, '2026-08-30-switched-away')
  // 新库：空初始化；指针指向新库（模拟重跑平台 scan 换库）
  await new ProgressManager({ specDir: libNew }).init(repoP)
  writeFileSync(join(repoP, '.sillyspec-platform.json'), JSON.stringify({ specRoot: libNew, runtimeRoot: join(libNew, '.runtime') }))

  const r = await captureExit(() => runCommand(['explore', '--done', '--change', '2026-08-30-switched-away', '--output', 'x'], repoP))
  assert(r.exitCode === 2, `指针切库：explore --done 旧库变更名 → exit 2（实际 ${r.exitCode}）`)
  assert(r.stderr.includes('平台接管指针'), '指针切库：报错点名平台接管指针排查方向')
  assert(!existsSync(join(libNew, 'changes', '2026-08-30-switched-away')), '指针切库：新库未建幻影目录')

  for (const d of [repoP, libOld, libNew]) { try { rmSync(d, { recursive: true, force: true }) } catch {} }
}

// ── 4. quick：--done --change quick-<8hex>（无会话 guard）→ exit 2 + quick 专属提示 ──
{
  const r = await captureExit(() => runCommand(['quick', '--done', '--change', 'quick-deadbeef', '--output', '需求：x 根因：y 方案：z 结果：w'], repo))
  assert(r.exitCode === 2, `quick：--done 无会话 guard 的 sid → exit 2（实际 ${r.exitCode}）`)
  assert(r.stderr.includes('quick 会话'), 'quick：报错含 quick 会话专属提示')
  const pm = new ProgressManager({ specDir: specBase })
  assert(pm.read(repo, 'quick-deadbeef') === null, 'quick：DB 无幻影会话行')
}

// ── 5. 负向：目录已存在（DB 行缺失）→ 守卫放行，initChange 自愈物化 ──
{
  mkdirSync(join(specBase, 'changes', '2026-09-02-dir-only'), { recursive: true })
  writeFileSync(join(specBase, 'changes', '2026-09-02-dir-only', 'proposal.md'), '# p\n')
  const pm = new ProgressManager({ specDir: specBase })
  assert(pm.read(repo, '2026-09-02-dir-only') === null, '负向前置：目录存在但 DB 无行')
  const r = await captureExit(() => runCommand(['explore', '--done', '--change', '2026-09-02-dir-only', '--output', 'x'], repo))
  assert(!r.stderr.includes('拒绝静默新建'), '负向：目录已存在 → 守卫不拦（自愈路径保留）')
  assert(pm.read(repo, '2026-09-02-dir-only') !== null, '负向：initChange 物化 DB 行（自愈生效）')
}

// 清理
try { rmSync(repo, { recursive: true, force: true }) } catch {}

console.log('\n==================================================')
console.log(`✅ 通过: ${total - failed}  ❌ 失败: ${failed}`)
console.log('==================================================')
if (failed > 0) process.exit(1)
