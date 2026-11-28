/**
 * change-list-heading-level.test.mjs — 2026-11-28-design-file-list-h1-heading 回归
 *
 * 覆盖：
 *   ① 一级标题「# 文件变更清单」与二级同样解析（此前只认 2～3 级，整节静默为空）；
 *   ② 四级标题同样识别（层级不再影响识别）；
 *   ③ 三级标题 + `### 新增文件` 分类子段不被误断（零回归）；
 *   ④ 一级标题后遇 `##` 标题截断，后续节表格不被误收；
 *   ⑤ detectFileListSectionIssue：节在但表格非法返回诊断，无节/正常返回 null；
 *   ⑥ verify-drafts（v2 轨）对坏清单节给出 violation，无清单节零影响。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { parseFileChangeList, detectFileListSectionIssue } from '../src/change-list.js'
import { verifyFlowDrafts, DESIGN_QUESTIONS, draftLedgerPath } from '../src/flow-draft.js'

const TABLE = '| 操作 | 文件 | 说明 |\n| --- | --- | --- |\n| 修改 | src/a.js | x |\n| 新增 | src/b.js | y |\n'

const roots = []
function tmpDesign(body) {
  const root = mkdtempSync(join(tmpdir(), 'clh-'))
  roots.push(root)
  const cd = join(root, '.sillyspec', 'changes', 'c1')
  mkdirSync(cd, { recursive: true })
  const p = join(cd, 'design.md')
  writeFileSync(p, body)
  return { root, cd, p }
}
test.after(() => { for (const r of roots) { try { rmSync(r, { recursive: true, force: true }) } catch { /* ignore */ } } })

test('一级标题解析', () => {
  const { p } = tmpDesign(`# 设计\n\n# 文件变更清单\n\n${TABLE}`)
  assert.deepEqual([...parseFileChangeList(p)].sort(), ['src/a.js', 'src/b.js'])
})

test('四级标题解析', () => {
  const { p } = tmpDesign(`# 设计\n\n## 实现\n\n#### 文件变更清单\n\n${TABLE}`)
  assert.deepEqual([...parseFileChangeList(p)].sort(), ['src/a.js', 'src/b.js'])
})

test('三级标题与分类子段共存（零回归）', () => {
  const body = [
    '### 文件变更清单', '',
    '### 新增文件', '', '- src/new.js', '',
    '### 修改文件', '', '- src/mod.js', '',
  ].join('\n')
  const { p } = tmpDesign(body)
  assert.deepEqual([...parseFileChangeList(p)].sort(), ['src/mod.js', 'src/new.js'])
})

test('一级标题后遇 ## 截断，不误收后续节表格', () => {
  const body = [
    '# 文件变更清单', '', TABLE,
    '## 接口契约', '',
    '| 操作 | 文件 | 说明 |', '| --- | --- | --- |', '| 修改 | src/other.js | z |', '',
  ].join('\n')
  const { p } = tmpDesign(body)
  const got = [...parseFileChangeList(p)].sort()
  assert.deepEqual(got, ['src/a.js', 'src/b.js'])
  assert.ok(!got.includes('src/other.js'), '后续节表格未被误收')
})

test('detectFileListSectionIssue：节在但表格非法 → 诊断', () => {
  const { p } = tmpDesign('# 文件变更清单\n\n| 文件 |\n| --- |\n| src/a.js |\n')
  const issue = detectFileListSectionIssue(p)
  assert.ok(issue, '应返回诊断')
  assert.equal(issue.headingLevel, 1)
})

test('detectFileListSectionIssue：无清单节 / 正常清单 → null', () => {
  const noSection = tmpDesign('# 设计\n\n正文\n')
  assert.equal(detectFileListSectionIssue(noSection.p), null)
  const ok = tmpDesign(`## 文件变更清单\n\n${TABLE}`)
  assert.equal(detectFileListSectionIssue(ok.p), null)
})

// ── verify-drafts 集成（v2 轨）────────────────────────────────────────────────

function mkLedgerFixture(extraDesign = '') {
  const root = mkdtempSync(join(tmpdir(), 'clv-'))
  roots.push(root)
  const cd = join(root, '.sillyspec', 'changes', 'c1')
  const rt = join(root, '.sillyspec', '.runtime')
  mkdirSync(cd, { recursive: true })
  mkdirSync(join(rt, 'state'), { recursive: true })
  const secs = DESIGN_QUESTIONS.sections
  const design = [
    '---', 'author: flow-machine-draft', '---',
    '# 设计记录（Design Record）— c1', '',
    ...secs.flatMap((sec) => [`## ${sec.heading}`, '', ...sec.lines, '', '答：x', '']),
    extraDesign,
  ].join('\n')
  writeFileSync(join(cd, 'design.md'), design)
  writeFileSync(join(cd, 'proposal.md'), '# P\n')
  writeFileSync(join(cd, 'requirements.md'), '# R\n')
  writeFileSync(join(cd, 'tasks.md'), '# T\n- [ ] task-01: x\n')
  writeFileSync(draftLedgerPath(rt, 'c1'), JSON.stringify({
    schemaVersion: 2, change: 'c1', generatedAt: new Date().toISOString(),
    anchor: { criteria: ['c'], designQuestions: DESIGN_QUESTIONS },
    files: {}, amendments: [],
  }))
  return { cd, rt }
}

test('verify-drafts 兜底：节在但表格非法 → violation', () => {
  const { cd, rt } = mkLedgerFixture('# 文件变更清单\n\n| 文件 |\n| --- |\n| src/a.js |\n')
  const r = verifyFlowDrafts({ changeDir: cd, change: 'c1', runtimeRoot: rt, repair: false })
  assert.ok(
    r.violations.some((v) => v.includes('文件变更清单节未解析出有效路径')),
    `应有清单节格式 violation（实际 ${JSON.stringify(r.violations)}）`,
  )
})

test('verify-drafts 兜底：未写清单节 → 无清单相关 violation', () => {
  const { cd, rt } = mkLedgerFixture('')
  const r = verifyFlowDrafts({ changeDir: cd, change: 'c1', runtimeRoot: rt, repair: false })
  assert.ok(!r.violations.some((v) => v.includes('文件变更清单节未解析出有效路径')), '无节不报')
})
