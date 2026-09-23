/**
 * knowledge-inbox（2026-09-23 知识可见性 quick）：知识收件箱三件套。
 *
 * 锁死契约：
 * 1. parseUncategorizedEntries：ql 前缀标题剥离（## ql-xxx | 标题）/裸标题双形态、body 区间、
 *    h1 边界不算条目；
 * 2. buildKnowledgeInboxLines：零条目零输出（清空即静默——降噪钉）；超基线 ⚠️ 形态/基线内 📚 形态；
 *    标题直出前 3 条 + 余量指引行 + classify 用法行；
 * 3. cmdKnowledgeInbox：tmp fixture 上 --json 结构化（count/baseline/over/items 标题与摘要）与
 *    缺文件空态（console 捕获断言）。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { parseUncategorizedEntries, cmdKnowledgeInbox } from '../src/knowledge-classify.js'
import { buildKnowledgeInboxLines } from '../src/run/complete-handlers.js'

const tmpRoots = []
function mk(p) { const d = mkdtempSync(join(tmpdir(), p)); tmpRoots.push(d); return d }
test.after(() => { for (const d of tmpRoots) { try { rmSync(d, { recursive: true, force: true }) } catch {} } })

function captureLogs(fn) {
  const orig = { log: console.log, warn: console.warn }
  const buf = { log: [], warn: [] }
  console.log = (...a) => buf.log.push(a.join(' '))
  console.warn = (...a) => buf.warn.push(a.join(' '))
  try { fn() } finally { console.log = orig.log; console.warn = orig.warn }
  return buf
}

// ── 1. 解析器 ───────────────────────────────────────────────────────

test('T1 parseUncategorizedEntries：ql 前缀/裸标题双形态 + body 区间', () => {
  const content = [
    '# 未分类知识', '',
    '## ql-20260923-011-d859 | Windows 控制台子进程必须 windowsHide', 'detached watcher 闪窗。', '',
    '## 裸标题条目', '正文一。', '正文二。', '',
    '# Another H1 boundary', 'not entry',
  ].join('\n')
  const entries = parseUncategorizedEntries(content)
  assert.equal(entries.length, 2, 'h1 不算条目')
  assert.equal(entries[0].qlIdPrefix, 'ql-20260923-011-d859')
  assert.equal(entries[0].title, 'Windows 控制台子进程必须 windowsHide')
  assert.ok(entries[0].body.includes('闪窗'))
  assert.equal(entries[1].qlIdPrefix, null)
  assert.equal(entries[1].title, '裸标题条目')
  assert.ok(entries[1].body.includes('正文二'))
})

// ── 2. 横幅纯函数 ───────────────────────────────────────────────────

test('T2 buildKnowledgeInboxLines：零输出钉 + 超基线/基线内双形态 + 余量指引', () => {
  assert.deepEqual(buildKnowledgeInboxLines({ count: 0 }), [], '零条目零输出（清空即静默）')
  assert.deepEqual(buildKnowledgeInboxLines({}), [], '无参容忍零输出')

  const over = buildKnowledgeInboxLines({ count: 5, baseline: 3, over: true, titles: ['A', 'B', 'C', 'D'] })
  assert.match(over[0], /⚠️.*待审 5 条.*基线 3/)
  assert.match(over[0], /转达用户/)
  assert.deepEqual(over.slice(1, 4), ['   1. A', '   2. B', '   3. C'], '标题前 3 直出')
  assert.match(over[4], /另 2 条.*knowledge inbox/, '余量指引行')
  assert.match(over[5], /knowledge classify/, '用法行')

  const within = buildKnowledgeInboxLines({ count: 2, baseline: 5, over: false, titles: ['X', 'Y'] })
  assert.match(within[0], /📚.*待审 2 条/)
  assert.ok(!within[0].includes('⚠️'), '基线内不升级警告')
  assert.deepEqual(within.slice(1, 3), ['   1. X', '   2. Y'])
})

// ── 3. inbox 子命令 ─────────────────────────────────────────────────

function fixtureInbox({ baseline = null } = {}) {
  const base = mk('kinbox-')
  mkdirSync(join(base, 'knowledge'), { recursive: true })
  writeFileSync(join(base, 'knowledge', 'uncategorized.md'), [
    '# 未分类知识', '',
    '## 条目甲', '甲的正文摘要内容。', '',
    '## ql-20260923-010-32f9 | 条目乙', '乙的正文。',
  ].join('\n'))
  if (baseline !== null) writeFileSync(join(base, 'knowledge-baseline'), String(baseline))
  return base
}

test('T3 cmdKnowledgeInbox --json：结构化清单（标题/ql/摘要/基线态）', async () => {
  const base = fixtureInbox({ baseline: 1 })
  const buf2 = []
  const orig = console.log
  console.log = (...a) => buf2.push(a.join(' '))
  try { await cmdKnowledgeInbox(base, ['--json'], { specDir: base }) } finally { console.log = orig }
  const parsed = JSON.parse(buf2.join('\n'))
  assert.equal(parsed.ok, true)
  assert.equal(parsed.inbox.count, 2)
  assert.equal(parsed.inbox.baseline, 1)
  assert.equal(parsed.inbox.over, true, '2 > 基线 1')
  assert.equal(parsed.inbox.items[1].qlId, 'ql-20260923-010-32f9')
  assert.equal(parsed.inbox.items[1].title, '条目乙')
  assert.ok(parsed.inbox.items[0].summary.includes('甲的正文'))
})

test('T3b cmdKnowledgeInbox 人读形态与空态', async () => {
  const base = fixtureInbox({})
  const buf = []
  const orig = console.log
  console.log = (...a) => buf.push(a.join(' '))
  try { await cmdKnowledgeInbox(base, [], { specDir: base }) } finally { console.log = orig }
  const text = buf.join('\n')
  assert.match(text, /待审 2 条/)
  assert.match(text, /《条目甲》/)
  assert.match(text, /（ql-20260923-010-32f9）/)

  const empty = mk('kinbox-empty-')
  mkdirSync(join(empty, 'knowledge'), { recursive: true })
  const buf2 = []
  console.log = (...a) => buf2.push(a.join(' '))
  try { await cmdKnowledgeInbox(empty, [], { specDir: empty }) } finally { console.log = orig }
  assert.match(buf2.join('\n'), /收件箱：空/)
})
