/**
 * worktree-apply 放宽行为集成测试（2026-07 主干并行开发支持）
 *
 * 验证 applyWorktree 对「主干推进」的新行为边界：
 *   1. 主干【已提交】推进 + 不同文件 → --3way 干净合并（apply 成功，两改动都在）
 *   2. 主干【已提交】推进 + 同文件重叠 → --3way 冲突 → 回滚干净 + 提示 --merge；显式 --merge 兜底成功
 *   3. 主干【未提交】dirty（哪怕不重叠）→ 4.5 友好拦截，列脏文件 + 引导 commit/stash（git --3way 危险区）
 *
 * 背景：原 step 5b 把「已提交推进改同文件」也 BLOCKED，没给 --3way 自动三路合并的机会。
 * 实测 git --3way：已提交推进可安全三路合并；未提交 dirty 报 does not match index 且行为不一致（危险区）。
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
function git(args, cwd) { return execSync('git ' + args, { cwd, encoding: 'utf8', stdio: 'pipe' }).trim() }
// Windows autocrlf 读回为 \r\n，归一比较
function readNorm(p) { return fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n') }

function setupRepo() {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'wt-relax-'))
  sh('git init -q -b main', d)
  sh('git config user.email t@t.co && git config user.name t', d)
  fs.writeFileSync(path.join(d, 'fileA.txt'), 'a1\na2\na3\na4\na5\n')
  fs.writeFileSync(path.join(d, 'fileB.txt'), 'b1\nb2\nb3\n')
  sh('git add -A && git commit -qm init', d)
  fs.mkdirSync(path.join(d, '.sillyspec', '.runtime', 'worktrees'), { recursive: true })
  fs.writeFileSync(path.join(d, '.gitignore'), '.sillyspec/\n')
  sh('git add -A && git commit -qm gitignore', d)
  process.chdir(d)
  return d
}

// 建 worktree + 改动 + commit，写 meta（真实 baselineHash）
function makeWorktree(d, changeName, mutator) {
  const wtDir = path.join(d, '.sillyspec', '.runtime', 'worktrees', changeName)
  sh(`git worktree add "${wtDir}" -b sillyspec/${changeName}`, d)
  if (mutator) mutator(wtDir)
  sh('git add -A && git commit -qm wt-change', wtDir)
  const base = git('rev-parse HEAD', d)
  const meta = {
    name_zh: 'worktree 元数据', changeName, branch: `sillyspec/${changeName}`,
    baseBranch: 'main', baseHash: base, baselineHash: computeBaselineHash(d), baselineCommit: base,
    worktreePath: wtDir, mode: 'worktree', baselineFiles: [],
  }
  fs.writeFileSync(path.join(wtDir, 'meta.json'), JSON.stringify(meta))
  return { wtDir, base }
}

console.log('=== worktree-apply 放宽：主干已提交推进交 --3way ===\n')

// ── 场景 1: 主干已提交推进 + 不同文件 → --3way 干净合并 ──
console.log('--- 场景1: 已提交推进+不同文件 → 干净合并 ---')
{
  const d = setupRepo()
  // worktree 改 fileA
  makeWorktree(d, 'tc', (wt) => fs.writeFileSync(path.join(wt, 'fileA.txt'), 'a1\na2\nWT-A3\na4\na5\n'))
  // 主干已提交推进改 fileB（worktree 没碰）
  fs.writeFileSync(path.join(d, 'fileB.txt'), 'b1\nMAIN-B2\nb3\n')
  sh('git add -A && git commit -qm main-advance', d)

  const r = applyWorktree('tc', { cwd: d })
  assertTrue(r.ok === true, `apply 成功（实际 errors: ${r.errors.join(';')}）`)
  assertTrue(readNorm(path.join(d, 'fileA.txt')).includes('WT-A3'), 'worktree 改动落地（fileA 含 WT-A3）')
  assertTrue(readNorm(path.join(d, 'fileB.txt')).includes('MAIN-B2'), '主干推进保留（fileB 含 MAIN-B2）')
  process.chdir(os.tmpdir()); fs.rmSync(d, { recursive: true, force: true })
}

// ── 场景 2: 主干已提交推进 + 同文件重叠 → --3way 冲突回滚 + --merge 兜底 ──
console.log('--- 场景2: 已提交推进+同文件重叠 → --3way 冲突回滚，--merge 兜底成功 ---')
{
  const d = setupRepo()
  // worktree 改 fileA 的 a3
  makeWorktree(d, 'tc', (wt) => fs.writeFileSync(path.join(wt, 'fileA.txt'), 'a1\na2\nWT-A3\na4\na5\n'))
  // 主干已提交推进改 fileA 的 a3（重叠）
  fs.writeFileSync(path.join(d, 'fileA.txt'), 'a1\na2\nMAIN-A3\na4\na5\n')
  sh('git add -A && git commit -qm main-advance', d)

  // 默认 patch 路径：--3way 冲突 → 回滚
  const r = applyWorktree('tc', { cwd: d })
  assertTrue(r.ok === false, '--3way 冲突 → ok=false')
  const errText = r.errors.join('\n')
  assertTrue(errText.includes('--3way 冲突'), '报 --3way 冲突')
  assertTrue(errText.includes('--merge'), '提示 --merge 兜底')
  const afterPatch = readNorm(path.join(d, 'fileA.txt'))
  assertTrue(afterPatch.includes('MAIN-A3'), '回滚干净：保留主干推进（MAIN-A3）')
  assertTrue(!afterPatch.includes('<<<<<<<'), '回滚干净：无冲突标记残留')

  // 显式 --merge 兜底：三方合并（同区域重叠 → merge 也冲突，abort 回滚）
  const r2 = applyWorktree('tc', { cwd: d, merge: true })
  assertTrue(r2.merged === false || r2.ok === false, '--merge 同区域重叠 → 冲突 abort（merged/ok=false）')
  const errText2 = r2.errors.join('\n')
  assertTrue(errText2.includes('冲突') || errText2.includes('abort'), '--merge 冲突提示 abort 回滚')
  assertTrue(!readNorm(path.join(d, 'fileA.txt')).includes('<<<<<<<'), '--merge abort 后无冲突标记残留')
  process.chdir(os.tmpdir()); fs.rmSync(d, { recursive: true, force: true })
}

// ── 场景 3: 主干未提交 dirty（不重叠）→ 4.5 友好拦截 ──
console.log('--- 场景3: 未提交 dirty（不重叠）→ 4.5 友好拦截 ---')
{
  const d = setupRepo()
  // worktree 改 fileA
  makeWorktree(d, 'tc', (wt) => fs.writeFileSync(path.join(wt, 'fileA.txt'), 'a1\na2\nWT-A3\na4\na5\n'))
  // 主干未提交 dirty：改 fileB 不 commit（与 worktree 不重叠）
  fs.writeFileSync(path.join(d, 'fileB.txt'), 'b1\nQUICK-B2\nb3\n')

  const r = applyWorktree('tc', { cwd: d })
  assertTrue(r.ok === false, '未提交 dirty → ok=false（4.5 拦截）')
  const errText = r.errors.join('\n')
  assertTrue(errText.includes('未提交的改动'), '报「未提交的改动」（4.5 dirty 拦截）')
  assertTrue(errText.includes('commit') && errText.includes('stash'), '引导先 commit/stash')
  assertTrue(errText.includes('fileB.txt'), '列出脏文件 fileB.txt')
  // 拦截后主仓未被改动
  assertTrue(readNorm(path.join(d, 'fileA.txt')).includes('a3'), 'fileA 未被改动（仍是 original a3）')
  assertTrue(readNorm(path.join(d, 'fileB.txt')).includes('QUICK-B2'), 'dirty 改动保留（fileB 含 QUICK-B2）')
  process.chdir(os.tmpdir()); fs.rmSync(d, { recursive: true, force: true })
}

console.log(`\n${'='.repeat(50)}`)
const total = 17
console.log(`✅ 通过: ${total - failed}  ❌ 失败: ${failed}`)
if (failures.length > 0) { console.log('失败项:'); failures.forEach(f => console.log(`  - ${f}`)) }
console.log('='.repeat(50))
if (failed > 0) process.exit(1)
