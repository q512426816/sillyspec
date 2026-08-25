/**
 * worktree apply review.json 声明偏差文件放行测试（坑 apply-undeclared-deviation-block，
 * 2026-08-24 用户反馈四期③）。
 *
 * 场景：执行期有据越界文件（facade 转发/名单测试）不在 design §6 也不在 allowed_paths，
 * Gate1 拦 apply 只能回改 design.md。review.json changedFiles（Task Review Gate 已做 git 证据
 * 交叉校验）作为 allow set 第三源：声明即放行 + 审计 warning；完全越界仍拦。
 *
 * 覆盖：
 * 1. review 声明含未列文件 → Gate1 放行 + 审计 warning 点名 + result.reviewAdmittedFiles
 * 2. 无 review → 仍拦（报错文案给 review/design 两条出路）
 * 3. 跨仓 review（repo:other）不进 main 集 → 仍拦
 * 4. assessApplyRisk Gate2 同步豁免（不再 BLOCKED，降 warning 注明来源）
 * 5. review 声明 .sillyspec/ 运行时产物 → 不进 allow（过滤口径）
 */
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs'
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

console.log('--- 1. review 声明含未列文件 → Gate1 放行 + 审计 warning ---')
{
  const { d, changeName } = makeFixture()
  writeReview(d, changeName, ['src-app.js', 'src-facade.js'])
  const logs = []
  const orig = { log: console.log, error: console.error, warn: console.warn }
  console.log = (...a) => logs.push(a.join(' ')); console.error = (...a) => logs.push(a.join(' ')); console.warn = (...a) => logs.push(a.join(' '))
  let r
  try { r = applyWorktree(changeName, { cwd: d }) } finally { console.log = orig.log; console.error = orig.error; console.warn = orig.warn }
  assert(r.ok === true, `apply 放行（errors: ${JSON.stringify(r.errors)}）`)
  assert(r.reviewAdmittedFiles && r.reviewAdmittedFiles.includes('src-facade.js'), `reviewAdmittedFiles 记录偏差文件（实际 ${JSON.stringify(r.reviewAdmittedFiles)}）`)
  assert((r.warnings || []).some(w => w.includes('review 声明放行') && w.includes('src-facade.js')), '审计 warning 点名 facade')
  assert(readFileSync(join(d, 'src-facade.js'), 'utf8') === 'facade forward\n', '偏差文件已落地主仓')
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

console.log('--- 4. assessApplyRisk Gate2 同步豁免 ---')
{
  const { d, changeName } = makeFixture()
  writeReview(d, changeName, ['src-app.js', 'src-facade.js'])
  const assess = assessApplyRisk(changeName, { cwd: d })
  assert(assess.decision !== 'BLOCKED', `assess 不再 BLOCKED（decision=${assess.decision}, reasons=${JSON.stringify(assess.reasons)}）`)
  assert((assess.warnings || []).some(w => w.includes('review 声明偏差文件') && w.includes('src-facade.js')), 'Gate2 降 warning 注明 review 来源')
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
