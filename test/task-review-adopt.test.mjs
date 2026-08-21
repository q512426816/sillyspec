/**
 * task-review adopt 测试（2026-08-21 agent-手工产出审计项①）
 *
 * 验证 `sillyspec backfill-reviews --change <name> --adopt`：
 * 已存在 review.json 的 mechanics 字段（schemaVersion/task/base/head/changedFiles）由 CLI
 * 从 git + task 卡重算代填，verdict/notes 原样保留；非法/缺失 verdict 降级 cannot_verify
 * （不猜本意）；adopt 产物通过 validateReviewSchema + verifyReviewGitEvidence（gate 同源校验）。
 *
 * fixture 复用 backfill-reviews.test.mjs 模式：git 仓 + in-place worktree meta（baseHash 锚点）
 * + base 后 commit feature.js → base..head diff = feature.js。
 */
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'fs'
import { join, dirname } from 'path'
import { tmpdir } from 'os'
import { spawnSync } from 'child_process'
import { fileURLToPath } from 'url'

import { validateReviewSchema, verifyReviewGitEvidence } from '../src/task-review.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const cliBin = join(__dirname, '..', 'bin', 'sillyspec.js')

let passed = 0
let failed = 0
const tmpRoots = []

function assert(cond, msg) {
  if (cond) { console.log(`  ✅ PASS: ${msg}`); passed++ }
  else { console.log(`  ❌ FAIL: ${msg}`); failed++ }
}

function git(dir, args) {
  return spawnSync('git', args, { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).stdout.trim()
}

function makeFixture() {
  const proj = mkdtempSync(join(tmpdir(), 'adopt-'))
  tmpRoots.push(proj)
  const specBase = join(proj, '.sillyspec')
  mkdirSync(specBase, { recursive: true })

  git(proj, ['init', '-q'])
  git(proj, ['config', 'user.email', 't@t.local'])
  git(proj, ['config', 'user.name', 't'])
  git(proj, ['config', 'commit.gpgsign', 'false'])
  writeFileSync(join(proj, '.gitignore'), '.sillyspec/\n')
  writeFileSync(join(proj, 'main.js'), 'console.log(1)\n')
  git(proj, ['add', '.'])
  git(proj, ['commit', '-q', '-m', 'init'])
  const baseHash = git(proj, ['rev-parse', 'HEAD'])

  const wtMetaDir = join(specBase, '.runtime', 'worktrees', 'c1')
  mkdirSync(wtMetaDir, { recursive: true })
  writeFileSync(join(wtMetaDir, 'meta.json'), JSON.stringify({
    changeName: 'c1', baseHash, mode: 'in-place-fallback', worktreePath: proj,
  }))

  const changeDir = join(specBase, 'changes', 'c1')
  const tasksDir = join(changeDir, 'tasks')
  mkdirSync(tasksDir, { recursive: true })
  writeFileSync(join(tasksDir, 'task-01.md'),
    '---\nid: task-01\nallowed_paths: [feature.js]\n---\n# task-01\n实现 feature.js\n')
  writeFileSync(join(tasksDir, 'task-02.md'),
    '---\nid: task-02\nallowed_paths: [other.js]\n---\n# task-02\n实现 other.js\n')
  writeFileSync(join(tasksDir, 'task-03.md'),
    '---\nid: task-03\nallowed_paths: [feature.js]\n---\n# task-03\n无 review 的 task\n')

  writeFileSync(join(proj, 'feature.js'), 'export const x = 1\n')
  git(proj, ['add', 'feature.js'])
  git(proj, ['commit', '-q', '-m', 'feat: task-01'])

  // execute run marker + 已存在 review（mechanics 全错，verdict 合法——adopt 的主场景）
  const runId = 'exec-2026-08-21-120000'
  const runTasksDir = join(specBase, '.runtime', 'execute-runs', runId, 'tasks')
  mkdirSync(join(runTasksDir, 'task-01'), { recursive: true })
  mkdirSync(join(runTasksDir, 'task-02'), { recursive: true })
  writeFileSync(join(specBase, '.runtime', `current-execute-run-id-c1`), runId + '\n')
  writeFileSync(join(runTasksDir, 'task-01', 'review.json'), JSON.stringify({
    schemaVersion: 2, task: 'task-01', base: 'deadbeef', head: 'cafebabe',
    changedFiles: ['totally/wrong.js'],
    specVerdict: 'pass', qualityVerdict: 'fail',
    reviewerNotes: 'agent 语义结论（必须保留）',
  }, null, 2))
  writeFileSync(join(runTasksDir, 'task-02', 'review.json'), JSON.stringify({
    schemaVersion: 1, task: 'task-02', base: 'xxx', head: 'yyy',
    specVerdict: '强!', qualityVerdict: '',
    reviewerNotes: '',
  }, null, 2))

  return { cwd: proj, specBase, runId, baseHash }
}

function runCLI(args, cwd) {
  const res = spawnSync(process.execPath, [cliBin, ...args], {
    cwd, encoding: 'utf8', timeout: 60_000, stdio: ['pipe', 'pipe', 'pipe'],
  })
  return { stdout: res.stdout || '', stderr: res.stderr || '', status: res.status, combined: (res.stdout || '') + (res.stderr || '') }
}

const fx = makeFixture()
try {
  console.log('--- 1. CLI adopt：mechanics 代填 + verdict 保留 ---')
  {
    const head = git(fx.cwd, ['rev-parse', 'HEAD'])
    const r = runCLI(['backfill-reviews', '--change', 'c1', '--adopt'], fx.cwd)
    assert(r.status === 0, `exit 0（实际 ${r.status}；输出 ${r.combined.slice(0, 300)}）`)
    assert(r.combined.includes('adopt: 重算代填 2'), '输出报告 adopt 2 个（task-01 + task-02）')

    const rv1 = JSON.parse(readFileSync(join(fx.specBase, '.runtime', 'execute-runs', fx.runId, 'tasks', 'task-01', 'review.json'), 'utf8'))
    assert(rv1.base === fx.baseHash, `task-01 base 重算为 meta.baseHash（实际 ${rv1.base}）`)
    assert(rv1.head === head, `task-01 head 重算为 HEAD（实际 ${rv1.head}）`)
    assert(Array.isArray(rv1.changedFiles) && rv1.changedFiles.includes('feature.js'), 'task-01 changedFiles 归属 feature.js')
    assert(rv1.specVerdict === 'pass' && rv1.qualityVerdict === 'fail', 'task-01 verdict 原样保留（pass/fail）')
    assert(String(rv1.reviewerNotes).includes('agent 语义结论'), 'task-01 reviewerNotes 保留')

    const rv2 = JSON.parse(readFileSync(join(fx.specBase, '.runtime', 'execute-runs', fx.runId, 'tasks', 'task-02', 'review.json'), 'utf8'))
    assert(rv2.specVerdict === 'cannot_verify' && rv2.qualityVerdict === 'cannot_verify', 'task-02 非法 verdict 降级 cannot_verify')
    assert(Array.isArray(rv2.requiredEvidence) && rv2.requiredEvidence.length > 0, 'task-02 降级后补 requiredEvidence')
    assert(String(rv2.reviewerNotes).includes('adopt:'), 'task-02 reviewerNotes 追加降级标记')
    assert(r.combined.includes('task-02'), '输出警告点名降级的 task')

    console.log('--- 2. adopt 产物过 gate 同源校验 ---')
    for (const [taskId, rv] of [['task-01', rv1], ['task-02', rv2]]) {
      const schema = validateReviewSchema(rv)
      assert(schema.ok, `${taskId} adopt 后过 validateReviewSchema（${schema.errors.join('; ')}）`)
      const evidence = verifyReviewGitEvidence(rv, fx.cwd)
      assert(evidence.ok, `${taskId} adopt 后过 verifyReviewGitEvidence（${evidence.errors.join('; ')}）`)
    }

    console.log('--- 3. 幂等：再跑 adopt 无可改写 ---')
    const r2 = runCLI(['backfill-reviews', '--change', 'c1', '--adopt'], fx.cwd)
    assert(r2.status === 0, `第二次 exit 0（实际 ${r2.status}）`)
    assert(r2.combined.includes('已一致') || r2.combined.includes('adopt 无对象') || r2.combined.includes('重算代填 0') || !/重算代填 [1-9]/.test(r2.combined), '第二次无重算代填（幂等）')

    console.log('--- 4. 缺失 review 的 task-03 由草稿路径补齐（adopt 不覆盖职责） ---')
    const draftPath = join(fx.specBase, '.runtime', 'execute-runs', fx.runId, 'tasks', 'task-03', 'review.json')
    assert(JSON.parse(readFileSync(draftPath, 'utf8')).specVerdict === 'cannot_verify', 'task-03 草稿生成（cannot_verify）')
  }
} finally {
  for (const t of tmpRoots) { try { rmSync(t, { recursive: true, force: true }) } catch {} }
}

console.log(`\n合计: ${passed} 通过, ${failed} 失败`)
process.exit(failed > 0 ? 1 : 0)
