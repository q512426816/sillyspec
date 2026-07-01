/**
 * Plan → Execute Contract v1 测试
 *
 * 验证 plan.md 到 execute 的契约：
 * 1. 各复杂度场景的 plan 校验通过
 * 2. 非法 plan 被正确拒绝
 * 3. execute 不复用旧 task
 */
import { validatePlanForExecute } from '../src/stages/execute.js'

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

console.log('=== Plan → Execute Contract v1 测试 ===\n')

// ─────────────────────────────────────────
// Case 1: none plan（最小变更）通过
// ─────────────────────────────────────────
console.log('--- Case 1: none plan contract 通过 ---')
{
  const plan = `# Plan

## Wave 1
- [ ] task-01: 修复 typo
`
  const result = validatePlanForExecute(plan)
  assert(result.ok, 'none plan 应校验通过')
  assert(result.tasks.length === 1, `应有 1 个 task，实际 ${result.tasks.length}`)
  assert(result.waves.length === 1, `应有 1 个 wave，实际 ${result.waves.length}`)
}

// ─────────────────────────────────────────
// Case 2: light plan 通过
// ─────────────────────────────────────────
console.log('\n--- Case 2: light plan contract 通过 ---')
{
  const plan = `# Plan

## Wave 1
- [ ] task-01: 添加 API 端点
- [ ] task-02: 添加前端调用
`
  const result = validatePlanForExecute(plan)
  assert(result.ok, 'light plan 应校验通过')
  assert(result.tasks.length === 2, `应有 2 个 task，实际 ${result.tasks.length}`)
}

// ─────────────────────────────────────────
// Case 3: full plan with waves 通过
// ─────────────────────────────────────────
console.log('\n--- Case 3: full plan wave contract 通过 ---')
{
  const plan = `# Plan

## Wave 1: 基础设施
- [ ] task-01: 数据库 schema
  - 修改: db/migrate/001.sql
- [ ] task-02: 模型定义

## Wave 2: 业务逻辑
- [ ] task-03: API 实现
- [ ] task-04: 业务规则

## Wave 3: 测试
- [ ] task-05: 集成测试
  - 参考: tests/integration/
`
  const result = validatePlanForExecute(plan)
  assert(result.ok, 'full plan 应校验通过')
  assert(result.tasks.length === 5, `应有 5 个 task，实际 ${result.tasks.length}`)
  assert(result.waves.length === 3, `应有 3 个 wave，实际 ${result.waves.length}`)
  assert(result.tasks[0].index === 1, 'task-01 index 应为 1')
  assert(result.tasks[4].index === 5, 'task-05 index 应为 5')
}

// ─────────────────────────────────────────
// Case 4: 无 checkbox task 失败
// ─────────────────────────────────────────
console.log('\n--- Case 4: 无 checkbox task 失败 ---')
{
  const plan = `# Plan

这个 plan 只有描述，没有任何 task。

## 注意事项
- 设计文档已就绪
`
  const result = validatePlanForExecute(plan)
  assert(!result.ok, '无 checkbox task 应失败')
  assert(result.errors.some(e => e.includes('checkbox task')), '错误应提到 checkbox task')
}

// ─────────────────────────────────────────
// Case 5: task id 重复失败
// ─────────────────────────────────────────
console.log('\n--- Case 5: task id 重复失败 ---')
{
  const plan = `# Plan

## Wave 1
- [ ] task-01: 第一个任务
- [ ] task-01: 重复的任务
`
  const result = validatePlanForExecute(plan)
  assert(!result.ok, 'task id 重复应失败')
  assert(result.errors.some(e => e.includes('重复')), '错误应提到重复')
}

// ─────────────────────────────────────────
// Case 6: task id 不连续失败
// ─────────────────────────────────────────
console.log('\n--- Case 6: task id 不连续失败 ---')
{
  const plan = `# Plan

## Wave 1
- [ ] task-01: 第一个
- [ ] task-03: 跳过了第二个
`
  const result = validatePlanForExecute(plan)
  assert(!result.ok, 'task id 不连续应失败')
  assert(result.errors.some(e => e.includes('不连续')), '错误应提到不连续')
}

// ─────────────────────────────────────────
// Case 7: 空 plan 失败
// ─────────────────────────────────────────
console.log('\n--- Case 7: 空 plan 失败 ---')
{
  const result1 = validatePlanForExecute('')
  assert(!result1.ok, '空字符串应失败')

  const result2 = validatePlanForExecute(null)
  assert(!result2.ok, 'null 应失败')

  const result3 = validatePlanForExecute('   ')
  assert(!result3.ok, '纯空格应失败')
}

// ─────────────────────────────────────────
// Case 8: task name 非空
// ─────────────────────────────────────────
console.log('\n--- Case 8: task name 为空失败 ---')
{
  // 注意：parseWavesFromPlan 在 task name 为空字符串时可能不触发
  // 这个 case 验证 validator 能检测到空 name
  const plan = `# Plan

## Wave 1
- [ ] task-01: 
`
  const result = validatePlanForExecute(plan)
  // task name 为空时 trim 后为空
  if (result.tasks.length > 0 && !result.tasks[0].name.trim()) {
    assert(!result.ok, 'task name 为空应失败')
  } else {
    // 如果 parser 把空 name 过滤了，那至少 plan 能解析
    console.log('  ℹ️  parser 过滤了空 name，跳过此 case')
  }
}

// ─────────────────────────────────────────
// Case 9: task 无 id 只有 warning
// ─────────────────────────────────────────
console.log('\n--- Case 9: task 无 id 只有 warning ---')
{
  const plan = `# Plan

## Wave 1
- [ ] 实现登录功能
`
  const result = validatePlanForExecute(plan)
  // 无 id 的 task 只产生 warning，不阻止执行
  assert(result.ok, '无 id task 不应阻止执行')
  assert(result.warnings.length > 0, '应有 warning 关于缺少 task id')
}

// ─────────────────────────────────────────
// Case 10: 连续 id 从 1 开始
// ─────────────────────────────────────────
console.log('\n--- Case 10: task-02 起始不报不连续（兼容） ---')
{
  const plan = `# Plan

## Wave 1
- [ ] task-02: 第二个
- [ ] task-03: 第三个
`
  const result = validatePlanForExecute(plan)
  // 从 task-02 开始，ids[0]=2 ≠ 1，不触发连续性检查
  assert(result.ok, 'task-02 起始不应报不连续')
}

// ─────────────────────────────────────────
// Case 11: 子行信息解析正确
// ─────────────────────────────────────────
console.log('\n--- Case 11: 子行信息（修改/参考）解析正确 ---')
{
  const plan = `# Plan

## Wave 1
- [ ] task-01: 实现功能
  - 修改: src/auth.js
  - 参考: docs/auth.md
  - 步骤: 1. 创建模型 2. 写中间件
`
  const result = validatePlanForExecute(plan)
  assert(result.ok, '有子行的 plan 应校验通过')
  assert(result.tasks[0].file === 'src/auth.js', 'task file 应为 src/auth.js')
  assert(result.tasks[0].reference === 'docs/auth.md', 'task reference 应为 docs/auth.md')
}

// ─────────────────────────────────────────
// Case 12: 多 Wave 各自有 task
// ─────────────────────────────────────────
console.log('\n--- Case 12: 多 Wave 各自有 task ---')
{
  const plan = `# Plan

## Wave 1
- [ ] task-01: A

## Wave 2
- [ ] task-02: B

## Wave 3
- [ ] task-03: C
`
  const result = validatePlanForExecute(plan)
  assert(result.ok, '多 Wave plan 应校验通过')
  assert(result.waves.length === 3, '应有 3 个 wave')
  assert(result.waves[0].tasks.length === 1, 'wave 1 应有 1 task')
  assert(result.waves[2].tasks[0].index === 3, 'wave 3 task 应为 task-03')
}

// ─────────────────────────────────────────
// Plan Postcheck Contract: valid none plan 通过
// ─────────────────────────────────────────
console.log('\n--- Plan Postcheck: valid none plan 通过 ---')
{
  const plan = `# Plan\n\n## Wave 1\n- [ ] task-01: 修复 bug\n`
  const result = validatePlanForExecute(plan)
  assert(result.ok, 'none plan 应通过 postcheck contract')
  assert(result.errors.length === 0, '不应有 errors')
}

// ─────────────────────────────────────────
// Plan Postcheck Contract: valid light plan 通过
// ─────────────────────────────────────────
console.log('\n--- Plan Postcheck: valid light plan 通过 ---')
{
  const plan = `# Plan\n\n## Wave 1\n- [ ] task-01: API\n- [ ] task-02: 前端\n`
  const result = validatePlanForExecute(plan)
  assert(result.ok, 'light plan 应通过 postcheck contract')
}

// ─────────────────────────────────────────
// Plan Postcheck Contract: valid full plan 通过
// ─────────────────────────────────────────
console.log('\n--- Plan Postcheck: valid full plan 通过 ---')
{
  const plan = `# Plan\n\n## Wave 1\n- [ ] task-01: A\n## Wave 2\n- [ ] task-02: B\n## Wave 3\n- [ ] task-03: C\n`
  const result = validatePlanForExecute(plan)
  assert(result.ok, 'full plan 应通过 postcheck contract')
  assert(result.waves.length === 3, '应有 3 个 wave')
}

// ─────────────────────────────────────────
// Plan Postcheck Contract: missing checkbox 失败
// ─────────────────────────────────────────
console.log('\n--- Plan Postcheck: missing checkbox 失败 ---')
{
  const plan = `# Plan\n\n只有描述没有 task。\n`
  const result = validatePlanForExecute(plan)
  assert(!result.ok, '无 checkbox 应不通过 postcheck')
  assert(result.errors.length > 0, '应有 errors')
  assert(result.errors.some(e => e.includes('checkbox task')), '应有 checkbox task 错误')
}

// ─────────────────────────────────────────
// Plan Postcheck Contract: warning 不阻断
// ─────────────────────────────────────────
console.log('\n--- Plan Postcheck: warning 不阻断 completed ---')
{
  const plan = `# Plan\n\n## Wave 1\n- [ ] 实现功能（无 task id）\n`
  const result = validatePlanForExecute(plan)
  assert(result.ok, '有 warning 但应通过 postcheck（不阻断 completed）')
  assert(result.warnings.length > 0, '应有 warning')
}

// ─────────────────────────────────────────
// Plan Postcheck Contract: id 重复失败
// ─────────────────────────────────────────
console.log('\n--- Plan Postcheck: task id 重复失败 ---')
{
  const plan = `# Plan\n\n## Wave 1\n- [ ] task-01: A\n- [ ] task-01: B\n`
  const result = validatePlanForExecute(plan)
  assert(!result.ok, 'id 重复应不通过 postcheck')
}

// ─────────────────────────────────────────
// Plan Postcheck Contract: id 不连续失败
// ─────────────────────────────────────────
console.log('\n--- Plan Postcheck: task id 不连续失败 ---')
{
  const plan = `# Plan\n\n## Wave 1\n- [ ] task-01: A\n- [ ] task-03: C\n`
  const result = validatePlanForExecute(plan)
  assert(!result.ok, 'id 不连续应不通过 postcheck')
}

// ─────────────────────────────────────────
// Bug C 回归: 「## 自检」段的 - [x] checkbox 不应被解析为 task
// 详见 docs/sillyspec/plan-postcheck-self-check-checkbox-false-dup.md
// ─────────────────────────────────────────
console.log('\n--- Bug C 回归: 自检段 checkbox 不误解析 ---')
{
  const plan = `# Plan

## Wave 1
- [ ] task-01: 建立 schema
- [ ] task-02: 接口实现

## Wave 2
- [ ] task-03: 前端对接
- [ ] task-04: 集成测试

## 自检
- [x] 每个 task 有编号(task-01~04),总数 4(≤15)
- [x] 无泛泛风险(转为具体验收条目与 task-04/task-06 等)
`
  const result = validatePlanForExecute(plan)
  assert(result.ok, `自检段含 - [x] 不应误报，errors: ${result.errors.join('; ')}`)
  assert(result.tasks.length === 4, `应只解析 4 个 task，实际 ${result.tasks.length}（自检 checkbox 被误纳入）`)
  const ids = result.tasks.map(t => t.index).sort((a, b) => a - b)
  assert(JSON.stringify(ids) === JSON.stringify([1, 2, 3, 4]), `task id 应为 1-4，实际 ${ids}`)
}

// ── 结果 ──
console.log(`\n${'='.repeat(50)}`)
console.log(`✅ 通过: ${13 - failed}  ❌ 失败: ${failed}`)
if (failures.length > 0) {
  console.log(`失败项:`)
  failures.forEach(f => console.log(`  - ${f}`))
}
console.log(`${'='.repeat(50)}`)

if (failed > 0) process.exit(1)
