/**
 * split-changelog 两形态增强防回归（2026-09-07）：
 * ①带后缀节标题（「## 变更索引（表格，初始为空）」——core-engine 形态，旧正则 \s*$ 漏迁）
 * ②MANUAL_NOTES 区（stages/runtime 形态——END 标记前尾部块；全或无防误迁散文）
 * 幂等：迁出后重跑零迁出。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'os'
import { splitChangelog } from '../src/modules.js'

test('带后缀标题迁移 + 尾节保留 + 幂等', () => {
  const root = mkdtempSync(join(tmpdir(), 'scf1-'))
  try {
    const mods = join(root, '.sillyspec', 'docs', 'p1', 'modules')
    mkdirSync(mods, { recursive: true })
    writeFileSync(join(mods, 'a.md'), '# A\n\n正文段。\n\n## 变更索引（表格，初始为空）\n| 日期 | 变更名 | 摘要 |\n|------|--------|------|\n| 2026-09-01 | c1 | desc one |\n\n## 尾节\n\n尾。\n')
    const r = splitChangelog(root, { force: true })
    assert.equal(r.files.length, 1, '带后缀标题被识别')
    const a = readFileSync(join(mods, 'a.md'), 'utf8')
    assert.ok(a.includes('见 `a.changelog.md`') && !a.includes('| 2026-09-01 |'), '卡内留指针、表格迁出')
    assert.ok(a.includes('## 尾节') && a.includes('正文段。'), '其余节逐字保留')
    assert.ok(readFileSync(join(mods, 'a.changelog.md'), 'utf8').includes('| 2026-09-01 | c1 | desc one |'), 'sidecar 含表格体')
    assert.equal(splitChangelog(root, { force: true }).files.length, 0, '幂等重跑零迁出')
  } finally { rmSync(root, { recursive: true, force: true }) }
})

test('MANUAL_NOTES 区迁移 + 散文混入防误迁 + END 标记保留', () => {
  const root = mkdtempSync(join(tmpdir(), 'scf2-'))
  try {
    const mods = join(root, '.sillyspec', 'docs', 'p1', 'modules')
    mkdirSync(mods, { recursive: true })
    writeFileSync(join(mods, 'b.md'), '# B\n\n正文。\n\n<!-- MANUAL_NOTES 区 -->\n- c3 | 摘要三\n- c4 | 摘要四\n<!-- MANUAL_NOTES_END -->\n')
    writeFileSync(join(mods, 'c.md'), '# C\n\n这是散文段落不是变更行。\n- c5 | 摘要五\n<!-- MANUAL_NOTES_END -->\n')
    const r = splitChangelog(root, { force: true })
    assert.equal(r.files.length, 1, '仅纯变更行块（b）被识别；散文混入（c）全或无跳过')
    assert.ok(r.files[0].card.endsWith('b.md'), '命中的是 b')
    const b = readFileSync(join(mods, 'b.md'), 'utf8'), c = readFileSync(join(mods, 'c.md'), 'utf8')
    assert.ok(b.includes('已迁出至 b.changelog.md') && !b.includes('- c3 |') && b.includes('<!-- MANUAL_NOTES_END -->') && b.includes('正文。'), 'b 迁出+指针注释+END 与正文保留')
    assert.ok(readFileSync(join(mods, 'b.changelog.md'), 'utf8').includes('- c4 | 摘要四'), 'b sidecar 内容')
    assert.ok(!c.includes('已迁出至') && c.includes('- c5 |') && c.includes('这是散文段落'), 'c 原样未动')
  } finally { rmSync(root, { recursive: true, force: true }) }
})
