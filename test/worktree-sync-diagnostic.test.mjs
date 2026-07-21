/**
 * computeBaseSync 单元测试：base（主仓库 HEAD）与 origin 默认分支的同步状态检测。
 *
 * 验证：up-to-date / behind / diverged / ahead / unknown / defaultBranch fallback。
 * 构造：真实 git 临时仓库 + bare origin + clone 制造远端新提交。computeBaseSync 是纯函数，
 * 只需 git 仓库 + origin，不造 .sillyspec（绕过 WorktreeManager.create 的前置）。
 */
import fs from 'fs'
import path from 'path'
import os from 'os'
import { execSync } from 'child_process'
import { computeBaseSync } from '../src/worktree.js'

let failed = 0
const failures = []
function assertTrue(cond, msg) {
  if (cond) console.log(`  ✅ PASS: ${msg}`)
  else { failed++; failures.push(msg); console.log(`  ❌ FAIL: ${msg}`) }
}
function sh(cmd, cwd) { execSync(cmd, { cwd, stdio: 'pipe' }) }
function rev(cwd, ref) { return execSync(`git rev-parse ${ref}`, { cwd, encoding: 'utf8' }).trim() }
function write(d, f, c) { fs.writeFileSync(path.join(d, f), c) }

// 造主仓库 d（默认分支强制 main，兼容老 git）+ bare origin，push main 建立远端 ref。
// setHead=false 时跳过 origin/HEAD 设置（用于 fallback 探测场景）。
function setupWithOrigin({ setHead = true } = {}) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'wts-'))
  sh('git init', d)
  sh('git symbolic-ref HEAD refs/heads/main', d) // 首个 commit 落在 main（兼容无 init.defaultBranch 的老 git）
  sh('git config user.email t@t.co && git config user.name t', d)
  write(d, 'base.txt', '1\n')
  sh('git add -A && git commit -m init', d)
  const origin = fs.mkdtempSync(path.join(os.tmpdir(), 'wto-'))
  sh('git init --bare', origin)
  execSync(`git --git-dir="${origin}" symbolic-ref HEAD refs/heads/main`, { stdio: 'pipe' })
  sh(`git remote add origin ${origin}`, d)
  sh('git push -u origin main', d)
  if (setHead) sh('git remote set-head origin main', d)
  return { d, origin }
}

// 在 origin 侧追加一个 commit（clone 到临时目录 → commit → push），主仓库 d 不 pull。
function pushCommitToOrigin(origin, file, content) {
  const other = fs.mkdtempSync(path.join(os.tmpdir(), 'wtc-'))
  execSync(`git clone --quiet -b main "${origin}" "${other}"`, { cwd: os.tmpdir(), stdio: 'pipe' })
  sh('git config user.email t@t.co && git config user.name t', other)
  write(other, file, content)
  sh(`git add -A && git commit -m "${file}"`, other)
  sh('git push --quiet origin main', other)
  fs.rmSync(other, { recursive: true, force: true })
}

function localCommit(d, file, content) {
  write(d, file, content)
  sh(`git add -A && git commit -m "${file}"`, d)
}

console.log('=== computeBaseSync：base 与 origin 同步状态检测 ===\n')

// ── up-to-date ──
console.log('--- up-to-date：base == origin/main ---')
{
  const { d, origin } = setupWithOrigin()
  const base = rev(d, 'HEAD')
  const diag = computeBaseSync(d, base)
  assertTrue(diag.status === 'up-to-date', `status=up-to-date（实际 ${diag.status}）`)
  assertTrue(diag.defaultBranch === 'main', `defaultBranch=main（实际 ${diag.defaultBranch}）`)
  fs.rmSync(d, { recursive: true, force: true }); fs.rmSync(origin, { recursive: true, force: true })
}

// ── behind ──
console.log('--- behind：origin 有新提交，主仓库不 pull ---')
{
  const { d, origin } = setupWithOrigin()
  pushCommitToOrigin(origin, 'new.txt', 'x\n')
  const base = rev(d, 'HEAD') // 主仓库 HEAD 仍是旧 init
  const diag = computeBaseSync(d, base) // 内部 fetch → 看到 behind
  assertTrue(diag.status === 'behind', `status=behind（实际 ${diag.status}）`)
  assertTrue(diag.behind >= 1, `behind>=1（实际 ${diag.behind}）`)
  assertTrue(diag.ahead === 0, `ahead=0（实际 ${diag.ahead}）`)
  fs.rmSync(d, { recursive: true, force: true }); fs.rmSync(origin, { recursive: true, force: true })
}

// ── diverged ──
console.log('--- diverged：主仓库本地 commit + origin 也 commit ---')
{
  const { d, origin } = setupWithOrigin()
  pushCommitToOrigin(origin, 'o.txt', 'o\n')
  localCommit(d, 'local.txt', 'l\n')
  const base = rev(d, 'HEAD')
  const diag = computeBaseSync(d, base)
  assertTrue(diag.status === 'diverged', `status=diverged（实际 ${diag.status}）`)
  assertTrue(diag.behind >= 1, `behind>=1（实际 ${diag.behind}）`)
  assertTrue(diag.ahead >= 1, `ahead>=1（实际 ${diag.ahead}）`)
  fs.rmSync(d, { recursive: true, force: true }); fs.rmSync(origin, { recursive: true, force: true })
}

// ── ahead ──
console.log('--- ahead：主仓库本地 commit，origin 无新提交 ---')
{
  const { d, origin } = setupWithOrigin()
  localCommit(d, 'local.txt', 'l\n')
  const base = rev(d, 'HEAD')
  const diag = computeBaseSync(d, base)
  assertTrue(diag.status === 'ahead', `status=ahead（实际 ${diag.status}）`)
  assertTrue(diag.ahead >= 1, `ahead>=1（实际 ${diag.ahead}）`)
  assertTrue(diag.behind === 0, `behind=0（实际 ${diag.behind}）`)
  fs.rmSync(d, { recursive: true, force: true }); fs.rmSync(origin, { recursive: true, force: true })
}

// ── unknown：无 remote ──
console.log('--- unknown：无 origin 远端 ---')
{
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'wts-'))
  sh('git init', d)
  sh('git config user.email t@t.co && git config user.name t', d)
  write(d, 'a.txt', '1\n'); sh('git add -A && git commit -m init', d)
  const base = rev(d, 'HEAD')
  const diag = computeBaseSync(d, base)
  assertTrue(diag.status === 'unknown', `status=unknown（实际 ${diag.status}）`)
  assertTrue(diag.defaultBranch === null, `defaultBranch=null（实际 ${diag.defaultBranch}）`)
  fs.rmSync(d, { recursive: true, force: true })
}

// ── defaultBranch fallback：未设 origin/HEAD，探测到 origin/main ──
console.log('--- defaultBranch fallback：无 origin/HEAD，探测到 origin/main ---')
{
  const { d, origin } = setupWithOrigin({ setHead: false })
  const base = rev(d, 'HEAD')
  const diag = computeBaseSync(d, base)
  assertTrue(diag.defaultBranch === 'main', `fallback 探测 defaultBranch=main（实际 ${diag.defaultBranch}）`)
  assertTrue(diag.status === 'up-to-date', `status=up-to-date（实际 ${diag.status}）`)
  fs.rmSync(d, { recursive: true, force: true }); fs.rmSync(origin, { recursive: true, force: true })
}

console.log(`\n${failed === 0 ? '✅ ALL PASS' : `❌ ${failed} FAILED`}`)
if (failures.length) console.log(failures.map(f => '  - ' + f).join('\n'))
process.exit(failed ? 1 : 0)
