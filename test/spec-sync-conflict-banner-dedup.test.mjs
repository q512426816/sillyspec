// spec-sync 冲突横幅刷屏降噪（坑 spec-sync-conflict-banner-spam，docs/sillyspec/troubleshooting.md #51）
//
// 实证形态：未决 spec 树冲突存在期间，每步完成的自动同步都会对同一批真冲突路径再撞一次
// ——每轮重写冲突文件 + 空行+全幅双线横幅（含整包 server_versions JSON.stringify dump），
// 冲突文件几十个时一行横幅就把终端刷满，「已卡死不会自愈」连环刷屏。进度侧（sync()）
// 2026-08-23 已修同族坑（sync-conflict-banner-spam），spec 树侧漏网。
//
// 修复断言（src/spec-sync.js）：
// ① 首报/冲突集变化 → 全幅横幅但只列前 5 路径（截断，逐文件版本在冲突详情文件）；
// ② 同集重复轮 → 单行提示（可见但不吓人）+ 不重写冲突文件 + 返回 suppressed: true；
// ③ 冲突集增长 → 重新全幅横幅 + 重写冲突文件；
// ④ 成功轮 / 冲突自动消解轮 → 清残留冲突标记（status 不永久红标）；
// ⑤ forcePush（resolve --keep-local 重推）不参与去重——需真实判定与文件刷新。
//
// 隔离：tmpdir fixture + mock globalThis.fetch + 捕获 console.warn，绝不碰真实 .sillyspec/.runtime。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, utimesSync, existsSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { syncSpecTree } from '../src/spec-sync.js'

const tmpRoots = []
function makeFixture() {
  const fx = mkdtempSync(join(tmpdir(), `sillyspec-bandedup-${process.pid}-`))
  tmpRoots.push(fx)
  return fx
}
test.onFinish?.(() => { for (const t of tmpRoots) rmSync(t, { recursive: true, force: true }) })

function mockFetch({ manifest = {}, postResponse = { ok: true } } = {}) {
  const postedBodies = []
  const impl = async (url, options = {}) => {
    if (String(url).endsWith('/spec-manifest')) {
      return { ok: true, status: 200, json: async () => ({ files: manifest }) }
    }
    if (String(url).endsWith('/spec-sync') && (options.method || '') === 'POST') {
      postedBodies.push(JSON.parse(options.body))
      return {
        ok: true, status: 200,
        json: async () => (typeof postResponse === 'function' ? postResponse(postedBodies.length) : postResponse),
      }
    }
    return { ok: true, status: 200, json: async () => ({}) }
  }
  const saved = globalThis.fetch
  globalThis.fetch = impl
  return { postedBodies, restore: () => { globalThis.fetch = saved } }
}

/** 捕获 console.warn 行（含空行），fn 运行期间生效 */
async function captureWarn(fn) {
  const lines = []
  const saved = console.warn
  console.warn = (...a) => { lines.push(a.map(String).join(' ')) }
  try { return { result: await fn(), lines } } finally { console.warn = saved }
}

const CN = 'banner-dedup-chg'

function makeConflictFixture(nFiles = 30) {
  const fx = makeFixture()
  const specRoot = join(fx, '.sillyspec')
  mkdirSync(join(specRoot, 'changes', CN), { recursive: true })
  const manifest = {}
  for (let i = 0; i < nFiles; i++) {
    writeFileSync(join(specRoot, 'changes', CN, `f${String(i).padStart(2, '0')}.md`), `local v2 ${i}\n`, 'utf8')
    manifest[`changes/${CN}/f${String(i).padStart(2, '0')}.md`] = { hash: `SRVHASH-${i}`, version: i + 1, exists: true }
  }
  // 无基线快照/无 last-success 标记 → 全部路径判「本地真改动」（真冲突，进冲突文件）
  return { fx, specRoot, manifest, paths: Object.keys(manifest) }
}

const conflictAll = (paths, extra = {}) => {
  const server_versions = {}
  for (const [i, p] of paths.entries()) server_versions[p] = i + 1
  return { ok: true, new_versions: {}, conflict: true, server_versions: { ...server_versions, ...extra } }
}

test('① 首报：全幅横幅只列前 5 路径（截断防刷屏），冲突文件记全量', async () => {
  const { specRoot, manifest, paths } = makeConflictFixture(30)
  const m = mockFetch({ manifest, postResponse: conflictAll(paths) })
  try {
    const { result, lines } = await captureWarn(() => syncSpecTree(specRoot, { url: 'http://127.0.0.1:9', token: 't' }, CN))
    assert.equal(result.conflict, true)
    assert.equal(result.suppressed, undefined, '首报不走降噪')
    const banner = lines.find((l) => l.includes('检测到 spec 树冲突'))
    assert.ok(banner, '有全幅横幅')
    assert.ok(banner.includes('changes/' + CN + '/f00.md') && banner.includes('f04.md'), '列前 5 个路径')
    assert.ok(banner.includes('等'), '超过 5 个带「等」截断')
    assert.ok(!banner.includes('f29.md'), '不整包 dump 全部 30 个路径')
    assert.ok(!banner.includes('"changes/'), '不再 JSON.stringify 整包 server_versions')
    const cf = JSON.parse(readFileSync(join(specRoot, '.runtime', `spec-sync-conflict-${CN}.json`), 'utf8'))
    assert.equal(cf.conflicting_paths.length, 30, '冲突文件仍记全量 30 路径')
    assert.equal(cf.server_versions[paths[29]], 30, '逐文件服务器版本在冲突文件里')
  } finally { m.restore() }
})

test('② 同集重复轮：单行提示、冲突文件不重写、返回 suppressed', async () => {
  const { specRoot, manifest, paths } = makeConflictFixture(30)
  const m = mockFetch({ manifest, postResponse: conflictAll(paths) })
  const cfPath = join(specRoot, '.runtime', `spec-sync-conflict-${CN}.json`)
  try {
    const r1 = await captureWarn(() => syncSpecTree(specRoot, { url: 'http://127.0.0.1:9', token: 't' }, CN))
    const afterFirst = readFileSync(cfPath, 'utf8')

    const r2 = await captureWarn(() => syncSpecTree(specRoot, { url: 'http://127.0.0.1:9', token: 't' }, CN))
    assert.equal(r2.result.conflict, true)
    assert.equal(r2.result.suppressed, true, '重复轮标记 suppressed')
    assert.equal(r2.lines.length, 1, '恰一行提示（修复前：空行+全幅横幅+处置 3 行）')
    assert.ok(r2.lines[0].includes('未决 spec 树冲突') && r2.lines[0].includes(`platform resolve ${CN}`), '单行含处置指引')
    assert.equal(readFileSync(cfPath, 'utf8'), afterFirst, '冲突文件未重写（created_at 稳定，status 红标语义不变）')

    const r3 = await captureWarn(() => syncSpecTree(specRoot, { url: 'http://127.0.0.1:9', token: 't' }, CN))
    assert.equal(r3.result.suppressed, true, '第三轮仍单行（持续待裁决期间不刷屏）')
    assert.equal(r3.lines.length, 1)
  } finally { m.restore() }
})

test('③ 冲突集增长：重新全幅横幅 + 重写冲突文件（变化要再次告知）', async () => {
  const { specRoot, manifest, paths } = makeConflictFixture(30)
  let extraOn = false
  const m = mockFetch({
    manifest,
    postResponse: () => conflictAll(paths, extraOn ? { [`changes/${CN}/extra.md`]: 99 } : {}),
  })
  const cfPath = join(specRoot, '.runtime', `spec-sync-conflict-${CN}.json`)
  try {
    await captureWarn(() => syncSpecTree(specRoot, { url: 'http://127.0.0.1:9', token: 't' }, CN))
    const afterFirst = readFileSync(cfPath, 'utf8')
    const r2 = await captureWarn(() => syncSpecTree(specRoot, { url: 'http://127.0.0.1:9', token: 't' }, CN))
    assert.equal(r2.result.suppressed, true, '同集轮先降噪')
    extraOn = true
    const r3 = await captureWarn(() => syncSpecTree(specRoot, { url: 'http://127.0.0.1:9', token: 't' }, CN))
    assert.equal(r3.result.suppressed, undefined, '冲突集变化不走降噪')
    assert.ok(r3.lines.some((l) => l.includes('检测到 spec 树冲突')), '重新全幅横幅')
    assert.equal(r3.lines.length, 3, '空行+横幅+处置（全幅）')
    const cf = JSON.parse(readFileSync(cfPath, 'utf8'))
    assert.equal(cf.conflicting_paths.length, 31, '新冲突路径已入文件')
    assert.ok(cf.conflicting_paths.includes(`changes/${CN}/extra.md`))
    assert.notEqual(readFileSync(cfPath, 'utf8'), afterFirst, '冲突文件已重写')
  } finally { m.restore() }
})

test('④ 成功轮：清残留冲突标记（冲突已不存在，status 不永久红标）', async () => {
  const { specRoot, manifest, paths } = makeConflictFixture(3)
  let conflictMode = true
  const m = mockFetch({
    manifest,
    postResponse: () => (conflictMode ? conflictAll(paths) : { ok: true, new_versions: {}, conflict: false }),
  })
  const cfPath = join(specRoot, '.runtime', `spec-sync-conflict-${CN}.json`)
  try {
    const r1 = await captureWarn(() => syncSpecTree(specRoot, { url: 'http://127.0.0.1:9', token: 't' }, CN))
    assert.equal(r1.result.conflict, true)
    assert.ok(existsSync(cfPath), '冲突文件已落')
    conflictMode = false
    const r2 = await captureWarn(() => syncSpecTree(specRoot, { url: 'http://127.0.0.1:9', token: 't' }, CN))
    assert.equal(r2.result.conflict, undefined, '对端停推后重推成功（last-writer-wins 收敛）')
    assert.equal(r2.result.synced, 3)
    assert.ok(!existsSync(cfPath), '成功轮清残留冲突标记')
  } finally { m.restore() }
})

test('⑤ 冲突自动消解轮（全 follower）：同样清残留冲突标记', async () => {
  const fx = makeFixture()
  const specRoot = join(fx, '.sillyspec')
  mkdirSync(join(specRoot, 'changes'), { recursive: true })
  mkdirSync(join(specRoot, '.runtime'), { recursive: true })
  // quicksync-conflict-granularity ④ 同款构造：mtime alibi（本地一小时前落盘、未改动）→ follower
  writeFileSync(join(specRoot, 'changes/quicklog.md'), 'ql v1\n', 'utf8')
  utimesSync(join(specRoot, 'changes/quicklog.md'), new Date(Date.now() - 3_600_000), new Date(Date.now() - 3_600_000))
  writeFileSync(join(specRoot, '.runtime', 'spec-sync-last-success.json'), JSON.stringify({ ts: Date.now() }), 'utf8')
  // 残留的历史冲突标记（上一轮真冲突遗留）
  const stalePath = join(specRoot, '.runtime', 'spec-sync-conflict-quick-auto.json')
  writeFileSync(stalePath, JSON.stringify({ change: 'quick-auto', conflicting_paths: ['changes/old.md'] }), 'utf8')

  const m = mockFetch({
    manifest: {},
    postResponse: { ok: true, new_versions: {}, conflict: true, server_versions: { 'changes/quicklog.md': 9 } },
  })
  try {
    const r = await captureWarn(() => syncSpecTree(specRoot, { url: 'http://127.0.0.1:9', token: 't' }, 'quick-auto'))
    assert.equal(r.result.conflict, false, '全 follower 自动消解')
    assert.equal(r.result.autoResolved, 1)
    assert.ok(!existsSync(stalePath), '消解轮清残留冲突标记（修复前永久红标）')
  } finally { m.restore() }
})

test('⑥ forcePush（resolve --keep-local 重推）不参与去重：真实判定 + 刷新冲突文件', async () => {
  const fx = makeFixture()
  const specRoot = join(fx, '.sillyspec')
  mkdirSync(join(specRoot, 'changes'), { recursive: true })
  writeFileSync(join(specRoot, 'changes/a.md'), 'local v2\n', 'utf8')
  const manifest = { 'changes/a.md': { hash: 'SRVHASH-a', version: 3, exists: true } }
  let srvVersion = 3
  const m = mockFetch({
    manifest,
    postResponse: () => ({ ok: true, new_versions: {}, conflict: true, server_versions: { 'changes/a.md': srvVersion } }),
  })
  const cfPath = join(specRoot, '.runtime', 'spec-sync-conflict-fp-chg.json')
  try {
    await captureWarn(() => syncSpecTree(specRoot, { url: 'http://127.0.0.1:9', token: 't' }, 'fp-chg'))
    assert.ok(existsSync(cfPath), '首轮落冲突文件')
    srvVersion = 4 // 裁决期间平台又有更新
    const r2 = await captureWarn(() => syncSpecTree(specRoot, { url: 'http://127.0.0.1:9', token: 't' }, 'fp-chg', { forcePush: true }))
    assert.equal(r2.result.conflict, true)
    assert.equal(r2.result.suppressed, undefined, 'forcePush 不走单行降噪')
    assert.ok(r2.lines.some((l) => l.includes('检测到 spec 树冲突')), '仍全幅横幅（resolve 流程需真实判定）')
    const cf = JSON.parse(readFileSync(cfPath, 'utf8'))
    assert.equal(cf.server_versions['changes/a.md'], 4, '冲突文件已刷新为最新服务器版本')
  } finally { m.restore() }
})
