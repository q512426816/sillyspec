/**
 * 坑 stage-review-dochash-manual-resync 回归：register-stage-review 的 docHash 联动
 *
 * 背景（2026-08-21 实证）：brainstorm/execute 的 stage review 都锚 design.md，改一版 design
 * 要手工重算 2-3 个 review.json 的 docHash，容易漏——gate 报错时才补。
 *
 * 锁定语义：
 *   1. --refresh-hash：就地刷新既有 review 的 docHash（保留 verdict/checklist/requiredEvidence，
 *      reviewerNotes 追加刷新记录），run 目录不换（marker 不重定向、已审结论不丢）
 *   2. --all：一条命令处理三个 stage——有既有 review 的刷 hash（mode=refreshed），
 *      无既有 review 的生成骨架（mode=skeleton）
 *   3. --refresh-hash 无既有 review → 报错（不静默生成骨架，防止误以为已刷新）
 *   4. 刷新后的 review 过 docHash 真实性校验（gate 同源 verifyStageReviewDocHash）
 */
import { join } from 'node:path'
import { writeFileSync, mkdirSync, readFileSync, mkdtempSync, rmSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { execSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { registerStageReview, validateStageReview, getLatestStageReviewRunId } from '../src/stage-review.js'
import { createHash } from 'node:crypto'

const __dirname = fileURLToPath(import.meta.url).replace(/[^/\\]+$/, '')
const root = join(__dirname, '..')
const binCLI = join(root, 'bin', 'sillyspec.js')

let passed = 0, failed = 0
const failures = []
function assert(cond, msg) { cond ? (passed++, console.log(`  ✅ PASS: ${msg}`)) : (failed++, failures.push(msg), console.log(`  ❌ FAIL: ${msg}`)) }
function run(cmd) {
  try { return { out: execSync(cmd, { encoding: 'utf8', timeout: 60000 }), status: 0 } }
  catch (e) { return { out: (e.stdout || '') + (e.stderr || ''), status: e.status } }
}
const tmpDirs = []
function setup(prefix) {
  const d = mkdtempSync(join(tmpdir(), `rsr-${prefix}-`))
  tmpDirs.push(d)
  const cn = '2026-08-21-rsr'
  const changeDir = join(d, '.sillyspec', 'changes', cn)
  mkdirSync(changeDir, { recursive: true })
  writeFileSync(join(changeDir, 'design.md'), '# Design v1\n\n## 背景\n原版\n')
  writeFileSync(join(changeDir, 'plan.md'), '# Plan v1\n')
  return { d, cn, changeDir, specBase: join(d, '.sillyspec') }
}
const cleanup = () => { for (const d of tmpDirs) { try { rmSync(d, { recursive: true, force: true }) } catch {} } }

console.log('=== register-stage-review docHash 联动（坑 stage-review-dochash-manual-resync）===\n')

console.log('--- ① --refresh-hash：就地刷新，保留结论，不换 run ---')
{
  const { d, cn, changeDir, specBase } = setup('refresh')
  // 先生成骨架 + 模拟审查结论落盘（verdict=pass）
  const r1 = registerStageReview({ changeName: cn, stage: 'brainstorm', cwd: d })
  const runDir = join(specBase, '.runtime', 'stage-reviews', `brainstorm-${r1.reviewRunId}`)
  const reviewPath = join(runDir, 'review.json')
  const withVerdict = { ...r1.review, specVerdict: 'pass', qualityVerdict: 'pass', reviewerNotes: '独立子代理已审 v1' }
  writeFileSync(reviewPath, JSON.stringify(withVerdict, null, 2) + '\n')

  // 改版 design → 旧 docHash 失效
  writeFileSync(join(changeDir, 'design.md'), '# Design v2\n\n## 背景\n改版后\n')
  const stale = validateStageReview({ stage: 'brainstorm', reviewType: 'design', runtimeRoot: join(specBase, '.runtime'), reviewRunId: r1.reviewRunId, searchDirs: [specBase, changeDir, d] })
  assert(stale.ok === false, '前置：改版后旧 review 的 docHash 校验失败（gate 会拦）')

  // --refresh-hash 刷新
  const r2 = registerStageReview({ changeName: cn, stage: 'brainstorm', cwd: d, refreshHash: true })
  assert(r2.mode === 'refreshed', 'mode=refreshed')
  assert(r2.reviewRunId === r1.reviewRunId, 'run 目录不换（marker 不重定向）')
  const refreshed = JSON.parse(readFileSync(r2.reviewPath, 'utf8'))
  assert(refreshed.specVerdict === 'pass' && refreshed.qualityVerdict === 'pass', 'verdict 结论保留')
  assert(refreshed.reviewerNotes.includes('独立子代理已审 v1'), '原 reviewerNotes 保留')
  assert(refreshed.reviewerNotes.includes('docHash refreshed at'), '追加刷新记录（含人工确认提示）')
  const expectHash = createHash('sha256').update(readFileSync(join(changeDir, 'design.md'))).digest('hex')
  assert(refreshed.docHash === expectHash, 'docHash = 新版 design 的 sha256')
  const after = validateStageReview({ stage: 'brainstorm', reviewType: 'design', runtimeRoot: join(specBase, '.runtime'), reviewRunId: r2.reviewRunId, searchDirs: [specBase, changeDir, d] })
  assert(after.ok === true, '刷新后 gate 同源校验通过')
  cleanup()
}

console.log('--- ② --all：有 review 刷 hash，无 review 生成骨架 ---')
{
  const { d, cn, changeDir, specBase } = setup('all')
  // brainstorm 已有 review（填了结论）；plan/execute 无
  const r1 = registerStageReview({ changeName: cn, stage: 'brainstorm', cwd: d })
  writeFileSync(r1.reviewPath, JSON.stringify({ ...r1.review, specVerdict: 'pass', qualityVerdict: 'pass' }, null, 2) + '\n')
  writeFileSync(join(changeDir, 'design.md'), '# Design v2\n\n## 背景\n改版\n')

  const cli = run(`node "${binCLI}" --dir "${d}" register-stage-review --change ${cn} --all`)
  assert(cli.status === 0, `--all 一次成功（exit ${cli.status}，输出尾：${cli.out.slice(-150)}）`)
  assert(cli.out.includes('brainstorm') && cli.out.includes('mode: refreshed'), 'brainstorm（有 review）→ refreshed')
  assert(cli.out.includes('plan') && cli.out.includes('mode: skeleton'), 'plan（无 review）→ skeleton')
  assert(cli.out.includes('execute') && cli.out.includes('mode: skeleton'), 'execute（无 review）→ skeleton')
  // marker 各自更新且指向存在
  const rt = join(specBase, '.runtime')
  assert(!!getLatestStageReviewRunId(rt, 'plan', cn), 'plan marker 已写')
  assert(!!getLatestStageReviewRunId(rt, 'execute', cn), 'execute marker 已写')
  cleanup()
}

console.log('--- ③ --refresh-hash 无既有 review → 报错不静默 ---')
{
  const { d, cn } = setup('norefresh')
  const cli = run(`node "${binCLI}" --dir "${d}" register-stage-review --change ${cn} --stage plan --refresh-hash`)
  assert(cli.status !== 0, `exit 非 0（实际 ${cli.status}）`)
  assert(cli.out.includes('找不到') || cli.out.includes('骨架'), '报错提示先生成骨架')
  cleanup()
}

console.log('--- ④ 单 stage 骨架模式零回归（--stage 不带新 flag）---')
{
  const { d, cn } = setup('legacy')
  const cli = run(`node "${binCLI}" --dir "${d}" register-stage-review --change ${cn} --stage brainstorm`)
  assert(cli.status === 0, `原命令形态照常（exit ${cli.status}）`)
  assert(cli.out.includes('mode: skeleton'), 'mode=skeleton（零回归）')
  cleanup()
}

console.log(`\n${'='.repeat(50)}`)
console.log(`✅ 通过: ${passed}  ❌ 失败: ${failed}`)
if (failures.length) { console.log('失败项:'); failures.forEach(f => console.log('  - ' + f)) }
console.log('='.repeat(50))
if (failed > 0) process.exit(1)
