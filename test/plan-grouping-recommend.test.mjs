/**
 * M3 PLAN 粒度派发默认化（2026-09-21-r5-efficiency-batch2 task-03，FR-03 / D-003@v1）
 *
 * 三层断言：
 * 1. recommendWaveGroups 纯函数：第 1 批三条件（文件两两正交 / 组内无契约链（含
 *    depends_on）/ 组 ≤3）+ 批数护栏不变式（分组后批数 ≥ min(3, n)——与
 *    checkBatchAdvisory 两判定同口径，推荐不得自触判定②）。
 * 2. buildWavePrompt 推荐分组行注入：有可并批 → 注入（含偏离披露话术 + 按组回收）；
 *    无可并批 → 零注入（「- 组大小不超过 3 个 task」与「任一条件不满足」相邻字节
 *    形态钉 = 输出与改前逐字节一致）；SillyHub 模式互斥零注入（一 Wave 一 mission，
 *    分组语义不适用）；卡缺失 fail-open 单例。
 * 3. checkBatchAdvisory 判定①附推荐分组清单（同一纯函数无二源）。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { recommendWaveGroups, checkBatchAdvisory } from '../src/stages/plan-postcheck.js'
import { buildWavePrompt } from '../src/stages/execute.js'

// ── fixtures ───────────────────────────────────────────────────────

/** 纯函数入参速构：files=null 表示文件面不可判（恒单例） */
const T = (id, files, { deps = [], expects = [] } = {}) =>
  ({ id, files, deps, expectsProviders: expects })

/** 单卡 frontmatter（与 plan-batch-advisory.test.mjs 同款速构；targets 优先于 allowed） */
function card(id, { targets = null, allowed = null, depends = null, expects = null } = {}) {
  const lines = [
    '---', `id: ${id}`, 'title: t', 'title_zh: 中文标题', 'author: t',
    'created_at: 2026-09-21 00:00:00', 'priority: P0',
    `depends_on: ${depends && depends.length ? `[${depends.map(d => `'${d}'`).join(', ')}]` : '[]'}`,
    'blocks: []', 'requirement_ids: [FR-3]', 'decision_ids: []',
  ]
  const ap = allowed || (targets || []).map(t => t.replace(/^NEW:/, ''))
  lines.push('allowed_paths:', ...ap.map(p => `  - ${p}`))
  if (targets !== null && targets.length > 0) lines.push('target_files:', ...targets.map(t => `  - ${t}`))
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
const cardsOrthogonal = (ids = FIVE) => Object.fromEntries(
  ids.map((id, i) => [id, card(id, { targets: [`src/mod${i}.js`] })])
)

/** 结构不变式校验（三条件 + 护栏，供全部纯函数用例复跑） */
function assertInvariants(ts, groups, label) {
  const n = ts.length
  assert.ok(groups.every(g => g.length >= 1 && g.length <= 3), `${label}: 组大小 ∈ [1,3]（帽值）`)
  assert.ok(groups.length >= Math.min(3, n), `${label}: 批数 ${groups.length} ≥ min(3,${n}) 护栏`)
  const flat = groups.flat().sort()
  assert.deepEqual(flat, ts.map(t => t.id).sort(), `${label}: partition 完整（每 id 恰一现）`)
  const byId = new Map(ts.map(t => [t.id, t]))
  for (const g of groups) {
    for (let i = 0; i < g.length; i++) {
      for (let j = i + 1; j < g.length; j++) {
        const a = byId.get(g[i]); const b = byId.get(g[j])
        assert.ok(a.files && b.files, `${label}: 组内 ${g[i]}/${g[j]} 文件面均可判`)
        for (const p of a.files) assert.ok(!b.files.includes(p), `${label}: 组内 ${g[i]}/${g[j]} 文件正交（共享 ${p}）`)
        assert.ok(!a.deps.includes(b.id) && !b.deps.includes(a.id), `${label}: 组内 ${g[i]}/${g[j]} 无 depends_on 链`)
        assert.ok(!a.expectsProviders.includes(b.id) && !b.expectsProviders.includes(a.id), `${label}: 组内 ${g[i]}/${g[j]} 无 expects_from 契约链`)
      }
    }
    for (const id of g) {
      if (byId.get(id).files === null) assert.equal(g.length, 1, `${label}: files=null 的 ${id} 恒单例`)
    }
  }
}

// ── 1. 纯函数：recommendWaveGroups ─────────────────────────────────

test('A1 全正交无链 n=6 → 首组帽值满填 + 预算耗尽（批数 3 = min(3,6) 贴线，2+2+2 的 2 批形态会被护栏否决）', () => {
  const ts = ['a', 'b', 'c', 'd', 'e', 'f'].map((f, i) => T(`task-0${i + 1}`, [`src/${f}.js`]))
  const g = recommendWaveGroups(ts)
  assert.deepEqual(g, [['task-01', 'task-02', 'task-03'], ['task-04', 'task-05'], ['task-06']])
  assertInvariants(ts, g, 'A1')
})

test('A2 n=5 → [1,2,3]+[4]+[5]（预算 2，批数 3 = min(3,5) 护栏贴线不越界）', () => {
  const ts = FIVE.map((id, i) => T(id, [`src/f${i}.js`]))
  const g = recommendWaveGroups(ts)
  assert.deepEqual(g, [['task-01', 'task-02', 'task-03'], ['task-04'], ['task-05']])
  assertInvariants(ts, g, 'A2')
})

test('A3 n=4 → [1,2]+[3]+[4]（预算 1——3+1 形态批数 2 < 3 会被护栏否决）', () => {
  const ids = FIVE.slice(0, 4)
  const ts = ids.map((id, i) => T(id, [`src/f${i}.js`]))
  const g = recommendWaveGroups(ts)
  assert.deepEqual(g, [['task-01', 'task-02'], ['task-03'], ['task-04']])
  assertInvariants(ts, g, 'A3')
})

test('A4 n≤3 → 全单例（预算 0：任何并批必违反 min(3,N)=N，未并批已是唯一合规形态）', () => {
  for (const n of [0, 1, 2, 3]) {
    const ts = FIVE.slice(0, n).map((id, i) => T(id, [`src/f${i}.js`]))
    const g = recommendWaveGroups(ts)
    assert.deepEqual(g, ts.map(t => [t.id]), `n=${n} 全单例`)
    if (n > 0) assertInvariants(ts, g, `A4-n${n}`)
  }
})

test('A5 文件相交不并：task-02 与 task-01 共享文件 → 独立成组，正交的 task-03/04 并入 task-01 组', () => {
  const ts = [
    T('task-01', ['src/a.js']),
    T('task-02', ['src/a.js', 'src/b.js']),
    T('task-03', ['src/c.js']),
    T('task-04', ['src/d.js']),
    T('task-05', ['src/e.js']),
  ]
  const g = recommendWaveGroups(ts)
  assert.deepEqual(g, [['task-01', 'task-03', 'task-04'], ['task-02'], ['task-05']])
  assertInvariants(ts, g, 'A5')
})

test('A6 契约链不并（双向）：expects_from 与 depends_on 任一命中即隔开', () => {
  const base = (over) => FIVE.map((id, i) => T(id, [`src/f${i}.js`], over(id, i)))
  // task-02 expects_from task-01
  const gExpects = recommendWaveGroups(base(id => id === 'task-02' ? { expects: ['task-01'] } : {}))
  assert.deepEqual(gExpects, [['task-01', 'task-03', 'task-04'], ['task-02'], ['task-05']])
  assertInvariants(base(id => id === 'task-02' ? { expects: ['task-01'] } : {}), gExpects, 'A6-expects')
  // task-01 depends_on task-02（链方向翻转同隔开）
  const tsDeps = base(id => id === 'task-01' ? { deps: ['task-02'] } : {})
  const gDeps = recommendWaveGroups(tsDeps)
  assertInvariants(tsDeps, gDeps, 'A6-deps')
  assert.ok(gDeps.some(g => g.includes('task-01')) && gDeps.some(g => g.includes('task-02'))
    && !gDeps.some(g => g.includes('task-01') && g.includes('task-02')), 'A6-deps: 01/02 不同组')
})

test('A7 files=null 不可判 → 恒单例（宁缺勿假，不与任何任务并组）', () => {
  const ts = [
    T('task-01', ['src/a.js']),
    T('task-02', null),
    T('task-03', ['src/c.js']),
    T('task-04', ['src/d.js']),
    T('task-05', ['src/e.js']),
  ]
  const g = recommendWaveGroups(ts)
  assert.deepEqual(g, [['task-01', 'task-03', 'task-04'], ['task-02'], ['task-05']])
  assertInvariants(ts, g, 'A7')
})

test('A8 id/链 id 补零归一：task-1 输入 → task-01 输出；未补零 deps 引用仍成链', () => {
  const ts = [
    T('task-1', ['src/a.js']),
    T('task-2', ['src/b.js'], { deps: ['task-1'] }),
    T('task-3', ['src/c.js']),
    T('task-4', ['src/d.js']),
    T('task-5', ['src/e.js']),
  ]
  const g = recommendWaveGroups(ts)
  assert.ok(g.flat().every(id => /^task-\d{2}$/.test(id)), 'A8: 输出全为补零形态')
  assert.ok(!g.some(gr => gr.includes('task-01') && gr.includes('task-02')), 'A8: task-1/task-2 链被识别隔开')
})

test('A9 确定性：同输入两次调用输出 deep equal', () => {
  const ts = FIVE.map((id, i) => T(id, [`src/f${i}.js`]))
  assert.deepEqual(recommendWaveGroups(ts), recommendWaveGroups(ts))
})

test('A10 非法输入容错：非数组/null → 空数组', () => {
  assert.deepEqual(recommendWaveGroups(null), [])
  assert.deepEqual(recommendWaveGroups(undefined), [])
  assert.deepEqual(recommendWaveGroups('not-array'), [])
})

// ── 2. buildWavePrompt 推荐分组行注入 ──────────────────────────────

const tmpRoots = []
function mk(p) { const d = mkdtempSync(join(tmpdir(), p)); tmpRoots.push(d); return d }
test.after(() => { for (const d of tmpRoots) { try { rmSync(d, { recursive: true, force: true }) } catch {} } })

/** 建 fixture change 目录（n 张两两正交卡 + plan.md 单 Wave）；缺卡任务单独跳过 */
function makeChangeDir(n, { skipCards = [] } = {}) {
  const cd = mk('grp-rec-')
  mkdirSync(join(cd, 'tasks'), { recursive: true })
  // execution_mode: dispatch（2026-09-23 55ab9b73 起缺省翻 main，M4 契约）：推荐分组段为
  // !mainMode 门控（execution_mode=main 零注入），断言分组注入的用例须显式声明 dispatch
  const planLines = ['---', 'plan_level: full', 'execution_mode: dispatch', '---', '', '# 实现计划', '', '## Wave 1（并行）', '']
  for (let i = 1; i <= n; i++) {
    const id = `task-${String(i).padStart(2, '0')}`
    planLines.push(`- ${id}`)
    if (!skipCards.includes(id)) {
      writeFileSync(join(cd, 'tasks', `${id}.md`), card(id, { targets: [`src/fx${i}.js`] }))
    }
  }
  planLines.push('')
  writeFileSync(join(cd, 'plan.md'), planLines.join('\n'))
  return cd
}

const waveOf = (n) => ({
  index: 1,
  tasks: Array.from({ length: n }, (_, i) => ({
    index: i + 1, name: `task-${String(i + 1).padStart(2, '0')}: 示例`, file: `tasks/task-${String(i + 1).padStart(2, '0')}.md`,
  })),
})

test('B1 有可并批（5 任务两两正交）→ 注入推荐分组行 + 偏离披露话术 + 按组回收', () => {
  const cd = makeChangeDir(5)
  const wp = buildWavePrompt(waveOf(5), 1, cd, join(cd, 'wt'), { dispatchMode: 'local' })
  assert.ok(wp.includes('**推荐分组（CLI 已按上述三条件预计算）**：[task-01,task-02,task-03] / [task-04] / [task-05]'),
    'B1: 推荐分组行（全 partition 展示，含单例组）')
  assert.ok(wp.includes('偏离须在 Wave 完成摘要中披露理由'), 'B1: 偏离披露话术在位')
  assert.ok(wp.includes('机械建议不夺裁决权'), 'B1: 裁决权保留声明在位')
  assert.ok(wp.includes('按组一次回收'), 'B1: 按组聚合回收指引在位')
})

test('B2 无可并批（n=3 护栏预算 0）→ 零注入，插入位相邻字节形态与改前一致（零回归钉）', () => {
  const cd = makeChangeDir(3)
  const wp = buildWavePrompt(waveOf(3), 1, cd, join(cd, 'wt'), { dispatchMode: 'local' })
  assert.ok(!wp.includes('推荐分组'), 'B2: 无推荐零注入')
  assert.ok(wp.includes('- 组大小不超过 3 个 task\n\n任一条件不满足'),
    'B2: 「- 组大小不超过 3 个 task」与「任一条件不满足」保持相邻原形态（未插入任何字节）')
  // options 缺省走 getDispatchMode()（读 cwd 的 MCP 配置）：主仓 local.yaml 带 mcp 段时缺省
  // 解析≠local（环境性红）。chdir 到无配置的 fixture 目录使缺省确定性解析为 local 再比逐字节。
  const prevCwd = process.cwd()
  try {
    process.chdir(cd)
    assert.equal(wp, buildWavePrompt(waveOf(3), 1, cd, join(cd, 'wt'), undefined),
      'B2: options 缺省与 {dispatchMode:local} 输出逐字节一致')
  } finally {
    process.chdir(prevCwd)
  }
})

test('B3 SillyHub 互斥：dispatchMode=sillyhub 零注入；local-fallback（实际派发走 Local）照注入', () => {
  const cd = makeChangeDir(5)
  const wpHub = buildWavePrompt(waveOf(5), 1, cd, join(cd, 'wt'), { dispatchMode: 'sillyhub' })
  assert.ok(!wpHub.includes('推荐分组'), 'B3: SillyHub 一 Wave 一 mission，分组语义不适用 → 零注入')
  const wpFb = buildWavePrompt(waveOf(5), 1, cd, join(cd, 'wt'), { dispatchMode: 'local-fallback' })
  assert.ok(wpFb.includes('推荐分组'), 'B3: local-fallback 派发实际走 Local → 照注入')
})

test('B4 卡缺失 fail-open：缺卡任务单例不抛错，其余照推', () => {
  const cd = makeChangeDir(5, { skipCards: ['task-05'] })
  const wp = buildWavePrompt(waveOf(5), 1, cd, join(cd, 'wt'), { dispatchMode: 'local' })
  assert.ok(wp.includes('[task-01,task-02,task-03] / [task-04] / [task-05]'),
    'B4: 缺卡 task-05 单例成组，可判任务照常推荐')
})

// ── 3. checkBatchAdvisory 判定①附推荐分组清单 ─────────────────────

test('C1 判定① message 附推荐分组清单（同一纯函数无二源，n=5）', () => {
  const r = checkBatchAdvisory({
    tasksMdText: tasksMdFor(FIVE),
    planMdText: planMd([{ no: 1, tasks: FIVE }]),
    taskCards: cardsOrthogonal(),
  })
  assert.equal(r.length, 1)
  assert.equal(r[0].code, 'batch_orthogonal_unbundled')
  assert.ok(r[0].message.includes('推荐分组'), 'C1: 文案含推荐分组')
  assert.ok(r[0].message.includes('[task-01,task-02,task-03] / [task-04] / [task-05]'),
    'C1: 分组清单与纯函数输出同形')
  assert.ok(r[0].message.includes('min(3, 5)'), 'C1: 既有护栏文案保留（append-only 升级）')
})

test('C2 判定①帽值边界（n=4）：推荐 [1,2]+[3]+[4] 而非 3+1（护栏否决）', () => {
  const ids = FIVE.slice(0, 4)
  const r = checkBatchAdvisory({
    tasksMdText: tasksMdFor(ids),
    planMdText: planMd([{ no: 1, tasks: ids }]),
    taskCards: cardsOrthogonal(ids),
  })
  assert.equal(r.length, 1)
  assert.ok(r[0].message.includes('[task-01,task-02] / [task-03] / [task-04]'), 'C2: n=4 推荐恰一对并批')
})

test('C3 已有并批信号（批标注行）→ 判定①不 fire、无推荐文案（既有行为零回归）', () => {
  const r = checkBatchAdvisory({
    tasksMdText: tasksMdFor(FIVE),
    planMdText: planMd([{ no: 1, tasks: FIVE, batchLines: ['> batch: task-01+task-02', '> batch: task-03+task-04'] }]),
    taskCards: cardsOrthogonal(),
  })
  assert.deepEqual(r, [], 'C3: 3 批合规 → 零 advisory（推荐文案只随判定①出现）')
})
