/**
 * fr-agent-writable.test.mjs — FR 正文 agent 书写（2026-10-04-thin-docs-v2 起草形态）
 *
 * 演进：2026-09-25-fr-agent-writable 将 FR 区从机器指纹段改为 AGENT 槽书写面；
 * 2026-09-26-governance-autopilot 加 GWT 骨架预填；2026-10-04-thin-docs-v2 起草再
 * 退位——纯 markdown（零指纹标记零槽注释），FR 只有标题锚（成功标准原文），行为句
 * （带强度词）与场景块归 agent 撰写，机器不再预填 GWT 场景体。
 *
 * 验收面：
 *   ① 骨架形态：FR 标题锚=标准原文；零标记零预填 GWT；
 *   ② agent 撰写行为句+场景块（无 amend）——verifyRequirementBindings/verifyThinDocsV2 通过；
 *   ③ 行为句未撰写（待撰写在场或缺强度词）→ verifyThinDocsV2 拒收；
 *   ④ 绑定行空/待填 → 拒收（现有行为回归）。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { draftAll, verifyRequirementBindings, verifyThinDocsV2 } from '../src/flow-draft.js'

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'faw-'))
  const changeDir = join(root, 'changes', 'c1')
  const runtimeRoot = join(root, '.runtime')
  mkdirSync(changeDir, { recursive: true })
  mkdirSync(runtimeRoot, { recursive: true })
  return { root, changeDir, runtimeRoot }
}

function fillAnswers(dir) {
  // design 四节作答 + FR 行为句 + 绑定行（v2 合法书写=写正文）
  const fill = (f, fn) => writeFileSync(join(dir, f), fn(readFileSync(join(dir, f), 'utf8')))
  fill('design.md', (t) => t.replace(/^(本变更怎么解决问题|动了哪些函数|1\. 乱序|2\. 并发写|3\. 切换|4\. 作用域|本方案最大的风险)([^\n]*)$/gm, '$&\n不适用：一行作答'))
  return fill
}

test('① 骨架形态：FR 标题锚=标准原文；零标记零预填 GWT；绑定纯文本行', () => {
  const { root, changeDir, runtimeRoot } = fixture()
  draftAll({ changeDir, change: 'c1', input: '动机\n成功标准：\n- 标准 A\n- 标准 B', runtimeRoot })
  const reqs = readFileSync(join(changeDir, 'requirements.md'), 'utf8')
  assert.ok(!/<!--\s*AGENT:|<!--\s*MACHINE-DRAFT:/.test(reqs), '零槽注释零指纹标记')
  assert.match(reqs, /### FR-01: 标准 A/, '标准 A 进 FR-01 标题锚')
  assert.match(reqs, /### FR-02: 标准 B/, '标准 B 进 FR-02 标题锚')
  assert.ok(!/^Given |^When |^Then /m.test(reqs), '无预填 GWT 行')
  assert.match(reqs, /^FR-01: （待填/m, '纯文本绑定行')
  rmSync(root, { recursive: true, force: true })
})

test('② agent 撰写行为句+场景块（无 amend）——绑定门与 v2 工件校验通过', () => {
  const { root, changeDir, runtimeRoot } = fixture()
  draftAll({ changeDir, change: 'c1', input: '动机\n成功标准：\n- 标准 A', runtimeRoot })
  const fill = fillAnswers(changeDir)
  fill('requirements.md', (t) => t
    .replace(/^- （待撰写.*$/m, '- 系统 MUST 使标准 A 行为生效并可判定')
    .replace(/^FR-01: （待填.*$/m, 'FR-01: test/foo.test.mjs 用例 1'))
  const ledger = JSON.parse(readFileSync(join(runtimeRoot, 'draft-ledger-c1.json'), 'utf8'))
  const v = verifyThinDocsV2({ changeDir, ledger })
  assert.equal(v.violations.length, 0, `agent 撰写后应通过: ${JSON.stringify(v.violations)}`)
  assert.equal(verifyRequirementBindings({ changeDir }).emptySlots.length, 0, '绑定行已答')
  rmSync(root, { recursive: true, force: true })
})

test('③ 行为句未撰写（待撰写占位在场）→ verifyThinDocsV2 拒收', () => {
  const { root, changeDir, runtimeRoot } = fixture()
  draftAll({ changeDir, change: 'c1', input: '动机\n成功标准：\n- 标准 A', runtimeRoot })
  const fill = fillAnswers(changeDir)
  fill('requirements.md', (t) => t.replace(/^FR-01: （待填.*$/m, 'FR-01: test/foo.test.mjs'))
  const ledger = JSON.parse(readFileSync(join(runtimeRoot, 'draft-ledger-c1.json'), 'utf8'))
  const v = verifyThinDocsV2({ changeDir, ledger })
  assert.ok(v.violations.some((x) => /FR-01 行为句未撰写/.test(x)), `待撰写占位应拒: ${JSON.stringify(v.violations)}`)
  rmSync(root, { recursive: true, force: true })
})

test('④ 绑定行空/待填 → 拒收（现有行为回归）', () => {
  const { root, changeDir, runtimeRoot } = fixture()
  draftAll({ changeDir, change: 'c1', input: '动机\n成功标准：\n- 标准 A', runtimeRoot })
  const fill = fillAnswers(changeDir)
  fill('requirements.md', (t) => t.replace(/^- （待撰写.*$/m, '- 系统 MUST 使标准 A 生效'))
  const v = verifyRequirementBindings({ changeDir })
  assert.ok(v.emptySlots.some((s) => s.includes('测试绑定') || s.includes('FR-01')), `绑定待填应拒: ${JSON.stringify(v.emptySlots)}`)
  rmSync(root, { recursive: true, force: true })
})
