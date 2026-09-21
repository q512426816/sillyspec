/**
 * M4 execution_mode 通道（2026-09-21-r5-efficiency-batch2 task-04，FR-04 / D-004@v1）
 *
 * 锁死契约：
 * 1. 缺省回退：无键 / execution_mode: dispatch / 非法值（含大小写漂移）→ dispatch 渲染，
 *    三态输出互相逐字节一致；含派发段/工作目录段/并发帽段，不含直写段（零回归钉）。
 * 2. main 渲染：含直写指引段（逐任务闭环 + 防线保留声明 + 直写工作目录段 + 直写纪律），
 *    不含派发段（默认子代理话术/可选 batch）/子代理工作目录强制段/并发帽段/M3 推荐分组段/
 *    SillyHub 派发互斥行。
 * 3. 两模式锚点 + review write 指引一致存在（wt-commit / Task Review Gate / review.json——
 *    只换执行宿主，不换防线）。
 * 4. main × M3 互斥：同一可并批 Wave，dispatch 注入推荐分组、main 零注入（无派发即无分组语义）。
 * 5. plan.js stepGeneratePlan 模板：light/full 两档 frontmatter 均含 execution_mode 注释键
 *    + 声明判据话术（输入已含决策 × 任务文件正交性；缺省 dispatch）。
 * 6. 注释容忍：`execution_mode: main  # 说明` 仍识别为 main（YAML 注释不碍解析）。
 * 7. 隐式 Wave（light/无显式 Wave 段）+ main → 直写段照注入（implicit 分支同受 execution_mode 支配）。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { buildWavePrompt } from '../src/stages/execute.js'
import { fixedPrefix } from '../src/stages/plan.js'

// ── fixtures ───────────────────────────────────────────────────────

function card(id, files) {
  return [
    '---', `id: ${id}`, 'title: t', 'title_zh: 中文标题', 'author: t',
    'created_at: 2026-09-21 00:00:00', 'priority: P0', 'depends_on: []',
    'blocks: []', 'requirement_ids: [FR-4]', 'decision_ids: []',
    'allowed_paths:', ...files.map(p => `  - ${p}`),
    'goal: >', '  g', 'implementation:', '  - i', 'acceptance:', '  - a',
    'verify:', '  - node --version', 'constraints:', '  - c', '---', '',
  ].join('\n')
}

const tmpRoots = []
function mk(p) { const d = mkdtempSync(join(tmpdir(), p)); tmpRoots.push(d); return d }
test.after(() => { for (const d of tmpRoots) { try { rmSync(d, { recursive: true, force: true }) } catch {} } })

/** fixture change 目录：n 张两两正交卡 + plan.md（frontmatter 可注入额外键行；waves=false 写 light 无段形态） */
/** 重写 fixture 的 plan.md（同 cd 原地换 frontmatter——逐字节比对需路径恒定） */
function writePlan(cd, n, { fmExtra = [], waves = true } = {}) {
  const planLines = ['---', 'plan_level: full', ...fmExtra, '---', '', '# 实现计划', '']
  if (waves) {
    planLines.push('## Wave 1（并行）', '')
    for (let i = 1; i <= n; i++) planLines.push(`- task-${String(i).padStart(2, '0')}`)
    planLines.push('')
  }
  writeFileSync(join(cd, 'plan.md'), planLines.join('\n'))
}

function makeChangeDir(n, { fmExtra = [], waves = true } = {}) {
  const cd = mk('exec-mode-')
  mkdirSync(join(cd, 'tasks'), { recursive: true })
  writePlan(cd, n, { fmExtra, waves })
  for (let i = 1; i <= n; i++) {
    const id = `task-${String(i).padStart(2, '0')}`
    writeFileSync(join(cd, 'tasks', `${id}.md`), card(id, [`src/fx${i}.js`]))
  }
  return cd
}

const waveOf = (n, implicit = false) => ({
  index: 1,
  ...(implicit ? { implicit: true } : {}),
  tasks: Array.from({ length: n }, (_, i) => ({
    index: i + 1, name: `task-${String(i + 1).padStart(2, '0')}: 示例`, file: `tasks/task-${String(i + 1).padStart(2, '0')}.md`,
  })),
})

const render = (cd, n = 3, opts = {}, implicit = false) =>
  buildWavePrompt(waveOf(n, implicit), 1, cd, join(cd, 'wt'), { dispatchMode: 'local', ...opts })

// ── 1. 缺省回退：dispatch 渲染（零回归钉）─────────────────────────

test('T1 缺省三态（无键/dispatch/非法值）→ dispatch 渲染且互相逐字节一致', () => {
  // 同一 cd 原地换 frontmatter 再渲染——worktree 路径恒定，输出才可逐字节比对
  const cd = makeChangeDir(3)
  const wpNo = render(cd)
  writePlan(cd, 3, { fmExtra: ['execution_mode: dispatch'] })
  const wpDispatch = render(cd)
  writePlan(cd, 3, { fmExtra: ['execution_mode: agent-swarm'] })
  const wpGarbage = render(cd)
  assert.equal(wpNo, wpDispatch, '无键 === 显式 dispatch（逐字节）')
  assert.equal(wpNo, wpGarbage, '无键 === 非法值回退（逐字节）')
  for (const wp of [wpNo]) {
    assert.ok(wp.includes('默认每个任务由独立子代理执行，你不要自己写代码'), 'T1: 派发段在位')
    assert.ok(wp.includes('可选 batch（合并实现）'), 'T1: batch 条件段在位')
    assert.ok(wp.includes('workdir 参数是强制必传'), 'T1: 子代理工作目录强制段在位')
    assert.ok(wp.includes('同时在飞 ≤3'), 'T1: 并发帽段在位')
    assert.ok(!wp.includes('主代理直写'), 'T1: 无直写段')
  }
  // 大写漂移同样回退 dispatch（严格小写 main 判定）
  writePlan(cd, 3, { fmExtra: ['execution_mode: MAIN'] })
  assert.equal(render(cd), wpNo, 'execution_mode: MAIN → dispatch 回退（大小写敏感）')
})

test('T1b options 缺省与空对象输出逐字节一致（既有回归钉保持）', () => {
  const cd = makeChangeDir(3)
  assert.equal(buildWavePrompt(waveOf(3), 1, cd, join(cd, 'wt'), undefined), render(cd))
})

// ── 2. main 渲染：直写指引段 + 四段抑制 ───────────────────────────

test('T2 main → 直写指引段在位，派发段/工作目录强制段/并发帽段/SillyHub 互斥行全抑制', () => {
  const cd = makeChangeDir(3, { fmExtra: ['execution_mode: main'] })
  const wp = render(cd)
  assert.ok(wp.includes('**主代理直写（execution_mode: main）——你直接实现，不派子代理。**'), 'T2: 直写指引头在位')
  assert.ok(wp.includes('逐任务闭环（串行，完成一个再下一个）'), 'T2: 逐任务闭环话术在位')
  assert.ok(wp.includes('只换执行宿主，不换任何防线'), 'T2: 防线保留声明在位')
  assert.ok(wp.includes('### 工作目录（主代理直写）'), 'T2: 直写工作目录段在位')
  assert.ok(wp.includes('主代理直写纪律'), 'T2: 调度要求直写纪律在位')
  assert.ok(wp.includes(join(cd, 'wt')), 'T2: worktree 路径仍在（worktree 内实现）')
  for (const banned of [
    '默认每个任务由独立子代理执行',   // 派发段
    '可选 batch（合并实现）',          // batch 条件段
    'workdir 参数是强制必传',          // 子代理工作目录强制段
    '同时在飞 ≤3',               // 并发帽段
    'SillyHub 派发互斥',               // 派发互斥行（无派发）
    '你的角色是调度者 + 审查者',       // 调度者角色清单
  ]) {
    assert.ok(!wp.includes(banned), `T2: main 渲染不含「${banned}」`)
  }
})

// ── 3. 两模式锚点 + review write 指引一致 ─────────────────────────

test('T3 两模式下 wt-commit / Task Review Gate / review.json 指引一致存在', () => {
  const cdD = makeChangeDir(3)
  const cdM = makeChangeDir(3, { fmExtra: ['execution_mode: main'] })
  const wpD = render(cdD)
  const wpM = render(cdM)
  for (const [label, wp] of [['dispatch', wpD], ['main', wpM]]) {
    assert.ok(wp.includes('sillyspec wt-commit --change'), `T3: ${label} 含 wt-commit 逐任务提交指引`)
    assert.ok(wp.includes('### Task Review Gate'), `T3: ${label} 含 Task Review Gate`)
    assert.ok(wp.includes('review.json'), `T3: ${label} 含 review.json 指引`)
  }
})

// ── 4. main × M3 互斥 ─────────────────────────────────────────────

test('T4 同一可并批 Wave（5 任务两两正交）：dispatch 注入推荐分组，main 零注入', () => {
  const cdD = makeChangeDir(5)
  const cdM = makeChangeDir(5, { fmExtra: ['execution_mode: main'] })
  assert.ok(render(cdD, 5).includes('推荐分组'), 'T4: dispatch 下 M3 推荐分组在位')
  assert.ok(!render(cdM, 5).includes('推荐分组'), 'T4: main 下 M3 分组段抑制（无派发即无分组语义）')
})

// ── 5. plan.js 模板钉 ─────────────────────────────────────────────

test('T5 stepGeneratePlan prompt：light/full 模板含 execution_mode 键 + 判据话术', () => {
  const step = fixedPrefix.find(s => s.id === 'generate_plan')
  assert.ok(step, 'fixedPrefix 含 generate_plan 步骤')
  assert.ok(step.prompt.includes('execution_mode: dispatch'), 'T5: 缺省 dispatch 注释键在模板')
  assert.ok(step.prompt.includes('execution_mode: main'), 'T5: main 选项在模板判据话术')
  assert.ok(step.prompt.includes('输入已含决策'), 'T5: 声明判据（输入已含决策 × 任务文件正交性）话术在位')
  assert.ok(step.prompt.includes('execution_mode') && (step.prompt.match(/execution_mode: dispatch/g) || []).length >= 2,
    'T5: light 与 full 两档模板均带键（≥2 处 dispatch 缺省行）')
})

// ── 6. 注释容忍 ───────────────────────────────────────────────────

test('T6 YAML 行内注释不碍识别：`execution_mode: main  # 直写` → main 渲染', () => {
  const cd = makeChangeDir(3, { fmExtra: ['execution_mode: main  # 清晰输入任务直写'] })
  assert.ok(render(cd).includes('主代理直写（execution_mode: main）'), 'T6: 注释后仍识别 main')
})

// ── 7. 隐式 Wave + main ───────────────────────────────────────────

test('T7 隐式 Wave（无显式 Wave 段）+ main → 直写段照注入', () => {
  const cd = makeChangeDir(3, { fmExtra: ['execution_mode: main'], waves: false })
  const wp = render(cd, 3, {}, true)
  assert.ok(wp.includes('主代理直写（execution_mode: main）'), 'T7: 隐式 Wave 下 main 直写段在位')
  assert.ok(!wp.includes('默认每个任务由独立子代理执行'), 'T7: 派发话术抑制')
})
