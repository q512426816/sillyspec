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
const failures = []
function assertTrue(cond, msg) {
  if (cond) console.log(`  ✅ PASS: ${msg}`)
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

// ── 场景 B: 主仓未提交 dirty + merge=false → 4.5 拦，引导 commit/stash（不再指引 --merge）──
console.log('--- 场景 B: 未提交 dirty + merge=false → 4.5 友好拦截 ---')
{
  const d = setupRepo()
  makeWorktree(d, 'tc', (wt) => fs.writeFileSync(path.join(wt, 'src-b.txt'), 'b\n'))
  // 主仓真实 dirty：未提交文件触发 4.5（修复后语义=真实 dirty 才拦，不再靠 baselineHash='fake' 模拟漂移）
  fs.writeFileSync(path.join(d, 'main-dirty.txt'), 'dirty\n')
  const r = applyWorktree('tc', { cwd: d, merge: false })
  assertTrue(r.merged === false, 'B: result.merged === false（未走 merge）')
  assertTrue(r.errors.length > 0, 'B: 有 error（BLOCKED）')
  const errText = r.errors.join('\n')
  assertTrue(errText.includes('未提交的改动'), 'B: error 含「未提交的改动」（4.5 dirty 拦截）')
  assertTrue(errText.includes('commit') && errText.includes('stash'), 'B: error 引导先 commit/stash')
  assertTrue(!fs.existsSync(path.join(d, 'src-b.txt')), 'B: 主仓库未应用变更（src-b.txt 不存在）')
  process.chdir(os.tmpdir()); fs.rmSync(d, { recursive: true, force: true })
}

// ── 场景 C: merge 冲突 → 报冲突 + git merge --abort 回滚（FR-5）──
console.log('--- 场景 C: merge 冲突 → abort 回滚 ---')
{
  const d = setupRepo()
  // worktree 改 base.txt 一行；主仓库改 base.txt 另一行 → merge 冲突
  makeWorktree(d, 'tc', (wt) => fs.writeFileSync(path.join(wt, 'base.txt'), 'worktree-line\n'))
  // 主仓库 working-tree 改 base.txt（未 commit，制造冲突 + 同时也是漂移源）
  fs.writeFileSync(path.join(d, 'base.txt'), 'main-line\n')
  const beforeMerge = execSync('git rev-parse HEAD', { cwd: d, encoding: 'utf8' }).trim()
  const r = applyWorktree('tc', { cwd: d, merge: true })
  assertTrue(r.merged === false, 'C: 冲突时 result.merged === false')
  assertTrue(r.errors.length > 0, 'C: 冲突时报 error')
  const errText = r.errors.join('\n')
  assertTrue(errText.includes('冲突'), 'C: error 含「冲突」')
  assertTrue(errText.includes('merge --abort'), 'C: error 提示已 abort')
  // 主仓库 HEAD 未推进（abort 回滚）
  const afterMerge = execSync('git rev-parse HEAD', { cwd: d, encoding: 'utf8' }).trim()
  assertTrue(afterMerge === beforeMerge, 'C: 主仓库 HEAD 未变（abort 回滚，无半成品合并）')
  process.chdir(os.tmpdir()); fs.rmSync(d, { recursive: true, force: true })
}

console.log(`\n${'='.repeat(50)}`)
const total = 14
console.log(`✅ 通过: ${total - failed}  ❌ 失败: ${failed}`)
if (failures.length > 0) { console.log('失败项:'); failures.forEach(f => console.log(`  - ${f}`)) }
console.log('='.repeat(50))
if (failed > 0) process.exit(1)
