/**
 * flow-parity.test.mjs — 轻量变更资产对齐三件（2026-09-25-thin-parity-assets）
 *
 * 覆盖验收面：
 *   ① reconcileModuleDocs：命中点名/文档已同步 vs 未更新强提示/无图零输出；
 *   ② renderVerifyReceipt：回执六要素（结论/基线区间/实测面/评审/绑定/冻结 sha）；
 *   ③ harvestSlot4Decision：实质作答收割/不适用跳过/已有 decisions 不覆盖。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { reconcileModuleDocs, renderVerifyReceipt, harvestSlot4Decision } from '../src/flow-parity.js'

function makeSpecBase() {
  const specBase = mkdtempSync(join(tmpdir(), 'fp-parity-'))
  const modDir = join(specBase, 'docs', 'proj-x', 'modules')
  mkdirSync(modDir, { recursive: true })
  writeFileSync(join(modDir, '_module-map.yaml'), [
    'cli-entry:', '    status: active', '    doc: modules/cli-entry.md', '    paths:', '      - src/flow.js', '',
    'progress:', '    status: active', '    doc: modules/progress.md', '    paths:', '      - src/progress.js', '',
  ].join('\n'))
  writeFileSync(join(modDir, 'cli-entry.md'), '# cli-entry\n')
  return specBase
}

test('① 模块文档对账：命中/文档未更新强提示/已同步/无图零输出', () => {
  const specBase = makeSpecBase()
  // 命中 cli-entry 且文档未动 → 强提示
  let r = reconcileModuleDocs({ specBase, ownFiles: ['src/flow.js', 'README.md'], committedRaw: ['src/flow.js'] })
  assert.equal(r.hits, 1)
  assert.ok(r.lines.some((l) => /⚠️ cli-entry.*未随变更更新/.test(l)), JSON.stringify(r.lines))
  // 文档随变更更新 → ✓ 行
  r = reconcileModuleDocs({ specBase, ownFiles: ['src/flow.js'], committedRaw: ['src/flow.js', 'docs/proj-x/modules/cli-entry.md'] })
  assert.equal(r.hits, 1)
  assert.ok(r.lines.some((l) => /✓ cli-entry.*已同步/.test(l)))
  // 前缀命中（目录 paths）
  r = reconcileModuleDocs({ specBase, ownFiles: ['src/progress.js/sub.py'], committedRaw: [] })
  assert.equal(r.hits, 1)
  // 交付面不命中 → 零输出
  r = reconcileModuleDocs({ specBase, ownFiles: ['other/x.js'], committedRaw: [] })
  assert.equal(r.hits, 0)
  assert.deepEqual(r.lines, [])
  // 无模块图 → 零输出
  const bare = mkdtempSync(join(tmpdir(), 'fp-bare-'))
  r = reconcileModuleDocs({ specBase: bare, ownFiles: ['src/a.js'], committedRaw: [] })
  assert.equal(r.hits, 0)
  rmSync(specBase, { recursive: true, force: true })
  rmSync(bare, { recursive: true, force: true })
})

test('② verify-result 回执：六要素合成', () => {
  const text = renderVerifyReceipt({
    change: 'c1', baseline: '0123456789abcdef', head: 'fedcba9876543210',
    gateSummary: 'test: passed ← pytest（1.0s）｜lint: passed｜门文件 3 个',
    review: { required: true, verdict: 'PASS', findingsP1: 0 },
    traceCount: 2, patchMeta: { patchSha256: 'a'.repeat(64) }, generatedAt: '2026-09-25T00:00:00Z',
  })
  assert.match(text, /结论\*\*：PASS/)
  assert.match(text, /0123456789\.\.fedcba9876/)
  assert.match(text, /test: passed/)
  assert.match(text, /独立评审\*\*：PASS/)
  assert.match(text, /2 行/)
  assert.match(text, /sha256 aaaaaaaaaaaa/)
  assert.match(text, /机器合成，勿手改/)
})

test('③ 槽4收割：实质作答→decisions.md；不适用跳过；已有不覆盖', () => {
  const root = mkdtempSync(join(tmpdir(), 'fp-hv-'))
  const changeDir = join(root, 'c1')
  mkdirSync(changeDir, { recursive: true })
  const design = [
    '# d', '<!--AGENT:槽4 风险与死路作答 -->', '风险：X；死路：试过 A 方案因 B 放弃', '',
  ].join('\n')
  writeFileSync(join(changeDir, 'design.md'), design)
  let h = harvestSlot4Decision({ changeDir, change: 'c1' })
  assert.equal(h.harvested, true)
  const decText = readFileSync(join(changeDir, 'decisions.md'), 'utf8')
  assert.match(decText, /D-001@v1: 风险与死路（design 槽4 收割）/)
  assert.match(decText, /死路：试过 A 方案/)
  // 已有不覆盖
  h = harvestSlot4Decision({ changeDir, change: 'c1' })
  assert.equal(h.harvested, false)
  assert.match(h.reason, /已在场/)
  // 不适用跳过
  const d2 = mkdtempSync(join(tmpdir(), 'fp-hv2-'))
  const cd2 = join(d2, 'c2')
  mkdirSync(cd2, { recursive: true })
  writeFileSync(join(cd2, 'design.md'), '# d\n<!--AGENT:槽4 x -->\n不适用：无\n')
  h = harvestSlot4Decision({ changeDir: cd2, change: 'c2' })
  assert.equal(h.harvested, false)
  rmSync(root, { recursive: true, force: true })
  rmSync(d2, { recursive: true, force: true })
})
