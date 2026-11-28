/**
 * 2026-11-28-spec-downstream-write-arbitration 回归。
 *
 * 实证：decisions.md 被旧副本覆盖、一分钟后变回，双向抖动。下行覆盖点
 * （resolve --take-platform / pull --spec）此前对本地未同步改动零保护，
 * 且被覆盖路径随后写入基线快照 → 改动被记成「已同步」永久丢失。
 *
 * 断言面：
 *   A. shouldKeepLocal 纯逻辑（forced/missing/clean/local-dirty/no-baseline）；
 *   B. take-platform 集成：本地脏保留 + 基线不重置 + 未改动正常覆盖 + --force 覆盖；
 *   C. pull --spec 集成：整树 rm 前后保留脏文件并写回，--force 旁路。
 */
import http from 'node:http'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { createHash } from 'node:crypto'
import { shouldKeepLocal, readBaseHashes } from '../src/spec-sync-guard.js'
import { SyncManager } from '../src/sync.js'

let failures = 0
const assert = (cond, msg) => {
  if (cond) console.log('  ✅ ' + msg)
  else { console.error('  ❌ ' + msg); failures++ }
}
const sha = (s) => createHash('sha256').update(s).digest('hex')

const tmpRoot = mkdtempSync(join(tmpdir(), `spec-arb-${process.pid}-`))

function makeSpecDir(label) {
  const dir = join(tmpRoot, label)
  mkdirSync(join(dir, '.runtime', 'state'), { recursive: true })
  return dir
}

function writeBase(dir, hashes) {
  // 与 runtimeStatePath 同源：.runtime/state/spec-sync-base.json
  writeFileSync(
    join(dir, '.runtime', 'state', 'spec-sync-base.json'),
    JSON.stringify({ ts: Date.now(), hashes }, null, 2) + '\n',
    'utf8',
  )
}

// ── A. 纯逻辑 ──
console.log('\n--- A. shouldKeepLocal 纯逻辑 ---')
{
  const dir = makeSpecDir('a1')
  writeFileSync(join(dir, 'decisions.md'), 'NEW LOCAL CONTENT\n')
  const base = { 'decisions.md': sha('OLD CONTENT\n') } // 基线是旧内容 → 本地改过
  const g = shouldKeepLocal({ specDir: dir, relPath: 'decisions.md', baseHashes: base })
  assert(g.keep === true && g.reason === 'local-dirty', `本地 hash≠基线 → 保留（实得 ${JSON.stringify(g)}）`)

  const baseSame = { 'decisions.md': sha('NEW LOCAL CONTENT\n') }
  const g2 = shouldKeepLocal({ specDir: dir, relPath: 'decisions.md', baseHashes: baseSame })
  assert(g2.keep === false && g2.reason === 'clean', '本地 hash=基线 → 可覆盖')

  const g3 = shouldKeepLocal({ specDir: dir, relPath: 'decisions.md', baseHashes: base, force: true })
  assert(g3.keep === false && g3.reason === 'forced', '--force → 旁路仲裁')

  const g4 = shouldKeepLocal({ specDir: dir, relPath: 'nope.md', baseHashes: base })
  assert(g4.keep === false && g4.reason === 'missing', '本地无文件 → 不保留')

  const g5 = shouldKeepLocal({ specDir: dir, relPath: 'decisions.md', baseHashes: null })
  assert(g5.keep === true && g5.reason === 'no-baseline', '基线缺失且本地有文件 → 保守保留')

  const g6 = shouldKeepLocal({ specDir: dir, relPath: 'decisions.md', baseHashes: { other: 'x' } })
  assert(g6.keep === true && g6.reason === 'no-baseline', '基线无该路径 → 保守保留')
}

// ── HTTP 桩：spec-bundle（tar）──
function tarEntry(name, content) {
  const data = Buffer.from(content)
  const header = Buffer.alloc(512)
  header.write(name, 0, 100, 'utf8')
  header.write('0000644\0', 100, 8)
  header.write('0000000\0', 108, 8)
  header.write('0000000\0', 116, 8)
  header.write(data.length.toString(8).padStart(11, '0') + '\0', 124, 12)
  header.write('00000000000\0', 136, 12)
  header.write('        ', 148, 8)
  header.write('0', 156, 1)
  header.write('ustar\0', 257, 6)
  header.write('00', 263, 2)
  let sum = 0
  for (const b of header) sum += b
  header.write(sum.toString(8).padStart(6, '0') + '\0 ', 148, 8)
  return Buffer.concat([header, data, Buffer.alloc((512 - (data.length % 512)) % 512)])
}
function makeTar(files) {
  const parts = files.map(([n, c]) => tarEntry(n, c))
  parts.push(Buffer.alloc(1024))
  return Buffer.concat(parts)
}

function startBundleServer(files) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      if (req.url.startsWith('/api/changes/-/spec-bundle')) {
        res.writeHead(200, { 'Content-Type': 'application/octet-stream' })
        res.end(makeTar(files))
        return
      }
      res.writeHead(404); res.end()
    })
    server.listen(0, '127.0.0.1', () => resolve({ server, url: `http://127.0.0.1:${server.address().port}` }))
  })
}

// ── B. take-platform ──
console.log('\n--- B. take-platform 仲裁 ---')
{
  const dir = makeSpecDir('b1')
  writeFileSync(join(dir, 'decisions.md'), 'LOCAL NEW\n') // 本地改过
  writeFileSync(join(dir, 'design.md'), 'SERVER SAME\n') // 本地未改
  writeBase(dir, { 'decisions.md': sha('OLD\n'), 'design.md': sha('SERVER SAME\n') })
  const { server, url } = await startBundleServer([['decisions.md', 'SERVER OLD\n'], ['design.md', 'SERVER SAME\n']])
  try {
    const sm = new SyncManager(dir)
    sm._getPlatform = () => ({ url, token: 't' })
    const r = await sm._takePlatformSpecPaths(dir, ['decisions.md', 'design.md'])
    assert(r.ok === true, 'take-platform 执行成功')
    assert(readFileSync(join(dir, 'decisions.md'), 'utf8') === 'LOCAL NEW\n', '本地脏文件被保留（未被服务器旧版覆盖）')
    assert(readFileSync(join(dir, 'design.md'), 'utf8') === 'SERVER SAME\n', '本地未改动文件正常接受服务器版本')
    assert(r.keptLocal.length === 1 && r.keptLocal[0].path === 'decisions.md', 'keptLocal 名名列 decisions.md')
    const base = readBaseHashes(dir)
    assert(base['decisions.md'] === sha('OLD\n'), `FR-03：保留路径基线不重置（仍为旧基线，实得 ${base['decisions.md']?.slice(0, 8)}…）`)
  } finally { server.close() }
}
{
  const dir = makeSpecDir('b2')
  writeFileSync(join(dir, 'decisions.md'), 'LOCAL NEW\n')
  writeBase(dir, { 'decisions.md': sha('OLD\n') })
  const { server, url } = await startBundleServer([['decisions.md', 'SERVER OLD\n']])
  try {
    const sm = new SyncManager(dir)
    sm._getPlatform = () => ({ url, token: 't' })
    const r = await sm._takePlatformSpecPaths(dir, ['decisions.md'], { force: true })
    assert(r.ok === true && r.keptLocal.length === 0, '--force 不保留')
    assert(readFileSync(join(dir, 'decisions.md'), 'utf8') === 'SERVER OLD\n', '--force 用服务器版本覆盖本地改动')
  } finally { server.close() }
}

// ── C. pull --spec ──
console.log('\n--- C. pull --spec 仲裁 ---')
{
  const dir = makeSpecDir('c1')
  writeFileSync(join(dir, 'decisions.md'), 'LOCAL NEW\n')
  writeFileSync(join(dir, 'other.md'), 'server will replace me\n')
  writeBase(dir, { 'decisions.md': sha('OLD\n'), 'other.md': sha('server will replace me\n') })
  const { server, url } = await startBundleServer([['decisions.md', 'SERVER OLD\n'], ['other.md', 'server will replace me\n']])
  try {
    const sm = new SyncManager(dir)
    sm._getPlatform = () => ({ url, token: 't' })
    // D-001：pull 的 --force 只确认整树替换，仲裁仍生效（force 与 overwriteLocal 分离）
    const r = await sm.pullSpecBundle({ specDir: dir, force: true })
    assert(r.ok === true && r.pulled === true, 'pull（--force 确认整树替换）成功')
    assert(existsSync(join(dir, 'decisions.md')) && readFileSync(join(dir, 'decisions.md'), 'utf8') === 'LOCAL NEW\n',
      '整树覆盖后本地脏文件原样保留（含内容）')
    assert(readFileSync(join(dir, 'other.md'), 'utf8') === 'server will replace me\n', '未改动文件按快照落地')
    assert(Array.isArray(r.keptLocal) && r.keptLocal.length === 1, 'keptLocal 返回 1 条')
  } finally { server.close() }
}
{
  const dir = makeSpecDir('c2')
  writeFileSync(join(dir, 'decisions.md'), 'LOCAL NEW\n')
  writeBase(dir, { 'decisions.md': sha('OLD\n') })
  const { server, url } = await startBundleServer([['decisions.md', 'SERVER OLD\n']])
  try {
    const sm = new SyncManager(dir)
    sm._getPlatform = () => ({ url, token: 't' })
    const r = await sm.pullSpecBundle({ specDir: dir, force: true, overwriteLocal: true })
    assert(r.ok === true, '--overwrite-local pull 成功')
    assert(readFileSync(join(dir, 'decisions.md'), 'utf8') === 'SERVER OLD\n', '--overwrite-local 时整树覆盖语义生效')
  } finally { server.close() }
}

try { rmSync(tmpRoot, { recursive: true, force: true }) } catch { /* 清理 best-effort */ }
console.log(`\n${failures === 0 ? '✅ 全部通过' : `❌ ${failures} 项失败`}`)
process.exit(failures === 0 ? 0 : 1)
