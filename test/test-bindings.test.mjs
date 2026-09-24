/**
 * test-bindings 单测（2026-09-24-fr-test-bindings task-01~07）
 *
 * 红线（方案 §3.1/§3.2/§5 写侧契约）：
 * 1. 枚举违例抛错（anchor 禁 CAP、reason/state 枚举、active 必 confirmed_by=agent）
 * 2. upsert 幂等：同内容重放零漂移；机器晋升不删/不覆盖 agent 行
 * 3. 晋升：covered/covered-service→active；partial 留 candidate；uncovered/non-testable 删行
 * 4. supersede 同步：FR 退役 → 绑定行 status=superseded
 * 5. orphan accRef 指纹恒稳（插行漂移由指纹兜身份）
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import {
  normalizeRow, orphanAccRef, changeTracePath, readChangeTrace, writeChangeTrace,
  promoteTraceFromMatrix, parseEntryBindings, upsertFrBindings, readFrBindings,
  markFrBindingsSuperseded, unbindFrRows, readQlBindings, upsertQlBindings, unbindQlRows,
  queryByAnchor, queryByChange, anchorResolvable,
} from '../src/test-bindings.js'

const roots = []
function mk(p) { const d = mkdtempSync(join(tmpdir(), p)); roots.push(d); return d }
test.after(() => { for (const d of roots) { try { rmSync(d, { recursive: true, force: true }) } catch {} } })

function specFixture() {
  const root = mk('tb-spec-')
  mkdirSync(join(root, 'knowledge', 'fr'), { recursive: true })
  mkdirSync(join(root, 'quicklog'), { recursive: true })
  mkdirSync(join(root, 'test'), { recursive: true })
  writeFileSync(join(root, 'test', 'a.test.mjs'), 'x\n')
  writeFileSync(join(root, 'test', 'b.test.mjs'), 'y\n')
  writeFileSync(join(root, 'knowledge', 'fr', 'core.md'), [
    '# FR 索引：core', '',
    '## FR-core-001 标题甲', '变更：2026-09-01-x', '状态：active', '摘要：s', '最近确认：h1', '',
    '## FR-core-002 标题乙', '变更：2026-09-02-y', '状态：active', '摘要：s', '最近确认：h2', '',
  ].join('\n'))
  return root
}

const cand = (over = {}) => normalizeRow({
  anchor: 'FR-01', row_id: 'chg-a:task-01:acc-0-abc12345', tests: ['test/a.test.mjs'],
  reason: 'spec', state: 'candidate', discovery: 'machine', confirmed_by: null, source_change: 'chg-a', ...over,
})

test('B1 行模型红线：枚举违例抛错、active 必 agent 确认、orphan row_id 含任务段', () => {
  assert.throws(() => cand({ anchor: 'CAP-01' }), /anchor 非法/)
  assert.throws(() => cand({ reason: 'other' }), /reason 非法/)
  assert.throws(() => cand({ state: 'x' }), /state 非法/)
  assert.throws(() => cand({ state: 'active', confirmed_by: null }), /confirmed_by=agent/)
  assert.throws(() => cand({ anchor: null, row_id: 'no-task-seg' }), /任务段/)
  assert.doesNotThrow(() => cand({ anchor: null, row_id: 'chg:task-02:acc-1-ffff0000' }))
  assert.throws(() => cand({ tests: [] }), /tests 非空/)
})

test('B2 变更期 trace：写读回放 + 幂等（内容不变跳写）', () => {
  const dir = mk('tb-chg-')
  const r1 = writeChangeTrace(dir, 'chg-a', [cand()])
  assert.equal(r1.changed, true, 'B2: 首写落盘')
  const before = readFileSync(changeTracePath(dir), 'utf8')
  const r2 = writeChangeTrace(dir, 'chg-a', [cand()])
  assert.equal(r2.changed, false, 'B2: 同内容跳写')
  assert.equal(readFileSync(changeTracePath(dir), 'utf8'), before, 'B2: 字节零漂移')
  assert.deepEqual(readChangeTrace(dir).map(r => r.row_id), ['chg-a:task-01:acc-0-abc12345'])
})

test('B3 晋升：covered→active（confirmed_by=agent）、partial 留 candidate、uncovered 删行、重跑零漂移', () => {
  const dir = mk('tb-promo-')
  const rows = [
    cand(),
    cand({ row_id: 'chg-a:task-01:acc-1-def00001', tests: ['test/b.test.mjs'] }),
    cand({ row_id: 'chg-a:task-02:acc-0-22222222' }),
    cand({ row_id: 'chg-a:task-02:acc-1-33333333', tests: ['test/b.test.mjs'] }),
  ]
  writeChangeTrace(dir, 'chg-a', rows)
  const res = promoteTraceFromMatrix({
    changeDir: dir, changeName: 'chg-a',
    matrixRows: [
      { task: 'task-01', verdict: 'covered' },
      { task: 'task-01', verdict: 'partial' },
      { task: 'task-02', verdict: 'uncovered' },
      { task: 'task-02', verdict: 'covered-service' },
    ],
  })
  assert.equal(res.promoted, 2, 'B3: covered+covered-service 晋升')
  assert.equal(res.dropped, 1, 'B3: uncovered 删行')
  const after = readChangeTrace(dir)
  assert.equal(after.length, 3, 'B3: 3 行存活')
  assert.equal(after[0].state, 'active', 'B3: covered 行 active')
  assert.equal(after[0].confirmed_by, 'agent', 'B3: confirmed_by=agent')
  assert.equal(after[1].state, 'candidate', 'B3: partial 留 candidate')
  assert.equal(after[2].state, 'active', 'B3: covered-service 行 active')
  const res2 = promoteTraceFromMatrix({
    changeDir: dir, changeName: 'chg-a',
    matrixRows: [{ task: 'task-01', verdict: 'covered' }, { task: 'task-01', verdict: 'partial' }, { task: 'task-02', verdict: 'covered-service' }],
  })
  assert.equal(res2.promoted, 0, 'B3: 重跑零晋升（幂等）')
})

test('B4 条目 upsert：插入/幂等零漂移/agent 行保护/他源行不动', () => {
  const root = specFixture()
  const k = { knowledgeRoot: join(root, 'knowledge') }
  const r1 = upsertFrBindings({ ...k, frId: 'FR-core-001', rows: [cand()] })
  assert.equal(r1.ok && r1.changed, true, 'B4: 首次插入')
  const entry1 = readFileSync(r1.file, 'utf8')
  const r2 = upsertFrBindings({ ...k, frId: 'FR-core-001', rows: [cand()] })
  assert.equal(r2.changed, false, 'B4: 同内容重放 no-op')
  assert.equal(readFileSync(r2.file, 'utf8'), entry1, 'B4: 条目字节零漂移')
  // 他源行不动
  upsertFrBindings({ ...k, frId: 'FR-core-001', rows: [cand({ row_id: 'chg-b:task-01:acc-0-99999999', source_change: 'chg-b', tests: ['test/b.test.mjs'] })] })
  const rows2 = readFrBindings({ ...k, frId: 'FR-core-001' })
  assert.equal(rows2.length, 2, 'B4: 他源行共存')
  // agent 行保护：机器晋升（内容变化）不覆盖 confirmed_by=agent 行
  upsertFrBindings({ ...k, frId: 'FR-core-001', rows: [cand({ tests: ['test/a.test.mjs', 'test/b.test.mjs'] })] })
  const rows3 = readFrBindings({ ...k, frId: 'FR-core-001' })
  const chgA = rows3.find(r => r.source_change === 'chg-a')
  assert.deepEqual(chgA.tests, ['test/a.test.mjs', 'test/b.test.mjs'], 'B4: machine 行新内容按 upsert 更新（agent 行才有保护）')
})

test('B4b agent 行保护：confirmed_by=agent 行不被 machine 重放覆盖', () => {
  const root = specFixture()
  const k = { knowledgeRoot: join(root, 'knowledge') }
  const agentRow = cand({ state: 'active', discovery: 'agent', confirmed_by: 'agent', confirmed_at: 'h9' })
  upsertFrBindings({ ...k, frId: 'FR-core-002', rows: [agentRow] })
  // machine 重放同键不同内容 → 不覆盖 agent 行
  upsertFrBindings({ ...k, frId: 'FR-core-002', rows: [cand({ anchor: 'FR-02', row_id: 'chg-a:task-09:acc-0-abc12345', tests: ['test/b.test.mjs'] })] })
  const rows = readFrBindings({ ...k, frId: 'FR-core-002' })
  const hit = rows.find(r => r.row_id === 'chg-a:task-01:acc-0-abc12345')
  assert.equal(hit.confirmed_by, 'agent', 'B4b: agent 行保留')
  assert.equal(hit.confirmed_at, 'h9', 'B4b: agent 字段未被冲掉')
})

test('B5 supersede 同步 + unbind：status=superseded；定向删行', () => {
  const root = specFixture()
  const k = { knowledgeRoot: join(root, 'knowledge') }
  upsertFrBindings({ ...k, frId: 'FR-core-001', rows: [cand()] })
  const sup = markFrBindingsSuperseded({ ...k, frId: 'FR-core-001' })
  assert.equal(sup.changed, true, 'B5: supersede 落写')
  assert.equal(readFrBindings({ ...k, frId: 'FR-core-001' })[0].status, 'superseded', 'B5: 行 status=superseded')
  const unb = unbindFrRows({ ...k, frId: 'FR-core-001', rowIds: ['chg-a:task-01:acc-0-abc12345'] })
  assert.equal(unb.ok, true, 'B5: unbind 成功')
  assert.equal(readFrBindings({ ...k, frId: 'FR-core-001' }).length, 0, 'B5: 行已删')
})

test('B6 ql 面：upsert 幂等/agent 保护/unbind/视图查询', () => {
  const root = specFixture()
  const specBase = join(root)
  const qlRow = cand({ anchor: 'ql-20260924-001-ab12', row_id: 'quick-1:win:test/a.test.mjs', source_change: 'quick-1' })
  const w1 = upsertQlBindings({ specBase, qlId: 'ql-20260924-001-ab12', rows: [qlRow] })
  assert.equal(w1.changed, true, 'B6: 首写')
  const w2 = upsertQlBindings({ specBase, qlId: 'ql-20260924-001-ab12', rows: [qlRow] })
  assert.equal(w2.changed, false, 'B6: 幂等跳写')
  assert.equal(queryByAnchor({ specBase, knowledgeRoot: join(root, 'knowledge'), anchor: 'ql-20260924-001-ab12' }).length, 1, 'B6: 锚查询命中')
  const rm = unbindQlRows({ specBase, qlId: 'ql-20260924-001-ab12', rowIds: ['quick-1:win:test/a.test.mjs'] })
  assert.equal(rm.removed, 1, 'B6: unbind 删行')
  assert.equal(readQlBindings(specBase)['ql-20260924-001-ab12'].length, 0)
})

test('B7 锚可解析：FR 在/不在；ql sidecar 在/不在（修理工硬校验面）', () => {
  const root = specFixture()
  const specBase = join(root)
  const k = { specBase, knowledgeRoot: join(root, 'knowledge') }
  assert.equal(anchorResolvable({ ...k, anchor: 'FR-core-001' }), true, 'B7: 活库条目在')
  assert.equal(anchorResolvable({ ...k, anchor: 'FR-core-999' }), false, 'B7: 条目不在')
  assert.equal(anchorResolvable({ ...k, anchor: 'CAP-01' }), false, 'B7: 第四空间锚不可解析')
  // ql sidecar 存在 → 可解析（真实路径：<specBase>/.runtime/quicklog-sidecar/<ql-id>.json）
  const scDir = join(specBase, '.runtime', 'quicklog-sidecar')
  mkdirSync(scDir, { recursive: true })
  writeFileSync(join(scDir, 'ql-20260924-002-cd34.json'), '{}')
  assert.equal(anchorResolvable({ ...k, anchor: 'ql-20260924-002-cd34' }), true, 'B7: ql sidecar 在')
  assert.equal(anchorResolvable({ ...k, anchor: 'ql-20260924-003-0000' }), false, 'B7: ql 不在册')
})

test('B8 orphan accRef：同文恒稳、异文异指纹（D-005）', () => {
  assert.match(orphanAccRef(0, '文本'), /^acc-0-[0-9a-f]{8}$/, 'B8: 形态 acc-<index>-<hash8>')
  assert.equal(orphanAccRef(0, '文本A') === orphanAccRef(0, '文本A'), true, 'B8: 同文恒稳')
  assert.notEqual(orphanAccRef(0, '文本A'), orphanAccRef(0, '文本B'), 'B8: 异文异指纹')
})

test('B9 queryByChange：跨 FR 面 + ql 面合并', () => {
  const root = specFixture()
  const specBase = join(root)
  const k = { specBase, knowledgeRoot: join(root, 'knowledge') }
  upsertFrBindings({ knowledgeRoot: k.knowledgeRoot, frId: 'FR-core-001', rows: [cand()] })
  upsertQlBindings({ specBase, qlId: 'ql-20260924-001-ab12', rows: [cand({ anchor: 'ql-20260924-001-ab12', row_id: 'quick-1:win:test/a.test.mjs', source_change: 'quick-1' })] })
  const hits = queryByChange({ ...k, sourceChange: 'chg-a' })
  assert.equal(hits.length, 1, 'B9: FR 面 chg-a 行命中（ql 行 source=quick-1 不混入）')
})

test('E1 归档提升端到端：indexRequirements 消费 test-trace → 条目绑定子块 + 承接 supersede 同步', async () => {
  const { indexRequirements } = await import('../src/fr-index.js')
  const root = specFixture()
  const kRoot = join(root, 'knowledge')
  // 旧条目预置一行绑定（将被承接退役）
  upsertFrBindings({ knowledgeRoot: kRoot, frId: 'FR-core-001', rows: [cand({ state: 'active', discovery: 'agent', confirmed_by: 'agent', confirmed_at: 'h0' })] })
  // 变更目录：requirements.md（FR-01 承接 FR-core-001）+ test-trace.json（FR-01 局部锚 active 行）
  const chg = mk('tb-chg-e2-')
  writeFileSync(join(chg, 'requirements.md'), [
    '# 需求', '',
    '### FR-01: 新能力', '承接: FR-core-001（退役理由：升级替代）', '',
    '#### 场景：用一', 'Given a', 'When b', 'Then c', '',
  ].join('\n'))
  writeChangeTrace(chg, 'chg-c', [
    cand({ anchor: 'FR-01', row_id: 'chg-c:task-01:acc-0-aaaa1111', state: 'active', discovery: 'agent', confirmed_by: 'agent', confirmed_at: 'h1' }),
  ])
  const res = indexRequirements({ changeDir: chg, knowledgeRoot: kRoot, headHash: 'hE2' })
  assert.ok(res.written.length >= 1, 'E1: 新条目已铸')
  const newId = res.written[0].id
  const promoted = readFrBindings({ knowledgeRoot: kRoot, frId: newId })
  assert.equal(promoted.length, 1, 'E1: 新条目绑定子块 1 行（局部锚→全局提升）')
  assert.equal(promoted[0].state, 'active', 'E1: 行状态保留')
  assert.ok(res.superseded.some(s => s.from === 'FR-core-001'), 'E1: 承接翻链发生')
  const retired = readFrBindings({ knowledgeRoot: kRoot, frId: 'FR-core-001' })
  assert.equal(retired.length, 1, 'E1: 旧条目绑定行仍在（不死删）')
  assert.equal(retired[0].status, 'superseded', 'E1: 旧条目绑定行随承接退役（禁死锚）')
  // 同源重放：再跑一次归档 → 幂等（已有来源变更条目 → no-op，不重复写）
  const res2 = indexRequirements({ changeDir: chg, knowledgeRoot: kRoot, headHash: 'hE2' })
  assert.equal(readFrBindings({ knowledgeRoot: kRoot, frId: newId }).length, 1, 'E1: 重放零漂移')
  assert.ok(res2.written.length === 0 || res2.skipped, 'E1: 重放 no-op')
})

test('B10 resolveTestFileOwners：FR 面+ql 面 active 行归属；candidate/superseded 不归属（R2 定向消费面）', async () => {
  const { resolveTestFileOwners } = await import('../src/test-bindings.js')
  const root = specFixture()
  const specBase = join(root)
  const kRoot = join(root, 'knowledge')
  upsertFrBindings({ knowledgeRoot: kRoot, frId: 'FR-core-001', rows: [cand({ state: 'active', discovery: 'agent', confirmed_by: 'agent', confirmed_at: 'h' })] }) // tests: test/a.test.mjs (active)
  upsertFrBindings({ knowledgeRoot: kRoot, frId: 'FR-core-002', rows: [cand({ row_id: 'chg-a:task-09:acc-0-22222222', state: 'candidate', confirmed_by: null })] }) // candidate 不归属
  upsertQlBindings({ specBase, qlId: 'ql-20260924-001-ab12', rows: [cand({ anchor: 'ql-20260924-001-ab12', row_id: 'quick-1:win:test/b.test.mjs', tests: ['test/b.test.mjs'], state: 'active', discovery: 'agent', confirmed_by: 'agent', source_change: 'quick-1' })] })
  const owners = resolveTestFileOwners({ specBase, files: ['test/a.test.mjs', 'test/b.test.mjs', 'test/c.test.mjs'] })
  assert.deepEqual((owners.get('test/a.test.mjs') || []).map(o => o.anchor), ['FR-core-001'], 'B10: FR 面归属')
  assert.deepEqual((owners.get('test/b.test.mjs') || []).map(o => o.anchor), ['ql-20260924-001-ab12'], 'B10: ql 面归属')
  assert.equal(owners.has('test/c.test.mjs'), false, 'B10: 未绑定文件无归属')
})
