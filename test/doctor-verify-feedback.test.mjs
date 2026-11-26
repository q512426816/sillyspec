/**
 * 三坑回归：未落仓虚警降噪 / 归档变更 worktree 误供给 / verify 服务进程回收
 *
 * 坑（2026-08-21 用户实证）：
 *   ① doctor「未落主仓交付」不比对 main 工作区副本——apply 后逐字节一致的 M 文件仍算「未落仓」虚警
 *   ② 已归档变更的 worktree 被 doctor 当活跃任务 re-provision（给死目录装依赖）
 *   ③ verify「真实启动验证」起的服务无回收机制（uvicorn 漏挂一天多）
 */
import fs from 'fs'
import path from 'path'
import os from 'os'
import { execSync, spawn } from 'child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { WorktreeManager } from '../src/worktree.js'

const __dirname = fileURLToPath(import.meta.url).replace(/[^/\\]+$/, '')
const root = join(__dirname, '..')
const binCLI = join(root, 'bin', 'sillyspec.js')
import { join } from 'node:path'

let failed = 0, total = 0
const failures = []
function assertTrue(cond, msg) {
  total++
  if (cond) console.log(`  ✅ PASS: ${msg}`)
  else { failed++; failures.push(msg); console.log(`  ❌ FAIL: ${msg}`) }
}
function run(cmd) {
  try { return { out: execSync(cmd, { encoding: 'utf8', timeout: 90000 }), status: 0 } }
  catch (e) { return { out: (e.stdout || '') + (e.stderr || ''), status: e.status } }
}
const tmpDirs = []
function mkRepo(prefix) {
  const d = join(os.tmpdir(), `dvfb-${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`)
  tmpDirs.push(d)
  fs.mkdirSync(d, { recursive: true })
  execSync('git init -q -b main', { cwd: d, stdio: 'pipe' })
  execSync('git config user.email t@t && git config user.name t', { cwd: d, stdio: 'pipe' })
  fs.writeFileSync(join(d, 'base.txt'), 'base\n')
  execSync('git add -A && git commit -qm base', { cwd: d, stdio: 'pipe' })
  fs.writeFileSync(join(d, '.gitignore'), '.sillyspec/\n')
  execSync('git add -A && git commit -qm gi', { cwd: d, stdio: 'ignore' })
  return d
}
const cleanupAll = () => { for (const d of tmpDirs) { try { fs.rmSync(d, { recursive: true, force: true }) } catch {} } }
function seedWorktree(d, cn) {
  const wtDir = join(d, '.sillyspec', '.runtime', 'worktrees', cn)
  execSync(`git worktree add "${wtDir}" -b sillyspec/${cn}`, { cwd: d, stdio: 'pipe' })
  const base = execSync('git rev-parse HEAD', { cwd: d, encoding: 'utf8' }).trim()
  fs.writeFileSync(join(wtDir, 'meta.json'), JSON.stringify({
    changeName: cn, worktreePath: wtDir, mode: 'worktree',
    baseHash: base, baselineCommit: base, branch: `sillyspec/${cn}`, createdAt: new Date().toISOString(),
  }))
  return { wtDir, base }
}

console.log('=== ① 未落仓虚警降噪：main 工作区逐字节一致副本（坑 unapplied-false-positive-workspace-copy）===\n')
{
  const d = mkRepo('dedup')
  const cn = '2026-08-22-dedup'
  const { wtDir } = seedWorktree(d, cn)
  // worktree 改 + main 工作区逐字节一致副本（apply 后未 commit 形态）
  fs.writeFileSync(join(wtDir, 'base.txt'), 'changed\n')
  fs.writeFileSync(join(d, 'base.txt'), 'changed\n')
  const wm = new WorktreeManager({ cwd: d })
  const r = wm.hasUnappliedChanges(cn)
  assertTrue(r.hasChanges === false, `逐字节一致工作区副本 → 不再虚警「未落仓」（reason: ${r.reason}）`)
  // 分叉保护面：main 副本内容不同 → 仍拦
  fs.writeFileSync(join(d, 'base.txt'), 'different-main\n')
  const r2 = wm.hasUnappliedChanges(cn)
  assertTrue(r2.hasChanges === true, 'main 副本内容分叉 → 仍判未落仓（护栏保留）')
  execSync(`git worktree remove --force "${wtDir}"`, { cwd: d, stdio: 'ignore' })
}

console.log('\n=== ② 归档变更 worktree 不供给改清理（坑 doctor-reprovision-archived-change）===\n')
{
  const d = mkRepo('arch')
  const cn = '2026-08-22-arch-wt'
  const { wtDir } = seedWorktree(d, cn)
  run(`node "${binCLI}" --dir "${d}" init`)
  // 归档变更：目录进 archive/（实体证据）
  const changeDir = join(d, '.sillyspec', 'changes', cn)
  fs.mkdirSync(changeDir, { recursive: true })
  fs.writeFileSync(join(changeDir, 'plan.md'), '# P\n')
  const archiveDir = join(d, '.sillyspec', 'changes', 'archive')
  fs.mkdirSync(archiveDir, { recursive: true })
  fs.renameSync(changeDir, join(archiveDir, cn))
  const wm = new WorktreeManager({ cwd: d })
  const diag = await wm.doctor({ fix: true })
  const issue = diag.issues.find(i => i.type === 'worktree-archived-change' && i.name === cn)
  assertTrue(!!issue, `归档变更 worktree 报 worktree-archived-change（非 deps-*，issues: ${diag.issues.map(i => i.type).join(',')}）`)
  assertTrue(!diag.fixed.some(m => m.includes('re-provisioned')), '无 re-provision（不给死目录装依赖）')
  assertTrue(diag.fixed.some(m => m.includes('cleaned archived-change worktree')) || !fs.existsSync(join(d, '.sillyspec', '.runtime', 'worktrees', cn, 'meta.json')), 'fix 走清理路径（meta 已清）')
  if (fs.existsSync(wtDir)) { try { execSync(`git worktree remove --force "${wtDir}"`, { cwd: d, stdio: 'ignore' }) } catch {} }
  // 未归档的普通 worktree 仍走 deps 供给路径（零回归）：deps-failed 仍报
  const cn2 = '2026-08-22-active-wt'
  const { wtDir: wt2 } = seedWorktree(d, cn2)
  fs.writeFileSync(join(wt2, 'meta.json'), JSON.stringify({
    changeName: cn2, worktreePath: wt2, mode: 'worktree',
    baseHash: 'deadbeef', baselineCommit: 'deadbeef', branch: `sillyspec/${cn2}`,
    createdAt: new Date().toISOString(), depsStatus: 'failed', depsError: 'x',
  }))
  const diag2 = await new WorktreeManager({ cwd: d }).doctor({})
  assertTrue(diag2.issues.some(i => i.type === 'deps-failed' && i.name === cn2), '活跃变更仍报 deps-failed（供给路径零回归）')
  execSync(`git worktree remove --force "${wt2}"`, { cwd: d, stdio: 'ignore' })
}

// ③ verify 服务 PID 登记 + 收尾回收：随 verify 阶段退役（2026-11-26-verify-stage-retire / D-008——
//   登记源头 verify prompt 已删、reapVerifyServices 已删，机制不存在则无从回收，本段退役）。

cleanupAll()
console.log(`\n${'='.repeat(50)}`)
console.log(`✅ 通过: ${total - failed}  ❌ 失败: ${failed}`)
if (failures.length) { console.log('失败项:'); failures.forEach(f => console.log('  - ' + f)) }
console.log('='.repeat(50))
if (failed > 0) process.exit(1)

