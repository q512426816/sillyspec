/**
 * decision-caliber-unify.test.mjs — 决策 type/status 正典值集单一源（2026-10-20-decision-caliber-unify）
 *
 * 锁定语义（三套口径并存的清偿）：
 *   ① 单一源：decision-values.js 导出正典集；写入白名单=正典全集、蒸馏入选集=KNOWLEDGE_* 派生
 *     （类型=正典去 scope，状态=confirmed/accepted/implemented）。
 *   ② 写入白名单对齐：feasibility/consistency 可写（此前被拒而蒸馏想收）；正典外值照旧 fail-fast。
 *   ③ implemented 入选：status=implemented 条目随蒸馏链进知识库（此前合法但永不入选）。
 *   ④ brainstorm 提示清单同步：两处模板 type/status 值清单与正典集逐值一致（term/premise/risk/
 *     unresolved 等散值清除），渲染产物 docs/prompt/brainstorm.md 同步。
 *   ⑤ 开放世界兼容：存量散值条目解析宽容保留、蒸馏行为零变化。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync, existsSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const { DECISION_TYPES, DECISION_STATUSES, KNOWLEDGE_TYPES, KNOWLEDGE_STATUSES } = await import('../src/decision-values.js')
const { renderDecisionEntry } = await import('../src/decisions-io.js')
const { parseDecisions, distillIntoKnowledge } = await import('../src/decision-distill.js')

const tmpRoots = []
function mkChange(md) {
  const root = mkdtempSync(join(tmpdir(), 'dcu-')); tmpRoots.push(root)
  mkdirSync(root, { recursive: true })
  writeFileSync(join(root, 'decisions.md'), md)
  return root
}
test.after(() => { for (const d of tmpRoots) { try { rmSync(d, { recursive: true, force: true }) } catch {} } })

test('① 单一源派生：正典集形状 + 写入面恒等正典 + 蒸馏入选面恒等派生集', () => {
  assert.deepEqual([...DECISION_TYPES], ['architecture', 'compatibility', 'boundary', 'definition', 'process', 'scope', 'feasibility', 'consistency'])
  assert.deepEqual([...DECISION_STATUSES], ['confirmed', 'accepted', 'implemented', 'rejected', 'proposed', 'superseded', 'draft'])
  assert.deepEqual([...KNOWLEDGE_TYPES], DECISION_TYPES.filter((t) => t !== 'scope'), '入选类型=正典去 scope')
  assert.deepEqual([...KNOWLEDGE_STATUSES], ['confirmed', 'accepted', 'implemented'])
  // 写入面=正典全集：8 类 7 态逐一可渲染（零抛错）
  for (const t of DECISION_TYPES) assert.doesNotThrow(() => renderDecisionEntry({ number: 'D-001', version: 1, title: 'x', type: t }), `type=${t} 可写`)
  for (const s of DECISION_STATUSES) assert.doesNotThrow(() => renderDecisionEntry({ number: 'D-001', version: 1, title: 'x', status: s }), `status=${s} 可写`)
  // 蒸馏入选面=派生集：KNOWLEDGE_TYPES×confirmed 全入选、scope 恒排除、非 KNOWLEDGE_STATUSES 全排除
  const mk = (type, status) => `## D-099@v1 探针\n- 类型：${type}\n- 状态：${status}\n- 模块域：core-engine\n- 答案：探针\n`
  for (const t of KNOWLEDGE_TYPES) {
    for (const s of KNOWLEDGE_STATUSES) {
      const e = parseDecisions(mkChange(mk(t, s))).entries[0]
      assert.equal(e.selected, 'implemented', `${t}+${s} 入选`)
    }
    const eScope = parseDecisions(mkChange(mk('scope', 'confirmed'))).entries[0]
    assert.equal(eScope.selected, null, 'scope+confirmed 恒不入选（刻意排除）')
    for (const s of ['proposed', 'superseded', 'draft']) {
      const eOff = parseDecisions(mkChange(mk(t, s))).entries[0]
      assert.equal(eOff.selected, null, `${t}+${s} 不入选`)
    }
  }
})

test('② 写入白名单对齐：feasibility/consistency 放行，正典外值照旧拒绝', () => {
  for (const t of ['feasibility', 'consistency']) {
    const block = renderDecisionEntry({ number: 'D-002', version: 1, title: 'x', type: t, status: 'confirmed' })
    assert.match(block, new RegExp(`^- 类型：${t}$`, 'm'), `${t} 渲染进条目`)
  }
  for (const t of ['risk', 'term', 'premise', 'misc']) {
    assert.throws(() => renderDecisionEntry({ number: 'D-002', version: 1, title: 'x', type: t }), /type 白名单外/, `${t} 仍拒绝`)
  }
  assert.throws(() => renderDecisionEntry({ number: 'D-002', version: 1, title: 'x', status: 'unresolved' }), /status 白名单外/, 'unresolved 仍拒绝')
})

test('③ implemented 入选：条目随蒸馏链写盘进知识库', () => {
  const dir = mkChange([
    '# 决策记录',
    '',
    '## D-001@v1 统一授权表',
    '- 状态：implemented',
    '- 类型：architecture',
    '- 模块域：core-engine',
    '- 答案：选 B 授权表方案',
    '',
    '## D-002@v1 草稿项',
    '- 状态：draft',
    '- 类型：architecture',
    '- 模块域：core-engine',
    '- 答案：未定',
    '',
  ].join('\n') + '\n')
  const entries = parseDecisions(dir).entries
  assert.equal(entries.find((e) => e.number === 'D-001').selected, 'implemented', 'implemented 入选')
  assert.equal(entries.find((e) => e.number === 'D-002').selected, null, 'draft 不入选')
  const knowledge = mkdtempSync(join(tmpdir(), 'dcu-k-')); tmpRoots.push(knowledge)
  const res = distillIntoKnowledge(dir, knowledge, 'deadbeef', null)
  assert.equal(res.needsWait, null)
  assert.equal((res.written || []).length > 0, true, 'implemented 条目写盘')
  const domainFile = join(knowledge, 'decisions', 'core-engine.md')
  assert.equal(existsSync(domainFile), true, '域文件落盘')
  assert.match(readFileSync(domainFile, 'utf8'), /统一授权表/, '条目内容在库')
  assert.doesNotMatch(readFileSync(domainFile, 'utf8'), /草稿项/, 'draft 条目不入库')
})

test('④ brainstorm 提示清单同步：两处模板插值正典常量，渲染产物逐值一致', () => {
  const stageSrc = readFileSync(join(ROOT, 'src', 'stages', 'brainstorm.js'), 'utf8')
  // 源面=插值表达式（单一源最强形态：提示清单由常量渲染，源头不可能再漂移）
  const typeInterp = [...stageSrc.matchAll(/^- type: \$\{DECISION_TYPES\.join\(' \| '\)\}$/gm)].length
  const statusInterp = [...stageSrc.matchAll(/^- status: \$\{DECISION_STATUSES\.join\(' \| '\)\}$/gm)].length
  assert.equal(typeInterp, 2, '两处 type 清单插值正典常量（实际 ' + typeInterp + '）')
  assert.equal(statusInterp, 2, '两处 status 清单插值正典常量（实际 ' + statusInterp + '）')
  assert.ok(!/term \| boundary/.test(stageSrc), '旧散值 type 清单清除')
  assert.ok(!/unresolved \| rejected/.test(stageSrc), '旧散值 status 清单清除')
  // 渲染面=正典逐值一致（_extract 再生成产物）
  const rendered = readFileSync(join(ROOT, 'docs', 'prompt', 'brainstorm.md'), 'utf8')
  const renderedTypeLines = [...rendered.matchAll(/^- type: (.+)$/gm)].map((m) => m[1])
  assert.equal(renderedTypeLines.length, 2, '渲染产物两处 type 清单')
  for (const line of renderedTypeLines) {
    const tokens = line.split('|').map((s) => s.trim()).filter(Boolean)
    assert.deepEqual([...tokens].sort(), [...DECISION_TYPES].sort(), `渲染产物 type 清单=正典（实际：${line}）`)
  }
  const renderedStatusLines = [...rendered.matchAll(/^- status: (.+)$/gm)].map((m) => m[1])
  assert.equal(renderedStatusLines.length, 2, '渲染产物两处 status 清单')
  for (const line of renderedStatusLines) {
    const tokens = line.split('|').map((s) => s.trim()).filter(Boolean)
    assert.deepEqual([...tokens].sort(), [...DECISION_STATUSES].sort(), `渲染产物 status 清单=正典（实际：${line}）`)
  }
})

test('⑤ 开放世界兼容：存量散值条目解析宽容、蒸馏零写盘', () => {
  const dir = mkChange([
    '# 决策记录',
    '',
    '## D-001@v1 术语口径',
    '- type: term',
    '- status: accepted',
    '- 模块域：core-engine',
    '- 答案：术语对齐',
    '',
  ].join('\n') + '\n')
  const parsed = parseDecisions(dir)
  assert.equal(parsed.missing, false)
  assert.equal(parsed.entries.length, 1, '散值条目照旧解析')
  assert.equal(parsed.entries[0].type, 'term')
  assert.equal(parsed.entries[0].selected, null, '散值不入选（行为同改动前）')
  const knowledge = mkdtempSync(join(tmpdir(), 'dcu-k2-')); tmpRoots.push(knowledge)
  const res = distillIntoKnowledge(dir, knowledge, 'deadbeef', null)
  assert.equal((res.written || []).length, 0, '零写盘')
  const decDir = join(knowledge, 'decisions')
  assert.ok(!existsSync(decDir) || readdirSync(decDir).length === 0, '知识库零新建')
})

test('⑥ 既有套件零回归：decisions-io / distill 双格式 / 标题变体 / 锚点回填 全绿', () => {
  const env = { ...process.env }
  delete env.NODE_TEST_CONTEXT
  const s = spawnSync(process.execPath, [
    '--test',
    'test/decisions-io.test.mjs',
    'test/decision-distill-flat-list.test.mjs',
    'test/decision-distill-heading-variants.test.mjs',
    'test/decision-anchor-backfill.test.mjs',
  ], { cwd: ROOT, encoding: 'utf8', timeout: 300_000, env })
  assert.equal(s.status, 0, `四套件全绿（实际 exit ${s.status}）\n${(s.stdout + s.stderr).slice(-1500)}`)
  const failMatch = /ℹ fail (\d+)/.exec(s.stdout)
  assert.ok(failMatch, 'TAP 摘要在场')
  assert.equal(failMatch[1], '0', 'fail 计数为 0')
})
