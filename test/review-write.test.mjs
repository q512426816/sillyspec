/**
 * `sillyspec review write`（单 task review.json 命令式写入，2026-09-07 noAI 主流程批次 T2-4）
 * CLI 行为测试。
 *
 * 锁住：
 *  1. happy path：verdict/notes 由参数给，base/head/changedFiles/diffPaths CLI 代算
 *     （meta.baselineCommit → base；worktree 未提交改动按 allowed_paths 归属切片）
 *  2. 防误写：review.json 已存在 → 拒覆盖 exit 1；--force 越过
 *  3. cannot_verify 无 --evidence → exit 1（schema 硬要求）
 *  4. 归属切片为空 → exit 1 + diff 候选提示；--changed-files 显式覆盖可过
 *  5. 落盘产物通过 validateReviewSchema（写后即可过 gate）
 */
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'
import { makeRepo, initChange, runCLI, cleanup, report } from './_cli-step-harness.mjs'
import { validateReviewSchema } from '../src/task-review.js'

const count = { passed: 0, failed: 0, failures: [] }
const assert = (cond, msg) => { cond ? (count.passed++, console.log(`  ✅ PASS: ${msg}`)) : (count.failed++, count.failures.push(msg), console.log(`  ❌ FAIL: ${msg}`)) }

function git(dir, args) {
  return execFileSync('git', args, { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
}

function mkTaskCard(changeDir, taskId, allowedPath) {
  writeFileSync(join(changeDir, 'tasks', `${taskId}.md`),
    `---\ntask: ${taskId}\ngoal: 测试任务\nallowed_paths:\n  - ${allowedPath}\n---\n\n# ${taskId}\n`)
}

/** fixture：change + task 卡 + in-place 式 meta（baselineCommit=commit1）+ 未提交 src/foo.js */
function fixture(prefix, cn, allowedPath = 'src/foo.js') {
  const { cwd, specBase } = makeRepo(prefix)
  const changeDir = join(specBase, 'changes', cn)
  mkdirSync(join(changeDir, 'tasks'), { recursive: true })
  mkTaskCard(changeDir, 'task-01', allowedPath)
  const c1 = git(cwd, ['rev-parse', 'HEAD'])
  // 未提交实现文件（子代理不 commit 的常态口径）
  mkdirSync(join(cwd, 'src'), { recursive: true })
  writeFileSync(join(cwd, 'src', 'foo.js'), 'export const a = 1\n')
  // in-place 式 meta：worktreePath=cwd + baselineCommit（writeTaskReview 的 base/porcelain 并入源）
  const metaDir = join(specBase, '.runtime', 'worktrees', cn)
  mkdirSync(metaDir, { recursive: true })
  writeFileSync(join(metaDir, 'meta.json'), JSON.stringify({
    branch: 'main', worktreePath: cwd, baseHash: c1, baselineCommit: c1, mode: 'in-place',
  }))
  return { cwd, specBase, changeDir, c1 }
}

console.log('=== review write（单 task review.json 命令式写入）===\n')

console.log('--- 用例1: happy path——mechanics 全代算 + schema 通过 ---')
{
  const cn = '2026-09-07-rw-ok'
  const { cwd, specBase, changeDir } = fixture('rw-ok-', cn)
  const r = runCLI(['--dir', cwd, 'review', 'write', '--change', cn, '--task', 'task-01',
    '--spec', 'pass', '--quality', 'pass', '--notes', '对照 brief 抽查通过'], { cwd })
  assert(r.status === 0, `exit 0（实际 ${r.status}；输出尾：${r.combined.slice(-200)}）`)
  assert(r.combined.includes('review.json 已写入'), 'stdout 确认写入路径')
  const runId = r.combined.match(/executeRunId: (exec-[^\s]+)/)?.[1]
  assert(!!runId, `输出 executeRunId（${runId}）`)
  const review = JSON.parse(readFileSync(join(specBase, '.runtime', 'execute-runs', runId, 'tasks', 'task-01', 'review.json'), 'utf8'))
  assert(review.specVerdict === 'pass' && review.qualityVerdict === 'pass', 'verdict 按参数落盘')
  assert(review.changedFiles.includes('src/foo.js'), 'changedFiles=CLI 归属切片（含未提交 src/foo.js）')
  assert(Array.isArray(review.diffPaths) && review.diffPaths.includes('src/foo.js'), 'diffPaths=task 卡 allowed_paths')
  assert(typeof review.base === 'string' && review.base.length >= 7, 'base=meta.baselineCommit 代算')
  const schema = validateReviewSchema(review)
  assert(schema.ok, `落盘产物过 schema（${(schema.errors || []).join(';')}）`)
}

console.log('\n--- 用例2: 已存在拒覆盖；--force 越过 ---')
{
  const cn = '2026-09-07-rw-force'
  const { cwd } = fixture('rw-force-', cn)
  const args = ['--dir', cwd, 'review', 'write', '--change', cn, '--task', 'task-01', '--spec', 'pass', '--quality', 'pass']
  const r1 = runCLI(args, { cwd })
  assert(r1.status === 0, '首次写入成功')
  const r2 = runCLI(args, { cwd })
  assert(r2.status !== 0 && r2.combined.includes('拒绝覆盖'), `二次写入拒覆盖 exit 非 0（实际 ${r2.status}）`)
  const r3 = runCLI([...args, '--force'], { cwd })
  assert(r3.status === 0, '--force 越过成功')
}

console.log('\n--- 用例3: cannot_verify 无 evidence → 拒 ---')
{
  const cn = '2026-09-07-rw-cv'
  const { cwd } = fixture('rw-cv-', cn)
  const r = runCLI(['--dir', cwd, 'review', 'write', '--change', cn, '--task', 'task-01',
    '--spec', 'cannot_verify', '--quality', 'cannot_verify'], { cwd })
  assert(r.status !== 0 && r.combined.includes('--evidence'), `无 evidence 拒（实际 ${r.status}）`)
  const r2 = runCLI(['--dir', cwd, 'review', 'write', '--change', cn, '--task', 'task-01',
    '--spec', 'cannot_verify', '--quality', 'cannot_verify', '--evidence', '需人工跑集成验证'], { cwd })
  assert(r2.status === 0, '带 evidence 通过')
}

console.log('\n--- 用例4: 归属切片为空 → 报错带候选；--changed-files 覆盖可过 ---')
{
  const cn = '2026-09-07-rw-empty'
  const { cwd } = fixture('rw-empty-', cn, 'src/nope.js') // allowed_paths 不命中实际改动
  const r = runCLI(['--dir', cwd, 'review', 'write', '--change', cn, '--task', 'task-01',
    '--spec', 'pass', '--quality', 'pass'], { cwd })
  assert(r.status !== 0 && r.combined.includes('归属切片为空'), `空归属报错（实际 ${r.status}）`)
  assert(r.combined.includes('src/foo.js'), '报错列 diff 候选（src/foo.js）')
  const r2 = runCLI(['--dir', cwd, 'review', 'write', '--change', cn, '--task', 'task-01',
    '--spec', 'pass', '--quality', 'pass', '--changed-files', 'src/foo.js'], { cwd })
  assert(r2.status === 0, '--changed-files 显式覆盖通过')
}

console.log('\n--- 用例5: 跨仓 task（repo≠main）显式拒绝 ---')
{
  const cn = '2026-09-07-rw-cross'
  const { cwd, specBase, changeDir } = fixture('rw-cross-', cn)
  writeFileSync(join(changeDir, 'tasks', 'task-02.md'),
    '---\ntask: task-02\ngoal: 跨仓任务\nrepo: other\nallowed_paths:\n  - backend/app.py\n---\n\n# task-02\n')
  const r = runCLI(['--dir', cwd, 'review', 'write', '--change', cn, '--task', 'task-02',
    '--spec', 'pass', '--quality', 'pass'], { cwd })
  assert(r.status !== 0 && r.combined.includes('跨仓'), `跨仓 task 拒绝并指引 adopt 路径（实际 ${r.status}）`)
}

cleanup()
report(count.passed, count.failed, count.failures)
