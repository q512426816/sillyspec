// tax-governance-ledger — 摩擦幸存台账 + 税面维度单测（2026-09-15-tax-governance task-02）
//
// 覆盖（FR-02 台账 / FR-03 税面，design 方案 B Grill P1-1 修订版）：
// 1. merge-by-change：同 change 二次 consume 累加非双计（--reopen 重跑合并为一）、total 重算；
//    新 change append；被 merge 条目挪尾（最近活跃优先幸存掐头）
// 2. archivedAt：主滚动不落；merge 带 archivedAt 时落定；后续不带 archivedAt 的 merge 不冲掉已有值
// 3. rollLedger ≤200 掐头留最新（205 个 change → 200 条，最旧 5 个被掐）
// 4. 坏 JSON / 非数组 / 文件缺失 → readFrictionLedger 空数组起（全量重启容忍立场），merge 不抛
// 5. 空 counts 跳过写（纯函数级：不落空文件、既有台账不动）——防干净收尾落空条目
// 6. fail-soft：runtimeRoot 不可写（父路径是普通文件）→ {ok:false} 不抛（sync + async 锁版）
// 7. prune 兜底：残余 tally（events:{type:{count,lastAt}} X-10 结构）merge 进台账 + archivedAt
//    落定 + ledgerAppend:true 返回；零残余 → ledgerAppend:false 且不落台账；{ok,removed} 契约不变
// 8. doctor self_maintenance_tax 四态：活跃非零 tally 列示 + 台账聚合（近 90 天 top5+累计总量）
//    pass:true 纯信息；单变更 total≥3 记 WARNING（刻意拉状态）；无台账渲染「无台账数据」不告警
// 9. 落点红线：台账文件只落 .runtime 树内，绝不落 changes/
//
// 隔离：os.tmpdir() 临时目录 fixture，绝不碰真实 .sillyspec/.runtime。
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { readFrictionLedger, rollLedger, mergeFrictionEntry, mergeFrictionEntrySync } from '../src/friction-ledger.js'
import { pruneArchivedChangeRuntime } from '../src/run/complete-handlers.js'
import { detectSelfMaintenanceTax } from '../src/doctor-diagnostics.js'

let failures = 0
const assert = (cond, msg) => {
  if (cond) console.log('  ✅ ' + msg)
  else { console.error('  ❌ ' + msg); failures++ }
}

const tmpRoot = mkdtempSync(join(tmpdir(), `sillyspec-tax-ledger-${process.pid}-`))
let seq = 0
const makeRt = () => {
  const rt = join(tmpRoot, `case-${++seq}`, '.sillyspec', '.runtime')
  mkdirSync(rt, { recursive: true })
  return rt
}
const ledgerPath = (rt) => join(rt, 'friction-ledger.json')
const readLedger = (rt) => JSON.parse(readFileSync(ledgerPath(rt), 'utf8'))
const writeLedger = (rt, body) => {
  const p = ledgerPath(rt)
  mkdirSync(join(p, '..'), { recursive: true })
  writeFileSync(p, typeof body === 'string' ? body : JSON.stringify(body, null, 2))
}
const writeTally = (rt, change, events) => {
  const p = join(rt, `friction-tally-${change}.json`)
  writeFileSync(p, JSON.stringify({ events, history: [] }, null, 2))
  return p
}

console.log('\n[tax-governance-ledger] 摩擦幸存台账 + 税面维度')

// ─────────────────────────────────────────
// 1. merge-by-change：累加非双计 / append / 挪尾
// ─────────────────────────────────────────
console.log('\n--- 1. merge-by-change（--reopen 二次 consume 合并为一） ---')
{
  const rt = makeRt()
  const change = '2026-09-15-reopen-rerun'

  let r = mergeFrictionEntrySync(rt, { change, counts: { gate_rollback: 2 } })
  assert(r.ok === true && r.skipped === false, '首次 merge 返回 ok（落盘）')
  r = mergeFrictionEntrySync(rt, { change, counts: { gate_rollback: 1, verify_run_failed: 1 } })
  assert(r.ok === true && r.skipped === false, '同 change 二次 merge 返回 ok（--reopen 重跑）')
  let entries = readLedger(rt)
  assert(entries.length === 1, `同 change 二次 consume 合并为一（非双计，实际 ${entries.length} 条）`)
  assert(entries[0].counts.gate_rollback === 3, `gate_rollback 累加 2+1=3（实际 ${entries[0].counts.gate_rollback}）`)
  assert(entries[0].counts.verify_run_failed === 1, 'verify_run_failed 跨次累加正确')
  assert(entries[0].counts.review_rejected === 0, '未触及类型按 0 定形（三键齐全）')
  assert(entries[0].total === 4, `total 重算=4（实际 ${entries[0].total}）`)
  assert(entries[0].archivedAt === undefined, '主滚动不落 archivedAt（prune 侧落定）')

  mergeFrictionEntrySync(rt, { change: '2026-09-15-other-change', counts: { review_rejected: 1 } })
  entries = readLedger(rt)
  assert(entries.length === 2, '新 change append 追加新条目')
  assert(entries[1].change === '2026-09-15-other-change', '新条目在尾部（append 序）')

  // 被 merge 的既有条目挪尾：reopen 旧 change 后它应排到最后（最近活跃优先幸存掐头）
  mergeFrictionEntrySync(rt, { change, counts: { gate_rollback: 1 } })
  entries = readLedger(rt)
  assert(entries.length === 2 && entries[1].change === change, '被 merge 的既有条目挪到尾部（最近活跃优先幸存掐头）')
  assert(entries[1].counts.gate_rollback === 4, '挪尾 merge 计数仍累加（4）')

  // async 锁版主入口同语义（complete.js consume 点走它）
  const ra = await mergeFrictionEntry(rt, { change: '2026-09-15-async-entry', counts: { gate_rollback: 1, verify_run_failed: 2 } })
  assert(ra.ok === true && ra.skipped === false && ra.entry.total === 3, 'mergeFrictionEntry（async 锁版）merge 正确')
  assert(existsSync(ledgerPath(rt)), '台账文件已落盘')
  const normPath = String(ledgerPath(rt)).replace(/\\/g, '/')
  assert(normPath.includes('/.runtime/'), '台账路径在 .runtime 树内（隐私红线）')
  assert(!normPath.includes('/changes/'), '台账路径不含 changes/（永不落平台同步区）')
}

// ─────────────────────────────────────────
// 2. archivedAt 落定与保持
// ─────────────────────────────────────────
console.log('\n--- 2. archivedAt：prune 落定后不被主滚动冲掉 ---')
{
  const rt = makeRt()
  const change = '2026-09-15-archive-stamp'
  mergeFrictionEntrySync(rt, { change, counts: { gate_rollback: 1 } })
  const at = '2026-09-15T10:00:00.000Z'
  mergeFrictionEntrySync(rt, { change, counts: { verify_run_failed: 1 }, archivedAt: at })
  let entries = readLedger(rt)
  assert(entries[0].archivedAt === at, 'merge 带 archivedAt 时落定')
  // 归档后再来一笔（理论上不该发生，防御）：不冲掉已落定的 archivedAt
  mergeFrictionEntrySync(rt, { change, counts: { review_rejected: 1 } })
  entries = readLedger(rt)
  assert(entries[0].archivedAt === at, '后续不带 archivedAt 的 merge 不冲掉已有值')
  assert(entries[0].total === 3, '三笔累计 total=3')
}

// ─────────────────────────────────────────
// 3. rollLedger ≤200 掐头留最新
// ─────────────────────────────────────────
console.log('\n--- 3. 上限掐头（≤200 留最新） ---')
{
  assert(rollLedger([]).length === 0, 'rollLedger 空数组原样')
  assert(rollLedger(null).length === 0, 'rollLedger 非数组兜底空')
  const fake = Array.from({ length: 205 }, (_, i) => ({ change: `c-${i}`, total: 1 }))
  assert(rollLedger(fake).length === 200, '205 条掐到 200')
  assert(rollLedger(fake)[0].change === 'c-5', '掐头丢最旧（c-0..c-4 落选）')
  assert(rollLedger(fake)[199].change === 'c-204', '留最新（c-204 在尾）')

  const rt = makeRt()
  for (let i = 0; i < 205; i++) {
    mergeFrictionEntrySync(rt, { change: `2026-09-15-cap-${String(i).padStart(3, '0')}`, counts: { gate_rollback: 1 } })
  }
  const entries = readLedger(rt)
  assert(entries.length === 200, `落盘侧同样 ≤200（实际 ${entries.length}）`)
  assert(!entries.some((e) => e.change === '2026-09-15-cap-000'), '最旧条目被掐')
  assert(entries.some((e) => e.change === '2026-09-15-cap-204'), '最新条目保留')
}

// ─────────────────────────────────────────
// 4. 坏 JSON 空数组起 / 5. 空 counts 跳过写
// ─────────────────────────────────────────
console.log('\n--- 4/5. 坏文件容忍 + 空 counts 跳过 ---')
{
  const rtMissing = makeRt()
  assert(readFrictionLedger(rtMissing).length === 0, '文件缺失 → 空数组')
  assert(readFrictionLedger(join(tmpRoot, 'no-such-rt')).length === 0, 'runtimeRoot 不存在 → 空数组不抛')

  const rtBad = makeRt()
  writeLedger(rtBad, '{"broken": [')
  assert(readFrictionLedger(rtBad).length === 0, '坏 JSON → 空数组起（容忍立场）')
  const rb = mergeFrictionEntrySync(rtBad, { change: 'c-after-corrupt', counts: { gate_rollback: 1 } })
  assert(rb.ok === true, '坏台账上 merge 不抛（从空数组重计）')
  assert(readLedger(rtBad).length === 1, '坏文件被新台账覆盖（重启累计）')

  writeLedger(rtBad, '{"not":"an array"}')
  assert(readFrictionLedger(rtBad).length === 0, '非数组 JSON → 空数组')

  const rtSkip = makeRt()
  let rs = mergeFrictionEntrySync(rtSkip, { change: 'c-clean', counts: {} })
  assert(rs.ok === true && rs.skipped === true, '空 counts 返回 skipped（干净收尾）')
  assert(!existsSync(ledgerPath(rtSkip)), '空 counts 不落空文件')
  rs = mergeFrictionEntrySync(rtSkip, { change: 'c-clean', counts: { gate_rollback: 0, verify_run_failed: 0 } })
  assert(rs.skipped === true && !existsSync(ledgerPath(rtSkip)), '全零 counts 同样跳过')
  mergeFrictionEntrySync(rtSkip, { change: 'c-real', counts: { gate_rollback: 1 } })
  const before = readFileSync(ledgerPath(rtSkip), 'utf8')
  mergeFrictionEntrySync(rtSkip, { change: 'c-clean2', counts: {} })
  assert(readFileSync(ledgerPath(rtSkip), 'utf8') === before, '空 counts 不动既有台账')
  const rv = mergeFrictionEntrySync(rtSkip, null)
  assert(rv.ok === false, '非法入参 → {ok:false} 不抛')
}

// ─────────────────────────────────────────
// 6. fail-soft：不可写 runtimeRoot 不抛
// ─────────────────────────────────────────
console.log('\n--- 6. fail-soft（写失败不抛、返回 ok:false） ---')
{
  const blocker = join(tmpRoot, `blocker-${++seq}.txt`)
  writeFileSync(blocker, 'x') // 普通文件占位：其下路径 mkdir 必炸（跨平台 ENOTDIR）
  const badRt = join(blocker, 'rt')
  let r1 = null
  try { r1 = mergeFrictionEntrySync(badRt, { change: 'c', counts: { gate_rollback: 1 } }) } catch (e) { r1 = { threw: true, e } }
  assert(r1 && r1.ok === false && !r1.threw, 'sync 版写失败返回 {ok:false} 不抛')
  let r2 = null
  try { r2 = await mergeFrictionEntry(badRt, { change: 'c', counts: { gate_rollback: 1 } }) } catch (e) { r2 = { threw: true, e } }
  assert(r2 && r2.ok === false && !r2.threw, 'async 锁版写失败返回 {ok:false} 不抛')
  const r3 = await mergeFrictionEntry(null, { change: 'c', counts: { gate_rollback: 1 } })
  assert(r3.ok === false, 'runtimeRoot 空 → {ok:false}')
}

// ─────────────────────────────────────────
// 7. prune 兜底（complete-handlers.js）
// ─────────────────────────────────────────
console.log('\n--- 7. prune 兜底：残余 merge + archivedAt + ledgerAppend ---')
{
  // 7a. 主账已有条目（verify consume 滚过）+ 归档残余 → 累加 + archivedAt 落定
  const rt = makeRt()
  const change = '2026-09-15-prune-merge'
  mergeFrictionEntrySync(rt, { change, counts: { gate_rollback: 2 } })
  writeTally(rt, change, { verify_run_failed: { count: 1, lastAt: '2026-09-15T09:00:00.000Z' } })
  const r = pruneArchivedChangeRuntime(rt, change)
  assert(r.ok === true && typeof r.removed === 'number', '{ok, removed} 既有契约不变（additive）')
  assert(r.ledgerAppend === true, '残余非零 → ledgerAppend:true')
  assert(!existsSync(join(rt, `friction-tally-${change}.json`)), '残余 tally 仍被删（归档回收语义不变）')
  const entries = readLedger(rt)
  assert(entries.length === 1 && entries[0].change === change, 'prune merge 落同 change 条目（非双计）')
  assert(entries[0].counts.gate_rollback === 2 && entries[0].counts.verify_run_failed === 1, '主账 2 + 残余 1 累加正确')
  assert(typeof entries[0].archivedAt === 'string' && entries[0].archivedAt, 'archivedAt 在 prune 侧落定')

  // 7b. 零残余 / 无 tally → 不入账
  const rt2 = makeRt()
  writeTally(rt2, '2026-09-15-zero-residual', {})
  const r2 = pruneArchivedChangeRuntime(rt2, '2026-09-15-zero-residual')
  assert(r2.ledgerAppend === false, '零残余 tally → ledgerAppend:false')
  assert(!existsSync(ledgerPath(rt2)), '零残余不落台账文件（total=0 不入台账）')
  const r3 = pruneArchivedChangeRuntime(rt2, '2026-09-15-no-tally-at-all')
  assert(r3.ok === true && r3.ledgerAppend === false, '无 tally 文件 → 不入账（consume 已清零的常态路径）')

  // 7c. 坏 JSON 残余 → 跳过入账，归档照常
  const rt3 = makeRt()
  writeFileSync(join(rt3, 'friction-tally-2026-09-15-corrupt-residual.json'), '{broken')
  const r4 = pruneArchivedChangeRuntime(rt3, '2026-09-15-corrupt-residual')
  assert(r4.ok === true && r4.ledgerAppend === false, '坏 JSON 残余 → 跳过入账不抛')
  assert(!existsSync(join(rt3, 'friction-tally-2026-09-15-corrupt-residual.json')), '坏残余 tally 仍被删')

  // 7d. 台账写失败 fail-soft：台账路径被目录占位（rename 必炸），归档回收照常
  const rt4 = makeRt()
  mkdirSync(join(rt4, 'friction-ledger.json')) // 目录占位：writeAtomicSync rename 到目录失败
  writeTally(rt4, 'c-failsoft', { gate_rollback: { count: 1, lastAt: '2026-09-15T09:00:00.000Z' } })
  let r5 = null
  try { r5 = pruneArchivedChangeRuntime(rt4, 'c-failsoft') } catch (e) { r5 = { threw: true, e } }
  assert(r5 && !r5.threw && r5.ok === true, '台账写失败绝不阻断归档回收（红线：不抛、ok 不变）')
  assert(r5.ledgerAppend === false, '台账写失败 → ledgerAppend:false')
  assert(!existsSync(join(rt4, 'friction-tally-c-failsoft.json')), '台账写失败时 tally 回收照常')
}

// ─────────────────────────────────────────
// 8. doctor self_maintenance_tax 维度
// ─────────────────────────────────────────
console.log('\n--- 8. doctor 税面维度四态 ---')
{
  const mk = () => {
    const cwd = join(tmpRoot, `doc-${++seq}`)
    const specBase = join(cwd, '.sillyspec')
    const rt = join(specBase, '.runtime')
    mkdirSync(rt, { recursive: true })
    return { cwd, specBase, rt }
  }

  // 8a. 无台账 + 无活跃 tally → 「无台账数据」pass 不告警
  const a = mk()
  const da = detectSelfMaintenanceTax(a.cwd, a.specBase)
  assert(da.name === 'self_maintenance_tax', '维度名 self_maintenance_tax')
  assert(da.pass === true && da.severity === 'passed', '无台账 → pass:true 不告警')
  assert(da.findings.some((f) => f.includes('无台账数据')), '渲染「无台账数据（首次归档后生成）」')

  // 8b. 活跃非零 tally 列示 + 台账聚合 <3 → 纯信息 pass（archivedAt 用相对时间，防窗口漂移）
  const b = mk()
  const daysAgo = (d) => new Date(Date.now() - d * 24 * 60 * 60 * 1000).toISOString()
  writeTally(b.rt, '2026-09-15-active-change', {
    gate_rollback: { count: 1, lastAt: '2026-09-14T08:00:00.000Z' },
    verify_run_failed: { count: 1, lastAt: '2026-09-15T09:30:00.000Z' },
  })
  writeTally(b.rt, '2026-09-15-zero-tally', { gate_rollback: { count: 0, lastAt: '2026-09-15T09:00:00.000Z' } })
  writeLedger(b.rt, [
    { change: '2026-09-10-archived-a', archivedAt: daysAgo(5), counts: { gate_rollback: 1, verify_run_failed: 0, review_rejected: 0 }, total: 1 },
    { change: '2026-08-01-archived-old', archivedAt: daysAgo(44), counts: { gate_rollback: 2, verify_run_failed: 0, review_rejected: 0 }, total: 2 },
  ])
  const db = detectSelfMaintenanceTax(b.cwd, b.specBase)
  assert(db.pass === true && db.severity === 'passed', '活跃列示+聚合 detail 纯信息（不拉低状态，X-07）')
  assert(db.findings.some((f) => f.includes('活跃摩擦：2026-09-15-active-change') && f.includes('gate 回滚 1') && f.includes('验证失败 1') && f.includes('2026-09-15T09:30:00.000Z')), '活跃非零 tally 列示（变更名+计数+lastAt）')
  assert(!db.findings.some((f) => f.includes('2026-09-15-zero-tally')), '全零 tally 不列示')
  assert(db.findings.some((f) => f.includes('近 90 天税重 top2') && f.includes('2026-08-01-archived-old(2)') && f.includes('2026-09-10-archived-a(1)')), '近 90 天 top5 按 total 排序（90 天内条目入窗）')
  assert(db.findings.some((f) => f.includes('台账累计：2 个变更 / 总摩擦 3 次')), '累计总量聚合')

  // 8c. 90 天窗口外剔除
  const c = mk()
  const oldDate = new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString()
  writeLedger(c.rt, [
    { change: '2026-05-outside-window', archivedAt: oldDate, counts: { gate_rollback: 2, verify_run_failed: 0, review_rejected: 0 }, total: 2 },
  ])
  const dc = detectSelfMaintenanceTax(c.cwd, c.specBase)
  assert(dc.findings.some((f) => f.includes('近 90 天无台账条目')), '超 90 天条目不入窗')
  assert(dc.findings.some((f) => f.includes('台账累计：1 个变更')), '窗口外条目仍计入累计总量')

  // 8d. 单变更 total≥3 → WARNING 刻意拉状态（detail 注明评估简化/退役）
  const d = mk()
  writeLedger(d.rt, [
    { change: '2026-09-15-heavy-tax', archivedAt: new Date().toISOString(), counts: { gate_rollback: 2, verify_run_failed: 1, review_rejected: 0 }, total: 3 },
    { change: '2026-09-15-light-tax', archivedAt: new Date().toISOString(), counts: { gate_rollback: 1, verify_run_failed: 0, review_rejected: 0 }, total: 1 },
  ])
  const dd = detectSelfMaintenanceTax(d.cwd, d.specBase)
  assert(dd.pass === false && dd.severity === 'warning', '单变更 total≥3 → pass:false + WARNING（拉状态）')
  assert(dd.findings[0].includes('2026-09-15-heavy-tax') && dd.findings[0].includes('税重') && dd.findings[0].includes('简化/退役'), '税重 detail 注明「评估机制群简化/退役」')
  assert(!dd.findings.some((f) => f.includes('简化/退役') && f.includes('light-tax')), 'total<3 不误报（聚合 top 行非告警）')

  // 8e. 活跃 tally 单变更 ≥3 同样记 WARNING（当前进行时的税重）
  const e = mk()
  writeTally(e.rt, '2026-09-15-active-heavy', { review_rejected: { count: 4, lastAt: '2026-09-15T09:00:00.000Z' } })
  const de = detectSelfMaintenanceTax(e.cwd, e.specBase)
  assert(de.pass === false && de.severity === 'warning', '活跃 tally 累计 ≥3 → WARNING')
  assert(de.findings.some((f) => f.includes('2026-09-15-active-heavy') && f.includes('税重')), '活跃税重点名变更')

  // 8f. 坏台账文件 → 按无台账渲染不告警（readFrictionLedger 容忍）
  const f = mk()
  writeLedger(f.rt, '{broken')
  const df = detectSelfMaintenanceTax(f.cwd, f.specBase)
  assert(df.pass === true, '坏台账文件 → 按无台账渲染不告警')
}

try { rmSync(tmpRoot, { recursive: true, force: true }) } catch { /* OS 清 */ }

if (failures > 0) {
  console.error(`\n[tax-governance-ledger] ❌ ${failures} 项失败`)
  process.exit(1)
}
console.log('\n[tax-governance-ledger] ✅ 全部通过')
