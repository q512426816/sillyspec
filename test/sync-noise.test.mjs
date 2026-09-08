// 平台未就绪噪音闸行为锁定（2026-09-08 用户反馈③）：
//   1. sync-noise.js：连接类失败首报可见 + 跨进程静默窗口 + 成功清闸打恢复行 + debug 全可见
//   2. spec-sync.js isFollowerSetChanged：follower/stale 集合「首次/变化才报」，同集合不重报
//
// 隔离：marker 落 tmpdir 临时目录；console.warn/log 临时拦截后恢复。
import { mkdtempSync, rmSync, existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { bindSyncNoiseRoot, syncConnectionWarn, noteSyncSuccess, isConnectionClassStatus, _resetSyncNoiseForTest } from '../src/sync-noise.js'
import { isFollowerSetChanged } from '../src/spec-sync.js'

let failures = 0
const assert = (cond, msg) => {
  if (cond) console.log('  ✅ ' + msg)
  else { console.error('  ❌ ' + msg); failures++ }
}

// console 拦截：收集 warn/log 行，测完恢复
function capture() {
  const warns = [], logs = []
  const ow = console.warn, ol = console.log
  console.warn = (m) => warns.push(String(m))
  console.log = (m) => logs.push(String(m))
  return {
    warns, logs,
    restore() { console.warn = ow; console.log = ol },
  }
}

// 模拟「下一条 CLI 命令」（新进程）：保 marker 文件，清进程内状态
function simulateNextProcess(rt) {
  _resetSyncNoiseForTest()
  bindSyncNoiseRoot(rt)
}

const tmpRoot = mkdtempSync(join(tmpdir(), `sillyspec-sync-noise-${process.pid}-`))

console.log('\n[sync-noise] 平台连接类失败噪音闸')

try {
  // ─────────────────────────────────────────
  console.log('\n--- 1. 首报进程完整展示 + 后续进程静默 + 状态码分类 ---')
  {
    const rt = join(tmpRoot, 'a', '.runtime')
    bindSyncNoiseRoot(rt)
    assert(isConnectionClassStatus(404) && isConnectionClassStatus(500) && isConnectionClassStatus(503), '404/5xx 属连接类')
    assert(!isConnectionClassStatus(409) && !isConnectionClassStatus(401) && !isConnectionClassStatus(403), '409/401/403 业务态不属连接类（每轮该看见）')

    let cap = capture()
    const shown1 = syncConnectionWarn('[sync] POST http://x/api/y → 404 not found')
    cap.restore()
    assert(shown1 === true && cap.warns.length === 1, '首次失败照常 warn（用户应知）')
    assert(existsSync(join(rt, 'sync-noise-mute.json')), 'marker 已落盘（跨进程窗口）')

    // 首报进程（开窗者）内：不同失败行照打（platform-sync-failure-visibility 契约：同轮
    // 清单 500 + POST 500 都要可见）；逐字重复静默
    cap = capture()
    const shownDiff = syncConnectionWarn('[spec-sync] 同步请求失败 HTTP 500（文件树本次未同步）: c1')
    const shownDup = syncConnectionWarn('[sync] POST http://x/api/y → 404 not found')
    cap.restore()
    assert(shownDiff === true && cap.warns.length === 1, '开窗进程内不同失败行照打（诊断完整性）')
    assert(shownDup === false, '开窗进程内逐字重复静默')

    // 后续进程（每步下一条命令）：窗口内同类失败全部静默
    simulateNextProcess(rt)
    cap = capture()
    const shown2 = syncConnectionWarn('[sync] POST http://x/api/y → 404 not found')
    const shown3 = syncConnectionWarn('[sync] GET http://x/api/z 请求失败: ECONNREFUSED')
    cap.restore()
    assert(shown2 === false && shown3 === false && cap.warns.length === 0, '后续进程窗口内失败全部静默')
  }

  // ─────────────────────────────────────────
  console.log('\n--- 2. 成功清闸 + 恢复行 + 之后成功不打扰 ---')
  {
    const rt = join(tmpRoot, 'b', '.runtime')
    bindSyncNoiseRoot(rt)
    let cap = capture()
    syncConnectionWarn('[sync] POST → 404')
    cap.restore()

    cap = capture()
    noteSyncSuccess()
    cap.restore()
    assert(!existsSync(join(rt, 'sync-noise-mute.json')), '成功清除 marker')
    assert(cap.logs.some(l => l.includes('平台连接已恢复')), '闸内恢复打一行恢复提示')

    cap = capture()
    noteSyncSuccess()
    cap.restore()
    assert(cap.logs.length === 0 && cap.warns.length === 0, '此后成功/无闸态静默（成功不打扰）')

    // 恢复后再失败：重新可见（新故障轮）
    cap = capture()
    const shown = syncConnectionWarn('[sync] POST → 500')
    cap.restore()
    assert(shown === true && cap.warns.length === 1, '恢复后再失败重新首报')
  }

  // ─────────────────────────────────────────
  console.log('\n--- 3. 未绑定目录 + debug env 直通 ---')
  {
    _resetSyncNoiseForTest()
    let cap = capture()
    const shown = syncConnectionWarn('[sync] POST → 404')
    cap.restore()
    assert(shown === true, '未绑定 runtime 目录时闸门直通（宁多一行不丢信号）')

    const rt = join(tmpRoot, 'c', '.runtime')
    bindSyncNoiseRoot(rt)
    const cap2 = capture()
    const prev = process.env.SILLYSPEC_DEBUG_SYNC
    process.env.SILLYSPEC_DEBUG_SYNC = '1'
    syncConnectionWarn('[sync] POST → 404')
    process.env.SILLYSPEC_DEBUG_SYNC = '1'
    syncConnectionWarn('[sync] POST → 404')
    if (prev === undefined) delete process.env.SILLYSPEC_DEBUG_SYNC; else process.env.SILLYSPEC_DEBUG_SYNC = prev
    cap2.restore()
    assert(cap2.warns.length === 2, 'SILLYSPEC_DEBUG_SYNC=1 全程不静默（排障可见）')
  }

  // ─────────────────────────────────────────
  console.log('\n--- 4. isFollowerSetChanged：同集合不重报，变化/清空后再现才报 ---')
  {
    const specRoot = join(tmpRoot, 'd', '.sillyspec')
    mkdirSync(specRoot, { recursive: true })
    const set = ['changes/x/design.md', 'changes/x/plan.md', 'changes/y/tasks.md']

    let cap = capture()
    assert(isFollowerSetChanged(specRoot, 'follow', set) === true, '首次集合 → 报')
    cap.restore()
    assert(isFollowerSetChanged(specRoot, 'follow', [...set].reverse()) === false, '同集合乱序输入 → 不重报（排序比对）')

    const grown = [...set, 'changes/z/proposal.md']
    assert(isFollowerSetChanged(specRoot, 'follow', grown) === true, '集合变化（新增漂移）→ 报')

    // 清空 → marker 清 key；同集合再现算变化重新报（本地重新落后场景）
    assert(isFollowerSetChanged(specRoot, 'follow', []) === false, '空集合不报')
    assert(isFollowerSetChanged(specRoot, 'follow', set) === true, '清空后再现同集合 → 重新报')

    // stale 与 follow 分 key 互不干扰
    assert(isFollowerSetChanged(specRoot, 'stale', set) === true, 'stale 独立首报（不受 follow key 影响）')

    // marker 损坏 → 退化为首报（fail-open 到「报」侧，不吞信号）
    writeFileSync(join(specRoot, '.runtime', 'spec-sync-follow-reported.json'), '{broken', 'utf8')
    assert(isFollowerSetChanged(specRoot, 'follow', set) === true, 'marker 损坏时按首报处理')
  }
} finally {
  _resetSyncNoiseForTest()
  try { rmSync(tmpRoot, { recursive: true, force: true }) } catch { /* temp 由 OS 清理 */ }
}

if (failures > 0) {
  console.error(`\n[sync-noise] ❌ ${failures} 项失败`)
  process.exit(1)
}
console.log('\n[sync-noise] ✅ 全部通过')
