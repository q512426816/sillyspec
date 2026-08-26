/**
 * progress show 历史回答展示（坑 stage-wait-history-not-replayed 补强之二）。
 *
 * waitAnswers 早已持久化（steps.wait_answers），但 show 此前只渲染 waiting 步的
 * 原因/选项——已完成步骤累积的多轮用户回答不可见，人工排查「中断后哪些回答还在」
 * 无从下手。本测试钉 show 的新「历史回答（N 轮，续跑自动回放）」摘要行：
 *   - 多轮 waitAnswers → 每轮一行、120 字截断
 *   - 仅单值 wait_answer（旧路径）→ 第 1 轮兜底
 *   - 无回答步骤 → 零新增输出（回归保护）
 *
 * 同步消费方：outputStep 的 📜 回放块（output-step-render.test.mjs Case 8-10）。
 */
import { runCapturing, initChange, seedStage, makeRepo, cleanup, report } from './_complete-step-harness.mjs'

const count = { passed: 0, failed: 0, failures: [] }
const assert = (cond, msg) => { cond ? (count.passed++, console.log(`  ✅ PASS: ${msg}`)) : (count.failed++, count.failures.push(msg), console.log(`  ❌ FAIL: ${msg}`)) }

console.log('=== progress show：历史等待回答展示 ===\n')

{
  const { cwd, specBase } = makeRepo('ps-whist-')
  const changeName = '2026-08-26-show-wait-history'
  const pm = await initChange(cwd, specBase, changeName)
  const longAnswer = '长回答截断验证。'.repeat(30) // 240 字 > 120 截断阈值
  await seedStage(pm, cwd, changeName, 'brainstorm', [
    { name: '进度确认', status: 'completed', output: '状态正常' },
    {
      name: '对话式探索与需求澄清', status: 'completed', output: '需求已明确',
      waitAnswers: [
        { round: 1, answer: '要做导出功能', question: '核心需求？', answeredAt: '2026/08/26 10:00:00' },
        { round: 2, answer: longAnswer, question: null, answeredAt: '2026/08/26 10:05:00' },
      ],
    },
    { name: '提出 2-3 种方案', status: 'waiting', output: '请选择方案', waitAnswer: '方案B', waitAnswers: [], waitReason: '等待用户选择方案' },
    { name: '分段展示设计', status: 'pending' },
  ])

  const r = await runCapturing(() => pm.show(cwd, changeName))

  assert(r.stdout.includes('历史回答（2 轮，续跑自动回放）'), '多轮 waitAnswers → 「历史回答（2 轮）」摘要行')
  assert(r.stdout.includes('第1轮: 要做导出功能'), '第 1 轮回答展示')
  assert(r.stdout.includes('…'), '超 120 字回答截断（尾缀 …）')
  assert(!r.stdout.includes(longAnswer), '长回答全文不整段输出')
  assert(r.stdout.includes('历史回答（1 轮，续跑自动回放）'), '仅单值 wait_answer 的 waiting 步 → 第 1 轮兜底摘要')
  assert(r.stdout.includes('第1轮: 方案B'), '单值兜底轮回答展示')

  // 回归保护：无回答步骤不新增行；waiting 步原有 原因/选项 行保留
  const confirmLines = r.stdout.split('\n').filter(l => l.includes('进度确认'))
  assert(confirmLines.length === 1 && !confirmLines[0].includes('历史回答'), '无回答步骤零新增输出')
  assert(r.stdout.includes('原因：等待用户选择方案'), 'waiting 步原有「原因」行保留')
}

cleanup()
report(count.passed, count.failed, count.failures)
