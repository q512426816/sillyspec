/**
 * worktree-apply-baseline-clean.test.mjs — baseline gate 死锁修复
 *
 * bug：applyWorktree step4.5 比对 currentHash !== meta.baselineHash。
 * execute 启动时主仓 dirty（baselineHash 记 dirty 态），execute 期间 commit 无关文件 → 主仓变 clean，
 * hash 必变 → baseline gate 永久拦截（须手改 meta.baselineHash）。
 * 修复：改判「排除规则下当前是否有未提交 dirty」，主仓 clean 即放行。
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

function setupRepo() {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'wtc-'))
  sh('git init', d)
  sh('git config user.email t@t.co && git config user.name t', d)
  fs.writeFileSync(path.join(d, 'base.txt'), 'base\n')
  sh('git add -A && git commit -m init', d)
  fs.mkdirSync(path.join(d, '.sillyspec', '.runtime', 'worktrees', 'tc'), { recursive: true })
  fs.writeFileSync(path.join(d, '.gitignore'), '.sillyspec/\n')
  sh('git add -A && git commit -m gitignore', d)
  process.chdir(d)
  return d
}

console.log('=== baseline gate 死锁修复：dirty→clean 后 apply 放行 ===\n')

console.log('--- 主仓 dirty→clean（commit 无关文件）→ checkOnly apply 应放行 ---')
{
  const d = setupRepo()
  // 模拟 execute 启动时主仓有未提交 dirty → baselineHash 记 dirty 态
  fs.writeFileSync(path.join(d, 'dirty-src.js'), 'x\n')
  const dirtyHash = computeBaselineHash(d)
  // execute 期间把该文件 commit 掉 → 主仓变 clean（hash 变化，但无未提交 dirty）
  sh('git add -A && git commit -m clean-up-dirty', d)
  const afterClean = computeBaselineHash(d)
  assertTrue(afterClean !== dirtyHash, '前置成立：当前 clean 态 hash ≠ 启动时 dirty 态 hash（否则测试无区分度）')

  // worktree + meta（baselineHash = 启动时 dirty 态，≠ 当前 clean 态）
  const wtDir = path.join(d, '.sillyspec', '.runtime', 'worktrees', 'tc')
  sh(`git worktree add "${wtDir}" -b sillyspec/tc`, d)
  fs.writeFileSync(path.join(wtDir, 'src-deliverable.txt'), 'from-worktree\n')
  const base = execSync('git rev-parse HEAD', { cwd: d, encoding: 'utf8' }).trim()
  const meta = {
    name_zh: 'meta', changeName: 'tc', branch: 'sillyspec/tc',
    baseBranch: 'master', baseHash: base, baselineHash: dirtyHash, baselineCommit: base,
    worktreePath: wtDir, mode: 'worktree', baselineFiles: [],
  }
  fs.writeFileSync(path.join(wtDir, 'meta.json'), JSON.stringify(meta))

  const r = applyWorktree('tc', { cwd: d, checkOnly: true })
  const baselineErr = r.errors.find(e => e.includes('未提交的改动'))
  assertTrue(!baselineErr, '主仓已 clean（无未提交 dirty）→ baseline gate 放行（修复后；修复前 hash 不等死锁）')
  assertTrue(r.changedFiles.includes('src-deliverable.txt'), 'changedFiles 识别 worktree 新增交付物')
  process.chdir(os.tmpdir()); fs.rmSync(d, { recursive: true, force: true })
}

console.log(`\n${'='.repeat(50)}`)
const total = 3
console.log(`✅ 通过: ${total - failed}  ❌ 失败: ${failed}`)
if (failures.length > 0) { console.log('失败项:'); failures.forEach(f => console.log(`  - ${f}`)) }
console.log('='.repeat(50))
if (failed > 0) process.exit(1)
