/**
 * 坑 fr-domain-suggest-typo-and-no-split-migration 回归：
 * 缺陷1 —— 域建议/伪域路由产出拼写漂移域（生产实证 auto-rontend）：词典守卫（fr/*.md
 *          既有域集合 + 编辑距离 ≤1 吸附）钉死；附带同链实证缺陷 TEST_PATH_TOKEN_RE
 *          `.ts` 贪心截断 `.tsx`（归档绑定行 governance-cards.test.ts 实证）。
 * 缺陷2 —— redomain 只支持整域迁移，unmapped 混合池无法分流：--by-change 按条目
 *          「变更：<名>」字段分批迁移。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const { snapDomainToDictionary, suggestDomainFromFiles } = await import('../src/knowledge-digest.js')
const { resolveTouchedDomains } = await import('../src/fr-index.js')
const { planRedomain, redomainFrEntries } = await import('../src/redomain.js')
const { extractRequirementBindings } = await import('../src/flow-draft.js')

const tmpRoots = []
function mk() { const d = mkdtempSync(join(tmpdir(), 'frdom-')); tmpRoots.push(d); return d }
test.onFinish?.(() => { for (const t of tmpRoots) rmSync(t, { recursive: true, force: true }) })

function mkKnowledge(frs = ['frontend', 'backend']) {
  const d = mk()
  const knowledgeRoot = join(d, '.sillyspec', 'knowledge')
  mkdirSync(join(knowledgeRoot, 'fr'), { recursive: true })
  for (const f of frs) {
    writeFileSync(join(knowledgeRoot, 'fr', `${f}.md`), `---\nauthor: t\n---\n\n# FR 索引 — ${f}\n\n> 头\n\n## FR-${f}-001 既存条目\n变更：legacy-change\n状态：active\n`)
  }
  return { d, knowledgeRoot }
}

test('① 词典守卫：拼写漂移吸附（rontend→frontend）；典内/远距离/无词典不干预', () => {
  const { knowledgeRoot } = mkKnowledge()
  assert.equal(snapDomainToDictionary('rontend', { knowledgeRoot }), 'frontend', '编辑距离1吸附')
  assert.equal(snapDomainToDictionary('frontend', { knowledgeRoot }), null, '已在典内不吸附')
  assert.equal(snapDomainToDictionary('brandnew', { knowledgeRoot }), null, '远距离（绿地新模块）不吸附')
  assert.equal(snapDomainToDictionary('rontend', {}), null, '无词典不干预')
})

test('② 建议域过守卫：mangled 输入吸附既有域；greenfield 照旧', () => {
  const { knowledgeRoot } = mkKnowledge()
  assert.equal(suggestDomainFromFiles(['rontend/src/x.tsx'], { knowledgeRoot }), 'frontend', '漂移段吸附')
  assert.equal(suggestDomainFromFiles(['frontend/src/x.tsx'], { knowledgeRoot }), 'frontend', '正常域不变')
  assert.equal(suggestDomainFromFiles(['brandnew/src/x.ts'], { knowledgeRoot }), 'brandnew', '绿地照旧铸造')
})

test('③ 伪域路由过守卫：漂移段直接落既有真域，不铸 auto- 拼写壳', () => {
  const { d, knowledgeRoot } = mkKnowledge()
  const changeDir = join(d, '.sillyspec', 'changes', 'c1')
  mkdirSync(changeDir, { recursive: true })
  assert.deepEqual(resolveTouchedDomains(changeDir, {}, ['rontend/src/components/x.tsx'], knowledgeRoot), ['frontend'],
    '漂移段吸附为既有域（条目并进真域 fr/frontend.md）')
  assert.deepEqual(resolveTouchedDomains(changeDir, {}, ['brandnew/src/x.ts'], knowledgeRoot), ['auto-brandnew'],
    '远距离照旧伪域（绿地新模块）')
})

test('④ redomain --by-change：混合池按「变更：」分批，只迁命中条目、余条留守', () => {
  const { knowledgeRoot } = mkKnowledge(['frontend', 'unmapped'])
  const unmapped = join(knowledgeRoot, 'fr', 'unmapped.md')
  writeFileSync(unmapped, [
    '---\nauthor: t\n---\n\n# FR 索引 — unmapped\n',
    '## FR-unmapped-001 A 池条目\n变更：change-alpha\n状态：active\n',
    '## FR-unmapped-002 B 池条目\n变更：change-beta\n状态：active\n',
    '## FR-unmapped-003 A 池第二条\n变更：change-alpha\n状态：active\n',
  ].join('\n\n') + '\n')

  const plan = planRedomain({ knowledgeRoot, from: 'unmapped', to: 'frontend', byChange: 'change-alpha' })
  assert.deepEqual(plan.entries.map((e) => e.id), ['FR-unmapped-001', 'FR-unmapped-003'], '只列命中变更的两条')
  assert.equal(plan.sourceWillDelete, false, '余条在 → 源不删')

  const r = redomainFrEntries({ knowledgeRoot, from: 'unmapped', to: 'frontend', byChange: 'change-alpha' })
  assert.deepEqual(r.moved.map((m) => m.id), ['FR-unmapped-001', 'FR-unmapped-003'], '只迁命中条目')
  assert.equal(r.sourceDeleted, false, '源域保留余条')
  const after = readFileSync(unmapped, 'utf8')
  assert.ok(after.includes('FR-unmapped-002'), '未命中条目留守')
  assert.ok(!after.includes('FR-unmapped-001'), '命中条目已迁走')
  const target = readFileSync(join(knowledgeRoot, 'fr', 'frontend.md'), 'utf8')
  assert.ok(target.includes('FR-unmapped-001') && target.includes('FR-unmapped-003'), '命中条目落目标域（ID 不变）')

  // 未命中变更名 → 明确报错（不静默全迁）
  assert.throws(() => planRedomain({ knowledgeRoot, from: 'unmapped', to: 'frontend', byChange: 'change-none' }), /无命中/)
})

test('⑤ TEST_PATH_TOKEN_RE 不再截断 .tsx（归档绑定行 governance-cards.test.ts 实证）', () => {
  const { d } = mkKnowledge()
  const changeDir = join(d, '.sillyspec', 'changes', 'c2')
  mkdirSync(changeDir, { recursive: true })
  writeFileSync(join(changeDir, 'requirements.md'), [
    '<!--AGENT:测试绑定FR-01 哪个测试文件/用例覆盖这条 FR -->',
    'frontend/src/components/knowledge/__tests__/governance-cards.test.tsx「伪域分池查看明细」',
    '',
  ].join('\n'))
  const rows = extractRequirementBindings({ changeDir, change: 'c2' })
  assert.equal(rows.length, 1)
  assert.equal(rows[0].tests[0], 'frontend/src/components/knowledge/__tests__/governance-cards.test.tsx「伪域分池查看明细」',
    '扩展名完整保留（不再截成 .test.ts）')
})
