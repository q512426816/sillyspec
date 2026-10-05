/**
 * 2026-09-27-confirm-on-use 防回归（三层治理①层：消费时确认）：
 * ① readEntryUnconfirmed：candidate/null 行计数、agent 行不计、无绑定块 0
 * ② readActiveFrDigest.unconfirmed 透传
 * ③ 注入面（flowKnowledgeDigest）：⚪N未确认标记 + 抽查确认提示（至多 2 个 anchor、带 tests confirm 指引）
 * ④ CLI tests --confirm：证据可解析→candidate 批量翻 active（confirmed_by=agent@HEAD）；
 *    幂等（全 active 提示不写）；证据不可解析拒绝 exit 1；无绑定行拒绝
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { execFileSync } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname } from 'node:path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const frIndex = await import(pathToFileURL(join(ROOT, 'src', 'fr-index.js')).href)
const { readEntryUnconfirmed, readActiveFrDigest } = frIndex
const { flowKnowledgeDigest } = await import(pathToFileURL(join(ROOT, 'src', 'flow.js')).href)

const tmpRoots = []
function mk(p) { const d = mkdtempSync(join(tmpdir(), p)); tmpRoots.push(d); return d }
test.after(() => { for (const d of tmpRoots) { try { rmSync(d, { recursive: true, force: true }) } catch {} } })
const NL = String.fromCharCode(10)

function fixture({ confirmed = false } = {}) {
  const root = mk('cou-')
  const specBase = join(root, '.sillyspec')
  const knowledge = join(specBase, 'knowledge')
  mkdirSync(join(knowledge, 'fr'), { recursive: true })
  mkdirSync(join(specBase, 'docs', 'proj', 'modules'), { recursive: true })
  mkdirSync(join(root, 'test'), { recursive: true })
  writeFileSync(join(specBase, 'docs', 'proj', 'modules', '_module-map.yaml'), 'modules:' + NL + '  core:' + NL + '    paths:' + NL + '      - src/')
  writeFileSync(join(root, 'test', 'a.test.mjs'), "import { test } from 'node:test'" + NL + "test('a', () => {})" + NL)
  writeFileSync(join(knowledge, 'fr', 'core.md'), [
    '---', 'author: t', '---', '', '# FR 索引 — core', '',
    '## FR-core-001 行为一', '变更：hist-a', '状态：active', '摘要：默认场景', '',
    '测试绑定：', '<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->',
    '- row: hist-a:task-01:FR-01',
    '  tests: test/a.test.mjs',
    '  reason: spec',
    `  state: ${confirmed ? 'active' : 'candidate'}`,
    '  discovery: machine',
    `  confirmed_by: ${confirmed ? 'agent' : 'null'}`,
    `  confirmed_at: ${confirmed ? 'abc123' : 'null'}`, '',
  ].join(NL) + NL)
  return { root, specBase, knowledge }
}

test('① readEntryUnconfirmed：candidate 行计 1、agent 行计 0、无绑定块 0', () => {
  const { knowledge } = fixture({})
  const text = readFileSync(join(knowledge, 'fr', 'core.md'), 'utf8')
  const lines = text.split(NL)
  assert.equal(readEntryUnconfirmed(lines), 1, 'candidate/null 行计 1')
  const c = fixture({ confirmed: true })
  const t2 = readFileSync(join(c.knowledge, 'fr', 'core.md'), 'utf8')
  assert.equal(readEntryUnconfirmed(t2.split(NL)), 0, 'confirmed_by=agent 行不计')
  const noBind = ['## FR-core-001 x', '状态：active']
  assert.equal(readEntryUnconfirmed(noBind), 0, '无绑定块 0')
})

test('②③ 注入面：unconfirmed 透传 + ⚪ 标记 + 抽查提示（至多 2、带 confirm 指引）', async () => {
  const f = fixture({})
  const r = await flowKnowledgeDigest({ specBase: f.specBase, change: 'c1', changeDir: join(f.specBase, 'changes', 'c1'), filesOverride: ['src/a.js'] })
  const digest = r.lines.join(NL)
  assert.match(digest, /FR-core-001 .*⚪1未确认绑定/, '条目带 ⚪1未确认 标记')
  assert.match(digest, /抽查确认（至多 [12] 条.*FR-core-001/, '抽查提示点名未确认 anchor')
  assert.match(digest, /tests --confirm --anchor <id> --evidence/, '提示带 confirm 指引（flag 形态，2026-10-05-tests-confirm-hint 修正）')
  const digest2 = readActiveFrDigest(f.knowledge, ['core'])
  assert.equal(digest2[0].unconfirmed, 1, 'readActiveFrDigest.unconfirmed 透传')
  // 确认后：标记消失、无抽查提示
  const f2 = fixture({ confirmed: true })
  const r2 = await flowKnowledgeDigest({ specBase: f2.specBase, change: 'c1', changeDir: join(f2.specBase, 'changes', 'c1'), filesOverride: ['src/a.js'] })
  const d2 = r2.lines.join(NL)
  assert.ok(!/未确认绑定/.test(d2), '确认后无 ⚪ 标记')
  assert.ok(!/抽查确认/.test(d2), '确认后无抽查提示')
})

test('④ CLI tests --confirm：证据解析→翻 active；幂等；坏证据/无行拒绝', () => {
  const f = fixture({})
  const bin = join(ROOT, 'bin', 'sillyspec.js')
  const run = (args) => execFileSync('node', [bin, ...args], { cwd: f.root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })

  // 坏证据 → exit 1
  let refused = false
  try { run(['tests', '--confirm', '--anchor', 'FR-core-001', '--evidence', 'nope.test.mjs']) } catch (e) { refused = e.status === 1 && /必须是盘上真实测试文件/.test(e.stderr || '') }
  assert.ok(refused, '证据不可解析/非测试形态拒绝 exit 1（防橡皮图章）')

  // 好证据 → 翻牌
  const out = run(['tests', '--confirm', '--anchor', 'FR-core-001', '--evidence', 'test/a.test.mjs'])
  assert.match(out, /确认翻牌：FR-core-001 1\/1 行 candidate→active/, 'candidate 翻 active')
  assert.match(out, /confirmed_by=agent/, 'confirmed_by=agent 落盘')
  const after = readFileSync(join(f.knowledge, 'fr', 'core.md'), 'utf8')
  assert.match(after, /state: active/, '盘上 state=active')
  assert.match(after, /confirmed_by: agent/, '盘上 confirmed_by=agent')

  // 幂等
  const out2 = run(['tests', '--confirm', '--anchor', 'FR-core-001', '--evidence', 'test/a.test.mjs'])
  assert.match(out2, /已 active（幂等，无需确认）/, '幂等提示')

  // 非测试形态盘上文件（评审 P2-1 防回归：package.json 在场但不得作证据）
  writeFileSync(join(f.root, 'package.json'), '{}')
  let notTest = false
  try { run(['tests', '--confirm', '--anchor', 'FR-core-001', '--evidence', 'package.json']) } catch (e) { notTest = e.status === 1 && /必须是盘上真实测试文件/.test(e.stderr || '') }
  assert.ok(notTest, '非测试形态文件拒绝（package.json/win.ini 类不再放行）')
  // 无绑定行 anchor
  let noRows = false
  try { run(['tests', '--confirm', '--anchor', 'FR-core-999', '--evidence', 'test/a.test.mjs']) } catch (e) { noRows = e.status === 1 && /无绑定行/.test(e.stderr || '') }
  assert.ok(noRows, '无绑定行拒绝')
})
