/**
 * verify-required-evidence-check.test.mjs — verify required-evidence 探针（advisory）单测
 *
 * 覆盖 sss1.md 矛盾2：execute 写 verify-required-evidence.json（cannot_verify 任务的 evidence），
 * verify-postcheck 现在读它做 advisory 对账——查每个 cannot_verify 任务是否在 verify-result.md 体现。
 * CLI 只查"任务被提及"，evidence 满足度由 agent 自报告，不阻断（与删除探针同 altitude）。
 *
 * Case：无 changeName→skipped / 无 evidence 文件→skipped / 全体现→passed /
 *       部分未体现→warning / 损坏 JSON→skipped / 空 items→passed
 */
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { runVerifyRequiredEvidenceCheck } from '../src/verify-postcheck.js'

let passed = 0
let failed = 0
function assert(name, cond, detail = '') {
  if (cond) { console.log(`✅ PASS: ${name}`); passed++ }
  else { console.error(`❌ FAIL: ${name}${detail ? ' — ' + detail : ''}`); failed++ }
}

function setup(change = 'c') {
  const specBase = mkdtempSync(join(tmpdir(), 'vevid-'))
  const changeDir = join(specBase, 'changes', change)
  mkdirSync(changeDir, { recursive: true })
  return { specBase, changeDir, change }
}
function writeEvidence(changeDir, items) {
  writeFileSync(join(changeDir, 'verify-required-evidence.json'),
    JSON.stringify({ generatedAt: '2026-08-07T00:00:00Z', schemaVersion: 1, items }, null, 2))
}
function writeReport(changeDir, text) {
  writeFileSync(join(changeDir, 'verify-result.md'), text)
}
const run = (specBase, change) => runVerifyRequiredEvidenceCheck({ cwd: specBase, specBase, changeName: change })

// Case 1：无 changeName → skipped
{
  const r = runVerifyRequiredEvidenceCheck({ cwd: '/tmp', specBase: '/tmp', changeName: null })
  assert('无 changeName → skipped', r.status === 'skipped', JSON.stringify(r))
}

// Case 2：无 evidence 文件 → skipped（execute 无 cannot_verify 任务）
{
  const { specBase, change } = setup()
  const r = run(specBase, change)
  assert('无 evidence 文件 → skipped', r.status === 'skipped', JSON.stringify(r))
  rmSync(specBase, { recursive: true })
}

// Case 3：items 任务全在 verify-result.md 体现 → passed
{
  const { specBase, changeDir, change } = setup()
  writeEvidence(changeDir, [
    { task: 'task-01', verdict: 'cannot_verify', evidence: ['需要部署后核对日志'] },
    { task: 'task-03', verdict: 'cannot_verify', evidence: ['e2'] },
  ])
  writeReport(changeDir, '# 验证报告\n\n## 结论\n\nPASS\n\ntask-01 evidence：satisfied（日志已核对）。\ntask-03 evidence：satisfied。\n')
  const r = run(specBase, change)
  assert('items 全体现 → passed', r.status === 'passed' && r.unacknowledged.length === 0, JSON.stringify(r))
  rmSync(specBase, { recursive: true })
}

// Case 4：部分 cannot_verify 任务未在 verify-result.md 体现 → warning
{
  const { specBase, changeDir, change } = setup()
  writeEvidence(changeDir, [
    { task: 'task-01', verdict: 'cannot_verify', evidence: ['e1'] },
    { task: 'task-02', verdict: 'cannot_verify', evidence: ['e2', 'e3'] },
  ])
  writeReport(changeDir, '# 验证报告\n\n## 结论\n\ntask-01 已核对。\n')  // 只提 task-01，漏 task-02
  const r = run(specBase, change)
  assert('部分任务未体现 → warning 且 unacknowledged 含 task-02',
    r.status === 'warning' && r.unacknowledged.length === 1 && r.unacknowledged[0].task === 'task-02',
    JSON.stringify(r))
  rmSync(specBase, { recursive: true })
}

// Case 5：损坏 JSON → skipped（不崩溃）
{
  const { specBase, changeDir, change } = setup()
  writeFileSync(join(changeDir, 'verify-required-evidence.json'), '{ not valid json')
  writeReport(changeDir, '# x\n')
  const r = run(specBase, change)
  assert('损坏 JSON → skipped', r.status === 'skipped', JSON.stringify(r))
  rmSync(specBase, { recursive: true })
}

// Case 6：空 items → passed（0 个 cannot_verify 任务待体现）
{
  const { specBase, changeDir, change } = setup()
  writeEvidence(changeDir, [])
  writeReport(changeDir, '# 验证报告\n')
  const r = run(specBase, change)
  assert('空 items → passed', r.status === 'passed', JSON.stringify(r))
  rmSync(specBase, { recursive: true })
}

// Case 7：verify-result.md 不存在但有 evidence → warning（所有任务都未体现）
{
  const { specBase, changeDir, change } = setup()
  writeEvidence(changeDir, [{ task: 'task-01', verdict: 'cannot_verify', evidence: ['e1'] }])
  // 不写 verify-result.md
  const r = run(specBase, change)
  assert('evidence 存在但 verify-result.md 缺失 → warning',
    r.status === 'warning' && r.unacknowledged.length === 1, JSON.stringify(r))
  rmSync(specBase, { recursive: true })
}

console.log(`\n${failed === 0 ? '✅ 全部通过' : `❌ ${failed} 项失败`}`)
if (failed > 0) throw new Error(`${failed} test(s) failed`)
