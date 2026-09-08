/**
 * runtime-hygiene.js — .runtime/ 无归属审计类产物的写入侧滚动裁剪（2026-09-08 用户反馈④）。
 *
 * 系统性排查后的分野（与 ql-20260908-005/006 并行会话的定界）：
 * - **变更归属类证据**（execute-runs / stage-reviews / verify-runs）：走归档时按 change
 *   精确回收（complete-handlers.js pruneArchivedChangeRuntime）+ doctor --gc-unstamped-runs
 *   清存量。不在此处滚动裁剪——keep-N 是启发式，他端高频写入会把活跃变更的证据跌出
 *   保留窗，gate（Stage/Task Review Gate）读到的是被裁掉的 review。
 * - **无归属审计类**（本模块管辖）：artifacts/（步骤超长输出存档，实证本仓 534 份）、
 *   workflow-runs/（workflow check 归档，21 份）、doctor-dumps/（孤儿库诊断 dump）。
 *   无生命周期事件可挂（无「归档」时机）、无 change 归属语义，只有时间价值——
 *   写入侧滚动保留最新 N 份是唯一合适量身工具（与 _pruneImportBaks 同族：靠人工
 *   记得跑 GC 等于没有回收）。
 *
 * 契约（与 _pruneImportBaks 对齐的取舍）：
 * - 新旧判据默认取**条目名字典序**：管辖目录的条目名全部内嵌零填充时间戳
 *   （<ts>-<label>.json / dump-<ts>.json），同目录内字典序 == 时间序；不用 mtime——
 *   copy/同步工具会改写。例外：artifacts/ 文件名时间戳在尾部、前缀是变更名，长变更
 *   晚收尾会乱序，按 mtime（write-once 本地审计文件，无 copy 改写 mtime 的暴露面）。
 * - tsRe 选项供前缀不统一的目录提取内嵌时间戳（排序键），提取不到的条目沉底不裁。
 * - 单条删除失败（他进程持句柄/权限）跳过不连坐，下次写入再收。
 * - 整体 fail-open：目录缺失/读取异常返回 0，绝不抛——卫生动作不能阻断主流程。
 * - 幂等：keep 之内不动，重复调用零副作用。
 * - 保留份数可用 SILLYSPEC_RUNTIME_KEEP 覆盖（整数 ≥1，灾难排查期想多留），
 *   非法值回落各调用方默认。
 */
import { readdirSync, statSync, rmSync } from 'fs'
import { join } from 'path'

/**
 * 读环境覆盖的保留份数。
 * @param {number} def 调用方默认值
 * @returns {number}
 */
function _resolveKeep(def) {
  const raw = Number(process.env.SILLYSPEC_RUNTIME_KEEP)
  return Number.isInteger(raw) && raw >= 1 ? raw : def
}

/**
 * 滚动裁剪一个「时间戳命名条目」目录，保留最新 keep 份。
 *
 * @param {object} opts
 * @param {string} opts.dir 目标目录（如 <specBase>/.runtime/artifacts）
 * @param {number} opts.keep 默认保留份数（SILLYSPEC_RUNTIME_KEEP 可覆盖）
 * @param {'name'|'mtime'} [opts.orderBy='name'] 新旧判据；'mtime' 仅供时间戳不前置的
 *   条目（artifacts/：前缀是变更名，变更名自带日期近似但不严格时序）
 * @param {RegExp} [opts.tsRe] 从条目名提取时间戳的正则（捕获排序键）。前缀不统一的
 *   目录必须传，否则纯名字典序会跨前缀乱序误裁；提取不到的条目按名字参与排序
 *   （保守沉底不误删）
 * @returns {number} 实际删除的条目数（目录缺失/异常 = 0，绝不抛）
 */
export function pruneTimestampedEntries({ dir, keep, orderBy = 'name', tsRe = null }) {
  let entries
  try {
    entries = readdirSync(dir, { withFileTypes: true })
  } catch {
    return 0 // 目录不存在（该仓库从未走过此流程）= 无可裁
  }
  const names = entries.map(e => e.name)
  const sortKey = orderBy === 'mtime'
    ? (n) => { try { return statSync(join(dir, n)).mtimeMs } catch { return 0 } }
    : (n) => {
        if (tsRe) {
          const m = n.match(tsRe)
          if (m) return m[0] // 内嵌零填充时间戳（如 20260908035502）
        }
        return `\uffff${n}` // 提取不到 → 沉底（视为最新，不因缺时间戳被裁）
      }
  const sorted = [...names].sort((a, b) => {
    const ka = sortKey(a), kb = sortKey(b)
    return ka < kb ? -1 : ka > kb ? 1 : 0 // 升序：最旧在前
  })
  const k = _resolveKeep(keep)
  const doomed = sorted.slice(0, Math.max(0, sorted.length - k))
  let removed = 0
  for (const n of doomed) {
    try {
      rmSync(join(dir, n), { recursive: true, force: true })
      removed++
    } catch { /* 单条失败跳过：下次写入侧再收 */ }
  }
  return removed
}
