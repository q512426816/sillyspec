/**
 * quick 会话归属隔离测试（quick-shared-pointer-stomp，2026-09-19 实证修复）
 *
 * 覆盖：
 *   1. owner 文件路径形态（<runtimeRoot>/quick-sessions/<sid>/owner.json，与 guard.json 同目录）
 *   2. write→read 往返（owner trim、JSON 形态含 at）
 *   3. read：文件缺失 / 坏 JSON / owner 非字符串 / 空白 owner → null（按无 owner 放行）
 *   4. write：入参不全 → false 不抛错（fail-open 创建面）
 *   5. check：owner 文件缺失 → { ok:true, legacy:true }（存量会话放行）
 *   6. check：owner === actor → ok（同会话续用）
 *   7. check：owner !== actor → { ok:false, owner, actor }（事故回归钉——异会话 --done 必拒）
 *   8. check：入参不全 → ok（fail-open，Q7 同立场）
 *
 * 风格：自研 assert（与 quick-test-gate.test.mjs 同），tmp fixture 不引入测试框架。
 */
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

import { quickSessionOwnerPath, readQuickSessionOwner, writeQuickSessionOwner, checkQuickSessionOwner } from '../src/quick-session-owner.js'

let failed = 0
let total = 0

function assert(condition, msg) {
  total++
  if (condition) {
    console.log(`  ✅ PASS: ${msg}`)
  } else {
    failed++
    console.log(`  ❌ FAIL: ${msg}`)
  }
}

const tmpRoots = []
function makeTmpDir(prefix) {
  const dir = mkdtempSync(join(tmpdir(), prefix))
  tmpRoots.push(dir)
  return dir
}

console.log('\n=== quick-session-owner：quick 会话归属隔离 ===\n')

// 1. 路径形态
{
  const p = quickSessionOwnerPath('/rt', 'quick-ab12cd34')
  const norm = p.replace(/\\/g, '/')
  assert(norm === '/rt/quick-sessions/quick-ab12cd34/owner.json', `路径形态 quick-sessions/<sid>/owner.json（实际 ${norm}）`)
}

// 2. write→read 往返
{
  const rt = makeTmpDir('qso-roundtrip-')
  const ok = writeQuickSessionOwner(rt, 'quick-ab12cd34', 'agent-a')
  const owner = readQuickSessionOwner(rt, 'quick-ab12cd34')
  assert(ok === true, 'write 返回 true')
  assert(owner === 'agent-a', `read 回读创建者身份（实际 ${owner}）`)
  const raw = JSON.parse(String.raw`{}`) // 形态由下条直接读文件核
  void raw
  const fs = await import('fs')
  const doc = JSON.parse(fs.readFileSync(join(rt, 'quick-sessions', 'quick-ab12cd34', 'owner.json'), 'utf8'))
  assert(doc.owner === 'agent-a' && typeof doc.at === 'string', 'owner.json 形态含 owner/at')
  // owner trim
  writeQuickSessionOwner(rt, 'quick-ef56ab78', '  agent-b  ')
  assert(readQuickSessionOwner(rt, 'quick-ef56ab78') === 'agent-b', 'owner 写入/读取两侧 trim')
}

// 3. read 异常形态
{
  const rt = makeTmpDir('qso-badread-')
  assert(readQuickSessionOwner(rt, 'quick-none0000') === null, '文件缺失 → null')
  const sid = 'quick-bad00001'
  mkdirSync(join(rt, 'quick-sessions', sid), { recursive: true })
  writeFileSync(join(rt, 'quick-sessions', sid, 'owner.json'), '{not json', 'utf8')
  assert(readQuickSessionOwner(rt, sid) === null, '坏 JSON → null')
  writeFileSync(join(rt, 'quick-sessions', sid, 'owner.json'), JSON.stringify({ owner: 123 }), 'utf8')
  assert(readQuickSessionOwner(rt, sid) === null, 'owner 非字符串 → null')
  writeFileSync(join(rt, 'quick-sessions', sid, 'owner.json'), JSON.stringify({ owner: '   ' }), 'utf8')
  assert(readQuickSessionOwner(rt, sid) === null, 'owner 空白 → null')
}

// 4. write 入参不全
{
  const rt = makeTmpDir('qso-badwrite-')
  assert(writeQuickSessionOwner(null, 'quick-x', 'a') === false, 'runtimeRoot 缺 → false')
  assert(writeQuickSessionOwner(rt, '', 'a') === false, 'sessionId 缺 → false')
  assert(writeQuickSessionOwner(rt, 'quick-x', '  ') === false, 'owner 空白 → false')
}

// 5. check：owner 缺失（存量会话）
{
  const rt = makeTmpDir('qso-legacy-')
  const v = checkQuickSessionOwner(rt, 'quick-old00001', 'agent-a')
  assert(v.ok === true && v.legacy === true, 'owner 文件缺失 → 放行 + legacy 标记')
}

// 6. check：同主
{
  const rt = makeTmpDir('qso-self-')
  writeQuickSessionOwner(rt, 'quick-mine0001', 'agent-a')
  const v = checkQuickSessionOwner(rt, 'quick-mine0001', 'agent-a')
  assert(v.ok === true && v.legacy === undefined, 'owner === actor → 放行（非 legacy）')
}

// 7. check：异主（事故回归钉——2026-09-19 实证：异会话 --done 步进他者会话、QUICKLOG 标题被覆写）
{
  const rt = makeTmpDir('qso-foreign-')
  writeQuickSessionOwner(rt, 'quick-6f06b207', 'agent-owner')
  const v = checkQuickSessionOwner(rt, 'quick-6f06b207', 'zcode-five-cuts')
  assert(v.ok === false, '异会话操作 → 拒绝')
  assert(v.owner === 'agent-owner' && v.actor === 'zcode-five-cuts', `拒绝载荷带 owner/actor（实际 ${v.owner}/${v.actor}）`)
  // 接管语义：显式以 owner 身份操作 → 放行
  const takeover = checkQuickSessionOwner(rt, 'quick-6f06b207', 'agent-owner')
  assert(takeover.ok === true, '显式 --session <owner> 接管 → 放行')
}

// 8. check：入参不全 → fail-open
{
  const v1 = checkQuickSessionOwner(null, 'quick-x', 'a')
  const v2 = checkQuickSessionOwner('/rt', '', 'a')
  const v3 = checkQuickSessionOwner('/rt', 'quick-x', '')
  assert(v1.ok === true && v2.ok === true && v3.ok === true, '入参不全 → 放行（fail-open）')
}

// 清理
for (const d of tmpRoots) {
  try { rmSync(d, { recursive: true, force: true }) } catch { /* best-effort */ }
}

console.log(`\n${failed === 0 ? '✅' : '❌'} quick-session-owner：${total - failed}/${total} 通过\n`)
if (failed > 0) process.exit(1)
