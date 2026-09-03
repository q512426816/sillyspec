/**
 * task-review diffPaths 路径限定切片测试（坑 task-review-unified-commit-scope，2026-09-01 实证）
 *
 * 背景：主代理统一 commit（全部 task 一个 commit）下 per-task 提交区间不存在，10 个 task 的
 * review 只能共用同一对 base..head（整变更区间）——任务边界此前只靠 changedFiles「归属说明」，
 * gate 无法机器验证「本 task 切片非空」。diffPaths（=task 卡 allowed_paths）把证据校验收窄为
 * `git diff base..head -- diffPaths` 的路径限定切片，统一 commit 模式成为一等公民。
 *
 * 覆盖：
 * 1. validateReviewSchema：diffPaths 可选——合法数组过；空数组/非字符串成员/非数组报错
 * 2. verifyReviewGitEvidence：切片上跑 emptyDiff / changedFiles 交叉比对（统一 commit 形态
 *    fixture：一个 commit 同时动 feature.js + shared/other.js，两个 task 各分一半）
 * 3. adoptTaskReviewMechanics（CLI）：有归属切片的 review 代填 diffPaths=allowed_paths；
 *    空归属不带（防切片恒空 → emptyDiff 误判伪造）；adopt 产物过 schema+evidence 同源校验
 * 4. generateTaskReviewDrafts：草稿同口径带 diffPaths（有归属时）
 */
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'fs'
import { join, dirname } from 'path'
import { tmpdir } from 'os'
import { spawnSync } from 'child_process'
import { fileURLToPath } from 'url'

import { validateReviewSchema, verifyReviewGitEvidence, adoptTaskReviewMechanics, generateTaskReviewDrafts } from '../src/task-review.js'

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

/**
 * 统一 commit 形态 fixture：base 后一个 commit 同时动 feature.js（task-01 领域）与
 * shared/other.js（task-02 领域）——per-task 提交区间不存在，正是坑形态。
 */
function makeFixture() {
  const proj = mkdtempSync(join(tmpdir(), 'diffpaths-'))
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

  const tasksDir = join(specBase, 'changes', 'c1', 'tasks')
  mkdirSync(tasksDir, { recursive: true })
  writeFileSync(join(tasksDir, 'task-01.md'),
    '---\nid: task-01\nallowed_paths: [feature.js]\n---\n# task-01\n实现 feature.js\n')
  writeFileSync(join(tasksDir, 'task-02.md'),
    '---\nid: task-02\nallowed_paths: [shared/]\n---\n# task-02\n实现 shared/other.js\n')

  // 统一 commit：两个 task 的改动一次性提交
  writeFileSync(join(proj, 'feature.js'), 'export const x = 1\n')
  mkdirSync(join(proj, 'shared'), { recursive: true })
  writeFileSync(join(proj, 'shared', 'other.js'), 'export const y = 2\n')
  git(proj, ['add', '.'])
  git(proj, ['commit', '-q', '-m', 'feat: task-01+02 unified commit'])
  const head = git(proj, ['rev-parse', 'HEAD'])

  // execute run marker + 已存在 review（统一 commit 模式：base/head 全区间，等 adopt 代填 diffPaths）
  const runId = 'exec-2026-09-01-120000'
  const runTasksDir = join(specBase, '.runtime', 'execute-runs', runId, 'tasks')
  mkdirSync(join(runTasksDir, 'task-01'), { recursive: true })
  writeFileSync(join(specBase, '.runtime', 'current-execute-run-id-c1'), runId + '\n')
  writeFileSync(join(runTasksDir, 'task-01', 'review.json'), JSON.stringify({
    schemaVersion: 2, task: 'task-01', base: baseHash, head,
    changedFiles: ['feature.js'],
    specVerdict: 'pass', qualityVerdict: 'pass',
    reviewerNotes: 'agent 语义结论（必须保留）',
  }, null, 2))

  return { cwd: proj, specBase, runId, baseHash, head }
}

function runCLI(args, cwd) {
  const res = spawnSync(process.execPath, [cliBin, ...args], {
    cwd, encoding: 'utf8', timeout: 60_000, stdio: ['pipe', 'pipe', 'pipe'],
  })
  return { stdout: res.stdout || '', stderr: res.stderr || '', status: res.status, combined: (res.stdout || '') + (res.stderr || '') }
}

console.log('--- 1. validateReviewSchema：diffPaths 可选字段校验 ---')
{
  const base = { schemaVersion: 2, task: 'task-01', base: 'a'.repeat(40), head: 'b'.repeat(40), specVerdict: 'pass', qualityVerdict: 'pass' }
  assert(validateReviewSchema({ ...base }).ok, '不带 diffPaths 过 schema（per-task commit 模式零变化）')
  assert(validateReviewSchema({ ...base, diffPaths: ['feature.js', 'shared/'] }).ok, 'diffPaths 合法数组过 schema')
  assert(!validateReviewSchema({ ...base, diffPaths: [] }).ok, 'diffPaths 空数组报错')
  assert(!validateReviewSchema({ ...base, diffPaths: 'feature.js' }).ok, 'diffPaths 非数组（字符串）报错')
  assert(!validateReviewSchema({ ...base, diffPaths: ['a.js', 1] }).ok, 'diffPaths 含非字符串成员报错')
}

const fx = makeFixture()
try {
  console.log('--- 2. verifyReviewGitEvidence：diffPaths 切片（统一 commit 形态） ---')
  {
    // 统一 commit：base..head = feature.js + shared/other.js（两个 task 的文件混在一个区间）
    let r = verifyReviewGitEvidence({ base: fx.baseHash, head: fx.head }, fx.cwd)
    assert(r.ok && !r.emptyDiff, '无 diffPaths（缺省）：全区间行为零变化（非空、ok）')

    // task-01 切片：diffPaths=['feature.js'] → 切片=[feature.js]，非空
    r = verifyReviewGitEvidence({ base: fx.baseHash, head: fx.head, diffPaths: ['feature.js'] }, fx.cwd)
    assert(r.ok && !r.emptyDiff, 'diffPaths=feature.js → 本 task 切片非空')

    // task-02 切片：diffPaths=['shared/']（目录前缀）→ 命中 shared/other.js
    r = verifyReviewGitEvidence({ base: fx.baseHash, head: fx.head, diffPaths: ['shared/'] }, fx.cwd)
    assert(r.ok && !r.emptyDiff, 'diffPaths=shared/ 目录前缀切片命中')

    // 切片为空：diffPaths 指向区间内不存在的路径 → emptyDiff（机器可验「本 task 未实现」）
    r = verifyReviewGitEvidence({ base: fx.baseHash, head: fx.head, diffPaths: ['docs/'] }, fx.cwd)
    assert(r.ok && r.emptyDiff, 'diffPaths=docs/（区间外）→ emptyDiff=true——统一 commit 模式下任务边界机器可验')

    // changedFiles 与切片不相交：changedFiles 声称的文件不在切片内 → 报错文案带 diffPaths 提示
    r = verifyReviewGitEvidence({ base: fx.baseHash, head: fx.head, diffPaths: ['feature.js'], changedFiles: ['shared/other.js'] }, fx.cwd)
    assert(!r.ok && r.errors.some(e => e.includes('不相交') && e.includes('diffPaths')), `changedFiles 越出切片 → 不相交报错带 diffPaths 提示（实际 ${r.errors.join('; ')}）`)

    // changedFiles 在切片内 → ok
    r = verifyReviewGitEvidence({ base: fx.baseHash, head: fx.head, diffPaths: ['feature.js'], changedFiles: ['feature.js'] }, fx.cwd)
    assert(r.ok, 'changedFiles ⊆ 切片 → ok')
  }

  console.log('--- 3. CLI adopt：统一 commit 模式代填 diffPaths（verdict 保留） ---')
  {
    const r = runCLI(['backfill-reviews', '--change', 'c1', '--adopt'], fx.cwd)
    assert(r.status === 0, `exit 0（实际 ${r.status}；输出 ${r.combined.slice(0, 300)}）`)

    const rv1 = JSON.parse(readFileSync(join(fx.specBase, '.runtime', 'execute-runs', fx.runId, 'tasks', 'task-01', 'review.json'), 'utf8'))
    assert(Array.isArray(rv1.diffPaths) && rv1.diffPaths.includes('feature.js'), `task-01（有归属切片）代填 diffPaths=allowed_paths（实际 ${JSON.stringify(rv1.diffPaths)}）`)
    assert(rv1.specVerdict === 'pass' && rv1.qualityVerdict === 'pass', 'task-01 verdict 原样保留')
    const ev1 = verifyReviewGitEvidence(rv1, fx.cwd)
    assert(ev1.ok && !ev1.emptyDiff, 'task-01 adopt 产物过 evidence 切片校验（统一 commit 下本 task 切片非空）')

    // task-02：shared/other.js 有归属 → 草稿（adopt 的 missing 分支由 backfill 草稿路径补）
    const draftPath = join(fx.specBase, '.runtime', 'execute-runs', fx.runId, 'tasks', 'task-02', 'review.json')
    const rv2 = JSON.parse(readFileSync(draftPath, 'utf8'))
    assert(rv2.specVerdict === 'cannot_verify', 'task-02 草稿生成（cannot_verify）')
    assert(Array.isArray(rv2.diffPaths) && rv2.diffPaths.includes('shared/'), `task-02 草稿带 diffPaths=allowed_paths（实际 ${JSON.stringify(rv2.diffPaths)}）`)
    assert(validateReviewSchema(rv2).ok, 'task-02 草稿过 schema')
  }

  console.log('--- 4. 空归属不带 diffPaths（防切片恒空误判伪造） ---')
  {
    // task-03：allowed_paths 指向区间外路径 → 无归属草稿不带 diffPaths（emptyDiff 判定不因
    // diffPaths 收窄而误触发——坑 fix 的安全边界）
    const tasksDir = join(fx.specBase, 'changes', 'c1', 'tasks')
    writeFileSync(join(tasksDir, 'task-03.md'),
      '---\nid: task-03\nallowed_paths: [untouched.js]\n---\n# task-03\n未实现\n')
    const g = await generateTaskReviewDrafts({ changeName: 'c1', cwd: fx.cwd })
    assert(g.generated >= 1, `task-03 无归属草稿生成（实际 generated=${g.generated}）`)
    const rv3 = JSON.parse(readFileSync(join(fx.specBase, '.runtime', 'execute-runs', fx.runId, 'tasks', 'task-03', 'review.json'), 'utf8'))
    assert(!('diffPaths' in rv3), `空归属草稿不带 diffPaths（实际 ${JSON.stringify(rv3.diffPaths)}）`)
    // 不带 diffPaths 时 evidence 走全区间（非空）——不误判 emptyDiff 伪造，留给 agent 复核升级
    const ev3 = verifyReviewGitEvidence(rv3, fx.cwd)
    assert(ev3.ok && !ev3.emptyDiff, 'task-03 无归属草稿过 evidence（全区间口径，不误判伪造）')
  }
} finally {
  for (const t of tmpRoots) { try { rmSync(t, { recursive: true, force: true }) } catch {} }
}

console.log(`\n合计: ${passed} 通过, ${failed} 失败`)
process.exit(failed > 0 ? 1 : 0)
