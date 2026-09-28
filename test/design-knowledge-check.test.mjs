/**
 * design-knowledge-check.test.mjs — 方案步 --done 门知识检索命中回显＋config-schema 逃生阀
 * （2026-09-28-unclear-req-to-brainstorm task-04 / FR-03 / D-004）
 *
 * 覆盖验收面：
 *   ① 命中场景：brainstorm「提出 2-3 种方案」步 --done，--output/decisions.md 条目命中库内
 *      INDEX/decisions 路由 → warn 回显命中摘要（rejected 优先＋否决理由）＋evidence 回应提示，
 *      不阻断完成（exit 无）；
 *   ② 无命中 → 输出与现状一致（零 knowledge-gate 行）；
 *   ③ commands.knowledge-gate: false → 静默（开关逃生阀）；
 *   ④ 顺带断言 task-02 指引文案在场（Step4/Step5 渲染文本含 knowledge search --query 固定动作）。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { ProgressManager } from '../src/progress.js'
import { completeStep } from '../src/run/complete.js'
import { makeRepo, initChange, seedStage, runCapturing, cleanup } from './_complete-step-harness.mjs'
import { getStageSteps } from '../src/run/shared.js'

const CN = '2026-09-01-dkc-hits'

/** Windows 静默清理（sqlite 句柄未释放时 rmSync EPERM——tmpdir 残留由 OS 清理，不判失败）。 */
function rmQuiet(p) {
  try { rmSync(p, { recursive: true, force: true }) } catch { /* EPERM 残留可接受 */ }
}

/** 造知识库：INDEX 枚举路由行 → decisions/unmapped.md 一条 rejected 决策 + 一条普通知识条目。 */
function seedKnowledge(specBase) {
  const k = join(specBase, 'knowledge')
  mkdirSync(join(k, 'decisions'), { recursive: true })
  writeFileSync(join(k, 'INDEX.md'), [
    '# 知识索引',
    '',
    '## Patterns',
    '- 枚举|词表 → [枚举开放世界是错误方向](decisions/unmapped.md#枚举开放世界)',
    '- 互不相关词 → [无关条目](plain-entry.md)',
    '',
  ].join('\n'))
  writeFileSync(join(k, 'decisions', 'unmapped.md'), [
    '# unmapped 域决策',
    '',
    '## D-001@v1 枚举开放世界是错误方向',
    '状态： rejected',
    '否决理由：不要用枚举定义这个开放世界——机器只锚封闭面',
    '',
  ].join('\n'))
  writeFileSync(join(k, 'plain-entry.md'), '# 无关条目\n内容\n')
}

/** 种入 brainstorm 进度：前三步完成，「提出 2-3 种方案」为当前步（全 8 步 seed——def↔DB 步数守卫要求一致）。 */
async function seedPlanStep(cwd, specBase) {
  const pm = new ProgressManager({ specDir: specBase })
  await pm.init(cwd)
  await pm.initChange(cwd, CN)
  const all = ['进度确认', '加载项目上下文', '对话式探索与需求澄清', '提出 2-3 种方案', '分段展示设计', '写设计文档并自审', 'Design Grill 交叉审查', '生成规范文件']
  const progress = await seedStage(pm, cwd, CN, 'brainstorm',
    all.map((name, i) => i < 3
      ? { name, status: 'completed', completedAt: '2026/09/28 10:00:00' }
      : { name, status: 'pending' }))
  return { pm, progress }
}

test('① 命中场景：--output 含机制词 → warn 回显 rejected 条目＋evidence 提示，不阻断', async () => {
  const { cwd, specBase } = makeRepo('dkc-hit-')
  seedKnowledge(specBase)
  const { pm, progress } = await seedPlanStep(cwd, specBase)
  const r = await runCapturing(() =>
    completeStep(pm, progress, 'brainstorm', cwd, '方案 A：用枚举词表分类需求形态', null, {
      changeName: CN, doneAnswer: '用户选方案A', printNext: false,
    }))
  assert.equal(r.exitCode, null, `不阻断（实际 exit=${r.exitCode}，输出：${r.stdout.slice(-400)}）`)
  assert.match(r.stdout, /\[knowledge-gate\] 方案\/决策知识命中/, '命中回显标题行')
  assert.match(r.stdout, /D-001@v1 枚举开放世界是错误方向/, '回显条目 id+标题')
  assert.match(r.stdout, /status=rejected/, 'rejected 优先展示')
  assert.match(r.stdout, /否决理由：不要用枚举定义这个开放世界/, '回显一句话理由')
  assert.match(r.stdout, /evidence 回应或说明不复潮/, 'evidence 回应提示')
  const after = await pm.read(cwd, CN)
  assert.equal(after.stages.brainstorm.steps[3].status, 'completed', '步骤正常标完成（warn 不阻断）')
  rmQuiet(cwd)
})

test('① decisions.md 新增条目（标题/question）也进查询串：仅条目命中同样回显', async () => {
  const { cwd, specBase } = makeRepo('dkc-dec-')
  seedKnowledge(specBase)
  const { pm, progress } = await seedPlanStep(cwd, specBase)
  writeFileSync(join(specBase, 'changes', CN, 'decisions.md'), [
    '# 决策记录（Decisions）',
    '',
    '## D-001@v1: 方案引入枚举词表机制',
    '- type: architecture',
    '- status: accepted',
    '- question: 需求形态要不要用词表枚举判定？',
    '',
  ].join('\n'))
  const r = await runCapturing(() =>
    completeStep(pm, progress, 'brainstorm', cwd, '方案已给出', null, {
      changeName: CN, doneAnswer: '用户选方案B', printNext: false,
    }))
  assert.equal(r.exitCode, null, '不阻断')
  assert.match(r.stdout, /\[knowledge-gate\]/, '条目命中 → 回显（--output 本身无关键词）')
  rmQuiet(cwd)
})

test('② 无命中 → 输出与现状一致（零 knowledge-gate 行）', async () => {
  const { cwd, specBase } = makeRepo('dkc-miss-')
  seedKnowledge(specBase)
  const { pm, progress } = await seedPlanStep(cwd, specBase)
  const r = await runCapturing(() =>
    completeStep(pm, progress, 'brainstorm', cwd, '方案 A：复用现有模块加只读接口', null, {
      changeName: CN, doneAnswer: '用户选方案A', printNext: false,
    }))
  assert.equal(r.exitCode, null)
  assert.ok(!r.stdout.includes('knowledge-gate'), `无命中零回显（实际：${r.stdout.slice(-200)}）`)
  rmQuiet(cwd)
})

test('③ commands.knowledge-gate: false → 静默（逃生阀）', async () => {
  const { cwd, specBase } = makeRepo('dkc-off-')
  seedKnowledge(specBase)
  writeFileSync(join(specBase, 'local.yaml'), 'project:\n  type: generic\ncommands:\n  knowledge-gate: false\n')
  const { pm, progress } = await seedPlanStep(cwd, specBase)
  const r = await runCapturing(() =>
    completeStep(pm, progress, 'brainstorm', cwd, '方案 A：用枚举词表分类需求形态', null, {
      changeName: CN, doneAnswer: '用户选方案A', printNext: false,
    }))
  assert.equal(r.exitCode, null)
  assert.ok(!r.stdout.includes('knowledge-gate'), '开关关闭 → 命中也不回显')
  rmQuiet(cwd)
})

test('④ task-02 指引文案在场：Step4/Step5 渲染文本含 knowledge search --query 固定动作句', async () => {
  const { cwd } = makeRepo('dkc-guide-')
  const defs = await getStageSteps('brainstorm', cwd, null)
  const step4 = defs.find((s) => s.name === '提出 2-3 种方案')
  const step5 = defs.find((s) => s.name === '分段展示设计')
  assert.ok(step4 && step5, '两步定义在场')
  for (const step of [step4, step5]) {
    assert.match(step.prompt, /knowledge search --query/, `${step.name} 含检索用法`)
    assert.match(step.prompt, /命中条目必读/, `${step.name} 含「命中必读」字样`)
    assert.match(step.prompt, /rejected/, `${step.name} 点名 rejected 防复潮条目`)
    assert.match(step.prompt, /举例非机制/, `${step.name} 例词以「举例」身份出现`)
  }
  rmQuiet(cwd)
})

process.on('exit', cleanup)
