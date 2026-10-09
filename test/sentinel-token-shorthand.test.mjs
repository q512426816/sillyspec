/**
 * 坑 flow-done-sentinel-token-split 回归：提交消息连写 token 组（task-01/02/03）拆分
 *
 * 实证（2026-10-08-turn-nav-hover-mark）：实现一次提交覆盖多任务时消息写 `task-01/02/03`
 * （自然语言习惯）——哨兵按独立完整 token 字面匹配，连写组只命中首个，其余误判「零完成
 * 证据」拒收；autopilot 自动勾选提取（flow.js）同病。
 *
 * 锁定：
 *   ① 连写组三形态（斜杠/顿号/逗号+空格）展开后三任务全有证据；
 *   ② 补零归一（task-1、2 → task-01 task-02）；
 *   ③ 前瞻边界不破（task-01 不证 task-010；task-013 版本串不误切）；
 *   ④ 既有独立 token 行为零变化。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { detectFakeCheckCompletion, expandTaskShorthand } from '../src/sentinel-assertions.js'

const TASKS_ALL_CHECKED = [
  '- [x] task-01: 注入段渲染正确',
  '- [x] task-02: 门回显可见',
  '- [x] task-03: 精度不回归',
].join('\n')

const run = (commits) => detectFakeCheckCompletion({
  changeDir: null,
  tasksMd: TASKS_ALL_CHECKED,
  commits,
  opts: { listReviewsImpl: () => [] },
})

test('① 连写组三形态展开：三任务全有证据（不再误拒）', () => {
  assert.equal(run(['feat: 三任务一次交付 task-01/02/03']).status, 'complete', '斜杠连写组')
  assert.equal(run(['feat: 三任务一次交付 task-01、02、03']).status, 'complete', '顿号连写组')
  assert.equal(run(['feat: 三任务一次交付 task-01, 02, 03']).status, 'complete', '逗号+空格连写组')
  assert.equal(run(['feat: 交付（task-3/1/02）']).status, 'complete', '乱序+补零归一')
})

test('② expandTaskShorthand 纯函数：补零/边界/非连写零变化', () => {
  assert.equal(expandTaskShorthand(['task-1、2'])[0], ' task-01 task-02 ', '补零到两位')
  assert.equal(expandTaskShorthand(['task-01/013'])[0], 'task-01/013', '版本串三连数字不满足尾界 → 整组不展开（防误切）')
  assert.equal(expandTaskShorthand(['task-01 task-02'])[0], 'task-01 task-02', '独立 token 零变化')
  assert.equal(expandTaskShorthand(['无 token 消息'])[0], '无 token 消息', '无 token 零变化')
  assert.deepEqual(expandTaskShorthand([]), [], '空数组')
})

test('③ 前瞻边界：task-01 不证 task-010；未勾全不误判', () => {
  assert.equal(run(['feat: 大任务 task-010']).status, 'fake', 'task-010 不是 task-01 证据')
  const partial = ['- [x] task-01: a', '- [ ] task-02: b', '- [ ] task-03: c'].join('\n')
  assert.equal(detectFakeCheckCompletion({ changeDir: null, tasksMd: partial, commits: ['x task-01/02/03'], opts: { listReviewsImpl: () => [] } }).status, 'none', '未全勾 → none（无完成主张）')
})

test('④ 既有独立 token 行为零变化', () => {
  assert.equal(run(['feat: task-01', 'feat: task-02', 'feat: task-03']).status, 'complete', '独立 token 全证据')
  assert.equal(run(['feat: task-01', 'feat: task-02']).status, 'fake', '缺 task-03 仍拒收')
})
