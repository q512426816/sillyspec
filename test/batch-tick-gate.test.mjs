/**
 * batch-tick-gate.test.mjs — 单拍勾选硬门（2026-09-29-batch-tick-gate；2026-10-07-thin-tasks-v3 契约刷新）
 *
 * B 层牙齿：事件流单拍 checked N→M（跳 ≥2，CLI 精确事件去重后）+ 任务面在场 → flow done 拒收；
 * --allow-batch-tick 显式旁路留痕；观测缺席 / 哨兵面未知 → 不拒；机器代勾可解释整跳 → advisory。
 * 镜像-only 豁免分支退役（镜像面契约整体下线）。
 * A 层形状：工作分解契约（横幅两路：fresh/adopt）+ 执行循环指令——文件内指令已清零。
 *
 * 覆盖：
 *   ① detectBatchCheckCadence 纯函数（含采样去重）已在 sentinel/task-tick 系覆盖——此处钉接线与文案（源码级）
 *   ② 硬门三态接线：拒收出口 / --allow-batch-tick 旁路留痕 / 哨兵面未知降级
 *   ③ A 层文案钉（fresh 简报工作分解契约 + adopt 简报 + tasks.md 文件内零指令）
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync, existsSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { tmpdir } from 'node:os'
import { execFileSync, spawnSync } from 'node:child_process'

const ROOT = dirname(fileURLToPath(import.meta.url))
const CLI = join(ROOT, '..', 'src', 'index.js')

function gitE(cwd, args) {
  return execFileSync('git', ['-C', cwd, ...args], { stdio: 'pipe' }).toString().trim()
}

function cliE(cwd, args) {
  return spawnSync(process.execPath, [CLI, ...args], {
    cwd, encoding: 'utf8', timeout: 180_000,
    env: { ...process.env, SILLYSPEC_WATCHER: '0' },
  })
}

function makeRepoE() {
  const cwd = mkdtempSync(join(tmpdir(), 'btg-'))
  gitE(cwd, ['init', '-q', '-b', 'main'])
  gitE(cwd, ['config', 'user.email', 't@t'])
  gitE(cwd, ['config', 'user.name', 't'])
  mkdirSync(join(cwd, '.sillyspec'), { recursive: true })
  writeFileSync(join(cwd, '.sillyspec', 'local.yaml'), 'project:\n  type: generic\ncommands:\n  test: "node exit0.js"\nflow:\n  mode: thin\n')
  writeFileSync(join(cwd, 'base.txt'), 'base\n')
  gitE(cwd, ['add', '.'])
  gitE(cwd, ['commit', '-q', '-m', 'base'])
  return cwd
}

function fillDocsE(specBase, change) {
  const base = join(specBase, 'changes', change)
  writeFileSync(join(base, 'design.md'), readFileSync(join(base, 'design.md'), 'utf8')
    .replace(/^(本变更怎么解决问题|动了哪些函数|1\. 乱序|2\. 并发写|3\. 切换|4\. 作用域|本方案最大的风险)([^\n]*)$/gm, '$&\n不适用：协议测试夹具——一行作答即合规'))
  writeFileSync(join(base, 'requirements.md'), readFileSync(join(base, 'requirements.md'), 'utf8')
    .replace(/^- （待撰写.*$/gm, '- 系统 MUST 达成该条标准行为（协议夹具行为句）')
    .replace(/^FR-\d{2}: （待填.*$/gm, (m) => m.split(':')[0] + ': 不适用：协议测试夹具——无独立测试面'))
}

function writeReviewE(specBase, cwd, change) {
  const head = gitE(cwd, ['rev-parse', 'HEAD'])
  writeFileSync(join(specBase, 'changes', change, 'review.json'), JSON.stringify({
    schemaVersion: 1, change, reviewer: 'test-fixture', verdict: 'PASS', reviewedAgainst: head,
    findings: [], dimensionNotes: { 乱序: 'n/a', 并发: 'n/a', 切换: 'n/a', 作用域: 'n/a' }, reviewedAt: new Date().toISOString(),
  }, null, 2))
}

test('② 硬门接线钉：拒收出口 + 旁路旗标 + 降级面', () => {
  const src = readFileSync(join(ROOT, '..', 'src', 'flow.js'), 'utf8')
  assert.ok(src.includes('allowBatchTick'), 'cmdFlowDone 旗标在场')
  assert.ok(src.includes("hasFlag('--allow-batch-tick')"), 'CLI 旗标解析接线')
  assert.ok(src.includes('单拍勾选拒收'), '拒收文案在场')
  assert.ok(src.includes('--allow-batch-tick 显式留痕过门'), '出口指引（旁路留痕）')
  assert.ok(src.includes('allow_batch_tick: true'), '旁路留痕写 flow-state')
  assert.ok(src.includes('哨兵任务面未知（fail-open 防误拒）'), '哨兵面未知降级 advisory（文案钉）')
  assert.ok(src.includes("appendTelemetry({ sentinel: 'batch-tick'"), '拒收落遥测')
})

test('②b 决策纯函数行为级（resolveBatchTickAction 四态 + 豁免优先序）', async () => {
  const { resolveBatchTickAction } = await import(pathToFileURL(join(ROOT, '..', 'src', 'sentinel-assertions.js')).href)
  const bt = { from: 0, to: 3, detail: 'checked 0→3', ts: 1 }
  assert.equal(resolveBatchTickAction({ batchTick: null }).action, 'silent', '无单拍跳→silent')
  // 镜像-only 豁免退役（2026-10-07-thin-tasks-v3）：任务面在场即按统一判据——0 也拒
  assert.equal(resolveBatchTickAction({ batchTick: bt, nonMirrorCount: 0 }).action, 'reject', '镜像-only 分支已删——统一拒收')
  assert.equal(resolveBatchTickAction({ batchTick: bt, nonMirrorCount: 3, allowBatchTick: true }).action, 'bypass', '有任务面+旗标→bypass')
  assert.equal(resolveBatchTickAction({ batchTick: bt, nonMirrorCount: null }).action, 'advisory', '哨兵面未知→advisory（fail-open）')
  assert.equal(resolveBatchTickAction({ batchTick: bt, nonMirrorCount: null, allowBatchTick: true }).action, 'bypass', '哨兵面未知仍可显式旁路')
  assert.equal(resolveBatchTickAction({ batchTick: bt, nonMirrorCount: 3, autopilotTicked: 3 }).action, 'advisory', '机器代勾解释整跳（3>=3）→advisory（autopilot 单拍机械写不误拒）')
  assert.equal(resolveBatchTickAction({ batchTick: bt, nonMirrorCount: 3, autopilotTicked: 1 }).action, 'reject', '代勾解释不了整跳（1<3）→reject（防留格蹭豁免——二轮 P3-E）')
  assert.equal(resolveBatchTickAction({ batchTick: { from: 3, to: 4, detail: 'checked 3→4', ts: 1 }, nonMirrorCount: 3, autopilotTicked: 1 }).action, 'advisory', '小跳+代勾解释（1>=1）→advisory')
  assert.equal(resolveBatchTickAction({ batchTick: bt, nonMirrorCount: 3 }).action, 'reject', 'agent 一把勾→reject')
  // evidenceComplete 降级态（2026-10-13-batchtick-evidence-domain-hint FR-01/FR-02）：
  // 哨兵证据完备（status=complete）的单拍降 advisory——同形态 git 时点检查「一把勾模式」
  // 因 token 证据齐放行，事件流门对齐该语义；优先序 flag > 哨兵面未知 > evidence > 代勾 > reject
  const ev = resolveBatchTickAction({ batchTick: bt, nonMirrorCount: 3, evidenceComplete: true })
  assert.equal(ev.action, 'advisory', '证据完备一把勾→advisory（agent dogfood 反馈实证形态）')
  assert.equal(ev.reason, 'evidence-complete', 'reason 钉（留痕/文案锚）')
  assert.equal(resolveBatchTickAction({ batchTick: bt, nonMirrorCount: 3, evidenceComplete: true, allowBatchTick: true }).action, 'bypass', 'flag 优先于 evidence 降级')
  assert.equal(resolveBatchTickAction({ batchTick: bt, nonMirrorCount: null, evidenceComplete: true }).reason, 'sentinel-unknown', '哨兵面未知优先序在前（fail-open 防误拒）')
  assert.equal(resolveBatchTickAction({ batchTick: bt, nonMirrorCount: 3, evidenceComplete: false }).action, 'reject', '证据不完备→仍拒（0/12 事故形态不走降级）')
})

test('②d evidenceComplete 接线钉：哨兵 complete 信号传递 + batch_ticked 留痕 + 降级文案', () => {
  const src = readFileSync(join(ROOT, '..', 'src', 'flow.js'), 'utf8')
  assert.ok(src.includes('_sentinelEvidenceComplete = true'), '哨兵 status=complete 置位信号')
  assert.ok(src.includes('evidenceComplete: _sentinelEvidenceComplete'), '信号传入 resolveBatchTickAction')
  assert.ok(src.includes('batch_ticked: true'), '降级留痕写 flow-state（与 allow_batch_tick 同款审计面）')
  assert.ok(src.includes("reason === 'evidence-complete'"), '降级分支文案锚')
  const sen = readFileSync(join(ROOT, '..', 'src', 'sentinel-assertions.js'), 'utf8')
  assert.ok(sen.includes('evidenceComplete = false'), '决策函数新参数缺省 false（既有调用方零感知）')
})

test('②c autopilot 交互钉（评审清偿）：代勾计数接线 + 重入持久化 + 解释整跳判据', () => {
  const src = readFileSync(join(ROOT, '..', 'src', 'flow.js'), 'utf8')
  assert.ok(src.includes('_autopilotTicked = _autoTicked'), '代勾格数抬升到门作用域')
  assert.ok(src.includes('autopilot_ticked: _autoTicked'), '代勾事实持久化写 flow-state（二轮 P2-B 重入漂移防护）')
  assert.ok(src.includes('Math.max(_autopilotTicked, _persistedAuto)'), '重入取 max(本拍, 持久化)')
  const sen = readFileSync(join(ROOT, '..', 'src', 'sentinel-assertions.js'), 'utf8')
  assert.ok(sen.includes('autopilotTicked >= batchTick.to - batchTick.from'), '代勾解释整跳判据在决策函数（P3-E 防蹭豁免）')
})

test('③ A 层文案钉：工作分解契约（fresh/adopt 两路）+ tasks.md 文件内零指令', () => {
  const flowSrc = readFileSync(join(ROOT, '..', 'src', 'flow.js'), 'utf8')
  assert.ok(flowSrc.includes('工作分解契约'), 'fresh 简报：任务面契约标签')
  assert.ok(flowSrc.includes('执行循环：对每个未勾行 Working on task N/M'), 'fresh 简报：逐行循环指令')
  assert.ok(flowSrc.includes('task tick --change'), 'tick 动词用法在场')
  assert.ok(flowSrc.includes('TodoWrite 类工具是会话内便利面'), 'harness todo 竞争点名')
  assert.ok(flowSrc.includes('把 tasks.md 改写为工作分解'), 'adopt 简报：spec 期定稿工作分解')
  // 书写规则迁入横幅（2026-10-07-thin-tasks-v3 文件内指令清零的承接面）
  assert.ok(flowSrc.includes('「## 文件变更清单」节'), '横幅：文件变更清单节名规则在场（原 design 文件内指引迁入）')
  assert.ok(flowSrc.includes('勿改写'), '横幅：锚行规则在场（原模板防呆迁入）')
  const draftSrc = readFileSync(join(ROOT, '..', 'src', 'flow-draft.js'), 'utf8')
  // 文件内指令清零（2026-10-07-thin-tasks-v3）：起草模板不再产出 > 指导行——书写规则唯一源=横幅+命令卡
  assert.ok(!draftSrc.includes('勿删勿改写'), 'tasks.md 模板：镜像锚话术退役')
  assert.ok(!draftSrc.includes('> 边干边勾'), 'tasks.md 模板：纪律指令行退役')
  assert.ok(!draftSrc.includes('> 机器预填草稿'), 'v1 backfill 模板：指令行退役')
})

// ══ 2026-10-13-batchtick-evidence-domain-hint：evidenceComplete 降级 e2e + flow start 域预判 ══

test('②e e2e：证据完备一把勾（反馈实证形态）→ advisory 放行 + batch_ticked 留痕 + 归档完成', () => {
  const cwd = makeRepoE()
  const change = '2026-10-13-btg-evd'
  const specBase = join(cwd, '.sillyspec')
  try {
    const s1 = cliE(cwd, ['flow', 'start', '--change', change, '--input', '证据完备一把勾一次性放行\n成功标准：\n- 标准甲\n- 标准乙\n- 标准丙', '--autopilot'])
    assert.equal(s1.status, 0, `start 失败: ${s1.stderr}`)
    // 三任务各有 token 交付证据（一把提交带全 token——哨兵口径认可）
    writeFileSync(join(cwd, 'work.txt'), 'done\n')
    gitE(cwd, ['add', 'work.txt'])
    gitE(cwd, ['commit', '-q', '-m', `work (${change}) (task-01) (task-02) (task-03)`])
    // agent 一次 Edit 翻三格（反馈摩擦形态）——watcher 事件流手工落一条单拍跳（测试环境 watcher 关闭）
    fillDocsE(specBase, change)
    const tasksPath = join(specBase, 'changes', change, 'tasks.md')
    writeFileSync(tasksPath, readFileSync(tasksPath, 'utf8').replace(/^- \[ \] (task-\d+):/gm, '- [x] $1:'))
    gitE(cwd, ['add', tasksPath])
    gitE(cwd, ['commit', '-q', '-m', 'chore: tick (task-01/02/03)'])
    mkdirSync(join(specBase, '.runtime'), { recursive: true })
    writeFileSync(join(specBase, '.runtime', `watcher-events-${change}.jsonl`),
      `${JSON.stringify({ ts: Date.now() - 60_000, kind: 'task-done', stage: 'tasks', detail: 'checked 0→3', source: 'watcher', provisional: true })}\n`)
    writeReviewE(specBase, cwd, change)
    const s2 = cliE(cwd, ['flow', 'done', '--change', change])
    assert.equal(s2.status, 0, `证据完备一把勾应放行: ${s2.stdout}\n${s2.stderr}`)
    const out = `${s2.stdout}\n${s2.stderr}`
    assert.doesNotMatch(out, /单拍勾选拒收/, '不再硬拒')
    assert.match(out, /勾选节奏/, '节奏 advisory 在场')
    assert.match(out, /证据完备|证据齐/, '降级理由点名证据面')
    const arch = readdirSync(join(specBase, 'changes', 'archive')).find((d) => d.includes(change))
    assert.ok(arch, '归档完成')
    assert.match(readFileSync(join(specBase, 'changes', 'archive', arch, 'flow-state.yaml'), 'utf8'), /batch_ticked/, '降级留痕随归档件')
  } finally {
    rmSync(cwd, { recursive: true, force: true })
  }
})

test('④ flow start 域预判：命中点名 fr/<域>；未命中点名伪域+登记指引；绿地草案/零路径两态', () => {
  // A：已登记模块图（单图）——命中/未命中双态
  const cwdA = makeRepoE()
  try {
    const specBase = join(cwdA, '.sillyspec')
    mkdirSync(join(cwdA, 'src', 'foo'), { recursive: true })
    mkdirSync(join(cwdA, 'src', 'other'), { recursive: true })
    writeFileSync(join(cwdA, 'src', 'foo', 'a.js'), 'export {}\n')
    writeFileSync(join(cwdA, 'src', 'other', 'b.js'), 'export {}\n')
    gitE(cwdA, ['add', 'src'])
    gitE(cwdA, ['commit', '-q', '-m', 'src'])
    mkdirSync(join(specBase, 'docs', 'proj1', 'modules'), { recursive: true })
    writeFileSync(join(specBase, 'docs', 'proj1', 'modules', '_module-map.yaml'),
      'modules:\n  mod1:\n    status: active\n    doc: modules/mod1.md\n    paths:\n      - src/foo/\n')
    const s1 = cliE(cwdA, ['flow', 'start', '--change', '2026-10-13-btg-hint', '--input', '域预判扫描命中模块卡\n成功标准：\n- 改 src/foo/a.js 与 src/other/b.js', '--autopilot'])
    assert.equal(s1.status, 0)
    assert.match(s1.stdout, /FR 域预判/, '预判段在场')
    assert.match(s1.stdout, /src\/foo\/a\.js → fr\/mod1/, '命中模块点名（FR 将落 fr/mod1）')
    assert.match(s1.stdout, /auto-other/, '未命中伪域点名（与 distill 分段投票同源）')
    assert.match(s1.stdout, /_module-map\.yaml/, '登记指引在场')
    assert.match(s1.stdout, /以收口实际交付文件路由为准|实际交付文件路由为准/, '预判非路由真相的边界声明')
    // 有图但 input 无路径：零新增
    const s2 = cliE(cwdA, ['flow', 'start', '--change', '2026-10-13-btg-nopath', '--input', '纯文字需求无路径提及\n成功标准：\n- 行为达标', '--autopilot'])
    assert.equal(s2.status, 0)
    assert.doesNotMatch(s2.stdout, /FR 域预判/, '零路径零新增行')
  } finally {
    rmSync(cwdA, { recursive: true, force: true })
  }
  // B：绿地（无图）→ flow start 既有绿地草案自动起草 _module-map.yaml——预判对草案域照常点名
  const cwdB = makeRepoE()
  try {
    const specBase = join(cwdB, '.sillyspec')
    mkdirSync(join(cwdB, 'src', 'foo'), { recursive: true })
    mkdirSync(join(cwdB, 'src', 'other'), { recursive: true })
    writeFileSync(join(cwdB, 'src', 'foo', 'a.js'), 'export {}\n')
    writeFileSync(join(cwdB, 'src', 'other', 'b.js'), 'export {}\n')
    gitE(cwdB, ['add', 'src'])
    gitE(cwdB, ['commit', '-q', '-m', 'src'])
    const s0 = cliE(cwdB, ['flow', 'start', '--change', '2026-10-13-btg-green', '--input', '绿地预判无历史模块命中\n成功标准：\n- 改 src/foo/a.js 与 src/other/b.js', '--autopilot'])
    assert.equal(s0.status, 0)
    assert.match(s0.stdout, /绿地草案/, '绿地草案既有行为在场')
    assert.match(s0.stdout, /fr\/foo/, '绿地草案域照常预判（零输出判定面=无路径，非无图）')
  } finally {
    rmSync(cwdB, { recursive: true, force: true })
  }
})

// ══ 2026-10-14-tick-burst-sidecar-gate：侧车突发检测（CLI 快连点补盲——事件流两级盲区清偿） ══

test('②f detectTickBurst 纯函数：快连点/渐进/混合/坏行/同任务取最早/窗口覆写', async () => {
  const { detectTickBurst } = await import(pathToFileURL(join(ROOT, '..', 'src', 'sentinel-assertions.js')).href)
  const base = 1_700_000_000_000
  // 快连点：5 格 10 秒内 → 突发 0→5（detail 标注侧车突发）
  const r1 = detectTickBurst(['task-01', 'task-02', 'task-03', 'task-04', 'task-05'].map((task, i) => ({ task, ts: base + i * 2_500 })))
  assert.ok(r1, '快连点检出')
  assert.equal(r1.from, 0); assert.equal(r1.to, 5); assert.equal(r1.source, 'tick-burst'); assert.equal(r1.size, 5)
  assert.match(r1.detail, /^checked 0→5（task tick 侧车突发 5 格）$/)
  // 渐进：相邻间隔 > 60s → 零误报
  assert.equal(detectTickBurst(['task-01', 'task-02', 'task-03'].map((task, i) => ({ task, ts: base + i * 120_000 }))), null, '渐进间隔超窗不检出')
  // 混合：2 格渐进 + 3 格快连收尾 → 最大簇 2→5
  const mix = [
    { task: 'task-01', ts: base },
    { task: 'task-02', ts: base + 120_000 },
    { task: 'task-03', ts: base + 600_000 },
    { task: 'task-04', ts: base + 604_000 },
    { task: 'task-05', ts: base + 609_000 },
  ]
  const r2 = detectTickBurst(mix)
  assert.ok(r2 && r2.from === 2 && r2.to === 5, `混合形态取最大簇（实际 ${JSON.stringify(r2)}）`)
  // 窗口覆写：同数据 600s 窗全并一簇 0→5
  const r3 = detectTickBurst(mix, { windowMs: 600_000 })
  assert.ok(r3 && r3.from === 0 && r3.to === 5, `窗口覆写生效（实际 ${JSON.stringify(r3)}）`)
  // 空输入/单格
  assert.equal(detectTickBurst([]), null); assert.equal(detectTickBurst(null), null)
  assert.equal(detectTickBurst([{ task: 'task-01', ts: base }]), null, '单格不检出')
  // 坏行：非法 task 形态 / NaN 时戳跳过
  const r4 = detectTickBurst([
    { task: 'task-01', ts: base },
    { task: 'bad-name', ts: base + 1 },
    { task: 'task-02', ts: Number.NaN },
    { task: 'task-03', ts: base + 2_000 },
  ])
  assert.ok(r4 && r4.from === 0 && r4.to === 2, `坏行跳过（非法 task/NaN ts 不计，实际 ${JSON.stringify(r4)}）`)
  // 同任务重复取最早
  const r5 = detectTickBurst([
    { task: 'task-01', ts: base },
    { task: 'task-01', ts: base + 5_000 },
    { task: 'task-02', ts: base + 3_000 },
  ])
  assert.ok(r5 && r5.to === 2 && r5.ts === base, '同任务取最早去重')
})

test('②h 接线钉：节奏门回退侧车（flow.js 源码锚）', () => {
  const src = readFileSync(join(ROOT, '..', 'src', 'flow.js'), 'utf8')
  assert.ok(src.includes('detectTickBurst(parseTickLog('), '事件流空结果回退侧车突发检测')
  assert.ok(src.includes('task-ticks.jsonl'), '侧车文件面在场（节奏门消费）')
  assert.ok(src.includes("batch.source === 'tick-burst'"), '拒收文案来源感知（侧车时戳 vs 事件流）')
})

test('②g e2e：CLI 快连点侧车突发（证据完备）→ advisory 放行 + batch_ticked 留痕 + 归档完成；渐进侧车零告警', () => {
  // A：快连点突发（3 格 ~2 秒内）——事件流只有 CLI 单格精确跳（10-07 去重语义不可见），侧车回退检出
  {
    const cwd = makeRepoE()
    const change = '2026-10-14-btg-burst'
    const specBase = join(cwd, '.sillyspec')
    try {
      const s1 = cliE(cwd, ['flow', 'start', '--change', change, '--input', '侧车突发多格勾选一次过\n成功标准：\n- 标准甲\n- 标准乙\n- 标准丙', '--autopilot'])
      assert.equal(s1.status, 0, `start 失败: ${s1.stderr}`)
      writeFileSync(join(cwd, 'work.txt'), 'done\n')
      gitE(cwd, ['add', 'work.txt'])
      gitE(cwd, ['commit', '-q', '-m', `work (${change}) (task-01) (task-02) (task-03)`])
      fillDocsE(specBase, change)
      const tasksPath = join(specBase, 'changes', change, 'tasks.md')
      writeFileSync(tasksPath, readFileSync(tasksPath, 'utf8').replace(/^- \[ \] (task-\d+):/gm, '- [x] $1:'))
      gitE(cwd, ['add', tasksPath])
      gitE(cwd, ['commit', '-q', '-m', 'chore: tick (task-01/02/03)'])
      // CLI 快连点形态：事件流三条单格精确跳 + 侧车 3 行毫秒级相邻
      const now = Date.now()
      mkdirSync(join(specBase, '.runtime'), { recursive: true })
      writeFileSync(join(specBase, '.runtime', `watcher-events-${change}.jsonl`),
        ['checked 0→1', 'checked 1→2', 'checked 2→3'].map((d, i) =>
          JSON.stringify({ ts: now - 60_000 + i * 900, kind: 'task-done', stage: 'tasks', detail: d, provisional: true, source: 'task-tick' })).join('\n') + '\n')
      writeFileSync(join(specBase, 'changes', change, 'task-ticks.jsonl'),
        ['task-01', 'task-02', 'task-03'].map((t, i) => JSON.stringify({ ts: now - 60_000 + i * 900, task: t, source: 'task-tick' })).join('\n') + '\n')
      writeReviewE(specBase, cwd, change)
      const s2 = cliE(cwd, ['flow', 'done', '--change', change])
      assert.equal(s2.status, 0, `证据完备快连点应放行: ${s2.stdout}\n${s2.stderr}`)
      const out = `${s2.stdout}\n${s2.stderr}`
      assert.doesNotMatch(out, /单拍勾选拒收/, '不硬拒')
      assert.match(out, /勾选节奏/, '节奏 advisory 在场')
      assert.match(out, /侧车突发/, '检出来源标注（侧车）')
      const arch = readdirSync(join(specBase, 'changes', 'archive')).find((d) => d.includes(change))
      assert.ok(arch, '归档完成')
      assert.match(readFileSync(join(specBase, 'changes', 'archive', arch, 'flow-state.yaml'), 'utf8'), /batch_ticked/, '降级留痕随归档件')
    } finally {
      rmSync(cwd, { recursive: true, force: true })
    }
  }
  // B：渐进侧车（相邻间隔 5 分钟）——零节奏告警（不误伤渐进勾选）
  {
    const cwd = makeRepoE()
    const change = '2026-10-14-btg-spaced'
    const specBase = join(cwd, '.sillyspec')
    try {
      const s1 = cliE(cwd, ['flow', 'start', '--change', change, '--input', '渐进勾选逐格推进合规范\n成功标准：\n- 标准甲\n- 标准乙\n- 标准丙', '--autopilot'])
      assert.equal(s1.status, 0, `start 失败: ${s1.stderr}`)
      writeFileSync(join(cwd, 'work.txt'), 'done\n')
      gitE(cwd, ['add', 'work.txt'])
      gitE(cwd, ['commit', '-q', '-m', `work (${change}) (task-01) (task-02) (task-03)`])
      fillDocsE(specBase, change)
      const tasksPath = join(specBase, 'changes', change, 'tasks.md')
      writeFileSync(tasksPath, readFileSync(tasksPath, 'utf8').replace(/^- \[ \] (task-\d+):/gm, '- [x] $1:'))
      gitE(cwd, ['add', tasksPath])
      gitE(cwd, ['commit', '-q', '-m', 'chore: tick (task-01/02/03)'])
      const now = Date.now()
      writeFileSync(join(specBase, 'changes', change, 'task-ticks.jsonl'),
        ['task-01', 'task-02', 'task-03'].map((t, i) => JSON.stringify({ ts: now - (3 - i) * 300_000, task: t, source: 'task-tick' })).join('\n') + '\n')
      writeReviewE(specBase, cwd, change)
      const s2 = cliE(cwd, ['flow', 'done', '--change', change])
      assert.equal(s2.status, 0, `渐进勾选应放行: ${s2.stdout}\n${s2.stderr}`)
      const out = `${s2.stdout}\n${s2.stderr}`
      assert.doesNotMatch(out, /勾选节奏|单拍勾选/, '渐进零节奏告警（不误伤）')
      const arch = readdirSync(join(specBase, 'changes', 'archive')).find((d) => d.includes(change))
      assert.ok(arch, '归档完成')
    } finally {
      rmSync(cwd, { recursive: true, force: true })
    }
  }
})
