/**
 * Plan 优化测试：验证新架构的 4 个关键功能
 *
 * 1. plan fast path 能生成合法 plan.md（buildPlanSteps 返回正确步骤数）
 * 2. light plan 最多 1~3 个 task
 * 3. depends_on 能正确排序 Wave（topoSortWaves）
 * 4. 循环依赖要 fail-fast（topoSortWaves）
 * 5. 缺 allowed_paths / acceptance / verify 时 validator 失败
 * 6. execute 能正常解析新 plan.md（validatePlanForExecute 仍通过）
 */

import {
  buildPlanSteps,
  fixedPrefix,
  fixedSuffix,
  topoSortWaves,
  validateBlueprintConsistency,
  validateDesignForPlan,
  validatePlanFeasibility
} from '../src/stages/plan.js'
import { validatePlanForExecute } from '../src/stages/execute.js'
import { existsSync, mkdirSync, writeFileSync, mkdtempSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

let failed = 0
const failures = []

function assert(condition, msg) {
  if (!condition) {
    failed++
    failures.push(msg)
    console.log(`  ❌ FAIL: ${msg}`)
  } else {
    console.log(`  ✅ PASS: ${msg}`)
  }
}

console.log('=== Plan 优化测试 ===\n')

// ─────────────────────────────────────────
// Test 1: buildPlanSteps 返回正确步骤数（fast path = 无 task）
// ─────────────────────────────────────────
console.log('--- Test 1: buildPlanSteps fast path（无 plan.md） ---')
{
  // 没有 changeDir 也没有 planContent → fast path
  const steps = buildPlanSteps(null, null)
  // 应该只有 fixedPrefix（2 步），无蓝图无 postcheck
  assert(steps.length === 2, `无 task 时应有 2 步（fixedPrefix），实际 ${steps.length}`)
  assert(steps[0].name === '复杂度分类与上下文加载', `第 1 步应为「复杂度分类与上下文加载」，实际 "${steps[0].name}"`)
  assert(steps[1].name === '生成分级计划与自检', `第 2 步应为「生成分级计划与自检」，实际 "${steps[1].name}"`)
}

// ─────────────────────────────────────────
// Test 1b: buildPlanSteps 有 task 时返回 4 步
// ─────────────────────────────────────────
console.log('\n--- Test 1b: buildPlanSteps 有 task 时返回 4 步 ---')
{
  const planContent = `# Plan\n\n## Wave 1\n- [ ] task-01: 做 A\n- [ ] task-02: 做 B\n`
  const tmpDir = mkdtempSync(join(tmpdir(), 'sillyspec-test-'))
  const changeDir = join(tmpDir, 'test-change')
  mkdirSync(join(changeDir, 'tasks'), { recursive: true })
  writeFileSync(join(changeDir, 'plan.md'), planContent)

  const steps = buildPlanSteps(changeDir, planContent)
  assert(steps.length === 4, `有 task 时应有 4 步，实际 ${steps.length}`)
  assert(steps[2].name === '生成 TaskCard（子代理并行）', `第 3 步应为 TaskCard 生成，实际 "${steps[2].name}"`)
  assert(steps[3].name === 'Wave 重排与可行性校验', `第 4 步应为 postcheck，实际 "${steps[3].name}"`)
  assert(steps[3].noAI === true, `第 4 步应为 noAI`)
  assert(steps[3]._cliAction === 'planPostcheck', `第 4 步 _cliAction 应为 planPostcheck`)

  rmSync(tmpDir, { recursive: true, force: true })
}

// ─────────────────────────────────────────
// Test 2: light plan 最多 1~3 个 task（通过 parseTaskCount 验证）
// ─────────────────────────────────────────
console.log('\n--- Test 2: light plan checkbox 解析 ---')
{
  const lightPlan = `---
plan_level: light
---

# 轻量计划

## Wave 1
- [ ] task-01: 修改字段
- [ ] task-02: 更新测试
- [ ] task-03: 文档补全
`
  const result = validatePlanForExecute(lightPlan)
  assert(result.ok, 'light plan 应通过 execute contract')
  assert(result.tasks.length === 3, `应有 3 个 task，实际 ${result.tasks.length}`)
}

// ─────────────────────────────────────────
// Test 3: depends_on 拓扑排序
// ─────────────────────────────────────────
console.log('\n--- Test 3: topoSortWaves 正确排序 ---')
{
  // task-01 无依赖 → Wave 1
  // task-02 无依赖 → Wave 1
  // task-03 依赖 task-01 → Wave 2
  // task-04 依赖 task-03 → Wave 3
  const depMap = new Map([
    ['task-01', []],
    ['task-02', []],
    ['task-03', ['task-01']],
    ['task-04', ['task-03']],
  ])
  const { waves, error } = topoSortWaves(depMap)
  assert(error === null, `不应有错误`)
  assert(waves.length === 3, `应有 3 个 Wave，实际 ${waves.length}`)
  assert(waves[0].includes('task-01') && waves[0].includes('task-02'), `Wave 1 应含 task-01/02`)
  assert(waves[1].includes('task-03'), `Wave 2 应含 task-03`)
  assert(waves[2].includes('task-04'), `Wave 3 应含 task-04`)
}

// ─────────────────────────────────────────
// Test 3b: 全并行（无依赖）→ 单 Wave
// ─────────────────────────────────────────
console.log('\n--- Test 3b: 全并行 → 单 Wave ---')
{
  const depMap = new Map([
    ['task-01', []],
    ['task-02', []],
    ['task-03', []],
  ])
  const { waves, error } = topoSortWaves(depMap)
  assert(error === null, `不应有错误`)
  assert(waves.length === 1, `应有 1 个 Wave，实际 ${waves.length}`)
  assert(waves[0].length === 3, `Wave 1 应有 3 个 task`)
}

// ─────────────────────────────────────────
// Test 4: 循环依赖 fail-fast
// ─────────────────────────────────────────
console.log('\n--- Test 4: 循环依赖 fail-fast ---')
{
  // task-01 → task-02 → task-01（循环）
  const depMap = new Map([
    ['task-01', ['task-02']],
    ['task-02', ['task-01']],
  ])
  const { waves, error } = topoSortWaves(depMap)
  assert(error !== null, `循环依赖应报错`)
  assert(error.includes('循环依赖'), `错误应包含「循环依赖」，实际: ${error}`)
  assert(waves.length === 0, `循环依赖时 waves 应为空`)
}

// ─────────────────────────────────────────
// Test 4b: 自循环依赖
// ─────────────────────────────────────────
console.log('\n--- Test 4b: 自循环依赖 ---')
{
  const depMap = new Map([
    ['task-01', ['task-01']],
  ])
  const { error } = topoSortWaves(depMap)
  assert(error !== null, `自循环应报错`)
}

// ─────────────────────────────────────────
// Test 5: validateBlueprintConsistency 缺 allowed_paths 失败
// ─────────────────────────────────────────
console.log('\n--- Test 5a: 缺 allowed_paths 失败 ---')
{
  const tmpDir = mkdtempSync(join(tmpdir(), 'sillyspec-test-'))
  const tasksDir = join(tmpDir, 'tasks')
  mkdirSync(tasksDir, { recursive: true })

  writeFileSync(join(tasksDir, 'task-01.md'), `---
id: task-01
title: 测试
priority: P0
depends_on: []
blocks: []
requirement_ids: []
decision_ids: []
allowed_paths: []
---

# task-01: 测试

## 验收标准
| # | 验证步骤 | 通过标准 |
|---|---|---|
| AC-01 | 操作 | 结果 |
`)

  const result = validateBlueprintConsistency(tmpDir)
  assert(!result.ok, `缺 allowed_paths 应失败`)
  assert(result.errors.some(e => e.includes('allowed_paths')), `错误应提到 allowed_paths`)
  rmSync(tmpDir, { recursive: true, force: true })
}

// ─────────────────────────────────────────
// Test 5b: 缺验收标准失败
// ─────────────────────────────────────────
console.log('\n--- Test 5b: 缺验收标准失败 ---')
{
  const tmpDir = mkdtempSync(join(tmpdir(), 'sillyspec-test-'))
  const tasksDir = join(tmpDir, 'tasks')
  mkdirSync(tasksDir, { recursive: true })

  writeFileSync(join(tasksDir, 'task-01.md'), `---
id: task-01
title: 测试
priority: P0
depends_on: []
blocks: []
requirement_ids: []
decision_ids: []
allowed_paths:
  - src/foo.js
---

# task-01: 测试

## 修改文件
- src/foo.js

## TDD 步骤
1. 写测试
`)

  const result = validateBlueprintConsistency(tmpDir)
  assert(!result.ok, `缺验收标准应失败`)
  assert(result.errors.some(e => e.includes('验收标准')), `错误应提到验收标准`)
  rmSync(tmpDir, { recursive: true, force: true })
}

// ─────────────────────────────────────────
// Test 5c: 完整蓝图通过校验
// ─────────────────────────────────────────
console.log('\n--- Test 5c: 完整蓝图通过校验 ---')
{
  const tmpDir = mkdtempSync(join(tmpdir(), 'sillyspec-test-'))
  const tasksDir = join(tmpDir, 'tasks')
  mkdirSync(tasksDir, { recursive: true })

  writeFileSync(join(tasksDir, 'task-01.md'), `---
id: task-01
title: 做 A
author: test
created_at: 2026-06-25 12:00:00
priority: P0
depends_on: []
blocks: []
requirement_ids: [FR-01]
decision_ids: []
allowed_paths:
  - src/a.js
---

# task-01: 做 A

## 修改文件
- src/a.js

## TDD 步骤
1. 写测试

## 验收标准
| # | 验证步骤 | 通过标准 |
|---|---|---|
| AC-01 | 操作 | 结果 |
`)

  writeFileSync(join(tasksDir, 'task-02.md'), `---
id: task-02
title: 做 B
author: test
created_at: 2026-06-25 12:00:00
priority: P0
depends_on: [task-01]
blocks: []
requirement_ids: [FR-02]
decision_ids: []
allowed_paths:
  - src/b.js
---

# task-02: 做 B

## 修改文件
- src/b.js

## TDD 步骤
1. 写测试

## 验收标准
| # | 验证步骤 | 通过标准 |
|---|---|---|
| AC-01 | 操作 | 结果 |
`)

  const result = validateBlueprintConsistency(tmpDir)
  assert(result.ok, `完整蓝图应通过校验，errors: ${JSON.stringify(result.errors)}`)
  rmSync(tmpDir, { recursive: true, force: true })
}

// ─────────────────────────────────────────
// Test 6: execute 能正常解析新 plan.md
// ─────────────────────────────────────────
console.log('\n--- Test 6: execute contract 兼容 ---')
{
  // none plan
  const nonePlan = `---
plan_level: none
---

# 计划跳过

## Wave 1
- [ ] task-01: 按用户需求完成修改
`
  const noneResult = validatePlanForExecute(nonePlan)
  assert(noneResult.ok, `none plan 应通过 execute contract`)

  // light plan
  const lightPlan = `---
plan_level: light
---

# 轻量计划

## Wave 1
- [ ] task-01: 修改 A
- [ ] task-02: 修改 B

## 验收
- 测试通过
`
  const lightResult = validatePlanForExecute(lightPlan)
  assert(lightResult.ok, `light plan 应通过 execute contract`)
  assert(lightResult.tasks.length === 2, `light plan 应有 2 个 task`)

  // full plan with waves
  const fullPlan = `---
plan_level: full
---

# 实现计划

## Wave 1
- [ ] task-01: 基础
- [ ] task-02: 配置

## Wave 2
- [ ] task-03: 业务逻辑

## 任务总表
| 编号 | 任务 | Wave | 优先级 | 依赖 | 覆盖 FR/D | 说明 |
|---|---|---|---|---|---|---|
| task-01 | 基础 | W1 | P0 | — | FR-01 | ... |
| task-02 | 配置 | W1 | P0 | — | FR-02 | ... |
| task-03 | 业务逻辑 | W2 | P0 | task-01,02 | FR-03 | ... |
`
  const fullResult = validatePlanForExecute(fullPlan)
  assert(fullResult.ok, `full plan 应通过 execute contract`)
  assert(fullResult.tasks.length === 3, `full plan 应有 3 个 task`)
  assert(fullResult.waves.length === 2, `full plan 应有 2 个 wave`)
}

// ─────────────────────────────────────────
// Test 7: fixedSuffix 为空（新架构变更）
// ─────────────────────────────────────────
console.log('\n--- Test 7: fixedSuffix 为空（新架构） ---')
{
  assert(Array.isArray(fixedSuffix), `fixedSuffix 应为数组`)
  assert(fixedSuffix.length === 0, `fixedSuffix 应为空数组，实际长度 ${fixedSuffix.length}`)
  assert(Array.isArray(fixedPrefix), `fixedPrefix 应为数组`)
  assert(fixedPrefix.length === 2, `fixedPrefix 应有 2 个步骤，实际 ${fixedPrefix.length}`)
}

// ─────────────────────────────────────────
// Test 8: 链式依赖（A→B→C→D）正确分 4 Wave
// ─────────────────────────────────────────
console.log('\n--- Test 8: 链式依赖分 4 Wave ---')
{
  const depMap = new Map([
    ['task-01', []],
    ['task-02', ['task-01']],
    ['task-03', ['task-02']],
    ['task-04', ['task-03']],
  ])
  const { waves, error } = topoSortWaves(depMap)
  assert(error === null, `不应有错误`)
  assert(waves.length === 4, `链式依赖应有 4 个 Wave，实际 ${waves.length}`)
  assert(waves[0][0] === 'task-01', `Wave 1 应为 task-01`)
  assert(waves[3][0] === 'task-04', `Wave 4 应为 task-04`)
}

// ───────────────────────────────────────
// Test 9: validatePlanFeasibility 缺必要字段失败
// ───────────────────────────────────────
console.log('\n--- Test 9: validatePlanFeasibility 缺字段失败 ---')
{
  const tmpDir = mkdtempSync(join(tmpdir(), 'sillyspec-feas-'))
  const tasksDir = join(tmpDir, 'tasks')
  mkdirSync(tasksDir, { recursive: true })

  writeFileSync(join(tasksDir, 'task-01.md'), `---
id: task-01
title: 测试
priority: P0
depends_on: []
blocks: []
allowed_paths:
  - src/foo.js
---

some body
`)

  const result = validatePlanFeasibility(tmpDir)
  assert(!result.ok, '缺必要字段应失败')
  assert(result.errors.some(e => e.includes('goal')), '应有 goal 错误')
  assert(result.errors.some(e => e.includes('implementation')), '应有 implementation 错误')
  assert(result.errors.some(e => e.includes('acceptance')), '应有 acceptance 错误')
  assert(result.errors.some(e => e.includes('verify')), '应有 verify 错误')
  assert(result.errors.some(e => e.includes('constraints')), '应有 constraints 错误')

  rmSync(tmpDir, { recursive: true, force: true })
}

// ───────────────────────────────────────
// Test 10: validatePlanFeasibility 完整 TaskCard 通过
// ───────────────────────────────────────
console.log('\n--- Test 10: validatePlanFeasibility 完整 TaskCard 通过 ---')
{
  const tmpDir = mkdtempSync(join(tmpdir(), 'sillyspec-feas-ok-'))
  const tasksDir = join(tmpDir, 'tasks')
  mkdirSync(tasksDir, { recursive: true })

  writeFileSync(join(tasksDir, 'task-01.md'), `---
id: task-01
title: 做 A
priority: P0
depends_on: []
blocks: []
allowed_paths:
  - src/a.js
goal: >
  做事 A。
implementation:
  - 步骤 1
  - 步骤 2
acceptance:
  - 验收 1
verify:
  - npm test
constraints:
  - 不加测试
---
`)

  const result = validatePlanFeasibility(tmpDir)
  assert(result.ok, `完整 TaskCard 应通过，errors: ${JSON.stringify(result.errors)}`)

  rmSync(tmpDir, { recursive: true, force: true })
}

// ───────────────────────────────────────
// Test 11: validatePlanFeasibility depends_on 引用不存在失败
// ───────────────────────────────────────
console.log('\n--- Test 11: depends_on 引用不存在失败 ---')
{
  const tmpDir = mkdtempSync(join(tmpdir(), 'sillyspec-dep-'))
  const tasksDir = join(tmpDir, 'tasks')
  mkdirSync(tasksDir, { recursive: true })

  writeFileSync(join(tasksDir, 'task-01.md'), `---
id: task-01
title: A
priority: P0
depends_on: []
blocks: []
allowed_paths:
  - src/a.js
goal: >
  A.
implementation:
  - do
acceptance:
  - ok
verify:
  - npm test
constraints:
  - none
---
`)

  writeFileSync(join(tasksDir, 'task-02.md'), `---
id: task-02
title: B
priority: P0
depends_on: [task-99]
blocks: []
allowed_paths:
  - src/b.js
goal: >
  B.
implementation:
  - do
acceptance:
  - ok
verify:
  - npm test
constraints:
  - none
---
`)

  const result = validatePlanFeasibility(tmpDir)
  assert(!result.ok, '引用不存在的 task-99 应失败')
  assert(result.errors.some(e => e.includes('task-99')), '错误应提到 task-99')

  rmSync(tmpDir, { recursive: true, force: true })
}

// ───────────────────────────────────────
// Test 12: validatePlanFeasibility task id 不连续失败
// ───────────────────────────────────────
console.log('\n--- Test 12: task id 不连续失败 ---')
{
  const tmpDir = mkdtempSync(join(tmpdir(), 'sillyspec-gap-'))
  const tasksDir = join(tmpDir, 'tasks')
  mkdirSync(tasksDir, { recursive: true })

  for (const { id, num } of [{ id: 'task-01', num: '01' }, { id: 'task-03', num: '03' }]) {
    writeFileSync(join(tasksDir, `task-${num}.md`), `---
id: ${id}
title: ${id}
priority: P0
depends_on: []
blocks: []
allowed_paths:
  - src/a.js
goal: >
  test.
implementation:
  - do
acceptance:
  - ok
verify:
  - npm test
constraints:
  - none
---
`)
  }

  const result = validatePlanFeasibility(tmpDir)
  assert(!result.ok, 'task id 不连续应失败')
  assert(result.errors.some(e => e.includes('不连续')), '错误应提到不连续')

  rmSync(tmpDir, { recursive: true, force: true })
}

// ── 结果 ──
console.log(`\n${'='.repeat(50)}`)
const total = 12
console.log(`✅ 通过: ${total - failed}  ❌ 失败: ${failed}`)
if (failures.length > 0) {
  console.log(`失败项:`)
  failures.forEach(f => console.log(`  - ${f}`))
}
console.log(`${'='.repeat(50)}`)

if (failed > 0) process.exit(1)
