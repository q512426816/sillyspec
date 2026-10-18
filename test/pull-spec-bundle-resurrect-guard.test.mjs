// FR-01（2026-10-16-fix-downstream-tool-defects）防复活回归：pullSpecBundle 整树快照回放
// 必须尊重本地删除面。
//
// 坑 spec-tree-file-resurrect（2026-10-16 下游实证）：progress 冲突/熔断窗口内本地删除的
// 任务卡（删除 op 未上行成功，服务器清单仍含它），后续 pull --spec --force 整树回放把
// 服务器旧文件写回本地=复活——幽灵任务卡+验证误报「文件未清理」。抑制判据（无状态现算）：
// 基线快照 spec-sync-base.json（上次成功同步时刻本地文件全集）有、当前盘面无 = 本地删除，
// 回放跳过；删除上行成功后服务器清单不再含该路径，bundle 不携带 → 抑制自然衰减；
// restoreDeleted: true 显式恢复通道（用户意志优先）；基线缺失=无抑制面（全新空环境
// 全量回放，既有行为逐字节不变）。
//
// 隔离：cwd 用 os.tmpdir() 临时目录 + mock globalThis.fetch（不发真实网络）。
import { test, after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'fs'
import { join, dirname, resolve } from 'path'
import { tmpdir } from 'os'
import { fileURLToPath } from 'url'
import { SyncManager, pullSpecBundle } from '../src/sync.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const cliBin = resolve(__dirname, '..', 'bin', 'sillyspec.js')

const tmpRoots = []
const DELETED_TASK = 'changes/2026-08-29-demo-change/tasks/task-05.md'
const ALIVE_DOC = 'changes/2026-08-29-demo-change/design.md'
const DELETED_CONTENT = '# task-05 旧卡（服务器还留着）\n'

function tarHeader(name, size, typeflag) {
  const h = Buffer.alloc(512)
  h.write(name.slice(0, 100), 0, 100, 'utf8')
  h.write(`${size.toString(8).padStart(11, '0')}\0`, 124, 12, 'ascii')
  h.write(typeflag, 156, 1, 'ascii')
  h.write('ustar\0', 257, 6, 'ascii')
  h.write('00', 263, 2, 'ascii')
  h.write('        ', 148, 8, 'ascii')
  let sum = 0
  for (const b of h) sum += b
  h.write(`${sum.toString(8).padStart(6, '0')}\0 `, 148, 8, 'ascii')
  return h
}

function tarEntry(name, content, typeflag = '0') {
  const data = Buffer.from(content, 'utf8')
  const pad = (512 - (data.length % 512)) % 512
  return Buffer.concat([tarHeader(name, data.length, typeflag), data, Buffer.alloc(pad)])
}

function buildTar(entries) {
  const parts = entries.map((e) =>
    e.type === 'dir' ? tarEntry(e.name, '', '5') : tarEntry(e.name, e.content, '0'),
  )
  return Buffer.concat([...parts, Buffer.alloc(1024)])
}

/** 服务器 bundle：仍含被本地删除的 task-05（删除 op 未上行）+ 在场文件的新版 */
function bundleWithDeletedTask() {
  return buildTar([
    { name: 'PLATFORM-BUNDLE.json', content: JSON.stringify({ spec_version: 43 }) },
    { name: 'changes/', type: 'dir' },
    { name: 'changes/2026-08-29-demo-change/', type: 'dir' },
    { name: 'changes/2026-08-29-demo-change/tasks/', type: 'dir' },
    { name: DELETED_TASK, content: DELETED_CONTENT },
    { name: ALIVE_DOC, content: '# design\n服务器新版\n' },
  ])
}

function okTarResponse(tarBuf, specVersion = '43') {
  return new Response(tarBuf, {
    status: 200,
    headers: { 'Content-Type': 'application/x-tar', 'X-Spec-Version': specVersion },
  })
}

/**
 * 基线快照（上次成功同步时刻本地文件全集）：含被删文件与在场文件。
 * 键为 specDir 相对 POSIX 路径（walkSpecTree 产物口径）。
 */
function writeBaseSnapshot(specDir, paths) {
  const hashes = {}
  for (const p of paths) hashes[p] = 'fake-hash-' + p.replace(/[^a-z0-9]/g, '')
  mkdirSync(join(specDir, '.runtime'), { recursive: true })
  mkdirSync(join(specDir, '.runtime', 'state'), { recursive: true })
  writeFileSync(join(specDir, '.runtime', 'state', 'spec-sync-base.json'), JSON.stringify({ ts: Date.now(), hashes }, null, 2) + '\n', 'utf8')
}

/** 非空 specDir（触发 --force 守卫口径）：基线 + 在场文件，缺被删文件 */
function makeFixture({ withBaseline = true } = {}) {
  const cwd = mkdtempSync(join(tmpdir(), 'ss-resurrect-'))
  tmpRoots.push(cwd)
  const specDir = join(cwd, '.sillyspec')
  mkdirSync(join(specDir, 'changes', '2026-08-29-demo-change'), { recursive: true })
  writeFileSync(join(specDir, ALIVE_DOC), '# design\n本地旧版\n', 'utf8')
  if (withBaseline) writeBaseSnapshot(specDir, [DELETED_TASK, ALIVE_DOC])
  return { cwd, specDir }
}

function mockFetch(impl) {
  const saved = globalThis.fetch
  globalThis.fetch = impl
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

// ── 主路径：基线有、盘面无 → 快照回放不复活（红→绿）──
test('1. 防复活主路径：本地已删除文件不被快照写回，其余文件正常回放', async () => {
  const { cwd, specDir } = makeFixture({ withBaseline: true })
  const restore = mockFetch(async () => okTarResponse(bundleWithDeletedTask()))
  try {
    await withEnvPlatform('http://hub.example.com', 'shpsync_tok-r1', async () => {
      const r = await new SyncManager(cwd).pullSpecBundle({ force: true })
      assert.equal(r.ok, true, `ok（实际 reason=${r.reason}）`)
      assert.equal(r.pulled, true)
      // 被抑制：被删文件不复活
      assert.equal(existsSync(join(specDir, DELETED_TASK)), false, '本地已删除文件不得被快照复活')
      assert.ok(Array.isArray(r.resurrectSkipped) && r.resurrectSkipped.includes(DELETED_TASK), `resurrectSkipped 应含被抑制路径（实际 ${JSON.stringify(r.resurrectSkipped)}）`)
      // 其余文件照常回放（服务器新版覆盖本地旧版）
      assert.equal(readFileSync(join(specDir, ALIVE_DOC), 'utf8'), '# design\n服务器新版\n', '未被抑制的文件照常回放')
      // local.yaml 不存在场景不受影响（保全链路空转）
      assert.equal(r.specVersion, '43')
    })
  } finally { restore() }
})

// ── 基线缺失 = 无抑制面，全量回放（既有行为不变）──
test('2. 无基线（全新空环境形态）：全量回放行为不变，被删文件照旧恢复', async () => {
  const { cwd, specDir } = makeFixture({ withBaseline: false })
  const restore = mockFetch(async () => okTarResponse(bundleWithDeletedTask()))
  try {
    await withEnvPlatform('http://hub.example.com', 'shpsync_tok-r2', async () => {
      const r = await new SyncManager(cwd).pullSpecBundle({ force: true })
      assert.equal(r.ok, true)
      assert.equal(readFileSync(join(specDir, DELETED_TASK), 'utf8'), DELETED_CONTENT, '无基线=无抑制面，回放行为与既有逐字节一致')
      assert.equal(r.resurrectSkipped, undefined, '未发生抑制时不携带 resurrectSkipped 字段')
    })
  } finally { restore() }
})

// ── 显式恢复通道：restoreDeleted 意志优先 ──
test('3. restoreDeleted: true 显式恢复：被抑制文件照常恢复落盘', async () => {
  const { cwd, specDir } = makeFixture({ withBaseline: true })
  const restore = mockFetch(async () => okTarResponse(bundleWithDeletedTask()))
  try {
    await withEnvPlatform('http://hub.example.com', 'shpsync_tok-r3', async () => {
      const r = await new SyncManager(cwd).pullSpecBundle({ force: true, restoreDeleted: true })
      assert.equal(r.ok, true)
      assert.equal(readFileSync(join(specDir, DELETED_TASK), 'utf8'), DELETED_CONTENT, '显式意志优先：被抑制文件恢复')
      assert.equal(r.resurrectSkipped, undefined)
    })
  } finally { restore() }
})

// ── 衰减：删除上行成功后服务器清单不再含该路径 → bundle 无可抑制对象 ──
test('4. 衰减：删除上行成功后（bundle 无该条目）行为与普通回放一致', async () => {
  const { cwd, specDir } = makeFixture({ withBaseline: true })
  const tar = buildTar([
    { name: 'changes/', type: 'dir' },
    { name: 'changes/2026-08-29-demo-change/', type: 'dir' },
    { name: ALIVE_DOC, content: '# design\n删除已收敛后的服务器\n' },
  ])
  const restore = mockFetch(async () => okTarResponse(tar, '44'))
  try {
    await withEnvPlatform('http://hub.example.com', 'shpsync_tok-r4', async () => {
      const r = await new SyncManager(cwd).pullSpecBundle({ force: true })
      assert.equal(r.ok, true)
      assert.equal(existsSync(join(specDir, DELETED_TASK)), false)
      assert.equal(readFileSync(join(specDir, ALIVE_DOC), 'utf8'), '# design\n删除已收敛后的服务器\n')
      assert.equal(r.resurrectSkipped, undefined)
    })
  } finally { restore() }
})

// ── 模块级包装器同语义（index.js pull --spec 的实际入口）──
test('5. 模块级 pullSpecBundle(cwd, opts) 包装器透传 restoreDeleted 语义', async () => {
  const { cwd, specDir } = makeFixture({ withBaseline: true })
  const restore = mockFetch(async () => okTarResponse(bundleWithDeletedTask()))
  try {
    await withEnvPlatform('http://hub.example.com', 'shpsync_tok-r5', async () => {
      const r = await pullSpecBundle(cwd, { force: true })
      assert.equal(r.ok, true)
      assert.equal(existsSync(join(specDir, DELETED_TASK)), false, '包装器默认同样抑制复活')
    })
  } finally { restore() }
})
