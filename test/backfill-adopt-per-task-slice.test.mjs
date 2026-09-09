// backfill-reviews --adopt 主仓按 task 卡锚点切片（docs/sillyspec/backfill-reviews-adopt-empties-changedfiles）
//
// 实证形态：per-task commit 模式下手工填好的 review（base=本 task 起点、head=本 task 提交、
// changedFiles 非空）被 --adopt 冲成「worktree 基线..当前 HEAD」+ changedFiles=[]。
// 已有前置修复：空切片不冲声明（2026-09-08 当天落地）。本用例锁住剩余缺口：
// 主仓 task 卡带 base_commit/head_commit 锚点时，adopt 按锚点切片而非共用全区间。
//
// 进程外 CLI e2e（真实 git 提交链），不碰真实 .sillyspec。
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { execFileSync, spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const cliBin = join(fileURLToPath(import.meta.url).replace(/[\\/]test[\\/].*$/, ''), 'src', 'index.js')

const passed = [], failed = []
const assert = (cond, msg) => {
  cond ? (passed.push(msg), console.log(`  ✅ ${msg}`))
    : (failed.push(msg), console.log(`  ❌ ${msg}`))
}
const git = (dir, args) => execFileSync('git', args, { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()

const tmpRoots = []
function makeRepo() {
  const proj = mkdtempSync(join(tmpdir(), `adopt-slice-${process.pid}-`))
  tmpRoots.push(proj)
  return proj
}
process.on('exit', () => { for (const d of tmpRoots) { try { rmSync(d, { recursive: true, force: true }) } catch {} } })

function runCLI(args, cwd) {
  const res = spawnSync(process.execPath, [cliBin, ...args], { cwd, encoding: 'utf8', timeout: 60_000 })
  return { stdout: res.stdout || '', stderr: res.stderr || '', status: res.status }
}

console.log('--- adopt 主仓 per-task 锚点切片：卡带 base/head_commit → 不冲真实 review ---')
{
  const proj = makeRepo()
  git(proj, ['init', '-q']); git(proj, ['config', 'user.email', 't@t.local']); git(proj, ['config', 'user.name', 't']); git(proj, ['config', 'commit.gpgsign', 'false'])
  writeFileSync(join(proj, '.gitignore'), '.sillyspec/\n')
  writeFileSync(join(proj, 'main.js'), 'console.log(1)\n')
  git(proj, ['add', '.']); git(proj, ['commit', '-q', '-m', 'init'])
  const baseline = git(proj, ['rev-parse', 'HEAD'])

  // per-task commit 链：task-01 提交 A（feature.js），task-02 提交 B（shared/other.js）
  writeFileSync(join(proj, 'feature.js'), 'export const x = 1\n')
  git(proj, ['add', '.']); git(proj, ['commit', '-q', '-m', 'task-01: feature'])
  const headA = git(proj, ['rev-parse', 'HEAD'])
  mkdirSync(join(proj, 'shared'), { recursive: true })
  writeFileSync(join(proj, 'shared', 'other.js'), 'export const y = 2\n')
  git(proj, ['add', '.']); git(proj, ['commit', '-q', '-m', 'task-02: shared'])
  const headB = git(proj, ['rev-parse', 'HEAD'])

  const specBase = join(proj, '.sillyspec')
  const wtMetaDir = join(specBase, '.runtime', 'worktrees', 'adoptc')
  mkdirSync(wtMetaDir, { recursive: true })
  writeFileSync(join(wtMetaDir, 'meta.json'), JSON.stringify({ changeName: 'adoptc', baseHash: baseline, mode: 'in-place-fallback', worktreePath: proj }))

  const tasksDir = join(specBase, 'changes', 'adoptc', 'tasks')
  mkdirSync(tasksDir, { recursive: true })
  // task-01 卡带锚点（per-task commit 模式的真实形态）；task-02 无锚点（回落 change 级）
  writeFileSync(join(tasksDir, 'task-01.md'),
    `---\nid: task-01\nallowed_paths: [feature.js]\nbase_commit: ${baseline}\nhead_commit: ${headA}\n---\n# task-01\n实现 feature.js\n`)
  writeFileSync(join(tasksDir, 'task-02.md'),
    '---\nid: task-02\nallowed_paths: [shared/]\n---\n# task-02\n实现 shared/other.js\n')

  const runId = 'exec-20260908-120000'
  const runTasks = join(specBase, '.runtime', 'execute-runs', runId, 'tasks')
  mkdirSync(join(runTasks, 'task-01'), { recursive: true })
  writeFileSync(join(specBase, '.runtime', `current-execute-run-id-adoptc`), runId + '\n')
  // 手工填好的真实 review（本坑主角：adopt 前正确，修复前会被冲成 baseline..headB + 空切片）
  writeFileSync(join(runTasks, 'task-01', 'review.json'), JSON.stringify({
    schemaVersion: 2, task: 'task-01', base: baseline, head: headA,
    changedFiles: ['feature.js'],
    specVerdict: 'pass', qualityVerdict: 'pass', reviewerNotes: 'agent 语义结论',
  }, null, 2))

  const r = runCLI(['backfill-reviews', '--change', 'adoptc', '--adopt'], proj)
  assert(r.status === 0, `adopt 成功退出（实际 ${r.status}；stderr=${r.stderr.slice(0, 200)}）`)

  const after = JSON.parse(readFileSync(join(runTasks, 'task-01', 'review.json'), 'utf8'))
  assert(after.base === baseline, `base 保持本 task 起点（实际 ${String(after.base).slice(0, 8)}，期望 ${baseline.slice(0, 8)}）——修复前被冲成 worktree 基线`)
  assert(after.head === headA, `head 保持本 task 提交（实际 ${String(after.head).slice(0, 8)}，期望 ${headA.slice(0, 8)}）——修复前被冲成当前 HEAD`)
  assert(Array.isArray(after.changedFiles) && after.changedFiles.includes('feature.js'),
    `changedFiles 保留真实切片（实际 ${JSON.stringify(after.changedFiles)}）`)
  assert(!after.changedFiles.includes('shared/other.js'), '不含 task-02 文件（锚点切片不混入前序/后序 task 改动）')
  assert(after.specVerdict === 'pass' && after.reviewerNotes === 'agent 语义结论', 'verdict/语义结论原样保留')
}

console.log(`\n${failed.length === 0 ? '✅' : '❌'} backfill-adopt-per-task-slice：通过 ${passed.length} / 失败 ${failed.length}`)
if (failed.length > 0) process.exitCode = 1
