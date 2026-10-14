/**
 * decision-change-qualifier.test.mjs — 决策展示行变更名限定词（2026-10-14-supersedes-mislink-and-change-display）
 *
 * 覆盖：decisionChangeQualifier 在场/缺失/空白三态（FR-02）；{DECISION_HITS} 渲染接线钉（prompt.js
 * 源码锚——该渲染点无轻量调用面；另三处展示面集成断言分列 decision-touch / thin-fr-inject-parity /
 * design-knowledge-check 测试文件，四处共用本函数单一实现）。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { decisionChangeQualifier } from '../src/knowledge-match.js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

test('decisionChangeQualifier：change 在场渲染「变更 <名>」', () => {
  assert.equal(decisionChangeQualifier('2026-01-05-keep'), '变更 2026-01-05-keep')
})

test('decisionChangeQualifier：缺失/空/空白渲染「变更未记录」（不编造不省略）', () => {
  assert.equal(decisionChangeQualifier(''), '变更未记录')
  assert.equal(decisionChangeQualifier(null), '变更未记录')
  assert.equal(decisionChangeQualifier(undefined), '变更未记录')
  assert.equal(decisionChangeQualifier('   '), '变更未记录')
})

test('接线钉：{DECISION_HITS} 渲染使用 decisionChangeQualifier', () => {
  const src = readFileSync(join(ROOT, 'src', 'run', 'prompt.js'), 'utf8')
  assert.ok(src.includes('decisionChangeQualifier(h.change)'), 'prompt.js {DECISION_HITS} 行渲染限定词')
})
