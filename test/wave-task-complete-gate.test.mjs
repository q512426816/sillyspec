/**
 * Wave 步骤完成度门测试（2026-09-17-pass-cap-semantics task-08 / FR-12 / D-013@v1）。
 *
 * 直测 src/run/complete-handlers.js assertWaveTasksComplete（门本体），五组断言：
 *   ① 全勾放行（不抛 / 不 exit）
 *   ② 任一未勾 → exit 1 且文案含未勾 task ID 与 --reopen 指引（两条出路）
 *   ③ plan.md 无显式 Wave 段（隐式 Wave/light）→ warn 放行；附文档缺失子例（fail-open）
 *   ④ autoCheck 先行幂等：pass review + 未勾 checkbox 夹具跑门 → checkbox 被勾、门放行
 *   ⑤ 步骤名非「Wave N 执行」（execute 收尾步 / 近义名「Wave 1 执行结果」）→ 零行为
 *
 * 夹具：mkdtempSync 最小 changeDir（plan.md / tasks.md / .runtime 下 runId marker + review.json），
 * process.exit 桩成 throw 进程内捕获（_complete-step-harness runCapturing 同款，避免杀测试进程）。
 */
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

import { assertWaveTasksComplete } from '../src/run/complete-handlers.js'

let passed = 0
let failed = 0
const failures = []
const tmpRoots = []

function assert(cond, msg) {
  if (cond) { passed++; console.log(`  ✅ PASS: ${msg}`) }
  else { failed++; failures.push(msg); console.log(`  ❌ FAIL: ${msg}`) }
}

/** runCapturing（_complete-step-harness.mjs 同款）：桩 process.exit 成 throw + 捕获三路 console。 */
async function runCapturing(fn) {
  const origLog = console.log, origErr = console.error, origWarn = console.warn, origExit = process.exit
  let buf = '', exitCode = null, error = null, result
  console.log = (...a) => { buf += a.join(' ') + '\n' }
  console.error = (...a) => { buf += a.join(' ') + '\n' }
  console.warn = (...a) => { buf += a.join(' ') + '\n' }
  process.exit = (code) => { exitCode = code; throw new Error('EXIT_' + code) }
  try { result = await fn() }
  catch (e) { error = e }
  finally {
    console.log = origLog; console.error = origErr; console.warn = origWarn; process.exit = origExit
  }
  return { stdout: buf, result, exitCode, error }
}

/**
 * 最小 change 夹具：cwd=tmp 仓（无需 git），specBase=cwd/.sillyspec，
 * changeDir 下 plan.md（两显式 Wave 段）+ tasks.md（checkbox 状态由调用方定）。
 * withReview=true 时补 .runtime runId marker + task-02 的 pass review.json（供 autoCheck 勾选）。
 */
function makeFixture({ tasksMd, withReview = false } = {}) {
  const cwd = mkdtempSync(join(tmpdir(), 'wave-gate-'))
  tmpRoots.push(cwd)
  const changeName = '2026-09-17-wave-gate-demo'
  const specBase = join(cwd, '.sillyspec')
  const changeDir = join(specBase, 'changes', changeName)
  mkdirSync(changeDir, { recursive: true })
  const runtimeRoot = join(specBase, '.runtime')

  writeFileSync(join(changeDir, 'plan.md'), [
    '# 测试计划',
    '',
    '## Wave 1',
    '',
    '- task-01',
    '- task-02',
    '',
    '## Wave 2',
    '',
    '- task-03',
    '- task-04',
    '',
    '## 自检',
    '',
    '（无引用行的后续段——门解析须在此退出 Wave 2 段）',
    '',
  ].join('\n'))

  writeFileSync(join(changeDir, 'tasks.md'), tasksMd)

  if (withReview) {
    const runId = 'exec-2026-09-17-120000'
    mkdirSync(join(runtimeRoot, 'execute-runs', runId, 'tasks', 'task-02'), { recursive: true })
    writeFileSync(join(runtimeRoot, `current-execute-run-id-${changeName}`), runId)
    writeFileSync(join(runtimeRoot, 'execute-runs', runId, 'tasks', 'task-02', 'review.json'), JSON.stringify({
      schemaVersion: 1,
      task: 'task-02',
      specVerdict: 'pass',
      qualityVerdict: 'pass',
      base: 'a000000000000000000000000000000000000000',
      head: 'b000000000000000000000000000000000000000',
      changedFiles: ['src/dummy.js'],
      reviewerNotes: '门测试夹具（非草稿）',
    }))
  }

  return { cwd, specBase, changeDir, runtimeRoot, changeName, platformOpts: { runtimeRoot } }
}

// execute 步骤表形态（buildExecuteSteps 产物子集，门只读 steps[currentIdx].name）
const WAVE_STEPS = [
  { name: 'Wave 1 执行', status: 'pending' },
  { name: 'Wave 2 执行', status: 'pending' },
  { name: '运行测试', status: 'pending' },
]

console.log('\n--- ① 全勾放行（不抛 / 不 exit）---')
{
  const fx = makeFixture({
    tasksMd: [
      '- [x] task-01: 门测试任务一',
      '- [x] task-02: 门测试任务二',
      '- [x] task-03: 门测试任务三',
      '- [x] task-04: 门测试任务四',
    ].join('\n'),
  })
  const r = await runCapturing(() =>
    assertWaveTasksComplete({ steps: WAVE_STEPS, currentIdx: 0, changeName: fx.changeName, cwd: fx.cwd, specBase: fx.specBase, platformOpts: fx.platformOpts }))
  assert(r.exitCode === null && r.error === null, '全勾：不 exit 不抛（exitCode=null, error=null）')
  assert(r.stdout.includes('完成度门通过'), '全勾：输出含「完成度门通过」')
  assert(r.stdout.includes('task-01') && r.stdout.includes('task-02'), '全勾：通过文案列本 Wave 任务 ID')
}

console.log('\n--- ② 任一未勾 → exit 1，文案含未勾 ID 与 --reopen 指引 ---')
{
  const fx = makeFixture({
    tasksMd: [
      '- [x] task-01: 门测试任务一',
      '- [x] task-02: 门测试任务二',
      '- [x] task-03: 门测试任务三',
      '- [ ] task-04: 门测试任务四',
    ].join('\n'),
  })
  const r = await runCapturing(() =>
    assertWaveTasksComplete({ steps: WAVE_STEPS, currentIdx: 1, changeName: fx.changeName, cwd: fx.cwd, specBase: fx.specBase, platformOpts: fx.platformOpts }))
  assert(r.exitCode === 1, `任一未勾：exit 1（实得 exitCode=${r.exitCode}）`)
  assert(/EXIT_1/.test(String(r.error && r.error.message)), '任一未勾：exit(1) 以 throw 形态被捕获（非普通异常）')
  assert(r.stdout.includes('task-04'), '任一未勾：错误文案含未勾 task ID（task-04）')
  assert(!r.stdout.includes('task-01'), '任一未勾：未勾清单不含已勾的 Wave 1 任务（只列本 Wave）')
  assert(r.stdout.includes('--reopen --from-step 2'), '任一未勾：文案含 --reopen 指引（--from-step 对应 currentIdx+1）')
  assert(r.stdout.includes('两条出路'), '任一未勾：文案列出两条出路')
  assert(r.stdout.includes('review write'), '任一未勾：出路①含 review write 指引')
}

console.log('\n--- ③ plan.md 无显式 Wave 段 → warn 放行（隐式 Wave/light 不误伤）---')
{
  // 光计划形态：plan.md 无任何「## Wave N」段头（隐式合成单 Wave 语义），tasks 未勾也不拦
  const fx = makeFixture({
    tasksMd: [
      '- [x] task-01: 门测试任务一',
      '- [ ] task-02: 门测试任务二',
    ].join('\n'),
  })
  writeFileSync(join(fx.changeDir, 'plan.md'), [
    '# light 计划（无显式 Wave 段）',
    '',
    '任务详情见 tasks.md，串行执行。',
    '',
  ].join('\n'))
  const r = await runCapturing(() =>
    assertWaveTasksComplete({ steps: WAVE_STEPS, currentIdx: 0, changeName: fx.changeName, cwd: fx.cwd, specBase: fx.specBase, platformOpts: fx.platformOpts }))
  assert(r.exitCode === null && r.error === null, '无 Wave 段：warn 放行不 exit 不抛')
  assert(r.stdout.includes('无第 1 个显式 Wave 段'), '无 Wave 段：warn 说明放行依据')

  // 子例：plan.md 缺失（文档瞬态）→ fail-open 放行
  rmSync(join(fx.changeDir, 'plan.md'))
  const r2 = await runCapturing(() =>
    assertWaveTasksComplete({ steps: WAVE_STEPS, currentIdx: 0, changeName: fx.changeName, cwd: fx.cwd, specBase: fx.specBase, platformOpts: fx.platformOpts }))
  assert(r2.exitCode === null && r2.error === null, 'plan.md 缺失：fail-open 放行')
  assert(r2.stdout.includes('缺失'), 'plan.md 缺失：warn 留痕含「缺失」')
}

console.log('\n--- ④ autoCheck 先行幂等（pass review + 未勾 checkbox → 跑后被勾、门放行）---')
{
  const fx = makeFixture({
    withReview: true,
    tasksMd: [
      '- [x] task-01: 门测试任务一',
      '- [ ] task-02: 门测试任务二',
    ].join('\n'),
  })
  const r = await runCapturing(() =>
    assertWaveTasksComplete({ steps: WAVE_STEPS, currentIdx: 0, changeName: fx.changeName, cwd: fx.cwd, specBase: fx.specBase, platformOpts: fx.platformOpts }))
  assert(r.exitCode === null && r.error === null, 'autoCheck 补勾后：门放行不 exit 不抛')
  const after = readFileSync(join(fx.changeDir, 'tasks.md'), 'utf8')
  assert(/- \[x\] task-02/.test(after), 'autoCheck 先行：task-02 checkbox 已被 review pass 自动勾上（幂等补勾落盘）')
  assert(r.stdout.includes('完成度门通过'), 'autoCheck 补勾后：输出含「完成度门通过」')
}

console.log('\n--- ⑤ 非「Wave N 执行」步骤名 → 零行为 ---')
{
  const fx = makeFixture({
    tasksMd: [
      '- [ ] task-01: 门测试任务一',
      '- [ ] task-02: 门测试任务二',
    ].join('\n'),
  })
  // execute 收尾步（如「运行测试」）：门不生效——未勾也不拦、不产出门输出
  const rA = await runCapturing(() =>
    assertWaveTasksComplete({ steps: WAVE_STEPS, currentIdx: 2, changeName: fx.changeName, cwd: fx.cwd, specBase: fx.specBase, platformOpts: fx.platformOpts }))
  assert(rA.exitCode === null && rA.error === null, '步骤名「运行测试」：不 exit 不抛')
  assert(!rA.stdout.includes('完成度门'), '步骤名「运行测试」：零门输出')
  // 近义名边界：「Wave 1 执行结果」（outputHint 形态）严格正则不匹配，零行为
  const rB = await runCapturing(() =>
    assertWaveTasksComplete({ steps: [{ name: 'Wave 1 执行结果', status: 'pending' }], currentIdx: 0, changeName: fx.changeName, cwd: fx.cwd, specBase: fx.specBase, platformOpts: fx.platformOpts }))
  assert(rB.exitCode === null && rB.error === null, '步骤名「Wave 1 执行结果」（非严格形态）：不 exit 不抛')
  assert(!rB.stdout.includes('完成度门'), '步骤名「Wave 1 执行结果」：零门输出')
}

for (const t of tmpRoots) { try { rmSync(t, { recursive: true, force: true }) } catch { /* OS 清 */ } }

if (failed > 0) {
  console.error(`\n[wave-task-complete-gate] ❌ ${failed} 项失败：${failures.join('；')}`)
  process.exit(1)
}
console.log(`\n[wave-task-complete-gate] ✅ 全部通过（${passed} 项）`)
