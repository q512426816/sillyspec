/**
 * 2026-10-07-wave-auto-adopt-review-dedup — Wave 自动重排 + 评审任务书前轮 findings 回归
 *
 * postmortem（provider-model-list）：Wave 返工链三轮（同 Wave 冲突→手工拆→伪并行串行链）；
 * 评审员两轮报同类问题。锁死契约：
 *   WA1 同 Wave 冲突且 depends_on 拓扑可分离 → 自动重排后 postcheck 整体通过（plan.md 已重排）；
 *   WA2 伪并行碎片（独立任务手排多波）→ 自动合并重排后通过；
 *   WA3 auto_adopt_waves: false → 零自动重排（冲突 error 照报，行为=2026-10-07 前现状）；
 *   WA4 混有非 Wave 类错误 → 不自动重排（两族错误都报）；
 *   RB1 复审任务书含前轮 findings 清单与复审优先级引导；无 review.json 首评任务书逐字=现状。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { executePlanPostcheck } from '../src/stages/plan-postcheck.js'
import { renderReviewerTaskbook } from '../src/flow-review.js'

const roots = []
function mk(p) { const d = mkdtempSync(join(tmpdir(), p)); roots.push(d); return d }
test.after(() => { for (const d of roots) { try { rmSync(d, { recursive: true, force: true }) } catch {} } })

const CARD = (id, paths, deps = '[]') => [
  '---', `id: ${id}`, `title: t-${id}`, `title_zh: 任务${id}`, 'author: t',
  'created_at: 2026-10-07 00:00:00', 'priority: P0', `depends_on: ${deps}`, 'blocks: []',
  'requirement_ids: []', 'decision_ids: []',
  'allowed_paths:', ...paths.map(p => `  - ${p}`),
  'goal: >', '  g', 'implementation:', '  - i', 'acceptance:', '  - a',
  'verify:', '  - node --version', 'constraints:', '  - c', '---', '',
].join('\n')

function fixture({ planWaves, deps = {}, yaml = null, perTaskPaths = false }) {
  const root = mk('wa-')
  const specBase = join(root, '.sillyspec')
  const changeDir = join(specBase, 'changes', 'c1')
  mkdirSync(join(changeDir, 'tasks'), { recursive: true })
  if (yaml != null) writeFileSync(join(specBase, 'local.yaml'), yaml)
  const planLines = ['---', 'plan_level: full', '---', '', '# 计划', '']
  for (const [w, tasks] of Object.entries(planWaves)) {
    planLines.push(`## Wave ${w}`)
    for (const t of tasks) planLines.push(`- ${t}`)
    planLines.push('')
  }
  writeFileSync(join(changeDir, 'plan.md'), planLines.join('\n'))
  const taskIds = Object.values(planWaves).flat()
  writeFileSync(join(changeDir, 'tasks.md'), taskIds.map(t => `- [ ] ${t}: t`).join('\n') + '\n')
  for (const t of taskIds) {
    const paths = perTaskPaths ? [`src/${t}.js`] : ['src/shared.js']
    writeFileSync(join(changeDir, 'tasks', `${t}.md`), CARD(t, paths, JSON.stringify(deps[t] || [])))
  }
  const context = {
    cwd: root,
    specRoot: specBase,
    progress: { currentChange: 'c1' },
    resolveChangeDir: () => changeDir,
  }
  return { root, specBase, changeDir, context }
}

const capture = async (fn) => {
  const logs = []
  const orig = { log: console.log, error: console.error, warn: console.warn }
  console.log = (...a) => logs.push(['log', a.join(' ')])
  console.error = (...a) => logs.push(['error', a.join(' ')])
  console.warn = (...a) => logs.push(['warn', a.join(' ')])
  try { return { result: await fn(), logs } } finally { console.log = orig.log; console.error = orig.error; console.warn = orig.warn }
}

test('WA1 同 Wave 冲突且拓扑可分离 → 自动重排后 postcheck 通过', async () => {
  // task-02 depends_on task-01，两卡同改 src/shared.js 却被手排进同一 Wave —— 拓扑本就该分离
  const { context, changeDir } = fixture({ planWaves: { 1: ['task-01', 'task-02'] }, deps: { 'task-02': ['task-01'] } })
  const { result, logs } = await capture(() => executePlanPostcheck(context))
  const text = logs.map(l => l[1]).join('\n')
  assert.ok(text.includes('已自动按 depends_on 拓扑重排'), `自动重排公告在场：${text.slice(0, 400)}`)
  const plan = readFileSync(join(changeDir, 'plan.md'), 'utf8')
  const w2 = plan.indexOf('## Wave 2')
  assert.ok(w2 > -1 && plan.indexOf('- task-01') < w2 && plan.indexOf('- task-02') > w2, `重排后 task-01/task-02 分波：\n${plan}`)
  // 走到这里未被 reject 即 postcheck 整体通过（复跑成功）
})

test('WA2 伪并行碎片（4 独立任务手排四波，≥2 可合并对）→ 自动合并后通过', async () => {
  const { context, changeDir } = fixture({ planWaves: { 1: ['task-01'], 2: ['task-02'], 3: ['task-03'], 4: ['task-04'] }, perTaskPaths: true })
  const { logs } = await capture(() => executePlanPostcheck(context))
  const text = logs.map(l => l[1]).join('\n')
  const plan = readFileSync(join(changeDir, 'plan.md'), 'utf8')
  assert.ok(!/## Wave 2/.test(plan), `碎片波已合并为单波：\n${plan}`)
  assert.ok(text.includes('已自动按 depends_on 拓扑重排'), `自动重排公告在场：${text.slice(0, 300)}`)
})

test('WA3 auto_adopt_waves: false → 零自动重排（冲突照报）', async () => {
  const { context, changeDir } = fixture({
    planWaves: { 1: ['task-01', 'task-02'] },
    deps: { 'task-02': ['task-01'] },
    yaml: 'plan:\n  auto_adopt_waves: false\n',
  })
  await assert.rejects(() => executePlanPostcheck(context), /被 Wave 1 内|蓝图一致性/, '冲突 error 照抛')
  const plan = readFileSync(join(changeDir, 'plan.md'), 'utf8')
  assert.ok(/## Wave 1\n- task-01\n- task-02/.test(plan.replace(/\r/g, '')), 'plan.md 未被重排（现状行为）')
})

test('WA4 混有非 Wave 类错误 → 不自动重排', async () => {
  const root = mk('wa4-')
  const specBase = join(root, '.sillyspec')
  const changeDir = join(specBase, 'changes', 'c1')
  mkdirSync(join(changeDir, 'tasks'), { recursive: true })
  writeFileSync(join(changeDir, 'plan.md'), '---\nplan_level: full\n---\n\n# 计划\n\n## Wave 1\n- task-01\n- task-02\n')
  writeFileSync(join(changeDir, 'tasks.md'), '- [ ] task-01: t\n- [ ] task-02: t\n')
  // task-02 缺 title_zh（非 Wave 类错误）+ 同 Wave 共享 src/shared.js（Wave 类错误）
  writeFileSync(join(changeDir, 'tasks', 'task-01.md'), CARD('task-01', ['src/shared.js']))
  writeFileSync(join(changeDir, 'tasks', 'task-02.md'), CARD('task-02', ['src/shared.js']).replace('title_zh: 任务task-02\n', ''))
  const context = { cwd: root, specRoot: specBase, progress: { currentChange: 'c1' }, resolveChangeDir: () => changeDir }
  const { logs } = await capture(() => assert.rejects(() => executePlanPostcheck(context)))
  const text = logs.map(l => l[1]).join('\n')
  assert.ok(!text.includes('已自动按 depends_on 拓扑重排'), '混合错误不自动重排')
  assert.ok(text.includes('title_zh'), '非 Wave 类错误如实报出')
})

test('RB1 复审任务书含前轮 findings；首评任务书与现状一致', () => {
  const root = mk('rb-')
  const changeDir = join(root, 'c1')
  mkdirSync(changeDir, { recursive: true })
  // 首评：无 review.json
  const first = renderReviewerTaskbook({ change: 'c1', changeDir, head: 'abc123def456' })
  assert.ok(!first.includes('前轮评审 findings'), '首评无前轮段')
  assert.ok(first.includes('独立评审任务书'), '任务书主体在场')
  // 复审：前轮 review.json 在场
  writeFileSync(join(changeDir, 'review.json'), JSON.stringify({
    schemaVersion: 1, change: 'c1', reviewer: 'subagent', verdict: 'FAIL',
    reviewedAgainst: 'abc123def456',
    findings: [
      { severity: 'P1', title: '承诺的备份未落盘', evidence: 'x', location: 'a.js:1' },
      { severity: 'P2', title: '文档漂移', evidence: 'y', location: 'b.js:2' },
    ],
    dimensionNotes: {}, reviewedAt: '2026-10-07T00:00:00Z',
  }))
  const re = renderReviewerTaskbook({ change: 'c1', changeDir, head: 'def456abc789' })
  assert.ok(re.includes('前轮评审 findings（2 项'), `前轮段在场：${re.slice(re.indexOf('前轮') - 50, re.indexOf('前轮') + 200)}`)
  assert.ok(re.includes('[P1] 承诺的备份未落盘'), 'findings 逐条列出')
  assert.ok(re.includes('只验「修复到位 + 未引入回归」'), '复审优先级引导在场')
  assert.ok(re.includes('def456abc789'), '本轮 head 照抄不受前轮影响')
})
