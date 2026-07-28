/**
 * worktree-apply hash-mismatch（step 5b）独立 characterization 测试
 *
 * 精确区分两条主仓库修改检测：
 *   - step 4.5 baseline-drift：主工作区【未提交】漂移（staged/unstaged/untracked，
 *     排除 .sillyspec/.claude/docs/CLAUDE.md 等非交付物，见 computeBaselineHash）。
 *   - step 5b hash-mismatch：主仓库【已提交】HEAD 相对 baseHash 推进，某 target 文件
 *     的 baseHash blob ≠ HEAD blob。
 *
 * 4.5 挡未提交工作区漂移；5b 管已提交 HEAD 分叉。二者正交。
 *
 * 【行为放宽 2026-07】5b 从「BLOCKED」改为「记 hashMismatchFiles 风险提示（warning），放行交 step7 --3way」：
 *   - 主干已提交推进 + 不同文件 → --3way 自动干净合并（apply 成功）
 *   - 主干已提交推进 + 同文件重叠 → --3way 自动三路合并，重叠处冲突 → 回滚干净 + 提示 --merge 兜底
 *   本测试覆盖后者（同文件重叠场景）。
 *
 * 本测试构造【4.5 通过、5b 触发】：
 *   1. 主仓库干净时快照 baselineHash = H_clean
 *   2. worktree 改 shared.txt（→ changedFiles）
 *   3. 主仓库 commit 改 shared.txt 为不同内容 → HEAD 推进，工作区仍干净
 *   4. apply：4.5 重算=H_clean=baselineHash（干净）→ 通过；5b 记 shared.txt 为风险（不拦截）；
 *      step7 --3way 同区域冲突 → 回滚 → ok=false + 提示 --merge
 *
 * 反向断言：errors 不含「baseline 已变化」（证明没误走 4.5，真正隔离到 5b/--3way）。
 */
import fs from 'fs'
import path from 'path'
import os from 'os'
import { execSync } from 'child_process'
import { applyWorktree } from '../src/worktree-apply.js'
import { computeBaselineHash } from '../src/worktree.js'

let failed = 0
const failures = []
function assertTrue(cond, msg) {
  if (cond) console.log(`  ✅ PASS: ${msg}`)
  else { failed++; failures.push(msg); console.log(`  ❌ FAIL: ${msg}`) }
}
function sh(cmd, cwd) { execSync(cmd, { cwd, stdio: 'pipe' }) }

// Windows 下 git 默认 autocrlf，读回的文件是 \r\n；统一归一为 \n 再比较，避免 CRLF 假失败
function readNorm(p) { return fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n') }

// 直接用生产 computeBaselineHash（src/worktree.js）算 currentHash，让 4.5 通过、隔离到 5b。
// 不再本地复刻——复刻会和生产 exclude 漂移（曾漏 docs/sillyspec/、CLAUDE.md），用真函数零漂移。

function setupRepo() {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'wth-'))
  sh('git init', d)
  sh('git config user.email t@t.co && git config user.name t', d)
  fs.writeFileSync(path.join(d, 'base.txt'), 'base\n')
  fs.writeFileSync(path.join(d, 'shared.txt'), 'original\n')
  sh('git add -A && git commit -m init', d)
  fs.mkdirSync(path.join(d, '.sillyspec', '.runtime', 'worktrees', 'tc'), { recursive: true })
  fs.writeFileSync(path.join(d, '.gitignore'), '.sillyspec/\n')
  sh('git add -A && git commit -m gitignore', d)
  process.chdir(d)
  return d
}

console.log('=== worktree-apply: hash-mismatch(step 5b 放宽) characterization ===\n')

console.log('--- 已提交推进 + 同文件重叠 → 5b 记风险 + --3way 冲突回滚 + merge 兜底提示 ---')
{
  const d = setupRepo()
  const base = execSync('git rev-parse HEAD', { cwd: d, encoding: 'utf8' }).trim()
  const wtDir = path.join(d, '.sillyspec', '.runtime', 'worktrees', 'tc')
  sh(`git worktree add "${wtDir}" -b sillyspec/tc`, d)

  // worktree 改 shared.txt 并 commit（→ changedFiles 含 shared.txt）
  fs.writeFileSync(path.join(wtDir, 'shared.txt'), 'worktree-side\n')
  sh('git add -A && git commit -m wt-change', wtDir)

  // 主仓库此刻干净 → 快照 baselineHash（= 生产 computeBaselineHash）
  const baselineHash = computeBaselineHash(d)

  // 主仓库 commit 改 shared.txt 为不同内容 → HEAD 推进，工作区仍干净
  fs.writeFileSync(path.join(d, 'shared.txt'), 'main-side\n')
  sh('git add -A && git commit -m main-change', d)

  // 自检：commit 后主仓库仍干净 → baselineHash 不变（否则 4.5 会误触发）
  assertTrue(computeBaselineHash(d) === baselineHash, '自检：主仓库 commit 后仍干净，baselineHash 不变')

  const meta = {
    name_zh: 'meta', changeName: 'tc', branch: 'sillyspec/tc',
    baseBranch: 'master', baseHash: base, baselineHash, baselineCommit: base,
    worktreePath: wtDir, mode: 'worktree', baselineFiles: [],
  }
  fs.writeFileSync(path.join(wtDir, 'meta.json'), JSON.stringify(meta))

  const r = applyWorktree('tc', { cwd: d })
  // 5b 不再硬拦，但 --3way 同区域冲突 → 回滚 → ok=false
  assertTrue(r.ok === false, 'apply --3way 冲突 → ok=false（非 5b BLOCKED，是 step7 冲突）')
  // 核心断言：5b 仍记 hashMismatchFiles 风险提示
  assertTrue(JSON.stringify(r.hashMismatchFiles) === JSON.stringify(['shared.txt']),
    `hashMismatchFiles=['shared.txt']（风险记录，实际: ${JSON.stringify(r.hashMismatchFiles)}）`)
  const errText = r.errors.join('\n')
  assertTrue(errText.includes('--3way 冲突'), `error 含「--3way 冲突」（实际: ${errText.slice(0, 80)}）`)
  assertTrue(errText.includes('shared.txt'), `error 列出冲突文件 shared.txt（实际: ${errText.slice(0, 80)}）`)
  assertTrue(errText.includes('--merge'), `error 提示 --merge 兜底（实际: ${errText.slice(0, 120)}）`)
  assertTrue(errText.includes('回滚'), `error 说明已回滚（实际: ${errText.slice(0, 120)}）`)
  // 反向断言：没误走 4.5（未提交漂移文案）
  assertTrue(!errText.includes('未提交的改动'), '⚠️核心：error 不含「未提交的改动」（证明走 5b/--3way 非 4.5）')

  // 回滚干净：主仓库 shared.txt 仍是 main-side，无冲突标记
  const after = readNorm(path.join(d, 'shared.txt'))
  assertTrue(after === 'main-side\n', '回滚干净：shared.txt 未被覆盖（仍是 main-side）')
  assertTrue(!after.includes('<<<<<<<'), '回滚干净：无半成品冲突标记残留')

  process.chdir(os.tmpdir()); fs.rmSync(d, { recursive: true, force: true })
}

console.log('--- 已提交推进 + 不同文件 → --3way 干净合并（apply 成功）---')
{
  const d = setupRepo()
  const base = execSync('git rev-parse HEAD', { cwd: d, encoding: 'utf8' }).trim()
  const wtDir = path.join(d, '.sillyspec', '.runtime', 'worktrees', 'tc')
  sh(`git worktree add "${wtDir}" -b sillyspec/tc`, d)

  // worktree 改 base.txt（→ changedFiles 含 base.txt）
  fs.writeFileSync(path.join(wtDir, 'base.txt'), 'worktree-changed\n')
  sh('git add -A && git commit -m wt-change', wtDir)

  const baselineHash = computeBaselineHash(d)

  // 主仓库 commit 改 shared.txt（worktree 没碰的文件）→ HEAD 推进，不同文件
  fs.writeFileSync(path.join(d, 'shared.txt'), 'main-side\n')
  sh('git add -A && git commit -m main-change', d)

  const meta = {
    name_zh: 'meta', changeName: 'tc', branch: 'sillyspec/tc',
    baseBranch: 'master', baseHash: base, baselineHash, baselineCommit: base,
    worktreePath: wtDir, mode: 'worktree', baselineFiles: [],
  }
  fs.writeFileSync(path.join(wtDir, 'meta.json'), JSON.stringify(meta))

  const r = applyWorktree('tc', { cwd: d })
  // 不同文件：5b 对 base.txt 无 mismatch（main 没改 base.txt），--3way 干净合并
  assertTrue(r.ok === true, `apply 成功（--3way 干净合并，实际 errors: ${r.errors.join(';')}）`)
  assertTrue(r.hashMismatchFiles.length === 0, `无 hashMismatchFiles（不同文件，实际: ${JSON.stringify(r.hashMismatchFiles)}）`)
  // worktree 改动落地
  assertTrue(readNorm(path.join(d, 'base.txt')) === 'worktree-changed\n', 'worktree 改动已 apply 到主仓库')
  // 主仓库推进保留
  assertTrue(readNorm(path.join(d, 'shared.txt')) === 'main-side\n', '主仓库已提交推进保留（shared.txt=main-side）')

  process.chdir(os.tmpdir()); fs.rmSync(d, { recursive: true, force: true })
}

console.log(`\n${'='.repeat(50)}`)
const total = 14
console.log(`✅ 通过: ${total - failed}  ❌ 失败: ${failed}`)
if (failures.length > 0) { console.log('失败项:'); failures.forEach(f => console.log(`  - ${f}`)) }
console.log('='.repeat(50))
if (failed > 0) process.exit(1)
