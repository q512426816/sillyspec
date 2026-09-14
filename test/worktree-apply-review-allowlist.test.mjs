/**
 * worktree apply review.json 声明偏差文件相交过滤测试（坑 apply-undeclared-deviation-block →
 * D-003@v1 收紧翻转，2026-09-14-change-ownership-guards task-03）。
 *
 * 场景：旧语义下执行期有据越界文件（facade 转发/名单测试）不在 design §6 也不在
 * allowed_paths，review.json changedFiles 声明即放行——troubleshooting §65 事件②实证该通道
 * 无相交校验，并行会话在途文件经声明真实放行。D-003 翻转后：review 声明只承认与 allow 面
 * （design 清单 ∪ 各 task target_files/allowed_paths ∪ linked-change 声明）相交的文件，
 * 不相交的外来声明剔除出放行面、进 violations 报告行（「review 声明了越权文件」嫌疑标注）。
 *
 * 覆盖：
 * 1. review 声明含未列文件 → Gate1 拦截 + violations 报告行（嫌疑标注）+ result.reviewOverdeclaredFiles
 * 2. 无 review → 仍拦（报错文案给 review 对照/design 清单两条出路）
 * 3. 跨仓 review（repo:other）不进 main 集 → 仍拦
 * 4. assess：外来声明经 Gate1（checkOnly errors）→ BLOCKED，reasons 含嫌疑标注
 * 5. review 声明 .sillyspec/ 运行时产物 → 不进 allow（过滤口径）
 */
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { spawnSync } from 'node:child_process'

import { applyWorktree, assessApplyRisk, collectReviewDeclaredFiles } from '../src/worktree-apply.js'

let passed = 0
let failed = 0

function assert(cond, msg) {
  if (cond) { console.log(`  ✅ PASS: ${msg}`); passed++ }
  else { console.log(`  ❌ FAIL: ${msg}`); failed++ }
}

function git(dir, args) {
  const r = spawnSync('git', args, { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  return { code: r.status, out: (r.stdout || '') + (r.stderr || '') }
}

function makeFixture() {
  const d = mkdtempSync(join(tmpdir(), 'ra-'))
  git(d, ['init', '-q', '-b', 'main'])
  git(d, ['config', 'user.email', 't@t.local'])
  git(d, ['config', 'user.name', 't'])
  git(d, ['config', 'core.autocrlf', 'false'])
  writeFileSync(join(d, 'src-app.js'), 'app v1\n')
  git(d, ['add', '.'])
  git(d, ['commit', '-q', '-m', 'base'])
  const base = git(d, ['rev-parse', 'HEAD']).out.trim()

  const changeName = 'tc'
  const wt = join(d, '.sillyspec', '.runtime', 'worktrees', changeName)
  git(d, ['worktree', 'add', '-q', wt, '-b', `sillyspec/${changeName}`])
  writeFileSync(join(wt, 'meta.json'), JSON.stringify({
    name: changeName, branch: `sillyspec/${changeName}`, worktreePath: wt,
    baseHash: base, actualBaseHash: base, baselineCommit: base, mode: 'worktree',
  }))
  const cd = join(d, '.sillyspec', 'changes', changeName)
  mkdirSync(join(cd, 'tasks'), { recursive: true })
  writeFileSync(join(cd, 'design.md'), [
    '# D', '', '## 文件变更清单', '| 操作 | 文件路径 | 说明 |', '|---|---|---|',
    '| 修改 | src-app.js | 改动 |', '',
  ].join('\n'))
  writeFileSync(join(cd, 'tasks', 'task-01.md'), [
    '---', 'id: task-01', 'title: t', 'title_zh: 任务', 'allowed_paths:', '  - src-app.js',
    'goal: >', '  实现。', 'implementation:', '  - 步骤', 'acceptance:', '  - 验收',
    'verify:', '  - node --version', 'constraints:', '  - 无', '---', '',
  ].join('\n'))
  // worktree 侧：改声明文件 + 新增未声明 facade（执行期合理偏差）
  writeFileSync(join(wt, 'src-app.js'), 'app v2\n')
  writeFileSync(join(wt, 'src-facade.js'), 'facade forward\n')
  return { d, wt, changeName, base }
}

/** 写 execute-run 的 review.json（change 戳归属） */
function writeReview(d, changeName, changedFiles, repo) {
  const runDir = join(d, '.sillyspec', '.runtime', 'execute-runs', 'exec-2026-08-24-120000')
  const taskDir = join(runDir, 'tasks', 'task-01')
  mkdirSync(taskDir, { recursive: true })
  writeFileSync(join(runDir, 'change'), changeName + '\n')
  const review = {
    schemaVersion: 2, task: 'task-01',
    base: '0'.repeat(40), head: '1'.repeat(40),
    changedFiles, specVerdict: 'pass', qualityVerdict: 'pass',
    reviewerNotes: 't', requiredEvidence: [],
  }
  if (repo) review.repo = repo
  writeFileSync(join(taskDir, 'review.json'), JSON.stringify(review, null, 2))
}

console.log('--- 1. review 声明含未列文件 → Gate1 拦截 + violations 报告行（嫌疑标注）---')
{
  const { d, changeName } = makeFixture()
  writeReview(d, changeName, ['src-app.js', 'src-facade.js'])
  const logs = []
  const orig = { log: console.log, error: console.error, warn: console.warn }
  console.log = (...a) => logs.push(a.join(' ')); console.error = (...a) => logs.push(a.join(' ')); console.warn = (...a) => logs.push(a.join(' '))
  let r
  try { r = applyWorktree(changeName, { cwd: d }) } finally { console.log = orig.log; console.error = orig.error; console.warn = orig.warn }
  assert(r.ok !== true, `apply 拦截（D-003 翻转：外来声明不再放行，errors: ${JSON.stringify(r.errors)}）`)
  assert(r.errors.some(e => e.includes('review 声明了越权文件') && e.includes('src-facade.js')), '外来声明进 violations 报告行（含嫌疑标注）')
  assert(r.reviewOverdeclaredFiles && r.reviewOverdeclaredFiles.includes('src-facade.js'), `reviewOverdeclaredFiles 记录外来声明（实际 ${JSON.stringify(r.reviewOverdeclaredFiles)}）`)
  assert((r.warnings || []).some(w => w.includes('review 声明了越权文件') && w.includes('src-facade.js')), '审计 warning 点名外来声明')
  assert(!existsSync(join(d, 'src-facade.js')), '外来声明文件不落地主仓')
  void logs
  rmSync(d, { recursive: true, force: true })
}

console.log('--- 2. 无 review → 仍拦（文案给 review/design 两条出路）---')
{
  const { d, changeName } = makeFixture()
  const r = applyWorktree(changeName, { cwd: d })
  assert(r.ok !== true && r.errors.some(e => e.includes('不在 design.md 清单、也不在 task review.json changedFiles 声明中')),
    `未声明文件仍拦（errors: ${JSON.stringify(r.errors)}）`)
  assert(r.errors.some(e => e.includes('review.json 的 changedFiles 声明')), '报错给 review 声明出路')
  rmSync(d, { recursive: true, force: true })
}

console.log('--- 3. 跨仓 review（repo:other）不进 main 集 ---')
{
  const { d, changeName } = makeFixture()
  writeReview(d, changeName, ['src-facade.js'], 'other')
  const byRepo = collectReviewDeclaredFiles(d, changeName)
  assert(!(byRepo.get('main') || []).includes('src-facade.js'), `跨仓声明不进 main 切片（实际 ${JSON.stringify([...byRepo])}）`)
  const r = applyWorktree(changeName, { cwd: d })
  assert(r.ok !== true, '跨仓声明不豁免主仓 Gate1（仍拦）')
  rmSync(d, { recursive: true, force: true })
}

console.log('--- 4. assess：外来声明经 Gate1（checkOnly errors）→ BLOCKED ---')
{
  const { d, changeName } = makeFixture()
  writeReview(d, changeName, ['src-app.js', 'src-facade.js'])
  const assess = assessApplyRisk(changeName, { cwd: d })
  assert(assess.decision === 'BLOCKED', `assess BLOCKED（decision=${assess.decision}, reasons=${JSON.stringify(assess.reasons)}）`)
  assert((assess.reasons || []).some(r => r.includes('review 声明了越权文件') && r.includes('src-facade.js')), 'reasons 含外来声明 violations 报告行')
  rmSync(d, { recursive: true, force: true })
}

console.log('--- 5. review 声明 .sillyspec/ 运行时产物不进 allow ---')
{
  const { d, changeName } = makeFixture()
  writeReview(d, changeName, ['src-app.js', '.sillyspec/quicklog/QUICKLOG-t.md', 'meta.json'])
  const byRepo = collectReviewDeclaredFiles(d, changeName)
  assert(!(byRepo.get('main') || []).some(f => f.startsWith('.sillyspec/') || f === 'meta.json'),
    `运行时产物被过滤（实际 ${JSON.stringify(byRepo.get('main'))}）`)
  rmSync(d, { recursive: true, force: true })
}

console.log(`\n合计: ${passed} 通过, ${failed} 失败`)
process.exit(failed > 0 ? 1 : 0)
