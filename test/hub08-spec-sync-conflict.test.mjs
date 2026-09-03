/**
 * HUB-08 回归：spec 树同步 conflict 闭环——此前 body.conflict 只 warn 返回，无冲突文件、
 * 无 resolve 入口，下次 sync 用同一 base_version 继续冲突循环。
 *
 * 闭环设计：syncSpecTree 冲突时落 .runtime/spec-sync-conflict-<change>.json（含 server_versions）；
 * platform status 经 listConflictFiles 列出（type: spec-tree）；platform resolve 三态：
 *   keep-local → 重新 GET 清单重定 base 后重推本地（胜出方=本地），成功清文件；
 *   take-platform → 明确不支持（平台无文件下载端点），fail-closed 提示手动对齐；
 *   abort → 只清冲突标记。
 */
import http from 'node:http'
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, readFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { syncSpecTree } from '../src/spec-sync.js'
import { SyncManager } from '../src/sync.js'

let failures = 0
const assert = (cond, msg) => {
  if (cond) console.log('  ✅ ' + msg)
  else { console.error('  ❌ ' + msg); failures++; }
}

const tmpRoot = mkdtempSync(join(tmpdir(), `hub08-specconf-${process.pid}-`))

// mock 平台：GET spec-manifest 返回 a.md v3（hash 与本地不同）；POST spec-sync 按策略响应
let postCalls = 0
let postPolicy = 'conflict' // conflict | ok
const server = http.createServer((req, res) => {
  if (req.url.includes('/api/changes/-/spec-manifest') && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ files: { 'a.md': { hash: 'SERVERHASH-a', version: 3, exists: true } } }))
    return
  }
  if (req.url.includes('/api/changes/-/spec-sync') && req.method === 'POST') {
    postCalls++
    if (postPolicy === 'conflict') {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ conflict: true, server_versions: { 'a.md': 3 } }))
    } else {
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ ok: true }))
    }
    return
  }
  res.writeHead(404); res.end()
})
await new Promise((r) => server.listen(0, '127.0.0.1', r))
const mockUrl = `http://127.0.0.1:${server.address().port}`

const CN = 'hub08-chg'
const cwd = join(tmpRoot, 'proj')
mkdirSync(join(cwd, '.sillyspec'), { recursive: true })
writeFileSync(join(cwd, '.sillyspec', 'a.md'), 'local version content\n')
writeFileSync(join(cwd, '.sillyspec', 'local.yaml'), `platform:\n  url: ${mockUrl}\n  token: tok\n`)
const specConflictPath = join(cwd, '.sillyspec', '.runtime', `spec-sync-conflict-${CN}.json`)

// ── 1. 冲突落文件 ──
console.log('\n--- 1. syncSpecTree 冲突 → 落 spec-sync-conflict 文件 ---')
{
  const r = await syncSpecTree(join(cwd, '.sillyspec'), { url: mockUrl, token: 'tok' }, CN)
  assert(r.conflict === true, '返回 conflict=true')
  assert(existsSync(specConflictPath), `冲突文件已落盘（${specConflictPath}）`)
  const cf = JSON.parse(readFileSync(specConflictPath, 'utf8'))
  assert(cf.change === CN, `冲突文件含 change（实得 ${cf.change}）`)
  assert(cf.server_versions && cf.server_versions['a.md'] === 3, '冲突文件含 server_versions')
  assert(Array.isArray(cf.conflicting_paths) && cf.conflicting_paths.includes('a.md'), '冲突文件含 conflicting_paths')
}

// ── 2. status 列出（type: spec-tree）──
console.log('\n--- 2. listConflictFiles 列出 spec 树冲突 ---')
{
  const sm = new SyncManager(cwd)
  const list = sm.listConflictFiles()
  const hit = list.find((c) => c.change === CN)
  assert(hit && hit.type === 'spec-tree', `status 扫描到 spec 树冲突且 type 正确（实得 ${JSON.stringify(hit && hit.type)}）`)
}

// ── 3. resolve keep-local：重推闭环 ──
console.log('\n--- 3. resolve --keep-local → 重定 base 重推 → 清文件 ---')
{
  postPolicy = 'ok'
  const before = postCalls
  const sm = new SyncManager(cwd)
  const r = await sm.resolve(CN, 'keep-local')
  assert(r.ok === true && r.resolved === true, `keep-local 成功（实得 ${JSON.stringify(r)}）`)
  assert(postCalls === before + 1, `重推恰好一次 POST（before=${before} after=${postCalls}）`)
  assert(!existsSync(specConflictPath), '冲突文件已清除')
  assert((r.reason || '').includes('spec'), `reason 提及 spec 树处置（${r.reason}）`)
}

// ── 4. keep-local 重推仍冲突：文件保留 ──
console.log('\n--- 4. keep-local 重推仍冲突 → 冲突文件保留 ---')
{
  postPolicy = 'conflict'
  // 冲突粒度收窄后（坑 quicksync-conflict-granularity）：内容未变的文件不再制造冲突
  // （自动跟随服务器）——复现「重推仍冲突」需本地真实改动触发内容级真冲突
  writeFileSync(join(cwd, '.sillyspec', 'a.md'), 'local version content scenario4 edit\n')
  await syncSpecTree(join(cwd, '.sillyspec'), { url: mockUrl, token: 'tok' }, CN)
  assert(existsSync(specConflictPath), '复现冲突文件')
  const sm = new SyncManager(cwd)
  const r = await sm.resolve(CN, 'keep-local')
  assert(existsSync(specConflictPath), '重推仍冲突 → 文件保留待下次裁决')
  assert((r.reason || '').includes('仍') || (r.reason || '').includes('保留'), `reason 说明未收敛（${r.reason}）`)
}

// ── 5. take-platform：明确不支持（fail-closed）──
console.log('\n--- 5. resolve --take-platform → spec 树不支持，明确报错 ---')
{
  const sm = new SyncManager(cwd)
  const r = await sm.resolve(CN, 'take-platform')
  assert(r.ok === false, 'take-platform 对 spec 冲突 fail-closed')
  assert((r.reason || '').includes('下载') || (r.reason || '').includes('不支持'), `reason 说明原因与出路（${r.reason}）`)
  assert(existsSync(specConflictPath), '冲突文件未被误清')
}

// ── 6. abort：只清标记 ──
console.log('\n--- 6. resolve --abort → 清标记，本地不变 ---')
{
  const sm = new SyncManager(cwd)
  const r = await sm.resolve(CN, 'abort')
  assert(r.ok === true && r.resolved === true, 'abort 成功')
  assert(!existsSync(specConflictPath), '冲突文件已清')
  assert(readFileSync(join(cwd, '.sillyspec', 'a.md'), 'utf8') === 'local version content scenario4 edit\n', '本地文件未被改动（场景 4 的真实改动原样保留，abort 不碰内容）')
}

server.closeAllConnections?.()
await new Promise((r) => server.close(r))
rmSync(tmpRoot, { recursive: true, force: true })
console.log(`\n${failures === 0 ? '✅ hub08-spec-sync-conflict 全部通过' : '❌ 存在失败'}（失败 ${failures}）`)
process.exitCode = failures === 0 ? 0 : 1
