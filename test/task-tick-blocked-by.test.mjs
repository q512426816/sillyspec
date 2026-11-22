/**
 * tasks.md 阻塞标注（2026-11-22-tasks-blocked-by）
 *
 * 来源：mattpocock 链路实测（5 票带阻塞边并行的 frontier 加派节奏）——to-tickets/implement-spec
 * 阻塞边思想的轻量形态：行尾可选 [blocked-by: task-MM/task-KK] 标注，tickTasksMd 纯函数
 * 识别（软门警告 + frontier 下一任务指针），无标注路径零变化。
 *
 * 接缝：tickTasksMd 纯函数（collectRows 非导出，经 next.desc/blockedWarning 间接断言）。
 */
import { tickTasksMd } from '../src/task-tick.js'

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

console.log('=== tasks.md 阻塞标注（blocked-by）===\n')

// ── 1. 标注解析：desc 剥出 + blockedBy 生效（经 next/警告间接断言）──
console.log('--- 1. 标注解析 ---')
{
  const md = [
    '# Tasks', '',
    '- [ ] task-01: 前置任务', '',
    '- [ ] task-02: 后续任务 [blocked-by: task-01]', '',
  ].join('\n')
  // tick 前置（task-01）→ 解锁后的 task-02 应成 next 且 desc 已剥出标注
  const r1 = tickTasksMd({ tasksMd: md, taskId: 'task-01' })
  assertTrue(r1.kind === 'ticked', '翻格 task-01 成功')
  assertTrue(r1.next && r1.next.id === 'task-02', `next=task-02（实际 ${r1.next && r1.next.id}）`)
  assertTrue(r1.next.desc === '后续任务', `desc 剥出标注（实际「${r1.next && r1.next.desc}」）`)

  // 多值斜杠 + 裸数字归一：task-03 blocked-by 01/task-02（裸数字 01 归一命中已勾的 task-01
  // 而被排除、未勾的 task-02 列出——归一失败时 01 不匹配 task-01 会两者都列）
  const md2 = [
    '- [x] task-01: A',
    '- [ ] task-02: B',
    '- [ ] task-03: C [blocked-by: 01/task-02]',
  ].join('\n')
  const [w, done] = hookWarn()
  let r2
  try { r2 = tickTasksMd({ tasksMd: md2, taskId: 'task-03' }) } finally { done() }
  assertTrue(r2.blockedWarning && r2.blockedWarning.includes('task-02') && !r2.blockedWarning.includes('task-01'),
    `多值+裸数字归一：已勾的 01 归一后排除、未勾的 task-02 列出（实际 ${r2.blockedWarning}）`)
  assertTrue(r2.kind === 'ticked', '被阻塞翻格照常执行（软门不阻断）')
}

// ── 2. 软门警告：阻塞 warn / 解锁零 warn ──
console.log('\n--- 2. 软门警告 ---')
{
  const md = [
    '- [ ] task-01: A',
    '- [ ] task-02: B [blocked-by: task-01]',
  ].join('\n')
  const r = tickTasksMd({ tasksMd: md, taskId: 'task-02' })
  assertTrue(r.kind === 'ticked' && r.blockedWarning && r.blockedWarning.includes('task-01'),
    `前置未勾：ticked + blockedWarning 含 task-01（实际 ${r.blockedWarning}）`)

  const md2 = [
    '- [x] task-01: A',
    '- [ ] task-02: B [blocked-by: task-01]',
  ].join('\n')
  const r2 = tickTasksMd({ tasksMd: md2, taskId: 'task-02' })
  assertTrue(r2.kind === 'ticked' && r2.blockedWarning === null, `前置已勾：零警告（实际 ${r2.blockedWarning}）`)
}

// ── 3. frontier 下一任务指针：跳过被阻塞 / 全阻塞回退 / 无标注现状一致 ──
console.log('\n--- 3. frontier 指针 ---')
{
  // 3a. task-01 已勾、task-02 blocked-by task-03（未勾）、task-03 无标注 → next=task-03
  const md = [
    '- [x] task-01: A',
    '- [ ] task-02: B [blocked-by: task-03]',
    '- [ ] task-03: C',
  ].join('\n')
  const r = tickTasksMd({ tasksMd: md, taskId: 'task-03' })
  // 全勾后 next=null——改用不触发全勾的形态：只勾 task-01 场景
  const mdA = [
    '- [ ] task-01: A',
    '- [ ] task-02: B [blocked-by: task-03]',
    '- [ ] task-03: C',
  ].join('\n')
  const rA = tickTasksMd({ tasksMd: mdA, taskId: 'task-01' })
  assertTrue(rA.next && rA.next.id === 'task-03' && !(rA.next.blockedBy && rA.next.blockedBy.length),
    `frontier：task-01 勾后 next 跳过被阻塞的 task-02 直指 task-03（实际 ${rA.next && rA.next.id}）`)

  // 3b. 全阻塞回退：未勾者互相阻塞 → next=最小号 + blockedBy 注记
  const mdB = [
    '- [x] task-01: A',
    '- [ ] task-02: B [blocked-by: task-03]',
    '- [ ] task-03: C [blocked-by: task-02]',
  ].join('\n')
  const rB = tickTasksMd({ tasksMd: mdB, taskId: 'task-01' })
  assertTrue(rB.next && rB.next.id === 'task-02' && Array.isArray(rB.next.blockedBy) && rB.next.blockedBy.includes('task-03'),
    `全阻塞回退：next=最小号 task-02 带 blockedBy 注记（实际 ${rB.next && rB.next.id}/${JSON.stringify(rB.next && rB.next.blockedBy)}）`)

  // 3c. 无标注现状一致：next=第一个未勾行，desc 原样
  const mdC = [
    '- [x] task-01: A',
    '- [ ] task-02: B',
    '- [ ] task-03: C',
  ].join('\n')
  const rC = tickTasksMd({ tasksMd: mdC, taskId: 'task-01' })
  assertTrue(rC.next && rC.next.id === 'task-02' && rC.next.desc === 'B' && rC.blockedWarning === null,
    '无标注：next=第一个未勾、desc 原样、零警告（现状零回归）')
}

// ── 4. 不合法标注：warn 留痕按普通文本 ──
console.log('\n--- 4. 不合法标注 ---')
{
  const md = [
    '- [ ] task-01: A',
    '- [ ] task-02: B [blocked-by:]',
  ].join('\n')
  const [w, done] = hookWarn()
  let r
  try { r = tickTasksMd({ tasksMd: md, taskId: 'task-01' }) } finally { done() }
  assertTrue(r.next && typeof r.next.desc === 'string', '不合法标注不炸解析（按普通文本，next 正常返回）')
  assertTrue(r.next.desc.includes('[blocked-by:]'), '不合法标注按普通文本保留在 desc（不剥出）')
}

console.log(`\n${'='.repeat(50)}`)
console.log(`✅ 通过: ${failed === 0 ? 'all' : '部分'}  ❌ 失败断言: ${failed}`)
if (failures.length > 0) { console.log('失败项:'); failures.forEach(f => console.log(`  - ${f}`)) }
console.log('='.repeat(50))
if (failed > 0) process.exit(1)
