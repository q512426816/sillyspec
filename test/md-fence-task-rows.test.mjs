/**
 * md-fence-task-rows.test.mjs — 任务行解析围栏感知守卫（2026-11-04-fence-aware-task-rows）
 *
 * 验收面：
 *   ① fenceScan：```/~~~ 开合、≤3 空格缩进、信息串、闭栏长度阈值、异字符栏不互闭、未闭合判定；
 *   ② tickTasksMd 围栏过滤：栏内示例任务行不进任务集/不被翻格/不进可选清单；
 *   ③ 未闭合围栏 fail-safe：开栏后不计行、返回 unclosedFence 标记与起始行号、不抛错；
 *   ④ 字节级保留：翻格只动 checkbox 态字符，LF/CRLF 逐字保留。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'

import { fenceScan } from '../src/md-fence.js'
import { tickTasksMd } from '../src/task-tick.js'

test('fenceScan：成对 ``` 围栏、缩进、信息串、闭栏长度阈值', () => {
  const md = [
    '前文',
    '```js',
    '- [ ] task-99: 栏内示例',
    '```',
    '后文',
  ].join('\n')
  const s = fenceScan(md)
  assert.deepEqual(s.inFence, [false, true, true, true, false])
  assert.equal(s.unclosed, false)
  assert.equal(s.fenceStartLine, null)
})

test('fenceScan：~~~ 栏与 ``` 互不闭合；缩进 ≤3 空格合法；闭栏须不短于开栏', () => {
  const md = ['~~~md', '```', '混栏不清', '~~~', '尾部'].join('\n')
  const s = fenceScan(md)
  assert.deepEqual(s.inFence, [true, true, true, true, false])

  const indented = fenceScan(['a', '   ```', 'x', '  ```', 'b'].join('\n'))
  assert.deepEqual(indented.inFence, [false, true, true, true, false])

  const longerOpen = fenceScan(['````', 'x', '```', '仍未闭合', '````'].join('\n'))
  assert.deepEqual(longerOpen.inFence, [true, true, true, true, true])
  assert.equal(longerOpen.unclosed, false, '短于开栏的栏线不算闭合，等长闭栏正常收口')

  const shortCloseOnly = fenceScan(['````', 'x', '```', 'y'].join('\n'))
  assert.equal(shortCloseOnly.unclosed, true, '只有短于开栏的栏线 → 未闭合')
  assert.deepEqual(shortCloseOnly.inFence, [true, true, true, true])
})

test('fenceScan：未闭合返回起始行号（1 基）', () => {
  const s = fenceScan(['a', 'b', '```', 'x', 'y'].join('\n'))
  assert.equal(s.unclosed, true)
  assert.equal(s.fenceStartLine, 3)
})

test('围栏内任务行不计数且不误翻格：同 id 真实行只翻围栏外那行', () => {
  const md = [
    '# 任务',
    '- [ ] task-01: 真实任务',
    '示例（文档围栏）：',
    '```',
    '- [ ] task-01: 围栏内示例副本',
    '- [ ] task-99: 幻影任务',
    '```',
  ].join('\n')
  const r = tickTasksMd({ tasksMd: md, taskId: 'task-01' })
  assert.equal(r.kind, 'ticked')
  assert.equal(r.total, 1, '围栏内两行不得计入任务集')
  assert.equal(r.checked, 1)
  const out = r.tasksMd
  assert.match(out, /- \[x\] task-01: 真实任务/)
  assert.match(out, /- \[ \] task-01: 围栏内示例副本/, '围栏内同 id 行不得被误翻')
  assert.match(out, /- \[ \] task-99: 幻影任务/, '围栏内幻影行不得被触碰')
})

test('围栏内独占 id 不进可选清单：tick 返回 unknown', () => {
  const md = ['```', '- [ ] task-02: 栏内幻影', '```', '- [ ] task-01: 真实'].join('\n')
  const r = tickTasksMd({ tasksMd: md, taskId: 'task-02' })
  assert.equal(r.kind, 'unknown')
  assert.deepEqual(r.available, ['task-01'])
})

test('未闭合围栏 fail-safe：开栏后不计行，返回标记与行号，翻格不受阻', () => {
  const md = [
    '- [ ] task-01: 真实任务',
    '尾注示例：',
    '```',
    '- [ ] task-02: 开栏后幻影',
  ].join('\n')
  const r = tickTasksMd({ tasksMd: md, taskId: 'task-01' })
  assert.equal(r.kind, 'ticked')
  assert.equal(r.total, 1, '未闭合开栏后任务行不得计入')
  assert.equal(r.unclosedFence, true)
  assert.equal(r.unclosedFenceLine, 3)
})

test('CRLF 字节级保留：翻格只动 checkbox 态字符', () => {
  const md = '# 任务\r\n- [ ] task-01: 真实任务\r\n\r\n```js\r\n- [ ] task-01: 栏内示例\r\n```\r\n'
  const r = tickTasksMd({ tasksMd: md, taskId: 'task-01' })
  assert.equal(r.kind, 'ticked')
  const expected = md.replace('- [ ] task-01: 真实任务', '- [x] task-01: 真实任务')
  assert.equal(r.tasksMd, expected, '除 checkbox 态字符外必须逐字节一致（含 CRLF 与围栏）')
})
