// FR-02（2026-10-16-fix-downstream-tool-defects）：progress 冲突抑制分支不得封锁 spec 树
// 删除 op 上行（spec 树与 progress 六表是独立通道，冲突分流不互相封锁）。
//
// 坑（2026-10-16 下游实证）：sync() 读到未决 sync-conflict-<change>.json 提前 return，
// 挂在其成功路径上的 syncSpecTree（删除 op 唯一上行通道）整轮被跳过——不是失败重试，
// 是根本不发。409 冲突文件长期在场期间，本地删除永远到不了服务器，后续整树快照拉取
// 把服务器留存的旧文件写回本地=复活（FR-01 的上游成因）。
//
// 隔离：cwd 用 os.tmpdir() 临时目录 + mock globalThis.fetch（不发真实网络）。
import { test, after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { tmpdir } from 'os'
import { SyncManager } from '../src/sync.js'

const tmpRoots = []
const CHANGE = '2026-10-16-demo-x'
const DELETED_TASK = `changes/${CHANGE}/tasks/task-06.md`

function makeFixture({ localFiles = [] } = {}) {
  const cwd = mkdtempSync(join(tmpdir(), 'ss-decouple-'))
  tmpRoots.push(cwd)
  const specDir = join(cwd, '.sillyspec')
  mkdirSync(join(specDir, '.runtime'), { recursive: true })
  for (const [rel, content] of localFiles) {
    mkdirSync(dirname(join(specDir, rel)), { recursive: true })
    writeFileSync(join(specDir, rel), content, 'utf8')
  }
  mkdirSync(join(specDir, '.runtime', 'state'), { recursive: true })
  // progress 未决冲突文件（sync() 抑制分支的触发面；不带 platform_last_pushed_at
  // → 跳过过期自清的 DB 读取，直接进抑制分支）
  writeFileSync(
    join(specDir, '.runtime', 'state', `sync-conflict-${CHANGE}.json`),
    JSON.stringify({ change: CHANGE, kind: 'progress', created_at: new Date().toISOString(), note: 'test fixture' }) + '\n',
    'utf8',
  )
  return { cwd, specDir }
}

/** mock 平台：GET spec-manifest 返回仍含被删文件的清单；POST spec-sync 捕获 ops */
function makeMockFetch({ serverManifest, postBodyCapture, mode = 'ok' }) {
  const saved = globalThis.fetch
  globalThis.fetch = async (url, init = {}) => {
    const u = String(url)
    if (u.endsWith('/api/changes/-/spec-manifest')) {
      if (mode === 'manifest-throw') throw new Error('mock network down')
      return new Response(JSON.stringify({ files: serverManifest }), { status: 200, headers: { 'Content-Type': 'application/json' } })
    }
    if (u.endsWith('/api/changes/-/spec-sync')) {
      try { postBodyCapture.push(JSON.parse(init.body)) } catch { /* 忽略畸形 */ }
      return new Response(JSON.stringify({ ok: true, applied: 1 }), { status: 200, headers: { 'Content-Type': 'application/json' } })
    }
    return new Response(JSON.stringify({ error: 'unexpected endpoint' }), { status: 500 })
  }
  return () => { globalThis.fetch = saved }
}

async function withEnvPlatform(url, token, fn) {
  const saved = { u: process.env.SILLYHUB_PLATFORM_URL, t: process.env.SILLYHUB_PLATFORM_TOKEN }
  process.env.SILLYHUB_PLATFORM_URL = url
  process.env.SILLYHUB_PLATFORM_TOKEN = token
  try {
    await fn()
  } finally {
    if (saved.u === undefined) delete process.env.SILLYHUB_PLATFORM_URL
    else process.env.SILLYHUB_PLATFORM_URL = saved.u
    if (saved.t === undefined) delete process.env.SILLYHUB_PLATFORM_TOKEN
    else process.env.SILLYHUB_PLATFORM_TOKEN = saved.t
  }
}

after(() => {
  for (const t of tmpRoots) {
    try { rmSync(t, { recursive: true, force: true }) } catch { /* best effort */ }
  }
})

test('1. 冲突抑制期间 spec 树删除 op 照常上行（红→绿：此前整轮被跳过）', async () => {
  const { cwd, specDir } = makeFixture({
    localFiles: [[`changes/${CHANGE}/tasks/task-01.md`, '# task-01\n']],
  })
  const postBodyCapture = []
  const restore = makeMockFetch({
    serverManifest: {
      // 服务器仍持有两文件：task-01（本地在场、同 hash 口径不影响 delete 断言）与 task-06（本地已删）
      [`changes/${CHANGE}/tasks/task-01.md`]: { hash: 'h-task01', version: 1, exists: true },
      [DELETED_TASK]: { hash: 'h-task06', version: 1, exists: true },
    },
    postBodyCapture,
  })
  try {
    await withEnvPlatform('http://hub.example.com', 'shpsync_tok-d1', async () => {
      const r = await new SyncManager(cwd).sync(CHANGE)
      // 抑制语义保持：progress 冲突未决，六表不上行
      assert.equal(r.conflict, true, 'conflict 语义不变')
      assert.equal(r.suppressed, true, 'suppressed 语义不变')
      assert.equal(r.specTreeAttempted, true, '抑制分支应尝试 spec 树同步')
      // 关键断言：删除 op 到达服务器（此前此路完全不通）
      const ops = postBodyCapture.flatMap((b) => (Array.isArray(b.ops) ? b.ops : []))
      const del = ops.find((o) => o.op === 'delete' && o.path === DELETED_TASK)
      assert.ok(del, `POST ops 应含 delete ${DELETED_TASK}（实际 ops=${JSON.stringify(ops)}）`)
      assert.equal(existsSync(join(specDir, '.runtime', 'state', `sync-conflict-${CHANGE}.json`)), true, 'progress 冲突文件不被触碰（独立通道互不干扰）')
    })
  } finally { restore() }
})

test('2. 补跑异常不改抑制语义：conflict/suppressed 原样返回且不向上抛', async () => {
  const { cwd } = makeFixture({ localFiles: [] })
  const postBodyCapture = []
  const restore = makeMockFetch({ serverManifest: {}, postBodyCapture, mode: 'manifest-throw' })
  try {
    await withEnvPlatform('http://hub.example.com', 'shpsync_tok-d2', async () => {
      const r = await new SyncManager(cwd).sync(CHANGE)
      assert.equal(r.conflict, true)
      assert.equal(r.suppressed, true)
      assert.equal(r.specTreeAttempted, true, '补跑已尝试（清单请求失败属通道内失败）')
      assert.equal(postBodyCapture.length, 0, '清单失败则无 POST')
    })
  } finally { restore() }
})
