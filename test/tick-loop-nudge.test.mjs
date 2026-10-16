/**
 * tick-loop-nudge.test.mjs — 勾选提醒进干活循环（2026-09-26-tick-loop-nudge，R19 行为发现）
 *
 * 覆盖验收面：
 *   ① flow status 心跳（2026-09-29-flow-task-heartbeat 升级自勾选提醒）：②执行阶段恒给
 *      下一任务指针+进度（行为级用例见 flow-status-heartbeat.test.mjs，此处源码钉）；
 *   ② 勾选纪律指引在协议提示面（2026-10-07-thin-tasks-v3 起从 tasks.md 文件内指令迁至
 *      flow start 横幅——常驻面改为每次协议输出都看到；文件内零指令）；
 *   ③ 简报交付纪律含 tasks.md pathspec 提交要求（R19 发现：untracked 直至归档）；
 *   ④ 哨兵时点判定（2026-10-17-tick-timing-source 换源）：git 历史判据（首提交==HEAD/
 *      untracked）退役，换 task-ticks.jsonl 侧车墙钟时戳 detectTickTiming——末尾集中 warn/
 *      边干边勾确认行/无观测教学行；行为级用例见 tick-timing-source.test.mjs，此处源码钉。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

test('① flow status 心跳钉（源码文本级——②执行阶段恒给下一任务；2026-09-29-flow-task-heartbeat 升级）', () => {
  const src = readFileSync(join(ROOT, 'src/flow.js'), 'utf8')
  assert.ok(src.includes("phase.startsWith('②')"), '心跳限定②执行阶段')
  assert.ok(src.includes('heartbeat'), 'heartbeat 变量在场')
  assert.ok(src.includes('勿攒一把勾'), '指引文案含行为目标（勿攒一把勾）')
  assert.ok(src.includes('⏭️ 下一任务'), '下一任务指针行在场')
})

test('② 勾选纪律指引钉（flow start 横幅承载——2026-10-07-thin-tasks-v3 文件内指令迁出）', () => {
  const flowSrc = readFileSync(join(ROOT, 'src/flow.js'), 'utf8')
  assert.ok(flowSrc.includes('当场勾这一格'), '循环指令（做一件→测试绿→当场勾）')
  assert.ok(flowSrc.includes('task tick --change'), 'tick 动词用法在场')
  assert.ok(flowSrc.includes('以 checkbox 为进度状态机'), 'CLI 消费 checkbox 作进度源（openspec 对齐）')
  const draftSrc = readFileSync(join(ROOT, 'src/flow-draft.js'), 'utf8')
  assert.ok(!draftSrc.includes('> 边干边勾'), 'tasks.md 文件内指令已清零（纪律唯一源=横幅+命令卡）')
})

test('③ 简报交付纪律含 tasks.md 提交要求', () => {
  const src = readFileSync(join(ROOT, 'src/flow.js'), 'utf8')
  assert.ok(src.includes('tasks.md 一并显式 pathspec 提交'), '交付纪律行含 tasks.md')
  assert.ok(src.includes('勾选证据进 git 历史'), '理由（R19 实证）')
  assert.ok(src.includes('task tick 回显'), '现成命令指引（2026-10-17-tick-timing-source 反馈前移）')
  assert.ok(src.includes('执行期勾选纪律') || src.includes('自愿查看/恢复面'), '简报交叉引用 status（自愿语义，D-007 口径）')
})

test('④ 哨兵时点判定钉（2026-10-17-tick-timing-source 换源——git 判据退役、侧车时戳接线）', () => {
  const src = readFileSync(join(ROOT, 'src/flow.js'), 'utf8')
  assert.ok(src.includes('detectTickTiming'), '时点判定消费 detectTickTiming（侧车墙钟时戳判据）')
  assert.ok(src.includes('末尾集中勾选'), '末尾集中 warn 文案')
  assert.ok(src.includes('边干边勾确认'), '边干边勾确认行')
  assert.ok(src.includes('时点判定 fail-soft'), 'fail-soft')
  assert.ok(!src.includes("['log', '--reverse', '--format=%h', '--', tasksPath]"), 'git 首提锚定零残留（压扁摧毁判据——坑 tick-timing-squash-blindspot）')
  assert.ok(!src.includes('tasks.md 未随交付提交'), 'untracked 结构性警告零残留（tasks.md 不进交付 pathspec 纪律下恒复现）')
})
