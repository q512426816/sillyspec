/**
 * 坑 main-apply-no-mutex + apply-overlap-all-or-nothing 回归
 *
 * 2026-08-23 用户实证（两点）：
 *   a. 两个会话同时 apply 操作 main 工作区互相清文件（rollbackApply 的 checkout HEAD /
 *      applyByMerge 的 merge / 成功后 cleanup 都直接改主仓，共享临界区零互斥），只能靠人收手；
 *   b. 主仓有并行在途变更（多 agent 常态）时 overlap 只能整批跳过，rescue 手动 cp 留混合状态。
 *
 * 锁定语义：
 *   1. --skip-overlap：重叠文件剔除、非重叠子集真实落地；重叠文件不动（主仓在途改动保留）、
 *      worktree 保留（hasUnappliedChanges 护栏拦 cleanup，跳过文件不丢）
 *   2. 全部重叠 + --skip-overlap → 明确报错（无可应用子集）
 *   3. 无 flag 照旧整批拦截（零回归），但文案给出 --skip-overlap 出路
 *   4. 主仓互斥锁：锁被占 → fail-closed 报错（含持有者 pid/changeName）；正常路径 fn 透传 + 锁释放
 */
import fs from 'fs'
import path from 'path'
import os from 'os'
import { execSync } from 'child_process'
import { applyWorktree, withMainRepoLock } from '../src/worktree-apply.js'
import { computeBaselineHash } from '../src/worktree.js'

let passed = 0
let failed = 0
const failures = []
function assertTrue(cond, msg) {
  if (cond) { passed++; console.log(`  ✅ PASS: ${msg}`) }
  else { failed++; failures.push(msg); console.log(`  ❌ FAIL: ${msg}`) }
}
function sh(cmd, cwd) { execSync(cmd, { cwd, stdio: 'pipe' }) }
function git(args, cwd) { return execSync('git ' + args, { cwd, encoding: 'utf8', stdio: 'pipe' }).trim() }

function setupRepo(prefix) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), prefix || 'wt-sko-'))
  sh('git init -q -b main', d)
  sh('git config user.email t@t.co && git config user.name t', d)
  sh('git config core.autocrlf false', d)
  fs.writeFileSync(path.join(d, 'fileA.txt'), 'a1\na2\na3\n')
  fs.writeFileSync(path.join(d, 'fileB.txt'), 'b1\nb2\nb3\n')
  sh('git add -A && git commit -qm init', d)
  fs.mkdirSync(path.join(d, '.sillyspec', '.runtime', 'worktrees', 'tc'), { recursive: true })
  fs.writeFileSync(path.join(d, '.gitignore'), '.sillyspec/\n')
  sh('git add -A && git commit -qm gitignore', d)
  process.chdir(d)
  return d
}
function setupWorktree(d, { wtChanges = [] } = {}) {
  const wtDir = path.join(d, '.sillyspec', '.runtime', 'worktrees', 'tc')
  sh(`git worktree add "${wtDir}" -b sillyspec/tc`, d)
  for (const [file, content] of wtChanges) fs.writeFileSync(path.join(wtDir, file), content)
  const base = git('rev-parse HEAD', d)
  return { wtDir, base }
}
function writeMeta(d, meta, wtDir) {
  const metaDir = wtDir || path.join(d, '.sillyspec', '.runtime', 'worktrees', 'tc')
  fs.writeFileSync(path.join(metaDir, 'meta.json'), JSON.stringify(meta))
}
function metaFor(d, { base, wtDir }) {
  return {
    name_zh: 'meta', changeName: 'tc', branch: 'sillyspec/tc',
    baseBranch: 'main', baseHash: base, baselineCommit: base, baselineHash: computeBaselineHash(d),
    worktreePath: wtDir, mode: 'worktree', baselineFiles: [],
  }
}
function cleanup(d) {
  process.chdir(os.tmpdir())
  fs.rmSync(d, { recursive: true, force: true })
}

console.log('=== --skip-overlap 部分应用 + 主仓互斥锁 ===\n')

// ── 1. --skip-overlap：非重叠子集落地，重叠文件与 worktree 都保留 ──
console.log('--- 1. --skip-overlap 应用非重叠子集 ---')
{
  const d = setupRepo('sko-part-')
  const { wtDir, base } = setupWorktree(d, {
    wtChanges: [['fileA.txt', 'WT-A\n'], ['fileB.txt', 'WT-B\n']],
  })
  // 主仓在途变更与 fileB 重叠（并行会话的未提交改动）
  fs.writeFileSync(path.join(d, 'fileB.txt'), 'DIRTY-B\n')
  writeMeta(d, metaFor(d, { base, wtDir }), wtDir)

  const r = applyWorktree('tc', { cwd: d, skipOverlap: true })
  assertTrue(r.ok === true, `apply 成功（errors: ${JSON.stringify((r.errors || []).map(e => e.slice(0, 80)))}）`)
  assertTrue(fs.readFileSync(path.join(d, 'fileA.txt'), 'utf8') === 'WT-A\n', '非重叠 fileA 真实落地主仓')
  assertTrue(fs.readFileSync(path.join(d, 'fileB.txt'), 'utf8') === 'DIRTY-B\n', '重叠 fileB 未被应用（主仓在途改动原样保留）')
  assertTrue((r.skippedOverlapFiles || []).includes('fileB.txt'), `skippedOverlapFiles 记录跳过文件（实际 ${JSON.stringify(r.skippedOverlapFiles)}）`)
  assertTrue((r.warnings || []).some(w => w.includes('--skip-overlap') && w.includes('fileB.txt')), 'warning 列出跳过文件与后续出路')
  assertTrue((r.warnings || []).some(w => w.includes('worktree 已保留')), '提示 worktree 已保留（跳过文件不丢）')
  assertTrue(fs.existsSync(wtDir), 'worktree 目录仍存在（hasUnappliedChanges 护栏拦住 cleanup）')
  assertTrue(fs.readFileSync(path.join(wtDir, 'fileB.txt'), 'utf8') === 'WT-B\n', '跳过文件安全留在 worktree')
  cleanup(d)
}

// ── 2. 全部重叠 + --skip-overlap → 明确报错 ──
console.log('--- 2. 全部重叠 → 无可应用子集报错 ---')
{
  const d = setupRepo('sko-all-')
  const { wtDir, base } = setupWorktree(d, { wtChanges: [['fileB.txt', 'WT-B\n']] })
  fs.writeFileSync(path.join(d, 'fileB.txt'), 'DIRTY-B\n')
  writeMeta(d, metaFor(d, { base, wtDir }), wtDir)

  const r = applyWorktree('tc', { cwd: d, skipOverlap: true })
  assertTrue(r.ok === false, '全部重叠 → 失败')
  assertTrue((r.errors || []).some(e => e.includes('无可应用子集')), `error 明确说明无可应用子集（实际 ${JSON.stringify((r.errors || []).map(e => e.slice(0, 60)))}）`)
  assertTrue(fs.readFileSync(path.join(d, 'fileB.txt'), 'utf8') === 'DIRTY-B\n', '主仓在途改动未被触碰')
  cleanup(d)
}

// ── 3. 无 flag 照旧整批拦截（零回归）+ 文案给 --skip-overlap 出路 ──
console.log('--- 3. 无 flag 整批拦截零回归 ---')
{
  const d = setupRepo('sko-none-')
  const { wtDir, base } = setupWorktree(d, { wtChanges: [['fileA.txt', 'WT-A\n']] })
  fs.writeFileSync(path.join(d, 'fileA.txt'), 'DIRTY-A\n')
  writeMeta(d, metaFor(d, { base, wtDir }), wtDir)

  const r = applyWorktree('tc', { cwd: d })
  assertTrue(r.ok === false && (r.errors || []).some(e => e.includes('无法安全应用')), '默认仍整批拦截（语义零回归）')
  assertTrue((r.errors || []).some(e => e.includes('--skip-overlap')), '拦截文案给出 --skip-overlap 出路（替代 rescue cp 手动路径）')
  assertTrue(fs.readFileSync(path.join(d, 'fileA.txt'), 'utf8') === 'DIRTY-A\n', '主仓未被动')
  cleanup(d)
}

// ── 4. 主仓互斥锁：被占 → fail-closed 报错含持有者；正常路径透传 + 释放 ──
// （坑 main-apply-no-mutex → 二批泛化 main-repo-no-mutex：withMainRepoLock 加 purpose，
//   apply/cleanup/归档共用 main-repo.lock）
console.log('--- 4. withMainRepoLock 互斥 ---')
{
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'sko-lock-'))
  const lockPath = path.join(d, '.sillyspec', '.runtime', 'main-repo.lock')
  fs.mkdirSync(path.join(d, '.sillyspec', '.runtime'), { recursive: true })
  // 预置他者会话的新鲜锁（pid=999 正在 apply other 变更）
  fs.writeFileSync(lockPath, JSON.stringify({ pid: 999, changeName: 'other-change', purpose: 'apply', startedAt: new Date().toISOString() }))

  let errMsg = ''
  try {
    await withMainRepoLock(d, 'tc', 'worktree-cleanup', async () => 'should-not-run', { timeoutMs: 400, retryMs: 80 })
  } catch (e) { errMsg = e.message }
  assertTrue(errMsg.includes('主仓互斥锁被占用'), `锁被占 → fail-closed 报错（实际: ${errMsg.slice(0, 90)}）`)
  assertTrue(errMsg.includes('pid=999') && errMsg.includes('other-change'), '报错含持有者 pid/changeName（可定位谁在操作）')
  assertTrue(errMsg.includes('apply'), '报错含持有者 purpose（在做什么操作）')
  assertTrue(errMsg.includes(lockPath), '报错给崩溃残留的删锁指引路径')

  // 正常路径（新目录：旧锁仍在他人手中是正确行为，本用例验证无竞争场景）：临界区执行 + 返回值透传 + 锁释放
  const d2 = fs.mkdtempSync(path.join(os.tmpdir(), 'sko-lock2-'))
  const v = await withMainRepoLock(d2, 'tc', 'apply', async () => 42, { timeoutMs: 1000 })
  assertTrue(v === 42, '无竞争时临界区返回值透传')
  assertTrue(!fs.existsSync(path.join(d2, '.sillyspec', '.runtime', 'main-repo.lock')), '锁已释放（finally unlink）')
  fs.rmSync(d, { recursive: true, force: true })
  fs.rmSync(d2, { recursive: true, force: true })
}

// ── 5. worktree cleanup CLI 撞锁 → 报错退出（不与并行 apply 互踩）──
console.log('--- 5. cleanup CLI 撞锁 fail-closed ---')
{
  const { spawnSync } = await import('child_process')
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'sko-cleanup-lock-'))
  sh('git init -q -b main', d)
  sh('git config user.email t@t.co && git config user.name t', d)
  fs.writeFileSync(path.join(d, 'README.md'), 'x\n')
  sh('git add -A && git commit -qm init', d)
  fs.mkdirSync(path.join(d, '.sillyspec', '.runtime'), { recursive: true })
  fs.writeFileSync(path.join(d, '.sillyspec', '.runtime', 'main-repo.lock'),
    JSON.stringify({ pid: 999, changeName: 'other', purpose: 'apply', startedAt: new Date().toISOString() }))
  const bin = path.join(path.dirname(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'))), 'bin', 'sillyspec.js')
  const r = spawnSync(process.execPath, [bin, '--dir', d, 'worktree', 'cleanup', 'tc'], {
    encoding: 'utf8', timeout: 30000,
    env: { ...process.env, SILLYSPEC_MAIN_REPO_LOCK_TIMEOUT_MS: '500' },
  })
  assertTrue(r.status === 1 || /互斥锁被占用/.test(String(r.stderr || '') + String(r.stdout || '')), `cleanup 撞锁非零退出/报互斥（status=${r.status}）`)
  assertTrue(String(r.stderr || '') .includes('互斥锁被占用'), '报错含互斥锁文案（含持有者信息）')
  fs.rmSync(d, { recursive: true, force: true })
}

console.log(`\n${'='.repeat(50)}`)
console.log(`✅ 通过: ${passed}  ❌ 失败: ${failed}`)
if (failures.length) console.log(`失败项: ${failures.join('; ')}`)
console.log(`${'='.repeat(50)}`)
if (failed > 0) process.exit(1)
