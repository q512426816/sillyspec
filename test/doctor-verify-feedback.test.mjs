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
import { definition as verifyDef } from '../src/stages/verify.js'

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

console.log('\n=== ③ verify 服务进程 PID 登记 + 收尾回收（坑 verify-service-process-leak）===\n')
{
  // prompt 契约：登记指引 + 硬要求措辞
  const prompt = verifyDef.steps.map(s => s.prompt || '').join('\n')
  assertTrue(prompt.includes('verify-services-<change-name>.pids'), 'verify prompt 含 PID 分片登记文件指引（按变更分片，跨会话不误杀）')
  assertTrue(prompt.includes('自动回收'), 'prompt 明示 CLI 收尾自动回收')
  // 回收器 e2e：真实起一个长驻子进程，写 PID 文件，走 verify gate 收尾（直接调 gates 逻辑较重——
  // 用 node 起一个 sleep 进程 + 手动触发 gates.js 的回收段不可单独导出，改为 e2e：完整 verify --done）
  const d = mkRepo('svc')
  run(`node "${binCLI}" --dir "${d}" init`)
  const cn = '2026-08-22-svc-verify'
  const changeDir = join(d, '.sillyspec', 'changes', cn)
  fs.mkdirSync(changeDir, { recursive: true })
  fs.writeFileSync(join(changeDir, 'plan.md'), '---\nplan_level: none\n---\n# Plan\n')
  fs.writeFileSync(join(changeDir, 'design.md'),
    '# Design\n\n## 背景\nx\n\n## 文件变更清单\n| 操作 | 文件路径 | 说明 |\n|------|---------|------|\n| 修改 | src/x.js | 改 |\n')
  // 起真实子进程（node 长驻）+ 登记 PID
  const child = spawn(process.execPath, ['-e', 'setInterval(()=>{},60000)'], { detached: false, stdio: 'ignore' })
  child.unref()
  const runtimeRoot = join(d, '.sillyspec', '.runtime')
  fs.mkdirSync(runtimeRoot, { recursive: true })
  fs.writeFileSync(join(runtimeRoot, `verify-services-${cn}.pids`), `${child.pid}\n`)
  // 直接调回收逻辑：gates.js 的回收段在 runStageCompletionGates 内联——用最小驱动：种 verify 阶段并 --done
  const { ProgressManager } = await import(pathToFileURL(join(root, 'src', 'progress.js')).href)
  const pm = new ProgressManager({ specDir: join(d, '.sillyspec') })
  pm.init(d)
  pm.initChange(d, cn)
  const progress = pm.read(d, cn)
  progress.currentChange = cn
  progress.currentStage = 'verify'
  progress.stages.verify = { status: 'in-progress', steps: verifyDef.steps.map((s, i) => ({
    name: s.name, status: i < verifyDef.steps.length - 1 ? 'completed' : 'pending',
  })) }
  pm._write(d, progress, cn)
  // verify-result.md（完成校验需要：结论须为「## 结论」二级标题 + PASS 字样）
  fs.writeFileSync(join(changeDir, 'verify-result.md'),
    '---\nauthor: t\ncreated_at: 2026-08-22 00:00:00\n---\n# 验证结果\n\n## 结论\n\nPASS\n\n## 任务完成度\n\nall\n')
  // 本地无 commands.test → verify 实测 skip 不阻断
  const r = run(`node "${binCLI}" --dir "${d}" run verify --done --change ${cn} --output "验证完成"`)
  assertTrue(r.out.includes('服务进程已回收'), `verify 收尾回收登记进程（输出含回收行，尾：${r.out.slice(-120)}）`)
  // POSIX 坑：子进程被外部 SIGTERM 后成 zombie，父进程（本测试）在 execSync 阻塞期间没有
  // 迭代事件循环就不会 reap，kill(pid,0) 对 zombie 也"成功"——假"泄漏"误报。轮询 ≤2s：
  // 每轮先让事件循环迭代（setTimeout tick 触发 SIGCHLD 处理完成 reap），reap 判据 =
  // exitCode/signalCode 已置（kill 信号退出时 exitCode=null/signalCode='SIGTERM'）或 kill 0 失败。
  // Windows 无 zombie 概念，kill 0 立即失败，首轮即过。
  let alive = true
  const deadline = Date.now() + 2000
  while (Date.now() < deadline) {
    await new Promise(resolve => setTimeout(resolve, 25))
    if (child.exitCode !== null || child.signalCode !== null) { alive = false; break }
    try { process.kill(child.pid, 0) } catch { alive = false; break }
  }
  assertTrue(!alive, '子进程已被 kill（不再泄漏；zombie 需事件循环迭代后 reap）')
  assertTrue(!fs.existsSync(join(runtimeRoot, `verify-services-${cn}.pids`)), 'PID 分片文件已清（不重复回收）')
}

cleanupAll()
console.log(`\n${'='.repeat(50)}`)
console.log(`✅ 通过: ${total - failed}  ❌ 失败: ${failed}`)
if (failures.length) { console.log('失败项:'); failures.forEach(f => console.log('  - ' + f)) }
console.log('='.repeat(50))
if (failed > 0) process.exit(1)

