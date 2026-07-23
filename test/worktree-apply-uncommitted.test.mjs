/**
 * applyWorktree --merge 未 commit 场景（bug#5 防御修复）
 *
 * 子代理改动只在工作区（未 commit，真实生产流程），merge 分支不含交付物。
 * 修复前（3.24.1）：merge 报成功 + 立即 cleanup 删 worktree → 代码丢失（靠 cherry-pick 兜底）。
 * 修复后：落地校验 changedFiles 是否真进 main HEAD → 缺失则 ok=false + 保留 worktree（fail-open 防丢码）。
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

console.log('=== applyWorktree --merge 未 commit 场景（bug#5 防御修复）===\n')

console.log('--- 子代理改动未 commit → 落地校验失败 + 保留 worktree ---')
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
  assertTrue(r.ok === false, '落地校验失败 → ok=false（不误报成功）')
  const errText = r.errors.join('\n')
  assertTrue(errText.includes('未出现') || errText.includes('cherry-pick'), `error 含落地失败/cherry-pick 指引（实际: ${errText.slice(0, 80)}）`)
  assertTrue(!fs.existsSync(path.join(d, 'src-uncommitted.txt')), '主仓库无 src-uncommitted.txt（merge 没落地）')
  assertTrue(fs.existsSync(wtDir), 'worktree 保留（未 cleanup，fail-open 防丢码）')
  process.chdir(os.tmpdir()); fs.rmSync(d, { recursive: true, force: true })
}

console.log(`\n${'='.repeat(50)}`)
const total = 5
console.log(`✅ 通过: ${total - failed}  ❌ 失败: ${failed}`)
if (failures.length > 0) { console.log('失败项:'); failures.forEach(f => console.log(`  - ${f}`)) }
console.log('='.repeat(50))
if (failed > 0) process.exit(1)
