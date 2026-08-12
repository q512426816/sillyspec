// checkApproval 返回值分支：未连接平台=pending 静默 / 请求失败=unknown（非 pending）/ 正常 verdict。
// 治「请求失败 404/断网 误报审批中」——status=unknown 在 command.js 单独 warn，不套 pending 语义。
// fail-open 本地优先语义不变（未连接平台仍 pending 静默），只把「请求失败」从 pending 拆出诚实化。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { SyncManager } from '../src/sync.js'

let failures = 0
const tmpRoots = []

function makeFixture({ platform = null } = {}) {
  const cwd = mkdtempSync(join(tmpdir(), 'check-approval-'))
  tmpRoots.push(cwd)
  mkdirSync(join(cwd, '.sillyspec'), { recursive: true })
  if (platform) {
    // 写 local.yaml platform 段，让 _getPlatform 返回非 null（已连接平台）
    writeFileSync(join(cwd, '.sillyspec', 'local.yaml'),
      `platform:\n  url: ${platform.url}\n  token: ${platform.token}\n`)
  }
  return cwd
}

function mockFetch(impl) {
  const saved = globalThis.fetch
  globalThis.fetch = impl
  return () => { globalThis.fetch = saved }
}

test('1. 未连接平台 → status=pending（合法本地，静默放行语义不变）', async () => {
  const cwd = makeFixture() // 无 platform 段 → _getPlatform 返回 null
  const sm = new SyncManager(cwd)
  const r = await sm.checkApproval('change-x')
  assert.equal(r.status, 'pending')
  assert.match(r.reason || '', /未连接平台/)
})

test('2. 已连接平台 + fetch 返回 null（404/断网/超时/非JSON）→ status=unknown（非 pending）', async () => {
  const cwd = makeFixture({ platform: { url: 'http://hub.example.com', token: 'tok-1' } })
  const restore = mockFetch(async () => ({ ok: false, status: 404, headers: new Map(), text: async () => 'not found' }))
  try {
    const sm = new SyncManager(cwd)
    const r = await sm.checkApproval('change-x')
    assert.equal(r.status, 'unknown', '请求失败必须返回 unknown，不能套 pending 误报审批中')
    assert.match(r.reason || '', /请求失败/, 'reason 标注请求失败性质')
  } finally { restore() }
})

test('3. 已连接平台 + fetch 抛错（网络层断开）→ status=unknown', async () => {
  const cwd = makeFixture({ platform: { url: 'http://hub.example.com', token: 'tok-1' } })
  const restore = mockFetch(async () => { throw new Error('ENOTFOUND') })
  try {
    const sm = new SyncManager(cwd)
    const r = await sm.checkApproval('change-x')
    assert.equal(r.status, 'unknown', 'fetch 抛错同样返回 unknown')
  } finally { restore() }
})

test('4. 已连接平台 + 正常 verdict（approved/rejected）→ 透传，不受 unknown 影响', async () => {
  const cwd = makeFixture({ platform: { url: 'http://hub.example.com', token: 'tok-1' } })
  const restore = mockFetch(async () => ({
    ok: true,
    status: 200,
    headers: new Map([['content-type', 'application/json']]),
    json: async () => ({ status: 'approved' })
  }))
  try {
    const sm = new SyncManager(cwd)
    const r = await sm.checkApproval('change-x')
    assert.equal(r.status, 'approved')
  } finally { restore() }
})

test('5. 未指定 changeName → status=pending（参数校验，与请求失败 unknown 区分）', async () => {
  const cwd = makeFixture({ platform: { url: 'http://hub.example.com', token: 'tok-1' } })
  const sm = new SyncManager(cwd)
  const r = await sm.checkApproval('')
  assert.equal(r.status, 'pending')
  assert.match(r.reason || '', /未指定变更名称/)
})

test.after(() => {
  for (const cwd of tmpRoots) { try { rmSync(cwd, { recursive: true, force: true }) } catch {} }
})
