/**
 * 坑 default-empty-dir-materialized + explore-done-change-default-hint（2026-09-14 用户反馈）：
 *
 * 1. initChange 对系统 key（default / quick-<8hex>）不再物化 changes/<名>/ 空目录——
 *    default 行是辅助阶段（explore 等）无实体产物的进度容器，空目录纯污染（next.js 报
 *    「变更目录为空→清理」误导 + resolveChangeNameAuto 目录计数被搅动 + spec 树上行空目录）。
 *    普通变更（日期名）物化目录回归不变。
 * 2. 辅助阶段 default 行阶段亲和（run/command.js !progress 块）：目录停建后「续跑锚回
 *    default」不再靠目录存在感，显式判 default 行有在途（非 completed）本阶段 → 锚回。
 *    - explore --done 无 --change + default 在途 → 在 default 行完成（不挂到唯一目录变更上）
 *    - 显式 --change 恒优先
 * 3. 亲和救不了的残余拒绝路径（default 无在途/不存在）：守卫报错 ③ 对 explore + default
 *    在活跃列表时补「加 --change default」出口；无 default 行时维持 brainstorm 提示。
 *
 * 隔离：mkdtempSync 临时目录 + 临时 specDir，不污染真实仓库。
 */
import { mkdtempSync, mkdirSync, rmSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { runCommand } from '../src/run.js'
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

console.log('=== default 系统键不物化目录 + 辅助阶段亲和 + explore 拒绝提示 ===\n')

const repo = mkdtempSync(join(tmpdir(), 'defdir-repo-'))
const specBase = join(repo, '.sillyspec')
await new ProgressManager({ specDir: specBase }).init(repo)

// ── 1. initChange：default 不建目录，普通变更照建 ──
{
  const pm = new ProgressManager({ specDir: specBase })
  pm.initChange(repo, 'default')
  assert(!existsSync(join(specBase, 'changes', 'default')), 'initChange(default) 不物化 changes/default/ 目录')
  assert(pm.read(repo, 'default') !== null, 'default DB 行存在（进度真相在 DB）')

  pm.initChange(repo, '2026-09-13-real-work')
  assert(existsSync(join(specBase, 'changes', '2026-09-13-real-work')), '普通变更（日期名）照常物化目录（回归）')

  pm.initChange(repo, 'quick-abcd1234')
  assert(!existsSync(join(specBase, 'changes', 'quick-abcd1234')), 'quick 会话键不物化目录（既有回归）')
}

// ── 公共 helper：给某变更行种 explore 阶段 ──
function seedExploreStage(pm, name, stageStatus, stepStatus) {
  pm._write(repo, {
    currentStage: 'explore',
    stages: {
      explore: {
        status: stageStatus,
        steps: [{ name: '自由探索', status: stepStatus }],
      },
    },
  }, name)
}

// ── 2. 亲和：default 在途 explore + 恰好一个其他变更目录 → explore --done 锚回 default ──
// （目录停建前此场景靠 default 目录存在感把目标数成 2；停建后只剩 1 个目录，无亲和会把
//  explore 挂到别人的变更行上——亲和显式化后续跑语义不变）
// 注：explore 是辅助阶段，完成收尾会 reset 回 pending 可重跑（gates.js auxiliary 重置），
// 断言用「完成消息 + default 已被 reset（in-progress→pending）+ 他者行未被挂步」三件套。
{
  const pm = new ProgressManager({ specDir: specBase })
  // default 行在途（in-progress + 1 pending 步）；other 变更有目录 + DB 行
  seedExploreStage(pm, 'default', 'in-progress', 'pending')
  const r = await captureExit(() => runCommand(['explore', '--done', '--output', '探索结论'], repo))
  assert(r.exitCode !== 2, `explore --done（无 --change，default 在途）不被拒（实际 ${r.exitCode}）`)
  assert(r.stdout.includes('explore 阶段已完成'), 'explore 阶段走完完成分支（完成消息可见）')

  const after = new ProgressManager({ specDir: specBase }).read(repo, 'default')
  assert(after?.stages?.explore?.status === 'pending', 'default 行 explore 已完成并 reset 回 pending（in-progress 被消费，亲和锚定正确）')
  const other = new ProgressManager({ specDir: specBase }).read(repo, '2026-09-13-real-work')
  assert((other?.stages?.explore?.steps || []).length === 0, '其他变更行未被挂 explore 步（不偷目标）')
  assert(!existsSync(join(specBase, 'changes', 'default')), '--done 流程也不补建 changes/default/ 目录')
}

// ── 3. 显式 --change 恒优先（亲和不覆盖用户指定）──
{
  const pm = new ProgressManager({ specDir: specBase })
  seedExploreStage(pm, '2026-09-13-real-work', 'in-progress', 'pending')
  const r = await captureExit(() => runCommand(['explore', '--done', '--change', '2026-09-13-real-work', '--output', 'x'], repo))
  assert(r.exitCode !== 2, `显式 --change 不受亲和影响（实际 ${r.exitCode}）`)
  assert(r.stdout.includes('explore 阶段已完成'), '显式指定的变更上完成消息可见')
  const other = new ProgressManager({ specDir: specBase }).read(repo, '2026-09-13-real-work')
  assert(other?.stages?.explore?.status === 'pending', '显式指定的变更行 explore 已 reset（完成落在此行）')
  const dflt = new ProgressManager({ specDir: specBase }).read(repo, 'default')
  assert(dflt?.stages?.explore?.status === 'pending', 'default 行保持 reset 态未被本次触碰')
}

// ── 4. 亲和救不了的残余路径：default 行存在但 explore 已完成 → 拒 + explore 专属提示 ──
{
  // 造两个变更目录（目录计数解析 → null）+ default 行（explore completed，无亲和）
  const pm = new ProgressManager({ specDir: specBase })
  pm.initChange(repo, '2026-09-12-second-change')
  seedExploreStage(pm, 'default', 'completed', 'completed')
  const r = await captureExit(() => runCommand(['explore', '--done', '--output', 'x'], repo))
  assert(r.exitCode === 2, `default 无在途 explore 时 --done 仍拒（防幻影，实际 ${r.exitCode}）`)
  assert(r.stderr.includes('拒绝静默新建'), '报错含守卫主文案')
  assert(r.stderr.includes('--change default'), '③ 补 explore 专属提示：重试加 --change default')
}

// ── 5. 无 default 行：维持 brainstorm 提示（不误导）──
{
  const repo2 = mkdtempSync(join(tmpdir(), 'defdir-repo2-'))
  const sb2 = join(repo2, '.sillyspec')
  const pm2 = new ProgressManager({ specDir: sb2 })
  await pm2.init(repo2)
  for (const n of ['2026-09-12-alpha', '2026-09-13-beta']) {
    mkdirSync(join(sb2, 'changes', n), { recursive: true })
    pm2.initChange(repo2, n)
  }
  const r = await captureExit(() => runCommand(['explore', '--done', '--output', 'x'], repo2))
  assert(r.exitCode === 2, '无 default 行 + 多活跃 → 守卫拒绝（回归不变）')
  assert(!r.stderr.includes('--change default'), '无 default 行时不给 default 提示（避免误导）')
  assert(r.stderr.includes('run brainstorm'), '维持 brainstorm 新建路径提示')
  try { rmSync(repo2, { recursive: true, force: true }) } catch {}
}

try { rmSync(repo, { recursive: true, force: true }) } catch {}

console.log(`\n结果: ${total - failed}/${total} 通过`)
if (failed > 0) process.exit(1)
