/**
 * plan Wave 派生化（2026-09-09-plan-derived task-01/task-02）。
 *
 * 分流三分支 + 幂等 + plan_level 复核 warn。§4/4b/4c 的 postcheck 级用例在
 * test/plan-adopt-waves.test.mjs（本文件覆盖 adoptPlanWaves proposal 档单元语义 + 复核）。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { execSync } from 'child_process'
import { adoptPlanWaves } from '../src/plan-adopt-waves.js'

function makeFx({ waves, deps = {}, files = {} } = {}) {
  const cwd = mkdtempSync(join(tmpdir(), 'sillyspec-autoderive-'))
  execSync('git init -q', { cwd })
  const changeDir = join(cwd, '.sillyspec', 'changes', 'c1')
  mkdirSync(join(changeDir, 'tasks'), { recursive: true })
  writeFileSync(join(changeDir, 'plan.md'), ['# 实现计划', '', ...waves, '', '## 任务总表', '', '| 编号 | 任务 | Wave | 优先级 | 依赖 | 覆盖 FR/D | 说明 |', '|---|---|---|---|---|---|---|', '| task-01 | 一 | W1 | P0 | — | FR-1 | ... |', '| task-02 | 二 | W2 | P0 | task-01 | FR-2 | ... |', ''].join('\n'))
  const defaultFiles = { 'task-01': 'src/a.js', 'task-02': 'src/b.js' }
  for (const id of ['task-01', 'task-02']) {
    const f = files[id] || defaultFiles[id]
    writeFileSync(join(changeDir, 'tasks', `${id}.md`), [
      '---', `id: ${id}`, 'title: t', 'title_zh: 中文标题', 'author: t', 'created_at: 2026-08-24 00:00:00', 'priority: P0',
      `depends_on: [${(deps[id] || []).map(d => `'${d}'`).join(', ')}]`, 'blocks: []',
      'requirement_ids: [FR-1]', 'decision_ids: []', 'allowed_paths:', `  - ${f}`,
      'goal: >', '  g', 'implementation:', '  - i', 'acceptance:', '  - a', 'verify:', '  - node --version', 'constraints:', '  - c', '---', '',
    ].join('\n'))
  }
  return { cwd, changeDir }
}

test('proposal 档：只读产草稿不落盘 + rewritten 标志', () => {
  const fx = makeFx({ waves: ['## Wave 1', '- task-01', '- task-02'], deps: { 'task-02': ['task-01'] } }) // 02 dep 01 全 W1（违规布局）
  try {
    const before = readFileSync(join(fx.changeDir, 'plan.md'), 'utf8')
    const p = adoptPlanWaves({ changeDir: fx.changeDir, mode: 'proposal' })
    assert.equal(p.ok, true)
    assert.equal(p.dryRun, true, 'proposal 档视为 dry-run 语义')
    assert.ok(p.planMdDraft.includes('## Wave 2'), '草稿含拓扑第 2 Wave')
    assert.equal(p.rewritten, true, '与违规原文相比有实际变更')
    assert.equal(readFileSync(join(fx.changeDir, 'plan.md'), 'utf8'), before, 'plan.md 未被改写（只读档）')
    // 幂等：对已是拓扑序的草稿再提案 → rewritten=false
    writeFileSync(join(fx.changeDir, 'plan.md'), p.planMdDraft)
    const p2 = adoptPlanWaves({ changeDir: fx.changeDir, mode: 'proposal' })
    assert.equal(p2.rewritten, false, '已拓扑序 → 幂等零变更')
  } finally { rmSync(fx.cwd, { recursive: true, force: true }) }
})

test('mode 默认 write 向后兼容（CLI 语义不变）', () => {
  const fx = makeFx({ waves: ['## Wave 1', '- task-01', '- task-02'], deps: { 'task-02': ['task-01'] } })
  try {
    const w = adoptPlanWaves({ changeDir: fx.changeDir }) // 不传 mode
    assert.equal(w.ok, true)
    assert.equal(w.dryRun, false)
    assert.ok('postcheck' in w, 'write 档返回 postcheck 字段（既有契约）')
    assert.ok(readFileSync(join(fx.changeDir, 'plan.md'), 'utf8').includes('## Wave 2'), '写档落盘')
  } finally { rmSync(fx.cwd, { recursive: true, force: true }) }
})

test('合法保守串行：手排比拓扑细 → postcheck 静默（无 ⚠️ 输出、零改写）', async () => {
  // 拓扑：01、02 独立（可同 Wave）；手排保守串行 W1=[01] W2=[02] —— 方向合法
  const fx = makeFx({ waves: ['## Wave 1', '- task-01', '', '## Wave 2', '- task-02'] })
  try {
    const before = readFileSync(join(fx.changeDir, 'plan.md'), 'utf8')
    const logs = []
    const orig = { log: console.log, warn: console.warn, err: console.error }
    console.log = (...a) => logs.push(a.join(' '))
    console.warn = (...a) => logs.push(a.join(' '))
    console.error = (...a) => logs.push(a.join(' '))
    let threw = null
    try {
      const { executePlanPostcheck } = await import('../src/stages/plan-postcheck.js')
      await executePlanPostcheck({ cwd: fx.cwd, resolveChangeDir: () => null, progress: null })
    } catch (e) { threw = e.message }
    finally { console.log = orig.log; console.warn = orig.warn; console.error = orig.err }
    assert.equal(threw, null, `合法串行放行（实际: ${threw}）`)
    assert(!logs.some(l => l.includes('不一致') && l.includes('可保持现状')), '旧 ⚠️ 提示噪音消失')
    assert(!logs.some(l => l.includes('自动修复')), '合法布局不触发修复')
    assert.equal(readFileSync(join(fx.changeDir, 'plan.md'), 'utf8'), before, '零改写')
  } finally { rmSync(fx.cwd, { recursive: true, force: true }) }
})

test('plan_level 复核：light + 大信号 → warning；声明一致 → 零输出', async () => {
  const run = async (planLevel, fileList, { moduleMap = null } = {}) => {
    const cwd = mkdtempSync(join(tmpdir(), 'sillyspec-pllevel-'))
    execSync('git init -q', { cwd })
    const changeDir = join(cwd, '.sillyspec', 'changes', 'c1')
    mkdirSync(join(changeDir, 'tasks'), { recursive: true })
    writeFileSync(join(changeDir, 'plan.md'), `---\nauthor: t\ncreated_at: 2026-09-09\nplan_level: ${planLevel}\n---\n\n# 计划\n\n## Wave 1\n\n- task-01\n`)
    writeFileSync(join(changeDir, 'design.md'), ['---', 'author: t', 'created_at: 2026-09-09', '---', '', '## 文件变更清单', '', ...fileList.map(f => `- ${f}`), ''].join('\n'))
    mkdirSync(join(cwd, 'src'), { recursive: true })
    writeFileSync(join(cwd, 'src', 'a.js'), 'x')
    if (moduleMap) {
      const modDir = join(cwd, '.sillyspec', 'docs', 'proj', 'modules')
      mkdirSync(modDir, { recursive: true })
      const y = ['schema_version: 2', 'modules:']
      for (const [id, paths] of Object.entries(moduleMap)) {
        y.push(`  ${id}:`, '    paths:')
        for (const p of paths) y.push(`      - ${p}`)
      }
      writeFileSync(join(modDir, '_module-map.yaml'), y.join('\n'))
      for (const f of fileList) { mkdirSync(join(cwd, f, '..'), { recursive: true }); writeFileSync(join(cwd, f), 'x') }
    }
    const logs = []
    const orig = console.warn
    console.warn = (...a) => logs.push(a.join(' '))
    let threw = null
    try {
      const { executePlanPostcheck } = await import('../src/stages/plan-postcheck.js')
      await executePlanPostcheck({ cwd, resolveChangeDir: () => null, progress: null })
    } catch (e) { threw = e.message } finally { console.warn = orig }
    rmSync(cwd, { recursive: true, force: true })
    return { threw, warnHit: logs.some(l => l.includes('客观规模信号')) }
  }
  const big = []
  for (let i = 1; i <= 9; i++) big.push(`src/f${i}.js`)
  const r1 = await run('light', big)
  assert(r1.warnHit, `light+9 文件 → warning（threw: ${r1.threw}）`)
  const r2 = await run('full', ['src/a.js'])
  assert.equal(r2.warnHit, false, 'full+1 文件 → 无偏大 warning')

  // 模块跨度用例（execute 审查 BLOCKER-1 回归锁）：light + ≤8 文件但跨 3 模块 → warning
  const span = []
  for (const m of ['alpha', 'beta', 'gamma']) {
    span.push(`src/${m}/x.js`, `src/${m}/y.js`)
  }
  const r3 = await run('light', span, { moduleMap: { alpha: ['src/alpha/'], beta: ['src/beta/'], gamma: ['src/gamma/'] } })
  assert(r3.warnHit, `light+6 文件跨 3 模块 → warning（模块跨度信号生效；threw: ${r3.threw}）`)
})
