/**
 * 四坑回归（2026-08-22 全程总结）：
 *   ① doctor reprovision 对 junction 丢失场景 link 优先重建（不再盲目 force install）
 *   ② apply ENOBUFS 自动降级 merge + GIT_MAX_BUFFER 256MB
 *   ③ verify 字面证据对账：同义扩充 + CLI 回执（表述差异不再误拦三轮）
 *   ④ execute 启动时跨变更文件冲突预警
 */
import fs from 'fs'
import path from 'path'
import os from 'os'
import { execSync, spawnSync } from 'child_process'
import { fileURLToPath } from 'node:url'
import { checkIntegrationEvidence } from '../src/change-risk-profile.js'
import { runValidators } from '../src/stage-contract.js'

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
  // execSync + 2>&1 重定向：预警类 console.warn 走 stderr，拼 2>&1 并入 stdout（成功路径可捕获）
  try { return { out: execSync(cmd + ' 2>&1', { encoding: 'utf8', timeout: 90000, shell: true }), status: 0 } }
  catch (e) { return { out: (e.stdout || '') + (e.stderr || ''), status: e.status } }
}
const tmpDirs = []
function mkRepo(prefix) {
  const d = join(os.tmpdir(), `ff-${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`)
  tmpDirs.push(d)
  fs.mkdirSync(d, { recursive: true })
  execSync('git init -q -b main', { cwd: d, stdio: 'pipe' })
  execSync('git config user.email t@t && git config user.name t', { cwd: d, stdio: 'pipe' })
  execSync('git config core.autocrlf false', { cwd: d, stdio: 'pipe' })
  fs.writeFileSync(join(d, 'base.txt'), 'base\n')
  execSync('git add -A && git commit -qm base', { cwd: d, stdio: 'pipe' })
  fs.writeFileSync(join(d, '.gitignore'), '.sillyspec/\n')
  execSync('git add -A && git commit -qm gi', { cwd: d, stdio: 'ignore' })
  return d
}
const cleanupAll = () => { for (const d of tmpDirs) { try { fs.rmSync(d, { recursive: true, force: true }) } catch {} } }

console.log('=== ② GIT_MAX_BUFFER 256MB + ENOBUFS 降级 ===\n')
{
  const ghSrc = fs.readFileSync(join(root, 'src', 'git-helper.js'), 'utf8')
  const m = /const GIT_MAX_BUFFER = (\d+) \* (\d+) \* (\d+)/.exec(ghSrc)
  const GIT_MAX_BUFFER = m ? Number(m[1]) * Number(m[2]) * Number(m[3]) : 0
  assertTrue(GIT_MAX_BUFFER >= 256 * 1024 * 1024, `git 输出缓冲 ≥256MB（实得 ${GIT_MAX_BUFFER / 1024 / 1024}MB）`)
  const src = fs.readFileSync(join(root, 'src', 'worktree-apply.js'), 'utf8')
  assertTrue(src.includes('ENOBUFS 自动降级') || src.includes('ENOBUFS，超大 diff'), 'apply ENOBUFS → 自动 applyByMerge 降级分支在位')
  assertTrue(ghSrc.includes('256 * 1024 * 1024'), 'git-helper 缓冲常量 256MB')
}

console.log('\n=== ③ 字面证据同义扩充 + CLI 回执（坑 verify-literal-evidence-mismatch）===\n')
{
  // 3a：自然表述（无旧字面词）现在直接过
  const natural = '# 验证\n\n## 结论\n\nPASS\n\n服务已拉起并发了实际请求，日志摘录见下：GET /api/x → 200'
  const r1 = checkIntegrationEvidence(natural, ['real_daemon_backend_integration', 'runtime_log_evidence', 'terminal_state_assertion'])
  assertTrue(r1.errors.length === 0, `自然表述（拉起/实际请求/日志摘录）过集成+日志证据（errors: ${r1.errors.join('; ')})`)
  const r2 = checkIntegrationEvidence('服务已启动并完成启动验证', ['real_startup_once'])
  assertTrue(r2.errors.length === 0, `「已启动/启动验证」过 real_startup_once（errors: ${r2.errors.join('; ')}）`)
  // 3b：旧字面仍过（零回归）
  const r3 = checkIntegrationEvidence('端到端测试通过，Runtime Evidence 含 daemon log', ['real_daemon_backend_integration', 'runtime_log_evidence'])
  assertTrue(r3.errors.length === 0, '旧字面词照常通过（零回归）')
  // 3c：毫无证据仍拦（防松过头）
  const r4 = checkIntegrationEvidence('PASS 一切正常', ['real_startup_once'])
  assertTrue(r4.errors.length > 0, '无任何证据表述仍拦截（不放松底线）')
  // 3d：CLI 回执注入——措辞完全不含证据词，但回执存在 → 过
  const r5 = checkIntegrationEvidence('PASS', ['real_startup_once', 'runtime_log_evidence'],
    { extraEvidenceText: 'CLI 回执：verify 服务进程已回收 2 个（PID 已登记，真实启动，运行时证据 reapedAt=2026-08-22）' })
  assertTrue(r5.errors.length === 0, `CLI 回执注入 → 措辞无关也过（errors: ${r5.errors.join('; ')}）`)
  // 3e：e2e——validator 读回执文件（runtime/verify-services.receipt.json）
  {
    const d = mkRepo('receipt')
    const cn = '2026-08-22-rcpt'
    const changeDir = join(d, '.sillyspec', 'changes', cn)
    fs.mkdirSync(changeDir, { recursive: true })
    fs.writeFileSync(join(changeDir, 'design.md'), '---\nauthor: t\ncreated_at: 2026-08-22 00:00:00\nrisk_level: deployment-critical\n---\n# D\n\ndaemon 与 backend 集成、server.js 启动入口。\n\n## 文件变更清单\n| 操作 | 文件路径 | 说明 |\n|---|---|---|\n| 修改 | src/server.js | 入口 |\n')
    fs.writeFileSync(join(changeDir, 'plan.md'), '---\nplan_level: none\n---\n# Plan\n')
    fs.writeFileSync(join(changeDir, 'verify-result.md'),
      '---\nauthor: t\ncreated_at: 2026-08-22 00:00:00\n---\n# 验证\n\n## 结论\n\nPASS\n\n测试全过。\n')
    const runtimeRoot = join(d, '.sillyspec', '.runtime')
    fs.mkdirSync(runtimeRoot, { recursive: true })
    fs.writeFileSync(join(runtimeRoot, 'verify-services.receipt.json'),
      JSON.stringify({ change: cn, reapedPidCount: 2, reapedAt: '2026-08-22T10:00:00Z' }))
    const before = runValidators('verify', d, cn, {})
    assertTrue(before.ok === true || before.errors.length === 0,
      `e2e：回执文件让 deployment-critical 证据门通过（errors: ${before.errors.slice(0, 2).join('; ').slice(0, 100)}）`)
    fs.rmSync(join(runtimeRoot, 'verify-services.receipt.json'))
    const after = runValidators('verify', d, cn, {})
    assertTrue(after.errors.length > 0, `对照：删回执后同样措辞被拦（回执是决定性信号，errors: ${after.errors.length}）`)
  }
}

console.log('\n=== ① doctor reprovision 分流：junction 丢失 → link 优先重建 ===\n')
{
  const src = fs.readFileSync(join(root, 'src', 'worktree.js'), 'utf8')
  assertTrue(src.includes('relinkFirst'), 'relinkFirst 分流在位（missing/failed → 非 force link 优先）')
  assertTrue(src.includes("issueType === 'deps-missing' || issueType === 'deps-failed'"), 'doctor 调用处按触发类型传 relinkFirst')
  // 行为验证：lockfile 一致 + main 有 node_modules + wt 缺 → 非 force reprovision 重建 junction
  const d = mkRepo('relink')
  const main = d; const cn = '2026-08-22-relink'
  const wtDir = join(d, '.sillyspec', '.runtime', 'worktrees', cn)
  execSync(`git worktree add "${wtDir}" -b sillyspec/${cn}`, { cwd: d, stdio: 'pipe' })
  const base = execSync('git rev-parse HEAD', { cwd: d, encoding: 'utf8' }).trim()
  fs.writeFileSync(join(d, 'package-lock.json'), 'same-lock')
  fs.writeFileSync(join(wtDir, 'package-lock.json'), 'same-lock')
  fs.writeFileSync(join(wtDir, 'package.json'), JSON.stringify({ name: 'x', dependencies: { a: '1' } }))
  fs.mkdirSync(join(d, 'node_modules'))
  fs.writeFileSync(join(d, 'node_modules', '.keep'), '')
  fs.writeFileSync(join(wtDir, 'meta.json'), JSON.stringify({
    changeName: cn, worktreePath: wtDir, mode: 'worktree',
    baseHash: base, baselineCommit: base, branch: `sillyspec/${cn}`,
    createdAt: new Date().toISOString(), depsStatus: 'missing',
  }))
  const { WorktreeManager } = await import(new URL('file:///' + join(root, 'src', 'worktree.js').replaceAll('\\', '/')).href)
  const wm = new WorktreeManager({ cwd: d })
  const r = wm._doctorReprovision(cn, wtDir, { relinkFirst: true })
  assertTrue(r.ok === true && /linked/.test(r.msg), `relinkFirst reprovision → linked 重建 junction（msg: ${r.msg}）`)
  const linked = fs.existsSync(join(wtDir, 'node_modules'))
  assertTrue(linked, 'junction 实际重建（node_modules 存在——后验证同口径）')
  execSync(`git worktree remove --force "${wtDir}"`, { cwd: d, stdio: 'ignore' })
}

console.log('\n=== ④ execute 启动跨变更冲突预警（坑 cross-change-conflict-no-warning）===\n')
{
  const d = mkRepo('xconf')
  run(`node "${binCLI}" --dir "${d}" init`)
  const cnA = '2026-08-22-conflict-a'
  const cnB = '2026-08-22-conflict-b'
  for (const [cn, content] of [[cnA, 'a-version'], [cnB, 'b-version']]) {
    const cd = join(d, '.sillyspec', 'changes', cn)
    fs.mkdirSync(cd, { recursive: true })
    fs.writeFileSync(join(cd, 'plan.md'), '---\nplan_level: none\n---\n# Plan\n')
    // 各自 worktree 上未提交改 shared.txt（includeWorkingTree 并入 → 冲突可探测）
    const wtDir = join(d, '.sillyspec', '.runtime', 'worktrees', cn)
    execSync(`git worktree add "${wtDir}" -b sillyspec/${cn}`, { cwd: d, stdio: 'pipe' })
    const base = execSync('git rev-parse HEAD', { cwd: d, encoding: 'utf8' }).trim()
    fs.writeFileSync(join(wtDir, 'shared.txt'), content + '\n')
    fs.writeFileSync(join(wtDir, 'own-' + cn + '.txt'), content + '\n')
    fs.writeFileSync(join(wtDir, 'meta.json'), JSON.stringify({
      changeName: cn, worktreePath: wtDir, mode: 'worktree',
      baseHash: base, baselineCommit: base, branch: `sillyspec/${cn}`,
    }))
  }
  const { ProgressManager } = await import(new URL('file:///' + join(root, 'src', 'progress.js').replaceAll('\\', '/')).href)
  const pm = new ProgressManager({ specDir: join(d, '.sillyspec') })
  pm.init(d)
  pm.initChange(d, cnA)
  pm.initChange(d, cnB)
  const r = run(`node "${binCLI}" --dir "${d}" run execute --change ${cnA} --skip-approval "执行 A"`)
  assertTrue(r.out.includes('跨变更文件冲突预警'), `启动输出含冲突预警（尾 200：${r.out.slice(-200).replace(/\n/g, ' ')}）`)
  assertTrue(r.out.includes(cnB), '预警点名对端变更')
  assertTrue(r.out.includes('shared.txt'), '预警列出重叠文件')
  for (const cn of [cnA, cnB]) {
    try { execSync(`git worktree remove --force "${join(d, '.sillyspec', '.runtime', 'worktrees', cn)}"`, { cwd: d, stdio: 'ignore' }) } catch {}
  }
}

cleanupAll()
console.log(`\n${'='.repeat(50)}`)
console.log(`✅ 通过: ${total - failed}  ❌ 失败: ${failed}`)
if (failures.length) { console.log('失败项:'); failures.forEach(f => console.log('  - ' + f)) }
console.log('='.repeat(50))
if (failed > 0) process.exit(1)
