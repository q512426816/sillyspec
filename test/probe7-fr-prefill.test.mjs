/**
 * 2026-10-06-verify-docs-prefill — 探针 7 既有用例候选预填回归
 *
 * postmortem（sess_4769fd5d）：38 格矩阵手誊 40 分钟——无归属测试的卡预填「无归属测试——
 * 判定大概率 uncovered」，而 FR 关联回归既有用例（collectFrLinkedTests，本变更未改动）本可
 * 机械给出。锁死契约：
 *   P1 无归属卡 + FR 命中：既有用例进 testFiles + 渲染「既有用例」注记行；
 *   P2 有归属卡（own test）：existingTests 为空，注记行不出（零噪音）；
 *   P3 无 FR 知识：行为与现状一致（testFiles 空、无注记行）。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { runVerifyProbes, renderVerifyProbesReport } from '../src/verify-probes.js'

const roots = []
function mk(p) { const d = mkdtempSync(join(tmpdir(), p)); roots.push(d); return d }
test.after(() => { for (const d of roots) { try { rmSync(d, { recursive: true, force: true }) } catch {} } })

function fixture({ withFr }) {
  const root = mk('p7fr-')
  const specBase = join(root, '.sillyspec')
  mkdirSync(join(specBase, 'changes', 'demo'), { recursive: true })
  mkdirSync(join(root, 'src'), { recursive: true })
  mkdirSync(join(root, 'test'), { recursive: true })
  writeFileSync(join(root, 'src', 'lib.js'), 'export const a = 1\n')
  writeFileSync(join(root, 'test', 'existing-regress.test.mjs'), "import { test } from 'node:test'\nimport { a } from '../src/lib.js'\ntest('regress', () => { if (a !== 1) throw new Error('x') })\n")
  writeFileSync(join(root, 'test', 'own.test.mjs'), "import { test } from 'node:test'\nimport { a } from '../src/lib.js'\ntest('own', () => { if (a !== 1) throw new Error('x') })\n")
  const changeDir = join(specBase, 'changes', 'demo')
  writeFileSync(join(changeDir, 'design.md'), [
    '---', 'change: demo', '---', '# 设计', '',
    '## 文件变更清单', '', '| 操作 | 文件路径 | 说明 |', '|---|---|---|', '| 修改 | src/lib.js | 改动 |', '',
  ].join('\n'))
  writeFileSync(join(changeDir, 'tasks.md'), '---\nauthor: t\n---\n\n# 任务注册表\n\n- [ ] task-01: 无归属任务\n- [ ] task-02: 自带测试任务\n')
  const card = (id, allowed) => [
    '---', `id: ${id}`, `title: t-${id}`, `title_zh: 任务${id}`, 'author: t',
    'created_at: 2026-10-06 00:00:00', 'priority: P0', 'depends_on: []', 'blocks: []',
    'requirement_ids: []', 'decision_ids: []',
    'allowed_paths:', ...allowed.map(p => `  - ${p}`),
    'goal: >', '  g', 'implementation:', '  - i',
    'acceptance:', '  - 返回值 a 恒为 1',
    'verify:', '  - node --version', 'constraints:', '  - c', '---', '',
  ].join('\n')
  mkdirSync(join(changeDir, 'tasks'), { recursive: true })
  writeFileSync(join(changeDir, 'tasks', 'task-01.md'), card('task-01', ['src/lib.js']))
  writeFileSync(join(changeDir, 'tasks', 'task-02.md'), card('task-02', ['src/lib.js', 'test/own.test.mjs']))
  if (withFr) {
    mkdirSync(join(specBase, 'knowledge', 'fr'), { recursive: true })
    mkdirSync(join(specBase, 'docs', 'proj', 'modules'), { recursive: true })
    mkdirSync(join(specBase, 'changes', 'archive', '2026-09-20-old-change'), { recursive: true })
    writeFileSync(join(specBase, 'docs', 'proj', 'modules', '_module-map.yaml'), 'modules:\n  core:\n    paths:\n      - src/\n')
    writeFileSync(join(specBase, 'changes', 'archive', '2026-09-20-old-change', 'change-patch.json'), '{"files": ["src/lib.js"]}\n')
    writeFileSync(join(specBase, 'knowledge', 'fr', 'core.md'), [
      '## FR-core-001 库行为', '变更：2026-09-20-old-change', '状态：active', '摘要：返回值恒定', '',
      '测试绑定：', '<!-- test-bindings: 机器字段（sillyspec tests 管理），勿手改 -->',
      '- row: 2026-09-20-old-change:task-01:FR-01', '  tests: test/existing-regress.test.mjs',
      '  reason: spec', '  state: candidate', '  discovery: machine',
      '  confirmed_by: null', '  confirmed_at: null', '',
    ].join('\n'))
  }
  return { root, specBase }
}

test('P1 无归属卡 + FR 命中：既有用例进 testFiles 且渲染注记行', () => {
  const { root, specBase } = fixture({ withFr: true })
  const r = runVerifyProbes({ cwd: root, changeName: 'demo', specDir: specBase })
  const t1 = r.probe7.tasks.find(t => t.task === 'task-01')
  const t2 = r.probe7.tasks.find(t => t.task === 'task-02')
  assert.ok(t1, 'task-01 在矩阵')
  assert.ok((t1.testFiles || []).includes('test/existing-regress.test.mjs'), `既有用例进归属：${t1.testFiles}`)
  assert.ok((t1.existingTests || []).includes('test/existing-regress.test.mjs'), 'existingTests 标注在场')
  assert.deepEqual(t2.existingTests || [], [], 'P2 有归属卡不注入（零噪音）')
  assert.ok((t2.testFiles || []).includes('test/own.test.mjs'), '有归属卡自身归属不变')
  const md = renderVerifyProbesReport(r)
  assert.ok(md.includes('既有用例候选'), `渲染注记行：${md.slice(md.indexOf('**task-01**'), md.indexOf('**task-01**') + 400)}`)
  const t1Section = md.slice(md.indexOf('**task-01**'), md.indexOf('**task-02**'))
  const t2Section = md.slice(md.indexOf('**task-02**'))
  assert.ok(t1Section.includes('既有用例候选'), '注记行在 task-01 段内')
  assert.ok(!t2Section.includes('既有用例候选'), 'task-02 段无注记行')
})

test('P3 无 FR 知识：行为与现状一致（无注入、无注记）', () => {
  const { root, specBase } = fixture({ withFr: false })
  const r = runVerifyProbes({ cwd: root, changeName: 'demo', specDir: specBase })
  const t1 = r.probe7.tasks.find(t => t.task === 'task-01')
  assert.deepEqual(t1.testFiles || [], [], '无 FR 知识时归属为空（现状一致）')
  assert.deepEqual(t1.existingTests || [], [], '无注入')
  const md = renderVerifyProbesReport(r)
  assert.ok(!md.includes('既有用例候选'), '无注记行')
})
