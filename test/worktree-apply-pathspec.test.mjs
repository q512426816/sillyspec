/**
 * 坑 apply-commit-pathspec-sweep 回归：apply 成功落盘精确提交 pathspec
 *
 * 背景（2026-08-21 实证）：apply 后主仓常混有无关未提交文件，agent 目录级 git add 会误扫
 * 无关文件进暂存需手工剔除。apply 成功时应落盘本变更精确 pathspec 供提交复用。
 *
 * 锁定语义：
 *   1. 真实 apply 成功 → result.commitPathspec = patch 文件集（排序去重），
 *      pathspecFile 落 .sillyspec/.runtime/apply-pathspec-<change>.txt（行分隔）
 *   2. pathspec 文件内容可喂 git add --pathspec-from-file（存在的文件能 add 成功）
 *   3. checkOnly 不产出 pathspec（只读语义）
 */
import fs from 'fs'
import path from 'path'
import os from 'os'
import { execSync } from 'child_process'
import { applyWorktree } from '../src/worktree-apply.js'

let failed = 0, total = 0
const failures = []
function assertTrue(cond, msg) {
  total++
  if (cond) console.log(`  ✅ PASS: ${msg}`)
  else { failed++; failures.push(msg); console.log(`  ❌ FAIL: ${msg}`) }
}
function sh(cmd, cwd) { execSync(cmd, { cwd, stdio: 'pipe' }) }

function setupRepo() {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'wps-'))
  sh('git init', d)
  sh('git config user.email t@t.co && git config user.name t', d)
  sh('git config core.autocrlf false', d)
  fs.writeFileSync(path.join(d, 'base.txt'), 'base\n')
  sh('git add -A && git commit -m init', d)
  fs.mkdirSync(path.join(d, '.sillyspec', '.runtime', 'worktrees', 'tc'), { recursive: true })
  fs.writeFileSync(path.join(d, '.gitignore'), '.sillyspec/\n')
  sh('git add -A && git commit -m gitignore', d)
  process.chdir(d)
  return d
}

console.log('=== apply 提交 pathspec（坑 apply-commit-pathspec-sweep）===\n')

console.log('--- ① 真实 apply 成功 → pathspec 落盘且可复用 ---')
{
  const d = setupRepo()
  const wtDir = path.join(d, '.sillyspec', '.runtime', 'worktrees', 'tc')
  sh(`git worktree add "${wtDir}" -b sillyspec/tc`, d)
  const base = execSync('git rev-parse HEAD', { cwd: d, encoding: 'utf8' }).trim()
  // worktree 内改动两个交付文件（一新增一修改）
  fs.writeFileSync(path.join(wtDir, 'base.txt'), 'base-changed\n')
  fs.writeFileSync(path.join(wtDir, 'new-feature.js'), 'export const f = 1\n')
  sh('git add -A && git commit -m work', wtDir)
  const head = execSync('git rev-parse HEAD', { cwd: wtDir, encoding: 'utf8' }).trim()
  const meta = {
    name_zh: 'meta', changeName: 'tc', branch: 'sillyspec/tc',
    baseBranch: 'master', baseHash: base, baselineCommit: base,
    worktreePath: wtDir, mode: 'worktree', baselineFiles: [],
  }
  fs.writeFileSync(path.join(wtDir, 'meta.json'), JSON.stringify(meta))
  // review.json（无 review 时 apply 也可过——checkOnly 的 review 对账 advisory；真实 apply 走交付文件）
  const r = applyWorktree('tc', { cwd: d })
  assertTrue(r.ok === true, `apply 成功（errors: ${(r.errors || []).join('; ').slice(0, 120)}）`)
  assertTrue(Array.isArray(r.commitPathspec) && r.commitPathspec.length === 2,
    `commitPathspec = patch 文件集 2 项（实际 ${JSON.stringify(r.commitPathspec)}）`)
  assertTrue(r.commitPathspec.includes('base.txt') && r.commitPathspec.includes('new-feature.js'), '清单含修改 + 新增文件')
  assertTrue(r.pathspecFile && fs.existsSync(r.pathspecFile), `pathspec 文件落盘（${r.pathspecFile || '无'}）`)
  const fileLines = fs.readFileSync(r.pathspecFile, 'utf8').split('\n').filter(Boolean)
  assertTrue(JSON.stringify(fileLines) === JSON.stringify(r.commitPathspec), '文件内容与 result 一致')
  // 可复用性：主仓此刻用 --pathspec-from-file add 成功且只暂存本变更文件
  const stagedBefore = execSync('git diff --cached --name-only', { cwd: d, encoding: 'utf8' }).trim()
  execSync(`git add --pathspec-from-file="${r.pathspecFile}"`, { cwd: d, stdio: 'pipe' })
  const staged = execSync('git diff --cached --name-only', { cwd: d, encoding: 'utf8' }).trim().split('\n').filter(Boolean).sort()
  assertTrue(JSON.stringify(staged) === JSON.stringify(r.commitPathspec),
    `--pathspec-from-file 精确暂存本变更文件（实际 ${JSON.stringify(staged)}）`)
  sh('git worktree prune', d)
  process.chdir(os.tmpdir())
  fs.rmSync(d, { recursive: true, force: true })
}

console.log('--- ② checkOnly 不产出 pathspec（只读语义）---')
{
  const d = setupRepo()
  const wtDir = path.join(d, '.sillyspec', '.runtime', 'worktrees', 'tc')
  sh(`git worktree add "${wtDir}" -b sillyspec/tc`, d)
  const base = execSync('git rev-parse HEAD', { cwd: d, encoding: 'utf8' }).trim()
  fs.writeFileSync(path.join(wtDir, 'base.txt'), 'base-changed\n')
  sh('git add -A && git commit -m work', wtDir)
  fs.writeFileSync(path.join(wtDir, 'meta.json'), JSON.stringify({
    changeName: 'tc', branch: 'sillyspec/tc', baseHash: base, baselineCommit: base,
    worktreePath: wtDir, mode: 'worktree', baselineFiles: [],
  }))
  const r = applyWorktree('tc', { cwd: d, checkOnly: true })
  assertTrue(r.commitPathspec === undefined && r.pathspecFile === undefined, `checkOnly 无 pathspec 产物（实际 ${r.commitPathspec !== undefined ? '有' : '无'}）`)
  sh('git worktree prune', d)
  process.chdir(os.tmpdir())
  fs.rmSync(d, { recursive: true, force: true })
}

console.log(`\n${'='.repeat(50)}`)
console.log(`✅ 通过: ${total - failed}  ❌ 失败: ${failed}`)
if (failures.length) { console.log('失败项:'); failures.forEach(f => console.log('  - ' + f)) }
console.log('='.repeat(50))
if (failed > 0) process.exit(1)
