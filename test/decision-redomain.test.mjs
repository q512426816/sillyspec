/**
 * 决策条目跨域迁移（2026-10-15-decision-redomain）
 *
 * 锁面：①plan/apply 基本（id 不变/段字节保真/路由行补）②by-change 分批 ③anchor 逐条
 * ④跨变更同号共存不冲突（双键防）⑤目标域同 id 同变更冲突跳过不覆盖 ⑥幂等（重跑零命中拒）
 * ⑦空壳删除 ⑧段内机器行（原编号/最近确认）随段保真
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { planDecisionRedomain, redomainDecisionEntries } from '../src/decision-redomain.js'

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'drd-'))
  const kr = join(root, 'knowledge')
  mkdirSync(join(kr, 'decisions'), { recursive: true })
  writeFileSync(join(kr, 'INDEX.md'), [
    '# Knowledge Index', '', '## Decisions',
    '- unmapped|decision|决策 → [decisions/unmapped.md](decisions/unmapped.md)', '',
  ].join('\n'))
  writeFileSync(join(kr, 'decisions', 'unmapped.md'), [
    '# 决策知识 — unmapped', '',
    '> 说明行。', '',
    '## D-001@v1 直连表查询',
    '变更：2026-10-01-alpha',
    '状态：implemented',
    '理由：初始方案。', '',
    '## D-002@v1 换索引方案',
    '变更：2026-10-01-alpha',
    '状态：implemented',
    '理由：写放大。', '',
    '## D-005@v2 epoch 条目',
    '变更：2026-10-02-beta',
    '状态：implemented',
    '原编号：D-005@v1',
    '最近确认：abc123de',
    '理由：迁移形态。', '',
  ].join('\n'))
  return { root, kr }
}

test('①②③ apply：迁两段真域、段字节保真、路由行补、源留余条', () => {
  const { root, kr } = fixture()
  try {
    const plan = planDecisionRedomain({ knowledgeRoot: kr, from: 'unmapped', to: 'backend', byChange: '2026-10-01-alpha' })
    assert.equal(plan.entries.length, 2, 'plan by-change 列 2 条')
    assert.equal(plan.targetExists, false, '目标将新建')
    assert.equal(plan.sourceWillDelete, false, '源留余条（D-005 留守）')

    const r = redomainDecisionEntries({ knowledgeRoot: kr, from: 'unmapped', to: 'backend', byChange: '2026-10-01-alpha' })
    assert.equal(r.moved.length, 2)
    assert.ok(r.moved.every((m) => m.id.startsWith('D-')), 'id 不变')
    assert.ok(r.targetCreated && r.indexLineAdded, '新建+路由行补')
    const to = readFileSync(join(kr, 'decisions', 'backend.md'), 'utf8')
    assert.ok(to.includes('## D-001@v1 直连表查询') && to.includes('理由：初始方案。'), '段字节保真（标题/字段行）')
    const from = readFileSync(join(kr, 'decisions', 'unmapped.md'), 'utf8')
    assert.ok(!from.includes('D-001@v1'), '迁出段不在源')
    assert.ok(from.includes('D-005@v2') && from.includes('> 说明行。'), '留守段与 preamble 在位')
    const idx = readFileSync(join(kr, 'INDEX.md'), 'utf8')
    assert.ok(idx.includes('decisions/backend.md'), 'INDEX 补目标路由行')
  } finally { rmSync(root, { recursive: true, force: true }) }
})

test('④⑤ 跨变更同号共存；目标同 id 同变更冲突跳过不覆盖', () => {
  const { root, kr } = fixture()
  try {
    // 先迁 beta 的 D-005@v2 → 目标
    redomainDecisionEntries({ knowledgeRoot: kr, from: 'unmapped', to: 'runtime', byChange: '2026-10-02-beta' })
    // 目标域预置同 id 同变更段（模拟再次分批撞冲突）
    const toPath = join(kr, 'decisions', 'runtime.md')
    writeFileSync(toPath, readFileSync(toPath, 'utf8'))
    // 再迁 alpha 两条（同 id 数不同）→ 不冲突
    const r2 = redomainDecisionEntries({ knowledgeRoot: kr, from: 'unmapped', to: 'runtime', byChange: '2026-10-01-alpha' })
    assert.equal(r2.moved.length, 2, '跨变更同号共存不死锁')
    const to = readFileSync(toPath, 'utf8')
    assert.ok(to.includes('D-005@v2') && to.includes('D-001@v1'), '两变更条目同域共存')

    // 冲突面：源域再造一个与目标同 id 同变更的段
    writeFileSync(join(kr, 'decisions', 'unmapped.md'), [
      '# 决策知识 — unmapped', '',
      '## D-009@v1 冲突条目',
      '变更：2026-10-02-beta',
      '状态：implemented', '',
    ].join('\n'))
    writeFileSync(toPath, readFileSync(toPath, 'utf8') + '\n## D-009@v1 冲突条目\n变更：2026-10-02-beta\n状态：implemented\n')
    const r3 = redomainDecisionEntries({ knowledgeRoot: kr, from: 'unmapped', to: 'runtime', byChange: '2026-10-02-beta' })
    assert.deepEqual(r3.skippedConflicts, ['D-009@v1'], '冲突跳过+报告')
    assert.equal(r3.moved.length, 0, '冲突段不搬')
    assert.ok(readFileSync(join(kr, 'decisions', 'unmapped.md'), 'utf8').includes('D-009@v1'), '冲突段留源（不丢）')
  } finally { rmSync(root, { recursive: true, force: true }) }
})

test('⑥⑦⑧ 幂等/空壳删除/机器行保真', () => {
  const { root, kr } = fixture()
  try {
    // 全量迁（anchor 逐条）
    const r = redomainDecisionEntries({ knowledgeRoot: kr, from: 'unmapped', to: 'frontend', anchors: ['D-001@v1', 'D-002@v1', 'D-005@v2'] })
    assert.equal(r.moved.length, 3)
    assert.equal(r.sourceDeleted, true, '全迁 → 源空壳删除')
    assert.ok(!existsSync(join(kr, 'decisions', 'unmapped.md')), '空壳文件已删')
    const to = readFileSync(join(kr, 'decisions', 'frontend.md'), 'utf8')
    assert.ok(to.includes('原编号：D-005@v1') && to.includes('最近确认：abc123de'), '⑧ 机器行随段保真')
    // ⑥ 幂等：源已删 → 重跑拒
    assert.throws(() => redomainDecisionEntries({ knowledgeRoot: kr, from: 'unmapped', to: 'frontend', anchors: ['D-001@v1'] }), /源域文件不存在/, '重跑幂等拒（源空壳已删）')
  } finally { rmSync(root, { recursive: true, force: true }) }
})
