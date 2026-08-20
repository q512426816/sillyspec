// Wave 编号带字母后缀（如 "## Wave 2b"）的显式报错测试 + 注册表空三类根因诊断回归。
//
// 修复的坑：解析正则 ^#+\s*Wave\s+(\d+) 不锚定结尾，"Wave 2b" 被 parseInt 截断成
// Wave 2 静默收容，与显式 Wave 2 合并为同一 Wave 强制并行——串行意图静默失效，
// 无任何提示，排查到 CLI 源码才明白根因。修复后 validatePlanForExecute 显式报错。
//
// 2026-08-20-task-truth-unify 适配：任务清单源迁 tasks.md（双文件签名），原「plan.md
// 4 条格式诊断分支」（W1/Wave1/波次1 标题、缺任务区、### task 标题）由新三类根因
// （tasks.md 空 / 只有 ql-xxx / 旧格式残留）+ Wave 引用收容失败（未覆盖报错）承接。
import { validatePlanForExecute } from '../src/stages/execute.js'

let failed = 0
const assert = (c, m) => {
  if (c) console.log('  ✅ ' + m)
  else { console.error('  ❌ ' + m); failed++ }
}

const wrap = (body) => `# Plan\n\n${body}`
const REG2 = '- [ ] task-01: a\n- [ ] task-02: b'

console.log('\n[plan-diagnose-wave] Wave 字母后缀（2b）显式报错 + 新三类根因回归')

// ─────────────────────────────────────────
console.log('\n--- 1. Wave 2b 报字母后缀错误 ---')
{
  const r = validatePlanForExecute(REG2, wrap('## Wave 2\n\n- task-01\n\n## Wave 2b（扩展）\n\n- task-02\n'))
  assert(r.ok === false, 'Wave 2b → ok=false')
  const errLine = r.errors.find(e => e.includes('字母后缀'))
  assert(!!errLine, '报「字母后缀」错误')
  assert(errLine && errLine.includes('Wave 2b'), '错误指向具体标题（Wave 2b）')
  assert(errLine && errLine.includes('截断'), '错误说明截断合并风险')
}
{
  // 仅 Wave 2b 单独存在（无显式 Wave 2）同样报
  const r2 = validatePlanForExecute('- [ ] task-02: b', wrap('## Wave 2b（扩展）\n\n- task-02\n'))
  assert(r2.ok === false && r2.errors.some(e => e.includes('字母后缀')), '仅 Wave 2b（无显式 Wave 2）同样报错')
}

// ─────────────────────────────────────────
console.log('\n--- 2. 正常编号不误报（回归） ---')
{
  const r = validatePlanForExecute(REG2, wrap('## Wave 1（并行）\n\n- task-01\n\n## Wave 2（依赖）\n\n- task-02\n'))
  assert(r.ok === true && r.errors.length === 0, 'Wave 1/2 正常')
  const r10 = validatePlanForExecute('- [ ] task-01: a', wrap('## Wave 10\n\n- task-01\n'))
  assert(r10.errors.length === 0, '两位数 Wave 10 不误报')
}

// ─────────────────────────────────────────
console.log('\n--- 3. 注册表空三类根因诊断（新契约） ---')
{
  // 诊断 A：tasks.md 空/缺失
  const rA = validatePlanForExecute('', wrap('## Wave 1\n\n- task-01\n'))
  assert(rA.ok === false && rA.errors.some(e => e.includes('tasks.md 内容为空')), 'tasks.md 空 → 诊断 A')

  // 诊断 B：只有 ql-xxx 行
  const rB = validatePlanForExecute('- [ ] ql-20260820-001-abcd: quick 条目\n', wrap('## Wave 1\n\n- task-01\n'))
  assert(rB.errors.some(e => e.includes('ql-xxx')), '只有 ql-xxx 行 → 诊断 B')

  // 诊断 C：旧格式（任务 checkbox 还在 plan.md）
  const rC = validatePlanForExecute('', wrap('## Wave 1\n\n- [ ] task-01: 旧格式的任务行\n'))
  assert(rC.errors.some(e => e.includes('旧格式')), 'plan.md checkbox → 诊断 C（旧格式指路）')
}

// ─────────────────────────────────────────
console.log('\n--- 4. Wave 标题格式不对 → 显式报错（原「标题格式不对/缺任务区」承接） ---')
{
  for (const h of ['## W1（并行）', '## Wave1（并行）', '## 波次1（并行）']) {
    const r = validatePlanForExecute(REG2, wrap(`${h}\n\n- task-01\n- task-02\n`))
    assert(r.ok === false && r.errors.some(e => e.includes('Wave 标题格式不对')), `${h} 报「标题格式不对」（引用行不收容）`)
  }
  // 正常收容回归
  const rNormal = validatePlanForExecute(REG2, wrap('## Wave 1（并行）\n\n- task-01\n- task-02\n'))
  assert(rNormal.ok === true && rNormal.errors.length === 0, '正常 Wave 1 引用行收容成功')
}

if (failed > 0) {
  console.error(`\n[plan-diagnose-wave] ❌ ${failed} 项失败`)
  process.exit(1)
}
console.log('\n[plan-diagnose-wave] ✅ 全部通过')
