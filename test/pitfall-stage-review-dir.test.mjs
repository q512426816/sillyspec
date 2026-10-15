/**
 * 2026-10-15-pitfall-batch-clearance FR-06 — stage-review 目录读侧归一（错位目录容错）
 *
 * 坑 stage-review-dir-naming-mismatch（消费仓 brainstorm/plan 两阶段连环实证）：skill 文档
 * 字面口径诱导 review.json 落进裸 runId 目录（marker 值当目录名）或双前缀目录，gate 与
 * --refresh-hash 按规范目录找 → 恒「无对应 run」，只能人工搬 JSON。
 * 锁死契约：resolveStageReviewDir 按 规范 → 双前缀 → 裸 runId 探测命中；validateStageReview
 * 对错位文件正常校验；--refresh-hash 对错位文件可用（不报「无对应 run」）。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import {
  resolveStageReviewDir, validateStageReview, registerStageReview,
  stageReviewMarkerPath, computeDocHash,
} from '../src/stage-review.js'

const tmpRoots = []
function mk(p) { const d = mkdtempSync(join(tmpdir(), p)); tmpRoots.push(d); return d }
test.after(() => { for (const d of tmpRoots) { try { rmSync(d, { recursive: true, force: true }) } catch {} } })

const RUN_ID = 'review-2026-10-15-000708'

function fixture(bareDir, { mainDoc = 'design.md', reviewType = 'design', stage = 'brainstorm' } = {}) {
  const proj = mk('srd-')
  const specBase = join(proj, '.sillyspec')
  const runtimeRoot = join(specBase, '.runtime')
  const changeName = 'srd-x'
  const changeDir = join(specBase, 'changes', changeName)
  mkdirSync(changeDir, { recursive: true })
  writeFileSync(join(changeDir, mainDoc), '# 设计\n\n## 目标\n\n内容\n')
  const dir = bareDir === 'bare' ? RUN_ID
    : bareDir === 'double' ? `${stage}-review-${RUN_ID}`
    : `${stage}-${RUN_ID}`
  const reviewDir = join(runtimeRoot, 'stage-reviews', dir)
  mkdirSync(reviewDir, { recursive: true })
  writeFileSync(join(reviewDir, 'review.json'), JSON.stringify({
    schemaVersion: 1, reviewType,
    specVerdict: 'pass', qualityVerdict: 'pass',
    reviewedFiles: [`changes/${changeName}/${mainDoc}`],
    docHash: computeDocHash(join(changeDir, mainDoc)),
    requiredEvidence: [],
    reviewer: { channel: 'main-agent-self-review' },
    reviewerNotes: 'fixture',
  }, null, 2))
  mkdirSync(runtimeRoot, { recursive: true })
  writeFileSync(stageReviewMarkerPath(runtimeRoot, stage, changeName), RUN_ID + '\n')
  return { proj, specBase, runtimeRoot, changeName, changeDir, reviewDir, stage, reviewType, mainDoc }
}

test('FR-06：裸 runId / 双前缀错位目录均被 resolveStageReviewDir 容错命中', () => {
  const f1 = fixture('bare')
  assert.equal(resolveStageReviewDir(f1.runtimeRoot, 'brainstorm', RUN_ID), join(f1.runtimeRoot, 'stage-reviews', RUN_ID), '裸 runId 目录命中')
  const f2 = fixture('double')
  assert.equal(resolveStageReviewDir(f2.runtimeRoot, 'brainstorm', RUN_ID), join(f2.runtimeRoot, 'stage-reviews', `brainstorm-review-${RUN_ID}`), '双前缀目录命中')
  const f3 = fixture('canonical')
  assert.equal(resolveStageReviewDir(f3.runtimeRoot, 'brainstorm', RUN_ID), join(f3.runtimeRoot, 'stage-reviews', `brainstorm-${RUN_ID}`), '规范目录命中')
})

test('FR-06：validateStageReview 对错位（裸 runId）文件正常校验通过', () => {
  const f = fixture('bare')
  const r = validateStageReview({
    stage: 'brainstorm', reviewType: 'design', runtimeRoot: f.runtimeRoot,
    reviewRunId: RUN_ID, searchDirs: [f.specBase, f.changeDir],
  })
  assert.equal(r.ok, true, `错位目录文件按正常流程校验（errors=${JSON.stringify(r.errors)}）`)
  assert.equal(r.review && r.review.specVerdict, 'pass', 'review 内容可读')
})

test('FR-06：--refresh-hash 对错位（裸 runId）文件可用（不再报「无对应 run」）', () => {
  const f = fixture('bare')
  // 主文档改版（docHash 漂移）→ refresh 场景
  writeFileSync(join(f.changeDir, 'design.md'), '# 设计\n\n## 目标\n\n内容 v2\n')
  const out = registerStageReview({ changeName: f.changeName, stage: 'brainstorm', cwd: f.proj, platformOpts: { specRoot: f.specBase }, refreshHash: true })
  assert.equal(out.ok, true, `refresh 成功（out=${JSON.stringify(out)}）`)
  assert.equal(out.mode, 'refreshed', '就地刷新（非 noop）')
  const refreshed = JSON.parse(readFileSync(out.reviewPath, 'utf8'))
  assert.equal(refreshed.docHash, computeDocHash(join(f.changeDir, 'design.md')), 'hash 已按新版重算')
  assert.equal(refreshed.specVerdict, 'pass', 'verdict 保留')
})
