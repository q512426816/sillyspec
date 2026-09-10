/**
 * 决策提炼双格式兼容 + 0 条显式告警（坑 decision-flat-list-silent-zero，2026-09-10 驾驭小结
 * 第四批②，用户实证：扁平列表格式 decisions.md 解析 0 条静默放行，决策知识凭空丢失）。
 *
 * 锁定语义：
 *   - 扁平列表式 `- D-xxx@vN：标题 ｜ 状态：implemented ｜ 模块域：x` 可解析（行内 ｜ 字段）
 *   - 扁平列表式 + 缩进子项字段（`  - 状态：implemented`）可解析
 *   - 标题式（`## D-xxx`）既有行为零回归；两格式混存都收
 *   - 乱格式（有 D-xxx 形态但两种都不匹配）→ parseDecisions 返回 zeroWithContent=true，
 *     distillIntoKnowledge console.warn 显式告警（不再静默）
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { parseDecisions, distillIntoKnowledge } from '../src/decision-distill.js'

const tmpRoots = []
function mkChange(md) {
  const root = mkdtempSync(join(tmpdir(), 'dd-flat-')); tmpRoots.push(root)
  mkdirSync(root, { recursive: true })
  writeFileSync(join(root, 'decisions.md'), md)
  return root
}
function mkKnowledge() {
  const k = mkdtempSync(join(tmpdir(), 'dd-flat-k-')); tmpRoots.push(k)
  return k
}
test.after(() => { for (const d of tmpRoots) { try { rmSync(d, { recursive: true, force: true }) } catch {} } })

test('扁平列表式（行内 ｜ 字段）：可解析、字段进条目、状态入选', () => {
  const dir = mkChange([
    '# Decisions',
    '',
    '- D-001@v1：统一走 SQLite ｜ 状态：confirmed ｜ 模块域：core-engine ｜ type：process',
    '- D-002@v1：废弃 localStorage ｜ 状态：rejected ｜ 否决理由：并发丢数据 ｜ 复潮条件：出现单机场景',
    '',
  ].join('\n') + '\n')
  const { entries, missing, zeroWithContent } = parseDecisions(dir)
  assert.equal(missing, false)
  assert.equal(zeroWithContent, false)
  assert.equal(entries.length, 2, `两条扁平条目都解析（实际 ${entries.length}）`)
  const d1 = entries.find(e => e.number === 'D-001')
  assert.equal(d1.title, '统一走 SQLite', '标题取首个非字段段')
  assert.equal(d1.status, 'confirmed', '行内 状态 字段进条目（中文别名）')
  assert.deepEqual(d1.domains, ['core-engine'], '行内 模块域 字段解析为列表')
  assert.equal(d1.type, 'process', '行内 type 字段进条目')
  assert.equal(d1.selected, 'implemented', 'process+confirmed 入选（FR-02 语义）')
  const d2 = entries.find(e => e.number === 'D-002')
  assert.equal(d2.selected, 'rejected', 'rejected 入选')
  assert.equal(d2.rejectReason, '并发丢数据', '行内 否决理由 进条目')
})

test('扁平列表式 + 缩进子项字段：子项字段同样进条目', () => {
  const dir = mkChange([
    '- D-003@v1 采用 glob 白名单',
    '  - 状态：implemented',
    '  - 模块域：docs-consistency',
    '',
  ].join('\n') + '\n')
  const { entries } = parseDecisions(dir)
  assert.equal(entries.length, 1)
  assert.equal(entries[0].title, '采用 glob 白名单')
  assert.equal(entries[0].status, 'implemented')
  assert.deepEqual(entries[0].domains, ['docs-consistency'])
})

test('标题式零回归 + 两格式混存都收', () => {
  const dir = mkChange([
    '# Decisions',
    '',
    '## D-010@v1 标题式条目',
    '- 状态：implemented',
    '- 模块域：core-engine',
    '',
    '- D-011@v1：扁平式条目 ｜ 状态：implemented',
    '',
  ].join('\n') + '\n')
  const { entries } = parseDecisions(dir)
  assert.equal(entries.length, 2, '两格式混存都解析')
  const h = entries.find(e => e.number === 'D-010')
  assert.equal(h.title, '标题式条目', '标题式标题原样')
  assert.equal(h.status, 'implemented', '标题式顶格字段行零回归')
  assert.equal(entries.find(e => e.number === 'D-011').status, 'implemented')
})

test('乱格式 0 条 → zeroWithContent=true + distill 显式告警（不再静默）', () => {
  // 有 D-xxx 形态但既无 ## 标题也无 - D-xxx 列表开头（如表格行 | D-001 | ...）
  const dir = mkChange([
    '# Decisions',
    '',
    '| 编号 | 结论 |',
    '|---|---|',
    '| D-001 | 用 SQLite |',
    '| D-002 | 弃 localStorage |',
    '',
  ].join('\n') + '\n')
  const parsed = parseDecisions(dir)
  assert.equal(parsed.entries.length, 0)
  assert.equal(parsed.zeroWithContent, true, '表格形态 0 条 → zeroWithContent 标记')
  // distill warn 可见（捕获 console.warn）
  const k = mkKnowledge()
  const origWarn = console.warn
  let warned = ''
  console.warn = (...a) => { warned += a.join(' ') }
  try {
    const r = distillIntoKnowledge(dir, k, 'deadbeef')
    assert.equal(r.written.length, 0)
    assert.ok(warned.includes('0 条可解析'), `distill 显式告警（实际：${warned.slice(0, 80)}）`)
  } finally {
    console.warn = origWarn
  }
  // 反例：干净空文件（无 D-xxx 形态）不告警
  const clean = mkChange('# Decisions\n\n（本变更无决策条目）\n')
  const parsedClean = parseDecisions(clean)
  assert.equal(parsedClean.zeroWithContent, false, '无 D-xxx 形态的空文件不误报')
})

test('扁平式 rejected 缺否决理由 → needsWait 拦下（与标题式同语义）', () => {
  const dir = mkChange('- D-004@v1：弃某方案 ｜ 状态：rejected\n')
  const k = mkKnowledge()
  const r = distillIntoKnowledge(dir, k, 'deadbeef')
  assert.ok(r.needsWait && r.needsWait.includes('D-004'), 'rejected 缺理由被 needsWait 拦（字段解析真实生效）')
  assert.equal(r.written.length, 0)
})
