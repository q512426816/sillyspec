/**
 * 终态强校验同步（triggerSyncTerminalStrict）+ syncSpecTree ok 契约单测。
 *
 * 坑档案：docs/sillyspec/archive-half-state-location-stuck-active.md（multi-agent-platform 仓）
 * —— 归档半态（本地 archived、平台 location=active）在平台慢窗口内结构必然可出现，
 * 且重试链挂在「下一条命令」这个可能永不到来的事件上。本组用例钉三件事：
 *   1. syncSpecTree 返回契约：ok:true（合法本地态）/ ok:false（通道失败）显式可判；
 *   2. 强校验状态机：非终态委托 / 未连接静默 / 终态 treeOk 判定 / 冲突让位 / 超时熔断；
 *   3. 失败显性化：🚨 告警 + 自救命令 + exitCode=1（终态网络失败必须可见先例）。
 */
import { test, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

import { syncSpecTree } from '../src/spec-sync.js'
import { triggerSyncTerminalStrict } from '../src/run/shared.js'

let cwd
let savedEnv
let savedExitCode
const errCapture = []

beforeEach(() => {
  cwd = mkdtempSync(join(tmpdir(), 'sillyspec-term-sync-'))
  mkdirSync(join(cwd, '.sillyspec'), { recursive: true })
  savedEnv = { ...process.env }
  delete process.env.SILLYHUB_PLATFORM_URL
  delete process.env.SILLYHUB_PLATFORM_TOKEN
  delete process.env.SILLYSPEC_SYNC_BG
  savedExitCode = process.exitCode
  process.exitCode = undefined
  errCapture.length = 0
  console.error = ((...args) => { errCapture.push(args.join(' ')) })
})

afterEach(() => {
  console.error = (() => {})
  process.exitCode = savedExitCode
  process.env = savedEnv
  try { rmSync(cwd, { recursive: true, force: true }) } catch { /* 临时目录清理失败不影响断言 */ }
})

// ── syncSpecTree ok 契约 ────────────────────────────────────────────────────

test('syncSpecTree 未连接平台 → ok:true（本地合法状态，非通道失败）', async () => {
  const r = await syncSpecTree(cwd, null, 'c1')
  assert.equal(r.ok, true)
  assert.equal(r.synced, 0)
})

test('syncSpecTree 平台不可达（清单拉取异常）→ ok:false（fail-closed 可判失败）', async () => {
  // 端口 9（discard）无服务：fetch 立即失败走清单异常分支
  const r = await syncSpecTree(cwd, { url: 'http://127.0.0.1:9', token: 'x' }, 'c1')
  assert.equal(r.ok, false)
})

// ── triggerSyncTerminalStrict 状态机 ────────────────────────────────────────

test('非终态（status=active）→ 委托既有 triggerSync 语义，不调强校验同步', async () => {
  // 连接态：非终态委托发生在连接检查之后的终态判定分支（未连接时更早静默跳过，语义等价）
  process.env.SILLYHUB_PLATFORM_URL = 'http://127.0.0.1:9'
  process.env.SILLYHUB_PLATFORM_TOKEN = 't'
  // 评审 P3：非终态委托路径在连接态会真实 spawn detached bg 子进程（进程/日志副作用）——
  // SILLYSPEC_SYNC_BG=0 逃生阀回退 inline，本用例只验证「委托不调 syncImpl」，inline 足够
  process.env.SILLYSPEC_SYNC_BG = '0'
  let syncCalled = 0
  const r = await triggerSyncTerminalStrict(cwd, 'c1', {}, {
    changeStatus: 'active',
    syncImpl: async () => { syncCalled++; return { synced: 1, treeOk: true } },
  })
  assert.equal(r.delegated, true)
  assert.equal(syncCalled, 0)
  assert.equal(process.exitCode, undefined)
})

test('未连接平台 → 静默跳过（不触发同步、不告警、不动退出码）', async () => {
  const r = await triggerSyncTerminalStrict(cwd, 'c1', {}, {
    changeStatus: 'archived',
    syncImpl: async () => { throw new Error('不应被调用') },
  })
  assert.equal(r.skipped, 'not-connected')
  assert.equal(errCapture.length, 0)
  assert.equal(process.exitCode, undefined)
})

test('终态 + treeOk:true → confirmed，退出码不动', async () => {
  // 连接态：env 两键（readPlatformConfig env 通道）
  process.env.SILLYHUB_PLATFORM_URL = 'http://127.0.0.1:9'
  process.env.SILLYHUB_PLATFORM_TOKEN = 't'
  const r = await triggerSyncTerminalStrict(cwd, 'c1', {}, {
    changeStatus: 'archived',
    syncImpl: async () => ({ synced: 1, treeOk: true }),
  })
  assert.equal(r.confirmed, true)
  assert.equal(process.exitCode, undefined)
})

test('终态 + 无 treeOk（未确认）→ 🚨 告警 + 自救命令 + exitCode=1', async () => {
  process.env.SILLYHUB_PLATFORM_URL = 'http://127.0.0.1:9'
  process.env.SILLYHUB_PLATFORM_TOKEN = 't'
  const r = await triggerSyncTerminalStrict(cwd, 'c1', {}, {
    changeStatus: 'archived',
    syncImpl: async () => ({ synced: 0, errors: ['同步请求失败 HTTP 504'] }),
  })
  assert.equal(r.confirmed, false)
  const out = errCapture.join('\n')
  assert.ok(out.includes('平台文件树推送未确认'), out)
  assert.ok(out.includes('sillyspec platform sync --change c1'), out)
  assert.equal(process.exitCode, 1)
})

test('终态 + 未决冲突 → 让位（conflict 自带 resolve 处置横幅，不重复告警不动退出码）', async () => {
  process.env.SILLYHUB_PLATFORM_URL = 'http://127.0.0.1:9'
  process.env.SILLYHUB_PLATFORM_TOKEN = 't'
  const r = await triggerSyncTerminalStrict(cwd, 'c1', {}, {
    changeStatus: 'deleted',
    syncImpl: async () => ({ synced: 0, conflict: true, errors: ['conflict pending: c1'] }),
  })
  assert.equal(r.skipped, 'conflict')
  assert.equal(errCapture.length, 0)
  assert.equal(process.exitCode, undefined)
})

test('终态 + 同步预算熔断（syncImpl 挂起超短窗）→ 按未确认处置（告警 + exit 1）', async () => {
  process.env.SILLYHUB_PLATFORM_URL = 'http://127.0.0.1:9'
  process.env.SILLYHUB_PLATFORM_TOKEN = 't'
  const r = await triggerSyncTerminalStrict(cwd, 'c1', {}, {
    changeStatus: 'archived',
    timeoutMs: 50,
    syncImpl: () => new Promise(() => {}), // 永不 resolve
  })
  assert.equal(r.confirmed, false)
  const out = errCapture.join('\n')
  assert.ok(out.includes('平台文件树推送未确认'), out)
  assert.equal(process.exitCode, 1)
})

test('quick 会话 SID → 委托既有 triggerSync（无归档/删除终态）', async () => {
  const r = await triggerSyncTerminalStrict(cwd, 'quick-abcd1234', {}, {
    changeStatus: 'archived',
    syncImpl: async () => { throw new Error('不应被调用') },
  })
  assert.equal(r.delegated, true)
  assert.equal(process.exitCode, undefined)
})
