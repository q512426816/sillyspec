import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import {
  registerStageReview,
  computeDocHash,
  getLatestStageReviewRunId,
  validateStageReview,
} from '../src/stage-review.js'
import { resolveRuntimeRoot } from '../src/run/shared.js'

// fixture：建临时 specBase + changes/<change>/<mainDoc>，返回各路径
function makeFixture(stage, changeName = 'test-change', docContent = '# design\n\n测试内容\n') {
  const specBase = mkdtempSync(join(tmpdir(), 'rsr-test-'))
  const platformOpts = { specRoot: specBase }
  const runtimeRoot = resolveRuntimeRoot(platformOpts, specBase)
  const changeDir = join(specBase, 'changes', changeName)
  mkdirSync(changeDir, { recursive: true })
  const mainDoc = stage === 'plan' ? 'plan.md' : 'design.md'
  const mainDocPath = join(changeDir, mainDoc)
  writeFileSync(mainDocPath, docContent)
  return { specBase, platformOpts, runtimeRoot, changeDir, mainDoc, mainDocPath, changeName }
}

function cleanup(specBase) {
  try { rmSync(specBase, { recursive: true, force: true }) } catch {}
}

test('1. 骨架模式字段全 + schema 合法', () => {
  const f = makeFixture('brainstorm')
  try {
    const result = registerStageReview({ changeName: f.changeName, stage: 'brainstorm', cwd: f.specBase, platformOpts: f.platformOpts })
    assert.equal(result.mode, 'skeleton')
    assert.equal(result.mainDoc, 'design.md')
    assert.match(result.reviewRunId, /^review-/)
    assert.ok(existsSync(result.reviewPath), 'review.json 应落盘')
    const review = JSON.parse(readFileSync(result.reviewPath, 'utf8'))
    assert.equal(review.schemaVersion, 1)
    assert.equal(review.reviewType, 'design')
    assert.equal(review.specVerdict, 'cannot_verify')
    assert.equal(review.qualityVerdict, 'cannot_verify')
    assert.deepEqual(review.reviewedFiles, ['changes/test-change/design.md'])
    assert.ok(Array.isArray(review.requiredEvidence) && review.requiredEvidence.length > 0)
    assert.ok(review.docHash, 'docHash 非空')
    assert.match(review.reviewerNotes, /骨架由 register-stage-review 生成/)
  } finally { cleanup(f.specBase) }
})

test('2. docHash 由 CLI computeDocHash 算（等于主文档 sha256 hex）', () => {
  const f = makeFixture('brainstorm')
  try {
    const result = registerStageReview({ changeName: f.changeName, stage: 'brainstorm', cwd: f.specBase, platformOpts: f.platformOpts })
    const review = JSON.parse(readFileSync(result.reviewPath, 'utf8'))
    const expected = computeDocHash(f.mainDocPath)
    assert.equal(review.docHash, expected, 'docHash 应等于 computeDocHash(主文档)')
    assert.equal(review.docHash.length, 64, 'sha256 hex 64 字符')
  } finally { cleanup(f.specBase) }
})

test('3. marker 写盘 + getLatestStageReviewRunId 读到同值', () => {
  const f = makeFixture('brainstorm')
  try {
    const result = registerStageReview({ changeName: f.changeName, stage: 'brainstorm', cwd: f.specBase, platformOpts: f.platformOpts })
    assert.ok(existsSync(result.markerPath), 'marker 应落盘')
    const markerContent = readFileSync(result.markerPath, 'utf8').trim()
    assert.equal(markerContent, result.reviewRunId, 'marker 内容 = reviewRunId')
    assert.match(markerContent, /^review-/, 'marker 内容 review- 前缀')
    const got = getLatestStageReviewRunId(f.runtimeRoot, 'brainstorm', f.changeName)
    assert.equal(got, result.reviewRunId, 'getLatestStageReviewRunId 读到同值')
  } finally { cleanup(f.specBase) }
})

test('4. 自检：validateStageReview 对产出 review.json 返回 ok', () => {
  const f = makeFixture('brainstorm')
  try {
    const result = registerStageReview({ changeName: f.changeName, stage: 'brainstorm', cwd: f.specBase, platformOpts: f.platformOpts })
    const check = validateStageReview({
      stage: 'brainstorm',
      reviewType: 'design',
      runtimeRoot: f.runtimeRoot,
      reviewRunId: result.reviewRunId,
      searchDirs: [f.specBase, f.changeDir, f.specBase],
    })
    assert.equal(check.ok, true, `validateStageReview 应 ok（cannot_verify 是 warning 非 error）: ${check.errors.join('; ')}`)
  } finally { cleanup(f.specBase) }
})

test('5. --from adopt：保留 verdict/checklist + 重算 docHash + 规范化 reviewedFiles', () => {
  const f = makeFixture('brainstorm')
  try {
    // agent 草稿：verdict pass + checklist + 故意错的 docHash
    const draftPath = join(f.specBase, 'agent-draft.json')
    const realHash = computeDocHash(f.mainDocPath)
    const draft = {
      schemaVersion: 1,
      reviewType: 'design',
      specVerdict: 'pass',
      qualityVerdict: 'pass',
      reviewedFiles: ['WRONG/relative/design.md'],
      docHash: '0'.repeat(64),
      checklist: [{ item: '背景与目标', result: 'pass', note: '齐' }],
      reviewerNotes: 'agent 审过',
    }
    writeFileSync(draftPath, JSON.stringify(draft))
    const result = registerStageReview({ changeName: f.changeName, stage: 'brainstorm', fromFile: draftPath, cwd: f.specBase, platformOpts: f.platformOpts })
    assert.equal(result.mode, 'adopted')
    const review = JSON.parse(readFileSync(result.reviewPath, 'utf8'))
    assert.equal(review.specVerdict, 'pass', '保留 agent verdict')
    assert.equal(review.qualityVerdict, 'pass')
    assert.equal(review.reviewerNotes, 'agent 审过', '保留 reviewerNotes')
    assert.deepEqual(review.checklist, draft.checklist, '保留 checklist')
    assert.equal(review.docHash, realHash, 'docHash 被重算为真实值')
    assert.deepEqual(review.reviewedFiles, ['changes/test-change/design.md'], 'reviewedFiles[0] 规范化')
  } finally { cleanup(f.specBase) }
})

test('6. --from schema 不过 → throw 中文', () => {
  const f = makeFixture('brainstorm')
  try {
    const draftPath = join(f.specBase, 'bad-draft.json')
    writeFileSync(draftPath, JSON.stringify({ reviewType: 'design', specVerdict: 'pass', qualityVerdict: 'pass', reviewedFiles: ['x'], docHash: 'y' })) // 缺 schemaVersion
    assert.throws(
      () => registerStageReview({ changeName: f.changeName, stage: 'brainstorm', fromFile: draftPath, cwd: f.specBase, platformOpts: f.platformOpts }),
      /schema 校验失败/,
    )
  } finally { cleanup(f.specBase) }
})

test('7. 非法 stage → throw 中文', () => {
  const f = makeFixture('brainstorm')
  try {
    assert.throws(
      () => registerStageReview({ changeName: f.changeName, stage: 'foobar', cwd: f.specBase, platformOpts: f.platformOpts }),
      /stage 无效/,
    )
  } finally { cleanup(f.specBase) }
})

test('8. 空 changeName → throw 中文', () => {
  const f = makeFixture('brainstorm')
  try {
    assert.throws(
      () => registerStageReview({ changeName: '', stage: 'brainstorm', cwd: f.specBase, platformOpts: f.platformOpts }),
      /changeName 不能为空/,
    )
  } finally { cleanup(f.specBase) }
})

test('9. 主文档缺失 → throw 中文', () => {
  const specBase = mkdtempSync(join(tmpdir(), 'rsr-nodoc-'))
  try {
    const changeDir = join(specBase, 'changes', 'test-change')
    mkdirSync(changeDir, { recursive: true }) // change 目录在但无 design.md
    assert.throws(
      () => registerStageReview({ changeName: 'test-change', stage: 'brainstorm', cwd: specBase, platformOpts: { specRoot: specBase } }),
      /主审查文档不存在/,
    )
  } finally { cleanup(specBase) }
})

test('10. marker 已存在 → warn + 覆盖为最新', () => {
  const f = makeFixture('brainstorm')
  try {
    // 预置旧 marker
    mkdirSync(f.runtimeRoot, { recursive: true })
    const markerPath = join(f.runtimeRoot, 'current-stage-review-run-id-brainstorm-' + f.changeName)
    writeFileSync(markerPath, 'review-1999-01-01-000000\n')
    const result = registerStageReview({ changeName: f.changeName, stage: 'brainstorm', cwd: f.specBase, platformOpts: f.platformOpts })
    const after = readFileSync(markerPath, 'utf8').trim()
    assert.equal(after, result.reviewRunId, 'marker 被覆盖为最新 reviewRunId')
    assert.notEqual(after, 'review-1999-01-01-000000', '旧值已被覆盖')
  } finally { cleanup(f.specBase) }
})

test('11. plan / execute 映射（reviewType + 主文档）', () => {
  // plan → reviewType=plan / plan.md
  const fp = makeFixture('plan', 'c-plan', '# plan\n\np\n')
  try {
    const rp = registerStageReview({ changeName: 'c-plan', stage: 'plan', cwd: fp.specBase, platformOpts: fp.platformOpts })
    const rj = JSON.parse(readFileSync(rp.reviewPath, 'utf8'))
    assert.equal(rj.reviewType, 'plan')
    assert.deepEqual(rj.reviewedFiles, ['changes/c-plan/plan.md'])
  } finally { cleanup(fp.specBase) }
  // execute → reviewType=acceptance / design.md
  const fe = makeFixture('execute', 'c-exec', '# design\n\ne\n')
  try {
    const re = registerStageReview({ changeName: 'c-exec', stage: 'execute', cwd: fe.specBase, platformOpts: fe.platformOpts })
    const rj = JSON.parse(readFileSync(re.reviewPath, 'utf8'))
    assert.equal(rj.reviewType, 'acceptance')
    assert.deepEqual(rj.reviewedFiles, ['changes/c-exec/design.md'])
  } finally { cleanup(fe.specBase) }
})
