/**
 * worktree-apply 分类循环 characterization 测试
 *
 * 锁住 tracked/untracked 分类语义（src/worktree-apply.js step 7，~248-254）：
 *   - tracked-modified 文件（在 diffBase tree 中）→ 走 git diff baseHash 路径
 *   - untracked-new 文件（不在 diffBase、不在 index）→ 走 git add + diff --cached 路径
 * 两类混合时，patch 必须都正确应用到主仓库。
 *
 * 这是 apply-to-main 关键路径：分类错（untracked 被误判 tracked）→ git diff 对 untracked
 * 返回空 → 该文件丢失。本测试在批量化前先锁住正确分类，批量化（ls-tree/ls-files 批量建集合）
 * 后必须仍全绿。
 *
 * 场景：worktree 未 commit（真实子代理流程）：
 *   - shared.txt：tracked，内容被改（diffBase 中存在）
 *   - new.txt：untracked 新文件（diffBase/index 中都不存在）
 * 主仓库干净、HEAD == baseHash（baselineHash 省略→4.5 跳过；5a/5b 通过）→ 直达 step 7 apply。
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
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'wtc-'))
  sh('git init', d)
  sh('git config user.email t@t.co && git config user.name t', d)
  fs.writeFileSync(path.join(d, 'base.txt'), 'base\n')
  // shared.txt：tracked 交付物，worktree 会修改它
  fs.writeFileSync(path.join(d, 'shared.txt'), 'original\n')
  sh('git add -A && git commit -m init', d)
  fs.mkdirSync(path.join(d, '.sillyspec', '.runtime', 'worktrees', 'tc'), { recursive: true })
  fs.writeFileSync(path.join(d, '.gitignore'), '.sillyspec/\n')
  sh('git add -A && git commit -m gitignore', d)
  // _resolveMainRepoRoot 用 existsSync('git rev-parse --git-common-dir')，测试需 chdir 到 d
  process.chdir(d)
  return d
}

console.log('=== worktree-apply: tracked/untracked 分类 characterization ===\n')

console.log('--- tracked 改动 + untracked 新文件混合 → 都正确应用到主仓库 ---')
{
  const d = setupRepo()
  const base = execSync('git rev-parse HEAD', { cwd: d, encoding: 'utf8' }).trim()
  const wtDir = path.join(d, '.sillyspec', '.runtime', 'worktrees', 'tc')
  sh(`git worktree add "${wtDir}" -b sillyspec/tc`, d)

  // worktree 未 commit 改动（真实子代理流程）
  // tracked-modified：shared.txt 在 diffBase(base) tree 中
  fs.writeFileSync(path.join(wtDir, 'shared.txt'), 'modified-by-worktree\n')
  // untracked-new：new.txt 不在 diffBase、不在 index
  fs.writeFileSync(path.join(wtDir, 'new.txt'), 'brand-new-file\n')

  // baselineHash 省略 → step 4.5 跳过；主仓库干净 + HEAD==base → 5a/5b 通过 → 直达 apply
  const meta = {
    name_zh: 'meta', changeName: 'tc', branch: 'sillyspec/tc',
    baseBranch: 'master', baseHash: base, baselineCommit: base,
    worktreePath: wtDir, mode: 'worktree', baselineFiles: [],
  }
  fs.writeFileSync(path.join(wtDir, 'meta.json'), JSON.stringify(meta))

  const r = applyWorktree('tc', { cwd: d })
  assertTrue(r.ok === true, `apply 成功 ok=true（实际 errors: ${r.errors.join(';') || '无'}）`)
  assertTrue(r.errors.length === 0, `无 error（实际 ${r.errors.length}）`)

  // tracked 文件：经 git diff baseHash 应用 → 内容应是 worktree 修改后版本
  const sharedPath = path.join(d, 'shared.txt')
  assertTrue(fs.existsSync(sharedPath), '主仓库 shared.txt 存在（tracked 应用）')
  // 注：Windows core.autocrlf=true 时 git apply 会把 LF→CRLF，按字节严格比较会假阳失败。
  // 归一化换行后比较——语义契约是「worktree 内容正确落地」，换行差异非 apply 正确性问题，
  // 且批量化不动 diff/add/apply 管道，归一化不会掩盖真实回归。
  const norm = s => s.replace(/\r\n/g, '\n')
  const sharedActual = fs.readFileSync(sharedPath, 'utf8')
  assertTrue(norm(sharedActual) === 'modified-by-worktree\n',
    `shared.txt 内容=worktree 修改版（实际: ${JSON.stringify(sharedActual)}）`)

  // untracked 文件：经 git add + diff --cached 应用 → 必须存在（误判 tracked 会丢）
  const newPath = path.join(d, 'new.txt')
  assertTrue(fs.existsSync(newPath), '⚠️核心：主仓库 new.txt 存在（untracked 经 add+cached 应用，误判 tracked 会丢）')
  const newActual = fs.readFileSync(newPath, 'utf8')
  assertTrue(norm(newActual) === 'brand-new-file\n',
    `new.txt 内容正确（实际: ${JSON.stringify(newActual)}）`)

  process.chdir(os.tmpdir()); fs.rmSync(d, { recursive: true, force: true })
}

console.log(`\n${'='.repeat(50)}`)
const total = 6
console.log(`✅ 通过: ${total - failed}  ❌ 失败: ${failed}`)
if (failures.length > 0) { console.log('失败项:'); failures.forEach(f => console.log(`  - ${f}`)) }
console.log('='.repeat(50))
if (failed > 0) process.exit(1)
