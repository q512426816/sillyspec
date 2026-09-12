/**
 * backlog 批 E 四项 P3 回归（ql-20260912-009）。
 *
 * 锁行为：
 *  1. spec-sync computeSpecOps：rename hash 索引检测（同内容改名命中 / 同 hash 双候选逐个
 *     消费不重复配对）+ update/add content 由 hashFiles 携带的 buf 取（值与磁盘一致）
 *  2. friction-tally：record/consume 持锁原子（并发 2 record 计数=2；consume 后清零）
 *  3. mcp-server exit 2：合法 envelope 不标 isError（诊断 text 保留）
 *  4. doctor lifecycle 合并由既有 doctor-lifecycle-doc.test.mjs 覆盖（全量含）
 */
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { hashFiles, computeSpecOps } from '../src/spec-sync.js'
import { recordFrictionEvent, consumeFrictionHint } from '../src/friction-tally.js'

const count = { passed: 0, failed: 0, failures: [] }
const assert = (cond, msg) => { cond ? (count.passed++, console.log(`  ✅ PASS: ${msg}`)) : (count.failed++, count.failures.push(msg), console.log(`  ❌ FAIL: ${msg}`)) }
const mkF = (root, rel, content) => {
  const abs = join(root, ...rel.split('/'))
  mkdirSync(dirname(abs), { recursive: true })
  writeFileSync(abs, content)
  return abs
}

console.log('=== ① spec-sync：rename hash 索引 + buf 携带 ===')
{
  const dir = mkdtempSync(join(tmpdir(), 'be-sync-'))
  // rename 场景：旧路径 orig-a.md 只在服务器（本地已不存在）、新路径 renamed-a.md 只在本地，同内容
  mkF(dir, 'docs/renamed-a.md', 'same content A')
  mkF(dir, 'docs/b-same.md', 'unique B')
  mkF(dir, 'docs/changed.md', 'changed v2')
  const localFiles = hashFiles(
    ['docs/renamed-a.md', 'docs/b-same.md', 'docs/changed.md']
      .map((rel) => ({ path: rel, absPath: join(dir, ...rel.split('/')), mtimeMs: Date.now() }))
  )
  const byPath = new Map(localFiles.map((e) => [e.path, e]))
  const server = {
    'docs/orig-a.md': { hash: byPath.get('docs/renamed-a.md').hash, version: 5 },
    'docs/b-same.md': { hash: byPath.get('docs/b-same.md').hash, version: 1 },
    'docs/changed.md': { hash: 'old-hash-changed', version: 2 },
  }
  const ops = computeSpecOps(server, localFiles)
  const renameOps = ops.filter((o) => o.op === 'rename')
  assert(renameOps.length === 1 && renameOps[0].new_path === 'docs/renamed-a.md' && renameOps[0].path === 'docs/orig-a.md',
    `旧路径消失+同内容新路径识别为 rename（${renameOps.map((r) => r.path + '→' + r.new_path).join(',')}）`)
  // 同 hash 双候选消费不重复：服务器两个旧路径 + 本地两个同内容新路径 → 恰好两对
  const dir2 = mkdtempSync(join(tmpdir(), 'be-sync2-'))
  const l2 = hashFiles(['new1.md', 'new2.md'].map((rel) => ({
    path: rel, absPath: mkF(dir2, rel, 'twin'), mtimeMs: Date.now(),
  })))
  const twinHash = l2[0].hash
  const s2 = {
    'old1.md': { hash: twinHash, version: 1 },
    'old2.md': { hash: twinHash, version: 1 },
  }
  const ops2 = computeSpecOps(s2, l2)
  assert(ops2.filter((o) => o.op === 'rename').length === 2,
    `同 hash 双候选两两配对不重复（${ops2.filter((o) => o.op === 'rename').length}/2）`)
  // update content 与磁盘一致（buf 携带路径）
  const upd = ops.find((o) => o.op === 'update' && o.path === 'docs/changed.md')
  assert(upd && Buffer.from(upd.content, 'base64').toString('utf8') === 'changed v2', 'update content 与磁盘一致（buf 携带）')
  rmSync(dir, { recursive: true, force: true }); rmSync(dir2, { recursive: true, force: true })
}

console.log('\n=== ② friction-tally：锁内原子 RMW ===')
{
  const dir = mkdtempSync(join(tmpdir(), 'be-fric-'))
  const cwd = dir
  const opts = { cwd, changeName: '2026-09-12-be', platformOpts: {} }
  // friction hint 默认 enabled（readFrictionHintEnabled fail-open true）——直接并发 2 record
  await Promise.all([
    recordFrictionEvent({ ...opts, type: 'gate_rollback', detail: 'a' }),
    recordFrictionEvent({ ...opts, type: 'gate_rollback', detail: 'b' }),
  ])
  const c1 = await consumeFrictionHint(opts)
  assert(c1.counts.gate_rollback === 2, `并发 2 record 计数=2（实得 ${c1.counts.gate_rollback}——旧版 RMW 竞态丢计数）`)
  const tallyPath = join(dir, '.sillyspec', '.runtime', 'friction', '2026-09-12-be.json')
  assert(!existsSync(tallyPath), 'consume 后计数清零（文件删除）')
  const c2 = await consumeFrictionHint(opts)
  assert(c2.hint === null, '清零后再次 consume 无提示')
  rmSync(dir, { recursive: true, force: true })
}

console.log('\n=== ③ mcp-server exit 2 不标 isError ===')
{
  const { startMcpServer } = await import('../src/mcp-server.js')
  const { PassThrough } = await import('node:stream')
  const input = new PassThrough()
  const output = new PassThrough()
  startMcpServer({ input, output })
  const replies = []
  output.on('data', (d) => { for (const l of String(d).split('\n')) if (l.trim()) replies.push(JSON.parse(l)) })
  // gate 未知阶段 → CLI 用法错 exit 2（EXIT_UNKNOWN 同段）——envelope/文本合法
  input.write(JSON.stringify({ jsonrpc: '2.0', method: 'tools/call', id: 7, params: { name: 'sillyspec_gate', arguments: { stage: 'bogus-stage-x', change: 'no-such' } } }) + '\n')
  let r = null
  for (let i = 0; i < 200 && !r; i++) {
    await new Promise((res) => setTimeout(res, 50))
    r = replies.find((x) => x.id === 7)
  }
  assert(r !== null, '收到回包')
  assert(r?.result?.isError !== true && typeof r?.result?.content?.[0]?.text === 'string' && r.result.content[0].text.length > 0,
    `exit 2 不标 isError 且诊断 text 保留（isError=${r?.result?.isError}，text 前 40 字：${(r?.result?.content?.[0]?.text || '').slice(0, 40)}）`)
}

console.log(`\n${'='.repeat(50)}\n✅ 通过: ${count.passed}  ❌ 失败: ${count.failed}\n${'='.repeat(50)}`)
if (count.failed > 0) process.exit(1)
