/**
 * cross-repo-task-review.test.mjs — W2 task-04（A1/A2/A7 集成测）
 *
 * 设计依据：
 *   - design §6（test/cross-repo-task-review.test.mjs 用例）+ §7.4（review.json schema v2 repo 字段）
 *   - 决策 D-006（跨仓 head 实时取 git + base 锡点）/ D-010（base+head 双锡点）
 *   - 决策 D-013（4 调用点加 ctx 参数，缺省退化单仓零回归）
 *   - R-07（schemaVersion 1→2 向后兼容，v1 无 repo 视 main）
 *
 * 覆盖（A1/A2/A7）：
 *   A7 validateReviewSchema：
 *     - v2 review.json 带 repo 字段过 schema
 *     - v1 review.json（无 repo）向后兼容过 schema（视 main，不阻断既有 change）
 *     - repo 字段非字符串/非法类型 → 不阻断 schema（repo 只做类型宽松校验，真实存在性由 ctx fail-closed 兜）
 *   A1 verifyReviewGitEvidence：
 *     - 跨仓 review（repo=sillyspec）按 ctx.resolve(repo).gitDir 切到跨仓仓根校验，base/head 跨仓真实 commit 过
 *     - 调用方按 review.repo 选 gitDir（核心改动在调用点，函数签名不变）
 *   A2 generateTaskReviewDrafts：
 *     - 跨仓 task（repo:sillyspec + base_commit + head_commit 锡点）：base=head 读锡点，diff 在跨仓仓根跑
 *     - 跨仓 draft 落盘过 validateReviewSchema（v1 默认 + 可选 repo）
 *   主仓零回归：
 *     - validateTaskReviews 无 ctx 参数 → 走原 gitDir 路径（D-013 缺省退化）
 *     - generateTaskReviewDrafts 无 ctx 参数 → 主仓原逻辑不变
 *
 * 真实 git fixture（双仓：主仓 + 跨仓仓），与 task-review-draft.test.mjs / multi-repo-context.test.mjs 同风格。
 */
import fs from 'fs'
import path from 'path'
import os from 'os'
import { execSync } from 'child_process'
import {
  validateReviewSchema,
  validateTaskReviews,
  verifyReviewGitEvidence,
  generateTaskReviewDrafts,
  REVIEW_SCHEMA_VERSION,
} from '../src/task-review.js'
import { MultiRepoContext } from '../src/run/multi-repo-context.js'

let failed = 0
let total = 0
const failures = []
function assertTrue(cond, msg) {
  total++
  if (cond) console.log(`  ✅ PASS: ${msg}`)
  else { failed++; failures.push(msg); console.log(`  ❌ FAIL: ${msg}`) }
}
function sh(cmd, cwd) { execSync(cmd, { cwd, stdio: 'pipe' }) }

function makeRepo(prefix) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), prefix || 'crr-'))
  sh('git init -q', d)
  sh('git config user.email t@t.com', d)
  sh('git config user.name t', d)
  sh('git config commit.gpgsign false', d)
  return d
}

// 建主仓 worktree fixture（带 meta.json），返回 { d(mainCwd), base, wtDir, changeName }
function setupMainRepo(changeName) {
  const d = makeRepo('crr-main-')
  fs.writeFileSync(path.join(d, '.gitignore'), '.sillyspec/\n')
  sh('git add -A && git commit -q -m gitignore', d)
  fs.writeFileSync(path.join(d, 'feature.js'), 'base\n')
  sh('git add -A && git commit -q -m base', d)
  const base = execSync('git rev-parse HEAD', { cwd: d, encoding: 'utf8' }).trim()
  const wtDir = path.join(d, '.sillyspec', '.runtime', 'worktrees', changeName)
  fs.mkdirSync(wtDir, { recursive: true })
  sh(`git worktree add -q "${wtDir}" -b sillyspec/${changeName}`, d)
  return { d, base, wtDir }
}

function writeMeta(wtDir, changeName, base) {
  const meta = {
    name_zh: 'meta', changeName, branch: 'sillyspec/' + changeName,
    baseBranch: 'master', baseHash: base, baselineCommit: base,
    worktreePath: wtDir, mode: 'worktree', baselineFiles: [],
  }
  fs.writeFileSync(path.join(wtDir, 'meta.json'), JSON.stringify(meta))
}

function writeTask(d, changeName, taskId, fields, body) {
  const dir = path.join(d, '.sillyspec', 'changes', changeName, 'tasks')
  fs.mkdirSync(dir, { recursive: true })
  const lines = ['---', `id: ${taskId}`]
  if (fields.repo) lines.push(`repo: ${fields.repo}`)
  if (fields.base_commit) lines.push(`base_commit: ${fields.base_commit}`)
  if (fields.head_commit) lines.push(`head_commit: ${fields.head_commit}`)
  if (Array.isArray(fields.allowed_paths) && fields.allowed_paths.length > 0) {
    lines.push('allowed_paths:')
    for (const p of fields.allowed_paths) lines.push(`  - ${p}`)
  }
  lines.push('---', '', `# ${taskId}`, '', body || 'goal: ...')
  fs.writeFileSync(path.join(dir, taskId + '.md'), lines.join('\n') + '\n')
}

// ─────────────────────────────────────────────────────────────────────────
console.log('=== A7: validateReviewSchema（schemaVersion v1/v2 + repo 字段）===\n')

console.log('--- v2 review.json 带 repo 字段过 schema ---')
{
  const r = validateReviewSchema({
    schemaVersion: 2, task: 'task-01', repo: 'sillyspec',
    base: 'abc1234', head: 'def5678',
    specVerdict: 'pass', qualityVerdict: 'pass',
    changedFiles: ['src/x.js'], reviewerNotes: 'ok', requiredEvidence: [],
  })
  assertTrue(r.ok, `v2 + repo=sillyspec 过 schema（实际 errors: ${r.errors.join('; ')}）`)
}

console.log('--- v1 review.json（无 repo）向后兼容过 schema（视 main，不阻断既有 change）---')
{
  const r = validateReviewSchema({
    schemaVersion: 1, task: 'task-01',
    base: 'abc1234', head: 'def5678',
    specVerdict: 'pass', qualityVerdict: 'pass',
    changedFiles: ['src/x.js'], reviewerNotes: 'ok', requiredEvidence: [],
  })
  assertTrue(r.ok, `v1 无 repo 向后兼容过 schema（R-07，实际 errors: ${r.errors.join('; ')}）`)
}

console.log('--- v2 review.json 缺 repo 仍过 schema（repo 可选，缺省=main）---')
{
  const r = validateReviewSchema({
    schemaVersion: 2, task: 'task-01',
    base: 'abc1234', head: 'def5678',
    specVerdict: 'pass', qualityVerdict: 'pass',
    requiredEvidence: [],
  })
  assertTrue(r.ok, `v2 缺 repo 过 schema（repo 可选，实际 errors: ${r.errors.join('; ')}）`)
}

console.log('--- 非法 schemaVersion（3）仍被拒 ---')
{
  const r = validateReviewSchema({
    schemaVersion: 3, task: 'task-01',
    base: 'abc1234', head: 'def5678',
    specVerdict: 'pass', qualityVerdict: 'pass', requiredEvidence: [],
  })
  assertTrue(!r.ok, `schemaVersion=3 拒绝`)
  assertTrue(r.errors.some(e => /schemaVersion/.test(e)), `error 指明 schemaVersion（${r.errors.join('; ')}）`)
}

console.log('--- REVIEW_SCHEMA_VERSION 仍为 1（与 stage-review 共享常量，未提升以免破坏 stage-review）---')
{
  // design §7.4 说 task-review schemaVersion 1→2，但 REVIEW_SCHEMA_VERSION 常量被 stage-review.js
  // 共享（stage-review.test.mjs:358 + register.test.mjs:40 断言 === 1，且 stage-review.js 不在
  // allowed_paths）。validateReviewSchema 兼容两版（接受 [1,2]），常量保持 1 作 stage-review 写侧默认。
  assertTrue(REVIEW_SCHEMA_VERSION === 1, `REVIEW_SCHEMA_VERSION 保持 1（与 stage-review 共享，未提升）`)
}

// ─────────────────────────────────────────────────────────────────────────
console.log('\n=== A1: verifyReviewGitEvidence 跨仓 gitDir 切换（调用方按 review.repo 选 gitDir）===\n')

console.log('--- 跨仓 review（repo=sillyspec）按跨仓仓根 gitDir 校验：base/head 跨仓真实 commit 过 ---')
{
  const crossRepo = makeRepo('crr-cross-ev-')
  fs.mkdirSync(path.join(crossRepo, 'src'), { recursive: true })
  fs.writeFileSync(path.join(crossRepo, 'src', 'cross.js'), 'base\n')
  sh('git add -A && git commit -q -m base', crossRepo)
  const base = execSync('git rev-parse HEAD', { cwd: crossRepo, encoding: 'utf8' }).trim()
  fs.writeFileSync(path.join(crossRepo, 'src', 'cross.js'), 'modified\n')
  sh('git add -A && git commit -q -m work', crossRepo)
  const head = execSync('git rev-parse HEAD', { cwd: crossRepo, encoding: 'utf8' }).trim()

  const review = {
    schemaVersion: 2, task: 'task-09', repo: 'sillyspec',
    base, head, changedFiles: ['src/cross.js'],
    specVerdict: 'pass', qualityVerdict: 'pass',
    reviewerNotes: 'cross-repo', requiredEvidence: [],
  }
  // 核心契约：调用方按 review.repo（或 'main' 缺省）从 ctx 取 gitDir，传给 verifyReviewGitEvidence
  const evidence = verifyReviewGitEvidence(review, crossRepo)
  assertTrue(evidence.ok, `跨仓 review 过证据校验（gitDir=跨仓仓根，实际 errors: ${evidence.errors.join('; ')}）`)
  assertTrue(!evidence.emptyDiff, `跨仓 base..head diff 非空（${base.slice(0,8)}..${head.slice(0,8)}）`)

  fs.rmSync(crossRepo, { recursive: true, force: true })
}

console.log('--- 跨仓 review base/head 用主仓 commit（gitDir 指错仓）→ 判伪造（fail-closed）---')
{
  const mainRepo = makeRepo('crr-main-ev2-')
  const crossRepo = makeRepo('crr-cross-ev2-')
  fs.writeFileSync(path.join(mainRepo, 'a.js'), 'x\n')
  sh('git add -A && git commit -q -m m', mainRepo)
  const mainCommit = execSync('git rev-parse HEAD', { cwd: mainRepo, encoding: 'utf8' }).trim()

  const review = {
    schemaVersion: 2, task: 'task-09', repo: 'sillyspec',
    base: mainCommit, head: mainCommit, changedFiles: ['a.js'],
    specVerdict: 'pass', qualityVerdict: 'pass',
    reviewerNotes: '', requiredEvidence: [],
  }
  // 跨仓仓根 gitDir 查不到主仓 commit → 伪造阻断（这就是按 repo 切 gitDir 的意义：走错仓会被抓）
  const evidence = verifyReviewGitEvidence(review, crossRepo)
  assertTrue(!evidence.ok, `跨仓 gitDir 查不到主仓 commit → 判伪造阻断（fail-closed）`)
  assertTrue(evidence.errors.some(e => /不是仓库中的真实 commit/.test(e)), `error 指明 commit 非真实`)

  fs.rmSync(mainRepo, { recursive: true, force: true })
  fs.rmSync(crossRepo, { recursive: true, force: true })
}

// ─────────────────────────────────────────────────────────────────────────
console.log('\n=== A1 集成：validateTaskReviews + ctx 按 review.repo 切 gitDir（D-013 调用点之一）===\n')

console.log('--- validateTaskReviews(ctx) 跨仓 task review：按 ctx.resolve(repo).gitDir 在跨仓仓根校验过 ---')
{
  const mainRepo = makeRepo('crr-vtr-main-')
  const crossRepo = makeRepo('crr-vtr-cross-')
  // 跨仓仓：base → work commit
  fs.mkdirSync(path.join(crossRepo, 'src'), { recursive: true })
  fs.writeFileSync(path.join(crossRepo, 'src', 'x.js'), 'base\n')
  sh('git add -A && git commit -q -m base', crossRepo)
  const crossBase = execSync('git rev-parse HEAD', { cwd: crossRepo, encoding: 'utf8' }).trim()
  fs.writeFileSync(path.join(crossRepo, 'src', 'x.js'), 'modified\n')
  sh('git add -A && git commit -q -m work', crossRepo)
  const crossHead = execSync('git rev-parse HEAD', { cwd: crossRepo, encoding: 'utf8' }).trim()

  // 主仓 .sillyspec 结构：change + plan（含 task-09 checkbox）+ execute-runs review.json
  const changeName = 'crr-vtr'
  const specBase = path.join(mainRepo, '.sillyspec')
  const changeDir = path.join(specBase, 'changes', changeName)
  const runtimeRoot = path.join(specBase, '.runtime')
  const runId = 'exec-crr-vtr-000001'
  fs.mkdirSync(changeDir, { recursive: true })
  fs.writeFileSync(path.join(changeDir, 'plan.md'),
    `# plan\n- [x] task-09 跨仓改动\n`)
  const reviewDir = path.join(runtimeRoot, 'execute-runs', runId, 'tasks', 'task-09')
  fs.mkdirSync(reviewDir, { recursive: true })
  fs.writeFileSync(path.join(reviewDir, 'review.json'), JSON.stringify({
    schemaVersion: 2, task: 'task-09', repo: 'sillyspec',
    base: crossBase, head: crossHead, changedFiles: ['src/x.js'],
    specVerdict: 'pass', qualityVerdict: 'pass',
    reviewerNotes: 'cross', requiredEvidence: [],
  }))

  // 构造 ctx：主仓 + 跨仓 sillyspec。主仓 meta 用 in-place-fallback（meta.baseHash 给个主仓 commit 即可，
  // 主仓不参与本次 review 校验，但 ctx 构造需要主仓 baseHash 不抛）。
  fs.writeFileSync(path.join(mainRepo, 'm.js'), 'x\n')
  sh('git add -A && git commit -q -m m', mainRepo)
  const mainBase = execSync('git rev-parse HEAD', { cwd: mainRepo, encoding: 'utf8' }).trim()
  const wm = { getMeta: () => ({ mode: 'worktree', worktreePath: mainRepo, baseHash: mainBase }) }
  const ctx = new MultiRepoContext({
    cwd: mainRepo, changeName, declaredRepos: ['main', 'sillyspec'],
    repoRegistry: new Map([['sillyspec', crossRepo]]),
    worktreeManager: wm,
  })
  const tr = validateTaskReviews({
    planContent: fs.readFileSync(path.join(changeDir, 'plan.md'), 'utf8'),
    runtimeRoot, executeRunId: runId, changeDir, ctx,
  })
  assertTrue(tr.ok, `跨仓 task-09 review 过 Task Review Gate（按 ctx 切跨仓 gitDir，实际 errors: ${tr.errors.join('; ')}）`)
  assertTrue(tr.errors.length === 0, `errors 为空（实际 ${JSON.stringify(tr.errors)}）`)

  fs.rmSync(mainRepo, { recursive: true, force: true })
  fs.rmSync(crossRepo, { recursive: true, force: true })
}

console.log('--- validateTaskReviews 无 ctx 参数 → 走原 gitDir 路径（D-013 缺省退化单仓零回归）---')
{
  // 沿用 run-complete-step-execute-batch.test.mjs 同款 fixture：主仓 in-place + base=head + 改动在 working-tree
  const d = makeRepo('crr-vtr-nctx-')
  const changeName = 'crr-nctx'
  fs.writeFileSync(path.join(d, '.gitignore'), '.sillyspec/\n')
  sh('git add -A && git commit -q -m gi', d)
  const head = execSync('git rev-parse HEAD', { cwd: d, encoding: 'utf8' }).trim()
  const specBase = path.join(d, '.sillyspec')
  const changeDir = path.join(specBase, 'changes', changeName)
  const runtimeRoot = path.join(specBase, '.runtime')
  const runId = 'exec-nctx'
  fs.mkdirSync(changeDir, { recursive: true })
  fs.writeFileSync(path.join(changeDir, 'plan.md'), `# plan\n- [x] task-01\n`)
  const reviewDir = path.join(runtimeRoot, 'execute-runs', runId, 'tasks', 'task-01')
  fs.mkdirSync(reviewDir, { recursive: true })
  fs.writeFileSync(path.join(reviewDir, 'review.json'), JSON.stringify({
    schemaVersion: 1, task: 'task-01',
    base: head, head: head, changedFiles: [],
    specVerdict: 'pass', qualityVerdict: 'pass', reviewerNotes: '', requiredEvidence: [],
  }))
  // working-tree 改动（base..head 空 commit diff 时 verifyReviewGitEvidence 并入 working-tree）
  fs.mkdirSync(path.join(d, 'src'), { recursive: true })
  fs.writeFileSync(path.join(d, 'src', 'app.js'), 'x\n')

  const tr = validateTaskReviews({
    planContent: fs.readFileSync(path.join(changeDir, 'plan.md'), 'utf8'),
    runtimeRoot, executeRunId: runId, changeDir, gitDir: d,
    // 无 ctx → 走原 gitDir=d 路径，单仓行为不变
  })
  assertTrue(tr.ok, `无 ctx → 单仓 gitDir 路径零回归（实际 errors: ${tr.errors.join('; ')}）`)

  fs.rmSync(d, { recursive: true, force: true })
}

// ─────────────────────────────────────────────────────────────────────────
console.log('\n=== A2: generateTaskReviewDrafts 跨仓 base/head 读双锡点 ===\n')

console.log('--- 跨仓 task（repo + base_commit + head_commit 锡点）：draft base/head 读锡点，过 schema ---')
{
  const prevCwd = process.cwd()
  try {
  const mainRepo = makeRepo('crr-gd-main-')
  const crossRepo = makeRepo('crr-gd-cross-')
  fs.mkdirSync(path.join(crossRepo, 'src'), { recursive: true })
  fs.writeFileSync(path.join(crossRepo, 'src', 'cross.js'), 'base\n')
  sh('git add -A && git commit -q -m base', crossRepo)
  const crossBase = execSync('git rev-parse HEAD', { cwd: crossRepo, encoding: 'utf8' }).trim()
  fs.writeFileSync(path.join(crossRepo, 'src', 'cross.js'), 'modified\n')
  sh('git add -A && git commit -q -m work', crossRepo)
  const crossHead = execSync('git rev-parse HEAD', { cwd: crossRepo, encoding: 'utf8' }).trim()

  const changeName = 'crr-gd'
  const specBase = path.join(mainRepo, '.sillyspec')
  const changeDir = path.join(specBase, 'changes', changeName)
  // 跨仓 task 卡：repo + 双锡点 + allowed_paths 指向跨仓仓相对路径
  writeTask(mainRepo, changeName, 'task-09', {
    repo: 'sillyspec', base_commit: crossBase, head_commit: crossHead,
    allowed_paths: ['src/cross.js'],
  })

  // 主仓 worktree meta（ctx 构造需要主仓 baseHash；主仓不参与本 task draft）
  fs.writeFileSync(path.join(mainRepo, 'm.js'), 'x\n')
  sh('git add -A && git commit -q -m m', mainRepo)
  const mainBase = execSync('git rev-parse HEAD', { cwd: mainRepo, encoding: 'utf8' }).trim()
  const wm = { getMeta: () => ({ mode: 'worktree', worktreePath: mainRepo, baseHash: mainBase }) }
  const ctx = new MultiRepoContext({
    cwd: mainRepo, changeName, declaredRepos: ['main', 'sillyspec'],
    repoRegistry: new Map([['sillyspec', crossRepo]]),
    worktreeManager: wm,
  })

  process.chdir(mainRepo)
  const r = await generateTaskReviewDrafts({ changeName, cwd: mainRepo, ctx })
  assertTrue(r.generated === 1, `跨仓 task-09 draft 生成（generated=${r.generated}）`)

  const reviewPath = path.join(mainRepo, '.sillyspec', '.runtime', 'execute-runs', r.executeRunId, 'tasks', 'task-09', 'review.json')
  assertTrue(fs.existsSync(reviewPath), `task-09 review.json 落盘主仓 execute-runs`)
  const draft = JSON.parse(fs.readFileSync(reviewPath, 'utf8'))
  assertTrue(draft.base === crossBase, `draft base=task卡 base_commit 锡点（${draft.base.slice(0,8)} vs ${crossBase.slice(0,8)}）`)
  assertTrue(draft.head === crossHead, `draft head=task卡 head_commit 锡点（${draft.head.slice(0,8)} vs ${crossHead.slice(0,8)}）`)
  assertTrue(draft.repo === 'sillyspec', `draft repo=sillyspec（跨仓 task 标记）`)
  assertTrue(JSON.stringify(draft.changedFiles) === JSON.stringify(['src/cross.js']), `changedFiles=[src/cross.js]（跨仓仓相对路径，实际 ${JSON.stringify(draft.changedFiles)}）`)
  assertTrue(validateReviewSchema(draft).ok, `跨仓 draft 过 validateReviewSchema（实际 errors: ${validateReviewSchema(draft).errors.join('; ')}）`)

  process.chdir(os.tmpdir())
  fs.rmSync(mainRepo, { recursive: true, force: true })
  fs.rmSync(crossRepo, { recursive: true, force: true })
  } finally { process.chdir(prevCwd) }
}

console.log('--- generateTaskReviewDrafts 无 ctx → 主仓原逻辑零回归（task-review-draft 契约不变）---')
{
  const prevCwd = process.cwd()
  try {
  // 复用 task-review-draft.test.mjs 同款 fixture（主仓 worktree + meta + allowed_paths）
  const changeName = 'crr-gd-nctx'
  const { d, base, wtDir } = (function () {
    const d = makeRepo('crr-gd-nctx-main-')
    fs.writeFileSync(path.join(d, '.gitignore'), '.sillyspec/\n')
    sh('git add -A && git commit -q -m gi', d)
    fs.writeFileSync(path.join(d, 'feature.js'), 'base\n')
    sh('git add -A && git commit -q -m base', d)
    const base = execSync('git rev-parse HEAD', { cwd: d, encoding: 'utf8' }).trim()
    const wtDir = path.join(d, '.sillyspec', '.runtime', 'worktrees', changeName)
    fs.mkdirSync(wtDir, { recursive: true })
    sh(`git worktree add -q "${wtDir}" -b sillyspec/${changeName}`, d)
    return { d, base, wtDir }
  })()
  fs.writeFileSync(path.join(wtDir, 'feature.js'), 'modified\n')
  sh('git add -A && git commit -q -m work', wtDir)
  writeMeta(wtDir, changeName, base)
  writeTask(d, changeName, 'task-01', { allowed_paths: ['feature.js'] })

  process.chdir(d)
  const r = await generateTaskReviewDrafts({ changeName, cwd: d })
  assertTrue(r.generated === 1, `主仓 task-01 draft 生成（无 ctx，零回归）`)
  const reviewPath = path.join(d, '.sillyspec', '.runtime', 'execute-runs', r.executeRunId, 'tasks', 'task-01', 'review.json')
  const draft = JSON.parse(fs.readFileSync(reviewPath, 'utf8'))
  assertTrue(draft.base === base, `主仓 draft base=meta.baseHash（${draft.base.slice(0,8)} vs ${base.slice(0,8)}）`)
  assertTrue(draft.repo === undefined || draft.repo === 'main', `主仓 draft 无 repo 字段或=main（零回归，实际 ${draft.repo}）`)

  process.chdir(os.tmpdir())
  fs.rmSync(d, { recursive: true, force: true })
  } finally { process.chdir(prevCwd) }
}

// ─────────────────────────────────────────────────────────────────────────
console.log('\n=== A2 边界：跨仓 task 缺锡点 → draft 不生成（无法定 base/head，留给 agent 手补）===\n')
{
  const prevCwd = process.cwd()
  try {
  const mainRepo = makeRepo('crr-gd-nopoint-')
  const crossRepo = makeRepo('crr-gd-nopoint-cross-')
  fs.mkdirSync(path.join(crossRepo, 'src'), { recursive: true })
  fs.writeFileSync(path.join(crossRepo, 'src', 'x.js'), 'base\n')
  sh('git add -A && git commit -q -m base', crossRepo)
  const crossBase = execSync('git rev-parse HEAD', { cwd: crossRepo, encoding: 'utf8' }).trim()
  fs.writeFileSync(path.join(crossRepo, 'src', 'x.js'), 'mod\n')
  sh('git add -A && git commit -q -m w', crossRepo)

  const changeName = 'crr-nopoint'
  // 跨仓 task 卡：repo 有但缺 base_commit / head_commit 锡点
  writeTask(mainRepo, changeName, 'task-09', {
    repo: 'sillyspec', allowed_paths: ['src/x.js'],
    // 故意不传 base_commit / head_commit
  })
  fs.writeFileSync(path.join(mainRepo, 'm.js'), 'x\n')
  sh('git add -A && git commit -q -m m', mainRepo)
  const mainBase = execSync('git rev-parse HEAD', { cwd: mainRepo, encoding: 'utf8' }).trim()
  const wm = { getMeta: () => ({ mode: 'worktree', worktreePath: mainRepo, baseHash: mainBase }) }
  const ctx = new MultiRepoContext({
    cwd: mainRepo, changeName, declaredRepos: ['main', 'sillyspec'],
    repoRegistry: new Map([['sillyspec', crossRepo]]),
    worktreeManager: wm,
  })

  process.chdir(mainRepo)
  const r = await generateTaskReviewDrafts({ changeName, cwd: mainRepo, ctx })
  // 跨仓 task 无 base_commit/head_commit 锡点 → 无法定 base/head → 该 task 跳过（不生成伪造 draft）
  assertTrue(r.generated === 0, `跨仓 task 缺锡点 → 不生成 draft（generated=${r.generated}）`)

  process.chdir(os.tmpdir())
  fs.rmSync(mainRepo, { recursive: true, force: true })
  fs.rmSync(crossRepo, { recursive: true, force: true })
  } finally { process.chdir(prevCwd) }
}

console.log(`\n${'='.repeat(50)}`)
console.log(`✅ 通过: ${total - failed}  ❌ 失败: ${failed}`)
if (failures.length > 0) { console.log('失败项:'); failures.forEach(f => console.log(`  - ${f}`)) }
console.log('='.repeat(50))
if (failed > 0) process.exit(1)
