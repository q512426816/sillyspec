/**
 * applyWorktree --merge 降级测试（坑 1，FR-1/2/5）
 *
 * 【行为变化 2026-07】--merge 从「4.5 baseline 漂移自动降级」改为「用户显式 flag 兜底」：
 * 验证显式 --merge 时：
 *  - merge=true → git merge sillyspec/<change> 兜底，result.merged=true（FR-1）
 *  - merge=false（默认）+ 主仓未提交 dirty → 被 4.5 拦，文案引导 commit/stash（不再指引 --merge，因 merge 对 dirty 工作区不稳）
 *  - merge 冲突 → 报冲突文件 + git merge --abort 回滚，主仓库无半成品（FR-5）
 *
 * 构造：临时 git 仓库 + git worktree add -b sillyspec/<change> + 手动写 meta.json
 * （baselineHash 设假值模拟主仓有未提交改动 → 触发 4.5 dirty 拦截）。绕过 WorktreeManager.create 的 fetch/overlay。
 */
import fs from 'fs'
import path from 'path'
import os from 'os'
import { execSync } from 'child_process'
import { applyWorktree } from '../src/worktree-apply.js'

let failed = 0
let passedCount = 0
const failures = []
function assertTrue(cond, msg) {
  if (cond) { passedCount++; console.log(`  ✅ PASS: ${msg}`) }
  else { failed++; failures.push(msg); console.log(`  ❌ FAIL: ${msg}`) }
}
function sh(cmd, cwd) { execSync(cmd, { cwd, stdio: 'pipe' }) }
function shQuiet(cmd, cwd) { try { execSync(cmd, { cwd, stdio: 'pipe' }) } catch {} }

function setupRepo() {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'wtm-'))
  sh('git init', d)
  sh('git config user.email t@t.co && git config user.name t', d)
  fs.writeFileSync(path.join(d, 'base.txt'), 'base\n')
  sh('git add -A && git commit -m init', d)
  fs.mkdirSync(path.join(d, '.sillyspec', '.runtime', 'worktrees', 'tc'), { recursive: true })
  fs.writeFileSync(path.join(d, '.gitignore'), '.sillyspec/\n')
  sh('git add -A && git commit -m gitignore', d)
  // _resolveMainRepoRoot 用 existsSync('git rev-parse --git-common-dir')，该命令返回相对 .git；
  // existsSync 相对 process.cwd()。生产时 cwd=主仓库正确，测试时需 chdir 到 d 让解析落在临时仓库。
  process.chdir(d)
  return d
}

function makeWorktree(d, changeName, mutator) {
  const wtDir = path.join(d, '.sillyspec', '.runtime', 'worktrees', changeName)
  sh(`git worktree add "${wtDir}" -b sillyspec/${changeName}`, d)
  if (mutator) mutator(wtDir)
  sh('git add -A && git commit -m wt-change', wtDir)
  const base = execSync('git rev-parse HEAD', { cwd: d, encoding: 'utf8' }).trim()
  // meta.json：baselineHash='fake'（必与 currentHash 不同→触发漂移），baselineCommit=主仓库 HEAD
  // 注意 applyWorktree 用 meta.baseHash（diffBase）+ meta.baselineHash（步骤 4.5 漂移检测），两者都要
  const meta = {
    name_zh: 'worktree 元数据', changeName, branch: `sillyspec/${changeName}`,
    baseBranch: 'master', baseHash: 'fake', baselineHash: 'fake-baseline-hash', baselineCommit: base,
    worktreePath: wtDir, mode: 'worktree', baselineFiles: [],
  }
  fs.writeFileSync(path.join(wtDir, 'meta.json'), JSON.stringify(meta))
  return { wtDir, base }
}

console.log('=== applyWorktree --merge 降级（坑 1，FR-1/2/5）===\n')

// ── 场景 A: baseline 漂移 + merge=true → git merge 降级（FR-1）──
console.log('--- 场景 A: 漂移 + merge=true → git merge ---')
{
  const d = setupRepo()
  makeWorktree(d, 'tc', (wt) => fs.writeFileSync(path.join(wt, 'src-new.txt'), 'from-worktree\n'))
  const r = applyWorktree('tc', { cwd: d, merge: true })
  assertTrue(r.merged === true, 'A: result.merged === true')
  assertTrue(r.ok === true, 'A: result.ok === true')
  assertTrue(r.errors.length === 0, `A: 无 error（实际 ${r.errors.length}: ${r.errors.join(';')}）`)
  assertTrue(fs.existsSync(path.join(d, 'src-new.txt')), 'A: 主仓库已合并 src-new.txt')
  process.chdir(os.tmpdir()); fs.rmSync(d, { recursive: true, force: true })
}

// ── 场景 B: 主仓未提交 dirty 与变更重叠 + merge=false → 4.5 拦，引导 commit/stash（不再指引 --merge）──
console.log('--- 场景 B: 未提交 dirty（重叠）+ merge=false → 4.5 友好拦截 ---')
{
  const d = setupRepo()
  makeWorktree(d, 'tc', (wt) => fs.writeFileSync(path.join(wt, 'src-b.txt'), 'b\n'))
  // 主仓真实 dirty 落在与变更重叠的文件上（src-b.txt 在主仓为 untracked，与 worktree 新增同名文件
  // 重叠 → 4.5 overlap 拦截。2026-08-20 起 4.5 只拦重叠，无关 dirty 放行——放行路径由
  // worktree-apply-overlap-dirty.test.mjs / relax-committed-advance 场景 3 锁定）
  fs.writeFileSync(path.join(d, 'src-b.txt'), 'dirty-main\n')
  const r = applyWorktree('tc', { cwd: d, merge: false })
  assertTrue(r.merged === false, 'B: result.merged === false（未走 merge）')
  assertTrue(r.errors.length > 0, 'B: 有 error（BLOCKED）')
  const errText = r.errors.join('\n')
  assertTrue(errText.includes('未提交') && errText.includes('重叠'), 'B: error 含「未提交」+「重叠」（4.5 overlap 拦截）')
  assertTrue(errText.includes('commit') && errText.includes('stash'), 'B: error 引导先 commit/stash')
  assertTrue(!fs.existsSync(path.join(d, 'src-b.txt')) || fs.readFileSync(path.join(d, 'src-b.txt'), 'utf8') === 'dirty-main\n',
    'B: 主仓库未应用变更（src-b.txt 保持 dirty 原文，未被 worktree 版覆盖）')
  process.chdir(os.tmpdir()); fs.rmSync(d, { recursive: true, force: true })
}

// ── 场景 C: 显式 --merge 真冲突（分叉各改同一行）→ 保留冲突现场供手工解决（坑 merge-conflict-abort-no-chance）──
// 2026-08-23 起改默认：显式 --merge 冲突不再直接 abort（原行为丢掉冲突现场，用户只能自己重新
// git merge）——保留 merge-in-progress + 手工解决指引；ENOBUFS 自动降级路径维持 abort（场景 D）；
// 主仓 dirty 拒绝启动是另一形态（场景 E，无现场可保留）。
console.log('--- 场景 C: 显式 --merge 真冲突 → 保留冲突现场 ---')
{
  const d = setupRepo()
  // 分叉冲突：worktree commit 改 base.txt；主仓 commit 改同一文件（各自一行改动 → merge 冲突）
  makeWorktree(d, 'tc', (wt) => fs.writeFileSync(path.join(wt, 'base.txt'), 'worktree-line\n'))
  fs.writeFileSync(path.join(d, 'base.txt'), 'main-line\n')
  sh('git add -A && git commit -m main-change', d)
  const beforeMerge = execSync('git rev-parse HEAD', { cwd: d, encoding: 'utf8' }).trim()
  const r = applyWorktree('tc', { cwd: d, merge: true })
  assertTrue(r.merged === false, 'C: 冲突时 result.merged === false')
  assertTrue(r.errors.length > 0, 'C: 冲突时报 error')
  const errText = r.errors.join('\n')
  assertTrue(errText.includes('冲突'), 'C: error 含「冲突」')
  assertTrue(errText.includes('保留冲突现场') && errText.includes('git add'), 'C: 指引手工解决（编辑 → git add → git commit）')
  assertTrue(errText.includes('merge --abort'), 'C: 同时给放弃出路（git merge --abort）')
  // 主仓处于 merge-in-progress（MERGE_HEAD 存在）——冲突现场保留，未回滚
  assertTrue(fs.existsSync(path.join(d, '.git', 'MERGE_HEAD')), 'C: 主仓保留 merge-in-progress 现场（MERGE_HEAD 存在）')
  const afterMerge = execSync('git rev-parse HEAD', { cwd: d, encoding: 'utf8' }).trim()
  assertTrue(afterMerge === beforeMerge, 'C: HEAD 未推进（冲突未解决未提交）')
  // 收尾：abort 清现场，避免影响后续 tmp 清理
  shQuiet('git merge --abort', d)
  process.chdir(os.tmpdir()); fs.rmSync(d, { recursive: true, force: true })
}

// ── 场景 D: ENOBUFS 自动降级路径（keepConflicts:false）→ 真冲突 abort 回滚干净态 ──
console.log('--- 场景 D: 降级路径 keepConflicts:false → abort 回滚 ---')
{
  const d = setupRepo()
  makeWorktree(d, 'tc', (wt) => fs.writeFileSync(path.join(wt, 'base.txt'), 'worktree-line\n'))
  fs.writeFileSync(path.join(d, 'base.txt'), 'main-line\n')
  sh('git add -A && git commit -m main-change', d)
  const beforeMerge = execSync('git rev-parse HEAD', { cwd: d, encoding: 'utf8' }).trim()
  const { applyByMerge } = await import('../src/worktree-apply.js')
  const { WorktreeManager } = await import('../src/worktree.js')
  const result = { ok: false, changedFiles: ['base.txt'], errors: [], warnings: [], merged: false }
  const r = applyByMerge(result, 'tc', d, new WorktreeManager({ cwd: d }), { keepConflicts: false })
  assertTrue(r.merged === false && r.errors.length > 0, 'D: 冲突报 error')
  assertTrue(r.errors.join('\n').includes('已执行 git merge --abort'), 'D: 文案明示已 abort 回滚')
  assertTrue(!fs.existsSync(path.join(d, '.git', 'MERGE_HEAD')), 'D: 无 merge-in-progress 残留（回滚干净态）')
  const afterMerge = execSync('git rev-parse HEAD', { cwd: d, encoding: 'utf8' }).trim()
  assertTrue(afterMerge === beforeMerge, 'D: HEAD 未变')
  process.chdir(os.tmpdir()); fs.rmSync(d, { recursive: true, force: true })
}

// ── 场景 E: 主仓 dirty 重叠 → merge 拒绝启动（无 MERGE_HEAD）→ 指引 commit/stash/--skip-overlap ──
console.log('--- 场景 E: dirty 拒绝启动（与真冲突区分）---')
{
  const d = setupRepo()
  makeWorktree(d, 'tc', (wt) => fs.writeFileSync(path.join(wt, 'base.txt'), 'worktree-line\n'))
  // 主仓 working-tree dirty 改同一文件（未 commit）→ git merge 拒绝启动
  fs.writeFileSync(path.join(d, 'base.txt'), 'dirty-main\n')
  const r = applyWorktree('tc', { cwd: d, merge: true })
  assertTrue(r.merged === false && r.errors.length > 0, 'E: 报 error')
  const errText = r.errors.join('\n')
  assertTrue(errText.includes('未执行成功') || errText.includes('拒绝启动'), 'E: 文案明示 merge 未启动（非冲突）')
  assertTrue(errText.includes('--skip-overlap') || errText.includes('stash'), 'E: 指引 commit/stash 或 --skip-overlap')
  assertTrue(!fs.existsSync(path.join(d, '.git', 'MERGE_HEAD')), 'E: 无 merge-in-progress（未启动）')
  process.chdir(os.tmpdir()); fs.rmSync(d, { recursive: true, force: true })
}

console.log(`\n${'='.repeat(50)}`)
console.log(`✅ 通过: ${passedCount}  ❌ 失败: ${failed}`)
if (failures.length > 0) { console.log('失败项:'); failures.forEach(f => console.log(`  - ${f}`)) }
console.log('='.repeat(50))
if (failed > 0) process.exit(1)
