/**
 * summarizeTaskCompletion 行为测试 —— archive Step1「任务完成度检查」客观真相源
 *
 * 锁定语义：
 *   - review.json verdict 为准（spec+quality 均≠fail = 完成，含 cannot_verify），不依赖 plan.md checkbox
 *   - runId marker 缺失 → 扫描 execute-runs/ 最新目录 fallback；都没有 → 降级 checkbox 统计 + 标注
 *   - 无 plan → no-plan；plan 无 task checkbox → no-tasks
 *   - fail-safe：report 恒非空，绝不抛错
 */
import fs from 'fs'
import path from 'path'
import os from 'os'
import { summarizeTaskCompletion } from '../src/task-review.js'

let passed = 0, failed = 0
const failures = []
function assert(cond, msg) { if (cond) { passed++; console.log('  ✅ ' + msg) } else { failed++; failures.push(msg); console.log('  ❌ ' + msg) } }

function setup() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'stc-'))
  const changeDir = path.join(root, 'change')
  const runtimeRoot = path.join(root, 'runtime')
  fs.mkdirSync(changeDir, { recursive: true })
  fs.mkdirSync(runtimeRoot, { recursive: true })
  return { root, changeDir, runtimeRoot }
}
function writePlan(changeDir, tasks) {
  const lines = ['# Plan', '']
  for (const t of tasks) lines.push((t.checked ? '- [x]' : '- [ ]') + ' task-' + t.id + ' desc')
  fs.writeFileSync(path.join(changeDir, 'plan.md'), lines.join('\n') + '\n')
}
function writeReview(runtimeRoot, runId, taskId, specVerdict, qualityVerdict, extra = {}) {
  const dir = path.join(runtimeRoot, 'execute-runs', runId, 'tasks', 'task-' + taskId)
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(path.join(dir, 'review.json'), JSON.stringify({
    schemaVersion: 1, task: 'task-' + taskId, specVerdict, qualityVerdict, base: 'aaaaaaa', head: 'bbbbbbb',
    ...extra
  }))
}
function writeMarker(runtimeRoot, changeName, runId) {
  fs.writeFileSync(path.join(runtimeRoot, 'current-execute-run-id-' + changeName), runId + '\n')
}
const cleanup = root => { try { fs.rmSync(root, { recursive: true, force: true }) } catch {} }
const CN = '2026-07-28-test-change'
const call = (ctx) => summarizeTaskCompletion({ changeDir: ctx.changeDir, runtimeRoot: ctx.runtimeRoot, changeName: CN })

console.log('=== summarizeTaskCompletion（archive Step1 客观完成度真相源）===\n')

console.log('--- ① 全 pass（checkbox 全勾）→ review.json 源，completed=total ---')
{
  const ctx = setup()
  writePlan(ctx.changeDir, [{ id: '01', checked: true }, { id: '02', checked: true }, { id: '03', checked: true }])
  writeMarker(ctx.runtimeRoot, CN, 'run-1')
  ;['01', '02', '03'].forEach(t => writeReview(ctx.runtimeRoot, 'run-1', t, 'pass', 'pass'))
  const s = call(ctx)
  assert(s.source === 'review.json', 'source=review.json')
  assert(s.total === 3 && s.completed === 3 && s.pending.length === 0, 'total=3/completed=3/pending 空')
  assert(s.report.includes('已通过'), 'report 含「已通过」')
  cleanup(ctx.root)
}

console.log('--- ② checkbox 全未勾但 review 全 pass → 仍 completed=2（以 review 为准，不数 checkbox）---')
{
  const ctx = setup()
  writePlan(ctx.changeDir, [{ id: '01', checked: false }, { id: '02', checked: false }])
  writeMarker(ctx.runtimeRoot, CN, 'run-1')
  ;['01', '02'].forEach(t => writeReview(ctx.runtimeRoot, 'run-1', t, 'pass', 'pass'))
  const s = call(ctx)
  assert(s.source === 'review.json' && s.completed === 2 && s.pending.length === 0, 'review pass → completed=2，无视 checkbox 未勾')
  cleanup(ctx.root)
}

console.log('--- ③ task-02 specVerdict=fail → pending 含 task-02 ---')
{
  const ctx = setup()
  writePlan(ctx.changeDir, [{ id: '01', checked: true }, { id: '02', checked: true }])
  writeMarker(ctx.runtimeRoot, CN, 'run-1')
  writeReview(ctx.runtimeRoot, 'run-1', '01', 'pass', 'pass')
  writeReview(ctx.runtimeRoot, 'run-1', '02', 'fail', 'pass')
  const s = call(ctx)
  assert(s.completed === 1 && s.pending.length === 1 && s.pending[0].id === 'task-02', 'completed=1，pending=[task-02]')
  cleanup(ctx.root)
}

console.log('--- ④ task-03 review.json 缺失 → pending 含 task-03（missing）---')
{
  const ctx = setup()
  writePlan(ctx.changeDir, [{ id: '01', checked: true }, { id: '03', checked: true }])
  writeMarker(ctx.runtimeRoot, CN, 'run-1')
  writeReview(ctx.runtimeRoot, 'run-1', '01', 'pass', 'pass')
  const s = call(ctx)
  assert(s.completed === 1 && s.pending.length === 1 && s.pending[0].id === 'task-03', 'completed=1，pending=[task-03]')
  assert(s.pending[0].reason.includes('缺失'), 'reason 含「缺失」')
  cleanup(ctx.root)
}

console.log('--- ⑤ marker 缺失但 execute-runs/ 有目录 → 扫描 fallback 仍用 review.json ---')
{
  const ctx = setup()
  writePlan(ctx.changeDir, [{ id: '01', checked: true }])
  writeReview(ctx.runtimeRoot, 'run-2', '01', 'pass', 'pass') // 不写 marker
  const s = call(ctx)
  assert(s.source === 'review.json' && s.completed === 1, 'marker 缺失→扫描 execute-runs→source 仍 review.json/completed=1')
  cleanup(ctx.root)
}

console.log('--- ⑥ marker 缺失 + execute-runs/ 也空 → 降级 checkbox ---')
{
  const ctx = setup()
  writePlan(ctx.changeDir, [{ id: '01', checked: true }, { id: '02', checked: false }])
  const s = call(ctx)
  assert(s.source === 'plan-checkbox-fallback', 'source=plan-checkbox-fallback')
  assert(s.total === 2 && s.completed === 1, '降级：total=2，checkbox 勾=1')
  assert(s.report.includes('降级') && s.report.includes('交叉核对'), 'report 标注降级 + 引导交叉核对')
  cleanup(ctx.root)
}

console.log('--- ⑦ 无 plan.md/tasks.md → no-plan ---')
{
  const ctx = setup()
  const s = call(ctx)
  assert(s.source === 'no-plan' && s.report.length > 0, 'source=no-plan，report 非空')
  cleanup(ctx.root)
}

console.log('--- ⑧ plan.md 无 task checkbox → no-tasks ---')
{
  const ctx = setup()
  fs.writeFileSync(path.join(ctx.changeDir, 'plan.md'), '# Plan\n\n无任务列表\n')
  const s = call(ctx)
  assert(s.source === 'no-tasks', 'source=no-tasks')
  cleanup(ctx.root)
}

console.log('--- ⑨ cannot_verify verdict（非 fail）→ 视为完成 ---')
{
  const ctx = setup()
  writePlan(ctx.changeDir, [{ id: '01', checked: true }])
  writeMarker(ctx.runtimeRoot, CN, 'run-1')
  writeReview(ctx.runtimeRoot, 'run-1', '01', 'cannot_verify', 'pass', { requiredEvidence: ['integration log'] })
  const s = call(ctx)
  assert(s.completed === 1, 'cannot_verify≠fail → completed')
  cleanup(ctx.root)
}

console.log('--- ⑩ tasks.md 回退（无 plan.md 但有 tasks.md）→ 正常解析 ---')
{
  const ctx = setup()
  fs.writeFileSync(path.join(ctx.changeDir, 'tasks.md'), '- [x] task-01 a\n- [ ] task-02 b\n')
  writeMarker(ctx.runtimeRoot, CN, 'run-1')
  writeReview(ctx.runtimeRoot, 'run-1', '01', 'pass', 'pass')
  writeReview(ctx.runtimeRoot, 'run-1', '02', 'pass', 'pass')
  const s = call(ctx)
  assert(s.source === 'review.json' && s.total === 2 && s.completed === 2, 'tasks.md 回退：total=2/completed=2')
  cleanup(ctx.root)
}

console.log(`\n${'='.repeat(50)}`)
console.log(`✅ 通过: ${passed}  ❌ 失败: ${failed}`)
if (failures.length) { console.log('失败项:'); failures.forEach(f => console.log('  - ' + f)) }
console.log('='.repeat(50))
if (failed > 0) process.exit(1)
