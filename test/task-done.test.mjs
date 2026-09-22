/**
 * task-done.test.mjs — `sillyspec task done` 四合一（r5l-forensic-verdict 方案 1 / 评审护栏#3）
 *
 * 覆盖验收三面：
 *   ① 单命令四段结果行：review.json 落盘 + tasks.md 自动勾选 + 进行中标记清除 + 可选 wt-commit
 *      ——13 任务场景 4 次 CLI 收尾往返合并为 1；
 *   ② 中断半态重入幂等（护栏#3 硬验收）：verdict 指纹一致跳过写入 / 标记不在跳过 finish /
 *      wt-commit 无变更自然 skip——重入同命令从断点续，不重复副作用；
 *   ③ 既有通道零回归语义：verdict 改判默认拒改写（writeTaskReview 拒覆盖继承）、
 *      --force 越过（同款逃生门）；wt-commit 失败精确报告已完成子步。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'

const { runTaskDone } = await import('../src/task-done.js')
const { WorktreeManager } = await import('../src/worktree.js')

const CHANGE = '2026-09-22-td-demo'
const git = (cwd, ...args) => execFileSync('git', ['-c', 'user.email=t@t', '-c', 'user.name=t', ...args], { cwd, encoding: 'utf8' })

/** 夹具：git 仓 + task 卡 + tasks.md 勾选面 + 真实 worktree（含未提交改动供 wt-commit）+ 进行中标记 */
function makeFixture(tag) {
  const root = mkdtempSync(join(tmpdir(), `td-${tag}-`))
  const repo = join(root, 'repo')
  mkdirSync(repo, { recursive: true })
  git(repo, 'init', '--quiet')
  writeFileSync(join(repo, 'service.js'), 'export const v = "base"\n', 'utf8')
  writeFileSync(join(repo, '.gitignore'), '.sillyspec/\n', 'utf8')
  git(repo, 'add', '.')
  git(repo, 'commit', '--quiet', '-m', 'base')
  const specBase = join(repo, '.sillyspec')
  const changeDir = join(specBase, 'changes', CHANGE)
  mkdirSync(join(changeDir, 'tasks'), { recursive: true })
  writeFileSync(join(changeDir, 'tasks', 'task-01.md'), [
    '---',
    'task: task-01',
    'allowed_paths:',
    '  - service.js',
    '---',
    '',
    '# task-01 改 service',
  ].join('\n'), 'utf8')
  writeFileSync(join(changeDir, 'tasks.md'), '- [ ] task-01: 改 service\n', 'utf8')
  // 进行中标记（task start 等价物）
  const markerDir = join(specBase, '.runtime', 'task-progress', CHANGE)
  mkdirSync(markerDir, { recursive: true })
  writeFileSync(join(markerDir, 'task-01.json'), JSON.stringify({ task: 'task-01', change: CHANGE, note: '', startedAt: new Date().toISOString() }), 'utf8')
  // 真 worktree + 未提交改动（wt-commit 面）
  const wm = new WorktreeManager({ cwd: repo })
  const { worktreePath } = wm.create(CHANGE)
  writeFileSync(join(worktreePath, 'service.js'), 'export const v = "task-done"\n', 'utf8')
  return { root, repo, wt: worktreePath, specBase, changeDir, markerDir }
}

const clean = (root) => { try { rmSync(root, { recursive: true, force: true }) } catch { /* Windows 句柄残留容忍 */ } }
const step = (r, name) => r.steps.find((s) => s.name === name)
const wtHead = (wt) => git(wt, 'rev-parse', 'HEAD').trim()

test('四合一 happy path：单命令四段结果行（review 落盘/勾选/标记清除/wt-commit）', async () => {
  const f = makeFixture('happy')
  try {
    const r = await runTaskDone({
      changeName: CHANGE, cwd: f.repo, taskId: 'task-01', verdict: 'pass',
      notes: '实现核对通过', commitMessage: 'task-01: change service', pathspecs: ['service.js'],
      markerDir: f.markerDir, platformOpts: {},
    })
    assert.ok(r.ok, `四步应全部成功：${JSON.stringify(r.steps, null, 1)}`)
    assert.equal(step(r, 'review.json').status, 'done')
    assert.equal(step(r, 'tasks.md 勾选').status, 'done', `勾选应落：${step(r, 'tasks.md 勾选').detail}`)
    assert.equal(step(r, 'task finish').status, 'done')
    assert.equal(step(r, 'wt-commit').status, 'done')
    // 落盘事实：review.json verdict + tasks.md 勾选 + 标记清除 + worktree HEAD 前移
    const reviewDir = join(f.specBase, '.runtime')
    const runId = readFileSync(join(reviewDir, `current-execute-run-id-${CHANGE}`), 'utf8').trim()
    const rev = JSON.parse(readFileSync(join(reviewDir, 'execute-runs', runId, 'tasks', 'task-01', 'review.json'), 'utf8'))
    assert.equal(rev.specVerdict, 'pass')
    assert.equal(rev.qualityVerdict, 'pass')
    assert.match(readFileSync(join(f.changeDir, 'tasks.md'), 'utf8'), /- \[x\] task-01/, 'checkbox 已按 verdict 勾选')
    assert.ok(!existsSync(join(f.markerDir, 'task-01.json')), '进行中标记已清除')
    assert.match(step(r, 'wt-commit').detail, /^[0-9a-f]{7,}/, 'wt-commit 结果行带 shortHead')
    assert.equal(git(f.wt, 'status', '--porcelain', '--', 'service.js'), '', '本 task 改动已提交（残留仅 WorktreeManager 自身 meta.json，不属 task 面）')
  } finally { clean(f.root) }
})

test('断点重入幂等（护栏#3）：同 verdict 复跑全跳过、零重复副作用、HEAD 不动', async () => {
  const f = makeFixture('idem')
  try {
    const first = await runTaskDone({
      changeName: CHANGE, cwd: f.repo, taskId: 'task-01', verdict: 'pass',
      commitMessage: 'task-01: change service', pathspecs: ['service.js'],
      markerDir: f.markerDir, platformOpts: {},
    })
    assert.ok(first.ok)
    const headAfterFirst = wtHead(f.wt)
    const reviewDir = join(f.specBase, '.runtime')
    const runId = readFileSync(join(reviewDir, `current-execute-run-id-${CHANGE}`), 'utf8').trim()
    const reviewPath = join(reviewDir, 'execute-runs', runId, 'tasks', 'task-01', 'review.json')
    const reviewContent = readFileSync(reviewPath, 'utf8')
    const second = await runTaskDone({
      changeName: CHANGE, cwd: f.repo, taskId: 'task-01', verdict: 'pass',
      commitMessage: 'task-01: change service', pathspecs: ['service.js'],
      markerDir: f.markerDir, platformOpts: {},
    })
    assert.ok(second.ok, '重入应成功（幂等跳过也是终态）')
    assert.equal(step(second, 'review.json').status, 'skipped', `指纹一致跳过写入：${step(second, 'review.json').detail}`)
    assert.equal(step(second, 'task finish').status, 'skipped', '无标记跳过 finish')
    assert.equal(step(second, 'wt-commit').status, 'skipped', `无变更自然 skip：${step(second, 'wt-commit').detail}`)
    assert.equal(readFileSync(reviewPath, 'utf8'), reviewContent, 'review.json 逐字节未动（幂等不重写）')
    assert.equal(wtHead(f.wt), headAfterFirst, '重入不产生新提交')
  } finally { clean(f.root) }
})

test('verdict 改判：默认拒改写（拒覆盖语义继承）+ --force 越过；失败精确报告已完成子步', async () => {
  const f = makeFixture('verdict')
  try {
    const first = await runTaskDone({ changeName: CHANGE, cwd: f.repo, taskId: 'task-01', verdict: 'pass', markerDir: f.markerDir, platformOpts: {} })
    assert.ok(first.ok)
    // 改判 fail 无 --force → 首子步即拒，报告「无——首子步即失败」
    const second = await runTaskDone({ changeName: CHANGE, cwd: f.repo, taskId: 'task-01', verdict: 'fail', markerDir: f.markerDir, platformOpts: {} })
    assert.ok(!second.ok, '改判默认拒绝')
    assert.equal(step(second, 'review.json').status, 'failed')
    assert.match(step(second, 'review.json').detail, /--force/)
    // --force 越过 → 覆盖写入（与 review write --force 同款逃生门）
    const third = await runTaskDone({ changeName: CHANGE, cwd: f.repo, taskId: 'task-01', verdict: 'fail', markerDir: f.markerDir, platformOpts: {}, force: true })
    assert.ok(third.ok)
    assert.equal(step(third, 'review.json').status, 'done')
    assert.match(step(third, 'review.json').detail, /覆盖写入/)
    // fail verdict 不勾选（shouldAutoCheckTask 既有语义）——勾选步为 skipped
    assert.equal(step(third, 'tasks.md 勾选').status, 'skipped')
  } finally { clean(f.root) }
})

test('中段失败精确报告：wt-commit 失败时 1-3 已完成点名 + 修复后重入从断点续', async () => {
  const f = makeFixture('midfail')
  try {
    const r1 = await runTaskDone({
      changeName: CHANGE, cwd: f.repo, taskId: 'task-01', verdict: 'pass',
      commitMessage: 'task-01: change service', pathspecs: [], pathspecFile: join(f.root, 'no-such-pathspec.txt'),
      markerDir: f.markerDir, platformOpts: {},
    })
    assert.ok(!r1.ok, 'wt-commit 子步失败 → 整体非终态')
    assert.equal(step(r1, 'review.json').status, 'done', '失败前置子步已完成')
    assert.equal(step(r1, 'tasks.md 勾选').status, 'done')
    assert.equal(step(r1, 'task finish').status, 'done', '标记已清（断点已越过的子步）')
    assert.equal(step(r1, 'wt-commit').status, 'failed')
    assert.match(step(r1, 'wt-commit').detail, /不存在/)
    // 修复后重入：1-3 幂等跳过，仅 4 真跑
    const r2 = await runTaskDone({
      changeName: CHANGE, cwd: f.repo, taskId: 'task-01', verdict: 'pass',
      commitMessage: 'task-01: change service', pathspecs: ['service.js'],
      markerDir: f.markerDir, platformOpts: {},
    })
    assert.ok(r2.ok, '重入成功')
    assert.equal(step(r2, 'review.json').status, 'skipped')
    assert.equal(step(r2, 'task finish').status, 'skipped')
    assert.equal(step(r2, 'wt-commit').status, 'done', '仅断点子步真跑')
    assert.equal(git(f.wt, 'status', '--porcelain', '--', 'service.js'), '', '断点子步补跑后改动提交干净')
  } finally { clean(f.root) }
})
