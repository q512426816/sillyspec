/**
 * probe7 锚点口径对齐直测（2026-09-16-friction5-hardening FR-05 / D-005@v1）。
 *
 * covered 行锚点判定从只认 file:line 扩为 file:line 或 `.test.` 文件名（对齐
 * stage-contract 硬门三形态中的两形态）——行号随提交漂移场景 `.test.` 文件名锚过硬门
 * 仍被 advisory 提示回补是无效摩擦（用户 2026-09-16 驾驭小结⑤）。advisory 不阻断语义不变。
 *
 * 口径再对齐（2026-09-17-feedback-hardening FR-02 / D-005@v2，supersedes D-005@v1 的
 * 「裸反引号不收」）：反引号包裹的路径/测试名与硬门 matrixEvidenceHasAnchor 同权收认
 * ——硬门已保证锚点存在，advisory 多要行号在行号漂移场景零正确性收益纯摩擦
 * （用户 2026-09-17 驾驭小结②）。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { checkProbe7AnchorCoverage } from '../src/probe7-anchor-check.js'
import { runVerifyProbes, renderVerifyProbesReport } from '../src/verify-probes.js'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

const tmpRoots = []
test.after(() => { for (const d of tmpRoots) { try { rmSync(d, { recursive: true, force: true }) } catch {} } })

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

test('covered 证据为反引号包裹的路径（无行号无 .test.）不再计 missingAnchors（D-005@v2 反转）', () => {
  const md = probe7Md([
    '| 裸反引号 | `src/plain.js` | x（1 命中） | covered | `src/plain.js` |',
  ])
  const r = checkProbe7AnchorCoverage(md)
  assert.equal(r.applicable, true)
  assert.equal(r.coveredRows, 1)
  assert.equal(r.missingAnchors.length, 0, '反引号路径锚与硬门三形态同权、行号可省——D-005@v2 supersedes D-005@v1 裸反引号不收')
})

test('covered 证据为裸文本无任何三形态（人工核验通过）仍计 missingAnchors', () => {
  const md = probe7Md([
    '| 图形验证 | `test/captcha.test.mjs` | 验证码（1 命中） | covered | 已人工核验，测试在场 |',
    '| 人工复核 | `src/manual-check.js` | 复核（1 命中） | covered | 人工核验通过 |',
  ])
  const r = checkProbe7AnchorCoverage(md)
  assert.equal(r.coveredRows, 2)
  assert.equal(r.missingAnchors.length, 2, '无 file:line 无 .test. 无反引号——advisory 增量保护面不丢')
  assert.ok(r.missingAnchors[0].evidence.includes('人工核验'))
  assert.ok(r.missingAnchors[1].evidence.includes('人工核验通过'))
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

// ── FR-09 多根（2026-09-17-pass-cap-semantics task-07 / task-05 实现）：buildAcceptanceHints
// 双根扩多根——并入 local.yaml repos 注册的跨仓仓根后，跨仓仓根下的测试文件内容可读、
// 命中不再恒空（矩阵不因跨仓恒预填 partial）。
test('FR-09 多根：测试文件位于跨仓仓根 → 内容可读命中非空，矩阵预填 covered（不恒 partial）', () => {
  const proj = mkdtempSync(join(tmpdir(), 'p7-crossroot-'))
  tmpRoots.push(proj)
  const crossRoot = mkdtempSync(join(tmpdir(), 'p7-crossrepo-'))
  tmpRoots.push(crossRoot)
  const specBase = join(proj, '.sillyspec')
  const changeDir = join(specBase, 'changes', 'cxr')
  mkdirSync(join(changeDir, 'tasks'), { recursive: true })
  writeFileSync(join(changeDir, 'design.md'), '## 文件变更清单\n\n| 操作 | 文件 | 说明 |\n|---|---|---|\n| 修改 | a.js | x |\n')
  writeFileSync(join(changeDir, 'tasks', 'task-01.md'), [
    '---', 'id: task-01', 'allowed_paths: [test/crossroot-attrib.test.mjs]',
    'acceptance:', '  - kwCrossRoot7 场景由跨仓测试承接', '---', '# t1', '',
  ].join('\n'))
  // 测试文件内容只存在于跨仓仓根（主仓 cwd/wtRoot 双根均读不到——FR-09 修复前的恒空形态）
  mkdirSync(join(crossRoot, 'test'), { recursive: true })
  writeFileSync(join(crossRoot, 'test', 'crossroot-attrib.test.mjs'), '// kwCrossRoot7 case\nexport {}\n')

  // 对照态：未注册跨仓（单仓双根）→ 读不到内容 → 零命中 → partial 预填
  const before = runVerifyProbes({ cwd: proj, changeName: 'cxr' })
  const t1b = before.probe7.tasks.find(t => t.task === 'task-01')
  assert.ok(t1b && (!t1b.hints || !t1b.hints[0]),
    `未注册跨仓根 → 关键词命中恒空（实际 hints=${JSON.stringify(t1b && t1b.hints)}）`)
  assert.ok(renderVerifyProbesReport(before).includes('| partial |'), '对照态：矩阵预填 partial（跨仓内容不可读）')

  // 注册跨仓根（local.yaml repos，相对路径按 cwd resolve）→ 多根读取 → 命中 + covered 预填
  mkdirSync(specBase, { recursive: true })
  writeFileSync(join(specBase, 'local.yaml'), `repos:\n  crossrepo: ${crossRoot.split('\\').join('/')}\n`)
  const after = runVerifyProbes({ cwd: proj, changeName: 'cxr' })
  const t1a = after.probe7.tasks.find(t => t.task === 'task-01')
  assert.ok(t1a && t1a.hints && t1a.hints[0] && t1a.hints[0].terms.includes('kwCrossRoot7'),
    `注册跨仓根后命中非空（实际 hints=${JSON.stringify(t1a && t1a.hints)}）`)
  const report = renderVerifyProbesReport(after)
  assert.ok(report.includes('| covered |') && !report.includes('| partial |'),
    '多根读取后矩阵预填 covered（不再因跨仓恒预填 partial）')
})
