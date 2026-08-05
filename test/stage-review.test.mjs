/**
 * Stage Review Gate + Review Tier 单元测试
 *
 * 覆盖：
 *   1. classifyReviewTier —— 规模分级（plan_level / 文件数 / fail-safe）
 *   2. validateStageReviewSchema —— 文档型 schema（reviewType/verdict/cannot_verify/reviewedFiles/docHash/checklist）
 *   3. verifyStageReviewDocHash —— docHash 真实性（防伪造）
 *   4. validateStageReview —— 总校验（缺失/fail/通过）
 *   5. task-review 回归 —— 复用常量不破坏现有 v1 code-task 校验
 */
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { createHash } from 'node:crypto'

import { classifyReviewTier, SELF_REVIEW_FILE_THRESHOLD } from '../src/review-tier.js'
import {
  validateStageReviewSchema,
  verifyStageReviewDocHash,
  validateStageReview,
  generateStageReviewRunId,
  getLatestStageReviewRunId,
  stageReviewMarkerPath,
  computeDocHash,
} from '../src/stage-review.js'
import { validateReviewSchema, VALID_VERDICTS, REVIEW_SCHEMA_VERSION } from '../src/task-review.js'

let total = 0
let failed = 0
function assert(condition, msg) {
  total++
  if (!condition) { failed++; console.log(`  ❌ FAIL: ${msg}`) }
  else console.log(`  ✅ PASS: ${msg}`)
}

const tmpRoots = []
function makeTmpDir(prefix) {
  const dir = mkdtempSync(join(tmpdir(), prefix))
  tmpRoots.push(dir)
  return dir
}

/** 写一个带文件变更清单的 design.md，返回路径 */
function writeDesign(dir, files) {
  const lines = ['# Design\n', '## 文件变更清单\n', '| 操作 | 文件路径 | 说明 |', '| --- | --- | --- |']
  for (const f of files) lines.push(`| 新增 | ${f} | |`)
  const path = join(dir, 'design.md')
  writeFileSync(path, lines.join('\n') + '\n')
  return path
}

/** 写 stage review.json 到 runtimeRoot/stage-reviews/<stage>-<runId>/review.json */
function writeStageReview(runtimeRoot, stage, runId, obj) {
  const dir = join(runtimeRoot, 'stage-reviews', `${stage}-${runId}`)
  mkdirSync(dir, { recursive: true })
  const path = join(dir, 'review.json')
  writeFileSync(path, JSON.stringify(obj, null, 2) + '\n')
  return path
}

// ────────────────────────────────────────────────────────────
console.log('=== 1. classifyReviewTier（规模分级）===\n')

{
  // plan_level=none → self（无论文件数）
  const t = classifyReviewTier({ planLevel: 'none', designPath: writeDesign(makeTmpDir('rt-'), ['a.js', 'b.js', 'c.js', 'd.js', 'e.js']) })
  assert(t.tier === 'self', `plan_level=none → self（即使 5 文件）`)

  // plan_level=full + 文件 > 阈值 → independent
  const t2 = classifyReviewTier({ planLevel: 'full', designPath: writeDesign(makeTmpDir('rt-'), ['a.js', 'b.js', 'c.js', 'd.js']) })
  assert(t2.tier === 'independent', `plan_level=full + 4 文件 → independent`)
  assert(t2.fileCount === 4, `fileCount 正确返回 4`)

  // plan_level=light + 文件 ≤ 阈值 → self
  const t3 = classifyReviewTier({ planLevel: 'light', designPath: writeDesign(makeTmpDir('rt-'), ['a.js', 'b.js']) })
  assert(t3.tier === 'self', `plan_level=light + 2 文件 → self`)

  // 无 planLevel + 文件 ≤ 阈值 → self（brainstorm/propose 场景）
  const t4 = classifyReviewTier({ designPath: writeDesign(makeTmpDir('rt-'), ['a.js']) })
  assert(t4.tier === 'self', `无 planLevel + 1 文件 → self`)

  // 阈值边界：恰好 = 阈值 → self
  const boundary = classifyReviewTier({ designPath: writeDesign(makeTmpDir('rt-'), Array(SELF_REVIEW_FILE_THRESHOLD).fill(0).map((_, i) => `f${i}.js`)) })
  assert(boundary.tier === 'self', `文件数 = 阈值(${SELF_REVIEW_FILE_THRESHOLD}) → self（≤ 含等号）`)

  // 文件清单为空（0 文件）→ self
  const t5 = classifyReviewTier({ designPath: writeDesign(makeTmpDir('rt-'), []) })
  assert(t5.tier === 'self', `design 有清单章节但 0 文件 → self（字面 0）`)

  // 无 planLevel + 无 designPath → independent（fail-safe，宁严）
  const t6 = classifyReviewTier({})
  assert(t6.tier === 'independent', `无 planLevel 无 designPath → independent（fail-safe）`)

  // plan_level=full + 无 designPath → independent
  const t7 = classifyReviewTier({ planLevel: 'full' })
  assert(t7.tier === 'independent', `plan_level=full 无 designPath → independent`)
}

// ────────────────────────────────────────────────────────────
console.log('\n=== 2. validateStageReviewSchema（文档型 schema）===\n')

function validReview(overrides = {}) {
  return {
    schemaVersion: REVIEW_SCHEMA_VERSION,
    reviewType: 'plan',
    stage: 'plan',
    specVerdict: 'pass',
    qualityVerdict: 'pass',
    reviewedFiles: ['changes/x/plan.md'],
    docHash: 'abc123',
    reviewerNotes: 'ok',
    ...overrides,
  }
}

{
  assert(validateStageReviewSchema(validReview()).ok, `合法 review → ok`)

  assert(!validateStageReviewSchema(validReview({ schemaVersion: 99 })).ok, `schemaVersion 错 → fail`)

  assert(!validateStageReviewSchema(validReview({ reviewType: 'unknown' })).ok, `reviewType 非法 → fail`)

  assert(!validateStageReviewSchema(validReview({ specVerdict: 'maybe' })).ok, `specVerdict 非法 → fail`)

  assert(!validateStageReviewSchema(validReview({ qualityVerdict: 'nope' })).ok, `qualityVerdict 非法 → fail`)

  // cannot_verify + 空 requiredEvidence → fail（反逃逸）
  assert(!validateStageReviewSchema(validReview({ specVerdict: 'cannot_verify', requiredEvidence: [] })).ok,
    `cannot_verify + 空 requiredEvidence → fail`)

  // cannot_verify + 非空 requiredEvidence → ok
  assert(validateStageReviewSchema(validReview({ specVerdict: 'cannot_verify', requiredEvidence: ['需补集成测试'] })).ok,
    `cannot_verify + 非空 requiredEvidence → ok`)

  assert(!validateStageReviewSchema(validReview({ reviewedFiles: [] })).ok, `空 reviewedFiles → fail`)
  assert(!validateStageReviewSchema(validReview({ reviewedFiles: undefined })).ok, `缺 reviewedFiles → fail`)
  assert(!validateStageReviewSchema(validReview({ docHash: undefined })).ok, `缺 docHash → fail`)

  // checklist.result 非法 → fail
  assert(!validateStageReviewSchema(validReview({ checklist: [{ item: 'x', result: 'bad' }] })).ok,
    `checklist.result 非法 → fail`)
  assert(validateStageReviewSchema(validReview({ checklist: [{ item: 'x', result: 'gap', note: 'n' }] })).ok,
    `checklist.result=gap → ok`)
  assert(!validateStageReviewSchema(validReview({ checklist: [{ result: 'pass' }] })).ok,
    `checklist 项缺 item → fail`)
}

// ────────────────────────────────────────────────────────────
console.log('\n=== 3. verifyStageReviewDocHash（docHash 防伪造）===\n')

{
  const dir = makeTmpDir('dh-')
  const docPath = join(dir, 'plan.md')
  writeFileSync(docPath, '# Plan\n真实内容\n')
  const realHash = computeDocHash(docPath)
  assert(realHash && realHash.length === 64, `computeDocHash 返回 64 位 sha256`)

  // 匹配 → ok
  const r1 = verifyStageReviewDocHash(
    { reviewedFiles: ['plan.md'], docHash: realHash },
    [dir],
  )
  assert(r1.ok, `docHash 匹配 → ok`)

  // 大写 docHash（PowerShell Get-FileHash）也应匹配——大小写不敏感（修复 stage-review 大小写敏感 bug）
  const r1b = verifyStageReviewDocHash(
    { reviewedFiles: ['plan.md'], docHash: realHash.toUpperCase() },
    [dir],
  )
  assert(r1b.ok, `docHash 大写（PowerShell Get-FileHash）→ ok（大小写不敏感）`)

  // 不匹配 → fail（伪造）
  const r2 = verifyStageReviewDocHash(
    { reviewedFiles: ['plan.md'], docHash: 'deadbeef' },
    [dir],
  )
  assert(!r2.ok && r2.errors.length > 0, `docHash 不匹配 → fail（疑似伪造）`)

  // 文件不存在 → fail-closed：reviewedFiles[0] 在所有候选基准下都找不到，要么路径伪造要么
  // 基准错位。gates.js 的 searchDirs=[effectiveSpecBase(.sillyspec), reviewChangeDir, cwd]
  // 必命中契约 reviewedFiles[0]（changes/<change>/<mainDoc> 或 <mainDoc>）其一，故合法 review
  // 不会误杀；找不到即判异常，阻断而非降级 warning（历史降级放行可被填假路径+假 hash 绕过）
  const r3 = verifyStageReviewDocHash(
    { reviewedFiles: ['missing.md'], docHash: 'whatever' },
    [dir],
  )
  assert(!r3.ok && r3.errors.length > 0, '主文档不存在 → fail-closed 阻断（堵伪造路径绕过）')

  // 多候选基准目录：第一个找不到、第二个找到
  const dir2 = makeTmpDir('dh2-')
  const docPath2 = join(dir2, 'plan.md')
  writeFileSync(docPath2, '# Plan\n真实内容\n')
  const r4 = verifyStageReviewDocHash(
    { reviewedFiles: ['plan.md'], docHash: computeDocHash(docPath2) },
    [dir, dir2],
  )
  assert(r4.ok, `多候选基准：第二目录命中 → ok`)

  // CRLF 双口径容忍（坑 worktree-execute-apply-friction 坑3）：Windows 下 CRLF/LF 在 git add /
  // eol 规范化前后字节漂移，同文件 sha256 偶发不一致 → gate 反复误报「疑似伪造」。现 gate 对
  // 「原始字节」与「LF 规范化」两种 hash 任一匹配即过，agent 用任一口径写的 docHash 都被接受。
  const hashOf = (p, lf) => {
    const c = readFileSync(p, 'utf8')
    return createHash('sha256').update(lf ? c.replace(/\r\n/g, '\n') : c).digest('hex')
  }
  const crlfDir = makeTmpDir('dh-crlf-')
  const crlfDoc = join(crlfDir, 'plan.md')
  writeFileSync(crlfDoc, '# Plan\r\n真实内容\r\n') // CRLF 版
  assert(verifyStageReviewDocHash({ reviewedFiles: ['plan.md'], docHash: hashOf(crlfDoc, false) }, [crlfDir]).ok,
    'CRLF 文件 + docHash=原始字节 hash → ok（actualRaw 口径）')
  assert(verifyStageReviewDocHash({ reviewedFiles: ['plan.md'], docHash: hashOf(crlfDoc, true) }, [crlfDir]).ok,
    'CRLF 文件 + docHash=LF 规范化 hash → ok（actualLf 口径，坑3 漂移容忍）')
  assert(!verifyStageReviewDocHash({ reviewedFiles: ['plan.md'], docHash: 'deadbeef' }, [crlfDir]).ok,
    'CRLF 文件 + docHash 两口径都不匹配 → fail（防伪造不降级）')
}

// ────────────────────────────────────────────────────────────
console.log('\n=== 4. validateStageReview（总校验）===\n')

{
  const runtimeRoot = makeTmpDir('sr-')
  const changeDir = makeTmpDir('srchange-')
  const planPath = join(changeDir, 'plan.md')
  writeFileSync(planPath, '# Plan\n真实计划内容\n')
  const runId = generateStageReviewRunId()
  assert(/^review-\d{4}-\d{2}-\d{2}-\d{6}$/.test(runId), `runId 格式 review-<ts>`)

  // review.json 缺失 → fail
  const r1 = validateStageReview({ stage: 'plan', reviewType: 'plan', runtimeRoot, reviewRunId: 'review-2026-01-01-000000', searchDirs: [changeDir] })
  assert(!r1.ok && !r1.review, `review.json 缺失 → fail`)

  // 合法 pass + docHash 匹配 → ok
  writeStageReview(runtimeRoot, 'plan', runId, validReview({
    reviewedFiles: ['plan.md'],
    docHash: computeDocHash(planPath),
  }))
  const r2 = validateStageReview({ stage: 'plan', reviewType: 'plan', runtimeRoot, reviewRunId: runId, searchDirs: [changeDir] })
  assert(r2.ok, `合法 pass + docHash 匹配 → ok`)

  // getLatestStageReviewRunId 能扫到
  const latest = getLatestStageReviewRunId(runtimeRoot, 'plan')
  assert(latest === runId, `getLatestStageReviewRunId 扫到最新 runId`)

  // fail verdict → fail
  writeStageReview(runtimeRoot, 'plan', runId, validReview({ specVerdict: 'fail', reviewerNotes: '缺关键路径' }))
  const r3 = validateStageReview({ stage: 'plan', reviewType: 'plan', runtimeRoot, reviewRunId: runId, searchDirs: [changeDir] })
  assert(!r3.ok && r3.errors.join('').includes('缺关键路径'), `fail verdict → fail 且含 reviewerNotes`)

  // reviewType 不符 → fail
  writeStageReview(runtimeRoot, 'plan', runId, validReview({
    reviewType: 'design',
    reviewedFiles: ['plan.md'],
    docHash: computeDocHash(planPath),
  }))
  const r4 = validateStageReview({ stage: 'plan', reviewType: 'plan', runtimeRoot, reviewRunId: runId, searchDirs: [changeDir] })
  assert(!r4.ok && r4.errors.join('').includes('reviewType'), `reviewType 不符 → fail`)

  // docHash 伪造 → fail
  writeStageReview(runtimeRoot, 'plan', runId, validReview({
    reviewedFiles: ['plan.md'],
    docHash: 'fakefakefake',
  }))
  const r5 = validateStageReview({ stage: 'plan', reviewType: 'plan', runtimeRoot, reviewRunId: runId, searchDirs: [changeDir] })
  assert(!r5.ok && r5.errors.join('').includes('伪造'), `docHash 伪造 → fail`)

  // cannot_verify + 非空证据 → ok + warning
  writeStageReview(runtimeRoot, 'plan', runId, validReview({
    specVerdict: 'cannot_verify',
    requiredEvidence: ['需 verify 阶段补集成测试'],
    reviewedFiles: ['plan.md'],
    docHash: computeDocHash(planPath),
  }))
  const r6 = validateStageReview({ stage: 'plan', reviewType: 'plan', runtimeRoot, reviewRunId: runId, searchDirs: [changeDir] })
  assert(r6.ok && r6.warnings.length > 0, `cannot_verify + 非空证据 → ok + warning`)
}

// ────────────────────────────────────────────────────────────
console.log('\n=== 4b. getLatestStageReviewRunId marker 优先 + cross-change 隔离（gap 6）===\n')

{
  // 1. stageReviewMarkerPath 命名契约（prompt 写 == gate 读，同源 helper）
  assert(
    stageReviewMarkerPath(join('rt', 'd'), 'plan', 'mychange') === join(join('rt', 'd'), 'current-stage-review-run-id-plan-mychange'),
    `stageReviewMarkerPath 含 change: <rt>/current-stage-review-run-id-<stage>-<change>`,
  )
  assert(
    stageReviewMarkerPath(join('rt', 'd'), 'plan') === join(join('rt', 'd'), 'current-stage-review-run-id-plan'),
    `stageReviewMarkerPath 无 change（changeName 缺省）: <rt>/current-stage-review-run-id-<stage>`,
  )

  const runtimeRoot = makeTmpDir('srmarker-')

  // 2. 无 marker → fallback 扫目录取字典序最新（向后兼容无 marker 旧数据）
  mkdirSync(join(runtimeRoot, 'stage-reviews', 'plan-review-2026-01-01-100000'), { recursive: true })
  mkdirSync(join(runtimeRoot, 'stage-reviews', 'plan-review-2026-01-02-100000'), { recursive: true })
  const fallback = getLatestStageReviewRunId(runtimeRoot, 'plan')
  assert(fallback === 'review-2026-01-02-100000', `无 marker → fallback 扫目录取字典序最新`)

  // 3. 有 marker → 优先读 marker。即使 marker 的 ID 比目录旧，也以 marker 为准——
  //    marker 是 prompt 注入给 agent 的 ID，gate 必须读它（不是目录最新），这才是 gap 6 的修复点
  const markerFile = stageReviewMarkerPath(runtimeRoot, 'plan')
  writeFileSync(markerFile, 'review-1999-01-01-000000\n')
  const byMarker = getLatestStageReviewRunId(runtimeRoot, 'plan')
  assert(byMarker === 'review-1999-01-01-000000', `有 marker → 优先读 marker（不取目录最新）`)

  // 4. marker 一旦写入即稳定：多次调用返回同一 ID（对齐 execute current-execute-run-id 语义）
  assert(getLatestStageReviewRunId(runtimeRoot, 'plan') === byMarker, `多次调用读同一 marker（ID 稳定）`)
}

{
  // 5. cross-change 隔离：含 change 的 marker 不串台（防多 change 同 stage 互相覆盖）
  const runtimeRoot = makeTmpDir('srcross-')
  writeFileSync(stageReviewMarkerPath(runtimeRoot, 'plan', 'changeA'), 'review-aaaa-01-01-000000\n')
  writeFileSync(stageReviewMarkerPath(runtimeRoot, 'plan', 'changeB'), 'review-bbbb-02-02-000000\n')
  const a = getLatestStageReviewRunId(runtimeRoot, 'plan', 'changeA')
  const b = getLatestStageReviewRunId(runtimeRoot, 'plan', 'changeB')
  assert(a === 'review-aaaa-01-01-000000', `changeA 读自己的 marker（不被 changeB 串台）`)
  assert(b === 'review-bbbb-02-02-000000', `changeB 读自己的 marker`)
  assert(a !== b, `两 change marker 互相隔离`)

  // changeName 缺省时退化到无 change marker（向后兼容旧调用方 / 旧测试）
  assert(getLatestStageReviewRunId(runtimeRoot, 'plan') !== a, `无 changeName 走 stage-only marker / fallback，不误读 changeA`)
}

{
  // 6. marker 内容格式校验（execute 复盘 b2）：exec- 前缀（execute runId）误写进 stage-review marker →
  //    忽略 + 退回目录扫描，不按坏 ID 拼 stage-reviews/<stage>-<runId> 目录报误导错误
  const runtimeRoot = makeTmpDir('srfmt-')
  writeFileSync(stageReviewMarkerPath(runtimeRoot, 'plan', 'mychange'), 'exec-2026-08-04-120000\n')
  const r = getLatestStageReviewRunId(runtimeRoot, 'plan', 'mychange')
  assert(r === null, `marker 内容 exec- 前缀被忽略（退回扫描，无目录 → null）`)
}

{
  // 7. cross-change fallback 过滤（execute 复盘 b1）：无 marker 时按 review.json reviewedFiles[0] 归属变更，
  //    不读他变更（proxy）的 acceptance review；全部不归属 → null fail-closed
  const runtimeRoot = makeTmpDir('srcross-fb-')
  const mkReview = (ch, runId) => {
    mkdirSync(join(runtimeRoot, 'stage-reviews', `plan-${runId}`), { recursive: true })
    writeFileSync(join(runtimeRoot, 'stage-reviews', `plan-${runId}`, 'review.json'),
      JSON.stringify({ schemaVersion: 1, reviewType: 'plan', reviewedFiles: [`changes/${ch}/plan.md`], docHash: 'x', specVerdict: 'pass', qualityVerdict: 'pass' }))
  }
  // changeB(proxy) 的 runId 字典序更大 → 旧实现（无归属过滤）会误取 B
  mkReview('changeA', 'review-2026-01-01-100000')
  mkReview('changeB', 'review-2026-01-02-100000')
  assert(getLatestStageReviewRunId(runtimeRoot, 'plan', 'changeA') === 'review-2026-01-01-100000', `fallback 按 reviewedFiles 归属 changeA，不读 changeB(proxy) 的最新`)
  assert(getLatestStageReviewRunId(runtimeRoot, 'plan', 'changeB') === 'review-2026-01-02-100000', `changeB 读自己的 review`)
  assert(getLatestStageReviewRunId(runtimeRoot, 'plan', 'changeC') === null, `无归属 changeC 的 review → null（fail-closed，不取最新串台）`)
}

// ────────────────────────────────────────────────────────────
console.log('\n=== 5. task-review 回归（复用常量不破坏现有 v1 校验）===\n')

{
  // 复用的常量是 task-review 原值
  assert(VALID_VERDICTS.includes('pass') && VALID_VERDICTS.includes('fail') && VALID_VERDICTS.includes('cannot_verify'),
    `VALID_VERDICTS 三态仍可用`)
  assert(REVIEW_SCHEMA_VERSION === 1, `REVIEW_SCHEMA_VERSION 仍为 1（stage-review 文档型复用同版本号）`)

  // 现有 v1 code-task review 仍通过 validateReviewSchema（stage-review 没动 task-review.js）
  const codeTaskReview = {
    schemaVersion: 1,
    task: 'task-01',
    specVerdict: 'pass',
    qualityVerdict: 'pass',
    base: 'abc1234',
    head: 'def5678',
  }
  assert(validateReviewSchema(codeTaskReview).ok, `v1 code-task review 仍通过 validateReviewSchema（未破坏 execute 路径）`)

  // 文档型 review（无 base/head）不应通过 code-task 的 validateReviewSchema（证据形态不同，各走各的）
  assert(!validateReviewSchema(validReview({ task: 'task-01' })).ok,
    `文档型 review（无 base/head）不走 code-task schema（两套证据形态隔离）`)
}

// ── 清理 ──
for (const d of tmpRoots) { try { rmSync(d, { recursive: true, force: true }) } catch {} }

console.log(`\n${'='.repeat(50)}`)
console.log(`✅ 通过: ${total - failed}  ❌ 失败: ${failed}`)
console.log('='.repeat(50))
if (failed > 0) process.exit(1)
