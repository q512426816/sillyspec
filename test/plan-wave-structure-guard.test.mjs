/**
 * Wave 拓扑守卫（ql-20260920-010 修复二，对撞三轮 execute 108 分钟串行收口）：
 * assessWaveStructure 可合并相邻波对判据（≥2 → error 伪并行串行链；diff=0 且波数≥5 →
 * advisory 深链提示）纯函数五态 + executePlanPostcheck 集成三态（拦/放/深链 advisory）。
 * 判据刻意不用「波数≥5 且平均<2.5」启发式——它会误伤真依赖链（链深 N≥5、平均=1 但
 * 串行合法）；可合并对计数对拓扑最小排布恒为 0（每对相邻波间必有依赖边），天然免疫。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { execSync } from 'node:child_process'
import { assessWaveStructure } from '../src/stages/plan-postcheck.js'

const tmpRoots = []
function mk(p) { const d = mkdtempSync(join(tmpdir(), p)); tmpRoots.push(d); return d }
test.after(() => { for (const d of tmpRoots) { try { rmSync(d, { recursive: true, force: true }) } catch {} } })

const depMapOf = (obj) => new Map(Object.entries(obj))
const setOf = (arr) => new Set(arr)

// ── 纯函数：assessWaveStructure ─────────────────────────────────────

test('纯函数：无依赖碎片化串行（6 波 13 任务形态压缩为 6×1）→ error', () => {
  const waves = Array.from({ length: 6 }, (_, i) => [`task-0${i + 1}`])
  const r = assessWaveStructure({ existingWaves: waves, topoWaves: [['task-01']], depMap: depMapOf({}), wavePathSets: waves.map((_, i) => setOf([`src/f${i}.js`])) })
  assert.equal(r.mergeablePairs.length, 5, '全部相邻对可合并')
  assert.match(r.error, /伪并行串行链/)
  assert.match(r.error, /Wave 2 可并入 Wave 1/)
  assert.equal(r.advisory, null, 'error 优先不叠 advisory')
})

test('纯函数：真依赖全链（task-N 依赖 task-(N-1)，6 波）→ 放行 + 深链 advisory', () => {
  const deps = { 'task-02': ['task-01'], 'task-03': ['task-02'], 'task-04': ['task-03'], 'task-05': ['task-04'], 'task-06': ['task-05'] }
  const waves = Array.from({ length: 6 }, (_, i) => [`task-0${i + 1}`])
  const r = assessWaveStructure({ existingWaves: waves, topoWaves: waves, depMap: depMapOf(deps), wavePathSets: waves.map(() => setOf([])) })
  assert.equal(r.error, null, '真串行链不拦（拦了会逼人删依赖声明，更糟）')
  assert.equal(r.mergeablePairs.length, 0)
  assert.match(r.advisory, /链深 6/)
  assert.match(r.advisory, /depends_on 是否过声明/)
})

test('纯函数：4 波含真并行（相邻波间有依赖边）→ 放行无提示', () => {
  const deps = { 'task-03': ['task-01'], 'task-04': ['task-02'], 'task-05': ['task-03'], 'task-06': ['task-04'], 'task-07': ['task-05'] }
  const waves = [['task-01', 'task-02'], ['task-03', 'task-04'], ['task-05', 'task-06'], ['task-07']]
  const r = assessWaveStructure({ existingWaves: waves, topoWaves: waves, depMap: depMapOf(deps), wavePathSets: waves.map(() => setOf([])) })
  assert.equal(r.error, null)
  assert.equal(r.advisory, null, '波数<5 无深链提示')
  assert.equal(r.mergeablePairs.length, 0, '相邻波间全有依赖边')
})

test('纯函数：共享文件分离合法（相邻波文件面交集 → 不算可合并）→ 放行', () => {
  // 4 波无依赖，但相邻波两两共享文件（同 Wave 共享=双写竞态，分离合法）
  const waves = [['task-01'], ['task-02'], ['task-03'], ['task-04']]
  const faces = [setOf(['src/shared-a.js']), setOf(['src/shared-a.js', 'src/shared-b.js']), setOf(['src/shared-b.js', 'src/shared-c.js']), setOf(['src/shared-c.js'])]
  const r = assessWaveStructure({ existingWaves: waves, topoWaves: [['task-01']], depMap: depMapOf({}), wavePathSets: faces })
  assert.equal(r.error, null, '共享文件串行化是合法安全模式，不拦')
  assert.equal(r.mergeablePairs.length, 0)
})

test('纯函数：单个可合并对（2 任务 2 波保守串行）→ 不拦（阈值 ≥2）', () => {
  const waves = [['task-01'], ['task-02']]
  const r = assessWaveStructure({ existingWaves: waves, topoWaves: [['task-01', 'task-02']], depMap: depMapOf({}), wavePathSets: [setOf(['src/a.js']), setOf(['src/b.js'])] })
  assert.equal(r.error, null, '既有「合法保守串行」语义保持（1 对低于阈值）')
  assert.equal(r.advisory, null)
})

// ── 集成：executePlanPostcheck ──────────────────────────────────────

function makeFx({ wavesSpec, deps = {}, files = {} }) {
  const cwd = mk('wave-guard-')
  execSync('git init -q', { cwd })
  const changeDir = join(cwd, '.sillyspec', 'changes', 'c1')
  mkdirSync(join(changeDir, 'tasks'), { recursive: true })
  const ids = wavesSpec.flat()
  const planLines = ['---', 'author: t', 'created_at: 2026-09-20', '---', '', '# 实现计划', '']
  wavesSpec.forEach((ws, i) => {
    planLines.push(`## Wave ${i + 1}`, '')
    for (const id of ws) planLines.push(`- ${id}`)
    planLines.push('')
  })
  writeFileSync(join(changeDir, 'plan.md'), planLines.join('\n'))
  for (let n = 1; n <= ids.length; n++) {
    const id = `task-${String(n).padStart(2, '0')}`
    writeFileSync(join(changeDir, 'tasks', `${id}.md`), [
      '---', `id: ${id}`, 'title: t', 'title_zh: 中文标题', 'author: t', 'created_at: 2026-09-20 00:00:00', 'priority: P0',
      `depends_on: [${(deps[id] || []).map(d => `'${d}'`).join(', ')}]`, 'blocks: []',
      'requirement_ids: [FR-1]', 'decision_ids: []', 'allowed_paths:', `  - ${files[id] || `src/f${n}.js`}`,
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

test('集成：6 波无依赖全串行（三轮形态）→ planPostcheck 硬拦', async () => {
  const fx = makeFx({ wavesSpec: [['task-01'], ['task-02'], ['task-03'], ['task-04'], ['task-05'], ['task-06']] })
  try {
    const { threw, logs } = await runPostcheck(fx)
    assert.ok(threw, '伪并行串行链被拦')
    assert.match(threw, /伪并行串行链/)
    assert.match(threw, /可并入/)
    assert.ok(logs.some(l => l.includes('plan-adopt-waves')), '解法出口指向 plan-adopt-waves')
  } finally { rmSync(fx.cwd, { recursive: true, force: true }) }
})

test('集成：4 波真并行结构 → 放行', async () => {
  const fx = makeFx({
    wavesSpec: [['task-01', 'task-02'], ['task-03', 'task-04'], ['task-05', 'task-06'], ['task-07']],
    deps: { 'task-03': ['task-01'], 'task-04': ['task-02'], 'task-05': ['task-03'], 'task-06': ['task-04'], 'task-07': ['task-05'] },
  })
  try {
    const { threw } = await runPostcheck(fx)
    assert.equal(threw, null, `真并行结构放行（实际: ${threw}）`)
  } finally { rmSync(fx.cwd, { recursive: true, force: true }) }
})

test('集成：真依赖全链 6 波 → 放行 + 深链 advisory（不阻断）', async () => {
  const fx = makeFx({
    wavesSpec: [['task-01'], ['task-02'], ['task-03'], ['task-04'], ['task-05'], ['task-06']],
    deps: { 'task-02': ['task-01'], 'task-03': ['task-02'], 'task-04': ['task-03'], 'task-05': ['task-04'], 'task-06': ['task-05'] },
  })
  try {
    const { threw, logs } = await runPostcheck(fx)
    assert.equal(threw, null, `真链放行不拦（实际: ${threw}）`)
    assert.ok(logs.some(l => l.includes('链深 6') && l.includes('depends_on 是否过声明')), '深链 advisory 提示核依赖过声明')
  } finally { rmSync(fx.cwd, { recursive: true, force: true }) }
})
