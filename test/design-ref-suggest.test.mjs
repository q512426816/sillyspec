/**
 * 2026-10-07-flow-friction-batch3 — design 清单报错指路 + execute UI 证据前置 advisory 回归
 *
 * postmortem（provider-model-list）：design_file_ref_invalid 三轮返工（幻觉路径缺 backend/ 前缀、
 * 缺 NEW: 前缀）——报错只说「不存在」不指路；visual-evidence.md 到 verify 才发现该执行期落盘。
 * 锁死契约：
 *   S1 幻觉路径：根下存在 basename 相同既有文件 → 报错附「相近既有路径：…」（≤3 条）；
 *   S2 无相近：不附建议段（不加噪）；NEW: 前缀提示保留；
 *   U1 execute 前置 advisory：UI 触达 + 证据缺失 → 返回含 visual-evidence.md 的提示串；
 *   U2 证据在场或非 UI → null（零输出零行为）。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { validateDesignFileList } from '../src/design-facts.js'
import { uiEvidenceExecuteAdvisory } from '../src/ui-visual.js'

const roots = []
function mk(p) { const d = mkdtempSync(join(tmpdir(), p)); roots.push(d); return d }
test.after(() => { for (const d of roots) { try { rmSync(d, { recursive: true, force: true }) } catch {} } })

function designFixture(listedPath) {
  const root = mk('drs-')
  mkdirSync(join(root, 'backend', 'app', 'modules'), { recursive: true })
  writeFileSync(join(root, 'backend', 'app', 'modules', 'llm_provider.py'), 'x = 1\n')
  mkdirSync(join(root, 'src'), { recursive: true })
  writeFileSync(join(root, 'src', 'other.js'), 'x = 1\n')
  const changeDir = join(root, '.sillyspec', 'changes', 'c1')
  mkdirSync(changeDir, { recursive: true })
  writeFileSync(join(changeDir, 'design.md'), [
    '---', 'change: c1', '---', '# 设计', '',
    '## 文件变更清单', '', '| 操作 | 文件路径 | 说明 |', '|---|---|---|',
    `| 修改 | ${listedPath} | 改动 |`, '',
  ].join('\n'))
  return { root, changeDir }
}

test('S1 幻觉路径：报错附相近既有路径（basename did-you-mean）', () => {
  const { root, changeDir } = designFixture('app/modules/llm_provider.py')
  const r = validateDesignFileList({ changeDir, cwd: root })
  assert.ok(!r.ok, '幻觉路径应拦')
  const err = (r.errors || []).find(e => e && e.message && e.message.includes('design_file_ref_invalid'))
  assert.ok(err, 'design_file_ref_invalid 在场')
  assert.ok(err.message.includes('backend/app/modules/llm_provider.py'), `附相近路径：${err.message}`)
  assert.ok(err.message.includes('相近既有路径'), '建议段标记在场')
  assert.ok(err.message.includes('NEW:'), 'NEW: 前缀提示保留')
})

test('S2 无相近/NEW: 前缀：不加建议段不误报', () => {
  const noMatch = designFixture('src/does-not-exist-anywhere-xyz.js')
  const r1 = validateDesignFileList({ changeDir: noMatch.changeDir, cwd: noMatch.root })
  const err1 = (r1.errors || []).find(e => e && e.message && e.message.includes('design_file_ref_invalid'))
  assert.ok(err1, '不存在路径仍拦')
  assert.ok(!err1.message.includes('相近既有路径'), `无 basename 命中不加建议段：${err1.message}`)

  const isNew = designFixture('NEW:src/brand-new-file.js')
  const r2 = validateDesignFileList({ changeDir: isNew.changeDir, cwd: isNew.root })
  assert.ok(!(r2.errors || []).some(e => e && e.message && e.message.includes('design_file_ref_invalid')), 'NEW: 前缀不触发存在性报错')
})

function uiFixture({ uiListed, evidence }) {
  const root = mk('uie-')
  const changeDir = join(root, '.sillyspec', 'changes', 'c1')
  mkdirSync(changeDir, { recursive: true })
  // 路径按 design 模板约定写反引号（extractQuotedPaths 只认反引号/引号内路径——探针侧同源口径）
  writeFileSync(join(changeDir, 'design.md'), [
    '---', 'change: c1', '---', '# 设计', '',
    '## 文件变更清单', '', '| 操作 | 文件路径 | 说明 |', '|---|---|---|',
    `| 修改 | \`${uiListed}\` | 改动 |`, '',
  ].join('\n'))
  if (evidence) writeFileSync(join(changeDir, 'visual-evidence.md'), '# 证据\n截图对照……\n')
  return { root, changeDir }
}

test('U1 UI 触达 + 证据缺失 → 前置 advisory 含落盘路径与 verify 执法提示', () => {
  const { root, changeDir } = uiFixture({ uiListed: 'frontend/src/components/foo.tsx', evidence: false })
  const msg = uiEvidenceExecuteAdvisory({ changeDir, specBase: join(root, '.sillyspec') })
  assert.ok(msg, '返回提示串')
  assert.ok(msg.includes('visual-evidence.md'), '含证据文件名')
  assert.ok(msg.includes('verify'), '提示 verify 将执法')
})

test('U2 证据在场 / 非 UI → null 零打扰', () => {
  const withEvidence = uiFixture({ uiListed: 'frontend/src/components/foo.tsx', evidence: true })
  assert.equal(uiEvidenceExecuteAdvisory({ changeDir: withEvidence.changeDir, specBase: join(withEvidence.root, '.sillyspec') }), null, '证据在场 → null')
  const nonUi = uiFixture({ uiListed: 'backend/app/api.py', evidence: false })
  assert.equal(uiEvidenceExecuteAdvisory({ changeDir: nonUi.changeDir, specBase: join(nonUi.root, '.sillyspec') }), null, '非 UI → null')
})
