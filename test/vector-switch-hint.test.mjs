/**
 * 向量能力提示（2026-10-15-vector-capability-autodetect 语义；前身 vector-switch-discoverability）
 *
 * 缺省 auto（跟随平台能力）后提示语义随迁：auto 模式没有可执行配置——提示转为**信息性**
 * （探测缓存 unavailable → 「部署后自动启用」）；强制关（用户显式选择）与已启用零说教。
 * 三组锁定：
 *   ① vectorSwitchHint 五态：未连接空/auto 未探测空/auto unavailable 信息性/强制关空/已开空
 *   ② search hint 键：auto+unavailable 在场；未连接缺席
 *   ③ flow 注入零命中行：auto+unavailable 在场；已开零新增
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { vectorSwitchHint } from '../src/knowledge-vector.js'
import { flowKnowledgeDigest } from '../src/flow.js'
import { cmdSearch } from '../src/stages/knowledge.js'

function rmQuiet(p) {
  try { rmSync(p, { recursive: true, force: true }) } catch { /* Windows 句柄迟滞容忍 */ }
}

let MOCK_URL = 'http://127.0.0.1:9' // 默认闭端口（未用 mock server 的用例快速连接拒绝）

function seedRepo({ withPlatform, vectorSearch, capability } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'vec-hint-'))
  mkdirSync(join(root, '.sillyspec', 'knowledge'), { recursive: true })
  writeFileSync(join(root, '.sillyspec', 'knowledge', 'INDEX.md'), '# x\n')
  let yaml = ''
  if (withPlatform) yaml += `platform:\n  url: ${MOCK_URL}\n  token: test-token\n`
  if (vectorSearch) yaml += `knowledge:\n  vector_search: ${vectorSearch}\n`
  if (yaml) writeFileSync(join(root, '.sillyspec', 'local.yaml'), yaml)
  if (capability === 'unavailable') {
    mkdirSync(join(root, '.sillyspec', '.runtime'), { recursive: true })
    writeFileSync(join(root, '.sillyspec', '.runtime', 'vector-capability.json'),
      JSON.stringify({ url: MOCK_URL, available: false, probedAt: Date.now() }))
  }
  return root
}

async function withMock404(fn) {
  const server = createServer((req, res) => { res.writeHead(404).end('not found') })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  MOCK_URL = `http://127.0.0.1:${server.address().port}`
  try {
    return await fn()
  } finally {
    MOCK_URL = 'http://127.0.0.1:9'
    server.close()
  }
}

// ── ① vectorSwitchHint 五态 ───────────────────────────────────────────────────

test('① 五态：未连接空/auto 未探测空/auto unavailable 信息性/强制关空/已开空', async () => {
  await withMock404(async () => {
    const none = seedRepo({ withPlatform: false })
    try {
      assert.equal(vectorSwitchHint(none), '', '平台未连接 → 空串（没平台没得开）')
    } finally { rmQuiet(none) }

    const autoFresh = seedRepo({ withPlatform: true })
    try {
      assert.equal(vectorSwitchHint(autoFresh), '', 'auto+未探测 → 空串（乐观试，无需配置）')
    } finally { rmQuiet(autoFresh) }

    const autoDead = seedRepo({ withPlatform: true, capability: 'unavailable' })
    try {
      const hint = vectorSwitchHint(autoDead)
      assert.ok(hint.includes('自动启用'), 'auto+unavailable → 信息性提示（部署后自动启用）')
      assert.ok(!hint.includes('vector_search'), 'auto 模式无可执行配置（不再指路 local.yaml）')
    } finally { rmQuiet(autoDead) }

    const forcedOff = seedRepo({ withPlatform: true, vectorSearch: 'off' })
    try {
      assert.equal(vectorSwitchHint(forcedOff), '', '强制关（用户显式选择）→ 空串零说教')
    } finally { rmQuiet(forcedOff) }

    const on = seedRepo({ withPlatform: true, vectorSearch: 'on' })
    try {
      assert.equal(vectorSwitchHint(on), '', '已开启 → 空串（开了不用说）')
    } finally { rmQuiet(on) }
  })
})

// ── ② search hint 键 ─────────────────────────────────────────────────────────

test('② search：auto+unavailable 输出信息性 hint 键；未连接无 hint 键', async () => {
  await withMock404(async () => {
    const capture = (fn) => {
      const parts = []
      const orig = console.log
      console.log = (...a) => { parts.push(a.map(String).join(' ')) }
      return fn().finally(() => { console.log = orig }).then(() => parts.join('\n'))
    }

    const dead = seedRepo({ withPlatform: true, capability: 'unavailable' })
    try {
      const out1 = await capture(() => cmdSearch(dead, ['--query', '完全不相关查询词'], {}))
      const json1 = JSON.parse(out1)
      assert.ok(typeof json1.hint === 'string' && json1.hint.includes('自动启用'), `auto+unavailable → hint 键在场（实际 ${out1.slice(0, 200)}）`)
    } finally { rmQuiet(dead) }

    const none = seedRepo({ withPlatform: false })
    try {
      const out2 = await capture(() => cmdSearch(none, ['--query', '完全不相关查询词'], {}))
      const json2 = JSON.parse(out2)
      assert.ok(!('hint' in json2), '平台未连接 → 无 hint 键（零噪音）')
    } finally { rmQuiet(none) }
  })
})

// ── ③ flow 注入零命中行 ───────────────────────────────────────────────────────

test('③ flow 注入零命中：auto+unavailable 追加信息性提示行；已开零新增', async () => {
  await withMock404(async () => {
    const mkChange = (root) => {
      const changeDir = join(root, '.sillyspec', 'changes', '2026-10-15-hint-fixture')
      mkdirSync(changeDir, { recursive: true })
      return changeDir
    }

    const dead = seedRepo({ withPlatform: true, capability: 'unavailable' })
    try {
      const { lines } = await flowKnowledgeDigest({
        specBase: join(dead, '.sillyspec'),
        change: '2026-10-15-hint-fixture',
        changeDir: mkChange(dead),
        input: '完全不相关语料 zero-hit-probe',
        filesOverride: ['src/unrelated.js'],
      })
      assert.ok(lines.join('\n').includes('自动启用'), '零命中+unavailable → 信息性提示行在场')
    } finally { rmQuiet(dead) }

    const on = seedRepo({ withPlatform: true, vectorSearch: 'on' })
    try {
      const { lines } = await flowKnowledgeDigest({
        specBase: join(on, '.sillyspec'),
        change: '2026-10-15-hint-fixture',
        changeDir: mkChange(on),
        input: '完全不相关语料 zero-hit-probe',
        filesOverride: ['src/unrelated.js'],
      })
      assert.ok(!lines.join('\n').includes('自动启用'), '已开启 → 零提示（vector 层静默降级后不重复提示）')
    } finally { rmQuiet(on) }
  })
})
