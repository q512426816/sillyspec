/**
 * sync-noise.js — 平台连接类失败的跨进程噪音闸（2026-09-08 用户反馈③）。
 *
 * 场景：平台 sillyhub 未就绪（端点 404 / 断连 / 超时）期间，每条 CLI 命令的自动同步
 * （triggerSync → sync() / syncSpecTree）都会打同一批 `[sync] … → 404` / `[spec-sync] …`
 * 失败 warn，淹没真正的门禁输出。CLI 是短命进程，进程内去重无效——必须跨进程落 marker
 * （对齐 run/shared.js 自动 pull 的 AUTO_PULL_THROTTLE_MS marker 先例）。
 *
 * 语义：
 * - 首个失败进程（开窗者）完整展示本轮所有失败行：首行打 warn 并写 mutedUntil 窗口，
 *   同轮**不同**失败行照打（诊断完整性），逐字重复只打一次；
 * - 窗口内**后续进程**的同类失败静默（SILLYSPEC_DEBUG_SYNC=1 时降级为可见输出，排障不瞎）
 *   ——每步 CLI 命令重刷的正是这种；
 * - 窗口过期后下一个失败进程再完整报一轮并重开窗——保活信号约每窗口一轮，不静默死；
 * - 任意一次同步成功清 marker，且此前在闸内时打一行恢复提示；
 * - SILLYSPEC_DEBUG_SYNC=1 全程不静默。
 *
 * 边界：只覆盖「连接类」失败（HTTP 404/5xx、网络错、超时/abort）。409 冲突与其余
 * 4xx 业务态（平台就绪但状态冲突/鉴权问题）不走闸——那些是每轮都该看见的语义信号，
 * 且已有各自的冲突降噪机制（sync-conflict-banner-spam 一族）。用户显式命令
 * （platform connect 的 health ping）不应被静默——调用方传 noMute 绕过本闸。
 */
import { readFileSync, writeFileSync, mkdirSync, unlinkSync } from 'fs'
import { join } from 'path'

const NOISE_MARKER = 'sync-noise-mute.json'
// 静默窗口：10 分钟 ≈ 一个平台重启/发布窗口；期间每步命令的重复失败全部静默。
const MUTE_WINDOW_MS = 10 * 60_000

// 进程内绑定的 marker 目录（.runtime 绝对路径）。CLI 单用途短进程，last-wins 足够；
// 未绑定（库形态调用）时闸门退化为直通——宁可多一行 warn 不可丢信号。
let _runtimeDir = null
// 本进程是否已开窗（打印过失败并写了 marker）。区分「窗口是本进程开的」与「窗口是先前
// 进程留下的」：首报命令（开窗者）内后续**不同**失败行仍应完整可见（诊断信息，用户正
// 在看第一条失败）；只有先前进程留下的窗口才静默本进程——这正是跨步去重的目标形态
// （platform-sync-failure-visibility 契约：同轮清单 500 + POST 500 都要打）。
let _openedByThisProcess = false
// 本进程已打印/已静默过的消息集合：同进程内逐字重复的失败行只打一次。
const _seenInProcess = new Set()

/**
 * 绑定噪音闸 marker 的落盘目录（specRoot 下的 .runtime）。幂等，last-wins。
 * @param {string|null} runtimeDir
 */
export function bindSyncNoiseRoot(runtimeDir) {
  _runtimeDir = runtimeDir || null
}

/**
 * 从 cwd 静默推导 marker 目录（SyncManager 构造器用）：有平台指针 → 指针 specRoot/.runtime；
 * 否则 cwd/.sillyspec/.runtime。**零副作用**——只读指针 JSON，不做存在性/自指/temp 守卫，
 * 也不 resolveSpecDir 上溯：resolvePlatformSpecDir 会打「指针不可用/temp 残留」warn
 * （其职责），卫生 marker 不该引入新的输出副作用（cli-top-level-aliases 字节一致契约）。
 * 坏指针/缺字段落回本地目录——marker 落点只需稳定，不需权威。
 * @param {string} cwd
 */
export function bindSyncNoiseFromCwd(cwd) {
  try {
    const p = join(cwd, '.sillyspec-platform.json')
    if (existsSync(p)) {
      const s = JSON.parse(readFileSync(p, 'utf8'))
      if (s && typeof s.specRoot === 'string' && s.specRoot) {
        _runtimeDir = join(s.specRoot, '.runtime')
        return
      }
    }
  } catch { /* 坏指针：回落本地目录 */ }
  _runtimeDir = join(cwd, '.sillyspec', '.runtime')
}

function _markerPath() {
  return _runtimeDir ? join(_runtimeDir, NOISE_MARKER) : null
}

function _readMute() {
  const p = _markerPath()
  if (!p) return null
  try {
    const s = JSON.parse(readFileSync(p, 'utf8'))
    return typeof s.mutedUntil === 'number' ? s : null
  } catch {
    return null
  }
}

function _writeMute(mutedUntil, lastMsg) {
  const p = _markerPath()
  if (!p) return
  try {
    mkdirSync(_runtimeDir, { recursive: true })
    writeFileSync(p, JSON.stringify({ mutedUntil, lastMsg }) + '\n', 'utf8')
  } catch { /* marker 写失败 = 闸门失效退化为直通，仅损失降噪 */ }
}

/**
 * 连接类失败 warn 的闸门口。判序（platform-sync-failure-visibility 契约）：
 * 1. debug env → 恒打；
 * 2. 本进程内逐字重复 → 静默（重复行无新信息）；
 * 3. 窗口是**本进程**开的（本进程是首报命令）→ 不同失败行照打——首报命令应完整展示
 *    自己轮次内的所有失败细节；
 * 4. 窗口是**先前进程**留的 → 静默（每步命令重刷的正是这种），标记已见；
 * 5. 无窗口（首次/已过期/刚成功清闸）→ 打 + 开窗。
 * @param {string} msg 已拼好的 warn 文案
 * @returns {boolean} true=已输出到 stderr
 */
export function syncConnectionWarn(msg) {
  if (process.env.SILLYSPEC_DEBUG_SYNC) {
    console.warn(msg)
    _seenInProcess.add(msg)
    return true
  }
  if (_seenInProcess.has(msg)) return false
  const now = Date.now()
  const m = _readMute()
  if (m && now < m.mutedUntil) {
    if (_openedByThisProcess) {
      // 首报命令的后续不同失败行：可见（诊断完整性），不重复开窗
      console.warn(msg)
      _seenInProcess.add(msg)
      return true
    }
    _seenInProcess.add(msg)
    return false
  }
  console.warn(msg)
  _seenInProcess.add(msg)
  _writeMute(now + MUTE_WINDOW_MS, msg)
  _openedByThisProcess = true
  return true
}

/**
 * 判定 HTTP 状态码是否属连接类（可静默）：404（端点未部署/未就绪）与 5xx（服务端故障）。
 * 409 与其余 4xx 不在此列（见模块头注释边界）。
 */
export function isConnectionClassStatus(status) {
  return status === 404 || (typeof status === 'number' && status >= 500)
}

/**
 * 任意一次同步成功：清 marker。此前处于闸内（marker 存在）时打一行恢复提示——
 * 平台恢复的第一个信号应该可见，之后的成功照常静默（成功不打扰）。
 */
export function noteSyncSuccess() {
  _openedByThisProcess = false
  _seenInProcess.clear()
  if (!_readMute()) return
  const p = _markerPath()
  if (p) { try { unlinkSync(p) } catch { /* 残留 marker 只多静默一轮失败，无害 */ } }
  console.log('[sync] 平台连接已恢复（此前静默的同步失败已停止）')
}

/** 测试复位：清进程内绑定与开窗状态。 */
export function _resetSyncNoiseForTest() {
  _runtimeDir = null
  _openedByThisProcess = false
  _seenInProcess.clear()
}
