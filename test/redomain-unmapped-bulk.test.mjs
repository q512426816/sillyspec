/**
 * redomain-unmapped-bulk.test.mjs — 2026-10-21-knowledge-tier-denoise FR-04
 * unmapped 停车场批量清偿：文件锚/覆盖面推断迁移、无锚留痕、冲突跳过、幂等重跑。
 */

import { join } from 'path'
import { mkdirSync, writeFileSync, rmSync, readFileSync } from 'fs'
import { fileURLToPath, pathToFileURL } from 'url'
import { tmpdir } from 'os'

const __filename = fileURLToPath(import.meta.url)
const __dirname = join(__filename, '..')
const root = join(__dirname, '..')

const { planUnmappedRedomain, applyUnmappedRedomain } = await import(
  pathToFileURL(join(root, 'src', 'redomain-unmapped.js')).href
)

let passed = 0, failed = 0

function assert(cond, msg) {
  if (cond) { console.log(`  ✅ PASS: ${msg}`); passed++ }
  else { console.log(`  ❌ FAIL: ${msg}`); failed++ }
}

function setup(name) {
  const dir = join(tmpdir(), `rub-test-${name}`)
  rmSync(dir, { recursive: true, force: true })
  return dir
}
function clean(...dirs) {
  for (const d of dirs) try { rmSync(d, { recursive: true, force: true }) } catch {}
}

/** 标准夹具：模块图（cli 域 ← src/cli/、core 域 ← src/core/）+ decisions/fr unmapped 存量 + 归档来源变更。 */
function fixture(name) {
  const specBase = setup(name)
  const kr = join(specBase, 'knowledge')
  mkdirSync(join(kr, 'decisions'), { recursive: true })
  mkdirSync(join(kr, 'fr'), { recursive: true })
  mkdirSync(join(specBase, 'docs', 'proj', 'modules'), { recursive: true })
  writeFileSync(join(specBase, 'docs', 'proj', 'modules', '_module-map.yaml'),
    'modules:\n  cli:\n    paths:\n      - src/cli/\n  core:\n    paths:\n      - src/core/\n')
  writeFileSync(join(kr, 'INDEX.md'), [
    '# Knowledge Index', '',
    '## Decisions',
    '- unmapped|停车场 → [decisions/unmapped.md](decisions/unmapped.md)',
    '- cli → [decisions/cli.md](decisions/cli.md)',
    '- core → [decisions/core.md](decisions/core.md)', '',
    '## FR 需求索引',
    '- unmapped → [fr/unmapped.md](fr/unmapped.md)',
    '- cli → [fr/cli.md](fr/cli.md)',
    '- core → [fr/core.md](fr/core.md)',
  ].join('\n'))
  // decisions 存量：D-001 文件锚命中 cli；D-002 无锚；D-003 锚不命中任何模块
  writeFileSync(join(kr, 'decisions', 'unmapped.md'), [
    '# 决策知识 — unmapped', '',
    '## D-001@v1 有锚条目', '状态：implemented', '变更：2026-01-01-a', '理由：理由', '文件：src/cli/one.js', '',
    '## D-002@v1 无锚条目', '状态：implemented', '变更：2026-01-01-a', '理由：理由', '',
    '## D-003@v1 锚不命中', '状态：implemented', '变更：2026-01-01-a', '理由：理由', '文件：docs/zz/other.md', '',
  ].join('\n'))
  writeFileSync(join(kr, 'decisions', 'cli.md'), '# 决策知识 — cli\n')
  writeFileSync(join(kr, 'decisions', 'core.md'), '# 决策知识 — core\n')
  // fr 存量：FR-unmapped-1 来源变更覆盖面命中 core；FR-unmapped-2 无来源变更
  writeFileSync(join(kr, 'fr', 'unmapped.md'), [
    '# FR 索引 — unmapped', '',
    '## FR-unmapped-1 有来源条目', '状态：active', '变更：2026-01-02-b', '',
    '## FR-unmapped-2 无来源条目', '状态：active', '',
  ].join('\n'))
  writeFileSync(join(kr, 'fr', 'cli.md'), '# FR 索引 — cli\n')
  writeFileSync(join(kr, 'fr', 'core.md'), '# FR 索引 — core\n')
  // 归档来源变更 2026-01-02-b：design 交付表指向 src/core/
  const arch = join(specBase, 'changes', 'archive', '2026-01-02-b')
  mkdirSync(arch, { recursive: true })
  writeFileSync(join(arch, 'design.md'),
    '# D\n\n## 文件变更清单\n\n| 操作 | 文件路径 |\n|---|---|\n| 修改 | src/core/thing.js |\n')
  return { specBase, kr }
}

const countEntries = (p, re) => (readFileSync(p, 'utf8').match(re) || []).length

// ── T1: dry-run 计划——分组正确、残量留痕 ──
console.log('\n=== T1: plan——文件锚/覆盖面投票与残量原因 ===')
{
  const f = fixture('t1')
  try {
    const plan = planUnmappedRedomain({ knowledgeRoot: f.kr, archiveRoot: join(f.specBase, 'changes', 'archive') })
    assert(plan.decisions.groups.length === 1 && plan.decisions.groups[0].domain === 'cli'
      && plan.decisions.groups[0].ids.join() === 'D-001@v1', 'decisions：D-001 按锚投票进 cli 组')
    const reasons = Object.fromEntries(plan.decisions.leftover.map((x) => [x.id, x.reason]))
    assert(reasons['D-002@v1'] === '无文件锚' && reasons['D-003@v1'] === '锚不命中任何模块', 'decisions 残量留痕原因明确')
    assert(plan.fr.groups.length === 1 && plan.fr.groups[0].domain === 'core'
      && plan.fr.groups[0].ids.join() === 'FR-unmapped-1', 'fr：FR-unmapped-1 按来源覆盖面进 core 组')
    assert(plan.fr.leftover.length === 1 && plan.fr.leftover[0].reason === '无来源变更', 'fr 残量留痕')
    assert(countEntries(join(f.kr, 'decisions', 'unmapped.md'), /^## D-/gm) === 3, 'dry-run 零落盘')
  } finally { clean(f.specBase) }
}

// ── T2: apply——迁移落盘、INDEX 维护、幂等 ──
console.log('\n=== T2: apply——迁移/INDEX/幂等 ===')
{
  const f = fixture('t2')
  try {
    const { results } = applyUnmappedRedomain({ knowledgeRoot: f.kr, archiveRoot: join(f.specBase, 'changes', 'archive') })
    assert(results.decisions.moved === 1 && results.decisions.movedByDomain.cli === 1, 'decisions 迁 1 条进 cli')
    assert(results.fr.moved === 1 && results.fr.movedByDomain.core === 1, 'fr 迁 1 条进 core')
    assert(readFileSync(join(f.kr, 'decisions', 'cli.md'), 'utf8').includes('## D-001@v1'), 'D-001 段整体落 cli 域')
    assert(readFileSync(join(f.kr, 'fr', 'core.md'), 'utf8').includes('## FR-unmapped-1'), 'FR-unmapped-1 段整体落 core 域')
    assert(countEntries(join(f.kr, 'decisions', 'unmapped.md'), /^## D-/gm) === 2, 'unmapped 决策剩残量 2（不裸删）')
    assert(countEntries(join(f.kr, 'fr', 'unmapped.md'), /^## FR-/gm) === 1, 'unmapped FR 剩残量 1')
    const idx = readFileSync(join(f.kr, 'INDEX.md'), 'utf8')
    assert(idx.includes('- cli → [decisions/cli.md](decisions/cli.md)'), 'INDEX 路由行维护（零泛词形态）')
    // 幂等：二次 apply——可推断条目已不在源，0 迁移零漂移
    const r2 = applyUnmappedRedomain({ knowledgeRoot: f.kr, archiveRoot: join(f.specBase, 'changes', 'archive') })
    assert(r2.results.decisions.moved === 0 && r2.results.fr.moved === 0
      && r2.results.decisions.errors.length === 0 && r2.results.fr.errors.length === 0, '幂等重跑 0 迁移零报错')
  } finally { clean(f.specBase) }
}

// ── T3: 冲突跳过——目标域同 id 同变更既有段 ──
console.log('\n=== T3: 目标域同 id 同变更冲突跳过不覆盖 ===')
{
  const f = fixture('t3')
  try {
    const before = readFileSync(join(f.kr, 'decisions', 'cli.md'), 'utf8')
    // 预置目标域同 id 同变更段
    writeFileSync(join(f.kr, 'decisions', 'cli.md'), before + '## D-001@v1 既有同号条目\n状态：implemented\n变更：2026-01-01-a\n理由：占位\n\n')
    const { results } = applyUnmappedRedomain({ knowledgeRoot: f.kr, archiveRoot: join(f.specBase, 'changes', 'archive') })
    assert(results.decisions.skippedConflicts.length === 1 && results.decisions.skippedConflicts[0] === 'cli:D-001@v1', '冲突跳过并上报')
    assert(readFileSync(join(f.kr, 'decisions', 'cli.md'), 'utf8').includes('既有同号条目'), '目标域既有段不被覆盖')
    assert(countEntries(join(f.kr, 'decisions', 'unmapped.md'), /^## D-/gm) === 3, '冲突条目留守源域')
  } finally { clean(f.specBase) }
}

// ── T4: 面缺席容错 + faces 裁剪 ──
console.log('\n=== T4: 面缺席容错与 faces 裁剪 ===')
{
  const specBase = setup('t4')
  const kr = join(specBase, 'knowledge')
  try {
    mkdirSync(join(kr, 'decisions'), { recursive: true })
    writeFileSync(join(kr, 'INDEX.md'), '# Knowledge Index\n\n## Decisions\n- unmapped|停车场 → [decisions/unmapped.md](decisions/unmapped.md)\n')
    writeFileSync(join(kr, 'decisions', 'unmapped.md'), '# 决策知识 — unmapped\n\n## D-001@v1 孤条\n状态：implemented\n变更：2026-01-01-a\n理由：无锚\n')
    const plan = planUnmappedRedomain({ knowledgeRoot: kr, archiveRoot: join(specBase, 'changes', 'archive') })
    assert(plan.fr.absent === true, 'fr 面缺席容错（absent 标记非报错）')
    assert(plan.decisions.leftover.length === 1, 'decisions 无锚残量照常留痕')
    const { results } = applyUnmappedRedomain({ knowledgeRoot: kr, archiveRoot: join(specBase, 'changes', 'archive'), faces: ['fr'] })
    assert(results.decisions.moved === 0 && Object.keys(results.decisions.movedByDomain).length === 0, 'faces 裁剪：decisions 面不动')
  } finally { clean(specBase) }
}

console.log(`\n结果: ${passed} passed, ${failed} failed`)
process.exit(failed > 0 ? 1 : 0)
