/**
 * 坑 worktree-cleanup-marker-chain 根治回归：execute run 的 change 归属戳 + 归属化解析
 *
 * 背景：run 目录不带变更身份，change→run 唯一链接是 current-execute-run-id-<change> marker；
 * worktree cleanup / 归档清理 / 并行误删后链断，mtime 最新 fallback 错拿其他变更的 run →
 * archive 完成度把已实现 task 全报「review.json 缺失」→ 手工回填 7 份实际存在于正确 run 的 review。
 *
 * 锁定语义：
 *   - stampExecuteRunChange 落 execute-runs/<runId>/change 戳
 *   - resolveExecuteRunForChange：marker 命中（覆盖/戳）→ origin=marker；marker 断裂 → 戳精确归属；
 *     旧 run 无戳 → 覆盖度启发；都不中 → null
 *   - resolveLatestExecuteRunId fallback 按戳过滤（不再盲目 mtime 最新）
 *   - resolveLatestExecuteRunIdWithTasks({ changeName }) 戳优先
 *   - summarizeTaskCompletion：cannot_verify 草稿单列计数 + 无法归属时报告区分「定位失败」≠「全缺」
 */
import fs from 'fs'
import path from 'path'
import os from 'os'
import {
  stampExecuteRunChange,
  resolveExecuteRunForChange,
  resolveLatestExecuteRunId,
  resolveLatestExecuteRunIdWithTasks,
  summarizeTaskCompletion,
} from '../src/task-review.js'

let passed = 0, failed = 0
const failures = []
function assert(cond, msg) { if (cond) { passed++; console.log('  ✅ ' + msg) } else { failed++; failures.push(msg); console.log('  ❌ ' + msg) } }

function setup() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'stamp-'))
  const changeDir = path.join(root, 'change')
  const runtimeRoot = path.join(root, 'runtime')
  fs.mkdirSync(changeDir, { recursive: true })
  fs.mkdirSync(runtimeRoot, { recursive: true })
  return { root, changeDir, runtimeRoot }
}
function writePlan(changeDir, ids) {
  const lines = ['# Plan', '']
  for (const id of ids) lines.push(`- [x] task-${id} desc`)
  fs.writeFileSync(path.join(changeDir, 'plan.md'), lines.join('\n') + '\n')
}
function writeReview(runtimeRoot, runId, taskId, specVerdict = 'pass', qualityVerdict = 'pass', extra = {}) {
  const dir = path.join(runtimeRoot, 'execute-runs', runId, 'tasks', `task-${taskId}`)
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(path.join(dir, 'review.json'), JSON.stringify({
    schemaVersion: 1, task: `task-${taskId}`, specVerdict, qualityVerdict, base: 'aaaaaaa', head: 'bbbbbbb',
    ...extra,
  }))
}
function writeMarker(runtimeRoot, changeName, runId) {
  fs.writeFileSync(path.join(runtimeRoot, 'current-execute-run-id-' + changeName), runId + '\n')
}
const cleanup = root => { try { fs.rmSync(root, { recursive: true, force: true }) } catch {} }
const RUN_A = 'exec-2026-08-19-100000'
const RUN_B = 'exec-2026-08-19-110000'
const CN = '2026-08-19-my-change'
const OTHER = '2026-08-19-other-change'

console.log('=== execute run change 归属戳 + 归属化解析（坑 worktree-cleanup-marker-chain）===\n')

console.log('--- ① stamp 落盘与读取（经 resolveExecuteRunForChange 的 stamp origin 验证）---')
{
  const ctx = setup()
  stampExecuteRunChange(ctx.runtimeRoot, RUN_A, CN)
  assert(fs.existsSync(path.join(ctx.runtimeRoot, 'execute-runs', RUN_A, 'change')), '戳文件落盘 execute-runs/<runId>/change')
  // marker 断裂（不写 marker），仅凭戳归属
  const r = resolveExecuteRunForChange({ runtimeRoot: ctx.runtimeRoot, changeName: CN, taskIds: ['task-01'] })
  assert(r && r.runId === RUN_A && r.origin === 'stamp', 'marker 缺失 → 戳精确归属（origin=stamp）')
  // 其他变更来解析 → 戳不匹配、无覆盖 → null
  const r2 = resolveExecuteRunForChange({ runtimeRoot: ctx.runtimeRoot, changeName: OTHER, taskIds: ['task-01'] })
  assert(r2 === null, '他变更解析不误配（null 而非错拿 RUN_A）')
  cleanup(ctx.root)
}

console.log('--- ② marker 断裂后不再盲目 mtime 最新：跨变更不串台（修复核心场景）---')
{
  const ctx = setup()
  writePlan(ctx.changeDir, ['01'])
  // RUN_B（mtime 更新）是 OTHER 变更的 run；本变更真实 review 在 RUN_A
  writeReview(ctx.runtimeRoot, RUN_A, '01')
  writeReview(ctx.runtimeRoot, RUN_B, '01')
  stampExecuteRunChange(ctx.runtimeRoot, RUN_A, CN)
  stampExecuteRunChange(ctx.runtimeRoot, RUN_B, OTHER)
  // marker 无（cleanup 后断裂）
  const s = summarizeTaskCompletion({ changeDir: ctx.changeDir, runtimeRoot: ctx.runtimeRoot, changeName: CN })
  assert(s.source === 'review.json' && s.completed === 1 && s.pending.length === 0,
    'marker 断裂 + 混入他变更 run → 按戳归属正确 run，完成度 1/1（旧逻辑会 mtime 拿 RUN_B 报缺失）')
  cleanup(ctx.root)
}

console.log('--- ③ 旧 run 无戳（历史存量）→ 覆盖度启发归属 ---')
{
  const ctx = setup()
  writePlan(ctx.changeDir, ['01'])
  // 不写任何戳：RUN_B 更新但只有他变更 task-02 的 review；本变更 task-01 review 在 RUN_A
  writeReview(ctx.runtimeRoot, RUN_A, '01')
  writeReview(ctx.runtimeRoot, RUN_B, '02')
  const r = resolveExecuteRunForChange({ runtimeRoot: ctx.runtimeRoot, changeName: CN, taskIds: ['task-01'] })
  assert(r && r.runId === RUN_A && r.origin === 'coverage', '无戳 → 覆盖度启发命中 RUN_A（含本变更 task-01 review）')
  cleanup(ctx.root)
}

console.log('--- ④ marker 指向零覆盖空 run（坑10 漂移）→ 重定位到真实 run ---')
{
  const ctx = setup()
  writePlan(ctx.changeDir, ['01'])
  fs.mkdirSync(path.join(ctx.runtimeRoot, 'execute-runs', RUN_B, 'tasks'), { recursive: true }) // 空 run（marker 指向）
  writeReview(ctx.runtimeRoot, RUN_A, '01')
  writeMarker(ctx.runtimeRoot, CN, RUN_B)
  const r = resolveExecuteRunForChange({ runtimeRoot: ctx.runtimeRoot, changeName: CN, taskIds: ['task-01'] })
  assert(r && r.runId === RUN_A && r.relocated === true, 'marker 零覆盖 → 重定位真实 review 所在 run')
  const s = summarizeTaskCompletion({ changeDir: ctx.changeDir, runtimeRoot: ctx.runtimeRoot, changeName: CN })
  assert(s.completed === 1, 'summarize 经重定位 completed=1（不误报缺失）')
  cleanup(ctx.root)
}

console.log('--- ⑤ marker 正常且有覆盖 → origin=marker（零回归）---')
{
  const ctx = setup()
  writeReview(ctx.runtimeRoot, RUN_A, '01')
  writeMarker(ctx.runtimeRoot, CN, RUN_A)
  const r = resolveExecuteRunForChange({ runtimeRoot: ctx.runtimeRoot, changeName: CN, taskIds: ['task-01'] })
  assert(r && r.runId === RUN_A && r.origin === 'marker', 'marker 命中 → origin=marker')
  cleanup(ctx.root)
}

console.log('--- ⑥ resolveLatestExecuteRunId fallback 按戳过滤 ---')
{
  const ctx = setup()
  writeReview(ctx.runtimeRoot, RUN_A, '01')
  writeReview(ctx.runtimeRoot, RUN_B, '01')
  stampExecuteRunChange(ctx.runtimeRoot, RUN_A, CN)
  stampExecuteRunChange(ctx.runtimeRoot, RUN_B, OTHER)
  const got = resolveLatestExecuteRunId({ runtimeRoot: ctx.runtimeRoot, changeName: CN })
  assert(got === RUN_A, 'marker 缺失 → fallback 戳过滤命中 RUN_A（非 mtime 最新的 RUN_B）')
  // 无戳存量：退 mtime 最新（向后兼容）
  const ctx2 = setup()
  writeReview(ctx2.runtimeRoot, RUN_A, '01')
  writeReview(ctx2.runtimeRoot, RUN_B, '01')
  fs.utimesSync(path.join(ctx2.runtimeRoot, 'execute-runs', RUN_A), new Date('2026-08-19T10:00:00Z'), new Date('2026-08-19T10:00:00Z'))
  fs.utimesSync(path.join(ctx2.runtimeRoot, 'execute-runs', RUN_B), new Date('2026-08-19T11:00:00Z'), new Date('2026-08-19T11:00:00Z'))
  const got2 = resolveLatestExecuteRunId({ runtimeRoot: ctx2.runtimeRoot, changeName: CN })
  assert(got2 === RUN_B, '无戳 run → 退 mtime 最新（向后兼容）')
  cleanup(ctx.root); cleanup(ctx2.root)
}

console.log('--- ⑦ resolveLatestExecuteRunIdWithTasks({ changeName }) 戳优先 ---')
{
  const ctx = setup()
  writeReview(ctx.runtimeRoot, RUN_A, '01')
  writeReview(ctx.runtimeRoot, RUN_B, '01')
  stampExecuteRunChange(ctx.runtimeRoot, RUN_A, CN)
  stampExecuteRunChange(ctx.runtimeRoot, RUN_B, OTHER)
  // 显式区分 mtime（须在 stamp 之后：写 change 文件会刷新父目录 mtime，同毫秒写入让排序退化到目录序）
  fs.utimesSync(path.join(ctx.runtimeRoot, 'execute-runs', RUN_A), new Date('2026-08-19T10:00:00Z'), new Date('2026-08-19T10:00:00Z'))
  fs.utimesSync(path.join(ctx.runtimeRoot, 'execute-runs', RUN_B), new Date('2026-08-19T11:00:00Z'), new Date('2026-08-19T11:00:00Z'))
  assert(resolveLatestExecuteRunIdWithTasks({ runtimeRoot: ctx.runtimeRoot, changeName: CN }) === RUN_A,
    'WithTasks changeName 戳优先命中 RUN_A')
  assert(resolveLatestExecuteRunIdWithTasks({ runtimeRoot: ctx.runtimeRoot }) === RUN_B,
    'WithTasks 无 changeName → mtime 最新（缺省零回归）')
  cleanup(ctx.root)
}

console.log('--- ⑧ summarizeTaskCompletion：cannot_verify 草稿单列可见 ---')
{
  const ctx = setup()
  writePlan(ctx.changeDir, ['01', '02'])
  writeReview(ctx.runtimeRoot, RUN_A, '01', 'cannot_verify', 'cannot_verify', { requiredEvidence: ['evidence'] })
  writeReview(ctx.runtimeRoot, RUN_A, '02')
  writeMarker(ctx.runtimeRoot, CN, RUN_A)
  const s = summarizeTaskCompletion({ changeDir: ctx.changeDir, runtimeRoot: ctx.runtimeRoot, changeName: CN })
  assert(s.completed === 2, 'cannot_verify 仍计 completed（语义零回归）')
  assert(s.cannotVerify === 1, 'cannotVerify 单列计数 = 1')
  assert(s.report.includes('cannot_verify 草稿（未真正复核）: 1'), 'report 含草稿计数行')
  assert(s.report.includes('requiredEvidence'), 'report 引导兑现 requiredEvidence / 补真实复核')
  cleanup(ctx.root)
}

console.log('--- ⑨ 无法归属 run → 降级报告区分「定位失败」而非「review 全缺」---')
{
  const ctx = setup()
  writePlan(ctx.changeDir, ['01'])
  // 有 run 但属于他变更（有戳），本变更零归属
  writeReview(ctx.runtimeRoot, RUN_B, '01')
  stampExecuteRunChange(ctx.runtimeRoot, RUN_B, OTHER)
  const s = summarizeTaskCompletion({ changeDir: ctx.changeDir, runtimeRoot: ctx.runtimeRoot, changeName: CN })
  assert(s.source === 'plan-checkbox-fallback', '无归属 → 降级 checkbox 口径')
  assert(s.report.includes('无法归属'), '报告明示「无法归属」（定位失败 ≠ review 全缺）')
  assert(s.report.includes('1 个 run'), '报告列出候选 run 数量辅助排查')
  cleanup(ctx.root)
}

console.log('--- ⑩ summarize 返回 runId（供上层展示/排查）---')
{
  const ctx = setup()
  writePlan(ctx.changeDir, ['01'])
  writeReview(ctx.runtimeRoot, RUN_A, '01')
  writeMarker(ctx.runtimeRoot, CN, RUN_A)
  const s = summarizeTaskCompletion({ changeDir: ctx.changeDir, runtimeRoot: ctx.runtimeRoot, changeName: CN })
  assert(s.runId === RUN_A, '返回 runId 字段')
  cleanup(ctx.root)
}

console.log(`\n${'='.repeat(50)}`)
console.log(`✅ 通过: ${passed}  ❌ 失败: ${failed}`)
if (failures.length) { console.log('失败项:'); failures.forEach(f => console.log('  - ' + f)) }
console.log('='.repeat(50))
if (failed > 0) process.exit(1)
