/**
 * applyWorktree --merge 未 commit 场景（bug#5 防御修复 → 2026-08-28 契约升级）
 *
 * 子代理改动只在工作区（未 commit，真实生产流程），merge 分支不含交付物。
 * 3.24.1 防御（bug#5）：merge 空转零落地 → 落地校验拦（ok=false + 保留 worktree，
 * 指引手工 cherry-pick）——防丢码但需手工补救。
 * 2026-08-28（ql-20260828-004，用户实证「merge 空转需手工补救」）：applyByMerge 在
 * merge 前自动把未提交交付物 pathspec commit 到分支 → merge 直接落地。断言按新契约
 * 反转：自动 commit（warning 可审计）+ 文件进 main HEAD + ok=true + 成功后 cleanup。
 * 落地校验仍是兜底（auto-commit 失败降级 warning 时它拦）——见 apply-merge-wip-autocommit.test.mjs 直测路径。
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

function setupRepo() {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'wtu-'))
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

console.log('=== applyWorktree --merge 未 commit 场景（2026-08-28 契约：merge 前自动 commit）===\n')

console.log('--- 子代理改动未 commit → 自动 commit + merge 落地（不再空转报错） ---')
{
  const d = setupRepo()
  const wtDir = path.join(d, '.sillyspec', '.runtime', 'worktrees', 'tc')
  sh(`git worktree add "${wtDir}" -b sillyspec/tc`, d)
  // 子代理改动只在工作区（未 commit）—— 真实 bug 场景
  fs.writeFileSync(path.join(wtDir, 'src-uncommitted.txt'), 'from-worktree\n')
  const base = execSync('git rev-parse HEAD', { cwd: d, encoding: 'utf8' }).trim()
  const meta = {
    name_zh: 'meta', changeName: 'tc', branch: 'sillyspec/tc',
    baseBranch: 'master', baseHash: base, baselineHash: 'fake-baseline-hash', baselineCommit: base,
    worktreePath: wtDir, mode: 'worktree', baselineFiles: [],
  }
  fs.writeFileSync(path.join(wtDir, 'meta.json'), JSON.stringify(meta))

  const r = applyWorktree('tc', { cwd: d, merge: true })
  assertTrue(r.merged === true, '走了 merge 降级（merged=true）')
  assertTrue(r.ok === true, `merge 落地成功 → ok=true（实际 errors=${JSON.stringify(r.errors || []).slice(0, 120)}）`)
  const warnText = (r.warnings || []).join('\n')
  assertTrue(warnText.includes('未提交交付文件') && warnText.includes('自动 commit'), `warning 记录自动 commit（可审计；实际: ${warnText.slice(0, 80)}）`)
  assertTrue(fs.existsSync(path.join(d, 'src-uncommitted.txt')), '主仓库有 src-uncommitted.txt（merge 落地）')
  const inHead = execSync('git cat-file -e HEAD:src-uncommitted.txt && echo yes || echo no', { cwd: d, encoding: 'utf8', shell: true }).trim()
  assertTrue(inHead === 'yes', 'src-uncommitted.txt 进 main HEAD（非仅工作区）')
  assertTrue(!fs.existsSync(wtDir) || !fs.existsSync(path.join(wtDir, 'meta.json')), '成功后 cleanup（worktree/meta 清理）')
  process.chdir(os.tmpdir()); fs.rmSync(d, { recursive: true, force: true })
}

console.log(`\n${'='.repeat(50)}`)
const total = 7
console.log(`✅ 通过: ${total - failed}  ❌ 失败: ${failed}`)
if (failures.length > 0) { console.log('失败项:'); failures.forEach(f => console.log(`  - ${f}`)) }
console.log('='.repeat(50))
if (failed > 0) process.exit(1)
