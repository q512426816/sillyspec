/**
 * 三坑回归（2026-08-22）：
 *   ① review.head 真实 commit 契约——报错给可执行指引（commit 后取 HEAD）
 *   ② changedFiles 带注记后缀（（新增）// 修复）不再判「不相交」；中段括号路径段（(dashboard)）不误剥
 *   ③ execute 收尾提示 module-impact pending 死信（不等 verify 才拦）
 */
import fs from 'fs'
import path from 'path'
import os from 'os'
import { execSync } from 'child_process'
import { fileURLToPath } from 'node:url'
import { verifyReviewGitEvidence, validateTaskReviews } from '../src/task-review.js'

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
function sh(cmd, cwd) { execSync(cmd, { cwd, stdio: 'pipe' }) }
function run(cmd) {
  try { return { out: execSync(cmd + ' 2>&1', { encoding: 'utf8', timeout: 90000, shell: true }), status: 0 } }
  catch (e) { return { out: (e.stdout || '') + (e.stderr || ''), status: e.status } }
}
const tmpDirs = []
function mkRepo(prefix) {
  const d = join(os.tmpdir(), `rme-${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`)
  tmpDirs.push(d)
  fs.mkdirSync(d, { recursive: true })
  sh('git init -q -b main', d)
  sh('git config user.email t@t && git config user.name t', d)
  sh('git config core.autocrlf false', d)
  fs.writeFileSync(join(d, 'base.txt'), 'base\n')
  sh('git add -A && git commit -qm base', d)
  return d
}
const cleanupAll = () => { for (const d of tmpDirs) { try { fs.rmSync(d, { recursive: true, force: true }) } catch {} } }

console.log('=== ① base/head 伪 hash 报错给可执行指引（坑 review-head-real-commit-late）===\n')
{
  const d = mkRepo('head')
  const base = execSync('git rev-parse HEAD', { cwd: d, encoding: 'utf8' }).trim()
  const r = verifyReviewGitEvidence({ base, head: 'not-a-commit', changedFiles: [] }, d)
  assertTrue(r.ok === false && r.errors.some(e => e.includes('不是仓库中的真实 commit')), '伪 hash 仍判伪造')
  assertTrue(r.errors.some(e => e.includes('git add -A && git commit') && e.includes('git rev-parse HEAD')),
    `报错给可执行指引（commit 后取 HEAD 作 head）：${(r.errors[0] || '').slice(-100)}`)
  fs.rmSync(d, { recursive: true, force: true })
}

console.log('\n=== ② changedFiles 注记后缀剥离（坑 changedfiles-annotation-suffix-mismatch）===\n')
{
  const d = mkRepo('anno')
  // 真实 commit + 真实 diff 文件
  fs.mkdirSync(join(d, 'src'), { recursive: true })
  fs.writeFileSync(join(d, 'src', 'app.js'), 'app\n')
  sh('git add -A && git commit -qm work', d)
  const head = execSync('git rev-parse HEAD', { cwd: d, encoding: 'utf8' }).trim()
  const mk = (changedFiles) => verifyReviewGitEvidence({
    base: execSync('git rev-parse HEAD~1', { cwd: d, encoding: 'utf8' }).trim(),
    head, changedFiles,
  }, d)
  // 注记后缀形态全部应命中（不判不相交）
  assertTrue(mk(['src/app.js（新增）']).ok === true, '（新增）全角注记后缀 → 命中')
  assertTrue(mk(['src/app.js (dashboard 重构)']).ok === true, '(半角注记) 后缀 → 命中')
  assertTrue(mk(['src/app.js // 修复入口']).ok === true, '// 行内注释后缀 → 命中')
  assertTrue(mk(['src/app.js # note']).ok === true, '# 注释后缀 → 命中')
  // 中段括号路径段不误剥（用户正则贪婪吞 (dashboard) 的教训）
  fs.mkdirSync(join(d, 'packages', '(dashboard)'), { recursive: true })
  fs.writeFileSync(join(d, 'packages', '(dashboard)', 'x.js'), 'x\n')
  sh('git add -A && git commit -qm dash', d)
  const head2 = execSync('git rev-parse HEAD', { cwd: d, encoding: 'utf8' }).trim()
  const r2 = verifyReviewGitEvidence({
    base: execSync('git rev-parse HEAD~1', { cwd: d, encoding: 'utf8' }).trim(),
    head: head2, changedFiles: ['packages/(dashboard)/x.js'],
  }, d)
  assertTrue(r2.ok === true, '路径中段的 (dashboard) 段不被剥（结构化剥只认尾部注记）')
  // 完全无关路径仍判不相交（底线不松）+ 报错含指引（独立 base/head 对：work commit 区间）
  const r3 = verifyReviewGitEvidence({
    base: execSync('git rev-parse HEAD~2', { cwd: d, encoding: 'utf8' }).trim(),
    head: head2, changedFiles: ['totally/other/file.js'],
  }, d)
  assertTrue(r3.ok === false && r3.errors.some(e => e.includes('完全不相交') && e.includes('纯文件路径')),
    '无关路径仍拦 + 报错明示「changedFiles 必须纯路径，注记写 reviewerNotes」')
  fs.rmSync(d, { recursive: true, force: true })
}

console.log('\n=== ③ execute 收尾提示 module-impact pending 死信（坑 module-impact-debt-late-warn）===\n')
{
  const d = mkRepo('debt')
  run(`node "${binCLI}" --dir "${d}" init`)
  const cn = '2026-08-22-exec-debt'
  const changeDir = join(d, '.sillyspec', 'changes', cn)
  fs.mkdirSync(changeDir, { recursive: true })
  fs.writeFileSync(join(changeDir, 'plan.md'), '---\nplan_level: none\n---\n# Plan\n\n- [ ] task-01: 做 x\n')
  // module-impact.md 带 pending 死信行
  fs.writeFileSync(join(changeDir, 'module-impact.md'),
    '# 模块影响分析（Module Impact）— x\n\n## 模块影响矩阵\n\n## 更新结果\n\n| 目标 | 状态 |\n|---|---|\n| `modules/auth.md` | pending |\n| `modules/billing.md` | 待办 |\n')
  // 种 execute 阶段末步 pending，走 --done 收尾 gate
  const { ProgressManager } = await import(new URL('file:///' + join(root, 'src', 'progress.js').replaceAll('\\', '/')).href)
  const pm = new ProgressManager({ specDir: join(d, '.sillyspec') })
  pm.init(d)
  pm.initChange(d, cn)
  const progress = pm.read(d, cn)
  progress.currentChange = cn
  progress.currentStage = 'execute'
  // in-place meta（execute deps 门放行；module-impact 死信提示与 worktree 无关）
  const wtMetaDir = join(d, '.sillyspec', '.runtime', 'worktrees', cn)
  fs.mkdirSync(wtMetaDir, { recursive: true })
  fs.writeFileSync(join(wtMetaDir, 'meta.json'), JSON.stringify({
    changeName: cn, worktreePath: d, mode: 'in-place-fallback',
    baseHash: execSync('git rev-parse HEAD', { cwd: d, encoding: 'utf8' }).trim(),
    branch: 'sillyspec/' + cn,
    depsStatus: 'n/a', depsLockHash: 'none', depsCheckedAt: new Date().toISOString(),
  }))
  // 按真实 execute 定义种步骤（名不匹配会被重播种回 pending，走不到收尾 gate）
  const { getStageSteps } = await import(new URL('file:///' + join(root, 'src', 'run', 'shared.js').replaceAll('\\', '/')).href)
  const execDef = await getStageSteps('execute', d, progress, null)
  progress.stages.execute = { status: 'in-progress', steps: (execDef || []).map((st, i) => ({
    name: st.name, status: i < execDef.length - 1 ? 'completed' : 'pending',
  })) }
  pm._write(d, progress, cn)
  const r = run(`node "${binCLI}" --dir "${d}" run execute --done --change ${cn} --output "执行完成"`)
  const out = r.out
  assertTrue(out.includes('pending/待办项') && out.includes('文档同步债'),
    `execute --done 输出 pending 死信提示（尾 300：${out.slice(-300).replace(/\n/g, ' ')}）`)
  assertTrue(out.includes('verify 阶段会硬拦'), '提示明示 verify 硬拦（提前知情）')
  assertTrue(out.includes('modules/auth.md'), '死信行点名（auth）')
}

cleanupAll()
console.log(`\n${'='.repeat(50)}`)
console.log(`✅ 通过: ${total - failed}  ❌ 失败: ${failed}`)
if (failures.length) { console.log('失败项:'); failures.forEach(f => console.log('  - ' + f)) }
console.log('='.repeat(50))
if (failed > 0) process.exit(1)
