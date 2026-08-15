// Wave 编号带字母后缀（如 "## Wave 2b"）的显式报错测试。
//
// 修复的坑：解析正则 ^#+\s*Wave\s+(\d+) 不锚定结尾，"Wave 2b" 被 parseInt 截断成
// Wave 2 静默收容，与显式 Wave 2 合并为同一 Wave 强制并行——串行意图静默失效，
// 无任何提示，排查到 CLI 源码才明白根因。修复后 validatePlanForExecute 显式报错。
//
// 覆盖：
// 1. Wave 2b（独立或跟在 Wave 2 后）→ 报字母后缀错误，说明截断合并风险 + 解法
// 2. 正常 Wave 1 / 两位数 Wave 10 → 不误报（回归）
// 3. 原 4 条诊断分支回归：W1/Wave1/波次1 格式不对、无 Wave 缺任务区、### task 标题、正常收容
import { validatePlanForExecute } from '../src/stages/execute.js'

let failed = 0
const assert = (c, m) => {
  if (c) console.log('  ✅ ' + m)
  else { console.error('  ❌ ' + m); failed++ }
}

const wrap = (body) => `# Plan\n\n${body}`

console.log('\n[plan-diagnose-wave] Wave 字母后缀（2b）显式报错 + 原诊断回归')

// ─────────────────────────────────────────
console.log('\n--- 1. Wave 2b 报字母后缀错误 ---')
{
  const r = validatePlanForExecute(wrap('## Wave 2\n\n- [ ] task-01: a\n\n## Wave 2b（扩展）\n\n- [ ] task-02: b\n'))
  assert(r.ok === false, 'Wave 2b → ok=false')
  const errLine = r.errors.find(e => e.includes('字母后缀'))
  assert(!!errLine, '报「字母后缀」错误')
  assert(errLine && errLine.includes('Wave 2b'), '错误指向具体标题（Wave 2b）')
  assert(errLine && errLine.includes('截断'), '错误说明截断合并风险')
}
{
  // 仅 Wave 2b 单独存在（无显式 Wave 2）同样报
  const r2 = validatePlanForExecute(wrap('## Wave 2b（扩展）\n\n- [ ] task-02: b\n'))
  assert(r2.ok === false && r2.errors.some(e => e.includes('字母后缀')), '仅 Wave 2b（无显式 Wave 2）同样报错')
}

// ─────────────────────────────────────────
console.log('\n--- 2. 正常编号不误报（回归） ---')
{
  const r = validatePlanForExecute(wrap('## Wave 1（并行）\n\n- [ ] task-01: a\n\n## Wave 2（依赖）\n\n- [ ] task-02: b\n'))
  assert(r.ok === true && r.errors.length === 0, 'Wave 1/2 正常')
  const r10 = validatePlanForExecute(wrap('## Wave 10\n\n- [ ] task-01: a\n'))
  assert(r10.errors.length === 0, '两位数 Wave 10 不误报')
}

// ─────────────────────────────────────────
console.log('\n--- 3. 原 4 条诊断分支回归 ---')
{
  for (const h of ['## W1（并行）', '## Wave1（并行）', '## 波次1（并行）']) {
    const r = validatePlanForExecute(wrap(`${h}\n\n- [ ] task-01: 某任务\n`))
    assert(r.ok === false && r.errors.some(e => e.includes('Wave 标题格式不对')), `${h} 仍报「标题格式不对」`)
  }
  const rNoWave = validatePlanForExecute(wrap('## 概述\n\n做点事\n'))
  assert(rNoWave.errors.some(e => e.includes('缺任务区')), '无 Wave 仍报「缺任务区」')
  const rHeading = validatePlanForExecute(wrap('## Wave 1\n\n### task-01: 某任务\n'))
  assert(rHeading.errors.some(e => e.includes('### task-XX') || e.includes('标题')), '### task 标题仍报打断提示')
  const rNormal = validatePlanForExecute(wrap('## Wave 1（并行）\n\n- [ ] task-01: 某任务\n'))
  assert(rNormal.ok === true && rNormal.errors.length === 0, '正常 Wave 1 + task-01 收容成功')
}

if (failed > 0) {
  console.error(`\n[plan-diagnose-wave] ❌ ${failed} 项失败`)
  process.exit(1)
}
console.log('\n[plan-diagnose-wave] ✅ 全部通过')
