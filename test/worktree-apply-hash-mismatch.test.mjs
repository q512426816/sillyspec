/**
 * worktree-apply hash-mismatch（step 5b）独立 characterization 测试
 *
 * 精确区分两条主仓库修改检测：
 *   - step 4.5 baseline-drift：主工作区【未提交】漂移（staged/unstaged/untracked，
 *     排除 .sillyspec）。baselineHash 在 execute 开始时快照，独立于已提交内容
 *     （干净工作区恒为同一 H_clean）。
 *   - step 5b hash-mismatch：主仓库【已提交】HEAD 相对 baseHash 推进，某 target 文件
 *     的 baseHash blob ≠ HEAD blob。
 *
 * 4.5 测未提交工作区漂移；5b 测已提交 HEAD 分叉。二者正交。本测试构造【4.5 通过、5b 触发】：
 *   1. 主仓库 C 干净时快照 baselineHash = H_clean
 *   2. worktree 改 shared.txt（→ changedFiles）
 *   3. 主仓库 commit 改 shared.txt 为不同内容 → HEAD 推进，工作区仍干净
 *   4. apply：4.5 重算=H_clean=baselineHash（干净）→ 通过；5b baseHash:shared.txt≠HEAD:shared.txt → 触发
 *
 * 这是 apply-to-main 关键路径：5b 漏检 → 错误 apply 覆盖主仓库已提交改动。
 * 批量化（两次 ls-tree 建 baseHash/HEAD 两 Map）后必须仍全绿。
 *
 * 反向断言：errors 不含「baseline 已变化」（证明没误走 4.5，真正隔离到 5b）。
 */
import fs from 'fs'
import path from 'path'
import os from 'os'
import { execSync } from 'child_process'
import { createHash } from 'crypto'
import { applyWorktree } from '../src/worktree-apply.js'

let failed = 0
const failures = []
function assertTrue(cond, msg) {
  if (cond) console.log(`  ✅ PASS: ${msg}`)
  else { failed++; failures.push(msg); console.log(`  ❌ FAIL: ${msg}`) }
}
function sh(cmd, cwd) { execSync(cmd, { cwd, stdio: 'pipe' }) }

// 忠实复刻 src/worktree.js computeBaselineHash（byte-for-byte），用于在测试里算出与
// 生产 step 4.5 完全一致的 currentHash，让 4.5 通过、隔离到 5b。
function gitQ(cwd, args) {
  try { return execSync(`git ${args}`, { cwd, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim() }
  catch { return null }
}
function computeBaselineHash(cwd) {
  const exclude = '-- . ":(exclude).sillyspec/"'
  const staged = gitQ(cwd, `diff --cached ${exclude}`) || ''
  const unstaged = gitQ(cwd, `diff ${exclude}`) || ''
  const untracked = gitQ(cwd, `ls-files --others --exclude-standard ${exclude}`) || ''
  const raw = `staged:${staged}\nunstaged:${unstaged}\nuntracked:${untracked}`
  return createHash('sha256').update(raw).digest('hex').slice(0, 16)
}

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

console.log('=== worktree-apply: hash-mismatch(step 5b) 独立 characterization ===\n')

console.log('--- 4.5 通过（主仓库干净）+ 5b 触发（HEAD 已提交分叉）---')
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
  // （4.5 测未提交漂移，commit 不改变干净工作区的 baselineHash）
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
  assertTrue(r.ok === false, 'apply 被 5b 阻断 → ok=false')
  // 核心断言：走到 5b，hashMismatchFiles 含 shared.txt
  assertTrue(JSON.stringify(r.hashMismatchFiles) === JSON.stringify(['shared.txt']),
    `hashMismatchFiles=['shared.txt']（实际: ${JSON.stringify(r.hashMismatchFiles)}）`)
  const errText = r.errors.join('\n')
  assertTrue(errText.includes('base hash 不一致'), `error 含「base hash 不一致」（实际: ${errText.slice(0, 80)}）`)
  assertTrue(errText.includes('shared.txt'), `error 列出 shared.txt（实际: ${errText.slice(0, 80)}）`)
  // 反向断言：没误走 4.5
  assertTrue(!errText.includes('baseline 已变化'), '⚠️核心：error 不含「baseline 已变化」（证明走 5b 非 4.5）')

  // 主仓库 shared.txt 仍是 main-side（未被错误 apply 覆盖）
  assertTrue(fs.readFileSync(path.join(d, 'shared.txt'), 'utf8') === 'main-side\n',
    '主仓库 shared.txt 未被覆盖（仍是 main-side）')

  process.chdir(os.tmpdir()); fs.rmSync(d, { recursive: true, force: true })
}

console.log(`\n${'='.repeat(50)}`)
const total = 7
console.log(`✅ 通过: ${total - failed}  ❌ 失败: ${failed}`)
if (failures.length > 0) { console.log('失败项:'); failures.forEach(f => console.log(`  - ${f}`)) }
console.log('='.repeat(50))
if (failed > 0) process.exit(1)
