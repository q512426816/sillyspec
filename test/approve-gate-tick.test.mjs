/**
 * approve-gate-tick.test.mjs — 批准门实校验 + 任务勾选现场提醒（2026-10-19-approve-gate-tick-nudge）
 *
 * P1（thin-order-canon）落地顺序正典后，本变更补两个机器门：
 *   ① approve 硬校验：批准前跑 verifyFlowDrafts 双轨（v2 文档↔锚对比 / v1 指纹+空槽），
 *      violations 非空 exit 1；repair 只读（approve 不写 design.md）；brainstorm 豁免四节；
 *      ledger 缺失 fail-open 降级标注；advisory 不阻断。
 *   ② task tick 现场提醒：spec 面未齐/未批准时回显附一行警示（advisory）。
 *   ③ 共享判定：designSectionsFilled（v1 槽/v2 节双格式）status 与 tick 同源，status 零变化。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const CLI = join(ROOT, 'src', 'index.js')
const { designSectionsFilled } = await import(pathToFileURL(join(ROOT, 'src', 'flow-review.js')).href)

function makeRepo() {
  const cwd = mkdtempSync(join(tmpdir(), 'ag-'))
  const g = (a) => execFileSync('git', a, { cwd, stdio: 'pipe' })
  g(['init', '-q']); g(['config', 'user.email', 't@t']); g(['config', 'user.name', 't'])
  mkdirSync(join(cwd, '.sillyspec'), { recursive: true })
  writeFileSync(join(cwd, '.sillyspec', 'local.yaml'), 'project:\n  type: generic\ncommands:\n  test: "node exit0.js"\n')
  writeFileSync(join(cwd, 'base.txt'), 'b\n')
  g(['add', '.']); g(['commit', '-q', '-m', 'b'])
  const cli = (args) => spawnSync(process.execPath, [CLI, ...args], { cwd, encoding: 'utf8', timeout: 60_000, env: { ...process.env, SILLYSPEC_WATCHER: '0', SILLYSPEC_SESSION_ID: 'ag-test' } })
  return { cwd, cli }
}

const INPUT = '批准门实校验与勾选提醒的面\n成功标准：\n- 行为 X\n- 行为 Y'

/** 把 v2 骨架工件答齐：design 四节各答一行 + requirements FR 行为句 + 绑定行。 */
function answerDocs(dir) {
  const d = readFileSync(join(dir, 'design.md'), 'utf8')
  const answered = d.split('\n').map((l) => {
    if (/^本变更怎么解决问题|^动了哪些函数|^输入或事件乱序|^两个执行体同时|^会话、请求或变更中途|^跨工作区|^本方案最大的风险/.test(l.trim())) return l
    return l
  }).join('\n')
  // 四节作答：在每个节标题后插入一行实质作答（问句行保持原样）
  const withAnswers = answered
    .replace(/(## 做法概述\n)/, '$1复用既有校验双轨，approve 批准前跑一遍。\n')
    .replace(/(## 接口契约\n)/, '$1verifyThinDocsV2 加 repair 开关，CLI 子命令签名零变化。\n')
    .replace(/(## 边界与并发（盲维四问——每问必答，答不了即设计缺口）\n)/, '$11. 乱序成立：校验读批准时点快照。\n2. 并发：flow-state 原子写。\n3. 切换：拒批不写状态，重跑即过。\n4. 作用域：ledger 机本位缺失即降级放行。\n')
    .replace(/(## 风险与死路\n)/, '$1最大风险是误伤存量，三重降级保底。\n')
  writeFileSync(join(dir, 'design.md'), withAnswers)
  const r = readFileSync(join(dir, 'requirements.md'), 'utf8')
  writeFileSync(join(dir, 'requirements.md'), r
    .replace(/- （待撰写[^）]*）/g, '- 变更落地后必须满足行为 X。')
    .replace(/^(FR-\d{2}): （待填[^）]*）$/gm, (m, n) => `${n}: test/approve-gate-tick.test.mjs「用例」`))
}

test('① approve 硬拒：v2 骨架未答 exit 1、零写盘、无 spec_approved 落盘', () => {
  const { cwd, cli } = makeRepo()
  cli(['flow', 'start', '--change', '2026-09-01-ag-1', '--input', INPUT])
  const dir = join(cwd, '.sillyspec', 'changes', '2026-09-01-ag-1')
  const dBefore = readFileSync(join(dir, 'design.md'), 'utf8')
  const rBefore = readFileSync(join(dir, 'requirements.md'), 'utf8')
  const s = cli(['flow', 'approve', '--change', '2026-09-01-ag-1', '--user-confirmed'])
  assert.equal(s.status, 1, `exit 1（实际 ${s.status}）`)
  const out = s.stdout + s.stderr
  assert.match(out, /文档未齐|未作答|待填|待撰写/, '拒批输出含修复指引')
  assert.equal(readFileSync(join(dir, 'design.md'), 'utf8'), dBefore, 'design.md 字节不变（只读校验）')
  assert.equal(readFileSync(join(dir, 'requirements.md'), 'utf8'), rBefore, 'requirements.md 字节不变')
  assert.doesNotMatch(readFileSync(join(dir, 'flow-state.yaml'), 'utf8'), /^spec_approved:/m, '无批准落盘')
  rmSync(cwd, { recursive: true, force: true })
})

test('② approve 齐备放行：四节+FR+绑定答齐 → exit 0、spec_approved 落盘', () => {
  const { cwd, cli } = makeRepo()
  cli(['flow', 'start', '--change', '2026-09-01-ag-2', '--input', INPUT])
  const dir = join(cwd, '.sillyspec', 'changes', '2026-09-01-ag-2')
  answerDocs(dir)
  const s = cli(['flow', 'approve', '--change', '2026-09-01-ag-2', '--user-confirmed'])
  assert.equal(s.status, 0, `exit 0（实际 ${s.status}）输出：${(s.stdout + s.stderr).slice(0, 600)}`)
  assert.match(readFileSync(join(dir, 'flow-state.yaml'), 'utf8'), /^spec_approved: true$/m, '批准落盘')
  rmSync(cwd, { recursive: true, force: true })
})

test('③ approve 只读：问题行被改写时不回填（字节不变）且拒批', () => {
  const { cwd, cli } = makeRepo()
  cli(['flow', 'start', '--change', '2026-09-01-ag-3', '--input', INPUT])
  const dir = join(cwd, '.sillyspec', 'changes', '2026-09-01-ag-3')
  answerDocs(dir)
  // 改写一条问句原文（模拟 agent 滑误改述）——done 路径会自动回填，approve 只读必须不写
  const d = readFileSync(join(dir, 'design.md'), 'utf8')
  writeFileSync(join(dir, 'design.md'), d.replace('本变更怎么解决问题？改哪里、为什么选这个方案（一两段）。', '本变更怎么去解决问题？改哪里、为啥选这个方案。'))
  const before = readFileSync(join(dir, 'design.md'), 'utf8')
  const s = cli(['flow', 'approve', '--change', '2026-09-01-ag-3', '--user-confirmed'])
  assert.equal(s.status, 1, '问题行改写 → 拒批')
  assert.equal(readFileSync(join(dir, 'design.md'), 'utf8'), before, 'approve 未回填（repair:false 只读——与 done 自动回填分轨）')
  rmSync(cwd, { recursive: true, force: true })
})

test('④ brainstorm 收编豁免：design 四节空仍可批（requirements 须答）', () => {
  const { cwd, cli } = makeRepo()
  cli(['flow', 'start', '--change', '2026-09-01-ag-4', '--input', INPUT])
  const dir = join(cwd, '.sillyspec', 'changes', '2026-09-01-ag-4')
  // 只答 requirements，design 四节留骨架；声明 adopted_from=brainstorm
  const r = readFileSync(join(dir, 'requirements.md'), 'utf8')
  writeFileSync(join(dir, 'requirements.md'), r
    .replace(/- （待撰写[^）]*）/g, '- 变更落地后必须满足行为 X。')
    .replace(/^(FR-\d{2}): （待填[^）]*）$/gm, (m, n) => `${n}: test/approve-gate-tick.test.mjs「豁免」`))
  writeFileSync(join(dir, 'flow-state.yaml'), readFileSync(join(dir, 'flow-state.yaml'), 'utf8') + 'adopted_from: brainstorm\n')
  const s = cli(['flow', 'approve', '--change', '2026-09-01-ag-4', '--user-confirmed'])
  assert.equal(s.status, 0, `豁免四节（实际 ${s.status}）输出：${(s.stdout + s.stderr).slice(0, 600)}`)
  rmSync(cwd, { recursive: true, force: true })
})

test('⑤ ledger 缺失 fail-open：手工变更（无 draft-ledger）v2 形态文档齐 → 放行+降级标注', () => {
  const { cwd, cli } = makeRepo()
  const dir = join(cwd, '.sillyspec', 'changes', '2026-09-01-ag-5')
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'flow-state.yaml'), 'tier: thin\nsubsteps: {}\n')
  writeFileSync(join(dir, 'design.md'), '# D\n\n## 做法概述\n复用校验。\n\n## 接口契约\n零签名变化。\n\n## 边界与并发（盲维四问——每问必答，答不了即设计缺口）\n1. 成立。\n\n## 风险与死路\n误伤存量。\n')
  writeFileSync(join(dir, 'requirements.md'), '# R\n\n### FR-01: 行为 X\n- 变更落地后必须满足行为 X。\n\n## 测试绑定（每条 FR 至少一行——`FR-NN: test/路径「用例名」`；空行/待填在 flow done 拒收）\n\nFR-01: test/a「用例」\n')
  const s = cli(['flow', 'approve', '--change', '2026-09-01-ag-5', '--user-confirmed'])
  assert.equal(s.status, 0, `降级放行（实际 ${s.status}）输出：${(s.stdout + s.stderr).slice(0, 600)}`)
  assert.match(s.stdout, /降级/, '输出含降级标注')
  rmSync(cwd, { recursive: true, force: true })
})

test('⑥ 共享判定 designSectionsFilled：v1 槽/v2 节双格式', () => {
  const v1Answered = ['# D', '', '<!--AGENT:槽1 -->', '答一', '', '<!--AGENT:槽2 -->', '答二', '', '<!--AGENT:槽3 -->', '答三', ''].join('\n')
  const v1Empty = ['# D', '', '<!--AGENT:槽1 -->', '', '<!--AGENT:槽2 -->', '', ''].join('\n')
  const v2Answered = ['# D', '', '## 做法概述', '答。', '', '## 接口契约', '答。', '', '## 边界与并发（盲维四问——每问必答，答不了即设计缺口）', '1. 答。', '', '## 风险与死路', '答。', ''].join('\n')
  const v2Empty = ['# D', '', '## 做法概述', '', '## 接口契约', '', '## 边界与并发（盲维四问——每问必答，答不了即设计缺口）', '', '## 风险与死路', '', ''].join('\n')
  assert.equal(designSectionsFilled(v1Answered), true, 'v1 三槽已答')
  assert.equal(designSectionsFilled(v1Empty), false, 'v1 空槽')
  assert.equal(designSectionsFilled(v2Answered), true, 'v2 四节已答')
  assert.equal(designSectionsFilled(v2Empty), false, 'v2 骨架')
})

test('⑦ task tick 警示：spec 面未答未批准 → 勾选成功+警示行；齐备批准后 → 零新增行', () => {
  const { cwd, cli } = makeRepo()
  cli(['flow', 'start', '--change', '2026-09-01-ag-6', '--input', INPUT])
  const dir = join(cwd, '.sillyspec', 'changes', '2026-09-01-ag-6')
  const t = cli(['task', 'tick', '--change', '2026-09-01-ag-6', '--task', 'task-01'])
  assert.equal(t.status, 0, 'advisory 不阻断勾选')
  assert.match(t.stdout, /已勾/, '既有回显行在场')
  assert.match(t.stdout, /spec 面/, '警示行在场（design 未答+未批准）')
  // 答齐 + 批准 → 静默路径
  answerDocs(dir)
  cli(['flow', 'approve', '--change', '2026-09-01-ag-6', '--user-confirmed'])
  const t2 = cli(['task', 'tick', '--change', '2026-09-01-ag-6', '--task', 'task-02'])
  assert.equal(t2.status, 0)
  assert.ok(!/spec 面未就位|先答 spec/.test(t2.stdout), `齐备静默（零新增警示行），实际：${t2.stdout.slice(-300)}`)
  rmSync(cwd, { recursive: true, force: true })
})
