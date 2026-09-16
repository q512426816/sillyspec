/**
 * plan 全局硬约束段 + 实现者子代理触达单测（ql-20260917-002，Superpowers v6.0 writing-plans 采纳④）
 *
 * 背景：plan.md 原无「绑定所有 task 的硬约束」承载体（版本底线/依赖限制/命名/精确值/兼容策略），
 * execute 的 designHotzone 只注入 Wave 协调者层——实现者子代理只读自己的任务卡，不被 design
 * 硬约束触达（obra/superpowers v6.0：约束 verbatim 抄进 plan 才真正到达下游 implementer/reviewer，
 * 实测如此写的 plan 一轮修复过、对照组 2-4 轮还漏真 bug）。
 *
 * 锁死契约：
 * 1. plan.js Step「生成分级计划」prompt 的 full 模板含「## 全局硬约束（从 design.md 逐字抄录，
 *    绑定所有 task）」段与「逐字抄录」语义指引
 * 2. buildWavePrompt 机械提取 plan.md 该段随子代理 prompt 要点下发（第 9 条）：段在→注入正文
 *    +「与本 task 蓝图冲突时以本段为准并上报」；段缺/空/坏→零注入零阻断（advisory）
 * 3. 超 2400 字截断带提示；段在文件尾（无后续 ##）也能提取
 */
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { buildWavePrompt, buildExecuteSteps } from '../src/stages/execute.js'
import { buildPlanSteps } from '../src/stages/plan.js'

let passed = 0
let failed = 0
function assert(cond, msg) {
  if (cond) { console.log(`✅ ${msg}`); passed++ }
  else { console.error(`❌ ${msg}`); failed++ }
}

function makeChangeDir(planMd) {
  const changeDir = mkdtempSync(join(tmpdir(), 'plan-gc-'))
  mkdirSync(join(changeDir, 'tasks'), { recursive: true })
  writeFileSync(join(changeDir, 'tasks', 'task-01.md'), '# task-01 测试任务\n\n实现示例功能。\n')
  if (planMd !== null) writeFileSync(join(changeDir, 'plan.md'), planMd)
  return changeDir
}

const WAVE = { index: 0, tasks: [{ name: 'task-01 测试任务', file: 'tasks/task-01.md' }] }

// ── 场景 1：plan.js 模板含全局硬约束段与逐字抄录指引 ─────────────────────────
{
  const steps = buildPlanSteps(null)
  const genStep = steps.find(s => (s.name || '').includes('生成分级计划') || (s.name || '').includes('分级计划'))
  assert(genStep !== undefined, '场景1：生成分级计划步骤存在')
  const p = genStep.prompt
  assert(p.includes('## 全局硬约束（从 design.md 逐字抄录，绑定所有 task）'), '场景1：模板含段标题（逐字形态）')
  assert(p.includes('逐字抄录'), '场景1：逐字抄录语义指引在位')
  assert(p.includes('不重读 design 全文') || p.includes('子代理只读自己的任务卡'), '场景1：触达理由（子代理只读卡+本段）在位')
}

// ── 场景 2：plan.md 有段 → 注入第 9 条要点 ────────────────────────────────────
{
  const cd = makeChangeDir('# 计划\n\n## Wave 1\n- task-01\n\n## 全局硬约束（从 design.md 逐字抄录，绑定所有 task）\n- Node ≥ 20\n- 禁止新增运行时依赖\n- 错误文案一律中文\n\n## 全局验收标准\n1. 测试通过\n')
  const wp = buildWavePrompt(WAVE, 1, cd, join(cd, 'wt'), {})
  assert(wp.includes('全局硬约束（plan.md 逐字下发'), '场景2：第 9 条要点标题在位')
  assert(wp.includes('Node ≥ 20') && wp.includes('禁止新增运行时依赖'), '场景2：约束正文逐字注入')
  assert(wp.includes('以本段为准并上报主代理'), '场景2：冲突时以本段为准+上报语义在位')
  rmSync(cd, { recursive: true, force: true })
}

// ── 场景 3：无段 / 无 plan.md → 零注入零阻断 ─────────────────────────────────
{
  const cdNoSec = makeChangeDir('# 计划\n\n## Wave 1\n- task-01\n\n## 全局验收标准\n1. 测试通过\n')
  const wp1 = buildWavePrompt(WAVE, 1, cdNoSec, join(cdNoSec, 'wt'), {})
  assert(!wp1.includes('全局硬约束（plan.md 逐字下发'), '场景3a：无段→不注入')
  rmSync(cdNoSec, { recursive: true, force: true })

  const cdNoPlan = makeChangeDir(null)
  const wp2 = buildWavePrompt(WAVE, 1, cdNoPlan, join(cdNoPlan, 'wt'), {})
  assert(!wp2.includes('全局硬约束（plan.md 逐字下发'), '场景3b：无 plan.md→不注入不抛')
  rmSync(cdNoPlan, { recursive: true, force: true })
}

// ── 场景 4：空段体（只有标题）→ 不注入 ───────────────────────────────────────
{
  const cd = makeChangeDir('# 计划\n\n## 全局硬约束（从 design.md 逐字抄录，绑定所有 task）\n\n## 全局验收标准\n1. 测试通过\n')
  const wp = buildWavePrompt(WAVE, 1, cd, join(cd, 'wt'), {})
  assert(!wp.includes('全局硬约束（plan.md 逐字下发'), '场景4：空段体→不注入')
  rmSync(cd, { recursive: true, force: true })
}

// ── 场景 5：段在文件尾（无后续 ##）→ 可提取 ──────────────────────────────────
{
  const cd = makeChangeDir('# 计划\n\n## Wave 1\n- task-01\n\n## 全局硬约束（从 design.md 逐字抄录，绑定所有 task）\n- 约束甲：兼容旧配置\n')
  const wp = buildWavePrompt(WAVE, 1, cd, join(cd, 'wt'), {})
  assert(wp.includes('约束甲：兼容旧配置'), '场景5：文件尾段可提取')
  rmSync(cd, { recursive: true, force: true })
}

// ── 场景 6：超 2400 字截断 ────────────────────────────────────────────────────
{
  const long = Array.from({ length: 60 }, (_, i) => `- 约束条目 ${i + 1}：${'很长的约束内容'.repeat(8)}`).join('\n')
  const cd = makeChangeDir(`# 计划\n\n## 全局硬约束（从 design.md 逐字抄录，绑定所有 task）\n${long}\n`)
  const wp = buildWavePrompt(WAVE, 1, cd, join(cd, 'wt'), {})
  assert(wp.includes('超 2400 字截断'), '场景6：截断提示在位')
  assert(!wp.includes('约束条目 60'), '场景6：超界条目不注入')
  rmSync(cd, { recursive: true, force: true })
}

// ── 场景 7：buildExecuteSteps 全链路不因该段存在而异常 ────────────────────────
{
  const cd = makeChangeDir('# 计划\n\n## Wave 1（并行，无依赖）\n- task-01\n\n## 全局硬约束（从 design.md 逐字抄录，绑定所有 task）\n- 约束乙：命名用 camelCase\n')
  const steps = buildExecuteSteps(join(cd, 'plan.md'))
  const waveStep = steps.find(s => (s.name || '').includes('Wave 1'))
  assert(waveStep !== undefined && waveStep.prompt.includes('约束乙'), '场景7：全链路 wave 步含注入约束')
  rmSync(cd, { recursive: true, force: true })
}

console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed > 0 ? 1 : 0)
