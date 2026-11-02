/**
 * redomain-unmapped-map.test.mjs — --map 显式映射与 __prune__ 契约测试
 * （2026-11-02-knowledge-redomain-map FR-01/02/04/05）
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = join(new URL('.', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'), '..')
const { planFromMap, applyFromMap, pruneUnmappedEntries, PRUNE_DOMAIN } = await import(
  pathToFileURL(join(root, 'src', 'redomain-unmapped.js')).href
)

function buildFixture() {
  const r = mkdtempSync(join(tmpdir(), 'rdm-map-'))
  const K = (p) => join(r, '.sillyspec', 'knowledge', p)
  mkdirSync(K('decisions'), { recursive: true })
  mkdirSync(K('fr'), { recursive: true })
  writeFileSync(K('INDEX.md'), '# Knowledge Index\n\n## Decisions\n- unmapped|decision|决策 → [decisions/unmapped.md](decisions/unmapped.md)\n\n## FR\n- unmapped|FR|需求 → [fr/unmapped.md](fr/unmapped.md)\n')
  writeFileSync(K('decisions/unmapped.md'), [
    '# 决策知识 — unmapped', '',
    '## D-001@v1 条目一', '状态：implemented', '变更：2026-01-01-a', '锚点：src/x.js:1', '',
    '## D-002@v1 条目二', '状态：implemented', '变更：2026-01-01-a', '锚点：src/y.js:1', '',
    '## D-003@v1 条目三', '状态：implemented', '变更：2026-01-02-b', 'supersedes：D-002@v1', '',
    '## D-004@v1 条目四', '状态：implemented', '变更：2026-01-02-b', '',
  ].join('\n'))
  writeFileSync(K('fr/unmapped.md'), [
    '# FR 索引 — unmapped', '',
    '## FR-unmapped-101 需求一', '变更：2026-01-01-a', '状态：active', '',
    '## FR-unmapped-102 需求二', '变更：2026-01-02-b', '状态：active', '',
  ].join('\n'))
  return r
}
function countHeads(file, re) {
  return readFileSync(file, 'utf8').split('\n').filter((l) => re.test(l)).length
}
const D_RE = /^## D-/
const FR_RE = /^## FR-/

test('FR-01：--map 迁移 + __prune__ 裁剪 + 守恒 + 幂等', () => {
  const r = buildFixture()
  try {
    const knowledgeRoot = join(r, '.sillyspec', 'knowledge')
    const map = [
      { id: 'D-001@v1', domain: 'core-engine' },
      { id: 'D-002@v1', domain: PRUNE_DOMAIN },
      { id: 'FR-unmapped-101', domain: 'frontend' },
      { id: 'FR-unmapped-102', domain: PRUNE_DOMAIN },
    ]
    // dry-run plan
    const plan = planFromMap({ knowledgeRoot, face: 'decisions', map: [map[0], map[1]] })
    assert.equal(plan.total, 4)
    assert.deepEqual(plan.groups, [{ domain: 'core-engine', ids: ['D-001@v1'] }])
    assert.deepEqual(plan.prunes, ['D-002@v1'])
    assert.deepEqual(plan.unknownIds, [])
    // apply（fail-fast）
    const res1 = applyFromMap({ knowledgeRoot, face: 'decisions', map: [map[0], map[1]] })
    assert.equal(res1.moved, 1)
    assert.equal(res1.pruned, 1)
    // 守恒：4 − 1 − 1 = 2（D-003/D-004 留守）
    assert.equal(countHeads(join(knowledgeRoot, 'decisions/unmapped.md'), D_RE), 2)
    assert.ok(existsSync(join(knowledgeRoot, 'decisions/core-engine.md')), '目标域文件创建')
    assert.ok(readFileSync(join(knowledgeRoot, 'decisions/core-engine.md'), 'utf8').includes('D-001@v1'))
    // 幂等：再 apply → alreadyApplied
    const res2 = applyFromMap({ knowledgeRoot, face: 'decisions', map: [map[0], map[1]] })
    assert.equal(res2.alreadyApplied, true)
    // fr 面
    const res3 = applyFromMap({ knowledgeRoot, face: 'fr', map: [map[2], map[3]] })
    assert.equal(res3.moved + res3.pruned, 2)
    assert.ok(!existsSync(join(knowledgeRoot, 'fr/unmapped.md')), 'fr/unmapped 裁空后删除（段头 0 = 文件删除形态）')
  } finally { rmSync(r, { recursive: true, force: true }) }
})

test('FR-01：过期 id 拦截（部分未知报错）', () => {
  const r = buildFixture()
  try {
    const knowledgeRoot = join(r, '.sillyspec', 'knowledge')
    const plan = planFromMap({ knowledgeRoot, face: 'decisions', map: [{ id: 'D-999@v1', domain: 'x' }] })
    assert.deepEqual(plan.unknownIds, ['D-999@v1'])
    // 全 unknown = 工具不可区分「已处理」与「从未存在」——按幂等复跑语义返回 alreadyApplied
    assert.equal(plan.alreadyApplied, true)
    assert.throws(() => applyFromMap({ knowledgeRoot, face: 'decisions', map: [{ id: 'D-001@v1', domain: 'x' }, { id: 'D-999@v1', domain: 'y' }] }), /不存在的 id：D-999@v1/)
  } finally { rmSync(r, { recursive: true, force: true }) }
})

test('FR-01：supersedes 留源警告', () => {
  const r = buildFixture()
  try {
    const knowledgeRoot = join(r, '.sillyspec', 'knowledge')
    // 迁移 D-003（supersedes D-002），D-002 留守 → 警告
    const res = applyFromMap({ knowledgeRoot, face: 'decisions', map: [{ id: 'D-003@v1', domain: 'core-engine' }] })
    assert.ok(res.warnings.some((w) => w.includes('D-003@v1') && w.includes('D-002@v1')), `supersedes 留源警告在场：${JSON.stringify(res.warnings)}`)
  } finally { rmSync(r, { recursive: true, force: true }) }
})

test('FR-01：prune 精确计数断言（空实现判据——移除断言则过期锚静默）', () => {
  const r = buildFixture()
  try {
    const knowledgeRoot = join(r, '.sillyspec', 'knowledge')
    assert.throws(() => pruneUnmappedEntries({ knowledgeRoot, face: 'decisions', anchors: ['D-001@v1', 'D-999@v1'] }), /prune 精确计数断言失败/)
  } finally { rmSync(r, { recursive: true, force: true }) }
})
