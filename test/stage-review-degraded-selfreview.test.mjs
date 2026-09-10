// 降级自审 CLI 侧配套（2026-09-10 用户反馈①：PI agent 等宿主环境无 Agent tool，tier=independent
// 硬要求子代理时只能降级自审——stage prompts 已有降级条款，本批补 CLI 侧）：
//   ① isDegradedSelfReview：reviewerNotes 首行「降级：」约定检测（gate 留 ⚠️ 审计行的依据）
//   ② validateStageReview 缺 review.json 报错带降级出口（无 Agent 环境 agent 不再卡死/伪装）
//   ③ renderReviewJsonContract 契约文档化降级约定（事前给的 == 事后查的）
import { mkdtempSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { isDegradedSelfReview, validateStageReview, renderReviewJsonContract } from '../src/stage-review.js'

let total = 0
let failed = 0
function assert(condition, msg) {
  total++
  if (!condition) { failed++; console.log(`  ❌ FAIL: ${msg}`) }
  else console.log(`  ✅ PASS: ${msg}`) }
function assertTrue(cond, msg) { assert(cond, msg) }

console.log('=== ① isDegradedSelfReview（reviewerNotes 首行「降级：」约定）===\n')
{
  assertTrue(isDegradedSelfReview({ reviewerNotes: '降级：环境无子代理可用\n逐条结论附锚点' }) === true, '首行「降级：」→ true（prompt 降级条款约定形态）')
  assertTrue(isDegradedSelfReview({ reviewerNotes: '降级:其他原因' }) === true, '半角冒号「降级:」也认（防全/半角笔误漏检）')
  assertTrue(isDegradedSelfReview({ reviewerNotes: '总体通过。\n降级：环境无子代理可用' }) === false, '「降级」在非首行 → false（只认首行约定）')
  assertTrue(isDegradedSelfReview({ reviewerNotes: '正常子代理审查结论' }) === false, '无标记 → false（真子代理 review 不误报）')
  assertTrue(isDegradedSelfReview({}) === false, '无 reviewerNotes → false')
  assertTrue(isDegradedSelfReview(null) === false, 'review=null（缺失/解析失败）→ false 不抛')
  assertTrue(isDegradedSelfReview({ reviewerNotes: 123 }) === false, 'reviewerNotes 非字符串 → false 不抛')
}

console.log('\n=== ② validateStageReview 缺 review.json 报错带降级出口 ===\n')
{
  const runtimeRoot = join(mkdtempSync(join(tmpdir(), 'sr-degraded-')), '.sillyspec', '.runtime')
  const r = validateStageReview({ stage: 'plan', reviewType: 'plan', runtimeRoot, reviewRunId: 'review-20990101-0000', searchDirs: [] })
  assertTrue(r.ok === false, '缺 review.json → 不通过（fail-closed 不变）')
  assertTrue(r.errors.some(e => e.includes('宿主环境无 Agent tool（如 PI agent）时按 prompt 降级条款由当前 agent 自审产出')), '报错带降级出口指引（无 Agent 环境 agent 不再卡死/伪装）')
  assertTrue(r.errors.some(e => e.includes('「降级：环境无子代理可用」')), '指引点名 reviewerNotes 首行标记约定')
}

console.log('\n=== ③ renderReviewJsonContract 契约文档化降级约定 ===\n')
{
  const md = renderReviewJsonContract({ stage: 'plan', changeDir: '/tmp/x/.sillyspec/changes/demo', reviewRunId: 'review-20990101-0000', tier: 'independent' })
  assertTrue(md.includes('降级：环境无子代理可用'), '契约含降级标记约定（事前给的 == 事后查的）')
  assertTrue(md.includes('gate 放行但留 ⚠️ 审计行'), '契约说明 gate 留痕行为（勿伪装子代理审查）')
  const selfMd = renderReviewJsonContract({ stage: 'plan', tier: 'self' })
  assertTrue(selfMd.length > 0 && !selfMd.includes('降级：环境无子代理可用'), 'tier=self 短提示不展开降级契约（自审本就无需降级）')
}

console.log(`\n${'='.repeat(50)}`)
console.log(`✅ 通过: ${total - failed}  ❌ 失败: ${failed}`)
console.log('='.repeat(50))
if (failed > 0) process.exit(1)
