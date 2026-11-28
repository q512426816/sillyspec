/**
 * spec 文档写入层乐观锁（2026-11-28-file-write-optimistic-lock）。
 *
 * 问题：repo-native 下 daemon 与 CLI 共用同一物理 spec 树，多 agent 会话各自按
 * 上下文旧快照整文件 Write，互不感知（Claude 内置 stale-read 校验只覆盖 Edit，
 * 不覆盖 Write 全文件覆盖；Codex 等引擎无此校验）。
 *
 * 方案：读取时记录内容 sha256 基线 → 写前比对当前盘面。不一致 = 文件在「读→写」
 * 窗口内被他人改写 → 阻止并提示重读（供应方 hook 消费）。
 *
 * 口径（用户裁决，2026-11-28）：
 *   - 只监控 specRoot 前缀（缺省 `.sillyspec/`，local.yaml `file_guard.paths` 可配）；
 *   - 无基线（新文件/未读）→ 放行，禁止把「未读过」当冲突；
 *   - 基线缺失/损坏 → 放行（fail-open）；
 *   - 基线按 session 隔离（hook 每次独立进程，跨调用靠状态小文件）；
 *   - 24h 过期清理，防状态文件无限增长。
 */

import { createHash } from 'crypto'
import { existsSync, mkdirSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from 'fs'
import { isAbsolute, join, relative, resolve } from 'path'

/**
 * 缺省监控前缀（**相对 specRoot**，空串 = 整个 spec 树；`.runtime/` 恒排除）。
 * 用户可在 local.yaml `file_guard.paths` 收窄（如 `changes/`），前缀同样相对 specRoot。
 */
export const DEFAULT_MONITOR_PREFIXES = ['']
/** 基线条目过期时长（毫秒）：超期条目在下次读写时清理。 */
export const BASELINE_TTL_MS = 24 * 60 * 60 * 1000
/** `.runtime/` 下路径永不记录（运行时产物高频变化，且上传面已排除）。 */
const ALWAYS_EXCLUDED_PREFIX = '.runtime/'

function toPosix(p) {
  return String(p).replace(/\\/g, '/')
}

/** 会话 id → 安全文件名片段（Claude 注入的 session_id 含连字符/下划线即可，其余替换）。 */
export function safeSessionId(sessionId) {
  const s = String(sessionId || '').trim()
  return (s || 'unknown').replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 80)
}

/** 会话基线文件绝对路径（`.runtime/state/file-read-baseline-<sid>.json`）。 */
export function baselinePath(specRoot, sessionId) {
  return join(specRoot, '.runtime', 'state', `file-read-baseline-${safeSessionId(sessionId)}.json`)
}

/** 读会话基线（缺失/损坏 → {}）。 */
export function readBaselines(specRoot, sessionId) {
  try {
    const raw = JSON.parse(readFileSync(baselinePath(specRoot, sessionId), 'utf8'))
    if (raw && typeof raw === 'object' && raw.entries && typeof raw.entries === 'object') {
      return raw.entries
    }
    if (raw && typeof raw === 'object') return raw // 兼容扁平形态
    return {}
  } catch {
    return {}
  }
}

/** 写会话基线（失败静默——乐观锁是增强，不因状态写失败阻断）。 */
function writeBaselines(specRoot, sessionId, entries) {
  try {
    const p = baselinePath(specRoot, sessionId)
    mkdirSync(join(specRoot, '.runtime', 'state'), { recursive: true })
    writeFileSync(p, JSON.stringify({ entries }, null, 0) + '\n', 'utf8')
    return true
  } catch {
    return false
  }
}

/** 丢弃超期条目（返回新对象，不改原引用）。 */
export function pruneStale(entries, now = Date.now(), ttlMs = BASELINE_TTL_MS) {
  const out = {}
  for (const [k, v] of Object.entries(entries || {})) {
    if (v && typeof v === 'object' && typeof v.at === 'number' && now - v.at <= ttlMs) {
      out[k] = v
    }
  }
  return out
}

/**
 * 是否纳入监控：路径在 specRoot 之下、命中任一前缀、且不在 `.runtime/`。
 * 前缀缺省 `['.sillyspec/']` 形如「相对 specRoot 的 POSIX 前缀」；若用户配置
 * 的是仓根相对路径（如 `docs/`），则按其原本语义处理（见 resolveMonitorPrefixes）。
 */
export function isMonitoredPath(specRoot, filePath, prefixes = DEFAULT_MONITOR_PREFIXES) {
  if (!filePath) return false
  const abs = isAbsolute(filePath) ? filePath : resolve(specRoot, filePath)
  const rel = toPosix(relative(specRoot, abs))
  if (!rel || rel.startsWith('..') || isAbsolute(rel)) return false
  if (rel.startsWith(ALWAYS_EXCLUDED_PREFIX)) return false
  return prefixes.some((p) => rel.startsWith(toPosix(p)))
}

/** 读 local.yaml 的 `file_guard.paths`（缺省/解析失败 → 默认前缀）。 */
export function resolveMonitorPrefixes(specRoot) {
  for (const name of ['local.yaml', 'local.yml']) {
    const p = join(specRoot, name)
    if (!existsSync(p)) continue
    try {
      const text = readFileSync(p, 'utf8')
      const lines = text.split(/\r?\n/)
      let inSection = false
      for (const line of lines) {
        if (/^file_guard\s*:/.test(line)) { inSection = true; continue }
        if (inSection && /^\S/.test(line)) { inSection = false; continue } // 顶格新段 → 结束
        if (!inSection) continue
        const m = line.match(/^\s+paths\s*:\s*(.+)$/)
        if (m) {
          const items = String(m[1]).split(',').map((s) => s.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean)
          if (items.length > 0) {
            // 前缀相对 specRoot；去掉误写的 `.sillyspec/` 仓根式前导（用户直觉写法容错）。
            return items.map((s) => s.replace(/^\.sillyspec\//, '')).map((s) => (s === '' || s.endsWith('/') ? s : `${s}/`))
          }
        }
      }
    } catch { /* 解析失败走缺省 */ }
  }
  return DEFAULT_MONITOR_PREFIXES
}

function hashFileContent(absPath) {
  try {
    return createHash('sha256').update(readFileSync(absPath)).digest('hex')
  } catch {
    return null
  }
}

/**
 * 记录一次读取基线（PostToolUse(Read) 消费）。
 * @returns {{ recorded: boolean, reason?: string }}
 */
export function recordRead({ specRoot, sessionId, filePath, now = Date.now(), prefixes } = {}) {
  try {
    const list = prefixes || resolveMonitorPrefixes(specRoot)
    if (!isMonitoredPath(specRoot, filePath, list)) return { recorded: false, reason: 'not-monitored' }
    const abs = isAbsolute(filePath) ? filePath : resolve(specRoot, filePath)
    const hash = hashFileContent(abs)
    if (!hash) return { recorded: false, reason: 'unreadable' }
    const rel = toPosix(relative(specRoot, abs))
    const entries = pruneStale(readBaselines(specRoot, sessionId), now)
    entries[rel] = { hash, at: now }
    return writeBaselines(specRoot, sessionId, entries)
      ? { recorded: true }
      : { recorded: false, reason: 'write-failed' }
  } catch (e) {
    return { recorded: false, reason: `error:${e && e.message}` }
  }
}

/**
 * 写前校验（PreToolUse(Write|Edit|MultiEdit) 消费）。
 *
 * @returns {{ block: boolean, reason?: 'stale-read', path?: string, baselineAt?: number }}
 *   block=true 仅当「路径在监控面 + 有基线 + 当前盘面 hash 与基线不一致」。
 */
export function checkBeforeWrite({ specRoot, sessionId, filePath, prefixes } = {}) {
  try {
    const list = prefixes || resolveMonitorPrefixes(specRoot)
    if (!isMonitoredPath(specRoot, filePath, list)) return { block: false }
    const abs = isAbsolute(filePath) ? filePath : resolve(specRoot, filePath)
    if (!existsSync(abs)) return { block: false } // 新文件：无「旧快照」可覆盖
    const rel = toPosix(relative(specRoot, abs))
    const entries = pruneStale(readBaselines(specRoot, sessionId))
    const base = entries[rel]
    if (!base) return { block: false } // 未读过 → 放行
    const cur = hashFileContent(abs)
    if (!cur) return { block: false }
    if (cur !== base.hash) {
      return { block: true, reason: 'stale-read', path: rel, baselineAt: base.at }
    }
    return { block: false }
  } catch {
    return { block: false } // fail-open
  }
}

/** 清理其他会话的过期基线文件（供 CLI/维护命令调用；本变更不自动挂载）。 */
export function cleanupStaleBaselines(specRoot, now = Date.now()) {
  const removed = []
  try {
    const dir = join(specRoot, '.runtime', 'state')
    if (!existsSync(dir)) return removed
    for (const name of readdirSync(dir)) {
      if (!name.startsWith('file-read-baseline-') || !name.endsWith('.json')) continue
      const p = join(dir, name)
      try {
        const entries = JSON.parse(readFileSync(p, 'utf8')).entries || {}
        if (Object.keys(pruneStale(entries, now)).length === 0) {
          unlinkSync(p)
          removed.push(name)
        }
      } catch { /* 坏文件跳过 */ }
    }
  } catch { /* fail-open */ }
  return removed
}

export default {
  recordRead,
  checkBeforeWrite,
  readBaselines,
  pruneStale,
  isMonitoredPath,
  resolveMonitorPrefixes,
  cleanupStaleBaselines,
  baselinePath,
  safeSessionId,
  DEFAULT_MONITOR_PREFIXES,
  BASELINE_TTL_MS,
}
