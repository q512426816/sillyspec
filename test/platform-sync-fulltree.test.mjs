/**
 * platform sync 全树入口行为测试（2026-10-11-sync-conflict-tri-fix FR-03）。
 *
 * 覆盖 syncSpecTree 的 changeName=null 形态（CLI `platform sync` 无 --change 的新入口）：
 *   - 全绿：ops 正常推送，成功计数，不落冲突文件；
 *   - 冲突归因单一变更（含 CJK 变更名——生产实证 2026-10-10-取消LTC宽表校验规则 被
 *     assertSafeChangeName 误拦的正是此类）：冲突文件按变更名落
 *     spec-sync-conflict-<变更名>.json（与 per-change 流程兼容，resolve/status UX 不变）；
 *   - 冲突跨多变更：归并 'full-tree' 单文件（resolve 整体裁决）。
 *
 * fetch 全程 stub（globalThis.fetch），平台对象直传，不依赖真实连接。
 */

import { test } from 'node:test'
import { strict as assert } from 'node:assert'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createHash } from 'node:crypto'

import { syncSpecTree } from '../src/spec-sync.js'

const sha = (s) => createHash('sha256').update(s).digest('hex')

/** stub fetch：manifest GET → {files}；spec-sync POST → 记录请求体并回 post 响应。 */
function stubFetch({ manifest, post }) {
  const calls = { post: [] }
  globalThis.fetch = async (url, init) => {
    if (String(url).endsWith('/api/changes/-/spec-manifest')) {
      return { ok: true, status: 200, json: async () => ({ files: manifest }) }
    }
    if (String(url).endsWith('/api/changes/-/spec-sync')) {
      calls.post.push(JSON.parse(init.body))
      return { ok: true, status: 200, json: async () => post }
    }
    throw new Error(`unexpected fetch url: ${url}`)
  }
  return calls
}

const PLATFORM = { url: 'https://hub.test', token: 'tok' }

test('全树同步（changeName=null）全绿——add op 推送 + 成功计数 + 不落冲突文件', async () => {
  const root = mkdtempSync(join(tmpdir(), 'fulltree-green-'))
  try {
    mkdirSync(join(root, 'changes', 'archive', 'chg-a'), { recursive: true })
    writeFileSync(join(root, 'changes', 'archive', 'chg-a', 'tasks.md'), 'local-a')

    const calls = stubFetch({ manifest: {}, post: { ok: true } })
    const r = await syncSpecTree(root, PLATFORM, null, {})

    assert.equal(r.synced, 1)
    assert.equal(calls.post.length, 1)
    assert.equal(calls.post[0].ops[0].op, 'add')
    assert.equal(calls.post[0].ops[0].path, 'changes/archive/chg-a/tasks.md')
    assert.equal(existsSync(join(root, '.runtime', 'spec-sync-conflict-full-tree.json')), false)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('全树冲突归因单一 CJK 变更——冲突文件按变更名落盘（per-change 兼容）', async () => {
  const root = mkdtempSync(join(tmpdir(), 'fulltree-cjk-conflict-'))
  const changeName = '2026-10-10-取消LTC宽表校验规则'
  const rel = `changes/archive/${changeName}/x.md`
  try {
    mkdirSync(join(root, 'changes', 'archive', changeName), { recursive: true })
    writeFileSync(join(root, 'changes', 'archive', changeName, 'x.md'), 'local-b')

    const calls = stubFetch({
      manifest: { [rel]: { hash: sha('server-b'), version: 4, exists: true } },
      post: { conflict: true, server_versions: { [rel]: 5 } },
    })
    const r = await syncSpecTree(root, PLATFORM, null, {})

    assert.equal(r.conflict, true)
    // update op（本地 hash 与服务器不同）已被推送并遭 conflict 回告
    assert.equal(calls.post[0].ops[0].op, 'update')
    assert.equal(calls.post[0].ops[0].base_version, 4)
    // 冲突文件归因到变更名（中文文件名，Windows/Linux/macOS 文件系统均合法）
    const cf = join(root, '.runtime', `spec-sync-conflict-${changeName}.json`)
    assert.ok(existsSync(cf), '冲突文件按变更名归因落盘')
    const detail = JSON.parse(readFileSync(cf, 'utf8'))
    assert.equal(detail.change, changeName)
    assert.deepEqual(detail.conflicting_paths, [rel])
    // 不落 full-tree 合并文件
    assert.equal(existsSync(join(root, '.runtime', 'spec-sync-conflict-full-tree.json')), false)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('全树冲突跨多变更——归并 full-tree 单文件（change 字段 full-tree）', async () => {
  const root = mkdtempSync(join(tmpdir(), 'fulltree-multi-conflict-'))
  const relC = 'changes/chg-c/a.md'
  const relD = 'changes/chg-d/b.md'
  try {
    mkdirSync(join(root, 'changes', 'chg-c'), { recursive: true })
    mkdirSync(join(root, 'changes', 'chg-d'), { recursive: true })
    writeFileSync(join(root, 'changes', 'chg-c', 'a.md'), 'local-c')
    writeFileSync(join(root, 'changes', 'chg-d', 'b.md'), 'local-d')

    stubFetch({
      manifest: {
        [relC]: { hash: sha('server-c'), version: 2, exists: true },
        [relD]: { hash: sha('server-d'), version: 3, exists: true },
      },
      post: { conflict: true, server_versions: { [relC]: 3, [relD]: 4 } },
    })
    const r = await syncSpecTree(root, PLATFORM, null, {})

    assert.equal(r.conflict, true)
    const cf = join(root, '.runtime', 'spec-sync-conflict-full-tree.json')
    assert.ok(existsSync(cf), '跨变更冲突归并 full-tree 文件')
    const detail = JSON.parse(readFileSync(cf, 'utf8'))
    assert.equal(detail.change, 'full-tree')
    assert.equal(detail.conflicting_paths.length, 2)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})
