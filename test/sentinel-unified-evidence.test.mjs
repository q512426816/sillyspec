/**
 * sentinel-unified-evidence.test.mjs — 哨兵统一证据判据
 * （2026-10-07-thin-tasks-v3；前身 sentinel-mirror-waiver.test.mjs——镜像豁免契约退役）
 *
 * 覆盖验收面：
 *   ① 全勾零证据 → fake 拒收：任务面不再区分「机器种子镜像/agent 覆写」——每格勾选都是
 *      完成主张，一律要 per-task 证据（提交 token / review.json）；
 *   ② 带证据路径：每任务提交 token / review.json → complete；
 *   ③ 部分勾选 → none（无完成主张，收口侧走勾选缺失 advisory）；
 *   ④ review.json 证据面与 token 前瞻边界（task-01 不证 task-010）；
 *   ⑤ watcher R1 实时嫌疑退役仍成立（翻格零实时警告，终态归收口哨兵）；
 *   ⑥ 零提交全勾 → fake（空转变更不许过门——旧角度 A 判据在统一判据下天然成立）。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { detectFakeCheckCompletion } from '../src/sentinel-assertions.js'

const TASKS = [
  '---',
  'author: flow-machine-draft',
  '---',
  '# 任务注册表（Tasks）',
  '',
  '- [ ] task-01: 注入段渲染正确',
  '- [ ] task-02: 门回显可见',
  '- [ ] task-03: 精度不回归',
].join('\n')

const allChecked = TASKS.replace(/^- \[ \] /gm, '- [x] ')

test('① 全勾零证据 → fake（机器种子行与覆写行同判——豁免退役）', () => {
  const r = detectFakeCheckCompletion({
    changeDir: null,
    tasksMd: allChecked,
    commits: ['chore: 交付（无任务 token）'],
    opts: { listReviewsImpl: () => [] },
  })
  assert.equal(r.status, 'fake', `零证据全勾应拒收（实际 ${r.status}）`)
  assert.deepEqual(r.missing.sort(), ['task-01', 'task-02', 'task-03'])
})

test('①-b agent 覆写行同样零证据 → fake（统一判据不因来源弱化）', () => {
  const rewritten = allChecked.replace('task-02: 门回显可见', 'task-02: 接线 flow.js 注入段与门回显')
  const r = detectFakeCheckCompletion({
    changeDir: null,
    tasksMd: rewritten,
    commits: ['chore: 交付'],
    opts: { listReviewsImpl: () => [] },
  })
  assert.equal(r.status, 'fake')
  assert.deepEqual(r.missing.sort(), ['task-01', 'task-02', 'task-03'])
})

test('② 每任务提交 token → complete', () => {
  const r = detectFakeCheckCompletion({
    changeDir: null,
    tasksMd: allChecked,
    commits: ['feat: 甲 (task-01)', 'feat: 乙 (task-02)', 'fix: 丙 task-03'],
    opts: { listReviewsImpl: () => [] },
  })
  assert.equal(r.status, 'complete')
  assert.deepEqual(r.missing, [])
})

test('③ 部分勾选 → none（勾选缺失是漏账非假勾，收口侧 advisory）', () => {
  const partial = TASKS.replace('- [ ] task-01:', '- [x] task-01:')
  const r = detectFakeCheckCompletion({
    changeDir: null,
    tasksMd: partial,
    commits: [],
    opts: { listReviewsImpl: () => [] },
  })
  assert.equal(r.status, 'none')
  assert.deepEqual(r.missing, [])
})

test('④ review.json 证据面 + token 前瞻边界（task-01 不证 task-010）', () => {
  const r = detectFakeCheckCompletion({
    changeDir: null,
    tasksMd: allChecked + '\n- [x] task-04: 边界任务',
    commits: ['feat: 交付 (task-010)'],
    opts: { listReviewsImpl: () => ['execute-runs/run1/tasks/task-01/review.json', 'execute-runs/run1/tasks/task-02/review.json'] },
  })
  // task-03 零证据、task-04 零证据（task-010 前瞻不匹配）；task-01/02 走 review.json
  assert.equal(r.status, 'fake')
  assert.deepEqual(r.missing.sort(), ['task-03', 'task-04'])
})

test('⑤ watcher R1 已退役（2026-09-29-watcher-fakecheck-retire）：翻格均零实时嫌疑', async () => {
  const { applySentinelRules } = await import('../src/watcher.js')
  const { mkdtempSync, mkdirSync, writeFileSync } = await import('node:fs')
  const spec = mkdtempSync(join(tmpdir(), 'ss-w-r1-'))
  const change = '2026-10-07-w-drill'
  const changeDir = join(spec, 'changes', change)
  mkdirSync(join(spec, '.runtime'), { recursive: true })
  mkdirSync(changeDir, { recursive: true })
  writeFileSync(join(spec, '.runtime', `route-hindsight-baseline-${change}.json`),
    JSON.stringify({ schemaVersion: 1, change, design: null, tasks: TASKS }))
  const snap = (checked) => ({ ts: 1, archived: false, files: { 'tasks.md': { checkedTasks: checked } }, commits: [], reviews: {}, dirtyCode: [] })
  const NL = String.fromCharCode(10)
  const run = (tasksMdText) => {
    writeFileSync(join(changeDir, 'tasks.md'), tasksMdText)
    return applySentinelRules({ prev: snap([]), next: snap(['task-01']), state: null, changeDir })
  }
  // 实时嫌疑警告整体退役：勾选先于提交是协议正常时序，真裁决在收口哨兵（统一判据）+ 单拍门
  const seed = run(['- [x] task-01: 注入段渲染正确', '- [ ] task-02: 门回显可见', '- [ ] task-03: 精度不回归'].join(NL))
  assert.ok(!seed.warnings.some((w) => w.rule === 'fake-check'), '种子行翻格零警告')
  const rewritten = run(['- [x] task-01: 实现行为 X 的真实工作单元', '- [ ] task-02: 门回显可见', '- [ ] task-03: 精度不回归'].join(NL))
  assert.ok(!rewritten.warnings.some((w) => w.rule === 'fake-check'), '覆写行翻格也零实时警告（终态由收口哨兵判）')
  writeFileSync(join(changeDir, 'tasks.md'), '- [x] task-01: 注入段渲染正确' + NL)
  const nocd = applySentinelRules({ prev: snap([]), next: snap(['task-01']), state: null, changeDir: null })
  assert.ok(!nocd.warnings.some((w) => w.rule === 'fake-check'), '无 changeDir 同样零实时警告')
})

test('⑥ 零提交全勾 → fake（空转变更不许过门）', () => {
  const r = detectFakeCheckCompletion({
    changeDir: null,
    tasksMd: allChecked,
    commits: [],
    opts: { listReviewsImpl: () => [] },
  })
  assert.equal(r.status, 'fake')
  assert.deepEqual(r.missing.sort(), ['task-01', 'task-02', 'task-03'])
})
