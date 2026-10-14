/**
 * decision-global-id-epoch.test.mjs — 决策号 epoch 全局化（2026-10-14-decision-global-id-epoch）
 *
 * 选项③增量：新蒸馏条目发全局号 D-<域>-NNN@vN +「原编号：」溯源；存量 legacy 段零触碰
 * （FR_INDEX_EPOCH「不伪造历史」先例）。单一身份铁律沿用 FR 侧裁决（扇出多文件同号）。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync, cpSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const { splitKnowledgeSections, distillIntoKnowledge } = await import(pathToFileURL(join(ROOT, 'src', 'decision-distill.js')).href)
const { parseDecisionEntries } = await import(pathToFileURL(join(ROOT, 'src', 'knowledge-match.js')).href)
const { parseDecisionEntries: parseDocsCheck } = await import(pathToFileURL(join(ROOT, 'src', 'docs-check.js')).href)
const { buildKnowledgeGraph } = await import(pathToFileURL(join(ROOT, 'src', 'knowledge-graph.js')).href)

function mkChange(root, name, entriesMd) {
  const changeDir = join(root, 'changes', name)
  mkdirSync(changeDir, { recursive: true })
  writeFileSync(join(changeDir, 'decisions.md'), entriesMd)
  return changeDir
}
function mkKnowledge(root, files) {
  const knowledgeRoot = join(root, 'knowledge')
  mkdirSync(join(knowledgeRoot, 'decisions'), { recursive: true })
  for (const [f, c] of Object.entries(files || { 'unmapped.md': '# 决策知识 — unmapped\n' })) {
    writeFileSync(join(knowledgeRoot, 'decisions', f), c)
  }
  return knowledgeRoot
}

test('① 发号与形态：全局号标题+原编号字段+域前缀 max+1 只增不复用', () => {
  const root = mkdtempSync(join(tmpdir(), 'dge1-'))
  try {
    const knowledgeRoot = mkKnowledge(root, { 'unmapped.md': '# 决策知识 — unmapped\n\n## D-unmapped-007@v1 已有全局号\n状态：implemented\n变更：hist-x\n原编号：D-003@v1\n锚点：未记录\n' })
    const changeDir = mkChange(root, '2026-99-99-alpha', [
      '# 决策记录', '',
      '## D-011: 首个新决策', '- 类型：architecture', '- 状态：accepted', '',
      '## D-012: 次个新决策', '- 类型：process', '- 状态：confirmed', '',
    ].join('\n'))
    const r = distillIntoKnowledge(changeDir, knowledgeRoot, 'deadbeef')
    const after = readFileSync(join(knowledgeRoot, 'decisions', 'unmapped.md'), 'utf8')
    // max+1：存量 D-unmapped-007 → 新发 008/009（批内递增防撞号）
    assert.match(after, /^## D-unmapped-008@v1 首个新决策$/m, '首条发号 max+1')
    assert.match(after, /^## D-unmapped-009@v1 次个新决策$/m, '批内第二条递增')
    // 原编号字段 + 行序（变更后/锚点前）
    const sec = splitKnowledgeSections(after).sections.find(s => s.title === '首个新决策')
    assert.equal(sec.origin, 'D-011@v1', '原编号溯源字段在场')
    const li = sec.lines.map(l => l.replace(/[：:].*$/, '').trim())
    assert.ok(li.indexOf('变更') < li.indexOf('原编号') && li.indexOf('原编号') < li.indexOf('锚点'), `行序：变更→原编号→锚点（实际 ${li.slice(0, 5)}）`)
    assert.equal(r.written.filter(w => w.action === 'append').length, 2, '两条 append')
    assert.ok(r.written.every(w => /^D-unmapped-\d{3}@v1$/.test(w.id)), `written.id 均为全局号（实际 ${JSON.stringify(r.written.map(w => w.id))}）`)
  } finally { rmSync(root, { recursive: true, force: true }) }
})

test('② 幂等与单一身份：重蒸馏复用号、v2 在位承接、多域扇出同号、跨文件清理', () => {
  const root = mkdtempSync(join(tmpdir(), 'dge2-'))
  try {
    // A：重放复用（同版本重蒸馏 → 同号单段，无重复 append）
    const knowledgeRoot = mkKnowledge(root)
    const changeDir = mkChange(root, '2026-99-99-beta', [
      '# 决策记录', '', '## D-005: 方案', '- 类型：architecture', '- 状态：accepted', '',
    ].join('\n'))
    distillIntoKnowledge(changeDir, knowledgeRoot, 'aaaa')
    const once = readFileSync(join(knowledgeRoot, 'decisions', 'unmapped.md'), 'utf8')
    distillIntoKnowledge(changeDir, knowledgeRoot, 'bbbb')
    const twice = readFileSync(join(knowledgeRoot, 'decisions', 'unmapped.md'), 'utf8')
    assert.equal((twice.match(/^## D-unmapped-001@v1/gm) || []).length, 1, '重放同号只一段')
    assert.ok(twice.includes('最近确认：bbbb'), '重放在位更新（复用号，最近确认刷新）')

    // B：版本演进 v1→v2：同全局号在位承接、原编号随版本更新
    writeFileSync(join(changeDir, 'decisions.md'), [
      '# 决策记录', '', '## D-005@v2: 方案升级', '- 类型：architecture', '- 状态：accepted', '- supersedes: D-005@v1', '',
    ].join('\n'))
    distillIntoKnowledge(changeDir, knowledgeRoot, 'cccc')
    const v2 = readFileSync(join(knowledgeRoot, 'decisions', 'unmapped.md'), 'utf8')
    assert.match(v2, /^## D-unmapped-001@v2 方案升级$/m, 'v2 承接同一全局号')
    assert.match(v2, /^原编号：D-005@v2$/m, '原编号随版本更新')
    assert.doesNotMatch(v2, /D-unmapped-002/, '版本演进不发新号')

    // C：多域扇出单一身份 + 跨文件清理
    const root2 = mkdtempSync(join(tmpdir(), 'dge2c-'))
    const k2 = mkKnowledge(root2)
    const cd2 = mkChange(root2, '2026-99-99-gamma', [
      '# 决策记录', '', '## D-001: 扇出决策', '- 类型：architecture', '- 状态：accepted', '- 模块域：core, runtime', '',
    ].join('\n'))
    distillIntoKnowledge(cd2, k2, 'dddd')
    const core = readFileSync(join(k2, 'decisions', 'core.md'), 'utf8')
    const runtime = readFileSync(join(k2, 'decisions', 'runtime.md'), 'utf8')
    assert.match(core, /^## D-core-001@v1 扇出决策$/m, '首域文件落号 D-core-001')
    assert.match(runtime, /^## D-core-001@v1 扇出决策$/m, '扇出文件同一号（单一身份）')
    // 域收敛重蒸馏（只剩 core）→ runtime 副本被跨文件清理
    writeFileSync(join(cd2, 'decisions.md'), [
      '# 决策记录', '', '## D-001: 扇出决策', '- 类型：architecture', '- 状态：accepted', '- 模块域：core', '',
    ].join('\n'))
    distillIntoKnowledge(cd2, k2, 'eeee')
    assert.doesNotMatch(readFileSync(join(k2, 'decisions', 'runtime.md'), 'utf8'), /D-core-001/, '跨文件清理（谓词含原编号）')
  } finally { rmSync(root, { recursive: true, force: true }) }
})

test('③ 存量零触碰：无关蒸馏后 legacy 节段逐字节不变（真实库副本演练）', () => {
  const real = join(ROOT, '.sillyspec', 'knowledge')
  const root = mkdtempSync(join(tmpdir(), 'dge3-'))
  try {
    cpSync(real, join(root, 'knowledge'), { recursive: true })
    const knowledgeRoot = join(root, 'knowledge')
    const before = readAll(knowledgeRoot) // 文件级快照（新蒸馏只追加段——前缀保持不变）
    const changeDir = mkChange(root, '2026-99-99-epoch-sample', [
      '# 决策记录', '', '## D-001: epoch 样例决策', '- 类型：architecture', '- 状态：accepted', '',
    ].join('\n'))
    const r = distillIntoKnowledge(changeDir, knowledgeRoot, 'ffff')
    assert.ok(r.written.length > 0, '样例条目已蒸馏')
    const after = readAll(knowledgeRoot)
    const touched = new Set(r.written.map(w => w.file.replace(/^decisions\//, '')))
    let unchanged = 0
    for (const [f, b] of Object.entries(before)) {
      const a = after[f]
      assert.ok(typeof a === 'string', `文件未被删除：${f}`)
      if (touched.has(f)) {
        // 追加形态：存量内容为前缀（尾空白归一后）
        assert.ok(a.startsWith(b.replace(/\s+$/, '')), `存量内容前缀不变（追加新段）：${f}`)
      } else {
        assert.equal(a, b, `未触碰文件逐字节不变：${f}`)
      }
      unchanged++
    }
    assert.ok(unchanged >= 25, `存量文件全数对账（实际 ${unchanged}）`)
    assert.ok(Object.keys(after).length >= Object.keys(before).length, '无文件被删')
  } finally { rmSync(root, { recursive: true, force: true }) }
})

test('④ 读面双形态：三解析器+doctor 计数双形态 + graph supersedes 经原编号匹配', () => {
  const root = mkdtempSync(join(tmpdir(), 'dge4-'))
  try {
    const k = mkKnowledge(root, { 'core.md': [
      '# 决策知识 — core', '',
      '## D-001@v1 legacy 局部形态', '状态：implemented', '变更：2026-99-99-a', '',
      '## D-core-042@v1 epoch 全局形态旧版', '状态：implemented', '变更：2026-99-99-b', '原编号：D-009@v1', '',
      '## D-core-042@v2 epoch 全局形态新版', '状态：implemented', '变更：2026-99-99-b', '原编号：D-009@v2', 'supersedes：D-009@v1', '',
    ].join('\n') })
    writeFileSync(join(k, 'INDEX.md'), ['# Knowledge Index', '', '## Decisions', '- core|decision|决策 → [decisions/core.md](decisions/core.md)', ''].join('\n'))
    // knowledge-match 双形态 + 原编号读入
    const hits = parseDecisionEntries(k)
    assert.ok(hits.some(h => h.id === 'D-001@v1'), '局部形态可见')
    assert.ok(hits.some(h => h.id === 'D-core-042@v2'), '全局形态可见')
    assert.equal(hits.find(h => h.id === 'D-core-042@v2').originId, 'D-009@v2', '原编号字段读入')
    // docs-check 双形态
    const dc = parseDocsCheck(readFileSync(join(k, 'decisions', 'core.md'), 'utf8'))
    assert.equal(dc.length, 3, 'docs-check 双形态三段全解析')
    // graph：双形态节点 + supersedes 经原编号解析同变更全局段
    const g = buildKnowledgeGraph(join(root))
    const sups = g.byEdgeType.get('supersedes') || []
    assert.ok(sups.some(e => e.s.includes('#D-core-042@v2') && e.t.includes('#D-core-042@v1')),
      `supersedes 经原编号匹配（实际 ${JSON.stringify(sups)}）`)
    // doctor 计数正则双形态（源码锚）
    const doc = readFileSync(join(ROOT, 'src', 'doctor-diagnostics.js'), 'utf8')
    assert.ok(doc.includes('D-(?:[A-Za-z0-9_\\-]+-)?\\d+@v\\d+'), 'doctor 计数双形态正则在场')
  } finally { rmSync(root, { recursive: true, force: true }) }
})

test('⑤ 向量契约锚：等值匹配语义不变 + 平台窗口降级注记在场', () => {
  const src = readFileSync(join(ROOT, 'src', 'knowledge-vector.js'), 'utf8')
  assert.ok(src.includes('e.id === r.anchor'), 'anchor 等值匹配语义不变（epoch 号天然等值）')
  assert.ok(src.includes('epoch 注记'), '平台重建索引窗口降级边界如实注记')
})

/** 读全部 decisions 域文件 → { 文件名: 全文 } */
function readAll(knowledgeRoot) {
  const out = {}
  const dir = join(knowledgeRoot, 'decisions')
  for (const f of readdirSync(dir)) {
    if (f.endsWith('.md')) out[f] = readFileSync(join(dir, f), 'utf8')
  }
  return out
}
