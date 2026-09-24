/**
 * stage-burst.test.mjs — burst 阶段折叠机制测试（2026-09-22-stage-burst-fold）
 *
 * task-01 覆盖面（FR-01/FR-04，D-001/D-007）：readStageBurst 三态——
 *   ① 无 local.yaml / 无 stage 段 → false（缺省 OFF）
 *   ② stage.burst: true → true
 *   ③ env SILLYSPEC_STAGE_BURST=0 强制关（配置 true 也压掉）/ =1 强制开（无配置也开）
 *   ④ 坏 YAML → false（fail-safe）
 * env 纪律（conventions：env 敏感测试双模式）：每用例显式剥净 SILLYSPEC_STAGE_BURST 后按需注入，
 * 收口前裸跑+套件阀两种形态各跑一遍（该变量非套件阀，但按同款纪律显式管理进程 env）。
 * 后续 task-02/03/05 在本文件追加渲染折叠/等价性/断点/answer 消费/逃生阀用例。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'

const { readStageBurst } = await import('../src/run/shared.js')
if (typeof readStageBurst !== 'function') throw new Error('shared.js 导出面缺失：readStageBurst')

const tmpRoots = []
function makeRepo(localYaml = null) {
  const cwd = mkdtempSync(join(tmpdir(), 'sb-'))
  tmpRoots.push(cwd)
  mkdirSync(join(cwd, '.sillyspec'), { recursive: true })
  if (localYaml !== null) writeFileSync(join(cwd, '.sillyspec', 'local.yaml'), localYaml)
  return cwd
}
// 每用例剥净 env 后按需注入；用例结束恢复原值（防跨用例渗漏）
function setBurstEnv(v) {
  const saved = process.env.SILLYSPEC_STAGE_BURST
  delete process.env.SILLYSPEC_STAGE_BURST
  if (v !== undefined) process.env.SILLYSPEC_STAGE_BURST = v
  return () => {
    delete process.env.SILLYSPEC_STAGE_BURST
    if (saved !== undefined) process.env.SILLYSPEC_STAGE_BURST = saved
  }
}

test('① 缺省 OFF：无 local.yaml → false', async () => {
  const restore = setBurstEnv()
  try {
    assert.equal(await readStageBurst(makeRepo()), false)
  } finally { restore() }
})

test('① 缺省 OFF：有 local.yaml 但无 stage 段 → false；stage 段无 burst 键 → false', async () => {
  const restore = setBurstEnv()
  try {
    assert.equal(await readStageBurst(makeRepo('project:\n  type: generic\n')), false)
    assert.equal(await readStageBurst(makeRepo('stage:\n  burst: false\n')), false)
  } finally { restore() }
})

test('② local.yaml stage.burst: true → true（含同段他键共存）', async () => {
  const restore = setBurstEnv()
  try {
    assert.equal(await readStageBurst(makeRepo('stage:\n  burst: true\n')), true)
    assert.equal(await readStageBurst(makeRepo('commands:\n  test: "node -e \\"0\\""\nstage:\n  burst: true\n')), true)
  } finally { restore() }
})

test('③ env 逃生阀：SILLYSPEC_STAGE_BURST=0 压掉配置 true → false；=1 无配置 → true（优先于配置）', async () => {
  const off = setBurstEnv('0')
  try {
    assert.equal(await readStageBurst(makeRepo('stage:\n  burst: true\n')), false)
  } finally { off() }
  const on = setBurstEnv('1')
  try {
    assert.equal(await readStageBurst(makeRepo()), true)
    assert.equal(await readStageBurst(makeRepo('stage:\n  burst: false\n')), true)
  } finally { on() }
})

test('④ 坏 YAML → false（fail-safe）', async () => {
  const restore = setBurstEnv()
  try {
    assert.equal(await readStageBurst(makeRepo('stage: [unclosed\n  burst: true\n')), false)
  } finally { restore() }
})

// ══════════ task-05 行为面（FR-02/FR-03/FR-04，D-002@v2/D-003@v2/D-004@v2）══════════
// fixture 造法：临时 git 仓 + ProgressManager 种 brainstorm 步态 + spawn CLI 子进程。
// env 纪律：spawn env 显式 delete SILLYSPEC_STAGE_BURST 后按需注入（conventions 双模式）；
// 行为翻转走 fixture 内 local.yaml（测试自建文件，temp 仓内即被跟踪面）。
import { execFileSync, spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const CLI = join(ROOT, 'src', 'index.js')
const B_STEPS = ['进度确认', '加载项目上下文', '对话式探索与需求澄清', '提出 2-3 种方案', '分段展示设计', '写设计文档并自审', 'Design Grill 交叉审查', '生成规范文件']

function mkFlowRepo({ burst = false } = {}) {
  const cwd = mkdtempSync(join(tmpdir(), 'sb-cli-'))
  tmpRoots.push(cwd)
  const g = (a) => execFileSync('git', a, { cwd, stdio: 'pipe' }).toString().trim()
  g(['init', '-q']); g(['config', 'user.email', 't@t']); g(['config', 'user.name', 't'])
  mkdirSync(join(cwd, '.sillyspec'), { recursive: true })
  const yaml = burst ? 'project:\n  type: generic\nstage:\n  burst: true\n' : 'project:\n  type: generic\n'
  writeFileSync(join(cwd, '.sillyspec', 'local.yaml'), yaml)
  writeFileSync(join(cwd, 'base.txt'), 'b\n')
  g(['add', '.']); g(['commit', '-q', '-m', 'b'])
  return { cwd }
}

async function seedBrainstorm(cwd, change, upto, override = {}) {
  const { ProgressManager } = await import('../src/progress.js')
  const pm = new ProgressManager({ specDir: join(cwd, '.sillyspec') })
  await pm.init(cwd)
  await pm.initChange(cwd, change)
  const p = await pm.read(cwd, change)
  p.currentChange = change
  p.project = 'generic'
  p.stages.brainstorm = {
    status: 'in-progress', startedAt: '2026/09/23 00:00:00', completedAt: null,
    steps: B_STEPS.map((name, i) => ({ name, status: i < upto ? 'completed' : 'pending', ...(override[i] || {}) })),
  }
  await pm._write(cwd, p, change)
  return pm
}

function cliRun(cwd, args, { burstEnv = undefined, timeout = 120_000 } = {}) {
  const env = { ...process.env }
  delete env.SILLYSPEC_STAGE_BURST
  if (burstEnv !== undefined) env.SILLYSPEC_STAGE_BURST = burstEnv
  env.SILLYSPEC_WATCHER = '0'
  env.SILLYSPEC_STEP_GUIDE = '0'
  env.SILLYSPEC_SYNC = '0'
  env.SILLYSPEC_SESSION_ID = 'sb-test'
  return spawnSync(process.execPath, [CLI, '--dir', cwd, ...args], { cwd, encoding: 'utf8', timeout, env })
}

const stepPattern = async (pm, cwd, change) => {
  const p = await pm.read(cwd, change)
  return { steps: p.stages.brainstorm.steps.map(s => s.status[0]).join(''), stage: p.stages.brainstorm.status }
}

test('⑤ 渲染折叠（FR-02）：burst 开启一次下发全部剩余步说明书+尾提示；关闭仅当前步（反例）', async () => {
  // burst on：步 1-5 完成 → 渲染下发 6/7/8 三步说明书
  const A = mkFlowRepo({ burst: true })
  const pmA = await seedBrainstorm(A.cwd, 'sb-r1', 5)
  const rA = cliRun(A.cwd, ['run', 'brainstorm', '--change', 'sb-r1'])
  const outA = rA.stdout + rA.stderr
  assert.equal(rA.status, 0, `burst 渲染应成功: ${outA.slice(0, 400)}`)
  assert.ok((outA.match(/## Step \d\/8/g) || []).length >= 3, `应一次下发 ≥3 步说明书（实际 ${outA.match(/## Step \d\/8/g)?.length}）`)
  assert.match(outA, /## Step 6\/8/, '步 6 说明书在场')
  assert.match(outA, /## Step 8\/8/, '步 8 说明书在场')
  assert.match(outA, /burst 模式：本阶段全部说明书已一次下发/, 'burst 尾提示在场')
  assert.equal((await stepPattern(pmA, A.cwd, 'sb-r1')).steps, 'cccccppp', '渲染侧不改步态（AI 步保持 pending）')

  // 反例（escape valve 反向）：burst off 同状态只渲染当前步
  const B = mkFlowRepo({ burst: false })
  const pmB = await seedBrainstorm(B.cwd, 'sb-r2', 5)
  const rB = cliRun(B.cwd, ['run', 'brainstorm', '--change', 'sb-r2'])
  const outB = rB.stdout + rB.stderr
  assert.equal(rB.status, 0)
  assert.match(outB, /## Step 6\/8/, '单步渲染当前步在场')
  assert.ok(!/## Step 7\/8/.test(outB) && !/## Step 8\/8/.test(outB), '后续步说明书不应在场')
  assert.ok(!outB.includes('burst 模式'), '无 burst 尾提示')
})

test('⑥ env 逃生阀（FR-04）：配置 burst: true + SILLYSPEC_STAGE_BURST=0 → 单步渲染', async () => {
  const R = mkFlowRepo({ burst: true })
  await seedBrainstorm(R.cwd, 'sb-r3', 5)
  const r = cliRun(R.cwd, ['run', 'brainstorm', '--change', 'sb-r3'], { burstEnv: '0' })
  const out = r.stdout + r.stderr
  assert.equal(r.status, 0, `逃生阀渲染应成功: ${out.slice(0, 300)}`)
  assert.match(out, /## Step 6\/8/, '当前步说明书在场')
  assert.ok(!/## Step 7\/8/.test(out), '后续步不应下发')
  assert.ok(!out.includes('burst 模式：'), '无 burst 尾提示（env=0 完全回单步形态）')
})

test('⑦ 等价性双跑（FR-03 验收 2）：burst on/off 同 fixture——推进集合、断点位、步态、输出合成一致', async () => {
  // 逐步侧（burst off）：3 次 --done 推步 6、7，第 3 次撞步 8 门禁（四件套缺失）失败
  const A = mkFlowRepo({ burst: false })
  const pmA = await seedBrainstorm(A.cwd, 'sb-eq-a', 5)
  const d1 = cliRun(A.cwd, ['run', 'brainstorm', '--done', '--change', 'sb-eq-a'])
  const d2 = cliRun(A.cwd, ['run', 'brainstorm', '--done', '--change', 'sb-eq-a'])
  const d3 = cliRun(A.cwd, ['run', 'brainstorm', '--done', '--change', 'sb-eq-a'])
  assert.equal(d1.status, 0, `A 第 1 次 --done 应成功（步 6）: ${d1.stdout.slice(0, 300)}`)
  assert.equal(d2.status, 0, `A 第 2 次 --done 应成功（步 7）: ${d2.stdout.slice(0, 300)}`)
  assert.notEqual(d3.status, 0, 'A 第 3 次 --done 应撞步 8 门禁失败（四件套缺失）')
  const stA = await stepPattern(pmA, A.cwd, 'sb-eq-a')

  // burst 侧（burst on）：单次 --done——推步 6、7 后停在步 8 同一断点
  const B = mkFlowRepo({ burst: true })
  const pmB = await seedBrainstorm(B.cwd, 'sb-eq-b', 5)
  const d = cliRun(B.cwd, ['run', 'brainstorm', '--done', '--change', 'sb-eq-b', '--output', 'burst 等价性双跑'])
  const outD = d.stdout + d.stderr
  assert.notEqual(d.status, 0, 'burst 单次 --done 应停在步 8 门禁断点')
  assert.match(outD, /burst 收口摘要：burst 等价性双跑/, '整体 --output 横幅在场（D-009）')
  const advD = (outD.match(/✅ Step \d\/8 完成/g) || []).length
  assert.equal(advD, 2, `burst 应推 2 步（6/7）后停（实际 ${advD}）`)
  const stB = await stepPattern(pmB, B.cwd, 'sb-eq-b')

  assert.equal(stB.steps, stA.steps, `步态一致（A=${stA.steps} B=${stB.steps}）`)
  assert.equal(stB.stage, stA.stage, '阶段状态一致')
  // per-step 输出合成一致（P0-2 前缀 + 同步名）
  const pA = await pmA.read(A.cwd, 'sb-eq-a')
  const pB = await pmB.read(B.cwd, 'sb-eq-b')
  assert.match(pB.stages.brainstorm.steps[5].output || '', /【CLI 合成】步骤「写设计文档并自审」完成/, 'burst 侧步 6 输出为 CLI 合成')
  assert.equal((pA.stages.brainstorm.steps[5].output || '').startsWith('【CLI 合成】步骤「写设计文档并自审」完成'),
    (pB.stages.brainstorm.steps[5].output || '').startsWith('【CLI 合成】步骤「写设计文档并自审」完成'), '合成输出前缀一致')
})

test('⑧ --answer 单次消费（FR-03/D-004@v2）：双 requiresWait 步答案不错配，二次 --answer 续推', async () => {
  const R = mkFlowRepo({ burst: true })
  const pm = await seedBrainstorm(R.cwd, 'sb-ans', 3)
  const r1 = cliRun(R.cwd, ['run', 'brainstorm', '--done', '--answer', '选方案B', '--change', 'sb-ans'])
  const p1 = await pm.read(R.cwd, 'sb-ans')
  assert.notEqual(r1.status, 0, '应在步 5 requiresWait 断点退出')
  assert.ok((r1.stdout + r1.stderr).includes('必须先等待用户输入'), '断点提示指向等待步')
  assert.equal(p1.stages.brainstorm.steps[3].waitAnswer, '选方案B', '步 4 消费了答案')
  assert.equal(p1.stages.brainstorm.steps[4].waitAnswer, undefined, '步 5 未被步 4 答案污染（单次消费）')
  const r2 = cliRun(R.cwd, ['run', 'brainstorm', '--done', '--answer', '确认设计', '--change', 'sb-ans'])
  const p2 = await pm.read(R.cwd, 'sb-ans')
  assert.equal(p2.stages.brainstorm.steps[4].waitAnswer, '确认设计', '步 5 消费第二次答案')
  assert.ok(p2.stages.brainstorm.steps.slice(4).every(s => ['completed', 'pending'].includes(s.status)), '续推后无错位状态')
  assert.notEqual(r2.status, 0, '续推后停在步 8 门禁断点（与单步模式失败态同族）')
})

test('⑨ 尾随 stale 拉回（FR-03/D-003@v2）：渲染集合=完成集合，stale 尾由 done 轮首拉回推进', async () => {
  const R = mkFlowRepo({ burst: true })
  // 步 1-5 完成、步 6 pending、步 7 stale（尾随 stale——runStage 渲染前只拉回 currentIdx=6 的
  // stale，尾随 stale 保持原状进渲染集合，由 completeStepBurst 轮首拉回后在完成侧推进）
  const pm = await seedBrainstorm(R.cwd, 'sb-st', 5, { 6: { status: 'stale' } })
  const r = cliRun(R.cwd, ['run', 'brainstorm', '--change', 'sb-st'])
  assert.equal(r.status, 0, '渲染应成功')
  assert.match(r.stdout + r.stderr, /## Step 7\/8/, '尾随 stale 步说明书照常进渲染集合')
  const d = cliRun(R.cwd, ['run', 'brainstorm', '--done', '--change', 'sb-st'])
  const out = d.stdout + d.stderr
  assert.ok(out.includes('处于 stale，burst 轮首拉回待执行'), '轮首拉回日志在场')
  const p = await pm.read(R.cwd, 'sb-st')
  assert.equal(p.stages.brainstorm.steps[6].status, 'completed', '尾随 stale 步（步 7）被轮首拉回并完成——渲染集合=完成集合')
  assert.equal(p.stages.brainstorm.steps[5].status, 'completed', '前置 pending 步正常推进')
})

test('⑩ flow 缺省翻转（2026-09-25-thin-default-flip 再翻转，接替 D-010@v2 钉）：readFlowConfig 空配置→thin；显式 legacy 照旧', async () => {
  const { readFlowConfig } = await import('../src/flow.js')
  const empty = mkFlowRepo({ burst: false })
  assert.equal(readFlowConfig(join(empty.cwd, '.sillyspec')).mode, 'thin', '无 flow 配置 → thin（入口归一后缺省）')
  const legacy = makeRepo('project:\n  type: generic\nflow:\n  mode: legacy\n')
  assert.equal(readFlowConfig(join(legacy, '.sillyspec')).mode, 'legacy', '显式 mode: legacy 照旧生效（回旧道出口）')
})

test.after(() => { for (const d of tmpRoots) { try { rmSync(d, { recursive: true, force: true }) } catch { /* Windows 句柄延迟，残留交给 tmpdir 清理 */ } } })
