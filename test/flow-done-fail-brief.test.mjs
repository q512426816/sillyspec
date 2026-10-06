/**
 * 2026-10-06-archive-cmd-race-and-brief 回归：flow done 中断简报「待办」口径
 *
 * 背景（真仓实测）：旧口径只看运行头快照 st.substeps——mark() 只写盘不回填内存快照，
 * 首轮运行时本轮刚完成/跳过的子步全被误列进待办（flow-status-json 首轮：已完成
 * artifacts、ledger、patch，待办仍列全部 8 子步；重入后显示才正确）。
 *
 * 覆盖：
 *   ① 首轮形态：快照空、doneList 含本轮完成/跳过 → 待办恰为剩余子步（不含已完成）
 *   ② 重入形态：快照含历史 done、doneList 为本轮 skip → 两口径收敛
 *   ③ 边界：failed 恒剔除；(skip) 后缀形态识别
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = dirname(fileURLToPath(import.meta.url))
const { remainingSubstepsAtFail } = await import(pathToFileURL(join(ROOT, '..', 'src', 'flow.js')).href)

test('① 首轮形态：本轮 doneList 并入口径，刚完成子步不进待办', () => {
  const left = remainingSubstepsAtFail({
    snapshotSubsteps: {},
    doneList: ['artifacts', 'ledger', 'patch'],
    failed: 'review',
  })
  assert.deepEqual(left, ['probes', 'distill', 'archive', 'events'], `待办应恰为四剩余子步，实际：${left.join('、')}`)
})

test('①b 首轮含 skip 形态：(skip) 后缀识别为已完成', () => {
  const left = remainingSubstepsAtFail({
    snapshotSubsteps: {},
    doneList: ['artifacts(skip)', 'ledger(skip)', 'patch'],
    failed: 'review',
  })
  assert.deepEqual(left, ['probes', 'distill', 'archive', 'events'], 'skip 与 done 同口径剔除')
})

test('② 重入形态：快照历史 done 与本轮 doneList 收敛同值', () => {
  const left = remainingSubstepsAtFail({
    snapshotSubsteps: { artifacts: 'done', ledger: 'done', patch: 'done' },
    doneList: ['artifacts(skip)', 'ledger(skip)', 'patch(skip)'],
    failed: 'review',
  })
  assert.deepEqual(left, ['probes', 'distill', 'archive', 'events'], '两口径重叠不漏不重')
})

test('③ 边界：failed 恒剔除；全完成时待办为空数组', () => {
  const all = ['artifacts', 'ledger', 'patch', 'review', 'probes', 'distill', 'archive', 'events']
  const left = remainingSubstepsAtFail({ snapshotSubsteps: {}, doneList: all.slice(0, 7), failed: 'events' })
  assert.deepEqual(left, [])
  // failed 即便不在 doneList 也不出现在待办
  const left2 = remainingSubstepsAtFail({ snapshotSubsteps: {}, doneList: [], failed: 'review' })
  assert.ok(!left2.includes('review'))
  assert.deepEqual(left2, ['artifacts', 'ledger', 'patch', 'probes', 'distill', 'archive', 'events'])
})
