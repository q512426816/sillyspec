/**
 * execute 阶段级核验（防空跑谎报）characterization 测试（FR-04/05/06，D-002@v1）
 *
 * 防线 2：execute 完成时聚合最新 execute run 各 task review.json 声称的交付文件（主仓 repo 过滤、
 * 排除 .sillyspec/ 与 meta.json），核验其存在于 worktree 分支 tree 或 worktree 工作区
 * （findMissingDeliverables）。两处皆无 → console.warn 列清单（疑似空跑/从未落盘），宽松非阻断；
 * 无法核验（worktree/分支不存在）→ checked:false 保守提示人工确认。
 *
 * - Part A：findMissingDeliverables 纯函数（分支 tree / 工作区 / 两处皆无 / checked:false / 空列表 /
 *   Windows 反斜杠路径 / 非数组容错）
 * - Part B：collectExecuteChangedFiles 聚合（主仓 repo 过滤、.sillyspec/meta.json/空串过滤、去重）
 * - Part C：handleExecuteDeliverableCheck 完成路径集成（真实 worktree + execute-runs fixture：
 *   工作区命中无 warn / 两处皆无 warn 不阻断 / 无法核验保守提示 / 跨仓 repo 过滤无 warn）
 *
 * review.json 最小合法 fixture（validateReviewSchema 要求）：schemaVersion/task/specVerdict/
 * qualityVerdict/base/head 必填；changedFiles 与 repo 为业务字段。
 */
import fs from 'fs'
import path from 'path'
import os from 'os'
import { execSync } from 'child_process'
import { findMissingDeliverables } from '../src/worktree.js'
import { collectExecuteChangedFiles, handleExecuteDeliverableCheck } from '../src/run/complete-handlers.js'

let passed = 0, failed = 0
const failures = []
function assertTrue(cond, msg) {
  if (cond) { passed++; console.log(`  ✅ PASS: ${msg}`) }
  else { failed++; failures.push(msg); console.log(`  ❌ FAIL: ${msg}`) }
}
function sh(cmd, cwd) { execSync(cmd, { cwd, stdio: 'pipe' }) }
function rev(cmd, cwd) { return execSync(cmd, { cwd, encoding: 'utf8' }).trim() }

function makeGitRepo() {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'elg-'))
  sh('git init', d)
  sh('git config user.email t@t.co && git config user.name t', d)
  fs.writeFileSync(path.join(d, 'a.txt'), 'a\n')
  fs.mkdirSync(path.join(d, 'src'), { recursive: true })
  fs.writeFileSync(path.join(d, 'src', 'foo.js'), 'x\n')
  sh('git add -A && git commit -m init', d)
  return d
}

console.log('=== execute 阶段级核验：findMissingDeliverables 纯函数 + 完成路径聚合 ===\n')

console.log('--- Part A：findMissingDeliverables 纯函数 ---')
{
  const d = makeGitRepo()
  const branch = rev('git symbolic-ref --short HEAD', d)

  // A1: 分支 tree 命中（committed）→ verified
  const r1 = findMissingDeliverables({ worktreePath: d, branch, changedFiles: ['a.txt', 'src/foo.js'] })
  assertTrue(r1.checked === true, 'A1 checked=true')
  assertTrue(r1.verified.includes('a.txt') && r1.verified.includes('src/foo.js'),
    `A1 分支 tree 命中 → verified（实际: ${JSON.stringify(r1.verified)}）`)
  assertTrue(r1.missing.length === 0, 'A1 missing 空')

  // A2: 工作区命中（未 commit untracked）→ verified
  fs.writeFileSync(path.join(d, 'new.txt'), 'new\n')
  const r2 = findMissingDeliverables({ worktreePath: d, branch, changedFiles: ['new.txt'] })
  assertTrue(r2.checked === true && r2.verified.includes('new.txt') && r2.missing.length === 0,
    `A2 工作区 untracked 命中 → verified（实际: ${JSON.stringify(r2)}）`)

  // A3: 两处皆无 → missing
  const r3 = findMissingDeliverables({ worktreePath: d, branch, changedFiles: ['ghost.js'] })
  assertTrue(r3.checked === true && r3.missing.includes('ghost.js') && r3.verified.length === 0,
    `A3 两处皆无 → missing=[ghost.js]（实际: ${JSON.stringify(r3)}）`)

  // A4: 分支不存在 → checked:false（即便文件在工作区也不进逐文件核验）
  const r4 = findMissingDeliverables({ worktreePath: d, branch: 'sillyspec/nope', changedFiles: ['a.txt'] })
  assertTrue(r4.checked === false && r4.missing.length === 0 && r4.verified.length === 0,
    `A4 分支不存在 → checked:false（实际: ${JSON.stringify(r4)}）`)

  // A5: worktreePath 不存在 → checked:false
  const r5 = findMissingDeliverables({ worktreePath: path.join(d, 'no-such-dir'), branch, changedFiles: ['a.txt'] })
  assertTrue(r5.checked === false && r5.missing.length === 0 && r5.verified.length === 0,
    `A5 worktreePath 不存在 → checked:false（实际: ${JSON.stringify(r5)}）`)

  // A6: 空列表 → checked:true 空结果
  const r6 = findMissingDeliverables({ worktreePath: d, branch, changedFiles: [] })
  assertTrue(r6.checked === true && r6.missing.length === 0 && r6.verified.length === 0,
    `A6 空列表 → checked:true 空（实际: ${JSON.stringify(r6)}）`)

  // A7: Windows 反斜杠路径归一化（review.json 可能落反斜杠）→ verified
  const r7 = findMissingDeliverables({ worktreePath: d, branch, changedFiles: ['src\\foo.js'] })
  assertTrue(r7.verified.includes('src\\foo.js') && r7.missing.length === 0,
    `A7 反斜杠路径归一化 → verified（保留原路径，实际: ${JSON.stringify(r7)}）`)

  // A8: changedFiles 缺省/非数组 → checked:true 空（容错）
  const r8 = findMissingDeliverables({ worktreePath: d, branch })
  assertTrue(r8.checked === true && r8.missing.length === 0 && r8.verified.length === 0,
    `A8 changedFiles 缺省 → checked:true 空（实际: ${JSON.stringify(r8)}）`)

  try { fs.rmSync(d, { recursive: true, force: true }) } catch {}
}

console.log('--- Part B：collectExecuteChangedFiles 聚合（主仓过滤 / .sillyspec 过滤 / 去重）---')
{
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'elg-coll-'))
  const runtimeRoot = path.join(root, '.runtime')
  const tasksDir = path.join(runtimeRoot, 'execute-runs', 'run-1', 'tasks')
  fs.mkdirSync(path.join(tasksDir, 'task-01'), { recursive: true })
  fs.mkdirSync(path.join(tasksDir, 'task-02'), { recursive: true })
  const writeReview = (taskId, changedFiles, repo) => fs.writeFileSync(path.join(tasksDir, taskId, 'review.json'), JSON.stringify({
    schemaVersion: 1, task: taskId, specVerdict: 'pass', qualityVerdict: 'pass',
    base: 'abc', head: 'def', ...(repo ? { repo } : {}), changedFiles,
  }))
  writeReview('task-01', ['src/a.js', '.sillyspec/changes/x/proposal.md', 'meta.json', ''])
  writeReview('task-02', ['backend/file.js', 'src/a.js'], 'backend') // src/a.js 与 task-01 重复 → 去重
  const files = await collectExecuteChangedFiles({ runtimeRoot, changeName: 'any' })
  assertTrue(JSON.stringify(files) === JSON.stringify(['src/a.js']),
    `B1 主仓 repo 过滤 + .sillyspec/meta.json/空串过滤 + 去重 → ['src/a.js']（实际: ${JSON.stringify(files)}）`)

  const empty = await collectExecuteChangedFiles({ runtimeRoot: path.join(root, 'no-runtime'), changeName: 'any' })
  assertTrue(empty.length === 0, 'B2 无 run 目录 → []')

  assertTrue((await collectExecuteChangedFiles({ runtimeRoot: '', changeName: 'any' })).length === 0, 'B3 runtimeRoot 空 → []')
  assertTrue((await collectExecuteChangedFiles({ runtimeRoot, changeName: '' })).length === 0, 'B3 changeName 空 → []')

  try { fs.rmSync(root, { recursive: true, force: true }) } catch {}
}

console.log('--- Part C：handleExecuteDeliverableCheck 完成路径集成（真实 worktree fixture）---')
function setupExecFixture() {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'elg-int-'))
  sh('git init', d)
  sh('git config user.email t@t.co && git config user.name t', d)
  fs.writeFileSync(path.join(d, 'a.txt'), 'a\n')
  sh('git add -A && git commit -m init', d)
  fs.mkdirSync(path.join(d, '.sillyspec', '.runtime', 'worktrees', 'execloss'), { recursive: true })
  fs.writeFileSync(path.join(d, '.gitignore'), '.sillyspec/\n')
  sh('git add -A && git commit -m gitignore', d)
  const base = rev('git rev-parse HEAD', d)
  const wtDir = path.join(d, '.sillyspec', '.runtime', 'worktrees', 'execloss')
  sh(`git worktree add "${wtDir}" -b sillyspec/execloss`, d)
  fs.writeFileSync(path.join(wtDir, 'meta.json'), JSON.stringify({
    name_zh: 'meta', changeName: 'execloss', branch: 'sillyspec/execloss', baseBranch: 'master',
    baseHash: base, baselineHash: 'x', baselineCommit: null, worktreePath: wtDir, mode: 'worktree', baselineFiles: [],
  }))
  // execute-runs fixture：一个 run + task-01 review.json
  const runtimeRoot = path.join(d, '.sillyspec', '.runtime')
  const taskDir = path.join(runtimeRoot, 'execute-runs', 'run-1', 'tasks', 'task-01')
  fs.mkdirSync(taskDir, { recursive: true })
  const writeReview = (changedFiles, repo) => fs.writeFileSync(path.join(taskDir, 'review.json'), JSON.stringify({
    schemaVersion: 1, task: 'task-01', specVerdict: 'pass', qualityVerdict: 'pass',
    base, head: base, ...(repo ? { repo } : {}), changedFiles,
  }))
  process.chdir(d) // _resolveMainRepoRoot 用相对 git-common-dir，测试需 chdir（坑 worktree-test-fixture-must-chdir）
  return { d, wtDir, writeReview }
}
const runCheck = async (cwd) => {
  const out = []
  const ow = console.warn
  console.warn = (s) => out.push(String(s))
  try { await handleExecuteDeliverableCheck({ stageName: 'execute', changeName: 'execloss', cwd }) } finally { console.warn = ow }
  return out.join('\n')
}
const cleanupFx = d => { process.chdir(os.tmpdir()); try { fs.rmSync(d, { recursive: true, force: true }) } catch {} }

{
  // C1: 工作区实现（未 commit）→ 命中 verified，无 warn（宽松不阻「工作区实现→apply 落盘」模式）
  const fx = setupExecFixture()
  fs.writeFileSync(path.join(fx.wtDir, 'impl.js'), 'x\n')
  fx.writeReview(['impl.js'])
  const warn = await runCheck(fx.d)
  assertTrue(!warn.includes('疑似空跑') && !warn.includes('无法核验'), `C1 工作区存在文件 → 无 warn（实际: ${warn}）`)
  cleanupFx(fx.d)
}
{
  // C2: 两处皆无 → warn 列清单 + apply 提示，不 exit 不 throw（FR-05 宽松非阻断）
  const fx = setupExecFixture()
  fx.writeReview(['src/ghost.js'])
  const warn = await runCheck(fx.d)
  assertTrue(warn.includes('疑似空跑') && warn.includes('src/ghost.js'),
    `C2 missing → warn 含 '疑似空跑' + 文件（实际: ${warn}）`)
  assertTrue(warn.includes('apply 将无源可复制'), 'C2 warn 含 apply 提示（宽松非阻断）')
  cleanupFx(fx.d)
}
{
  // C3: worktreePath 缺失 → checked:false 保守提示人工确认（FR-06）
  const fx = setupExecFixture()
  fs.writeFileSync(path.join(fx.wtDir, 'meta.json'), JSON.stringify({
    name_zh: 'meta', changeName: 'execloss', branch: 'sillyspec/execloss', baseBranch: 'master',
    baseHash: rev('git rev-parse HEAD', fx.d), baselineHash: 'x', baselineCommit: null,
    worktreePath: path.join(fx.d, 'no-such-dir'), mode: 'worktree', baselineFiles: [],
  }))
  fx.writeReview(['impl.js'])
  const warn = await runCheck(fx.d)
  assertTrue(warn.includes('无法核验'), `C3 worktreePath 缺失 → 保守提示（实际: ${warn}）`)
  cleanupFx(fx.d)
}
{
  // C4: 空 changedFiles（如 cannot_verify 草稿）→ 无 warn
  const fx = setupExecFixture()
  fx.writeReview([])
  const warn = await runCheck(fx.d)
  assertTrue(warn === '', `C4 空 changedFiles → 无 warn（实际: ${warn}）`)
  cleanupFx(fx.d)
}
{
  // C5: 跨仓 repo → 过滤不参与主仓核验，无 warn（Grill M11）
  const fx = setupExecFixture()
  fx.writeReview(['ghost.js'], 'backend')
  const warn = await runCheck(fx.d)
  assertTrue(warn === '', `C5 跨仓 repo → 过滤不核验，无 warn（实际: ${warn}）`)
  cleanupFx(fx.d)
}

console.log(`\n${'='.repeat(50)}`)
console.log(`✅ 通过: ${passed}  ❌ 失败: ${failed}`)
if (failures.length > 0) { console.log('失败项:'); failures.forEach(f => console.log(`  - ${f}`)) }
console.log('='.repeat(50))
if (failed > 0) process.exit(1)
