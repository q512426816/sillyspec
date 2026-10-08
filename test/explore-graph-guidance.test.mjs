/**
 * explore-graph-guidance.test.mjs — 2026-10-08-explore-knowledge-graph 起
 * （2026-10-09-explore-arsenal-map 重组织为话题→兵器映射并扩两兵器）
 * explore prompt 兵器映射钉子：graph 四命令 + search/status 新兵器 + 防复潮提示 + 只读铁律零漂移。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { definition } from '../src/stages/explore.js'

const prompt = definition.steps[0].prompt

test('explore 话题→兵器映射：graph 四命令 + search/status 新兵器 + 防复潮提示在场', () => {
  assert.equal(definition.steps.length, 1, '仍为 1 步无结构阶段')
  for (const cmd of [
    'knowledge graph impact',
    'neighbors <锚点>', // 与 graph 前缀同行共享（映射形态，2026-10-09 重组织）
    'path <A> <B>',
    'summary', // 关系面行内的健康度命令
    'knowledge search --query', // 坑史检索兵器（新）
    'sillyspec status', // 在途面兵器（新）
    '话题→兵器映射', // 映射节标题
  ]) assert.ok(prompt.includes(cmd), `缺指引：${cmd}`)
  assert.ok(prompt.includes('rejected'), '防复潮提示在场（先查已否决条目）')
  assert.ok(prompt.includes('全只读'), '只读声明在场')
})

test('explore 只读铁律零漂移（兵器扩展不破界）', () => {
  for (const rule of ['不写实现代码', '不安装依赖', '不修改文件', '不强行推进到']) {
    assert.ok(prompt.includes(rule), `铁律缺：${rule}`)
  }
})
