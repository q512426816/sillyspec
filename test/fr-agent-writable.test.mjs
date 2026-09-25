/**
 * fr-agent-writable.test.mjs — FR 区 agent 书写面（2026-09-25-fr-agent-writable）
 *
 * 验收面：
 *   ① 骨架形态：FR 区为 AGENT 槽（非 MACHINE-DRAFT 指纹段），input 摘录以注释形式在槽内；
 *   ② agent 填写 FR 后 flow done 通过（不需要 amend）；
 *   ③ FR 区空白 → flow done 拒收；
 *   ④ 绑定槽行为不变（空槽拒收）。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const CLI = join(ROOT, 'src', 'index.js')
const { draftAll, verifyRequirementBindings } = await import('../src/flow-draft.js')

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'faw-'))
  const changeDir = join(root, 'changes', 'c1')
  const runtimeRoot = join(root, '.runtime')
  mkdirSync(changeDir, { recursive: true })
  mkdirSync(runtimeRoot, { recursive: true })
  return { root, changeDir, runtimeRoot }
}

test('① 骨架形态：FR 区为 AGENT 槽（非指纹段），参考摘录在注释里', () => {
  const { root, changeDir, runtimeRoot } = fixture()
  draftAll({ changeDir, change: 'c1', input: '动机\n成功标准：\n- 标准 A\n- 标准 B', runtimeRoot })
  const reqs = readFileSync(join(changeDir, 'requirements.md'), 'utf8')
  assert.match(reqs, /AGENT:FR区/, 'FR 区是 AGENT 槽')
  assert.ok(!reqs.includes('MACHINE-DRAFT:requirements-frs'), 'FR 区不再是机器指纹段')
  assert.match(reqs, /<!--[\s\S]*参考摘录/, '参考摘录在注释里')
  assert.match(reqs, /标准 A/, '参考摘录含标准 A')
  assert.match(reqs, /AGENT:测试绑定FR-01/, '绑定槽在场')
  assert.match(reqs, /AGENT:测试绑定FR-02/, '第二条绑定槽在场')
  rmSync(root, { recursive: true, force: true })
})

test('② agent 直接填写 FR（无 amend）——verifyRequirementBindings 通过', () => {
  const { root, changeDir, runtimeRoot } = fixture()
  draftAll({ changeDir, change: 'c1', input: '动机\n成功标准：\n- 标准 A', runtimeRoot })
  // agent 填 FR + 绑定
  let reqs = readFileSync(join(changeDir, 'requirements.md'), 'utf8')
  reqs = reqs.replace('<!--AGENT:FR区 agent 填写功能需求（直接书写，不走 amend） -->',
    `<!--AGENT:FR区 agent 填写功能需求（直接书写，不走 amend） -->\n### FR-01: 行为 A 正常工作\nGiven 系统就绪\nWhen 执行 A\nThen 结果正确`)
  reqs = reqs.replace(/(<!--AGENT:测试绑定FR-01[^\n]*-->)/g, '$1\ntest/foo.test.mjs 用例 1')
  writeFileSync(join(changeDir, 'requirements.md'), reqs)
  const v = verifyRequirementBindings({ changeDir })
  assert.equal(v.emptySlots.length, 0, `agent 填写后应通过: ${JSON.stringify(v.emptySlots)}`)
  rmSync(root, { recursive: true, force: true })
})

test('③ FR 区空白 → 拒收（agent 没填功能需求）', () => {
  const { root, changeDir, runtimeRoot } = fixture()
  draftAll({ changeDir, change: 'c1', input: '动机\n成功标准：\n- 标准 A', runtimeRoot })
  // 只填绑定不填 FR
  let reqs = readFileSync(join(changeDir, 'requirements.md'), 'utf8')
  reqs = reqs.replace(/(<!--AGENT:测试绑定FR-01[^\n]*-->)/g, '$1\ntest/foo.test.mjs')
  writeFileSync(join(changeDir, 'requirements.md'), reqs)
  const v = verifyRequirementBindings({ changeDir })
  assert.ok(v.emptySlots.some((s) => s.includes('FR区')), `FR 区空白应拒: ${JSON.stringify(v.emptySlots)}`)
  rmSync(root, { recursive: true, force: true })
})

test('④ 绑定槽空 → 拒收（现有行为回归）', () => {
  const { root, changeDir, runtimeRoot } = fixture()
  draftAll({ changeDir, change: 'c1', input: '动机\n成功标准：\n- 标准 A', runtimeRoot })
  // 只填 FR 不填绑定
  let reqs = readFileSync(join(changeDir, 'requirements.md'), 'utf8')
  reqs = reqs.replace('<!--AGENT:FR区 agent 填写功能需求（直接书写，不走 amend） -->',
    `<!--AGENT:FR区 agent 填写功能需求（直接书写，不走 amend） -->\n### FR-01: 行为 A\nGiven x\nWhen y\nThen z`)
  writeFileSync(join(changeDir, 'requirements.md'), reqs)
  const v = verifyRequirementBindings({ changeDir })
  assert.ok(v.emptySlots.some((s) => s.includes('测试绑定')), `绑定空应拒: ${JSON.stringify(v.emptySlots)}`)
  rmSync(root, { recursive: true, force: true })
})
