/**
 * spec-sync 失败可观测性护栏回归（2026-10-16 生产索引损坏事故）：
 *
 * 事故：平台 422 业务错误只打状态码（真因 HTTP_422_SPEC_BUNDLE_INVALID+具体路径要手动
 * 重放请求才拿到），且失败走「下次自动重试」无限静默循环——归档半态（本地已归档、平台
 * 仍「进行中」）挂数小时无人知晓。
 *
 * 两道护栏的回归：
 *   A. describeErrorBody——响应体 JSON 解析为 code(+details.path)+message 摘要；非 JSON
 *      截断为原文前 200 字；空体返回空串（纯函数断言）。
 *   B. 连续失败计数——按 label 持久化 .runtime/spec-sync-fail-streak.json；连续 ≥3 次
 *      失败升级 🚨 显式告警（集成断言：本地 mock 平台连续 422 三轮）；任一次成功清零
 *      （集成断言：第 4 轮 mock 改 200，该 label 从计数文件消失）；label 间互不干扰。
 */
import http from 'node:http'
import { createHash } from 'node:crypto'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { syncSpecTree, describeErrorBody, readFailStreak, bumpFailStreak, clearFailStreak } from '../src/spec-sync.js'

let failures = 0
const assert = (cond, msg) => {
  if (cond) console.log('  ✅ ' + msg)
  else { console.error('  ❌ ' + msg); failures++ }
}

// ── A. describeErrorBody 纯函数 ──
console.log('--- A. describeErrorBody 响应体摘要 ---')
{
  const j = JSON.stringify({
    code: 'HTTP_422_SPEC_BUNDLE_INVALID',
    message: '同步包无效：源文件缺失的重命名操作必须携带文件内容。',
    details: { path: 'changes/x/change.patch' },
  })
  const s = describeErrorBody(422, j)
  assert(s.includes('HTTP_422_SPEC_BUNDLE_INVALID'), '含 code')
  assert(s.includes('path=changes/x/change.patch'), '含 details.path')
  assert(s.includes('源文件缺失的重命名操作'), '含 message')
  const s2 = describeErrorBody(500, JSON.stringify({ message: 'boom' }))
  assert(s2.startsWith('HTTP_500') && s2.includes('boom'), '无 code 时回退 HTTP_<status>')
  const s3 = describeErrorBody(502, '<html>Bad Gateway</html>')
  assert(s3 === '<html>Bad Gateway</html>', '非 JSON 截断为原文前 200 字')
  assert(describeErrorBody(422, '') === '', '空体返回空串')
}

// ── B. 连续失败计数（本地 mock 平台）──
const tmpRoot = mkdtempSync(join(tmpdir(), `spec-sync-streak-${process.pid}-`))
const specRoot = join(tmpRoot, '.sillyspec')
mkdirSync(specRoot, { recursive: true })
mkdirSync(join(specRoot, 'knowledge'), { recursive: true })
writeFileSync(join(specRoot, 'knowledge', 'x.md'), '# x\n', 'utf8')

const FAIL_BODY = JSON.stringify({
  code: 'HTTP_422_SPEC_BUNDLE_INVALID',
  message: '同步包无效：源文件缺失的重命名操作必须携带文件内容。',
  details: { path: 'changes/x/change.patch' },
})
let postStatus = 422
let manifestBody = '{}' // 空 manifest → 本地 x.md 恒为 add op；B4 改为含同内容文件触发无差异早退
const server = http.createServer((req, res) => {
  if (req.url.includes('/api/changes/-/spec-manifest')) {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(manifestBody)
    return
  }
  if (req.url.includes('/api/changes/-/spec-sync')) {
    res.writeHead(postStatus, { 'Content-Type': 'application/json' })
    res.end(postStatus === 200
      ? JSON.stringify({ ok: true, new_versions: {}, conflict: false, server_versions: {}, platform_deleted: [] })
      : FAIL_BODY)
    return
  }
  res.writeHead(404)
  res.end()
})
await new Promise((r) => server.listen(0, '127.0.0.1', r))
const mockUrl = `http://127.0.0.1:${server.address().port}`

const realWarn = console.warn
const warns = []
console.warn = (...a) => { warns.push(a.join(' ')) }

console.log('--- B1. 连续 422 三轮：响应体进告警行，第 3 轮升级 🚨 ---')
for (let i = 1; i <= 3; i++) {
  warns.length = 0
  await syncSpecTree(specRoot, { url: mockUrl, token: 'tok' }, 'streak-chg')
  const joined = warns.join('\n')
  assert(joined.includes('HTTP_422_SPEC_BUNDLE_INVALID') && joined.includes('源文件缺失的重命名操作'),
    `第 ${i} 轮告警行含响应体真因（code+message）`)
  const streak = readFailStreak(specRoot)['streak-chg']
  assert(!!streak && streak.count === i, `第 ${i} 轮计数=${streak ? streak.count : '缺失'}`)
  if (i < 3) assert(!joined.includes('🚨'), `第 ${i} 轮未升级（阈值 3）`)
  else assert(joined.includes('已连续 3 次同步失败'), '第 3 轮升级 🚨 显式告警')
}

console.log('--- B2. 成功一轮 → 计数清零 ---')
{
  postStatus = 200
  const r = await syncSpecTree(specRoot, { url: mockUrl, token: 'tok' }, 'streak-chg')
  assert(r.synced >= 1, `成功同步（synced=${r.synced}）`)
  assert(!readFailStreak(specRoot)['streak-chg'], '成功后该 label 计数清零')
  const raw = readFileSync(join(specRoot, '.runtime', 'state', 'spec-sync-fail-streak.json'), 'utf8')
  assert(!raw.includes('streak-chg'), '计数文件不再含该 label')
}

console.log('--- B3. label 隔离（不同变更互不干扰）---')
{
  postStatus = 422
  await syncSpecTree(specRoot, { url: mockUrl, token: 'tok' }, 'other-chg')
  const all = readFailStreak(specRoot)
  assert(all['other-chg'] && all['other-chg'].count === 1, 'other-chg 独立计 1')
}

console.log('--- B4. 无差异早退同样清零（覆盖 bump/clear 直接引用 + 无差异路径）---')
{
  const fileHash = createHash('sha256').update(Buffer.from('# x\n', 'utf8')).digest('hex')
  manifestBody = JSON.stringify({ files: { 'knowledge/x.md': { hash: fileHash, version: 3, exists: true } } })
  bumpFailStreak(specRoot, 'nodiff-chg', '预置失败一')
  bumpFailStreak(specRoot, 'nodiff-chg', '预置失败二')
  assert(readFailStreak(specRoot)['nodiff-chg']?.count === 2, 'bump 直接引用生效（预置计数=2）')
  const r = await syncSpecTree(specRoot, { url: mockUrl, token: 'tok' }, 'nodiff-chg')
  assert(r.synced === 0 && !r.conflict, '无差异早退（synced=0）')
  assert(!readFailStreak(specRoot)['nodiff-chg'], '无差异早退清零该 label')
  clearFailStreak(specRoot, 'nodiff-chg') // 幂等：再清一次不抛
  assert(!readFailStreak(specRoot)['nodiff-chg'], 'clear 对已清 label 幂等')
}

console.warn = realWarn
server.closeAllConnections?.()
await new Promise((r) => server.close(r))
console.log(`\n${failures === 0 ? '✅ spec-sync-fail-streak 全部通过' : '❌ 存在失败'}（失败 ${failures}）`)
process.exitCode = failures === 0 ? 0 : 1
