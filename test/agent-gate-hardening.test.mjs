/**
 * Agent 门控强化测试（change: 强化 Agent 驾驭力）
 *
 * 覆盖：
 * 1. verify-postcheck：local.yaml test 命令解析 + CLI 实测执行（passed/failed/skipped）
 * 2. task-review git 真实性交叉校验：假 commit / 空 diff / changedFiles 不相交 / 非 git 环境
 * 3. checkExecuteCodeEvidence：worktree meta 对账（changed/unchanged/unknown）
 * 4. execute stage validator：plan 有 task 但代码零变更时阻断
 */
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { execFileSync } from 'child_process'

import { extractTestCommand, runVerifyTestCheck } from '../src/verify-postcheck.js'
import { verifyReviewGitEvidence } from '../src/task-review.js'
import { checkExecuteCodeEvidence, runValidators } from '../src/stage-contract.js'

let failed = 0
let total = 0

function assert(condition, msg) {
  total++
  if (!condition) {
    failed++
    console.log(`  ❌ FAIL: ${msg}`)
  } else {
    console.log(`  ✅ PASS: ${msg}`)
  }
}

function git(dir, args) {
  return execFileSync('git', args, { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
}

function initGitRepo(dir) {
  git(dir, ['init', '-q'])
  git(dir, ['config', 'user.email', 'test@test.local'])
  git(dir, ['config', 'user.name', 'test'])
  git(dir, ['config', 'commit.gpgsign', 'false'])
}

const tmpRoots = []
function makeTmpDir(prefix) {
  const dir = mkdtempSync(join(tmpdir(), prefix))
  tmpRoots.push(dir)
  return dir
}

// ─────────────────────────────────────────
// 1. verify-postcheck: extractTestCommand
// ─────────────────────────────────────────
console.log('--- extractTestCommand ---')
assert(extractTestCommand('commands:\n  test: "npm test"\n') === 'npm test', '带双引号的 test 命令')
assert(extractTestCommand("commands:\n  test: 'pnpm test'\n") === 'pnpm test', '带单引号的 test 命令')
assert(extractTestCommand('commands:\n  test: npm run check\n') === 'npm run check', '不带引号的 test 命令')
assert(extractTestCommand('commands:\n  test: "unavailable"\n') === null, 'unavailable 视为未配置')
assert(extractTestCommand('commands:\n  test: unavailable\n') === null, '不带引号的 unavailable 视为未配置')
assert(extractTestCommand('commands:\n  install: "npm ci"\n') === null, '无 test 键返回 null')
assert(extractTestCommand(null) === null, 'null 输入返回 null')
assert(extractTestCommand('commands:\n  test: npm test  # 注释\n') === 'npm test', '行尾注释被剥离')

// ─────────────────────────────────────────
// 2. verify-postcheck: runVerifyTestCheck
// ─────────────────────────────────────────
console.log('\n--- runVerifyTestCheck ---')
{
  const proj = makeTmpDir('vpc-')
  const specBase = join(proj, '.sillyspec')
  mkdirSync(specBase, { recursive: true })

  // skipped：无 local.yaml
  let r = runVerifyTestCheck({ cwd: proj, specBase, changeName: 'c1' })
  assert(r.status === 'skipped', `无 local.yaml → skipped（实际 ${r.status}）`)

  // skipped：test unavailable
  writeFileSync(join(specBase, 'local.yaml'), 'commands:\n  test: "unavailable"\n')
  r = runVerifyTestCheck({ cwd: proj, specBase, changeName: 'c1' })
  assert(r.status === 'skipped', `test unavailable → skipped（实际 ${r.status}）`)

  // passed：退出码 0
  writeFileSync(join(specBase, 'local.yaml'), 'commands:\n  test: "node --version"\n')
  r = runVerifyTestCheck({ cwd: proj, specBase, changeName: 'c1' })
  assert(r.status === 'passed', `退出码 0 → passed（实际 ${r.status}）`)
  assert(r.resultPath && existsSync(r.resultPath), 'test-result.json 已落盘')
  if (r.resultPath) {
    const saved = JSON.parse(readFileSync(r.resultPath, 'utf8'))
    assert(saved.status === 'passed' && saved.exit_code === 0, '落盘内容包含 status/exit_code')
  }

  // failed：退出码 1
  writeFileSync(join(specBase, 'local.yaml'), `commands:\n  test: 'node -e "process.exit(1)"'\n`)
  r = runVerifyTestCheck({ cwd: proj, specBase, changeName: 'c1' })
  assert(r.status === 'failed', `退出码 1 → failed（实际 ${r.status}）`)
  assert(r.exitCode === 1, `exitCode 记录为 1（实际 ${r.exitCode}）`)
}

// ─────────────────────────────────────────
// 3. task-review: verifyReviewGitEvidence
// ─────────────────────────────────────────
console.log('\n--- verifyReviewGitEvidence ---')
{
  const repo = makeTmpDir('tre-')
  initGitRepo(repo)
  writeFileSync(join(repo, 'a.txt'), 'v1\n')
  git(repo, ['add', '.'])
  git(repo, ['commit', '-q', '-m', 'c1'])
  const base = git(repo, ['rev-parse', 'HEAD'])
  writeFileSync(join(repo, 'a.txt'), 'v2\n')
  writeFileSync(join(repo, 'b.txt'), 'new\n')
  git(repo, ['add', '.'])
  git(repo, ['commit', '-q', '-m', 'c2'])
  const head = git(repo, ['rev-parse', 'HEAD'])

  // 真实 base/head + 非空 diff → ok
  let r = verifyReviewGitEvidence({ base, head }, repo)
  assert(r.ok && !r.emptyDiff, '真实 commit + 非空 diff → ok')

  // 伪造 hash → error
  r = verifyReviewGitEvidence({ base: 'deadbeef'.repeat(5), head }, repo)
  assert(!r.ok && r.errors.some(e => e.includes('真实 commit')), `伪造 base hash → error（实际 errors: ${r.errors.join('; ')}）`)

  // base == head → emptyDiff
  r = verifyReviewGitEvidence({ base: head, head }, repo)
  assert(r.ok && r.emptyDiff, 'base==head → emptyDiff=true')

  // changedFiles 与 diff 有交集 → ok
  r = verifyReviewGitEvidence({ base, head, changedFiles: ['a.txt'] }, repo)
  assert(r.ok, 'changedFiles 有交集 → ok')

  // changedFiles 完全不相交 → error
  r = verifyReviewGitEvidence({ base, head, changedFiles: ['src/nonexistent.js'] }, repo)
  assert(!r.ok && r.errors.some(e => e.includes('不相交')), 'changedFiles 不相交 → error')

  // 非 git 目录 → unavailable + warning（不误杀）
  const notRepo = makeTmpDir('tre-nogit-')
  r = verifyReviewGitEvidence({ base, head }, notRepo)
  assert(r.ok && r.unavailable && r.warnings.length > 0, '非 git 环境 → unavailable 降级 warning')
}

// ─────────────────────────────────────────
// 4. checkExecuteCodeEvidence
// ─────────────────────────────────────────
console.log('\n--- checkExecuteCodeEvidence ---')
{
  const repo = makeTmpDir('ece-')
  initGitRepo(repo)
  // .sillyspec 忽略：meta.json 的写入不能被算作"代码变更"
  writeFileSync(join(repo, '.gitignore'), '.sillyspec/\n')
  writeFileSync(join(repo, 'main.js'), 'console.log(1)\n')
  git(repo, ['add', '.'])
  git(repo, ['commit', '-q', '-m', 'init'])
  const baseHash = git(repo, ['rev-parse', 'HEAD'])

  const changeName = 'test-change'
  const wtMetaDir = join(repo, '.sillyspec', '.runtime', 'worktrees', changeName)
  mkdirSync(wtMetaDir, { recursive: true })

  // meta 指向主仓库（in-place），base=HEAD，无任何改动 → unchanged
  writeFileSync(join(wtMetaDir, 'meta.json'), JSON.stringify({
    changeName, baseHash, mode: 'in-place-fallback', worktreePath: repo,
  }))
  let r = checkExecuteCodeEvidence(repo, changeName)
  assert(r.status === 'unchanged', `零变更 → unchanged（实际 ${r.status}: ${r.detail}）`)

  // 加一个未提交文件 → changed
  writeFileSync(join(repo, 'new-file.js'), 'x\n')
  r = checkExecuteCodeEvidence(repo, changeName)
  assert(r.status === 'changed', `未提交改动 → changed（实际 ${r.status}）`)

  // 提交后（base 落后一个 commit）→ changed
  git(repo, ['add', 'new-file.js'])
  git(repo, ['commit', '-q', '-m', 'add file'])
  r = checkExecuteCodeEvidence(repo, changeName)
  assert(r.status === 'changed', `base..HEAD 有提交 → changed（实际 ${r.status}）`)

  // 无 meta + 干净工作区 → unknown（fail-open）
  rmSync(wtMetaDir, { recursive: true, force: true })
  r = checkExecuteCodeEvidence(repo, changeName)
  assert(r.status === 'unknown', `无 meta 且工作区干净 → unknown（实际 ${r.status}）`)
}

// ─────────────────────────────────────────
// 5. execute stage validator（runValidators 集成）
// ─────────────────────────────────────────
console.log('\n--- execute stage validator ---')
{
  const repo = makeTmpDir('esv-')
  initGitRepo(repo)
  // .sillyspec 加入 gitignore：变更目录/meta 的写入不污染 git status，
  // 才能模拟"纯勾选 checkbox、零代码变更"的谎报场景
  writeFileSync(join(repo, '.gitignore'), '.sillyspec/\n')
  writeFileSync(join(repo, 'main.js'), 'console.log(1)\n')
  git(repo, ['add', '.'])
  git(repo, ['commit', '-q', '-m', 'init'])
  const baseHash = git(repo, ['rev-parse', 'HEAD'])

  const changeName = 'zero-change'
  const changeDir = join(repo, '.sillyspec', 'changes', changeName)
  mkdirSync(changeDir, { recursive: true })
  writeFileSync(join(changeDir, 'plan.md'), '# Plan\n\n## Wave 1\n- [x] task-01: 假装完成\n')

  const wtMetaDir = join(repo, '.sillyspec', '.runtime', 'worktrees', changeName)
  mkdirSync(wtMetaDir, { recursive: true })
  writeFileSync(join(wtMetaDir, 'meta.json'), JSON.stringify({
    changeName, baseHash, mode: 'in-place-fallback', worktreePath: repo,
  }))

  // plan 有 task、meta 有 baseHash、但代码零变更 → validator 报 error
  let result = runValidators('execute', repo, changeName, {})
  assert(!result.ok && result.errors.some(e => e.includes('勾选 checkbox 不等于完成实现')),
    `plan 有 task 但零代码变更 → execute validator 阻断（errors: ${result.errors.join('; ') || '(无)'}）`)

  // 产生真实代码变更后 → 通过
  writeFileSync(join(repo, 'feature.js'), 'export const x = 1\n')
  result = runValidators('execute', repo, changeName, {})
  assert(result.ok, `有真实代码变更 → execute validator 通过（errors: ${result.errors.join('; ') || '(无)'}）`)

  // plan 无 task → 不做核验（向后兼容）
  writeFileSync(join(changeDir, 'plan.md'), '# Plan\n\n无任务\n')
  rmSync(join(repo, 'feature.js'))
  result = runValidators('execute', repo, changeName, {})
  assert(result.ok, 'plan 无 task checkbox → 跳过核验')
}

// ─────────────────────────────────────────
// 清理 & 汇总
// ─────────────────────────────────────────
for (const dir of tmpRoots) {
  try { rmSync(dir, { recursive: true, force: true }) } catch {}
}

console.log('\n==================================================')
console.log(`✅ 通过: ${total - failed}  ❌ 失败: ${failed}`)
console.log('==================================================')
if (failed > 0) process.exit(1)
