/**
 * knowledge-vector-observability.test.mjs — 检索观测补盲与向量质量收口
 * （2026-11-05-knowledge-search-observability）
 *
 * 覆盖（三子代理交叉分析第一批改进的验收面）：
 *   FR-01 resolveVectorTimeoutMs：缺省 5000（覆盖 worker 冷启 1~3s）/ env 覆盖 / 非法回落；
 *     env 经 platformVectorRecall 缺省参生效（slow mock + 短 env 实测快降级）
 *   FR-02 buildResultFromPlatform 跨文件同键去重：(id, change) 保最高分；同号不同 change 不误并
 *   FR-03 search 面向量通道透出真实余弦分（vectorScore 替代 keywords∩query 恒 0 错值）；
 *     非 vector 通道 score 口径不变
 *   FR-04 resultChannel 单源判定四通道 + thin-start 零命中 zeroHit 事件
 *   FR-05 cmdSearch 落 type=search 遥测（query/matched/channel/entry_count/matchedFiles 帽 12）
 *
 * fixture：临时 spec 树 + mock 平台服务器（同 test/knowledge-vector-recall.test.mjs 先例）。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import {
  resolveVectorTimeoutMs,
  resultChannel,
  buildResultFromPlatform,
  platformVectorRecall,
} from '../src/knowledge-vector.js'
import { buildSearchMatches } from '../src/stages/knowledge.js'
import { cmdSearch } from '../src/stages/knowledge.js'
import { readKnowledgeHits } from '../src/knowledge-hits.js'

function rmQuiet(p) {
  try { rmSync(p, { recursive: true, force: true }) } catch { /* Windows EPERM 可接受 */ }
}

/** mock 平台服务器：mode = ok | slow。 */
function mockPlatform(mode, results) {
  const server = createServer((req, res) => {
    if (mode === 'slow') { setTimeout(() => res.writeHead(200, { 'content-type': 'application/json' }).end('{}'), 5000); return }
    let body = ''
    req.on('data', (c) => { body += c })
    req.on('end', () => {
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ ok: true, results }))
    })
  })
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () =>
    resolve({ server, url: `http://127.0.0.1:${server.address().port}` })))
}

async function withMock(mode, results, fn) {
  const m = await mockPlatform(mode, results)
  try { return await fn(m) } finally { m.server.close() }
}

/** 造临时 spec 树：knowledge/ 语料 + 可选 local.yaml platform 段。 */
function seedSpecBase() {
  const root = mkdtempSync(join(tmpdir(), 'ss-obs-'))
  const specBase = join(root, '.sillyspec')
  mkdirSync(join(specBase, 'knowledge', 'decisions'), { recursive: true })
  writeFileSync(join(specBase, 'knowledge', 'INDEX.md'), [
    '# Knowledge Index', '',
    '## Known Issues',
    '- 决策 → [决策坑](demo.md#决策坑锚点)', '',
    '## Decisions',
    '- core-engine|decision → [decisions/core-engine.md](decisions/core-engine.md)',
    '- backend → [decisions/backend.md](decisions/backend.md)', '',
  ].join('\n'))
  writeFileSync(join(specBase, 'knowledge', 'demo.md'), '# demo\n\n决策坑正文行。\n')
  writeFileSync(join(specBase, 'knowledge', 'decisions', 'core-engine.md'), [
    '# 决策知识 — core-engine', '',
    '## D-001@v1 枚举开放世界是错误方向',
    '变更：chg-x',
    '状态：implemented',
    '理由：教训。死路：枚举更多桶——穷举错误不因规模变小而变对，弃。', '',
    '## D-002@v1 拆分谓词守卫收窄',
    '状态：implemented',
    '理由：谓词词表漏词——不拆优于误拆。', '',
  ].join('\n'))
  // 跨文件同键副本夹具（FR-02）：backend.md 存同 (D-001@v1, chg-x) 副本 + 同号不同 change 条目
  writeFileSync(join(specBase, 'knowledge', 'decisions', 'backend.md'), [
    '# 决策知识 — backend', '',
    '## D-001@v1 枚举开放世界是错误方向',
    '变更：chg-x',
    '状态：implemented',
    '理由：蒸馏 fanout 副本（epoch 迁移遗留形态）。', '',
    '## D-001@v1 枚举开放世界是错误方向',
    '变更：chg-y',
    '状态：implemented',
    '理由：同号跨变更条目（诚实形态，不得误并）。', '',
  ].join('\n'))
  return { root, specBase, kb: join(specBase, 'knowledge') }
}

// ── FR-01 超时预算 ────────────────────────────────────────────────────────────

test('FR-01 resolveVectorTimeoutMs：缺省 5000／env 覆盖／非法回落', () => {
  assert.equal(resolveVectorTimeoutMs({}), 5000, '缺省 5000（覆盖 worker 冷启 1~3s）')
  assert.equal(resolveVectorTimeoutMs({ SILLYSPEC_KNOWLEDGE_VECTOR_TIMEOUT_MS: '8000' }), 8000, 'env 正整数覆盖')
  assert.equal(resolveVectorTimeoutMs({ SILLYSPEC_KNOWLEDGE_VECTOR_TIMEOUT_MS: 'abc' }), 5000, '非数字回落')
  assert.equal(resolveVectorTimeoutMs({ SILLYSPEC_KNOWLEDGE_VECTOR_TIMEOUT_MS: '0' }), 5000, '0 回落')
  assert.equal(resolveVectorTimeoutMs({ SILLYSPEC_KNOWLEDGE_VECTOR_TIMEOUT_MS: '-1' }), 5000, '负数回落')
  assert.equal(resolveVectorTimeoutMs({ SILLYSPEC_KNOWLEDGE_VECTOR_TIMEOUT_MS: '1.5' }), 5000, '非整数回落')
})

test('FR-01 env 经 platformVectorRecall 缺省参生效（slow mock + 短 env 快降级）', async () => {
  await withMock('slow', [], async (m) => {
    const root = mkdtempSync(join(tmpdir(), 'ss-obs-to-'))
    mkdirSync(join(root, '.sillyspec'), { recursive: true })
    writeFileSync(join(root, '.sillyspec', 'local.yaml'),
      `project:\n  type: generic\nplatform:\n  url: ${m.url}\n  token: test-token\nknowledge:\n  vector_search: on\n`)
    process.env.SILLYSPEC_KNOWLEDGE_VECTOR_TIMEOUT_MS = '150'
    const t0 = Date.now()
    try {
      const pv = await platformVectorRecall({ cwd: root, query: '谓词' }) // 不显式传 timeoutMs → 走 env
      const elapsed = Date.now() - t0
      assert.equal(pv, null, 'env 短预算超时 → null 降级')
      assert.ok(elapsed < 2000, `按 env 150ms 量级放弃（实际 ${elapsed}ms——用了 5s 缺省？）`)
    } finally {
      delete process.env.SILLYSPEC_KNOWLEDGE_VECTOR_TIMEOUT_MS
      rmQuiet(root)
    }
  })
})

// ── FR-02 跨文件同键去重 ─────────────────────────────────────────────────────

test('FR-02 buildResultFromPlatform 跨文件同键去重保最高分；同号不同 change 不误并', () => {
  const { root, kb } = seedSpecBase()
  try {
    const out = buildResultFromPlatform(kb, [
      { spec_path: 'knowledge/decisions/core-engine.md', anchor: 'D-001@v1', change: 'chg-x', score: 0.61 },
      { spec_path: 'knowledge/decisions/backend.md', anchor: 'D-001@v1', change: 'chg-x', score: 0.58 },
      { spec_path: 'knowledge/decisions/backend.md', anchor: 'D-001@v1', change: 'chg-y', score: 0.3 },
      { spec_path: 'knowledge/decisions/core-engine.md', anchor: 'D-002@v1', score: 0.55 },
    ])
    assert.ok(out && out.matched, '命中面在场')
    const dup = out.decisionHits.filter((h) => h.id === 'D-001@v1' && h.change === 'chg-x')
    assert.equal(dup.length, 1, `同 (id, change) 副本仅留 1 条（实际 ${dup.length}）`)
    assert.equal(dup[0].score, 0.61, '保分高副本')
    assert.equal(dup[0].file, 'decisions/core-engine.md', '保留高分来源文件')
    assert.ok(out.decisionHits.some((h) => h.id === 'D-001@v1' && h.change === 'chg-y'),
      '同号不同 change（跨变更诚实形态）不误并')
    assert.ok(out.decisionHits.some((h) => h.id === 'D-002@v1'), '无 change 结果键入空串槽不并他人')
    assert.equal(out.decisionHits.length, 3, `去重后恰 3 条（实际 ${out.decisionHits.length}）`)
  } finally { rmQuiet(root) }
})

// ── FR-03 真实分透出 ─────────────────────────────────────────────────────────

test('FR-03 search 面向量通道透出真实余弦分；非 vector 通道口径不变', () => {
  const { root, kb } = seedSpecBase()
  try {
    const out = buildResultFromPlatform(kb, [
      { spec_path: 'knowledge/decisions/core-engine.md', anchor: 'D-002@v1', score: 0.665 },
      { spec_path: 'knowledge/decisions/backend.md', anchor: 'D-001@v1', change: 'chg-x', score: 0.61 },
    ])
    assert.equal(typeof out.entries[0].vectorScore, 'number', '文件级 entry 挂 vectorScore')
    const matches = buildSearchMatches(out, kb, 10, '方案：顿号行内切分与谓词守卫扩展')
    const vec = matches.find((m) => m.channel === 'vector')
    assert.ok(vec, 'vector 通道条目在场')
    assert.equal(vec.score, vec.vectorScore || 0.665, 'score=真实余弦分（buildSearchMatches 透出）')
    assert.equal(typeof vec.score, 'number', '分数为数字')
    // 非 vector 通道口径不变：构造 routing 形态 result，score 仍为关键词命中计数
    const routingResult = { matched: true, json: {}, entries: [{ file: 'INDEX.md', display: 'x', keywords: ['core-engine', '决策'], category: 'Decisions' }] }
    const rMatch = buildSearchMatches(routingResult, kb, 10, '这个决策怎么处理')[0]
    assert.equal(rMatch.channel, 'routing', 'routing 通道判定')
    assert.equal(rMatch.score, 1, 'routing score=关键词命中数（口径不变）')
  } finally { rmQuiet(root) }
})

// ── FR-04 resultChannel 单源 + 零命中事件 ────────────────────────────────────

test('FR-04 resultChannel 四通道单源判定', () => {
  assert.equal(resultChannel({ json: { fallback: true } }), 'fallback')
  assert.equal(resultChannel({ json: { vector: true } }), 'vector')
  assert.equal(resultChannel({ json: { scope: true } }), 'scope')
  assert.equal(resultChannel({ json: {} }), 'routing')
  assert.equal(resultChannel({}), 'routing', '无 json 缺省 routing')
  assert.equal(resultChannel(null), 'routing', '空对象防御')
})

test('FR-04 thin-start 零命中落 zeroHit 事件（matchedFiles 空不污染 stats）', async () => {
  const { flowKnowledgeDigest } = await import('../src/flow.js')
  const { root, specBase, kb } = seedSpecBase()
  const changeDir = join(specBase, 'changes', '2026-11-05-obs-fixture')
  mkdirSync(changeDir, { recursive: true })
  // 换成无路由命中面的 INDEX（零命中夹具）
  writeFileSync(join(kb, 'INDEX.md'), '# Knowledge Index\n\n## Decisions\n', 'utf8')
  try {
    const { lines } = await flowKnowledgeDigest({
      specBase, change: '2026-11-05-obs-fixture', changeDir,
      input: '完全不相关语料 qzwxec',
    })
    const events = readKnowledgeHits(join(specBase, '.runtime')).filter((h) => h.type === 'inject')
    assert.equal(events.length, 1, `零命中恰落一条（实际 ${events.length}）`)
    assert.equal(events[0].zeroHit, true, 'zeroHit 标记')
    assert.deepEqual(events[0].matchedFiles, [], 'matchedFiles 空')
    assert.ok(typeof events[0].channel === 'string' && events[0].channel.length > 0, 'channel 在场')
    assert.ok(lines.some((l) => /语料未命中知识库/.test(l)), '注入本体照常出零命中行')
  } finally { rmQuiet(root) }
})

// ── FR-05 search 面遥测 ──────────────────────────────────────────────────────

test('FR-05 cmdSearch 落 type=search 遥测（matched/channel/entry_count）', async () => {
  const { root, specBase, kb } = seedSpecBase()
  const origLog = console.log
  console.log = () => {} // output() 打印静音（遥测断言不依赖 stdout）
  try {
    await cmdSearch(root, ['--query', '这个决策怎么处理'], { specDir: specBase })
    const events = readKnowledgeHits(join(specBase, '.runtime')).filter((h) => h.type === 'search')
    assert.equal(events.length, 1, `恰落一条 search 事件（实际 ${events.length}）`)
    const ev = events[0]
    assert.equal(ev.query, '这个决策怎么处理', 'query 记录')
    assert.equal(ev.matched, true, 'matched 记录')
    assert.equal(ev.channel, 'routing', 'channel=routing（顶层文件路由行 tag「决策」命中 entries 面）')
    assert.ok(typeof ev.entry_count === 'number' && ev.entry_count > 0, 'entry_count 记录')
    assert.ok(Array.isArray(ev.matchedFiles) && ev.matchedFiles.length > 0, 'matchedFiles 锚点记录')
  } finally {
    console.log = origLog
    rmQuiet(root)
  }
})
