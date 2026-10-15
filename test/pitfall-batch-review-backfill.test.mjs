/**
 * 2026-10-15-pitfall-batch-clearance FR-07 — execute 批量完成自动补 per-task review 草稿
 *
 * 坑 task-review-retired-archive-mismatch（消费仓 archive step2 实证）：Task Review 层退役后
 * execute 不再产 per-task review.json，archive 完成度判定（真相源=review.json）全量
 * 「4/4 缺失」卡归档门口，被迫 review write 手工誊写。
 * 锁死契约：detectExecuteBatchFinish 在复核循环前对缺失面调 generateTaskReviewDrafts（幂等），
 * 草稿落 execute-runs/<runId>/tasks/task-NN/review.json——批量复核与 archive 真相源天然在场。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { execFileSync } from 'node:child_process'
import { detectExecuteBatchFinish } from '../src/run/complete.js'
import { initChange, cleanup } from './_complete-step-harness.mjs'

const git = (cwd, args) => execFileSync('git', ['-C', cwd, ...args], { encoding: 'utf8' })

async function fixture(prefix, changeName) {
  const { mkdtempSync: mk } = await import('node:fs')
  const proj = mk(join(tmpdir(), prefix))
  git(proj, ['init', '-q', '-b', 'main'])
  git(proj, ['config', 'core.autocrlf', 'false'])
  writeFileSync(join(proj, '.gitignore'), '.sillyspec/\n')
  writeFileSync(join(proj, 'base.txt'), 'base\n')
  git(proj, ['add', '.'])
  git(proj, ['-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-qm', 'init'])
  const specBase = join(proj, '.sillyspec')
  const pm = await initChange(proj, specBase, changeName)
  const changeDir = join(specBase, 'changes', changeName)
  mkdirSync(join(changeDir, 'tasks'), { recursive: true })
  writeFileSync(join(changeDir, 'tasks.md'), `- [x] task-01: a\n- [x] task-02: b\n`)
  writeFileSync(join(changeDir, 'tasks', 'task-01.md'),
    '---\ntask: task-01\nallowed_paths:\n  - src/a.js\nacceptance:\n  - a 行为\n---\n# task-01\n')
  writeFileSync(join(changeDir, 'tasks', 'task-02.md'),
    '---\ntask: task-02\nallowed_paths:\n  - src/b.js\nacceptance:\n  - b 行为\n---\n# task-02\n')
  // 代码证据：worktree 形态（wt-commit 真实路径）——分支建在独立 worktree，meta 登记锚点
  const initHash = git(proj, ['rev-parse', 'HEAD']).trim()
  const wtPath = join(proj, 'wt')
  git(proj, ['worktree', 'add', '-q', '-b', `sillyspec/${changeName}`, wtPath])
  mkdirSync(join(wtPath, 'src'), { recursive: true })
  writeFileSync(join(wtPath, 'src', 'a.js'), 'export const a = 1\n')
  writeFileSync(join(wtPath, 'src', 'b.js'), 'export const b = 2\n')
  git(wtPath, ['add', '.'])
  git(wtPath, ['-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-qm', `(task-01) (task-02) feat`])
  mkdirSync(join(specBase, '.runtime', 'worktrees', changeName), { recursive: true })
  writeFileSync(join(specBase, '.runtime', 'worktrees', changeName, 'meta.json'),
    JSON.stringify({ worktreePath: wtPath, branch: `sillyspec/${changeName}`, baselineCommit: initHash, baseHash: initHash, mode: 'worktree' }))
  const steps = [{ name: 's1', status: 'pending' }, { name: 's2', status: 'pending' }]
  return { proj, specBase, pm, changeDir, changeName, steps }
}

test.after(() => { cleanup() })

test('FR-07：批量完成前自动补 per-task 草稿（marker/run 一并建立，幂等）', async () => {
  const f = await fixture('pbr-', 'pbr-x')
  const runtimeRoot = join(f.specBase, '.runtime')

  const r1 = await detectExecuteBatchFinish({ pm: f.pm, stageName: 'execute', changeName: f.changeName, cwd: f.proj, specBase: f.specBase, platformOpts: {}, steps: f.steps.map(s => ({ ...s })) })
  // 草稿已产（run 目录 + marker）
  const runsDir = join(runtimeRoot, 'execute-runs')
  const runs = existsSync(runsDir) ? readdirSync(runsDir) : []
  assert.ok(runs.length > 0, `execute-runs 已建立（got ${JSON.stringify(runs)}；batched=${r1.batched} reason=${r1.reason}）`)
  const runId = runs[0]
  for (const t of ['task-01', 'task-02']) {
    const p = join(runsDir, runId, 'tasks', t, 'review.json')
    assert.ok(existsSync(p), `${t} review.json 草稿在场`)
    const rv = JSON.parse(readFileSync(p, 'utf8'))
    assert.equal(rv.specVerdict, 'cannot_verify', `${t} 草稿 verdict=cannot_verify（待复核升级，不冒充 pass）`)
  }
  assert.ok(existsSync(join(runtimeRoot, `current-execute-run-id-${f.changeName}`)), 'runId marker 建立')
  if (r1.batched) assert.equal(r1.aligned, 2, '批量对齐剩余 step')
  else assert.ok(!String(r1.reason || '').includes('review 缺失') || String(r1.reason).includes('草稿零 diff'),
    `若阻断须为草稿零 diff 而非 review 缺失（reason=${r1.reason}）`)

  // 幂等：再次触发不覆盖、不重复生成
  const before = JSON.parse(readFileSync(join(runsDir, runId, 'tasks', 'task-01', 'review.json'), 'utf8'))
  await detectExecuteBatchFinish({ pm: f.pm, stageName: 'execute', changeName: f.changeName, cwd: f.proj, specBase: f.specBase, platformOpts: {}, steps: f.steps.map(s => ({ ...s })) })
  const after = JSON.parse(readFileSync(join(runsDir, runId, 'tasks', 'task-01', 'review.json'), 'utf8'))
  assert.deepEqual(after, before, '已存在 review 不被覆盖（幂等）')
})
