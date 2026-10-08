/**
 * explore-graph-guidance.test.mjs — 2026-10-08-explore-knowledge-graph（评审 P2 清偿）
 * explore prompt 图查询指引钉子：四命令在场 + 防复潮提示 + 只读铁律零漂移。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { definition } from '../src/stages/explore.js'

const prompt = definition.steps[0].prompt

test('explore 图查询指引：impact/neighbors/path/summary 四命令 + 防复潮提示在场', () => {
  assert.equal(definition.steps.length, 1, '仍为 1 步无结构阶段')
  for (const cmd of [
    'knowledge graph impact',
    'knowledge graph neighbors',
    'path <A> <B>', // 与 neighbors 同行共享 knowledge graph 前缀
    'knowledge graph summary',
  ]) assert.ok(prompt.includes(cmd), `缺指引：${cmd}`)
  assert.ok(prompt.includes('rejected'), '防复潮提示在场（先查已否决条目）')
  assert.ok(prompt.includes('全只读'), '只读声明在场')
})

test('explore 只读铁律零漂移（图查询接入不破界）', () => {
  for (const rule of ['不写实现代码', '不安装依赖', '不修改文件', '不强行推进到']) {
    assert.ok(prompt.includes(rule), `铁律缺：${rule}`)
  }
})
