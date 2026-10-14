/**
 * decision-legacy-renumber.test.mjs — 存量决策号一次性迁移（2026-10-14-decision-legacy-renumber）
 *
 * 覆盖：① 计划与重写（fanout 单一身份/无变更独立发号/原编号插行/其余字节保留/epoch 零触碰/域起点 max+1）
 *      ② 幂等与纯函数（重跑零变化；真实库 dry-run 不变量对账——绝对底数随迁移漂移，断内部一致性）
 *      ③ 兼容（isDecisionExempt 认原编号双键形；迁移后全节段可见/图构建）
 *      ④ CLI 接线钉（knowledge renumber 两档 + 帮助面）
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync, cpSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const { planRenumber, applyRenumberPlan } = await import(pathToFileURL(join(ROOT, 'src', 'decision-renumber.js')).href)
const { parseDecisionEntries } = await import(pathToFileURL(join(ROOT, 'src', 'knowledge-match.js')).href)
const { parseDecisionEntries: parseDocsCheck, isDecisionExempt } = await import(pathToFileURL(join(ROOT, 'src', 'docs-check.js')).href)
const { buildKnowledgeGraph } = await import(pathToFileURL(join(ROOT, 'src', 'knowledge-graph.js')).href)

function mkKnowledge(root, files) {
  const k = join(root, 'knowledge')
  mkdirSync(join(k, 'decisions'), { recursive: true })
  for (const [f, c] of Object.entries(files)) writeFileSync(join(k, 'decisions', f), c)
  return k
}
/** 帮助构造器：段 = 标题行 + 字段行 */
const sec = (id, title, fields) => [`## ${id}${title ? ' ' + title : ''}`, ...fields, ''].join('\n')

test('① 计划与重写：fanout 同号/无变更独立发号/原编号插行/其余字节保留/epoch 零触碰/域起点 max+1', () => {
  const root = mkdtempSync(join(tmpdir(), 'dlr1-'))
  try {
    const k = mkKnowledge(root, {
      // 字母序：alpha.md 在 beta.md 前 → fanout 组号域=alpha；无变更同号两条同文件（独立发号真考验）
      'alpha.md': [
        '# 决策知识 — alpha', '',
        sec('D-002@v1', '扇出决策', ['状态：implemented', '变更：chg-x', '锚点：src/a.js', '最近确认：h1', '理由：甲']),
        sec('D-007@v1', '无变更条目甲', ['状态：implemented', '锚点：未记录', '理由：丙']),
        sec('D-007@v1', '无变更条目乙（同号不同决策）', ['状态：implemented', '锚点：未记录', '理由：丁']),
        sec('D-core-003@v1', '既有 epoch 条目', ['状态：implemented', '变更：chg-e', '原编号：D-009@v1', '锚点：未记录']),
      ].join('\n'),
      'beta.md': [
        '# 决策知识 — beta', '',
        sec('D-002@v1', '扇出决策', ['状态：implemented', '变更：chg-x', '锚点：src/a.js', '最近确认：h1', '理由：甲']),
        sec('D-003@v1', '跨变更同号', ['状态：implemented', '变更：chg-y', '锚点：未记录', '理由：戊']),
      ].join('\n'),
    })
    const plan = planRenumber(k)
    const st = plan.stats
    assert.equal(st.legacySections, 5, `legacy 5 节段（实际 ${st.legacySections}）`)
    assert.equal(st.untouchedEpoch, 1, 'epoch 1 节段零触碰')
    assert.equal(st.fanoutGroups, 1, 'fanout 1 组（chg-x D-002@v1 双副本）')
    assert.equal(st.mintedNumbers, 4, `发号 4（1 组号 + 3 独立：无变更甲/乙 + chg-y；实际 ${st.mintedNumbers}）`)
    assert.equal(st.noChangeEntries, 2, `无变更条目计数 2（甲/乙；实际 ${st.noChangeEntries}）`)
    assert.equal(st.perDomainStart.alpha, 1, 'alpha 域起点 1（无既有 epoch 号）')
    assert.equal(st.perDomainStart.core, 4, 'core 域起点 4（既有 D-core-003 → max+1）')
    // fanout 组号域=alpha（字母序首文件）；两副本同号
    const out = applyRenumberPlan(new Map(plan.files.map(f => [f.file, f.content])), plan)
    const alpha = out.get('decisions/alpha.md')
    const beta = out.get('decisions/beta.md')
    const fanNum = (alpha.match(/^## D-alpha-\d{3}@v1 扇出决策$/m) || [''])[0].split(' ')[1]
    assert.ok(fanNum, 'alpha 副本发全局号')
    assert.ok(beta.includes(`## ${fanNum} 扇出决策`), `beta 副本同号（单一身份，实际 ${fanNum}）`)
    // 无变更同号两条（同文件）= 独立号（不同决策——backend.md 双 D-001@v1 无变更行先例）
    const aNum = (alpha.match(/^## D-alpha-\d{3}@v1 无变更条目甲$/m) || [''])[0].split(' ')[1]
    const bNum = (alpha.match(/^## D-alpha-\d{3}@v1 无变更条目乙（同号不同决策）$/m) || [''])[0].split(' ')[1]
    assert.ok(aNum && bNum && aNum !== bNum, `无变更同号同文件独立发号（${aNum} vs ${bNum}）`)
    // 原编号插行：变更行后（fanout 副本）/状态行后（无变更条目）；其余行保留
    assert.match(alpha, new RegExp(`^## ${fanNum}[^\\n]*\\n状态：implemented\\n变更：chg-x\\n原编号：D-002@v1\\n锚点：src/a\\.js`, 'm'), '原编号插在变更行后（其余行序不变）')
    assert.match(alpha, new RegExp(`^## ${aNum}[^\\n]*\\n状态：implemented\\n原编号：D-007@v1\\n锚点：未记录`, 'm'), '无变更条目原编号插在状态行后')
    // epoch 零触碰
    assert.ok(alpha.includes('## D-core-003@v1 既有 epoch 条目') && !/原编号：D-009@v1[\s\S]*原编号：/.test(alpha.split('## D-alpha-')[0]), 'epoch 节段原样保留')
  } finally { rmSync(root, { recursive: true, force: true }) }
})

test('② 幂等与纯函数：重跑零变化、真实库 dry-run 不变量对账', () => {
  // 合成夹具：迁移 → 重计划 0 ops → 再 apply 零字节变化
  const root = mkdtempSync(join(tmpdir(), 'dlr2-'))
  try {
    const k = mkKnowledge(root, { 'core.md': ['# 决策知识 — core', '', sec('D-001@v1', '甲', ['状态：implemented', '变更：c1', '锚点：未记录', '理由：x']), sec('D-002@v1', '乙', ['状态：implemented', '锚点：未记录', '理由：y'])].join('\n') })
    const p1 = planRenumber(k)
    const out1 = applyRenumberPlan(new Map(p1.files.map(f => [f.file, f.content])), p1)
    for (const [f, c] of out1) writeFileSync(join(k, f), c)
    const p2 = planRenumber(k)
    assert.equal(p2.stats.legacySections, 0, '迁移后重计划零 legacy')
    assert.ok(p2.files.every(f => !f.ops || f.ops.length === 0), '零 ops（幂等判定面=原编号/全局号在场）')
    const out2 = applyRenumberPlan(new Map(p2.files.map(f => [f.file, f.content])), p2)
    assert.equal(out2.size, 0, '重跑零输出（零字节变化）')
  } finally { rmSync(root, { recursive: true, force: true }) }
  // 真实库 dry-run 不变量（绝对底数随本变更执行漂移——断内部一致性而非绝对数）
  const root2 = mkdtempSync(join(tmpdir(), 'dlr2r-'))
  try {
    cpSync(join(ROOT, '.sillyspec', 'knowledge'), join(root2, 'knowledge'), { recursive: true })
    const plan = planRenumber(join(root2, 'knowledge'))
    const st = plan.stats
    assert.equal(st.mintedNumbers, st.legacySections - st.fanoutCopies + st.fanoutGroups, `发号数=legacy−fanout副本+fanout组（实际 ${JSON.stringify(st)}）`)
    assert.ok(st.untouchedEpoch >= 1, '既有 epoch 节段零触碰计数在场')
  } finally { rmSync(root2, { recursive: true, force: true }) }
})

test('③ 兼容：isDecisionExempt 认原编号、迁移后全节段可见/图构建', () => {
  // 豁免键双匹配：旧号裸键/域限定键在条目迁移后（originId）继续命中
  assert.ok(isDecisionExempt(['decisions.D-002@v1.anchor'], 'D-core-014@v1', 'anchor', 'core', 'D-002@v1'), '旧号裸键经原编号命中')
  assert.ok(isDecisionExempt(['decisions.core/D-002@v1'], 'D-core-014@v1', 'behind', 'core', 'D-002@v1'), '旧号域限定键经原编号命中')
  assert.ok(!isDecisionExempt(['decisions.D-002@v1.anchor'], 'D-core-014@v1', 'anchor', 'core', 'D-003@v1'), '原编号不匹配不豁免')
  // docs-check 解析器读原编号
  const dc = parseDocsCheck(['## D-core-014@v1 t', '状态：implemented', '原编号：D-002@v1', ''].join('\n'))
  assert.equal(dc[0].originId, 'D-002@v1', 'docs-check parseDecisionEntries 原编号读入')
  // 迁移后可见性/图构建
  const root = mkdtempSync(join(tmpdir(), 'dlr3-'))
  try {
    const k = mkKnowledge(root, { 'core.md': ['# 决策知识 — core', '', sec('D-001@v1', '甲', ['状态：implemented', '变更：c1', '锚点：src/a.js', '理由：x']), sec('D-002@v1', '乙', ['状态：implemented', '锚点：未记录', '理由：y'])].join('\n') })
    writeFileSync(join(k, 'INDEX.md'), ['# Knowledge Index', '', '## Decisions', '- core|decision|决策 → [decisions/core.md](decisions/core.md)', ''].join('\n'))
    const plan = planRenumber(k)
    for (const [f, c] of applyRenumberPlan(new Map(plan.files.map(x => [x.file, x.content])), plan)) writeFileSync(join(k, f), c)
    const hits = parseDecisionEntries(k)
    assert.equal(hits.length, 2, '迁移后全节段可见')
    assert.ok(hits.every(h => /^D-core-\d{3}@v1$/.test(h.id)), `id 均为全局号（实际 ${hits.map(h => h.id)}）`)
    assert.ok(hits.every(h => h.originId), '原编号字段读入（knowledge-match）')
    const g = buildKnowledgeGraph(root)
    assert.equal(g.stats.byNodeType.decision, 2, '图节点构建正常')
  } finally { rmSync(root, { recursive: true, force: true }) }
})

test('④ CLI 接线钉：knowledge renumber 两档 + 帮助面', () => {
  const src = readFileSync(join(ROOT, 'src', 'stages', 'knowledge.js'), 'utf8')
  assert.ok(src.includes("case 'renumber'"), '子命令分派在场')
  assert.ok(src.includes("'--apply'"), '--apply 写盘档')
  assert.ok(src.includes('--dry-run 形态'), '--dry-run 计划档')
  assert.ok(src.includes('快照漂移'), '指纹校验防他侧写入被覆盖')
  assert.ok(src.includes('renumber [--dry-run|--apply]'), '帮助面登记')
})
