/**
 * archive CLI 下沉 git add 测试（坑4，FR-04）
 *
 * archiveChangeDirectory 移动变更目录 + 注销 change 后，CLI 下沉 safeGit add 确定性暂存
 * .sillyspec/changes/archive/ + .sillyspec/docs/，不靠 step5 prompt 驱动（prompt 保留兜底）。
 *
 * 通过 CLI（sillyspec run archive --done --confirm）驱动 archive「确认归档」步骤，
 * 在 .sillyspec/ 未被 gitignore 的临时仓里跑，验证 git index 含归档目录 + 模块文档（staged）。
 *
 * 注：共享 harness 的 makeRepo 会 gitignore .sillyspec/（保护其他测试的 git status），
 * 本测试要验证 git add 真暂存，故自建非 gitignore 的临时仓。
 */
import { writeFileSync, mkdirSync, mkdtempSync, rmSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { execFileSync } from 'node:child_process'
import { archiveDestDirName } from '../src/stage-contract.js'
import { ProgressManager } from '../src/progress.js'
import { runCLI } from './_cli-step-harness.mjs'

const count = { passed: 0, failed: 0, failures: [] }
const assert = (cond, msg) => {
  cond ? (count.passed++, console.log(`  ✅ PASS: ${msg}`))
       : (count.failed++, count.failures.push(msg), console.log(`  ❌ FAIL: ${msg}`))
}

function git(dir, args) {
  return execFileSync('git', args, { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
}
function initGitRepo(dir) {
  git(dir, ['init', '-q']); git(dir, ['config', 'user.email', 'test@test.local'])
  git(dir, ['config', 'user.name', 'test']); git(dir, ['config', 'commit.gpgsign', 'false'])
}

const ARCHIVE_STEPS = (lastStatus) => [
  { name: '任务完成度检查', status: 'completed' },
  { name: 'extract-module-impact', status: 'completed' },
  { name: 'sync-module-docs', status: 'completed' },
  { name: 'decision-distill 决策提炼', status: 'completed' },
  { name: '确认归档', status: 'pending' },
  { name: '更新路线图和提交', status: lastStatus },
]

const tmpRoots = []
// 与共享 harness makeRepo 的关键差异：不 gitignore .sillyspec/，让 git add 真暂存
function makeRepoNoIgnore(prefix) {
  const cwd = mkdtempSync(join(tmpdir(), prefix)); tmpRoots.push(cwd)
  initGitRepo(cwd)
  writeFileSync(join(cwd, 'README.md'), 'init\n')
  git(cwd, ['add', '.']); git(cwd, ['commit', '-q', '-m', 'init'])
  return { cwd, specBase: join(cwd, '.sillyspec') }
}
async function initChange(cwd, specBase, changeName) {
  const pm = new ProgressManager({ specDir: specBase })
  await pm.init(cwd)
  await pm.initChange(cwd, changeName)
  return pm
}
async function seedStage(pm, cwd, changeName, stageName, steps, status = 'in-progress') {
  const progress = await pm.read(cwd, changeName)
  progress.currentChange = changeName
  progress.stages = progress.stages || {}
  progress.stages[stageName] = { status, startedAt: '2026/8/6 00:00:00', completedAt: null, steps }
  await pm._write(cwd, progress, changeName)
  return progress
}

console.log('=== archive CLI 下沉 git add（坑4）===\n')

// ── Case 1: 归档后 git index 含 archive/<dest>/ + docs/ 已暂存 ──
console.log('--- Case 1: 确认归档后 archive/ + docs/ 已 staged ---')
{
  const { cwd, specBase } = makeRepoNoIgnore('archive-gitadd-1-')
  const cn = '2026-08-06-archive-gitadd'
  const pm = await initChange(cwd, specBase, cn)
  const changeDir = join(specBase, 'changes', cn)
  mkdirSync(changeDir, { recursive: true })
  writeFileSync(join(changeDir, 'plan.md'), '# Plan\n\n## Wave 1\n\n- [x] task-01: a\n')
  writeFileSync(join(changeDir, 'design.md'), '# Design\n')
  writeFileSync(join(changeDir, 'module-impact.md'), '# 模块影响分析\n')
  // 模块文档（交付物）—— 模拟 sync-module-docs 产出的新模块文档（untracked，待暂存）
  mkdirSync(join(specBase, 'docs', 'sillyspec', 'modules'), { recursive: true })
  writeFileSync(join(specBase, 'docs', 'sillyspec', 'modules', 'newmod.md'), '# New Module\n')
  // 把变更目录提交为 tracked（模拟真实仓：changes/<cn>/ 受版本控制）
  git(cwd, ['add', '.sillyspec/changes/'])
  git(cwd, ['commit', '-q', '-m', 'seed change'])
  // newmod.md 保持 untracked（未 commit），让 archive 的 git add docs/ 有东西可暂存

  await seedStage(pm, cwd, cn, 'archive', ARCHIVE_STEPS('pending'))

  // CLI 驱动 archive 确认归档（--done --confirm）
  const r = runCLI(['--dir', cwd, 'run', 'archive', '--done', '--confirm', '--change', cn, '--output', '确认归档'], { cwd })

  const date = new Date().toISOString().slice(0, 10)
  const destName = archiveDestDirName(date, cn)
  assert(r.status === 0, `归档 exit 0（实际 ${r.status}）`)

  const status = git(cwd, ['status', '--porcelain'])
  // porcelain v1：前 2 字符 XY 状态码，index 列为 A/R 即 staged add / staged rename。
  // 「他者半归档残留探测」补暂存（坑 archive-other-residual-rename）把源侧 D 一并暂存后，
  // git rename 检测会把「源删除 + 归档新增」聚合成 R 行（dest 是 rename 箭头右侧）——
  // 归档文件在 index 里的形态是 R 而非纯 A，断言取 rename 目标路径
  const staged = status.split('\n')
    .filter(l => l.length > 2 && (l[0] === 'A' || l[0] === 'R'))
    .map(l => {
      const body = l.slice(3)
      const arrow = body.indexOf(' -> ')
      return arrow !== -1 ? body.slice(arrow + 4).replace(/^"|"$/g, '') : body
    })
  console.log('    staged 文件:\n' + staged.map(s => '      ' + s).join('\n'))

  // 核心断言：archive/<dest>/ 下文件已暂存（rename 后由 CLI safeGit add 暂存）
  assert(staged.some(p => p === `.sillyspec/changes/archive/${destName}/plan.md`),
    `git index 含 archive/${destName}/plan.md（CLI 下沉 git add 生效）`)
  // docs/ 下 untracked 模块文档也被暂存
  assert(staged.some(p => p === '.sillyspec/docs/sillyspec/modules/newmod.md'),
    'git index 含 docs/sillyspec/modules/newmod.md（模块文档暂存）')
}

// ── Case 2: 归档移动 + 注销正常（safeGit add 不阻断归档主流程）──
console.log('--- Case 2: 归档移动 + 注销正常（git add 不阻断）---')
{
  const { cwd, specBase } = makeRepoNoIgnore('archive-gitadd-2-')
  const cn = '2026-08-06-archive-quiet'
  const pm = await initChange(cwd, specBase, cn)
  const changeDir = join(specBase, 'changes', cn)
  mkdirSync(changeDir, { recursive: true })
  writeFileSync(join(changeDir, 'plan.md'), '# Plan\n\n## Wave 1\n\n- [x] task-01: a\n')
  writeFileSync(join(changeDir, 'design.md'), '# Design\n')
  writeFileSync(join(changeDir, 'module-impact.md'), '# 模块影响分析\n')
  git(cwd, ['add', '.sillyspec/changes/']); git(cwd, ['commit', '-q', '-m', 'seed'])
  await seedStage(pm, cwd, cn, 'archive', ARCHIVE_STEPS('pending'))

  const r = runCLI(['--dir', cwd, 'run', 'archive', '--done', '--confirm', '--change', cn, '--output', '确认归档'], { cwd })

  const date = new Date().toISOString().slice(0, 10)
  const destName = archiveDestDirName(date, cn)
  const archivedDir = join(specBase, 'changes', 'archive', destName)
  assert(r.status === 0, `归档 exit 0（实际 ${r.status}）`)
  assert(existsSync(archivedDir), '归档目录 archive/<dest>/ 已落盘')
  assert(!existsSync(changeDir), '原 changes/<cn>/ 已移走（归档移动正常）')
}

for (const d of tmpRoots) { try { rmSync(d, { recursive: true, force: true }) } catch {} }

console.log(`\n${'='.repeat(50)}`)
console.log(`✅ 通过: ${count.passed}  ❌ 失败: ${count.failed}`)
if (count.failures.length) console.log(`失败项: ${count.failures.join('; ')}`)
console.log('='.repeat(50))
if (count.failed > 0) process.exit(1)
