/**
 * generateTaskReviewDrafts characterization 测试
 *
 * 锁住坑 worktree-execute-apply-friction 坑2 的修复契约：worktree execute「主 agent 直接实现」
 * 模式下 per-task review.json 全缺 → execute --done 的 Task Review Gate 报「task-XX 缺少 review.json」阻断。
 * generateTaskReviewDrafts 据 git diff base..head 按 task allowed_paths 归属，自动落盘 cannot_verify 草稿。
 *
 * 覆盖：
 *   ① 主 agent 模式 → 按 diff+allowed_paths 生成 cannot_verify 草稿（过 validateReviewSchema）
 *      + 空 changedFiles 的 task 不生成（verifyReviewGitEvidence 判空 diff 伪造）
 *   ② 幂等：再调不覆盖（人工/子代理已填 verdict 原样保留）
 *   ③ exec-id marker 与 Task Review Gate 同源（marker 缺失生成+落盘）
 *
 * 真实 git + worktree fixture（参考 worktree-apply-classification.test.mjs）。
 */
import fs from 'fs'
import path from 'path'
import os from 'os'
import { execSync } from 'child_process'
import { generateTaskReviewDrafts, validateReviewSchema } from '../src/task-review.js'

let failed = 0
let total = 0
const failures = []
function assertTrue(cond, msg) {
  total++
  if (cond) console.log(`  ✅ PASS: ${msg}`)
  else { failed++; failures.push(msg); console.log(`  ❌ FAIL: ${msg}`) }
}
function sh(cmd, cwd) { execSync(cmd, { cwd, stdio: 'pipe' }) }

function setupRepo(changeName) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'trd-'))
  sh('git init', d)
  sh('git config user.email t@t.co && git config user.name t', d)
  fs.writeFileSync(path.join(d, 'feature.js'), 'base\n')
  sh('git add -A && git commit -m base', d)
  fs.writeFileSync(path.join(d, '.gitignore'), '.sillyspec/\n')
  sh('git add -A && git commit -m gitignore', d)
  // base 取 gitignore commit 之后——worktree 分支自此创建，base..HEAD diff 才不含 .gitignore 引入
  const base = execSync('git rev-parse HEAD', { cwd: d, encoding: 'utf8' }).trim()
  const wtDir = path.join(d, '.sillyspec', '.runtime', 'worktrees', changeName)
  fs.mkdirSync(wtDir, { recursive: true })
  sh(`git worktree add "${wtDir}" -b sillyspec/${changeName}`, d)
  process.chdir(d)
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

function writeTask(d, changeName, taskId, allowedPaths) {
  const dir = path.join(d, '.sillyspec', 'changes', changeName, 'tasks')
  fs.mkdirSync(dir, { recursive: true })
  const lines = ['---', `id: ${taskId}`]
  if (allowedPaths.length > 0) {
    lines.push('allowed_paths:')
    for (const p of allowedPaths) lines.push(`  - ${p}`)
  }
  lines.push('---', '', `# ${taskId}`, '', 'goal: ...')
  fs.writeFileSync(path.join(dir, taskId + '.md'), lines.join('\n') + '\n')
}

console.log('=== generateTaskReviewDrafts: 主 agent 实现模式 per-task review 草稿兜底（坑2）===\n')

console.log('--- ① 主 agent 模式 → 按 diff+allowed_paths 生成 cannot_verify 草稿；空归属 task 生成无归属草稿（坑 task-review-draft-skip-leak）---')
{
  const { d, base, wtDir } = setupRepo('trd1')
  fs.writeFileSync(path.join(wtDir, 'feature.js'), 'modified\n')
  sh('git add -A && git commit -m work', wtDir)
  const head = execSync('git rev-parse HEAD', { cwd: wtDir, encoding: 'utf8' }).trim()
  writeMeta(wtDir, 'trd1', base)
  // task-01 覆盖 feature.js（diff 命中）；task-02 覆盖 other.js（diff 未命中 → 无归属草稿，不再静默跳过）
  writeTask(d, 'trd1', 'task-01', ['feature.js'])
  writeTask(d, 'trd1', 'task-02', ['other.js'])

  const r = await generateTaskReviewDrafts({ changeName: 'trd1', cwd: d })
  assertTrue(r.generated === 2, `generated=2（task-01 有归属 + task-02 无归属草稿，实际 ${r.generated}）`)
  assertTrue(r.noAttribution === 1, `noAttribution=1（task-02，实际 ${r.noAttribution}）`)

  const reviewPath = path.join(d, '.sillyspec', '.runtime', 'execute-runs', r.executeRunId, 'tasks', 'task-01', 'review.json')
  assertTrue(fs.existsSync(reviewPath), `task-01 review.json 已落盘`)
  const draft = JSON.parse(fs.readFileSync(reviewPath, 'utf8'))
  assertTrue(draft.schemaVersion === 1, `schemaVersion=1`)
  assertTrue(draft.task === 'task-01', `task='task-01'`)
  assertTrue(draft.specVerdict === 'cannot_verify' && draft.qualityVerdict === 'cannot_verify', `双 verdict=cannot_verify（诚实：task 级未单独评审）`)
  assertTrue(draft.base === base, `base=worktree baseHash（${draft.base} vs ${base}）`)
  assertTrue(draft.head === head, `head=worktree HEAD（${draft.head} vs ${head}）`)
  assertTrue(JSON.stringify(draft.changedFiles) === JSON.stringify(['feature.js']), `changedFiles=[feature.js]（实际 ${JSON.stringify(draft.changedFiles)}）`)
  assertTrue(Array.isArray(draft.requiredEvidence) && draft.requiredEvidence.length > 0, `requiredEvidence 非空（过 cannot_verify schema）`)
  assertTrue(validateReviewSchema(draft).ok, `草稿过 validateReviewSchema`)

  // task-02 空 changedFiles → 无归属草稿（cannot_verify + 空 changedFiles + 明示 requiredEvidence），
  // 不再静默跳过（坑 task-review-draft-skip-leak：task-08/task-10 两次漏草稿靠 gate 报错才发现）
  const r2path = path.join(d, '.sillyspec', '.runtime', 'execute-runs', r.executeRunId, 'tasks', 'task-02', 'review.json')
  assertTrue(fs.existsSync(r2path), `task-02 无归属草稿已生成（不再静默跳过）`)
  const draft2 = JSON.parse(fs.readFileSync(r2path, 'utf8'))
  assertTrue(draft2.specVerdict === 'cannot_verify' && draft2.qualityVerdict === 'cannot_verify', `无归属草稿双 verdict=cannot_verify`)
  assertTrue(Array.isArray(draft2.changedFiles) && draft2.changedFiles.length === 0, `无归属草稿 changedFiles 为空数组`)
  assertTrue(draft2.requiredEvidence[0].includes('no-attributed-diff') || draft2.requiredEvidence[0].includes('未命中'), `requiredEvidence 明示无归属原因与人工确认要求`)
  assertTrue(validateReviewSchema(draft2).ok, `无归属草稿过 validateReviewSchema`)
  // 空归属草稿不会被自动勾选（shouldAutoCheckTask 零 diff 守卫）：changedFiles 空 → 不勾
  const { shouldAutoCheckTask } = await import('../src/run/complete.js')
  assertTrue(shouldAutoCheckTask({ ok: true, review: draft2 }, false, { gitDir: wtDir, base, head }) === false, `无归属草稿不被自动勾选（shouldAutoCheckTask 零 diff 守卫）`)

  process.chdir(os.tmpdir()); fs.rmSync(d, { recursive: true, force: true })
}

console.log('--- ② 幂等：再调不覆盖（人工/子代理已填 verdict 原样保留）---')
{
  const { d, base, wtDir } = setupRepo('trd2')
  fs.writeFileSync(path.join(wtDir, 'feature.js'), 'modified\n')
  sh('git add -A && git commit -m work', wtDir)
  writeMeta(wtDir, 'trd2', base)
  writeTask(d, 'trd2', 'task-01', ['feature.js'])

  const r1 = await generateTaskReviewDrafts({ changeName: 'trd2', cwd: d })
  assertTrue(r1.generated === 1, `首次 generated=1`)
  const reviewPath = path.join(d, '.sillyspec', '.runtime', 'execute-runs', r1.executeRunId, 'tasks', 'task-01', 'review.json')

  // 模拟人工复核后覆写 verdict（pass）
  const human = JSON.parse(fs.readFileSync(reviewPath, 'utf8'))
  human.specVerdict = 'pass'
  human.qualityVerdict = 'pass'
  human.reviewerNotes = '人工复核通过'
  fs.writeFileSync(reviewPath, JSON.stringify(human, null, 2) + '\n')

  const r2 = await generateTaskReviewDrafts({ changeName: 'trd2', cwd: d })
  assertTrue(r2.generated === 0, `二次 generated=0（幂等不覆盖，实际 ${r2.generated}）`)
  const after = JSON.parse(fs.readFileSync(reviewPath, 'utf8'))
  assertTrue(after.specVerdict === 'pass' && after.reviewerNotes === '人工复核通过', `人工 verdict 未被覆盖（幂等保护）`)

  process.chdir(os.tmpdir()); fs.rmSync(d, { recursive: true, force: true })
}

console.log('--- ③ exec-id marker 与 Task Review Gate 同源（marker 缺失生成+落盘）---')
{
  const { d, base, wtDir } = setupRepo('trd3')
  fs.writeFileSync(path.join(wtDir, 'feature.js'), 'modified\n')
  sh('git add -A && git commit -m work', wtDir)
  writeMeta(wtDir, 'trd3', base)
  writeTask(d, 'trd3', 'task-01', ['feature.js'])

  const marker = path.join(d, '.sillyspec', '.runtime', 'current-execute-run-id-trd3')
  assertTrue(!fs.existsSync(marker), `调用前 marker 不存在`)
  const r = await generateTaskReviewDrafts({ changeName: 'trd3', cwd: d })
  assertTrue(fs.existsSync(marker), `调用后 marker 已落盘（与 gates.js Task Review Gate 同源 ID）`)
  const markerContent = fs.readFileSync(marker, 'utf8').trim()
  assertTrue(markerContent === r.executeRunId, `marker 内容 == 返回的 executeRunId（gate 读同一 ID 才能找到草稿）`)

  process.chdir(os.tmpdir()); fs.rmSync(d, { recursive: true, force: true })
}

console.log(`\n${'='.repeat(50)}`)
console.log(`✅ 通过: ${total - failed}  ❌ 失败: ${failed}`)
if (failures.length > 0) { console.log('失败项:'); failures.forEach(f => console.log(`  - ${f}`)) }
console.log('='.repeat(50))
if (failed > 0) process.exit(1)
