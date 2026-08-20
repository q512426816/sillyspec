/**
 * 任务清单单一真相契约测试（2026-08-20-task-truth-unify D-001@v1/D-003@v1）
 *
 * 新契约：tasks.md = 唯一 checkbox 注册表（`- [ ] task-XX: 名称 [model:xxx] (depends_on: …)`，
 * ql-xxx 等 quick 挂载行正交不收）；plan.md Wave 段 = 纯 ID 引用行（`- task-XX`）。
 * validatePlanForExecute(tasksContent, planContent) 交叉校验。
 *
 * 锁定语义（九类）：
 *   1. 合法新格式通过（注册表 × Wave 引用对账齐，waves 富化自注册表）
 *   2. plan.md 引用悬空 → 拦 + 点名
 *   3. Wave 覆盖缺失 → 拦
 *   4. 覆盖重复（一任务多 Wave）→ 拦
 *   5. 编号断档 → 拦
 *   6. 旧格式（plan.md 含任务名 checkbox 行）→ 拦 + 指路迁移
 *   7. 注册表为空 → 三类根因诊断（旧格式 / tasks.md 空 / 只有 ql-xxx 行）
 *   8. parseTaskRegistry 标注解析（done/model/depends_on/(文件) 尾注；ql 行不收）
 *   9. light 级（plan.md 无 Wave 结构）→ 隐式单 Wave 收容全部注册表任务，通过
 */
import { validatePlanForExecute, parseTaskRegistry } from '../src/stages/execute.js'

let passed = 0, failed = 0
const failures = []
function assert(cond, msg) {
  if (cond) { passed++; console.log(`  ✅ PASS: ${msg}`) }
  else { failed++; failures.push(msg); console.log(`  ❌ FAIL: ${msg}`) }
}

const REG = [
  '# 任务清单（Tasks）— 测试变更',
  '',
  '- [ ] task-01: 添加用户创建接口',
  '- [ ] task-02: 添加角色创建接口 [model:pro]',
  '- [x] task-03: 联调 (depends_on: task-01,02)',
  '- [ ] ql-20260820-001-abcd: quick 挂载条目（正交，不进注册表）',
  '- [x] ql-20260819-002-ef01: 已勾 quick 条目',
].join('\n')

const PLAN = [
  '---',
  'plan_level: full',
  '---',
  '# 实现计划 — 测试变更',
  '',
  '## Wave 1（并行）',
  '- task-01',
  '- task-02',
  '',
  '## Wave 2（依赖 Wave 1）',
  '- task-03',
  '',
  '## 任务总表',
  '| 编号 | 任务 | Wave |',
  '|---|---|---|',
  '| task-01 | 添加用户创建接口 | W1 |',
].join('\n')

console.log('=== 任务清单单一真相契约（2026-08-20-task-truth-unify）===\n')

console.log('--- ① 合法新格式通过 ---')
{
  const r = validatePlanForExecute(REG, PLAN)
  assert(r.ok, `合法格式 ok（errors: ${r.errors.join(' | ')}）`)
  assert(r.tasks.length === 3, `注册表 3 任务（实际 ${r.tasks.length}）`)
  assert(r.tasks.every(t => t.name && t.id), '任务对象富化自注册表（id+name）')
  assert(r.waves.length === 2 && r.waves[0].tasks.length === 2 && r.waves[1].tasks.length === 1, 'Wave 引用行分组正确')
  assert(r.waves[1].tasks[0].done === true, '勾选态来自注册表（task-03 done）')
}

console.log('\n--- ② 引用悬空 → 拦 + 点名 ---')
{
  const plan = PLAN.replace('- task-02', '- task-99')
  const r = validatePlanForExecute(REG, plan)
  assert(!r.ok, '悬空引用被拦')
  assert(r.errors.some(e => e.includes('task-99') && e.includes('悬空')), `错误点名悬空 ID（${r.errors[0]?.slice(0, 50)}…）`)
}

console.log('\n--- ③ Wave 覆盖缺失 → 拦 ---')
{
  const plan = PLAN.replace('- task-02\n', '')
  const r = validatePlanForExecute(REG, plan)
  assert(!r.ok, '注册表任务未被任何 Wave 引用被拦')
  assert(r.errors.some(e => e.includes('task-02') && e.includes('未被任何 Wave')), `错误点名未覆盖任务（${r.errors.find(e => e.includes('task-02'))?.slice(0, 50)}…）`)
}

console.log('\n--- ④ 覆盖重复（一任务多 Wave）→ 拦 ---')
{
  const plan = PLAN.replace('## Wave 2（依赖 Wave 1）', '## Wave 2（依赖 Wave 1）\n- task-01')
  const r = validatePlanForExecute(REG, plan)
  assert(!r.ok, '一任务多 Wave 被拦')
  assert(r.errors.some(e => e.includes('task-01') && e.includes('重复引用')), `错误点名重复覆盖（${r.errors.find(e => e.includes('重复'))?.slice(0, 50)}…）`)
}

console.log('\n--- ⑤ 编号断档 → 拦 ---')
{
  const reg = REG.replace('- [ ] task-02: 添加角色创建接口 [model:pro]\n', '')
    .replace('- task-02', '- task-03') // Wave1 引用 task-01/03，注册表 01/03
  const plan = PLAN.replace('- task-02', '- task-03').replace('## Wave 2（依赖 Wave 1）\n- task-03', '## Wave 2（依赖 Wave 1）')
  const r = validatePlanForExecute(reg, plan)
  assert(!r.ok, '编号断档（01→03）被拦')
  assert(r.errors.some(e => e.includes('不连续') || e.includes('task-02')), '错误含连续性提示')
}

console.log('\n--- ⑥ 旧格式（plan.md 含任务名 checkbox 行）→ 拦 + 指路 ---')
{
  const legacyPlan = PLAN.replace('- task-01', '- [ ] task-01: 添加用户创建接口（旧格式）')
  const r = validatePlanForExecute(REG, legacyPlan)
  assert(!r.ok, 'plan.md 任务 checkbox 旧格式被拦')
  assert(r.errors.some(e => e.includes('旧格式')), '错误指路「旧格式」')
  assert(r.errors.some(e => e.includes('tasks.md')), '出路指向 tasks.md')
}

console.log('\n--- ⑦ 注册表为空 → 三类根因诊断 ---')
{
  const r1 = validatePlanForExecute('', PLAN)
  assert(!r1.ok && r1.errors.some(e => e.includes('注册表为空')), '空 tasks.md 报注册表为空')
  assert(r1.errors.some(e => e.includes('tasks.md 内容为空')), '诊断 A：tasks.md 空/缺失')

  const r2 = validatePlanForExecute('- [ ] ql-20260820-001-abcd: 只有 quick 条目\n', PLAN)
  assert(r2.errors.some(e => e.includes('ql-xxx') || e.includes('quick 挂载')), '诊断 B：只有 ql-xxx 行')

  const r3 = validatePlanForExecute('', '## Wave 1\n- [ ] task-01: 旧格式的任务行\n')
  assert(r3.errors.some(e => e.includes('旧格式')), '诊断 C：任务 checkbox 还在 plan.md（旧格式指路）')
}

console.log('\n--- ⑧ parseTaskRegistry 标注解析 ---')
{
  const reg = parseTaskRegistry(REG)
  assert(reg.length === 3, `ql 行不收（实际 ${reg.length}）`)
  const t2 = reg.find(t => t.id === 'task-02')
  assert(t2?.model === 'pro', `[model:xxx] 解析（实际 ${t2?.model}）`)
  const t3 = reg.find(t => t.id === 'task-03')
  assert(t3?.done === true, '勾选态 [x] 解析')
  assert(JSON.stringify(t3?.dependsOn) === JSON.stringify(['task-01', 'task-02']), `(depends_on:) 解析（实际 ${JSON.stringify(t3?.dependsOn)}）`)
  assert(t3?.name === '联调', `标注剥离后任务名干净（实际 "${t3?.name}"）`)
}

console.log('\n--- ⑨ light 级（无 Wave 结构）→ 隐式单 Wave 收容 ---')
{
  const lightPlan = ['---', 'plan_level: light', '---', '# 轻量计划', '', '## 验收', '- 测试通过'].join('\n')
  const r = validatePlanForExecute(REG, lightPlan)
  assert(r.ok, `light 级通过（errors: ${r.errors.join(' | ')}）`)
  assert(r.waves.length === 1 && r.waves[0].implicit === true && r.waves[0].tasks.length === 3, '注册表合成为单隐式 Wave（全部任务）')
}

console.log('\n' + '='.repeat(50))
console.log(`✅ 通过: ${passed}  ❌ 失败: ${failed}`)
if (failures.length) console.log(`失败项: ${failures.join('; ')}`)
console.log('='.repeat(50))
if (failed > 0) process.exit(1)
