/**
 * 并批 advisory（B-③ / FR-01，2026-09-21-r5-efficiency-batch1 task-01）：
 * checkBatchAdvisory 纯函数判定（warning 数组，绝不阻断）+ stepGeneratePlan prompt 并批三行文本钉。
 *
 * 判定① batch_orthogonal_unbundled：Wave 任务两两文件正交（无共享 target_files、无
 *   depends_on / expects_from 契约链）且无任何并批信号 → 提示默认并批。阈值 N≥4：
 *   N≤3 时任何并批都违反批数护栏 min(3,N)=N（未并批已是唯一合规形态），提示会制造
 *   ①↔② 打架的 nag 环；B-③ 实证收益场景（R4-S-F）为 5 任务级。
 * 判定② wave_inflight_below_floor：有可解析并批信息（plan.md 批标注行 / task 卡 batch 字段）
 *   且批数 < min(3, 任务数) → 护栏缺口提示；解析不出并批信息时跳过（宁缺勿假）。
 * 并批标注格式（plan.js prompt 钉死）：Wave 段内 `> batch: task-01+task-02` blockquote 行，
 * 不替代 `- task-XX` 纯 ID 引用行（execute.js parseWavesFromPlan 只认纯 ID 行收任务）。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { execSync } from 'node:child_process'
import { checkBatchAdvisory } from '../src/stages/plan-postcheck.js'
import { fixedPrefix } from '../src/stages/plan.js'

// ── fixtures 构造 ───────────────────────────────────────────────────

/** 单卡 frontmatter（9 硬校验字段齐 + 按需 target_files / depends_on / batch / expects_from） */
function card(id, { targets = null, allowed = null, depends = null, batch = null, expects = null } = {}) {
  const lines = [
    '---', `id: ${id}`, 'title: t', 'title_zh: 中文标题', 'author: t',
    'created_at: 2026-09-21 00:00:00', 'priority: P0',
    `depends_on: ${depends && depends.length ? `[${depends.map(d => `'${d}'`).join(', ')}]` : '[]'}`,
    'blocks: []', 'requirement_ids: [FR-1]', 'decision_ids: []',
  ]
  const ap = allowed || (targets || []).map(t => t.replace(/^NEW:/, ''))
  lines.push('allowed_paths:', ...ap.map(p => `  - ${p}`))
  if (targets !== null && targets.length > 0) lines.push('target_files:', ...targets.map(t => `  - ${t}`))
  if (batch) lines.push(`batch: [${batch.join(', ')}]`)
  if (expects) {
    lines.push('expects_from:')
    for (const [provider, contracts] of Object.entries(expects)) {
      lines.push(`  ${provider}:`)
      for (const c of contracts) lines.push(`    - contract: ${c.contract}`, `      needs: [${(c.needs || []).join(', ')}]`)
    }
  }
  lines.push('goal: >', '  g', 'implementation:', '  - i', 'acceptance:', '  - a',
    'verify:', '  - node --version', 'constraints:', '  - c', '---', '')
  return lines.join('\n')
}

/** plan.md：Wave 段（纯 ID 引用行 + 批标注 blockquote 行） */
function planMd(waves) {
  const lines = ['---', 'plan_level: full', '---', '', '# 实现计划', '']
  for (const w of waves) {
    lines.push(`## Wave ${w.no}（并行）`, '')
    for (const t of w.tasks) lines.push(`- ${t}`)
    for (const b of (w.batchLines || [])) lines.push(b)
    lines.push('')
  }
  return lines.join('\n')
}

const tasksMdFor = (ids) => ids.map(i => `- [ ] ${i}: 任务${i.slice(5)}`).join('\n') + '\n'

const FIVE = ['task-01', 'task-02', 'task-03', 'task-04', 'task-05']
/** 5 任务各独占一个源文件（两两正交的标准面） */
const cardsOrthogonal = (ids = FIVE) => Object.fromEntries(
  ids.map((id, i) => [id, card(id, { targets: [`src/mod${i}.js`] })])
)

// ── 纯函数：checkBatchAdvisory ──────────────────────────────────────

test('判定①：5 任务两两 target_files 正交且无并批信号 → batch_orthogonal_unbundled', () => {
  const r = checkBatchAdvisory({
    tasksMdText: tasksMdFor(FIVE),
    planMdText: planMd([{ no: 1, tasks: FIVE }]),
    taskCards: cardsOrthogonal(),
  })
  assert.ok(Array.isArray(r), '返回数组')
  assert.equal(r.length, 1)
  assert.equal(r[0].level, 'warning')
  assert.equal(r[0].code, 'batch_orthogonal_unbundled')
  assert.match(r[0].message, /正交/)
  assert.match(r[0].message, /并批/)
})

test('判定②：5 任务 2 批（3+2）→ 批数 2 < min(3,5) 触发 wave_inflight_below_floor', () => {
  const r = checkBatchAdvisory({
    tasksMdText: tasksMdFor(FIVE),
    planMdText: planMd([{ no: 1, tasks: FIVE, batchLines: ['> batch: task-01+task-02+task-03', '> batch: task-04+task-05'] }]),
    taskCards: cardsOrthogonal(),
  })
  assert.equal(r.length, 1, '只触发护栏判定（已有并批信号，①不再提示）')
  assert.equal(r[0].level, 'warning')
  assert.equal(r[0].code, 'wave_inflight_below_floor')
  assert.match(r[0].message, /min\(3/)
})

test('5 任务 3 批（2+2+1）→ 不误报（批数 3 ≥ min(3,5)，且已有并批信号①不提示）', () => {
  const r = checkBatchAdvisory({
    tasksMdText: tasksMdFor(FIVE),
    planMdText: planMd([{ no: 1, tasks: FIVE, batchLines: ['> batch: task-01+task-02', '> batch: task-03+task-04'] }]),
    taskCards: cardsOrthogonal(),
  })
  assert.deepEqual(r, [])
})

test('共享 target_files → 非正交不提示①', () => {
  const cards = cardsOrthogonal()
  cards['task-02'] = card('task-02', { targets: ['src/mod0.js', 'src/mod2.js'] }) // 与 task-01 共享 src/mod0.js
  const r = checkBatchAdvisory({
    tasksMdText: tasksMdFor(FIVE),
    planMdText: planMd([{ no: 1, tasks: FIVE }]),
    taskCards: cards,
  })
  assert.deepEqual(r, [])
})

test('返回数组可双命中：W1 正交未并批（①）+ W2 两任务 1 批（②）→ 两码并存', () => {
  const W2 = ['task-06', 'task-07']
  const cards = { ...cardsOrthogonal(), ...cardsOrthogonal(W2) }
  const r = checkBatchAdvisory({
    tasksMdText: tasksMdFor([...FIVE, ...W2]),
    planMdText: planMd([
      { no: 1, tasks: FIVE },
      { no: 2, tasks: W2, batchLines: ['> batch: task-06+task-07'] },
    ]),
    taskCards: cards,
  })
  assert.equal(r.length, 2, '两 Wave 各一条')
  const codes = r.map(a => a.code).sort()
  assert.deepEqual(codes, ['batch_orthogonal_unbundled', 'wave_inflight_below_floor'])
  assert.ok(r.every(a => a.level === 'warning'))
})

test('Wave 内 depends_on 链 → ①抑制（正交判据含无依赖链）', () => {
  const cards = cardsOrthogonal()
  cards['task-03'] = card('task-03', { targets: ['src/mod2.js'], depends: ['task-01'] })
  const r = checkBatchAdvisory({
    tasksMdText: tasksMdFor(FIVE),
    planMdText: planMd([{ no: 1, tasks: FIVE }]),
    taskCards: cards,
  })
  assert.deepEqual(r, [])
})

test('Wave 内 expects_from 契约链 → ①抑制（正交判据含无契约链）', () => {
  const cards = cardsOrthogonal()
  cards['task-02'] = card('task-02', {
    targets: ['src/mod1.js'],
    expects: { 'task-01': [{ contract: 'UserDTO', needs: ['field_a'] }] },
  })
  const r = checkBatchAdvisory({
    tasksMdText: tasksMdFor(FIVE),
    planMdText: planMd([{ no: 1, tasks: FIVE }]),
    taskCards: cards,
  })
  assert.deepEqual(r, [])
})

test('target_files 缺失回退 allowed_paths：独占触发① / 共享抑制', () => {
  const disjoint = Object.fromEntries(FIVE.map((id, i) => [id, card(id, { allowed: [`src/ap${i}.js`] })]))
  const r1 = checkBatchAdvisory({
    tasksMdText: tasksMdFor(FIVE),
    planMdText: planMd([{ no: 1, tasks: FIVE }]),
    taskCards: disjoint,
  })
  assert.equal(r1.length, 1)
  assert.equal(r1[0].code, 'batch_orthogonal_unbundled')

  const shared = { ...disjoint, 'task-02': card('task-02', { allowed: ['src/ap0.js', 'src/ap1.js'] }) }
  const r2 = checkBatchAdvisory({
    tasksMdText: tasksMdFor(FIVE),
    planMdText: planMd([{ no: 1, tasks: FIVE }]),
    taskCards: shared,
  })
  assert.deepEqual(r2, [], 'allowed_paths 共享 → 非正交不提示')
})

test('task 卡 batch 字段：抑制① + 供②计数（卡源并批信息）', () => {
  // 部分并批：卡 batch 01+02 → 4 批 ≥ 3 → 无任何提示
  const partial = cardsOrthogonal()
  partial['task-01'] = card('task-01', { targets: ['src/mod0.js'], batch: ['task-01', 'task-02'] })
  partial['task-02'] = card('task-02', { targets: ['src/mod1.js'], batch: ['task-01', 'task-02'] })
  const r1 = checkBatchAdvisory({
    tasksMdText: tasksMdFor(FIVE),
    planMdText: planMd([{ no: 1, tasks: FIVE }]),
    taskCards: partial,
  })
  assert.deepEqual(r1, [], '卡源并批信号挡①；4 批 ≥ min(3,5) 不触发②')

  // 卡源 2 批（3+2）→ ②触发
  const twoBatches = cardsOrthogonal()
  for (const [id, i] of [['task-01', 0], ['task-02', 1], ['task-03', 2]]) {
    twoBatches[id] = card(id, { targets: [`src/mod${i}.js`], batch: ['task-01', 'task-02', 'task-03'] })
  }
  for (const [id, i] of [['task-04', 3], ['task-05', 4]]) {
    twoBatches[id] = card(id, { targets: [`src/mod${i}.js`], batch: ['task-04', 'task-05'] })
  }
  const r2 = checkBatchAdvisory({
    tasksMdText: tasksMdFor(FIVE),
    planMdText: planMd([{ no: 1, tasks: FIVE }]),
    taskCards: twoBatches,
  })
  assert.equal(r2.length, 1)
  assert.equal(r2[0].code, 'wave_inflight_below_floor')
})

test('N≤3 的 Wave 未并批 → 不提示①（任何并批必违反 min(3,N)=N 护栏，未并批已是唯一合规形态）', () => {
  const THREE = ['task-01', 'task-02', 'task-03']
  const r = checkBatchAdvisory({
    tasksMdText: tasksMdFor(THREE),
    planMdText: planMd([{ no: 1, tasks: THREE }]),
    taskCards: cardsOrthogonal(THREE),
  })
  assert.deepEqual(r, [])
})

test('不可解析的 task 列表行 → ②跳过（宁缺勿假）且视为未并批可触发①', () => {
  const r = checkBatchAdvisory({
    tasksMdText: tasksMdFor(FIVE),
    planMdText: planMd([{ no: 1, tasks: FIVE, batchLines: ['- task-01、task-02 一起执行'] }]),
    taskCards: cardsOrthogonal(),
  })
  // 该行非规范批标注（无 + 拼接 / 无 batch: 前缀 / 无并批字样）→ 列表行存疑 clean=false → ②跳过；
  // 无并批意图信号 → ①照常提示（解析不出并批信息时只做①）
  assert.equal(r.length, 1)
  assert.equal(r[0].code, 'batch_orthogonal_unbundled')
})

// ── prompt 文本钉：stepGeneratePlan 并批默认三行 ────────────────────

test('prompt 钉：stepGeneratePlan 渲染含并批默认三行关键子串', () => {
  const step = fixedPrefix.find(s => s.id === 'generate_plan')
  assert.ok(step, 'fixedPrefix 含 generate_plan 步骤')
  for (const sub of [
    '默认并批 2–4 任务/批',
    'min(3, 该 Wave 任务数)',
    '并批不跨风险级',
    '> batch: task-01+task-02',
  ]) {
    assert.ok(step.prompt.includes(sub), `stepGeneratePlan prompt 缺关键子串：${sub}`)
  }
})

// ── 集成：executePlanPostcheck warnings 通道（不进 errors）──────────

const tmpRoots = []
function mk(p) { const d = mkdtempSync(join(tmpdir(), p)); tmpRoots.push(d); return d }
test.after(() => { for (const d of tmpRoots) { try { rmSync(d, { recursive: true, force: true }) } catch {} } })

function makeFx({ wavesSpec }) {
  const cwd = mk('batch-adv-')
  execSync('git init -q', { cwd })
  const changeDir = join(cwd, '.sillyspec', 'changes', 'c1')
  mkdirSync(join(changeDir, 'tasks'), { recursive: true })
  const ids = wavesSpec.flat()
  const planLines = ['---', 'author: t', 'created_at: 2026-09-21', '---', '', '# 实现计划', '']
  wavesSpec.forEach((ws, i) => {
    planLines.push(`## Wave ${i + 1}`, '')
    for (const id of ws) planLines.push(`- ${id}`)
    planLines.push('')
  })
  writeFileSync(join(changeDir, 'plan.md'), planLines.join('\n'))
  for (let n = 1; n <= ids.length; n++) {
    const id = `task-${String(n).padStart(2, '0')}`
    writeFileSync(join(changeDir, 'tasks', `${id}.md`), [
      '---', `id: ${id}`, 'title: t', 'title_zh: 中文标题', 'author: t', 'created_at: 2026-09-21 00:00:00', 'priority: P0',
      'depends_on: []', 'blocks: []', 'requirement_ids: [FR-1]', 'decision_ids: []', 'allowed_paths:',
      `  - src/f${n}.js`,
      'goal: >', '  g', 'implementation:', '  - i', 'acceptance:', '  - a', 'verify:', '  - node --version', 'constraints:', '  - c', '---', '',
    ].join('\n'))
  }
  return { cwd, changeDir }
}

async function runPostcheck(fx) {
  const logs = []
  const orig = { log: console.log, warn: console.warn, err: console.error }
  console.log = (...a) => logs.push(a.join(' '))
  console.warn = (...a) => logs.push(a.join(' '))
  console.error = (...a) => logs.push(a.join(' '))
  let threw = null
  try {
    const { executePlanPostcheck } = await import('../src/stages/plan-postcheck.js')
    await executePlanPostcheck({ cwd: fx.cwd, resolveChangeDir: () => null, progress: null })
  } catch (e) { threw = e.message } finally {
    console.log = orig.log; console.warn = orig.warn; console.error = orig.err
  }
  return { threw, logs }
}

test('集成：4 任务正交未并批 → postcheck 输出 warning（含 code），不新增 error 阻断', async () => {
  const fx = makeFx({ wavesSpec: [['task-01', 'task-02', 'task-03', 'task-04']] })
  try {
    const { threw, logs } = await runPostcheck(fx)
    assert.equal(threw, null, `advisory 不阻断（实际抛出: ${threw}）`)
    assert.ok(
      logs.some(l => l.includes('batch_orthogonal_unbundled')),
      'warnings 通道含 batch_orthogonal_unbundled 提示'
    )
  } finally { rmSync(fx.cwd, { recursive: true, force: true }) }
})

test('集成：3 批合规布局（2+2+1 批标注）→ 无并批 advisory，不阻断', async () => {
  const fx = makeFx({ wavesSpec: [['task-01', 'task-02', 'task-03', 'task-04', 'task-05']] })
  try {
    const planPath = join(fx.changeDir, 'plan.md')
    writeFileSync(planPath, readFileSync(planPath, 'utf8').replace('- task-05', '- task-05\n> batch: task-01+task-02\n> batch: task-03+task-04'))
    const { threw, logs } = await runPostcheck(fx)
    assert.equal(threw, null, `合规批布局放行（实际: ${threw}）`)
    assert.ok(!logs.some(l => l.includes('batch_orthogonal_unbundled') || l.includes('wave_inflight_below_floor')), '无并批 advisory 噪音')
  } finally { rmSync(fx.cwd, { recursive: true, force: true }) }
})
