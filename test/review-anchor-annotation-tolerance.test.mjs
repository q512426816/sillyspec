/**
 * review-anchor-annotation-tolerance.test.mjs — reviewedAgainst 注记容忍+归一化 与 dirty-gap 快速通道
 * （2026-10-20-closeout-roundtrip-slim）
 *
 * 自会话耗时画像实证：评审代理习惯在 sha 后附实测注记，整串 hex 校验两度拒收（各多一轮
 * 收口往返）；reviewAnchoredToHead 同病（注记判无锚证据）。锁：
 *   ① validateReviewJson 三形态注记容忍矩阵+内存归一化+纯垃圾仍拒（文案不变）；
 *   ② reviewAnchoredToHead 注记形态可锚定；
 *   ③ flow.js dirty-gap 阻断文案含快速通道指引。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync, rmSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { validateReviewJson, reviewAnchoredToHead } from '../src/flow-review.js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SHA = 'e5c97358455a9a91d268be95d4d7c48ef4c75e52'
const SHA2 = 'fe6d83216f78ad37779a86a2cf576ed3cda5a672'

function makeReview(fields, dir = mkdtempSync(join(tmpdir(), 'raat-'))) {
  const base = {
    schemaVersion: 1, change: 'c', reviewer: 'sub', verdict: 'PASS',
    reviewedAgainst: SHA, findings: [], reviewedAt: '2026-10-20T00:00:00Z',
    dimensionNotes: { 乱序: 'ok', 并发: 'ok', 切换: 'ok', 作用域: 'ok' },
    ...fields,
  }
  const p = join(dir, 'review.json')
  writeFileSync(p, JSON.stringify(base), 'utf8')
  return { p, dir }
}

test('① 字符串形态：纯 sha / sha+注记 均过且归一化；纯垃圾拒（文案不变）', () => {
  const a = makeReview({ reviewedAgainst: SHA })
  const va = validateReviewJson(a.p)
  assert.equal(va.ok, true)
  assert.equal(va.review.reviewedAgainst, SHA, '纯 sha 归一化保留')

  const b = makeReview({ reviewedAgainst: `${SHA}（git rev-parse HEAD 实测；区间 c7ae81ba..HEAD 零交集）` })
  const vb = validateReviewJson(b.p)
  assert.equal(vb.ok, true, 'sha+注记容忍')
  assert.equal(vb.review.reviewedAgainst, SHA, '归一化为纯 sha')

  const c = makeReview({ reviewedAgainst: '就是随便写的没有 sha' })
  const vc = validateReviewJson(c.p)
  assert.equal(vc.ok, false)
  assert.ok(vc.errors.some((e) => e.includes('reviewedAgainst 须为 7-40 位 hex sha（git rev-parse HEAD 输出，照抄任务书标注）')), '错误文案逐字保留')

  const d = makeReview({ reviewedAgainst: `${SHA.toUpperCase()} anchored` })
  const vd = validateReviewJson(d.p)
  assert.equal(vd.ok, true)
  assert.equal(vd.review.reviewedAgainst, SHA, '大写 hex 归一化为小写')
  for (const x of [a, b, c, d]) rmSync(x.dir, { recursive: true, force: true })
})

test('① 对象形态：workspace/repos 注记容忍+逐值归一化；workspace 垃圾拒', () => {
  const a = makeReview({ reviewedAgainst: { workspace: `${SHA}（主仓实测）`, repos: { urgent: `${SHA2} 注记`, spdemo: SHA } } })
  const va = validateReviewJson(a.p)
  assert.equal(va.ok, true)
  assert.equal(va.review.reviewedAgainst.workspace, SHA)
  assert.equal(va.review.reviewedAgainst.repos.urgent, SHA2)
  assert.equal(va.review.reviewedAgainst.repos.spdemo, SHA)

  // workspace 纯 sha（评审 P3-2 清偿：矩阵补格）
  const a2 = makeReview({ reviewedAgainst: { workspace: SHA } })
  const va2 = validateReviewJson(a2.p)
  assert.equal(va2.ok, true)
  assert.equal(va2.review.reviewedAgainst.workspace, SHA, 'workspace 纯 sha 通过')

  // repos 值无 hex → 拒收且文案点名仓键
  const b2 = makeReview({ reviewedAgainst: { workspace: SHA, repos: { urgent: '没有锚' } } })
  const vb2 = validateReviewJson(b2.p)
  assert.equal(vb2.ok, false)
  assert.ok(vb2.errors.some((e) => e.includes('reviewedAgainst.repos.urgent 须为 7-40 位 hex sha（该仓 git rev-parse HEAD）')), 'repos 值垃圾文案在场')

  const b = makeReview({ reviewedAgainst: { workspace: '没有锚', repos: { urgent: SHA } } })
  const vb = validateReviewJson(b.p)
  assert.equal(vb.ok, false)
  assert.ok(vb.errors.some((e) => e.includes('reviewedAgainst 对象形态须含 workspace: 7-40 位 hex sha（主仓评审对象锚）')))
  for (const x of [a, a2, b2, b]) rmSync(x.dir, { recursive: true, force: true })
})

test('① 上界：>40 位 hex 连串不误收（lookahead 截断后词元仍 ≤40 才有效）', () => {
  // 41 位 hex：整串是一个超长词元——提取器正则 {7,40} 贪婪到 40 位+lookahead 拒（后跟 hex）→ 回溯找短词元也不满足边界 → 应拒收
  const long41 = SHA + 'a' // 41 hex chars
  const a = makeReview({ reviewedAgainst: long41 })
  const va = validateReviewJson(a.p)
  // 41 连续 hex：任何 7-40 子段两侧都是 hex（边界断言不满足）→ 无有效词元 → 拒
  assert.equal(va.ok, false, '41 位连串 hex 不产出有效词元')
  rmSync(a.dir, { recursive: true, force: true })
})

test('② reviewAnchoredToHead：注记形态可锚定（不再判无锚证据）', () => {
  const a = makeReview({ reviewedAgainst: `${SHA}（git rev-parse HEAD 实测）` })
  assert.equal(reviewAnchoredToHead(a.p, SHA), true, '注记形态锚定成功')
  assert.equal(reviewAnchoredToHead(a.p, SHA.slice(0, 8)), true, '短 sha 前缀方向仍命中')
  assert.equal(reviewAnchoredToHead(a.p, SHA2), false, '不同 sha 不误锚')
  const b = makeReview({ reviewedAgainst: 'garbage' })
  assert.equal(reviewAnchoredToHead(b.p, SHA), false, '纯垃圾仍 fail-safe false')
  for (const x of [a, b]) rmSync(x.dir, { recursive: true, force: true })
})

test('③ 归一化不回写文件（校验器只读）', () => {
  const a = makeReview({ reviewedAgainst: `${SHA} 注记保留在原稿` })
  validateReviewJson(a.p)
  const raw = JSON.parse(readFileSync(a.p, 'utf8'))
  assert.ok(String(raw.reviewedAgainst).includes('注记保留在原稿'), '原稿注记未被改写')
  rmSync(a.dir, { recursive: true, force: true })
})

test('③ flow.js dirty-gap 阻断文案含快速通道指引（源锚）', () => {
  const src = readFileSync(join(ROOT, 'src', 'flow.js'), 'utf8')
  assert.ok(/快速通道：脏文件全属并行会话在途\/运行残渣且不在本变更交付面时，直接重跑带 --accept-dirty-gap/.test(src), '快速通道指引在场')
  assert.ok(/属本变更的文件必须走①提交/.test(src), '限定句在场（防逃避①）')
})
