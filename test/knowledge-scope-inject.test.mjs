/**
 * knowledge-scope-inject.test.mjs — 知识注入作用域（2026-10-23-knowledge-scope-inject）
 *
 * ① collectScopedKnowledge：always/repo/module 标记解析、无标记不产出、INDEX.md 排除、
 *    坏目录 fail-soft、摘要取首行有效正文（FR-01）
 * ② flowKnowledgeDigest 集成：内置中立性行恒注入；always/repo 条目恒注入；有标记条目的
 *    文本形态（📌 [scope] file#heading：摘要）（FR-02/FR-03）
 * ③ 缺省锚：无 scoped 条目的仓仅多内置行，FR/关键词/否决段结构不变（FR-02 零回归）
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { collectScopedKnowledge } from '../src/knowledge-scope.js'
import { flowKnowledgeDigest } from '../src/flow.js'

function mkKnowledge(files) {
  const d = mkdtempSync(join(tmpdir(), 'ksc-'))
  const specBase = join(d, '.sillyspec')
  const kr = join(specBase, 'knowledge')
  mkdirSync(kr, { recursive: true })
  for (const [name, text] of Object.entries(files)) writeFileSync(join(kr, name), text)
  return { d, specBase, changeDir: join(specBase, 'changes', '2026-01-01-x') }
}

test('① collectScopedKnowledge 解析三态', () => {
  const { d, specBase } = mkKnowledge({
    'conventions.md': [
      '# 约定',
      '',
      '## 工具中立性',
      '<!-- scope: always -->',
      '不锁死语言与框架，用 CLI 自有分类。',
      '',
      '## 本仓发布纪律',
      '<!-- scope: repo -->',
      '发布前跑锚套件。',
      '',
      '## 模块路由规则',
      '<!-- scope: module:cli-entry,core-engine -->',
      '模块域 id 与 FR 域同源。',
      '',
      '## 普通条目',
      '这条没有作用域标记。',
    ].join('\n'),
    'INDEX.md': '## 工具中立性\n<!-- scope: always -->\n不应被采集\n',
  })
  try {
    const s = collectScopedKnowledge(join(specBase, 'knowledge'))
    assert.equal(s.always.length, 1, 'always 一条（INDEX 排除）')
    assert.equal(s.always[0].id, 'conventions.md#工具中立性')
    assert.match(s.always[0].summary, /不锁死语言与框架/, '摘要取首行有效正文')
    assert.equal(s.repo.length, 1, 'repo 一条')
    assert.equal(s.repo[0].id, 'conventions.md#本仓发布纪律')
    assert.deepEqual(Object.keys(s.modules).sort(), ['cli-entry', 'core-engine'], 'module 两域各自入桶')
    assert.equal(s.modules['cli-entry'][0].id, 'conventions.md#模块路由规则')
    const uniqueIds = new Set([...s.always, ...s.repo, ...Object.values(s.modules).flat()].map((e) => e.id))
    assert.equal(uniqueIds.size, 3, '无标记 section 不产出（双域条目去重后 3 个唯一 section）')
    // 坏目录 fail-soft
    assert.deepEqual(collectScopedKnowledge(join(specBase, 'missing-dir')), { always: [], repo: [], modules: {} })
  } finally { rmSync(d, { recursive: true, force: true, maxRetries: 3 }) }
})

test('② flowKnowledgeDigest 集成：内置行恒注入＋scoped 条目在场', async () => {
  const { d, specBase, changeDir } = mkKnowledge({
    'rules.md': '## 中立性\n<!-- scope: always -->\n批类别是 CLI 自有分类。\n\n## 仓级\n<!-- scope: repo -->\n发布前锚套件。\n',
  })
  try {
    const r = await flowKnowledgeDigest({ specBase, change: '2026-01-01-x', changeDir, input: '标题素材面\n成功标准：\n- 行为 X' })
    const text = r.lines.join('\n')
    assert.match(text, /🧭 工具中立性（内置规约 00，每变更恒注入）/, '内置中立性行恒注入')
    assert.match(text, /📌 \[always\] rules\.md#中立性：批类别是 CLI 自有分类/, 'always 条目注入形态')
    assert.match(text, /📌 \[repo\] rules\.md#仓级：发布前锚套件/, 'repo 条目注入形态')
    assert.match(text, /🧠 知识注入/, '既有段头保留')
  } finally { rmSync(d, { recursive: true, force: true, maxRetries: 3 }) }
})

test('③ 缺省锚：无 scoped 条目时仅多内置行、既有段结构不变', async () => {
  const { d, specBase, changeDir } = mkKnowledge({
    'plain.md': '## 普通条目\n没有标记的内容。\n',
  })
  try {
    const r = await flowKnowledgeDigest({ specBase, change: '2026-01-01-x', changeDir, input: '标题素材面\n成功标准：\n- 行为 X' })
    const text = r.lines.join('\n')
    assert.match(text, /🧭 工具中立性（内置规约 00/, '内置行在场（有意新增）')
    assert.doesNotMatch(text, /📌 \[/, '无 scoped 条目零条目输出')
    assert.match(text, /语料未命中知识库/, '既有空态折叠行结构不变')
  } finally { rmSync(d, { recursive: true, force: true, maxRetries: 3 }) }
})
