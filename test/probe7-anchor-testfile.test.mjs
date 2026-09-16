/**
 * probe7 锚点口径对齐直测（2026-09-16-friction5-hardening FR-05 / D-005@v1）。
 *
 * covered 行锚点判定从只认 file:line 扩为 file:line 或 `.test.` 文件名（对齐
 * stage-contract 硬门三形态中的两形态）——行号随提交漂移场景 `.test.` 文件名锚过硬门
 * 仍被 advisory 提示回补是无效摩擦（用户 2026-09-16 驾驭小结⑤）。advisory 不阻断语义不变；
 * 裸反引号不收（保持 advisory 增量价值）。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { checkProbe7AnchorCoverage } from '../src/probe7-anchor-check.js'

function probe7Md(rows) {
  return [
    '## 探针结果',
    '',
    '#### 探针 7：验收×测试覆盖矩阵',
    '',
    '**task-01**',
    '',
    '| acceptance 条目 | 归属测试文件 | 关键词命中 | 判定 | 证据 |',
    '|---|---|---|---|---|',
    ...rows,
    '',
  ].join('\n')
}

test('covered 证据为 .test. 文件名（无行号）不再计 missingAnchors', () => {
  const md = probe7Md(['| 登录限流 | `test/auth.test.mjs` | 限流（2 命中） | covered | `test/auth.test.mjs`（行号随提交漂移，以文件名锚） |'])
  const r = checkProbe7AnchorCoverage(md)
  assert.equal(r.applicable, true)
  assert.equal(r.coveredRows, 1)
  assert.equal(r.missingAnchors.length, 0, '`.test.` 文件名锚过硬门口径，advisory 不再提示回补')
})

test('file:line 锚维持收认（原判定零变化）', () => {
  const md = probe7Md(['| 登录限流 | `test/auth.test.mjs` | 限流（2 命中） | covered | `src/x.js:42` |'])
  const r = checkProbe7AnchorCoverage(md)
  assert.equal(r.missingAnchors.length, 0)
})

test('covered 证据无任何锚（纯中文描述/裸反引号无 .test. 无行号）仍计 missingAnchors', () => {
  const md = probe7Md([
    '| 图形验证 | `test/captcha.test.mjs` | 验证码（1 命中） | covered | 已人工核验，测试在场 |',
    '| 裸反引号 | `src/plain.js` | x（1 命中） | covered | `src/plain.js` |',
  ])
  const r = checkProbe7AnchorCoverage(md)
  assert.equal(r.coveredRows, 2)
  assert.equal(r.missingAnchors.length, 2, '纯文字与裸反引号（非 .test. 无行号）都不算锚——保持 advisory 增量价值')
  assert.ok(r.missingAnchors[0].evidence.includes('人工核验'))
})

test('uncovered/partial 行证据无锚零影响（只查 covered）', () => {
  const md = probe7Md([
    '| 半语义 | `test/sem.test.mjs` | 探测（0 命中） | partial | （无机械命中——人工核验） |',
    '| 未覆盖 | — | — | uncovered | 未实现 |',
    '| 文档类 | — | — | non-testable | 文档类 |',
  ])
  const r = checkProbe7AnchorCoverage(md)
  assert.equal(r.rowsChecked, 3)
  assert.equal(r.coveredRows, 0)
  assert.equal(r.missingAnchors.length, 0)
})
