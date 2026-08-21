/**
 * Plan → Execute Contract 测试（2026-08-20-task-truth-unify 起新契约：tasks.md 注册表 × plan.md Wave ID 引用）
 *
 * 验证 tasks.md/plan.md 到 execute 的契约：
 * 1. 各复杂度场景的双文件校验通过
 * 2. 非法注册表/引用被正确拒绝
 * 3. 旧格式（plan.md 任务 checkbox）被拦并指路
 *
 * 适配说明：原 v1 用例的旧格式 fixture（plan.md 内 checkbox 任务行）已按新契约改写为
 * 「tasks.md 注册表 + plan.md ID 引用行」双文件形态；被新契约取代的场景（无 id task 的
 * warning、plan 内子行 修改/参考 解析、`## Tasks` 隐式任务区）由 parseTaskRegistry 的
 * 对应用例（task-truth-contract.test.mjs ⑧/⑨）与本文对应新场景承接。
 */
import { validatePlanForExecute } from '../src/stages/execute.js'

let failed = 0
let total = 0
const failures = []

function assert(condition, msg) {
  total++
  if (!condition) {
    failed++
    failures.push(msg)
    console.log(`  ❌ FAIL: ${msg}`)
  } else {
    console.log(`  ✅ PASS: ${msg}`)
  }
}

// 构造双文件 fixture：tasks 行列表 + plan body（Wave 段引用行）。
// plan 一律带 plan_level frontmatter（2026-08-21 审查 CLI-5 起 validatePlanForExecute
// 硬校验该锚点——它是 review tier 主锚，漏写会静默降级自审）
function fx(taskLines, planBody) {
  const tasks = ['# 任务清单（Tasks）', '', ...taskLines].join('\n')
  const plan = `---\nplan_level: light\n---\n\n# Plan\n\n${planBody}`
  return { tasks, plan }
}

console.log('=== Plan → Execute Contract 测试（tasks.md × plan.md 新契约）===\n')

// ─────────────────────────────────────────
// Case 1: 单任务（none 级形态）通过
// ─────────────────────────────────────────
console.log('--- Case 1: 单任务 contract 通过 ---')
{
  const { tasks, plan } = fx(['- [ ] task-01: 修复 typo'], '## Wave 1\n- task-01\n')
  const result = validatePlanForExecute(tasks, plan)
  assert(result.ok, '单任务应校验通过')
  assert(result.tasks.length === 1, `应有 1 个 task，实际 ${result.tasks.length}`)
  assert(result.waves.length === 1, `应有 1 个 wave，实际 ${result.waves.length}`)
}

// ─────────────────────────────────────────
// Case 2: 两任务单 Wave（light 级形态）通过
// ─────────────────────────────────────────
console.log('\n--- Case 2: 两任务单 Wave 通过 ---')
{
  const { tasks, plan } = fx(
    ['- [ ] task-01: 添加 API 端点', '- [ ] task-02: 添加前端调用'],
    '## Wave 1\n- task-01\n- task-02\n'
  )
  const result = validatePlanForExecute(tasks, plan)
  assert(result.ok, '两任务应校验通过')
  assert(result.tasks.length === 2, `应有 2 个 task，实际 ${result.tasks.length}`)
}

// ─────────────────────────────────────────
// Case 3: full plan 多 Wave 通过 + index 连续
// ─────────────────────────────────────────
console.log('\n--- Case 3: full plan 多 Wave contract 通过 ---')
{
  const { tasks, plan } = fx(
    ['- [ ] task-01: 数据库 schema', '- [ ] task-02: 模型定义', '- [ ] task-03: API 实现', '- [ ] task-04: 业务规则', '- [ ] task-05: 集成测试'],
    '## Wave 1: 基础设施\n- task-01\n- task-02\n\n## Wave 2: 业务逻辑\n- task-03\n- task-04\n\n## Wave 3: 测试\n- task-05\n'
  )
  const result = validatePlanForExecute(tasks, plan)
  assert(result.ok, `full plan 应校验通过（${result.errors.join('; ')}）`)
  assert(result.tasks.length === 5, `应有 5 个 task，实际 ${result.tasks.length}`)
  assert(result.waves.length === 3, `应有 3 个 wave，实际 ${result.waves.length}`)
  assert(result.tasks[0].index === 1, 'task-01 index 应为 1')
  assert(result.tasks[4].index === 5, 'task-05 index 应为 5')
}

// ─────────────────────────────────────────
// Case 4: 注册表为空失败（诊断指路）
// ─────────────────────────────────────────
console.log('\n--- Case 4: 注册表为空失败 ---')
{
  const plan = `# Plan\n\n这个 plan 只有描述，没有任何任务引用。\n`
  const result = validatePlanForExecute('', plan)
  assert(!result.ok, '注册表为空应失败')
  assert(result.errors.some(e => e.includes('task-XX checkbox')), '错误应提到 task-XX checkbox')
}

// ─────────────────────────────────────────
// Case 5: task id 重复失败（tasks.md 内重复行）
// ─────────────────────────────────────────
console.log('\n--- Case 5: task id 重复失败 ---')
{
  const { tasks, plan } = fx(
    ['- [ ] task-01: 第一个任务', '- [ ] task-01: 重复的任务'],
    '## Wave 1\n- task-01\n'
  )
  const result = validatePlanForExecute(tasks, plan)
  assert(!result.ok, 'task id 重复应失败')
  assert(result.errors.some(e => e.includes('重复')), '错误应提到重复')
}

// ─────────────────────────────────────────
// Case 6: task id 不连续失败
// ─────────────────────────────────────────
console.log('\n--- Case 6: task id 不连续失败 ---')
{
  const { tasks, plan } = fx(
    ['- [ ] task-01: 第一个', '- [ ] task-03: 跳过了第二个'],
    '## Wave 1\n- task-01\n- task-03\n'
  )
  const result = validatePlanForExecute(tasks, plan)
  assert(!result.ok, 'task id 不连续应失败')
  assert(result.errors.some(e => e.includes('不连续')), '错误应提到不连续')
}

// ─────────────────────────────────────────
// Case 7: 空输入失败
// ─────────────────────────────────────────
console.log('\n--- Case 7: 空输入失败 ---')
{
  const r1 = validatePlanForExecute('', '')
  assert(!r1.ok, '双空应失败')
  const r2 = validatePlanForExecute(null, null)
  assert(!r2.ok, 'null 应失败')
  const r3 = validatePlanForExecute('   ', '   ')
  assert(!r3.ok, '纯空格应失败')
}

// ─────────────────────────────────────────
// Case 8: task name 为空失败（注册表行）
// ─────────────────────────────────────────
console.log('\n--- Case 8: task name 为空失败 ---')
{
  const { tasks, plan } = fx(['- [ ] task-01: '], '## Wave 1\n- task-01\n')
  const result = validatePlanForExecute(tasks, plan)
  assert(!result.ok, 'task name 为空应失败')
  assert(result.errors.some(e => e.includes('任务名为空')), '错误应提到任务名为空')
}

// ─────────────────────────────────────────
// Case 9: 行尾 (文件路径) 尾注解析（原「子行信息」用例的新契约承接）
// ─────────────────────────────────────────
console.log('\n--- Case 9: 注册表行 (文件) 尾注解析 ---')
{
  const { tasks, plan } = fx(['- [ ] task-01: 实现功能 (src/auth.js)'], '## Wave 1\n- task-01\n')
  const result = validatePlanForExecute(tasks, plan)
  assert(result.ok, '带尾注的注册表应校验通过')
  assert(result.tasks[0].file === 'src/auth.js', `task file 应为 src/auth.js（实际 ${result.tasks[0].file}）`)
  assert(result.tasks[0].name === '实现功能', `尾注剥离后 name 干净（实际 "${result.tasks[0].name}"）`)
}

// ─────────────────────────────────────────
// Case 10: 连续 id 从 1 开始（task-02 起始不报断档——兼容口径保留）
// ─────────────────────────────────────────
console.log('\n--- Case 10: task-02 起始不报不连续（兼容） ---')
{
  const { tasks, plan } = fx(
    ['- [ ] task-02: 第二个', '- [ ] task-03: 第三个'],
    '## Wave 1\n- task-02\n- task-03\n'
  )
  const result = validatePlanForExecute(tasks, plan)
  assert(result.ok, `task-02 起始不应报不连续（${result.errors.join('; ')}）`)
}

// ─────────────────────────────────────────
// Case 11: 多 Wave 各自引用
// ─────────────────────────────────────────
console.log('\n--- Case 11: 多 Wave 各自引用 ---')
{
  const { tasks, plan } = fx(
    ['- [ ] task-01: A', '- [ ] task-02: B', '- [ ] task-03: C'],
    '## Wave 1\n- task-01\n\n## Wave 2\n- task-02\n\n## Wave 3\n- task-03\n'
  )
  const result = validatePlanForExecute(tasks, plan)
  assert(result.ok, '多 Wave 应校验通过')
  assert(result.waves.length === 3, '应有 3 个 wave')
  assert(result.waves[0].tasks.length === 1, 'wave 1 应有 1 task')
  assert(result.waves[2].tasks[0].index === 3, 'wave 3 task 应为 task-03')
}

// ─────────────────────────────────────────
// Postcheck 形态回归：合法 none/light/full 通过（新契约双文件）
// ─────────────────────────────────────────
console.log('\n--- Postcheck: 合法三级通过 ---')
{
  const none = fx(['- [ ] task-01: 修复 bug'], '## Wave 1\n- task-01\n')
  const r1 = validatePlanForExecute(none.tasks, none.plan)
  assert(r1.ok && r1.errors.length === 0, 'none 形态应通过且无 errors')

  const light = fx(['- [ ] task-01: API', '- [ ] task-02: 前端'], '## Wave 1\n- task-01\n- task-02\n')
  const r2 = validatePlanForExecute(light.tasks, light.plan)
  assert(r2.ok, 'light 形态应通过')

  const full = fx(['- [ ] task-01: A', '- [ ] task-02: B', '- [ ] task-03: C'],
    '## Wave 1\n- task-01\n## Wave 2\n- task-02\n## Wave 3\n- task-03\n')
  const r3 = validatePlanForExecute(full.tasks, full.plan)
  assert(r3.ok && r3.waves.length === 3, 'full 形态应通过且有 3 wave')
}

// ─────────────────────────────────────────
// Postcheck 形态回归：id 重复 / 断档失败
// ─────────────────────────────────────────
console.log('\n--- Postcheck: id 重复/断档失败 ---')
{
  const dup = fx(['- [ ] task-01: A', '- [ ] task-01: B'], '## Wave 1\n- task-01\n')
  assert(!validatePlanForExecute(dup.tasks, dup.plan).ok, 'id 重复应不通过')

  const gap = fx(['- [ ] task-01: A', '- [ ] task-03: C'], '## Wave 1\n- task-01\n- task-03\n')
  assert(!validatePlanForExecute(gap.tasks, gap.plan).ok, 'id 断档应不通过')
}

// ─────────────────────────────────────────
// Bug C 回归: 「## 自检」段 checkbox 不误解析（新契约下 plan 自检段无引用行即无影响；
// 注册表侧 ql/验收 checkbox 由 task- 前缀锚定天然不收——双保险回归）
// ─────────────────────────────────────────
console.log('\n--- Bug C 回归: 自检段不误解析 ---')
{
  const { tasks, plan } = fx(
    ['- [ ] task-01: 建立 schema', '- [ ] task-02: 接口实现', '- [ ] task-03: 前端对接', '- [ ] task-04: 集成测试', '- [x] 每个 task 有编号(task-01~04),总数 4(≤15)'],
    '## Wave 1\n- task-01\n- task-02\n\n## Wave 2\n- task-03\n- task-04\n\n## 自检\n- [x] 自检文本行（非引用行不收）\n'
  )
  const result = validatePlanForExecute(tasks, plan)
  assert(result.ok, `自检段不误报，errors: ${result.errors.join('; ')}`)
  assert(result.tasks.length === 4, `只收 4 个 task-XX 行，自检 checkbox 行不收（实际 ${result.tasks.length}）`)
  const ids = result.tasks.map(t => t.index).sort((a, b) => a - b)
  assert(JSON.stringify(ids) === JSON.stringify([1, 2, 3, 4]), `task id 应为 1-4，实际 ${ids}`)
}

// ─────────────────────────────────────────
// light plan（plan.md 无任务区，任务全在 tasks.md）→ 隐式单 Wave
// （原「## Tasks 隐式任务区」用例的新契约承接）
// ─────────────────────────────────────────
console.log('\n--- light plan（无 Wave 结构）隐式 Wave 通过 ---')
{
  const tasks = ['# 任务清单（Tasks）', '', '- [ ] task-01: 添加 API 端点（覆盖：FR-01）', '- [ ] task-02: 添加前端调用', '- [ ] task-03: 联调'].join('\n')
  const plan = ['---', 'plan_level: light', '---', '', '# 轻量计划：某需求', '', '## 来源', '直接引用 brainstorm 结论。', '', '## 验收', '- [ ] 所有单元测试通过'].join('\n')
  const result = validatePlanForExecute(tasks, plan)
  assert(result.ok, `light plan 应通过，errors: ${result.errors.join('; ')}`)
  assert(result.tasks.length === 3, `应解析 3 个 task，实际 ${result.tasks.length}`)
  assert(result.waves.length === 1, `应合成 1 个隐式 Wave，实际 ${result.waves.length}`)
  assert(result.waves[0].implicit === true, '隐式 Wave 应标记 implicit: true')
  assert(result.waves[0].tasks[0].index === 1, '首个 task index 应为 1')
}

// ─────────────────────────────────────────
// 旧格式拦：plan.md 任务 checkbox 行 → 指路迁移（原各级模板用例的旧形态反例）
// ─────────────────────────────────────────
console.log('\n--- 旧格式（plan.md checkbox 任务行）被拦 ---')
{
  const legacyPlan = '# Plan\n\n## Wave 1\n- [ ] task-01: 按用户需求完成小范围明确修改\n'
  const legacyTasks = '- [ ] task-01: 按用户需求完成小范围明确修改\n'
  const result = validatePlanForExecute(legacyTasks, legacyPlan)
  assert(!result.ok, 'plan.md 含任务 checkbox 行应被拦（旧格式）')
  assert(result.errors.some(e => e.includes('旧格式')), '错误应指路旧格式迁移')
}

// ─────────────────────────────────────────
// 注册表无 task-XX 行（只有无编号 checkbox）→ 失败
// ─────────────────────────────────────────
console.log('\n--- 注册表无编号行失败 ---')
{
  const tasks = '- [ ] 实现登录功能（无 task id）\n'
  const result = validatePlanForExecute(tasks, '# Plan\n')
  assert(!result.ok, '注册表无 task-XX 编号应失败')
  assert(result.errors.some(e => e.includes('task-XX checkbox')), '错误应提到 task-XX checkbox')
}

// ── 结果 ──
console.log(`\n${'='.repeat(50)}`)
console.log(`✅ 通过: ${total - failed}/${total}  ❌ 失败: ${failed}`)
if (failures.length > 0) {
  console.log(`失败项:`)
  failures.forEach(f => console.log(`  - ${f}`))
}
console.log(`${'='.repeat(50)}`)

if (failed > 0) process.exit(1)
