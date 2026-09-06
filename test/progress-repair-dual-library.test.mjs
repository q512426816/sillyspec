/**
 * progress check/repair 双进度库分裂探测（坑 progress-repair-dual-library-blind，2026-09-04 ②）
 * change: 2026-09-04 工单② — src/progress/consistency-doctor.js detectLibrarySplit
 *
 * 背景：平台接管指针切换库后，旧库（cwd/.sillyspec）残留活跃变更；progress check/repair
 * 只看指针指向的当前库，报「未发现问题」假阴性，对分裂完全失明。
 *
 * 覆盖：
 *   1. 纯探测：指针 → 新库 + 旧库残留 db，两库均有活跃变更 → split/bothActive + lines 报双库
 *   2. 目标变更只在旧库 → targetInOther（操作错了库，最强信号）
 *   3. checkConsistency 接线：分裂进 issues（打印 + ok=false）
 *   4. repairConsistency 接线：分裂进 manual 清单（repair 修不了权威库归属，只能亮出来）
 *   5. 无指针 / 自指指针 / 旧库无 db → 不报（防误报）
 *   6. 旧库零活跃（仅双库并存）→ warning 级不进 issues（平台模式本地库保留资产是容忍态）
 *
 * 隔离：mkdtempSync 临时目录双库，不污染真实仓库。
 */
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { ProgressManager } from '../src/progress.js'

let total = 0, failed = 0
function assert(condition, msg) {
  total++
  if (!condition) { failed++; console.log(`  ❌ FAIL: ${msg}`) }
  else console.log(`  ✅ PASS: ${msg}`)
}
async function captureLog(fn) {
  const origLog = console.log
  const origWarn = console.warn
  let buf = ''
  console.log = (...a) => { buf += a.join(' ') + '\n' }
  console.warn = (...a) => { buf += a.join(' ') + '\n' }
  try { return { out: await fn(), buf } } finally { console.log = origLog; console.warn = origWarn }
}

console.log('=== progress check/repair 双库分裂探测 ===\n')

/** 建一个库：project 行 + N 个活跃变更（changes/ 目录 + DB 行） */
async function makeLibrary(root, cwd, changeNames) {
  const pm = new ProgressManager({ specDir: root })
  pm.init(cwd)
  for (const cn of changeNames) {
    mkdirSync(join(root, 'changes', cn), { recursive: true })
    pm.initChange(cwd, cn)
  }
  return pm
}

// ── 公共 fixture：repo + 旧库（本地 .sillyspec，含旧变更）+ 新库（指针目标，空/新变更）──
const repo = mkdtempSync(join(tmpdir(), 'dlp-repo-'))
const libOld = join(repo, '.sillyspec')
await makeLibrary(libOld, repo, ['2026-08-30-old-active'])
const libNew = mkdtempSync(join(tmpdir(), 'dlp-new-'))
await makeLibrary(libNew, repo, ['2026-09-03-new-active'])
// 指针指向新库（模拟重跑平台 scan 换库，旧库残留）
writeFileSync(join(repo, '.sillyspec-platform.json'), JSON.stringify({ specRoot: libNew, runtimeRoot: join(libNew, '.runtime') }))

// 当前操作视角：pm 绑定新库（与 index.js progress 分支 resolvePlatformSpecDir 同源）
const pmNew = new ProgressManager({ specDir: libNew })

// ── 1. 纯探测：两库均有活跃 → split + bothActive ──
{
  const d = pmNew._consistency.detectLibrarySplit(repo, null)
  assert(d.dualDb === true, '纯探测：双库并存检出 dualDb')
  assert(d.bothActive === true && d.split === true, '纯探测：两库均有活跃 → bothActive/split')
  assert(d.lines.some(l => l.includes('双进度库并存')), '纯探测：lines 报「双进度库并存」')
  assert(d.lines.some(l => l.includes('2026-08-30-old-active')), '纯探测：lines 含旧库活跃变更名')
  assert(d.lines.some(l => l.includes('2026-09-03-new-active')), '纯探测：lines 含当前库活跃变更名')
}

// ── 2. 目标变更只在旧库 → targetInOther ──
{
  const d = pmNew._consistency.detectLibrarySplit(repo, '2026-08-30-old-active')
  assert(d.targetInOther === true && d.split === true, '目标变更：只在旧库 → targetInOther')
  assert(d.lines.some(l => l.includes('操作错了库')), '目标变更：lines 点名「操作错了库」')
}

// ── 3. checkConsistency 接线：分裂进 issues ──
{
  // 3a. 目标变更只在旧库（read 早退 !data 路径）：issues 仍带分裂（index.js 负责打印）
  const { out } = await captureLog(() => Promise.resolve(pmNew.checkConsistency(repo, '2026-08-30-old-active')))
  assert(out.ok === false, 'check：分裂 + 目标在旧库 → ok=false')
  assert((out.issues || []).some(i => i.includes('双进度库并存')), 'check（!data 路径）：issues 含双库分裂')
  // 3b. 当前库可读变更（data 路径）：checkConsistency 自己打印分裂（不再假阴性静默）
  const { buf } = await captureLog(() => Promise.resolve(pmNew.checkConsistency(repo, '2026-09-03-new-active')))
  assert(buf.includes('双进度库并存'), 'check（data 路径）：控制台输出双库分裂')
}

// ── 4. repairConsistency 接线：分裂进 manual ──
{
  const { out, buf } = await captureLog(() => Promise.resolve(pmNew.repairConsistency(repo, { apply: false, changeName: '2026-08-30-old-active' })))
  assert((out.manual || []).some(m => typeof m === 'string' && m.includes('双进度库并存')), 'repair：manual 清单含双库分裂')
  assert(buf.includes('双进度库并存'), 'repair：控制台输出双库分裂')
}

// ── 5. 防误报：无指针 / 自指 / 旧库无 db ──
{
  // 5a. 无指针（纯本地两目录不算分裂——指针才是「切库」证据）
  const repoNoPtr = mkdtempSync(join(tmpdir(), 'dlp-noptr-'))
  const libA = join(repoNoPtr, '.sillyspec')
  await makeLibrary(libA, repoNoPtr, ['a-change'])
  const pmA = new ProgressManager({ specDir: libA })
  const dA = pmA._consistency.detectLibrarySplit(repoNoPtr, null)
  assert(dA.dualDb === false && dA.lines.length === 0, '防误报：无指针 → 不报')
  try { rmSync(repoNoPtr, { recursive: true, force: true }) } catch {}

  // 5b. 自指指针（specRoot 解析回本地 .sillyspec，repo-native junction 形态）
  const repoSelf = mkdtempSync(join(tmpdir(), 'dlp-self-'))
  const libSelf = join(repoSelf, '.sillyspec')
  await makeLibrary(libSelf, repoSelf, ['self-change'])
  writeFileSync(join(repoSelf, '.sillyspec-platform.json'), JSON.stringify({ specRoot: libSelf }))
  const pmSelf = new ProgressManager({ specDir: libSelf })
  const dB = pmSelf._consistency.detectLibrarySplit(repoSelf, null)
  assert(dB.dualDb === false, '防误报：自指指针 → 不报')
  try { rmSync(repoSelf, { recursive: true, force: true }) } catch {}

  // 5c. 有指针但旧库无 db（从未建过本地库）
  const repoNoOld = mkdtempSync(join(tmpdir(), 'dlp-noold-'))
  const libC = mkdtempSync(join(tmpdir(), 'dlp-libc-'))
  await makeLibrary(libC, repoNoOld, ['c-change'])
  writeFileSync(join(repoNoOld, '.sillyspec-platform.json'), JSON.stringify({ specRoot: libC }))
  const pmC = new ProgressManager({ specDir: libC })
  const dC = pmC._consistency.detectLibrarySplit(repoNoOld, null)
  assert(dC.dualDb === false, '防误报：旧库无 db → 不报')
  for (const d of [repoNoOld, libC]) { try { rmSync(d, { recursive: true, force: true }) } catch {} }
}

// ── 6. 旧库零活跃（仅双库并存）→ warning 级，不进 issues ──
{
  const repoW = mkdtempSync(join(tmpdir(), 'dlp-warn-'))
  const libOldW = join(repoW, '.sillyspec')
  const pmOldW = await makeLibrary(libOldW, repoW, ['later-archived'])
  // 旧库变更收尾（unregister → status 不再 active）
  pmOldW.unregisterChange(repoW, 'later-archived')
  const libNewW = mkdtempSync(join(tmpdir(), 'dlp-warnnew-'))
  await makeLibrary(libNewW, repoW, ['2026-09-04-new'])
  writeFileSync(join(repoW, '.sillyspec-platform.json'), JSON.stringify({ specRoot: libNewW }))
  const pmW = new ProgressManager({ specDir: libNewW })
  const dW = pmW._consistency.detectLibrarySplit(repoW, null)
  assert(dW.dualDb === true && dW.split === false && dW.bothActive === false, '分级：旧库零活跃 → dualDb 但不 split')
  const { out } = await captureLog(() => Promise.resolve(pmW.checkConsistency(repoW, '2026-09-04-new')))
  assert(!(out.issues || []).some(i => i.includes('双进度库并存')), '分级：零活跃旧库不进 issues（避免平台模式常态误报）')
  assert((out.warnings || []).some(w => w.includes('双进度库并存')), '分级：零活跃旧库降级 warning')
  for (const d of [repoW, libNewW]) { try { rmSync(d, { recursive: true, force: true }) } catch {} }
}

// 清理
for (const d of [repo, libNew]) { try { rmSync(d, { recursive: true, force: true }) } catch {} }

console.log('\n==================================================')
console.log(`✅ 通过: ${total - failed}  ❌ 失败: ${failed}`)
console.log('==================================================')
if (failed > 0) process.exit(1)
