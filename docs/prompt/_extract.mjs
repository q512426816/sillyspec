/**
 * 机械提取所有阶段的 step prompt（运行时字符串本身，100% 保真）。
 * 子代理基于 _extracted.json 组织 docs/prompt/<stage>.md，消除"复制时改写"风险。
 *
 * 静态阶段：import definition.steps 直接取
 * 动态阶段：plan → buildPlanSteps（示例 planContent + changeDir）
 *           execute → buildExecuteSteps（示例 planFilePath + worktreePath）
 *
 * 输出：docs/prompt/_extracted.json
 */
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, join } from 'node:path'
import { writeFileSync } from 'node:fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..', '..') // docs/prompt -> 项目根
const stageUrl = (name) => pathToFileURL(join(root, 'src', 'stages', `${name}.js`)).href

// stages/index.js 的 stageRegistry 实际注册的（auxiliary:true 标记的辅助阶段）
const AUX = ['scan', 'quick', 'explore', 'archive', 'status', 'doctor']

const STEP_KEYS = [
  'id', 'name', 'mode', 'prompt', 'outputHint', 'optional',
  'requiresWait', 'conditionalWait', 'repeatableWait', 'maxWaitRounds',
  'waitReason', 'waitOptions', 'noAI', '_cliAction', 'migratedFrom'
]

function extractStep(step, index) {
  if (!step) return null
  const out = { index }
  for (const key of STEP_KEYS) if (key in step) out[key] = step[key]
  return out
}

function extractDef(def, auxiliary, extra = {}) {
  return {
    name: def.name,
    title: def.title,
    description: def.description,
    auxiliary: !!auxiliary,
    globalGuardrails: def._globalGuardrails || null,
    stepsCount: (def.steps || []).length,
    steps: (def.steps || []).map((s, i) => extractStep(s, i)),
    ...extra
  }
}

const out = {}

// ── 静态阶段（definition.steps 直接定义）──
const staticStages = ['brainstorm', 'propose', 'verify', 'scan', 'quick', 'explore', 'archive', 'status', 'doctor']
for (const name of staticStages) {
  const mod = await import(stageUrl(name))
  out[name] = extractDef(mod.definition, AUX.includes(name), {
    sourceFile: `src/stages/${name}.js`,
    inStageRegistry: name !== 'propose' // propose 不在 stages/index.js 的 registry
  })
}

// ── plan（动态：buildPlanSteps）──
const planMod = await import(stageUrl('plan'))
const demoPlanContent = `---
plan_level: full
---

# 实现计划（Plan）

## Wave 1（并行，无依赖）
- [ ] task-01: 添加用户创建接口（覆盖：FR-01, D-001@v1）
- [ ] task-02: 添加角色创建接口（覆盖：FR-02）

## Wave 2（依赖 Wave 1）
- [ ] task-03: 用户创建接口联调
`
const demoChangeDir = join(root, '.sillyspec', 'changes', '2026-05-13-demo-change')
const planSteps = planMod.buildPlanSteps(demoChangeDir, demoPlanContent)
out.plan = extractDef(planMod.definition, false, {
  sourceFile: 'src/stages/plan.js',
  inStageRegistry: true,
  dynamic: 'steps 由 buildPlanSteps(changeDir, planContent) 动态生成；任务数为 0 时只有 3 个 fixedPrefix 步骤；有任务时追加 coordinator + postcheck',
  demoNote: '下方 coordinator 步骤用 3-task 示例 plan 生成（task-01/02/03），实际任务列表与 changeDir 随变更变化',
  stepsCount: planSteps.length,
  steps: planSteps.map((s, i) => extractStep(s, i))
})

// ── execute（动态：buildExecuteSteps）──
const execMod = await import(stageUrl('execute'))
const demoPlanFile = join(demoChangeDir, 'plan.md') // 不存在 → buildExecuteSteps 用默认 3 Wave
const execSteps = execMod.buildExecuteSteps(demoPlanFile, { worktreePath: '/tmp/worktrees/demo-change' })
out.execute = extractDef(execMod.definition, false, {
  sourceFile: 'src/stages/execute.js',
  inStageRegistry: true,
  dynamic: 'steps 由 buildExecuteSteps(planFilePath, options) 动态生成；Wave 步骤数 = plan.md 的 Wave 数（无 plan 时默认 3 Wave）',
  demoNote: '下方 Wave 步骤用默认 3-wave 示例生成，实际 Wave 数/任务随 plan.md 变化；contractInjection/prototypeInjection 在无相关契约/原型时为空',
  stepsCount: execSteps.length,
  steps: execSteps.map((s, i) => extractStep(s, i))
})

// ── brainstorm-auto（变体：不在 stageRegistry，自动模式用）──
try {
  const autoMod = await import(stageUrl('brainstorm-auto'))
  out['brainstorm-auto'] = extractDef(autoMod.definition, false, {
    sourceFile: 'src/stages/brainstorm-auto.js',
    inStageRegistry: false,
    note: '自动模式（auto）变体，不在 stages/index.js 的 stageRegistry；与 brainstorm 同名阶段的不同执行策略'
  })
} catch (e) {
  out['brainstorm-auto'] = { error: String(e) }
}

writeFileSync(join(__dirname, '_extracted.json'), JSON.stringify(out, null, 2) + '\n', 'utf8')
console.log('✅ extracted -> docs/prompt/_extracted.json')
for (const [k, v] of Object.entries(out)) {
  const gw = v.globalGuardrails ? ' [+guardrails]' : ''
  console.log(`  ${k.padEnd(16)} steps=${String(v.stepsCount).padStart(2)}${gw}`)
}
