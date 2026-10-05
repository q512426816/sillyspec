/**
 * 2026-10-05-branch-ref-anchor-scope 回归：_branchReviewReferences 双探针——锚定只护分支独有 commit
 *
 * 背景（2026-10-05 实证）：worktree 分支自带全部主仓历史，单探针「hash 是分支祖先或自身」把
 * 旧 review.json 对历史主仓 commit 的引用全部误中（apply 自动 cleanup 打印「被 56 个 task
 * review.json 引用」实为无关历史件），误打 sillyspec-audit tag + 误导性输出。删分支 ref 后
 * 真正会悬空的只有分支独有 commit（baseline checkpoint / task commit）。
 *
 * 锁定语义：
 *   1. 引用主仓 HEAD 可达的历史 commit → 不计入（FR-01 不锚定）
 *   2. 引用分支独有 commit → 计入（FR-02 锚定保可达，既有行为不变）
 *   3. 未知/畸形 hash → 既有跳过语义保持（FR-03 非真实对象无可悬空链）
 */
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { execSync } from 'child_process'
import { WorktreeManager } from '../src/worktree.js'

let passed = 0, failed = 0
const failures = []
function assert(cond, msg) {
  if (cond) { passed++; console.log(`  ✅ PASS: ${msg}`) }
  else { failed++; failures.push(msg); console.log(`  ❌ FAIL: ${msg}`) }
}

console.log('=== _branchReviewReferences 双探针（2026-10-05-branch-ref-anchor-scope）===\n')

const root = mkdtempSync(join(tmpdir(), 'wt-anchor-scope-'))
const gitRun = (cmd) => execSync(cmd, { cwd: root, stdio: ['ignore', 'ignore', 'ignore'] })
try {
  gitRun('git init -b main')
  gitRun('git config user.email t@t')
  gitRun('git config user.name t')
  // 主仓历史：c1 → c1b（HEAD 停在 c1b）
  writeFileSync(join(root, 'a.txt'), 'c1')
  gitRun('git add . && git commit -m c1')
  const c1 = execSync('git rev-parse HEAD', { cwd: root, encoding: 'utf8' }).trim()
  writeFileSync(join(root, 'a.txt'), 'c1b')
  gitRun('git add . && git commit -m c1b')
  const c1b = execSync('git rev-parse HEAD', { cwd: root, encoding: 'utf8' }).trim()
  // 分支独有 commit：从 c1 切 sillyspec/x，落 c2（不在主仓任何常驻 ref 上）
  gitRun(`git branch sillyscope-anchor-x ${c1}`)
  gitRun('git checkout sillyscope-anchor-x')
  writeFileSync(join(root, 'b.txt'), 'c2')
  gitRun('git add . && git commit -m c2')
  const c2 = execSync('git rev-parse HEAD', { cwd: root, encoding: 'utf8' }).trim()
  gitRun('git checkout main')
  const BRANCH = 'sillyscope-anchor-x'
  // sanity：c1/c1b 主仓 HEAD 可达，c2 分支独有
  assert(execSync(`git merge-base --is-ancestor ${c1} HEAD && echo yes`, { cwd: root, encoding: 'utf8' }).trim() === 'yes', 'fixture：c1 是主仓 HEAD 祖先')
  assert(execSync(`git merge-base --is-ancestor ${c2} ${BRANCH} && echo yes`, { cwd: root, encoding: 'utf8' }).trim() === 'yes', 'fixture：c2 在分支上')
  let c2OnMain = true
  try { execSync(`git merge-base --is-ancestor ${c2} HEAD`, { cwd: root, stdio: 'ignore' }) } catch { c2OnMain = false }
  assert(!c2OnMain, 'fixture：c2 不在主仓 HEAD 可达集（分支独有）')

  // execute-runs review.json fixture（_branchReviewReferences 的候选源）
  const taskDir = join(root, '.sillyspec', '.runtime', 'execute-runs', 'exec-2026-10-05-110000', 'tasks', 'task-01')
  mkdirSync(taskDir, { recursive: true })
  const writeReview = (base, head) => writeFileSync(join(taskDir, 'review.json'), JSON.stringify({ base, head }))
  const wm = new WorktreeManager({ cwd: root })

  console.log('--- ① 历史 commit（主仓 HEAD 可达）引用不计入——不锚定 ---')
  writeReview(c1, c1b) // base/head 全是主仓历史 commit（旧 review base 锚常见形态）
  assert(wm._branchReviewReferences(BRANCH).length === 0, '历史引用不计入（旧实现此处误计入）')
  writeReview(c1, c2) // base 历史 + head 分支独有 → 只计 head 一条引用
  const mixed = wm._branchReviewReferences(BRANCH)
  assert(mixed.length === 1 && mixed[0].includes('task-01'), '混合引用只计分支独有侧（历史侧不计）')

  console.log('--- ② 分支独有 commit 引用计入——锚定保可达（既有行为不变） ---')
  writeReview(c2, c2)
  assert(wm._branchReviewReferences(BRANCH).length === 1, '分支独有 commit 引用计入')
  writeReview('0000000000000000000000000000000000000000', c2)
  assert(wm._branchReviewReferences(BRANCH).length === 1, '畸形 base + 有效 head：有效侧仍计入')

  console.log('--- ③ 畸形/未知 hash 既有跳过语义保持 ---')
  writeReview('deadbeefdeadbeefdeadbeefdeadbeefdeadbeef', '0000000000000000000000000000000000000000')
  assert(wm._branchReviewReferences(BRANCH).length === 0, '全畸形引用跳过（非真实对象无可悬空链）')

  rmSync(root, { recursive: true, force: true })
} catch (e) {
  console.error('fixture 异常：', e.message)
  process.exit(1)
}

console.log(`\n${'='.repeat(50)}`)
console.log(`✅ 通过: ${passed}  ❌ 失败: ${failed}`)
if (failures.length) { console.log('失败项:'); failures.forEach(f => console.log('  - ' + f)) }
console.log('='.repeat(50))
if (failed > 0) process.exit(1)
