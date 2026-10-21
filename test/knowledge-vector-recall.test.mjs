/**
 * knowledge-vector-recall.test.mjs — 平台向量召回层（2026-09-29-knowledge-vector-recall）
 *
 * 六面验收（mock 平台服务器按端点契约实现——同时即 SillyHub 侧实现规格）：
 *   ① 命中面：路由零命中＋平台返回候选 → hybrid 返回 vector 结果；条目策略面本地解析
 *      （status/deathPath 来自本地文件，score 来自平台）；同步 matchKnowledge 行为不变；
 *   ② 404（平台端点未实现=今天的真实状态）→ 静默降级本地词片回退；
 *   ③ 服务不可达 → 降级；
 *   ④ 超时 → 降级（短超时实测）；
 *   ⑤ 路由命中 → 平台不被调用（请求计数钉住）；
 *   ⑥ 开关关闭（local.yaml knowledge.vector_search: off / env off）→ 不被调用；
 *   ⑦ 真实库锚点映射：平台返回正域条目锚 → 本地命中对应条目；返回 unmapped 停车场候选 →
 *      丢弃（FR-01，2026-10-21-knowledge-tier-denoise——夹具亦由 unmapped 改 core-engine 正域）。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { mkdirSync, writeFileSync, readFileSync, rmSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { matchKnowledge, matchByRouting } from '../src/knowledge-match.js'
import { matchKnowledgeHybrid, platformVectorRecall } from '../src/knowledge-vector.js'

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const REAL_SPEC = join(REPO_ROOT, '.sillyspec')

function rmQuiet(p) {
  try { rmSync(p, { recursive: true, force: true }) } catch { /* Windows EPERM 可接受 */ }
}

/** mock 平台服务器：mode = ok | 404 | slow；返回 { server, url, requests }。 */
function mockPlatform(mode, results) {
  const requests = []
  const server = createServer((req, res) => {
    requests.push(`${req.method} ${req.url}`)
    if (mode === '404') { res.writeHead(404).end('not found'); return }
    if (mode === 'slow') { setTimeout(() => res.writeHead(200, { 'content-type': 'application/json' }).end('{}'), 5000); return }
    let body = ''
    req.on('data', (c) => { body += c })
    req.on('end', () => {
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ ok: true, results }))
    })
  })
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve({ server, url: `http://127.0.0.1:${server.address().port}`, requests })))
}

/** 造临时仓：本地知识库（无路由命中面的词）＋ local.yaml platform 段指向 mock。
 *  夹具域 core-engine（FR-01 起 unmapped 停车场候选被检索核心丢弃，不能再作向量正例）。 */
function seedRepo(mockUrl) {
  const root = mkdtempSync(join(tmpdir(), 'ss-vec-'))
  mkdirSync(join(root, '.sillyspec', 'knowledge', 'decisions'), { recursive: true })
  writeFileSync(join(root, '.sillyspec', 'knowledge', 'INDEX.md'), [
    '# Knowledge Index', '', '## Decisions',
    '- core-engine|decision|决策 → [decisions/core-engine.md](decisions/core-engine.md)', '',
  ].join('\n'))
  writeFileSync(join(root, '.sillyspec', 'knowledge', 'decisions', 'core-engine.md'), [
    '# 决策知识 — core-engine', '',
    '## D-001@v1 枚举开放世界是错误方向',
    '状态：implemented',
    '理由：教训。死路：枚举更多桶——穷举错误不因规模变小而变对，弃。', '',
    '## D-002@v1 拆分谓词守卫收窄',
    '状态：implemented',
    '理由：谓词词表漏词——不拆优于误拆。', '',
  ].join('\n'))
  writeFileSync(join(root, '.sillyspec', 'local.yaml'),
    `project:\n  type: generic\nplatform:\n  url: ${mockUrl}\n  token: test-token\nknowledge:\n  vector_search: on\n`)
  return root
}

async function withMock(mode, results, fn) {
  const m = await mockPlatform(mode, results)
  try { return await fn(m) } finally { m.server.close() }
}

test('① 命中面：平台候选 → vector 结果＋本地策略面；同步 matchKnowledge 不变', async () => {
  await withMock('ok', [
    { spec_path: 'knowledge/decisions/core-engine.md', anchor: 'D-002@v1', score: 0.91 },
    { spec_path: 'knowledge/decisions/core-engine.md', anchor: 'D-001@v1', score: 0.42 },
  ], async (m) => {
    const root = seedRepo(m.url)
    const kb = join(root, '.sillyspec', 'knowledge')
    const q = '方案：顿号行内切分与谓词守卫扩展'   // 路由 tag（core-engine|decision|决策）不含这些词 → 路由零命中
    assert.equal(matchByRouting(kb, q).matched, false, '前置：路由零命中')
    const km = await matchKnowledgeHybrid(kb, q, { cwd: root })
    assert.equal(km.json.vector, true, 'vector 标记')
    assert.equal(km.decisionHits[0].id, 'D-002@v1', '平台 score 排序生效')
    assert.equal(km.decisionHits[0].score, 0.91, 'score 来自平台')
    assert.equal(km.decisionHits[1].deathPath, true, 'deathPath 本地解析（策略面不外包）')
    // 同步入口行为不变（本地层：不调平台）
    const syncKm = matchKnowledge(kb, q)
    assert.notEqual(syncKm.json && syncKm.json.vector, true, '同步入口不带 vector')
    rmQuiet(root)
  })
})

test('②③④ 降级三面：404／不可达／超时 → 本地词片回退，无异常无 vector 标记', async () => {
  // ② 404（平台端点未实现 = 当前真实平台状态）
  await withMock('404', [], async (m) => {
    const root = seedRepo(m.url)
    const kb = join(root, '.sillyspec', 'knowledge')
    const km = await matchKnowledgeHybrid(kb, '方案：谓词守卫与拆分补齐', { cwd: root })
    assert.equal(km.json.vector, undefined, '404 → 非 vector')
    assert.equal(km.matched, true, '降级到本地词片（谓词 n=2 复现命中）')
    rmQuiet(root)
  })
  // ③ 不可达（占一个不存在端口的 URL）
  {
    const root = seedRepo('http://127.0.0.1:9')   // port 9 = discard，连不上
    const kb = join(root, '.sillyspec', 'knowledge')
    const km = await matchKnowledgeHybrid(kb, '方案：谓词守卫与拆分补齐', { cwd: root, })
    assert.equal(km.json.vector, undefined, '不可达 → 降级')
    rmQuiet(root)
  }
  // ④ 超时（slow mock 5s，timeoutMs 200）
  await withMock('slow', [], async (m) => {
    const root = seedRepo(m.url)
    const pv = await platformVectorRecall({ cwd: root, query: '谓词', timeoutMs: 200 })
    assert.equal(pv, null, '超时 → null（调用方降级）')
    rmQuiet(root)
  })
})

test('⑤⑥ 触发纪律：路由命中不调平台；开关关闭不调平台', async () => {
  await withMock('ok', [{ spec_path: 'knowledge/decisions/core-engine.md', anchor: 'D-001@v1', score: 0.9 }], async (m) => {
    // ⑤ 路由命中：查询含 tag「决策」
    const root = seedRepo(m.url)
    const kb = join(root, '.sillyspec', 'knowledge')
    const km = await matchKnowledgeHybrid(kb, '这个决策怎么处理', { cwd: root })
    assert.equal(km.matched, true, '路由命中')
    assert.equal(km.json.vector, undefined, '路由路径不带 vector')
    assert.equal(m.requests.length, 0, '平台零调用')
    // ⑥ env 关闭 → 零命中也不调平台
    process.env.SILLYSPEC_KNOWLEDGE_VECTOR = 'off'
    try {
      const km2 = await matchKnowledgeHybrid(kb, '方案：顿号行内切分与谓词守卫扩展', { cwd: root })
      assert.equal(m.requests.length, 0, '关闭时零调用')
      assert.equal(km2.json.vector, undefined, '关闭时不走 vector')
    } finally { delete process.env.SILLYSPEC_KNOWLEDGE_VECTOR }
    rmQuiet(root)
  })
})

test('⑦ 真实库锚点映射：正域条目锚 → 本地命中；unmapped 停车场候选 → 丢弃（FR-01）', async () => {
  // 锚迁移稳定（2026-10-14-decision-legacy-renumber 后条目 id 为全局号、旧号在 originId）——
  // 动态查当前号作 mock 锚（顺带钉「向量契约：anchor=本地条目当前 id」等值语义）。
  // FR-01（2026-10-21-knowledge-tier-denoise）起 unmapped 停车场候选被本地策略面丢弃——
  // 正例改用正域条目，unmapped 候选改钉丢弃契约。
  const { pathToFileURL } = await import('node:url')
  const { parseDecisionEntries } = await import(pathToFileURL(join(REPO_ROOT, 'src', 'knowledge-match.js')).href)
  const all = parseDecisionEntries(join(REAL_SPEC, 'knowledge'))
  // 正例取任一正域条目（真实库 rejected 全在停车场——正域均为 implemented，锚点映射语义与状态无关）
  const entry = all.find((h) => !/decisions\/unmapped\.md$/.test(h.file))
  assert.ok(entry, '真实库正域条目在场')
  await withMock('ok', [
    { spec_path: `knowledge/${entry.file}`, anchor: entry.id, change: entry.change || undefined, score: 0.88 },
    { spec_path: 'knowledge/decisions/unmapped.md', anchor: 'D-001@v1', score: 0.99 },
  ], async (m) => {
    const env = { ...process.env, SILLYHUB_PLATFORM_URL: m.url, SILLYHUB_PLATFORM_TOKEN: 'test-token' }
    process.env.SILLYHUB_PLATFORM_URL = env.SILLYHUB_PLATFORM_URL
    process.env.SILLYHUB_PLATFORM_TOKEN = env.SILLYHUB_PLATFORM_TOKEN
    process.env.SILLYSPEC_KNOWLEDGE_VECTOR = 'on' // 真实库 local.yaml 无 vector_search 键——2026-10-15 缺省关后显式开启
    try {
      // 真实库路由命中面广，用路由零命中查询触发 vector 层：
      const km = await matchKnowledgeHybrid(join(REAL_SPEC, 'knowledge'), '帮我把行内顿号并列的标准切开', { cwd: REPO_ROOT })
      assert.equal(km.json.vector, true, '走平台向量层')
      assert.ok(km.decisionHits.some((h) => h.id === entry.id && h.file === entry.file), '正域锚点映射回本地条目')
      assert.ok(km.decisionHits.every((h) => h.file !== 'decisions/unmapped.md'), 'unmapped 停车场候选被丢弃（FR-01）')
      assert.ok(km.decisionHits.every((h) => typeof h.deathPath === 'boolean' || h.status), '策略面字段本地解析在场')
    } finally {
      delete process.env.SILLYHUB_PLATFORM_URL
      delete process.env.SILLYHUB_PLATFORM_TOKEN
      delete process.env.SILLYSPEC_KNOWLEDGE_VECTOR
    }
  })
})

test('⑧ 缺省 auto（2026-10-15-vector-capability-autodetect）：键未写 → 首查探测落缓存，重试窗内零再探测', async () => {
  await withMock('404', [], async (m) => {
    const root = mkdtempSync(join(tmpdir(), 'ss-vec-default-'))
    mkdirSync(join(root, '.sillyspec', 'knowledge', 'decisions'), { recursive: true })
    writeFileSync(join(root, '.sillyspec', 'knowledge', 'INDEX.md'), '# x\n')
    writeFileSync(join(root, '.sillyspec', 'knowledge', 'decisions', 'unmapped.md'), '# d\n\n## D-001@v1 某决策\n状态：implemented\n')
    // platform 段在场、knowledge.vector_search 键未写 = auto（跟随平台能力）
    writeFileSync(join(root, '.sillyspec', 'local.yaml'),
      `project:\n  type: generic\nplatform:\n  url: ${m.url}\n  token: test-token\n`)
    try {
      const kb = join(root, '.sillyspec', 'knowledge')
      const km1 = await matchKnowledgeHybrid(kb, '完全不在路由词表的查询串', { cwd: root })
      assert.equal(m.requests.length, 1, `首查真实探测 1 次（实际 ${m.requests.length}）`)
      assert.notEqual(km1.json && km1.json.vector, true, '404 → 本地回退无 vector 标记')
      const capPath = join(root, '.sillyspec', '.runtime', 'state', 'vector-capability.json')
      const cap = JSON.parse(readFileSync(capPath, 'utf-8'))
      assert.equal(cap.available, false, '404 → 能力缓存 unavailable 落盘（跨进程持久）')
      assert.equal(cap.url, m.url, '缓存按平台 URL 键')
      // 同仓第二次检索：缓存重试窗内 → 零新增请求
      await matchKnowledgeHybrid(kb, '另一个不在词表的查询串', { cwd: root })
      assert.equal(m.requests.length, 1, '重试窗内缓存判定 → 零探测')
      // yaml off 逃生阀：强制关（即使缓存过期也零调用）
      writeFileSync(join(root, '.sillyspec', 'local.yaml'),
        `project:\n  type: generic\nplatform:\n  url: ${m.url}\n  token: test-token\nknowledge:\n  vector_search: off\n`)
      await matchKnowledgeHybrid(kb, '第三个查询串', { cwd: root })
      assert.equal(m.requests.length, 1, 'yaml off 强制关零调用')
    } finally { rmQuiet(root) }
  })
})

test('⑩ 过期能力缓存：probedAt 超过重试窗 → 重新探测（平台部署后自动启用）', async () => {
  await withMock('ok', [
    { spec_path: 'knowledge/decisions/core-engine.md', anchor: 'D-001@v1', score: 0.9 },
  ], async (m) => {
    const root = mkdtempSync(join(tmpdir(), 'ss-vec-stale-'))
    mkdirSync(join(root, '.sillyspec', 'knowledge', 'decisions'), { recursive: true })
    writeFileSync(join(root, '.sillyspec', 'knowledge', 'INDEX.md'), [
      '# Knowledge Index', '', '## Decisions',
      '- core-engine|decision|决策 → [decisions/core-engine.md](decisions/core-engine.md)', '',
    ].join('\n'))
    writeFileSync(join(root, '.sillyspec', 'knowledge', 'decisions', 'core-engine.md'), '# d\n\n## D-001@v1 某决策\n状态：implemented\n')
    writeFileSync(join(root, '.sillyspec', 'local.yaml'),
      `project:\n  type: generic\nplatform:\n  url: ${m.url}\n  token: test-token\n`)
    // 预置过期 unavailable 缓存（probedAt = 2h 前）
    mkdirSync(join(root, '.sillyspec', '.runtime'), { recursive: true })
    mkdirSync(join(root, '.sillyspec', '.runtime', 'state'), { recursive: true })
    writeFileSync(join(root, '.sillyspec', '.runtime', 'state', 'vector-capability.json'),
      JSON.stringify({ url: m.url, available: false, probedAt: Date.now() - 2 * 60 * 60 * 1000 }))
    try {
      const kb = join(root, '.sillyspec', 'knowledge')
      const km = await matchKnowledgeHybrid(kb, '完全不在路由词表的查询串', { cwd: root })
      assert.equal(m.requests.length, 1, '过期缓存 → 重新探测 1 次')
      assert.equal(km.json.vector, true, '平台已实现端点 → vector 结果（部署后自动启用实证）')
      const cap = JSON.parse(readFileSync(join(root, '.sillyspec', '.runtime', 'state', 'vector-capability.json'), 'utf-8'))
      assert.equal(cap.available, true, '成功 → 缓存翻 available')
    } finally { rmQuiet(root) }
  })
})

test('⑨ 404 进程级短路：同平台 URL 首次 404 标记死信，第二次调用零网络请求', async () => {
  await withMock('404', [], async (m) => {
    const root = mkdtempSync(join(tmpdir(), 'ss-vec-dead-'))
    mkdirSync(join(root, '.sillyspec', 'knowledge'), { recursive: true })
    writeFileSync(join(root, '.sillyspec', 'knowledge', 'INDEX.md'), '# x\n')
    writeFileSync(join(root, '.sillyspec', 'local.yaml'),
      `project:\n  type: generic\nplatform:\n  url: ${m.url}\n  token: test-token\nknowledge:\n  vector_search: on\n`)
    try {
      const kb = join(root, '.sillyspec', 'knowledge')
      const q = '完全不在路由词表的查询串'
      await matchKnowledgeHybrid(kb, q + ' 第一轮', { cwd: root })
      assert.equal(m.requests.length, 1, '首轮真实请求 1 次')
      await matchKnowledgeHybrid(kb, q + ' 第二轮', { cwd: root })
      assert.equal(m.requests.length, 1, '死信短路：第二轮零新增请求')
    } finally { rmQuiet(root) }
  })
})
