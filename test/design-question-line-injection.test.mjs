/**
 * 坑 flow-done-design-question-line-injection 回归：问句锚折进回答行前缀时不注入不拒收
 *
 * 实证（2026-10-13-turn-live-visibility）：agent 四问回答行「N. <问句>：答」形态——问句无
 * 整行相等命中 → 回填器相似度低于阈值 → 四条全走节首兜底插入，同位反复 splice 产出
 * 倒序重复问句块叠在回答前。
 *
 * 锁定（verifyThinDocsV2 经 verifyFlowDrafts 的 v2 轨）：
 *   ① 前缀形态（N. 问句：答 / - 问句：…）→ 零 repairs 零 violations，design 原文不动；
 *   ② 整行问句在场（骨架原样）→ 放行；
 *   ③ 真改写（行内无锚原文）→ 仍走回填（repairs 在场）注入锚原文。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { writeFileSync, mkdirSync, mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { verifyFlowDrafts, DESIGN_QUESTIONS, draftLedgerPath } from '../src/flow-draft.js'

const tmpRoots = []
function mkLedgerFixture(designBody) {
  const d = mkdtempSync(join(tmpdir(), 'qinj-'))
  tmpRoots.push(d)
  const cd = join(d, '.sillyspec', 'changes', 'c1')
  const rt = join(d, '.sillyspec', '.runtime')
  mkdirSync(cd, { recursive: true })
  mkdirSync(rt, { recursive: true })
  mkdirSync(join(rt, 'state'), { recursive: true })
  const qs = DESIGN_QUESTIONS.sections[2].lines // 四问
  const body = designBody(qs)
  // 骨架全节含问句行（真实 flow start 形态）；仅四问节按 mode 变体
  const secs = DESIGN_QUESTIONS.sections
  const design = [
    '---', 'author: flow-machine-draft', '---',
    '# 设计记录（Design Record）— c1', '',
    ...secs.flatMap((sec) => [
      `## ${sec.heading}`, '',
      ...(sec.key === 'boundaries' ? body.split('\n') : [...sec.lines, '', '答：x']),
      '',
    ]),
  ].join('\n')
  writeFileSync(join(cd, 'design.md'), design)
  writeFileSync(join(cd, 'proposal.md'), '# P\n')
  writeFileSync(join(cd, 'requirements.md'), '# R\n')
  writeFileSync(join(cd, 'tasks.md'), '# T\n- [ ] task-01: x\n')
  writeFileSync(draftLedgerPath(rt, 'c1'), JSON.stringify({
    schemaVersion: 2, change: 'c1', generatedAt: new Date().toISOString(),
    anchor: { criteria: ['c'], designQuestions: DESIGN_QUESTIONS },
    files: {}, amendments: [],
  }))
  return { cd, rt }
}
test.onFinish?.(() => { for (const t of tmpRoots) rmSyncT(t) })
import { rmSync } from 'node:fs'
const rmSyncT = (t) => { try { rmSync(t, { recursive: true, force: true }) } catch {} }

test('① 前缀形态（N. 问句：答）→ 零注入零拒收，design 不动', () => {
  const { cd, rt } = mkLedgerFixture((qs) => qs.map((q, i) => `${i + 1}. ${q} 答案${i + 1}`).join('\n'))
  const before = readFileSync(join(cd, 'design.md'), 'utf8')
  const r = verifyFlowDrafts({ changeDir: cd, change: 'c1', runtimeRoot: rt })
  assert.deepEqual(r.violations.filter((v) => v.includes('问题文本被改写')), [], '不拒收')
  assert.deepEqual(r.repairs || [], [], '不注入')
  assert.equal(readFileSync(join(cd, 'design.md'), 'utf8'), before, 'design 原文零改动')
})

test('② 骨架整行问句在场 → 放行（既有行为零变化）', () => {
  const { cd, rt } = mkLedgerFixture((qs) => qs.join('\n'))
  const r = verifyFlowDrafts({ changeDir: cd, change: 'c1', runtimeRoot: rt })
  assert.deepEqual(r.violations.filter((v) => v.includes('问题文本被改写')), [], '整行在场放行')
  assert.deepEqual(r.repairs || [], [], '无注入')
})

test('③ 真改写（行内无锚原文）→ 回填注入锚原文（既有恢复链保持）', () => {
  const { cd, rt } = mkLedgerFixture(() => ['乱序到达时假设仍成立。', '并发写会加锁。', '切换是安全的。', '不会串台。'].join('\n'))
  const r = verifyFlowDrafts({ changeDir: cd, change: 'c1', runtimeRoot: rt })
  assert.deepEqual(r.violations.filter((v) => v.includes('问题文本被改写')), [], '回填后不残留拒收')
  assert.ok((r.repairs || []).length >= 1, `repairs 在场（实际 ${(r.repairs || []).length}）`)
  const after = readFileSync(join(cd, 'design.md'), 'utf8')
  assert.ok(after.includes('1. 乱序/迟到到达：输入或事件乱序时，本设计的假设还成立吗？'), '锚原文已注入')
})
