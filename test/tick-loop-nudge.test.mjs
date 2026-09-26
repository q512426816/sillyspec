/**
 * tick-loop-nudge.test.mjs — 勾选提醒进干活循环（2026-09-26-tick-loop-nudge，R19 行为发现）
 *
 * 覆盖验收面：
 *   ① flow status 勾选提醒：②执行阶段+勾选滞后+区间有提交 → 提醒行在场；
 *      ①阶段（无完成迹象）或勾齐时不刷（防噪音）；
 *   ② tasks.md 头部边干边勾纪律行在场（OS Guardrails 同款——常驻工件面，每次读 tasks 都看到）；
 *   ③ 简报交付纪律含 tasks.md pathspec 提交要求（R19 发现：untracked 直至归档）；
 *   ④ 哨兵时点判定：一把勾（tasks.md 首次提交==最后提交）→ warn 放行；untracked → 同款 warn。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

test('① flow status 提醒逻辑钉（源码文本级——条件：②阶段+滞后+有提交）', () => {
  const src = readFileSync(join(ROOT, 'src/flow.js'), 'utf8')
  assert.ok(src.includes("phase.startsWith('②')"), '提醒限定②执行阶段')
  assert.ok(src.includes('tickNudge'), 'tickNudge 变量在场')
  assert.ok(src.includes('勿攒到收口一把勾'), '提醒文案含行为目标')
  assert.ok(src.includes('c < tot'), '勾齐后不刷（c<tot 才提醒）')
  assert.ok(src.includes('parseInt(commits, 10) > 0'), '区间零提交不刷（①阶段防噪）')
})

test('② tasks.md 头部纪律行钉（draftTasks 渲染含边干边勾指引）', () => {
  const src = readFileSync(join(ROOT, 'src/flow-draft.js'), 'utf8')
  assert.ok(src.includes('边干边勾'), '纪律关键词在场')
  assert.ok(src.includes('完成一条 = 实现到位 + 相关测试跑绿'), '完成的判定语义（OS 同款：验证→勾）')
  assert.ok(src.includes('本文件收口前随交付显式 pathspec 提交'), 'tasks 入交付提交要求')
})

test('③ 简报交付纪律含 tasks.md 提交要求', () => {
  const src = readFileSync(join(ROOT, 'src/flow.js'), 'utf8')
  assert.ok(src.includes('tasks.md 一并显式 pathspec 提交'), '交付纪律行含 tasks.md')
  assert.ok(src.includes('勾选证据进 git 历史'), '理由（R19 实证）')
  assert.ok(src.includes('勾选滞后时 status 会带提醒行'), '简报交叉引用 status 提醒')
})

test('④ 哨兵时点判定钉（一把勾 warn / untracked warn / fail-soft）', () => {
  const src = readFileSync(join(ROOT, 'src/flow.js'), 'utf8')
  assert.ok(src.includes('一把勾模式'), '一把勾模式 warn 文案')
  assert.ok(src.includes('tasks.md 未随交付提交'), 'untracked warn 文案')
  assert.ok(src.includes("['log', '--format=%h', '-n', '1', '--', tasksPath]"), 'tasks.md 首次提交锚定')
  assert.ok(src.includes('时点判定 fail-soft'), 'fail-soft')
})
