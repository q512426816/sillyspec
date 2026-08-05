/**
 * backfill-reviews 命令测试（坑 verify-archive-flow-pitfalls 坑2 官方入口）
 *
 * 验证：手动补的 task（reopen execute / 直接实现）缺 review.json 时，
 * `sillyspec backfill-reviews --change <name>` 复用 generateTaskReviewDrafts
 * 补写 cannot_verify 草稿（幂等），解 archive 客观完成度阻断。
 *
 * 设计依据：src/index.js case 'backfill-reviews' + src/task-review.js generateTaskReviewDrafts。
 * 风格：自研 assert + mkdtempSync 临时 git 仓，参照 machine-interface.test.mjs 的 fixture 模式。
 */
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync, readdirSync, readFileSync } from 'fs'
import { join, dirname } from 'path'
import { tmpdir } from 'os'
import { spawnSync } from 'child_process'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const cliBin = join(__dirname, '..', 'bin', 'sillyspec.js')

let passed = 0
let failed = 0
const tmpRoots = []

function assert(cond, msg) {
  if (cond) {
    console.log(`  ✅ PASS: ${msg}`)
    passed++
  } else {
    console.log(`  ❌ FAIL: ${msg}`)
    failed++
  }
}

function git(dir, args) {
  return spawnSync('git', args, { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).stdout.trim()
}

function initGitRepo(dir) {
  git(dir, ['init', '-q'])
  git(dir, ['config', 'user.email', 'test@test.local'])
  git(dir, ['config', 'user.name', 'test'])
  git(dir, ['config', 'commit.gpgsign', 'false'])
}

function makeTmpDir(prefix) {
  const dir = mkdtempSync(join(tmpdir(), prefix))
  tmpRoots.push(dir)
  return dir
}

// 构造：git 仓 + change + worktree meta(in-place) + task-01 带 allowed_paths + base 后 commit feature.js
function makeFixture() {
  const proj = makeTmpDir('br-')
  const specBase = join(proj, '.sillyspec')
  mkdirSync(specBase, { recursive: true })

  initGitRepo(proj)
  writeFileSync(join(proj, '.gitignore'), '.sillyspec/\n')
  writeFileSync(join(proj, 'main.js'), 'console.log(1)\n')
  git(proj, ['add', '.'])
  git(proj, ['commit', '-q', '-m', 'init'])
  const baseHash = git(proj, ['rev-parse', 'HEAD'])

  // worktree meta：in-place-fallback 指向主仓，baseHash 给定 base..head 锚点
  const wtMetaDir = join(specBase, '.runtime', 'worktrees', 'c1')
  mkdirSync(wtMetaDir, { recursive: true })
  writeFileSync(join(wtMetaDir, 'meta.json'), JSON.stringify({
    changeName: 'c1', baseHash, mode: 'in-place-fallback', worktreePath: proj,
  }))

  // change + task-01（allowed_paths 含 feature.js，归属 base..head diff）
  const changeDir = join(specBase, 'changes', 'c1')
  const tasksDir = join(changeDir, 'tasks')
  mkdirSync(tasksDir, { recursive: true })
  writeFileSync(join(tasksDir, 'task-01.md'),
    '---\nid: task-01\nallowed_paths: [feature.js]\n---\n# task-01\n实现 feature.js\n')

  // base 之后 commit feature.js → base..head diff = feature.js
  writeFileSync(join(proj, 'feature.js'), 'export const x = 1\n')
  git(proj, ['add', 'feature.js'])
  git(proj, ['commit', '-q', '-m', 'feat: task-01'])

  return { cwd: proj, specBase }
}

function runCLI(args, cwd) {
  const res = spawnSync(process.execPath, [cliBin, ...args], {
    cwd, encoding: 'utf8', timeout: 20000, stdio: ['pipe', 'pipe', 'pipe'],
  })
  return { stdout: res.stdout || '', stderr: res.stderr || '', status: res.status, combined: (res.stdout || '') + (res.stderr || '') }
}

// 找 execute-runs 下 task-01 的 review.json（run id 由 CLI 生成）
function findReviewJson(specBase) {
  const runsDir = join(specBase, '.runtime', 'execute-runs')
  if (!existsSync(runsDir)) return null
  for (const runId of readdirSync(runsDir)) {
    const p = join(runsDir, runId, 'tasks', 'task-01', 'review.json')
    if (existsSync(p)) return p
  }
  return null
}

// ── Test 1: 无 --change → exit 2 + 用法提示 ──
console.log('\n=== Test 1: 无 --change 路由到用法错误（exit 2）===')
{
  const { cwd } = makeFixture()
  const res = runCLI(['backfill-reviews'], cwd)
  assert(res.status === 2, `无 --change 退出码 2（实际 ${res.status}）`)
  assert(res.combined.includes('用法: sillyspec backfill-reviews'), '打印用法提示')
  assert(res.combined.includes('--change'), '用法提示含 --change')
}

// ── Test 2: 正常补写 → exit 0 + review.json 草稿落盘（cannot_verify）──
console.log('\n=== Test 2: 正常补写 cannot_verify 草稿 ===')
{
  const { cwd, specBase } = makeFixture()
  const res = runCLI(['backfill-reviews', '--change', 'c1', '--dir', cwd], cwd)
  assert(res.status === 0, `退出码 0（实际 ${res.status}，输出: ${res.combined.slice(0, 200)}）`)
  assert(res.combined.includes('已补写') || res.combined.includes('1'), `提示补写（输出: ${res.combined.slice(0, 200)}）`)

  const reviewPath = findReviewJson(specBase)
  assert(reviewPath !== null, 'review.json 草稿落盘到 execute-runs/<runId>/tasks/task-01/')
  if (reviewPath) {
    const review = JSON.parse(readFileSync(reviewPath, 'utf8'))
    assert(review.task === 'task-01', 'review.json task 字段 = task-01')
    assert(review.specVerdict === 'cannot_verify', `specVerdict = cannot_verify（实际 ${review.specVerdict}）`)
    assert(review.qualityVerdict === 'cannot_verify', `qualityVerdict = cannot_verify（实际 ${review.qualityVerdict}）`)
    assert(Array.isArray(review.changedFiles) && review.changedFiles.includes('feature.js'),
      `changedFiles 含 feature.js（实际 ${JSON.stringify(review.changedFiles)}）`)
    assert(Array.isArray(review.requiredEvidence) && review.requiredEvidence.length > 0,
      'cannot_verify 配非空 requiredEvidence')
  }
}

// ── Test 3: 幂等 → 第二次跑 generated=0 skipped=1（不覆盖已存在 review.json）──
console.log('\n=== Test 3: 幂等（第二次跑跳过已存在）===')
{
  const { cwd, specBase } = makeFixture()
  runCLI(['backfill-reviews', '--change', 'c1', '--dir', cwd], cwd) // 第一次：补写
  const firstReview = findReviewJson(specBase)
  assert(firstReview !== null, '第一次跑后 review.json 存在')
  // 篡改 review.json 模拟 agent 已升级为 pass，验证二次跑不覆盖
  if (firstReview) {
    const upgraded = JSON.parse(readFileSync(firstReview, 'utf8'))
    upgraded.specVerdict = 'pass'
    upgraded.qualityVerdict = 'pass'
    writeFileSync(firstReview, JSON.stringify(upgraded))
  }
  const res2 = runCLI(['backfill-reviews', '--change', 'c1', '--dir', cwd], cwd)
  assert(res2.status === 0, `第二次跑退出码 0（实际 ${res2.status}）`)
  assert(res2.combined.includes('跳过') || res2.combined.includes('无草稿可补'),
    `第二次跑提示跳过/无草稿（输出: ${res2.combined.slice(0, 200)}）`)
  // 关键：不覆盖 agent 升级后的 pass
  if (firstReview) {
    const after = JSON.parse(readFileSync(firstReview, 'utf8'))
    assert(after.specVerdict === 'pass', '幂等：不覆盖 agent 已升级的 specVerdict=pass')
  }
}

// ── Test 4: --json 输出可解析 + command 字段 ──
console.log('\n=== Test 4: --json 结构化输出可解析 ===')
{
  const { cwd } = makeFixture()
  const res = runCLI(['backfill-reviews', '--change', 'c1', '--dir', cwd, '--json'], cwd)
  assert(res.status === 0, `--json 退出码 0（实际 ${res.status}）`)
  let env = null
  try { env = JSON.parse(res.stdout) } catch {}
  assert(env !== null, `--json stdout 可 JSON.parse（实际 stdout: ${res.stdout.slice(0, 150)}）`)
  if (env) {
    assert(env.command === 'backfill-reviews', `command = backfill-reviews（实际 ${env.command}）`)
    assert(env.change === 'c1', 'change = c1')
    assert(typeof env.generated === 'number', 'generated 字段为数字')
  }
}

// ── Test 5: 无 tasks/ 目录的变更 → reason 提示，exit 0（不报错）──
console.log('\n=== Test 5: 无 tasks/ 目录 → reason 提示不报错 ===')
{
  const proj = makeTmpDir('br-empty-')
  const specBase = join(proj, '.sillyspec')
  mkdirSync(join(specBase, 'changes', 'c2'), { recursive: true }) // 仅建 changes/c2，无 tasks/
  const res = runCLI(['backfill-reviews', '--change', 'c2', '--dir', proj], proj)
  assert(res.status === 0, `无 tasks/ 退出码 0（实际 ${res.status}）`)
  assert(res.combined.includes('无草稿可补'), `提示无草稿可补（输出: ${res.combined.slice(0, 200)}）`)
}

// ── 汇总 ──
console.log(`\n${'='.repeat(50)}`)
console.log(`✅ 通过: ${passed}  ❌ 失败: ${failed}`)
console.log(`${'='.repeat(50)}`)

for (const d of tmpRoots) { try { rmSync(d, { recursive: true, force: true }) } catch {} }
if (failed > 0) throw new Error(`${failed} test(s) failed`)
