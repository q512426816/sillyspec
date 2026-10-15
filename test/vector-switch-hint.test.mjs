/**
 * 向量开关发现性提示（2026-10-15-vector-switch-discoverability）
 *
 * 背景：knowledge.vector_search 收紧缺省关（2026-10-15-vector-gate-tighten）后，新项目
 * agent 无从知晓开关存在。三触点补发现性：
 *   ① config-schema 注册 live 键 + renderExample knowledge 段（init 自文档，防漂耦合测试钉）
 *   ② vectorSwitchHint(cwd) 单源提示（本文件 ①组：三态锁定）
 *   ③ 双消费面：knowledge search 输出 hint 键（②组）、flow 注入零命中行（③组）
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

/** 造仓：local.yaml 可选 platform 段（mock URL）+ knowledge 段可选 vector_search。 */
function seedRepo({ withPlatform, vectorSearch } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'vec-hint-'))
  mkdirSync(join(root, '.sillyspec', 'knowledge'), { recursive: true })
  writeFileSync(join(root, '.sillyspec', 'knowledge', 'INDEX.md'), '# x\n')
  let yaml = ''
  if (withPlatform) {
    yaml += `platform:\n  url: ${MOCK_URL}\n  token: test-token\n`
  }
  if (vectorSearch) {
    yaml += `knowledge:\n  vector_search: ${vectorSearch}\n`
  }
  if (yaml) writeFileSync(join(root, '.sillyspec', 'local.yaml'), yaml)
  return root
}

let MOCK_URL = 'http://127.0.0.1:9' // 默认闭端口（未用 mock server 的用例快速连接拒绝）

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

// ── ① vectorSwitchHint 三态 ───────────────────────────────────────────────────

test('① vectorSwitchHint 三态：未连接空串/已连接未开提示/已开空串', async () => {
  await withMock404(async () => {
    const none = seedRepo({ withPlatform: false })
    try {
      assert.equal(vectorSwitchHint(none), '', '平台未连接 → 空串（没平台没得开）')
    } finally { rmQuiet(none) }

    const off = seedRepo({ withPlatform: true })
    try {
      const hint = vectorSwitchHint(off)
      assert.ok(hint.includes('vector_search: on'), '已连接未开 → 提示含可执行配置形态')
      assert.ok(hint.includes('缺省关'), '提示注明缺省关语义')
    } finally { rmQuiet(off) }

    const on = seedRepo({ withPlatform: true, vectorSearch: 'on' })
    try {
      assert.equal(vectorSwitchHint(on), '', '已开启 → 空串（开了不用说）')
    } finally { rmQuiet(on) }
  })
})

// ── ② search hint 键 ─────────────────────────────────────────────────────────

test('② knowledge search：未开+已连接输出 hint 键；未连接无 hint 键', async () => {
  await withMock404(async () => {
    const capture = (fn) => {
      const parts = []
      const orig = console.log
      console.log = (...a) => { parts.push(a.map(String).join(' ')) }
      return fn().finally(() => { console.log = orig }).then(() => parts.join('\n'))
    }

    const off = seedRepo({ withPlatform: true })
    mkdirSync(join(off, '.sillyspec', 'knowledge', 'decisions'), { recursive: true })
    try {
      const out1 = await capture(() => cmdSearch(off, ['--query', '完全不相关查询词'], {}))
      const json1 = JSON.parse(out1)
      assert.ok(typeof json1.hint === 'string' && json1.hint.includes('vector_search: on'), `未开+已连接 → hint 键在场（实际 ${out1.slice(0, 200)}）`)
    } finally { rmQuiet(off) }

    const none = seedRepo({ withPlatform: false })
    try {
      const out2 = await capture(() => cmdSearch(none, ['--query', '完全不相关查询词'], {}))
      const json2 = JSON.parse(out2)
      assert.ok(!('hint' in json2), '平台未连接 → 无 hint 键（零噪音）')
    } finally { rmQuiet(none) }
  })
})

// ── ③ flow 注入零命中行 ───────────────────────────────────────────────────────

test('③ flow 注入零命中：已连接未开追加提示行；已开零新增', async () => {
  await withMock404(async () => {
    const mkChange = (root) => {
      const changeDir = join(root, '.sillyspec', 'changes', '2026-10-15-hint-fixture')
      mkdirSync(changeDir, { recursive: true })
      return changeDir
    }

    const off = seedRepo({ withPlatform: true })
    try {
      const { lines } = await flowKnowledgeDigest({
        specBase: join(off, '.sillyspec'),
        change: '2026-10-15-hint-fixture',
        changeDir: mkChange(off),
        input: '完全不相关语料 zero-hit-probe',
        filesOverride: ['src/unrelated.js'],
      })
      assert.ok(lines.join('\n').includes('vector_search: on'), '零命中+未开 → 提示行在场')
    } finally { rmQuiet(off) }

    const on = seedRepo({ withPlatform: true, vectorSearch: 'on' })
    try {
      const { lines } = await flowKnowledgeDigest({
        specBase: join(on, '.sillyspec'),
        change: '2026-10-15-hint-fixture',
        changeDir: mkChange(on),
        input: '完全不相关语料 zero-hit-probe',
        filesOverride: ['src/unrelated.js'],
      })
      assert.ok(!lines.join('\n').includes('vector_search: on'), '已开启 → 零提示（vector 层静默降级后不重复提示）')
    } finally { rmQuiet(on) }
  })
})
