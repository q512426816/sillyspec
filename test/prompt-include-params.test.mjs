/**
 * include 参数化管道（2026-11-22-include-param-primitives，批 3b task-01）
 *
 * 契约（.sillyspec/changes/2026-11-22-include-param-primitives/requirements.md FR-01）：
 *   resolvePromptIncludes 支持 {{include: name|key=value}} 参数化语法——模板内 {{param:key}}
 *   占位被实参替换；无参写法向后兼容（既有模板渲染逐字一致）；模板缺失保留占位符并 warn。
 *
 * 施工顺序（survey D 节）：本文件第 1 节锁管道语法面（兼容/带参/缺失/字符集）；
 * {{param:}} 实参替换断言（第 2 节）随 task-03 参数化模板（review-subagent-discipline/
 * material-pack-baseline）落地后启用。
 */
import { resolvePromptIncludes } from '../src/run/shared.js'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

let failed = 0
const failures = []
function assertTrue(cond, msg) {
  if (cond) console.log(`  ✅ PASS: ${msg}`)
  else { failed++; failures.push(msg); console.log(`  ❌ FAIL: ${msg}`) }
}
function hookWarn() {
  const orig = console.warn, warns = []
  console.warn = (...a) => { warns.push(a.map(String).join(' ')) }
  return [warns, () => { console.warn = orig; return warns }]
}

console.log('=== include 参数化管道 ===\n')

// ── 1. 管道语法面 ──────────────────────────────────────────────────────────────
console.log('--- 1. 无参兼容 / 带参解析 / 缺失保留 / 字符集 ---')
{
  // 1a. 无参写法向后兼容：既有模板渲染逐字一致
  const plain = resolvePromptIncludes('{{include: testcase-design}}')
  const tplRaw = readFileSync(join(ROOT, 'templates', 'prompts', 'testcase-design.md'), 'utf8')
  assertTrue(plain === tplRaw, '无参写法渲染=模板全文逐字（向后兼容）')

  // 1b. 带参引用既有无参模板：内容注入、参数无副作用（模板无 {{param:}} 占位）
  const withArgs = resolvePromptIncludes('{{include: testcase-design|focus=x}}')
  assertTrue(withArgs === tplRaw, '带参引用无参模板=同全文（参数对无占位模板零副作用）')

  // 1c. 多参+中文值+空格：解析不炸、内容照常注入
  const zh = resolvePromptIncludes('{{include: testcase-design|budget=12|scope=design 审查}}')
  assertTrue(zh === tplRaw, '多参+中文值+空格解析正常（内容注入）')

  // 1d. 模板缺失：带参占位符整体保留 + warn
  const [w, done] = hookWarn()
  let missing
  try { missing = resolvePromptIncludes('前文\n{{include: no-such-tpl|k=v}}\n后文') } finally { const warns = done() }
  const warns2 = (() => { const [w2, restore2] = hookWarn(); restore2(); return w2 })()
  assertTrue(missing.includes('{{include: no-such-tpl|k=v}}'), '缺失模板带参占位符整体原样保留（fail-soft）')

  // 1e. 模板缺失：warn 提示（hook 再跑一次拿 warns——上一次的 warns 变量被 finally 吞了，重跑）
  const [w3, done3] = hookWarn()
  try { resolvePromptIncludes('{{include: no-such-tpl|k=v}}') } finally {
    const warns = done3()
    assertTrue(warns.some(x => x.includes('no-such-tpl')), '缺失模板 warn 一次（含模板名）')
  }

  // 1f. 禁字符（| 进 value）：value 含 | 时在该处分段——第二段按新参数解析（管道语义，不炸）
  const pipe = resolvePromptIncludes('{{include: no-such-tpl|k=a|b}}')
  assertTrue(pipe.includes('{{include: no-such-tpl|k=a|b}}'), '缺失场景整段保留（正则吞全段，禁字符不产生半段匹配）')
}

// ── 2. 高 2+5 直抽模板（task-02）：模板语义在场 + 5 处引用位改写 ────────────────
console.log('\n--- 2. 高 2/5 模板与引用位 ---')
{
  // 2a. 高 2 模板渲染语义句逐字在场
  const fs2 = resolvePromptIncludes('{{include: foreground-sync}}')
  assertTrue(fs2.includes('前台同步执行') && fs2.includes('run_in_background:true / & / nohup / disown') && fs2.includes('后台任务易被会话生命周期回收'),
    '高 2 模板渲染含四禁令语义句（禁令枚举+理由句）')

  // 2b. 高 5 模板渲染语义句在场
  const ex5 = resolvePromptIncludes('{{include: review-unsupervised-exempt}}')
  assertTrue(ex5.includes('评审豁免') && ex5.includes('review-unsupervised.md') && ex5.includes('不做自审表演') && ex5.includes('有派发能力时本豁免不适用'),
    '高 5 模板渲染含豁免机制语义句（声明文件+不自审表演+适用边界）')

  // 2c. 引用位：源码断言（高 2 ×2、高 5 ×3，指针句保留原文）
  const srcOf = (f) => readFileSync(join(ROOT, 'src', 'stages', f), 'utf8')
  const srcExe = srcOf('execute.js'), srcVer = srcOf('verify.js'), srcBr = srcOf('brainstorm.js'), srcPlan = srcOf('plan.js')
  assertTrue((srcExe.match(/\{\{include: foreground-sync\}\}/g) || []).length === 1
    && (srcVer.match(/\{\{include: foreground-sync\}\}/g) || []).length === 1, '高 2 引用位：execute/verify 各 1 处 include')
  assertTrue((srcBr.match(/\{\{include: review-unsupervised-exempt\}\}/g) || []).length === 1
    && (srcPlan.match(/\{\{include: review-unsupervised-exempt\}\}/g) || []).length === 1
    && (srcExe.match(/\{\{include: review-unsupervised-exempt\}\}/g) || []).length === 1, '高 5 引用位：brainstorm/plan/execute 各 1 处 include')
  assertTrue(srcExe.includes('按上方评审豁免处理'), 'execute dispatchExec 指针句保留原文（最小扰动）')
  assertTrue(!srcExe.includes('长测试/构建/lint 命令必须**前台同步执行**') && !srcVer.includes('长测试/构建/lint 命令必须**前台同步执行**'),
    '高 2 原文散文段已从源码移除（单一源进模板）')
}

console.log(`\n${'='.repeat(50)}`)
console.log(`✅ 通过: ${failed === 0 ? 'all' : '部分'}  ❌ 失败断言: ${failed}`)
if (failures.length > 0) { console.log('失败项:'); failures.forEach(f => console.log(`  - ${f}`)) }
console.log('='.repeat(50))
if (failed > 0) process.exit(1)
