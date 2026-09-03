// quick 会话 spec 同步整树冲突粒度过粗（docs/sillyspec/2026-09-03-quicksync-conflict-granularity）
//
// 实证形态：quick step2 --done 时 spec-sync 报「spec 树冲突」——164 个 changes/archive/
// 旧归档文件服务器版本领先（GET 清单 → 全树 hash → POST 的竞态窗内他端推进，base_version
// 过期），与本次会话零交集的文件把冲突坐实，只能 abort；且重试路径在 mtime 被 git 操作
// 刷新后会把陈旧副本静默推上服务器（回退）。
//
// 修复断言（src/spec-sync.js）：
// ① 内容基线快照（spec-sync-base.json = 上次成功同步的本地 hash 全集）：本地内容未变
//    （mtime 随便刷）→ update op 发出前即丢弃（跟随服务器），免疫 mtime 伪造；
// ② 冲突回告分流（partitionConflictPaths）：本地未改动路径自动跟随（不进冲突文件），
//    全部为 follower 时本轮视为成功（服务器「冲突跳过、其余照常 apply」下本会话改动已落）；
//    只有本地真改动文件进冲突文件（粒度收窄到 per-file）。
//
// 隔离：tmpdir fixture + mock globalThis.fetch，绝不碰真实 .sillyspec/.runtime。
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, utimesSync, existsSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { createHash } from 'crypto'
import {
  dropFollowServerUpdates,
  partitionConflictPaths,
  syncSpecTree,
  hashFiles,
  walkSpecTree,
} from '../src/spec-sync.js'

const tmpRoots = []
function makeFixture() {
  const fx = mkdtempSync(join(tmpdir(), `sillyspec-qsync-${process.pid}-`))
  tmpRoots.push(fx)
  return fx
}
test.onFinish?.(() => { for (const t of tmpRoots) rmSync(t, { recursive: true, force: true }) })

const sha = (s) => createHash('sha256').update(s).digest('hex')

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

// ─────────────────────────────────────────
// 单元：dropFollowServerUpdates / partitionConflictPaths
// ─────────────────────────────────────────

test('① dropFollowServerUpdates：本地 hash == 基线快照 → 丢弃；真改动/新增/删除保留', () => {
  const ops = [
    { op: 'update', path: 'changes/archive/old.md', hash: 'H1', base_version: 3 },
    { op: 'update', path: 'changes/c/doc.md', hash: 'H2-new', base_version: 5 },
    { op: 'add', path: 'changes/c/new.md', hash: 'H3', base_version: 0 },
    { op: 'delete', path: 'changes/c/gone.md', base_version: 7 },
  ]
  const localFiles = [
    { path: 'changes/archive/old.md', hash: 'H1', mtime: 1 },       // 内容未变（mtime 新旧无关）
    { path: 'changes/c/doc.md', hash: 'H2-new', mtime: 2 },          // 内容真变了
    { path: 'changes/c/new.md', hash: 'H3', mtime: 3 },
  ]
  const baseHashes = { 'changes/archive/old.md': 'H1', 'changes/c/doc.md': 'H2-old' }
  const { ops: kept, followed } = dropFollowServerUpdates(ops, localFiles, baseHashes)
  assert.deepEqual(followed, ['changes/archive/old.md'], '仅内容未变的 update 被丢弃')
  assert.equal(kept.length, 3, '真改动 update + add + delete 保留')
  assert.ok(kept.every(o => o.path !== 'changes/archive/old.md'))
  // null 快照（过渡期）→ 不过滤
  const none = dropFollowServerUpdates(ops, localFiles, null)
  assert.equal(none.ops.length, 4, '无快照时维持旧行为')
})

test('② partitionConflictPaths：内容基线命中或 mtime 过期 → follower；否则真冲突', () => {
  const localFiles = [
    { path: 'a.md', hash: 'A1', mtime: 100 },           // 内容 == 基线 → follower
    { path: 'b.md', hash: 'B2', mtime: 50 },            // mtime 早于 lastSync → follower
    { path: 'c.md', hash: 'C2', mtime: 999 },           // 真改动 → real
  ]
  const baseHashes = { 'a.md': 'A1', 'c.md': 'C1' }
  const lastSyncTs = 100_000 // ms；b.md mtime 50s*1000+1000 = 51000 <= 100000 → 过期
  const { followers, real } = partitionConflictPaths(
    { 'a.md': 5, 'b.md': 6, 'c.md': 7 }, localFiles, baseHashes, lastSyncTs)
  assert.deepEqual([...followers].sort(), ['a.md', 'b.md'])
  assert.deepEqual(Object.keys(real), ['c.md'])
  assert.equal(real['c.md'], 7, '真冲突路径保留服务器版本号')
})

// ─────────────────────────────────────────
// e2e：syncSpecTree
// ─────────────────────────────────────────

test('③ 事故复现链闭环：首同步建基线 → 他端推进+本地 mtime 被刷新 → follower 不再回推不冲突', async () => {
  const fx = makeFixture()
  const specRoot = join(fx, '.sillyspec')
  mkdirSync(join(specRoot, 'changes/archive'), { recursive: true })
  mkdirSync(join(specRoot, 'changes/my-change'), { recursive: true })
  const archPath = join(specRoot, 'changes/archive/2026-08-01-old.md')
  const docPath = join(specRoot, 'changes/my-change/module-docs.md')
  writeFileSync(archPath, '旧归档内容 v1\n', 'utf8')
  writeFileSync(docPath, '模块文档 v1\n', 'utf8')
  const platform = { url: 'http://127.0.0.1:9', token: 't' }

  // 第一次同步：空清单（全 add）→ 成功 → 写内容基线快照
  let m = mockFetch({ manifest: {}, postResponse: { ok: true, new_versions: {}, conflict: false } })
  try {
    const r1 = await syncSpecTree(specRoot, platform, 'my-change')
    assert.equal(r1.synced, 2, '两文件首推')
    assert.ok(existsSync(join(specRoot, '.runtime', 'spec-sync-base.json')), '基线快照已写')
  } finally { m.restore() }

  // 他端推进：服务器上归档文件内容前进到 v2（本地仍 v1=陈旧副本）；本地归档文件被
  // git 操作重写（内容不变、mtime 刷新为现在）——击穿 mtime 启发式的主场景
  const advanced = sha('旧归档内容 v2 由他端推进\n')
  utimesSync(archPath, new Date(), new Date())
  // 本会话真改动：模块文档 → v2
  writeFileSync(docPath, '模块文档 v2 本会话改动\n', 'utf8')

  m = mockFetch({
    manifest: {
      'changes/archive/2026-08-01-old.md': { hash: advanced, version: 4, exists: true },
      'changes/my-change/module-docs.md': { hash: sha('模块文档 v1\n'), version: 2, exists: true },
    },
    postResponse: { ok: true, new_versions: {}, conflict: false },
  })
  try {
    const r2 = await syncSpecTree(specRoot, platform, 'my-change')
    assert.equal(r2.conflict, undefined, '无冲突')
    assert.equal(r2.synced, 1, '仅本会话真改动文件被推送')
    assert.equal(m.postedBodies.length, 1, '只发一轮 POST')
    const paths = m.postedBodies[0].ops.map(o => o.path)
    assert.deepEqual(paths, ['changes/my-change/module-docs.md'], '归档 follower（内容未变+mtime 已刷新）不回推')
    assert.ok(!m.postedBodies[0].ops.some(o => o.path === 'changes/archive/2026-08-01-old.md'),
      '陈旧副本不进 ops（修复前：mtime 新 → 推送 → 服务器回退）')
  } finally { m.restore() }
})

test('④ 竞态冲突自动消解：全部冲突路径为本地未改动 → 不落冲突文件、写基线、返回成功', async () => {
  const fx = makeFixture()
  const specRoot = join(fx, '.sillyspec')
  mkdirSync(join(specRoot, 'changes'), { recursive: true })
  // 本地一小时前落盘的文件（早于 last-success 标记 → mtime alibi）；无基线快照（过渡期）。
  // GET 清单不含它（服务器此刻没有）→ add op；竞态：POST 前他端在服务器创建了同名文件
  // → 服务器回 conflict（add 的 base_version=0 撞已有行）。add op 不受 mtime 预过滤
  // （filterStaleUpdates 只滤 update），冲突回告分流时 mtime alibi 判 follower。
  writeFileSync(join(specRoot, 'changes/quicklog.md'), 'ql v1\n', 'utf8')
  utimesSync(join(specRoot, 'changes/quicklog.md'), new Date(Date.now() - 3_600_000), new Date(Date.now() - 3_600_000))
  mkdirSync(join(specRoot, '.runtime'), { recursive: true })
  writeFileSync(join(specRoot, '.runtime', 'spec-sync-last-success.json'), JSON.stringify({ ts: Date.now() }), 'utf8')
  const platform = { url: 'http://127.0.0.1:9', token: 't' }

  const m = mockFetch({
    manifest: {},
    postResponse: { ok: true, new_versions: {}, conflict: true, server_versions: { 'changes/quicklog.md': 9 } },
  })
  try {
    const r = await syncSpecTree(specRoot, platform, 'quick-abc')
    assert.equal(m.postedBodies.length, 1, 'add op 已发出（不受 update 专属的 mtime 预过滤）')
    assert.equal(r.conflict, false, '全部 follower → 自动消解不报冲突')
    assert.equal(r.autoResolved, 1)
    assert.ok(!existsSync(join(specRoot, '.runtime', 'spec-sync-conflict-quick-abc.json')),
      '不落冲突文件（修复前坐实冲突进 resolve 流程）')
    assert.ok(existsSync(join(specRoot, '.runtime', 'spec-sync-base.json')), '消解后写基线（下次 pre-POST 即拦）')
  } finally { m.restore() }
})

test('⑤ 真冲突粒度收窄：冲突文件只列本地真改动路径，follower 记入 auto_followed', async () => {
  const fx = makeFixture()
  const specRoot = join(fx, '.sillyspec')
  mkdirSync(join(specRoot, 'changes/archive'), { recursive: true })
  mkdirSync(join(specRoot, 'changes/my-change'), { recursive: true })
  const archPath = join(specRoot, 'changes/archive/2026-08-02-old.md')
  writeFileSync(archPath, '旧归档 v1\n', 'utf8')
  const docPath = join(specRoot, 'changes/my-change/design.md')
  writeFileSync(docPath, 'design v2 本会话改\n', 'utf8')
  const platform = { url: 'http://127.0.0.1:9', token: 't' }

  // 内容基线：归档文件在快照里（内容未变 → follower）；design 不在（真改动）
  mkdirSync(join(specRoot, '.runtime'), { recursive: true })
  const localNow = hashFiles(walkSpecTree(specRoot))
  const hashes = {}
  for (const f of localNow) if (f.path === 'changes/archive/2026-08-02-old.md') hashes[f.path] = f.hash
  writeFileSync(join(specRoot, '.runtime', 'spec-sync-base.json'), JSON.stringify({ ts: Date.now() - 60_000, hashes }), 'utf8')

  const m = mockFetch({
    manifest: {
      'changes/archive/2026-08-02-old.md': { hash: sha('旧归档 v9 他端\n'), version: 9, exists: true },
      'changes/my-change/design.md': { hash: sha('design v1\n'), version: 2, exists: true },
    },
    postResponse: {
      ok: true, new_versions: {}, conflict: true,
      server_versions: {
        'changes/archive/2026-08-02-old.md': 9,
        'changes/my-change/design.md': 3,
      },
    },
  })
  try {
    const r = await syncSpecTree(specRoot, platform, 'my-change')
    assert.equal(r.conflict, true)
    assert.deepEqual(Object.keys(r.serverVersions), ['changes/my-change/design.md'], '真冲突仅本地改动的 design')
    assert.equal(r.autoResolved, 1, '归档 follower 自动跟随')
    const cf = JSON.parse(readFileSync(join(specRoot, '.runtime', 'spec-sync-conflict-my-change.json'), 'utf8'))
    assert.deepEqual(cf.conflicting_paths, ['changes/my-change/design.md'], '冲突文件只列真冲突')
    assert.deepEqual(cf.auto_followed, ['changes/archive/2026-08-02-old.md'], 'follower 留痕')
  } finally { m.restore() }
})
