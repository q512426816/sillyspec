/**
 * execute「加载上下文」步符号影响面报告结构校验 单元测试（ql-20260816-005-3d7f）。
 *
 * 治 persuasion-only 失效现场：execute 前缀步（进度确认/加载上下文/确认 worktree/确认执行范围）
 * 无任何 gate，agent 可 <1s 连发 4 次 --done 盖章跳过——「符号影响面扫描」(execute.js 操作 11)
 * 的实质产出被一句「上下文在会话内」带过。修法 = 报告落盘 symbol-impact.md + CLI 结构校验：
 * 文件存在 + plan.md 每个 task-XX 在报告中出现（逐 task 结论，含「无影响」也要显式写）。
 * 语义质量（调用点找没找全）仍归 agent，CLI 只核结构覆盖度。
 *
 * 测两件事：
 *   1. 纯函数 validateSymbolImpactReport（task 覆盖度校验核心，gates.js 导出）
 *   2. gate 集成语义：enforceSymbolImpactGate 非目标步骤/非 execute 直接放行
 */
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { validateSymbolImpactReport, enforceSymbolImpactGate } from '../src/run/gates.js'

let total = 0, failed = 0
function assert(cond, msg) {
  total++
  if (!cond) { failed++; console.log(`  ❌ FAIL: ${msg}`) }
  else console.log(`  ✅ PASS: ${msg}`)
}

console.log('=== execute 加载上下文步：符号影响面报告结构校验 ===\n')

const PLAN_FULL = `## Wave 1
- [ ] task-01: 甲 (src/a.js)
- [ ] task-02: 乙 (src/b.js)
## Wave 2
- [x] task-03: 丙 (src/c.js)
`

// ── 1. 报告缺失 / 文件不存在 ──
{
  const r = validateSymbolImpactReport({ reportContent: null, planContent: PLAN_FULL })
  assert(r.ok === false, '报告内容为空 → 不通过')
  assert(r.errors.length === 1 && /symbol-impact/.test(r.errors[0]), '缺失时报错提到 symbol-impact')
}
{
  const r = validateSymbolImpactReport({ reportContent: '', planContent: PLAN_FULL })
  assert(r.ok === false, '报告内容空串 → 不通过')
}

// ── 2. 覆盖度：plan 每 task 必须在报告中出现 ──
{
  const r = validateSymbolImpactReport({
    reportContent: `- task-01: 无签名级变更（内部实现调整）
- task-02: \`Foo\` 构造函数新增参数 \`opts\`；调用点 src/main.js:12 在 task-02 allowed_paths 内`,
    planContent: PLAN_FULL,
  })
  assert(r.ok === false, '缺 task-03 → 不通过（覆盖度硬校验）')
  assert(r.errors.some(e => e.includes('task-03')), '错误列出缺失的 task-03')
}
{
  const r = validateSymbolImpactReport({
    reportContent: `- task-01: 无签名级变更
- task-02: \`Foo\` 构造函数新增参数；调用点已核对
- task-03: 无签名级变更（已勾选 [x] 仍需覆盖）`,
    planContent: PLAN_FULL,
  })
  assert(r.ok === true, `全覆盖（含已勾选 task）→ 通过（actual errors: ${JSON.stringify(r.errors)}）`)
}

// ── 3. light plan（无 Wave 标题，## Tasks 段）同样校验 ──
{
  const PLAN_LIGHT = `## Tasks
- [ ] task-01: 甲
- [ ] task-02: 乙
`
  const r = validateSymbolImpactReport({
    reportContent: `- task-01: 无签名级变更`,
    planContent: PLAN_LIGHT,
  })
  assert(r.ok === false, 'light plan（## Tasks）缺 task-02 → 不通过')
  assert(r.errors.some(e => e.includes('task-02')), 'light plan 错误列出缺失的 task-02')
  const r2 = validateSymbolImpactReport({
    reportContent: `- task-01: 无签名级变更
- task-02: \`bar()\` 签名变更，调用点已核对`,
    planContent: PLAN_LIGHT,
  })
  assert(r2.ok === true, 'light plan 全覆盖 → 通过')
}

// ── 4. 无 task plan（默认 3 Wave 兜底形态）→ 校验跳过（plan 无 task 可列时不硬卡）──
{
  const r = validateSymbolImpactReport({ reportContent: '无 task plan', planContent: '# 只有标题\n无任务区' })
  assert(r.ok === true, 'plan 无 checkbox task → 放行（无可校验对象）')
  assert((r.errors || []).length === 0, 'plan 无 task → errors 空')
}

// ── 5. 报告有冗余 task（不在 plan 中）→ 不算错（宽松：只查覆盖缺失，不查多余）──
{
  const r = validateSymbolImpactReport({
    reportContent: `- task-01: 无签名级变更
- task-02: \`Foo\` 构造函数新增参数
- task-99: 历史遗留描述`,
    planContent: PLAN_FULL,
  })
  assert(r.ok === false, '冗余 task-99 不算错，但缺 task-03 仍不通过')
  assert(r.errors.some(e => e.includes('task-03')), '错误仍只列 plan 中缺失的 task-03')
}

// ── 6. gate 集成语义：非目标步骤 / 非 execute 阶段 → 直接放行（不校验不 exit）──
{
  const rr = mkdtempSync(join(tmpdir(), 'sig-scope-'))
  const changeDir = join(rr, 'changes', 'demo')
  mkdirSync(changeDir, { recursive: true })
  writeFileSync(join(changeDir, 'plan.md'), PLAN_FULL)
  let exited = 0
  const origExit = process.exit
  process.exit = (code) => { exited = code; throw new Error(`exit-${code}`) }
  try {
    await enforceSymbolImpactGate('verify', 'demo', '加载上下文', rr)
    assert(exited === 0, '非 execute 阶段 → 放行')
    await enforceSymbolImpactGate('execute', 'demo', 'Wave 1 执行', rr)
    assert(exited === 0, 'execute 非「加载上下文」步 → 放行（Wave 步不触发报告门）')
    await enforceSymbolImpactGate('execute', 'ghost-change', '加载上下文', rr)
    assert(exited === 0, 'plan.md 不存在的 change → 放行（plan 缺失归 plan 阶段 gate 把关）')
  } finally {
    process.exit = origExit
  }

  // 目标步骤 + 报告缺失 → exit 1 阻断
  let blockedCode = 0
  process.exit = (code) => { blockedCode = code; throw new Error(`exit-${code}`) }
  try {
    await enforceSymbolImpactGate('execute', 'demo', '加载上下文', rr)
  } catch { /* 预期 throw */ }
  process.exit = origExit
  assert(blockedCode === 1, '「加载上下文」步 + symbol-impact.md 缺失 → exit 1 阻断')

  // 补全报告 → 放行
  writeFileSync(join(changeDir, 'symbol-impact.md'), '- task-01: 无签名级变更\n- task-02: 无签名级变更\n- task-03: 无签名级变更\n')
  let okExit = 0
  process.exit = (code) => { okExit = code; throw new Error(`exit-${code}`) }
  try {
    await enforceSymbolImpactGate('execute', 'demo', '加载上下文', rr)
    assert(okExit === 0, '报告全覆盖 → 放行（无 exit）')
  } finally {
    process.exit = origExit
  }
}

console.log(`\n合计: ${total} 断言, ${failed} 失败`)
process.exit(failed > 0 ? 1 : 0)
