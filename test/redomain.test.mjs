/**
 * 2026-09-27-redomain 防回归（三层治理 v2 ③：伪域条目机器迁移）：
 * ① planRedomain 干跑：候选列表/目标在场/源将删空壳判定
 * ② redomainFrEntries：单条 anchor 迁移（ID 不变/绑定块随行/源保留余条）
 * ③ 全域迁移：源空壳删除/目标文件新建/INDEX 路由行补
 * ④ 防线：目标域同 ID 冲突拒/anchor 未命中拒/干跑不落盘
 * ⑤ CLI tests --redomain 端到端（干跑+--write）
 * ⑥⑦ 2026-10-14-redomain-domain-arg-normalize：--from/--to 容忍 fr/ 前缀与 .md
 *    后缀形态（flow done 提示语原样照抄形态）——库层归一 + CLI 端到端等价且回显裸域名
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { planRedomain, redomainFrEntries, normalizeDomainArg } from '../src/redomain.js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const NL = String.fromCharCode(10)
const tmpRoots = []
function mk(p) { const d = mkdtempSync(join(tmpdir(), p)); tmpRoots.push(d); return d }
test.after(() => { for (const d of tmpRoots) { try { rmSync(d, { recursive: true, force: true }) } catch {} } })

function fixture() {
  const root = mk('rd-')
  const knowledgeRoot = join(root, '.sillyspec', 'knowledge')
  mkdirSync(join(knowledgeRoot, 'fr'), { recursive: true })
  writeFileSync(join(knowledgeRoot, 'fr', 'auto-backend.md'), [
    '---', 'author: t', '---', '', '# FR 索引 — auto-backend', '',
    '## FR-auto-backend-019 观测事件折叠区', '变更：hist-a', '状态：active', '',
    '测试绑定：', '<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->',
    '- row: hist-a:task-01:FR-01', '  tests: test/obs.test.mjs', '  reason: spec', '  state: candidate',
    '  discovery: machine', '  confirmed_by: null', '  confirmed_at: null', '',
    '## FR-auto-backend-020 pytest 五组', '变更：hist-a', '状态：active', '',
  ].join(NL) + NL)
  writeFileSync(join(knowledgeRoot, 'fr', 'platform-sync.md'), [
    '---', 'author: t', '---', '', '# FR 索引 — platform-sync', '',
    '## FR-platform-sync-001 既有条目', '变更：hist-b', '状态：active', '',
  ].join(NL) + NL)
  writeFileSync(join(knowledgeRoot, 'INDEX.md'), [
    '# Knowledge Index', '', '## FR 需求索引', '',
    '- auto-backend|backend|FR|需求|承接 → [fr/auto-backend.md](fr/auto-backend.md)',
    '- platform-sync|FR|需求|承接 → [fr/platform-sync.md](fr/platform-sync.md)',
    '',
  ].join(NL) + NL)
  return { root, knowledgeRoot }
}

test('① planRedomain 干跑：候选/目标在场/源保留（单条迁时）', () => {
  const f = fixture()
  const p = planRedomain({ knowledgeRoot: f.knowledgeRoot, from: 'auto-backend', to: 'platform-sync', anchors: ['FR-auto-backend-019'] })
  assert.equal(p.entries.length, 1)
  assert.equal(p.entries[0].id, 'FR-auto-backend-019')
  assert.equal(p.targetExists, true)
  assert.equal(p.sourceWillDelete, false, '单条迁时源域保留余条')
})

test('② 单条 anchor 迁移：ID 不变/绑定块随行/源保留', () => {
  const f = fixture()
  const r = redomainFrEntries({ knowledgeRoot: f.knowledgeRoot, from: 'auto-backend', to: 'platform-sync', anchors: ['FR-auto-backend-019'] })
  assert.equal(r.moved.length, 1)
  assert.equal(r.moved[0].id, 'FR-auto-backend-019', 'ID 不变（身份保持）')
  assert.equal(r.sourceDeleted, false)
  const to = readFileSync(join(f.knowledgeRoot, 'fr', 'platform-sync.md'), 'utf8')
  assert.match(to, /## FR-auto-backend-019 观测事件折叠区/, '条目落目标域')
  assert.match(to, /tests: test\/obs\.test\.mjs/, '绑定块随行')
  assert.match(to, /## FR-platform-sync-001/, '既有条目保留')
  const from = readFileSync(join(f.knowledgeRoot, 'fr', 'auto-backend.md'), 'utf8')
  assert.ok(!from.includes('FR-auto-backend-019'), '源域已切走')
  assert.match(from, /## FR-auto-backend-020/, '余条保留')
})

test('③ 全域迁移：源空壳删除/目标新建（缺席域）/INDEX 补行', () => {
  const f = fixture()
  const r = redomainFrEntries({ knowledgeRoot: f.knowledgeRoot, from: 'auto-backend', to: 'platform-sync' })
  assert.equal(r.moved.length, 2)
  assert.equal(r.sourceDeleted, true, '源空壳删除')
  assert.ok(!existsSync(join(f.knowledgeRoot, 'fr', 'auto-backend.md')), '源文件已删')

  // 目标新建路径：迁到缺席域
  const f2 = fixture()
  const r2 = redomainFrEntries({ knowledgeRoot: f2.knowledgeRoot, from: 'auto-backend', to: 'events-channel' })
  assert.equal(r2.targetCreated, true)
  assert.ok(existsSync(join(f2.knowledgeRoot, 'fr', 'events-channel.md')))
  const idx = readFileSync(join(f2.knowledgeRoot, 'INDEX.md'), 'utf8')
  assert.match(idx, /- events-channel → \[fr\/events-channel\.md\]/, 'INDEX 路由行已补')
})

test('④ 防线：同 ID 冲突拒/anchor 未命中拒/干跑不落盘', () => {
  const f = fixture()
  // 冲突：先把 019 迁过去，再从含同 ID 的源再迁——构造：迁完后再写回源一个同 ID 条目
  redomainFrEntries({ knowledgeRoot: f.knowledgeRoot, from: 'auto-backend', to: 'platform-sync', anchors: ['FR-auto-backend-019'] })
  const fromPath = join(f.knowledgeRoot, 'fr', 'auto-backend.md')
  writeFileSync(fromPath, readFileSync(fromPath, 'utf8') + '## FR-auto-backend-019 重复条目' + NL + '状态：active' + NL + NL)
  assert.throws(() => redomainFrEntries({ knowledgeRoot: f.knowledgeRoot, from: 'auto-backend', to: 'platform-sync', anchors: ['FR-auto-backend-019'] }), /同 ID/)
  assert.throws(() => redomainFrEntries({ knowledgeRoot: f.knowledgeRoot, from: 'auto-backend', to: 'platform-sync', anchors: ['FR-nope-999'] }), /anchor 未命中/)
  // 干跑不落盘
  const before = readFileSync(join(f.knowledgeRoot, 'fr', 'auto-backend.md'), 'utf8')
  planRedomain({ knowledgeRoot: f.knowledgeRoot, from: 'auto-backend', to: 'platform-sync' })
  assert.equal(readFileSync(join(f.knowledgeRoot, 'fr', 'auto-backend.md'), 'utf8'), before)
})

test('⑤ CLI tests --redomain 端到端（干跑+--write）', () => {
  const f = fixture()
  const bin = join(ROOT, 'bin', 'sillyspec.js')
  const dry = execFileSync('node', [bin, 'tests', '--redomain', '--from', 'auto-backend', '--to', 'platform-sync'], { cwd: f.root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  assert.match(dry, /域迁移预览/, '干跑预览')
  assert.match(dry, /FR-auto-backend-019/)
  assert.ok(existsSync(join(f.knowledgeRoot, 'fr', 'auto-backend.md')), '干跑不落盘')
  const wr = execFileSync('node', [bin, 'tests', '--redomain', '--from', 'auto-backend', '--to', 'platform-sync', '--write'], { cwd: f.root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  assert.match(wr, /域迁移完成：2 条/)
  assert.match(wr, /源域空壳已删/)
})

test('⑥ 入参归一化：fr/ 前缀与 .md 后缀形态与裸名等价；剥空拒绝；幂等', () => {
  // 纯函数契约：前缀/后缀剥离 + 裸名原样 + 幂等 + 大小写不敏感
  assert.equal(normalizeDomainArg('auto-backend'), 'auto-backend', '裸名原样')
  assert.equal(normalizeDomainArg('fr/auto-backend'), 'auto-backend', 'fr/ 前缀剥离')
  assert.equal(normalizeDomainArg('auto-backend.md'), 'auto-backend', '.md 后缀剥离')
  assert.equal(normalizeDomainArg('fr/auto-backend.md'), 'auto-backend', '前缀+后缀同剥')
  assert.equal(normalizeDomainArg('fr/Auto-Backend.md'), 'Auto-Backend', '剥离大小写不敏感')
  assert.equal(normalizeDomainArg(normalizeDomainArg('fr/auto-backend.md')), normalizeDomainArg('fr/auto-backend.md'), '幂等')
  assert.equal(normalizeDomainArg(' fr/ x '), 'x', '空白 trim')

  // 库层：前缀/后缀形态与裸名干跑同结果
  const f = fixture()
  const bare = planRedomain({ knowledgeRoot: f.knowledgeRoot, from: 'auto-backend', to: 'platform-sync', anchors: ['FR-auto-backend-019'] })
  assert.deepEqual(
    planRedomain({ knowledgeRoot: f.knowledgeRoot, from: 'fr/auto-backend', to: 'platform-sync', anchors: ['FR-auto-backend-019'] }),
    bare,
    'fr/ 前缀形态干跑与裸名一致',
  )
  assert.deepEqual(
    planRedomain({ knowledgeRoot: f.knowledgeRoot, from: 'auto-backend.md', to: 'platform-sync', anchors: ['FR-auto-backend-019'] }),
    bare,
    '.md 后缀形态干跑与裸名一致',
  )

  // 库层写入同样容忍前缀形态
  const f2 = fixture()
  const r = redomainFrEntries({ knowledgeRoot: f2.knowledgeRoot, from: 'fr/auto-backend', to: 'platform-sync', anchors: ['FR-auto-backend-019'] })
  assert.equal(r.moved.length, 1)
  assert.equal(r.moved[0].id, 'FR-auto-backend-019', 'ID 不变')
  assert.ok(existsSync(join(f2.knowledgeRoot, 'fr', 'platform-sync.md')))

  // 剥空拒绝（只传 fr/ / 空串）——报错含 fr/ 前缀用法提示，且不落盘
  const f3 = fixture()
  assert.throws(() => planRedomain({ knowledgeRoot: f3.knowledgeRoot, from: 'fr/', to: 'platform-sync' }), /fr\/ 前缀/)
  assert.throws(() => redomainFrEntries({ knowledgeRoot: f3.knowledgeRoot, from: '', to: 'platform-sync' }), /fr\/ 前缀/)
  assert.ok(existsSync(join(f3.knowledgeRoot, 'fr', 'auto-backend.md')), '拒绝路径无半态写盘')
})

test('⑦ CLI --from fr/ 前缀端到端：干跑/--write 与裸名等价且回显裸域名', () => {
  const f = fixture()
  const bin = join(ROOT, 'bin', 'sillyspec.js')
  const dry = execFileSync('node', [bin, 'tests', '--redomain', '--from', 'fr/auto-backend', '--to', 'platform-sync'], { cwd: f.root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  assert.match(dry, /域迁移预览（--write 落盘）：fr\/auto-backend\.md → fr\/platform-sync\.md/, '预览回显裸域名路径')
  assert.ok(!dry.includes('fr/fr/'), '回显无 fr/fr/ 双前缀')
  assert.ok(existsSync(join(f.knowledgeRoot, 'fr', 'auto-backend.md')), '干跑不落盘')

  const wr = execFileSync('node', [bin, 'tests', '--redomain', '--from', 'fr/auto-backend', '--to', 'platform-sync', '--write'], { cwd: f.root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  assert.match(wr, /域迁移完成：2 条/)
  assert.ok(!wr.includes('fr/fr/'), '完成回显无 fr/fr/ 双前缀')
  assert.ok(!existsSync(join(f.knowledgeRoot, 'fr', 'auto-backend.md')), '源空壳已删')
})
