/**
 * flow-review-pack.test.mjs — 轻量评审任务书预消化材料包（2026-10-19-thin-review-material-pack）
 *
 * 覆盖验收面（FR-01~FR-04）：
 *   ① 解析基座：FR 标题/测试绑定行解析、冻结 patch 文件级摘要（±行数/hunk 数/rename/二进制容错）；
 *   ② 组装三态：两源齐备/部分可得/全缺 null + 体积帽截断注记 + 确定性（同输入同输出）；
 *   ③ 注入/零注入：packLines 注入形态与位置、缺省/空数组时渲染与现状逐字一致。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  parseFrBindingRows, parseFrozenPatchSummary,
} from '../src/flow-review-pack.js'

const REQ_TEXT = [
  '# 需求规格（Requirements）— c-x',
  '',
  '## 功能需求',
  '',
  '### FR-01: 任务书注入',
  '',
  '- 行为句必须注入。',
  '',
  '#### 场景：主路径',
  '',
  '### FR-02: 体积帽',
  '',
  '- 行为句必须截断。',
  '',
  '## 测试绑定（每条 FR 至少一行）',
  '',
  'FR-01: test/flow-review-pack.test.mjs「注入形态」',
  'FR-02: test/flow-review-pack.test.mjs「帽截断」',
  '',
].join('\n')

const PATCH_TEXT = [
  'diff --git a/src/one.js b/src/one.js',
  'index 111..222 100644',
  '--- a/src/one.js',
  '+++ b/src/one.js',
  '@@ -1,4 +1,5 @@',
  ' ctx',
  '-old1',
  '-old2',
  '+new1',
  '+new2',
  '+new3',
  ' ctx',
  '@@ -10,3 +11,3 @@',
  ' ctx',
  '-old3',
  '+new4',
  ' ctx',
  'diff --git a/renamed/old.md b/renamed/new.md',
  'similarity index 90%',
  'rename from renamed/old.md',
  'rename to renamed/new.md',
  '--- a/renamed/old.md',
  '+++ b/renamed/new.md',
  '@@ -2,2 +2,2 @@',
  ' ctx',
  '-x',
  '+y',
  'diff --git a/bin/logo.png b/bin/logo.png',
  'index 333..444 100644',
  'Binary files a/bin/logo.png and b/bin/logo.png differ',
  '',
].join('\n')

test('① 解析基座：FR 标题/绑定行解析（requirements.md 机械解析）', () => {
  const rows = parseFrBindingRows(REQ_TEXT)
  assert.equal(rows.length, 2)
  assert.equal(rows[0].fr, 'FR-01')
  assert.equal(rows[0].title, '任务书注入')
  assert.equal(rows[0].binding, 'test/flow-review-pack.test.mjs「注入形态」')
  assert.equal(rows[1].fr, 'FR-02')
  assert.equal(rows[1].title, '体积帽')
  assert.equal(rows[1].binding, 'test/flow-review-pack.test.mjs「帽截断」')
  // 空文本 → 空数组
  assert.deepEqual(parseFrBindingRows(''), [])
  assert.deepEqual(parseFrBindingRows(null), [])
  // 无绑定节 → FR 行在场、绑定空串
  const noBind = parseFrBindingRows('# r\n\n### FR-01: t\n')
  assert.equal(noBind.length, 1)
  assert.equal(noBind[0].binding, '')
})

test('① 解析基座：冻结 patch 文件级摘要（±行数/hunk 数/rename/二进制容错）', () => {
  const files = parseFrozenPatchSummary(PATCH_TEXT)
  assert.equal(files.length, 3)
  assert.deepEqual(files[0], { path: 'src/one.js', plus: 4, minus: 3, hunks: 2 })
  assert.equal(files[1].path, 'renamed/new.md')
  assert.deepEqual([files[1].plus, files[1].minus, files[1].hunks], [1, 1, 1])
  assert.deepEqual(files[2], { path: 'bin/logo.png', plus: 0, minus: 0, hunks: 0 })
  // 空文本 → 空数组
  assert.deepEqual(parseFrozenPatchSummary(''), [])
  assert.deepEqual(parseFrozenPatchSummary(null), [])
  // 垃圾前缀容错：无 diff --git 头的杂行不产文件、不抛错
  assert.deepEqual(parseFrozenPatchSummary('random text\n+plus line\n'), [])
})
