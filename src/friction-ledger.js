/**
 * friction-ledger.js — 摩擦幸存台账数据层（2026-09-15-tax-governance 方案 B / FR-02）
 *
 * 定位：摩擦历史此前「归档即失忆」——friction tally 在 verify 收尾被 consumeFrictionHint
 * 删除（计数清零），归档时 prune 只见残余，无任何幸存记录，「哪个变更税重」全凭回忆。
 * 本模块把 consume 到的 counts 按 change 滚动合并进 <runtimeRoot>/friction-ledger.json
 * （JSON 数组，D-001@v2），doctor 的 self_maintenance_tax 维度据此做聚合展示与阈值提示。
 *
 * 两个滚动点（design.md 方案 B，Grill P1-1 修订）：
 *   - 主滚动：complete.js 两处 verify 收尾（consumeFrictionHint 返回 counts 后）走
 *     mergeFrictionEntry（withFileLock + writeAtomicSync 读改写，锁先例 friction-tally.js:180-193）
 *   - 兜底滚动：complete-handlers.js pruneArchivedChangeRuntime 删 tally 前读残余
 *     events[type].count 走 mergeFrictionEntrySync 并落 archivedAt——prune 是同步契约
 *     （既有 {ok, removed} 消费方与测试直调），拿不了 async 锁；无锁读改写的并发丢失
 *     风险按 design R-02 P3 容忍（writeAtomicSync 保证无半截文件，坏文件按空数组起）。
 *
 * merge-by-change（Grill P1-1 核心）：同 change 已有条目按类型累加合并非双计——verify 可
 * --reopen 重跑，二次 consume 的 counts 累进同一条目；archivedAt 仅 prune 侧落定，主滚动
 * 不落、已有值不冲掉。条目结构（design 接口定义）：
 *   { change: string, archivedAt?: string, counts: { gate_rollback, verify_run_failed,
 *     review_rejected }, total: number }
 * 台账 ≤200 条掐头留最新（rollLedger——防病态体量，不承载完整审计）；被 merge 的既有条目
 * 挪到尾部（最近活跃者优先幸存掐头）。
 *
 * 落点红线（同 friction-tally D-002/R-04）：台账只落 .runtime 树内（本模块只接收
 * runtimeRoot，调用方经 run/shared.js resolveRuntimeRoot 同源解析——X-08 平台模式防分裂），
 * **永不落 changes/**。
 *
 * fail-soft 红线（design）：台账是旁路数据，写失败绝不阻断任何收尾/归档——全程 try/catch
 * 返回 { ok:false } 不抛；文件缺失/坏 JSON 按空数组起（全量重启为容忍立场，D-001@v2）。
 * 本模块自身不打印任何输出。
 */
import { readFileSync, mkdirSync } from 'fs'
import { dirname, join } from 'path'
import { writeAtomicSync } from './fs-atomic.js'
import { withFileLock } from './quicklog.js'

/** 摩擦事件三类型（与 friction-tally.js FRICTION_TYPES 同枚举；固定序即 counts 键序） */
const FRICTION_TYPES = ['gate_rollback', 'verify_run_failed', 'review_rejected']

/** 台账条目上限：超出掐头（最旧）留最新 200 条 */
const LEDGER_CAP = 200

/** 台账文件名（runtimeRoot 下单文件，JSON 数组） */
const LEDGER_FILENAME = 'friction-ledger.json'

function ledgerFilePath(runtimeRoot) {
  return join(runtimeRoot, LEDGER_FILENAME)
}

/**
 * 读台账。文件不存在 / 坏 JSON / 非数组 → []（容忍立场：全量重启重新累计，不修复不报错，
 * 同 readFrictionTally）。仅过滤无 change 键的脏条目，其余原样返回（total/counts 由 merge
 * 侧重算，doctor 侧读取时数值兜底）。
 * @param {string} runtimeRoot .runtime 根目录
 * @returns {Array<{change: string, archivedAt?: string, counts: object, total: number}>}
 */
export function readFrictionLedger(runtimeRoot) {
  try {
    const raw = JSON.parse(readFileSync(ledgerFilePath(runtimeRoot), 'utf8'))
    if (!Array.isArray(raw)) return []
    return raw.filter((e) => e && typeof e === 'object' && !Array.isArray(e) && typeof e.change === 'string' && e.change !== '')
  } catch {
    return []
  }
}

/**
 * 掐头留下最新：超过 LEDGER_CAP 条时丢最旧（数组头部），保尾部（最新 append / 最近 merge
 * 挪尾）。纯函数。
 */
export function rollLedger(entries) {
  if (!Array.isArray(entries)) return []
  return entries.length > LEDGER_CAP ? entries.slice(entries.length - LEDGER_CAP) : entries
}

/** counts 入参清洗：只收三枚举类型且为有限正数（consumeFrictionHint 只回非零键，容忍宽松输入） */
function sanitizeDelta(counts) {
  const delta = {}
  if (!counts || typeof counts !== 'object') return delta
  for (const type of FRICTION_TYPES) {
    const n = Number(counts[type])
    if (Number.isFinite(n) && n > 0) delta[type] = n
  }
  return delta
}

/** 条目 counts 三键定形（缺失/脏型按 0），total 重算 */
function shapeEntry(change, counts, archivedAt) {
  const shaped = {
    change,
    counts: {
      gate_rollback: counts.gate_rollback || 0,
      verify_run_failed: counts.verify_run_failed || 0,
      review_rejected: counts.review_rejected || 0,
    },
  }
  shaped.total = shaped.counts.gate_rollback + shaped.counts.verify_run_failed + shaped.counts.review_rejected
  if (archivedAt) shaped.archivedAt = archivedAt
  return shaped
}

/**
 * merge-by-change 纯核心：同 change 已有条目按类型累加（total 重算）非双计，新 change
 * append；archivedAt 有值时落定、无值时保留既有（主滚动不冲掉 prune 已落的归档时间）；
 * 被 merge 的既有条目挪到数组尾部（最近活跃者优先幸存掐头）。返回新数组，不改入参。
 */
function applyMergeEntry(entries, { change, counts, archivedAt }) {
  const delta = sanitizeDelta(counts)
  const idx = entries.findIndex((e) => e.change === change)
  if (idx === -1) return [...entries, shapeEntry(change, delta, archivedAt)]
  const prev = entries[idx]
  const mergedCounts = {}
  for (const type of FRICTION_TYPES) {
    const p = Number(prev.counts && prev.counts[type])
    mergedCounts[type] = (Number.isFinite(p) ? p : 0) + (delta[type] || 0)
  }
  const keepArchivedAt = archivedAt || (typeof prev.archivedAt === 'string' && prev.archivedAt ? prev.archivedAt : null)
  return [...entries.slice(0, idx), ...entries.slice(idx + 1), shapeEntry(change, mergedCounts, keepArchivedAt)]
}

/**
 * 同步滚动一条台账（读 → merge-by-change → 掐头 → writeAtomicSync 落盘），供同步契约调用
 * 方（pruneArchivedChangeRuntime）使用；async 主入口 mergeFrictionEntry 的锁内临界区也是
 * 本函数（单一实现，锁只是外壳）。
 *
 * 空 counts（三键任一都非正）跳过写盘——干净收尾/零残余归档不落空文件（FR-02 验收）。
 * fail-soft：任何异常（只读目录/路径非法/坏 JSON）吞掉返回 { ok:false } 绝不抛。
 * @param {string} runtimeRoot .runtime 根目录
 * @param {{ change: string, counts?: object, archivedAt?: string }} entry
 * @returns {{ ok: boolean, skipped?: boolean, entry?: object }}
 *   成功 { ok:true, skipped:false, entry }；空 delta 跳过 { ok:true, skipped:true }；失败 { ok:false }
 */
export function mergeFrictionEntrySync(runtimeRoot, entry) {
  try {
    if (!runtimeRoot || typeof runtimeRoot !== 'string') return { ok: false, skipped: true }
    const change = entry && typeof entry.change === 'string' ? entry.change : ''
    if (!change) return { ok: false, skipped: true }
    if (Object.keys(sanitizeDelta(entry.counts)).length === 0) return { ok: true, skipped: true }
    const merged = applyMergeEntry(readFrictionLedger(runtimeRoot), {
      change,
      counts: entry.counts,
      archivedAt: typeof entry.archivedAt === 'string' && entry.archivedAt ? entry.archivedAt : null,
    })
    const rolled = rollLedger(merged)
    const path = ledgerFilePath(runtimeRoot)
    mkdirSync(dirname(path), { recursive: true })
    writeAtomicSync(path, JSON.stringify(rolled, null, 2))
    return { ok: true, skipped: false, entry: rolled[rolled.length - 1] }
  } catch {
    return { ok: false }
  }
}

/**
 * 台账滚动主入口（complete.js 两处 verify 收尾 consume 后调用）：withFileLock 串行化
 * 读改写（锁先例 friction-tally.js:180-193——台账会被收尾/归档进程并发读改，无锁交错
 * 丢更新；坏文件/写失败仍按空数组起 / fail-soft）。锁内即 mergeFrictionEntrySync。
 * @param {string} runtimeRoot .runtime 根目录（调用方 resolveRuntimeRoot 同源解析）
 * @param {{ change: string, counts?: object, archivedAt?: string }} entry
 * @returns {Promise<{ ok: boolean, skipped?: boolean, entry?: object }>} 失败 { ok:false } 不抛
 */
export async function mergeFrictionEntry(runtimeRoot, entry) {
  try {
    if (!runtimeRoot || typeof runtimeRoot !== 'string') return { ok: false, skipped: true }
    const path = ledgerFilePath(runtimeRoot)
    return await withFileLock(path + '.lock', () => mergeFrictionEntrySync(runtimeRoot, entry))
  } catch {
    return { ok: false }
  }
}
