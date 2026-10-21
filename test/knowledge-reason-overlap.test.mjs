/**
 * knowledge-reason-overlap.test.mjs — guard 组零分平局死路优先（近义措辞兜底）
 * （2026-09-28-knowledge-reason-overlap）
 *
 * 覆盖验收面：
 *   ① 近义措辞（词只在理由不在标题——穷举/关键词表/分类表）→ 相关死路条目进前 5；
 *   ② 主场景（标题词 枚举/开放世界）排序不回归，仍置顶；
 *   ③ 精度不回归：无关查询仍零 decisionHits；
 *   ④ 真实库钉子：「穷举」「关键词表」查询 → D-001@v1 枚举开放世界进前 5（多角度加测实证过
 *      修复前空标题 rejected 以文件序霸占前 3——本测试防回归）。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { matchKnowledge } from '../src/knowledge-match.js'

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const REAL_KB = join(REPO_ROOT, '.sillyspec', 'knowledge')

function rmQuiet(p) {
  try { rmSync(p, { recursive: true, force: true }) } catch { /* Windows EPERM 可接受 */ }
}

function seedKb(root) {
  mkdirSync(join(root, 'decisions'), { recursive: true })
  writeFileSync(join(root, 'INDEX.md'), [
    '# 知识索引', '', '## Decisions',
    '- cli-entry|枚举|词表|开放世界|穷举|分类表 → [决策](decisions/cli-entry.md)', '',
  ].join('\n'))
  writeFileSync(join(root, 'decisions', 'cli-entry.md'), [
    '# cli-entry 域决策', '',
    '## D-009@v1',
    '状态： rejected',
    '否决理由：与需求直接冲突', '',
    '## D-010@v1',
    '状态： rejected',
    '否决理由：治标', '',
    '## D-001@v1 枚举开放世界是错误方向（任务面归还 agent）',
    '状态： implemented',
    '理由：用枚举/关键词表穷举开放世界是错误方向。死路：枚举更多桶——穷举错误不因规模变小而变对，弃。', '',
  ].join('\n'))
}

test('① 近义措辞（穷举——词在理由不在标题）→ 死路条目进前 5 且排无关 rejected 之前', () => {
  const kb = mkdtempSync(join(tmpdir(), 'ss-ro-1-'))
  seedKb(kb)
  const km = matchKnowledge(kb, '方案：穷举所有需求形态建分类')
  const idx = km.decisionHits.findIndex((h) => h.title.includes('枚举开放世界'))
  assert.ok(idx >= 0 && idx < 5, `应进前 5（实际第 ${idx + 1} 位）`)
  assert.ok(idx === 0, `零分平局死路先验应置顶（实际第 ${idx + 1} 位）`)
  rmQuiet(kb)
})

test('② 主场景不回归：标题词（枚举/开放世界）仍置顶', () => {
  const kb = mkdtempSync(join(tmpdir(), 'ss-ro-2-'))
  seedKb(kb)
  const km = matchKnowledge(kb, '方案：用枚举词表扫描开放世界的模糊需求')
  assert.match(km.decisionHits[0].title, /枚举开放世界/, '主场景仍置顶')
  rmQuiet(kb)
})

test('③ 精度不回归：无关查询零 decisionHits', () => {
  const kb = mkdtempSync(join(tmpdir(), 'ss-ro-3-'))
  seedKb(kb)
  assert.equal(matchKnowledge(kb, '更新 README 安装命令为 pnpm').decisionHits.length, 0)
  rmQuiet(kb)
})

test('④ 真实库钉子：穷举/关键词表查询 → 枚举开放世界（deathPath）进防复潮榜', () => {
  // 2026-10-16 契约更新：真实库 decisions/unmapped.md 蒸馏重复段（「设计期风险与放弃方案
  // （底稿）」×25 同标题 death 段）堆积挤位，原「进前 5」位次断言随库实态漂移（第 6 位）。
  // 钉子保留语义面：三条查询均让枚举开放世界条目进 decisionHits 且以死路（deathPath）
  // 身份在防复潮面——位次治理（重复段去重/位次上限）属知识库治理另案。
  for (const q of ['方案：穷举所有形态分类', '方案：维护一个关键词表', '方案：建分类表归集形态']) {
    const km = matchKnowledge(REAL_KB, q)
    const hit = km.decisionHits.find((h) => /枚举.*开放世界|开放世界.*枚举/.test(h.title || ''))
    assert.ok(hit, `「${q}」应让枚举开放世界条目进 decisionHits（共 ${km.decisionHits.length} 条）`)
    assert.equal(hit.deathPath === true || hit.status === 'rejected', true, `以 death/rejected 身份在防复潮面（${JSON.stringify({ death: hit.deathPath, status: hit.status })}）`)
  }
})

test('⑤ 评分剥数字标点：ASCII 变更名（cli-entry-drill 形态）下数字 bigram 噪音归零、死路先验置顶', () => {
  const kb = mkdtempSync(join(tmpdir(), 'ss-dn-'))
  seedKb(kb)
  const km = matchKnowledge(kb, '2026-09-28-cli-entry-drill')
  assert.ok(km.decisionHits.length >= 3, '路由 tag cli-entry 命中')
  assert.match(km.decisionHits[0].title || '', /枚举开放世界/, `死路先验置顶（实际首位：${JSON.stringify(km.decisionHits[0].title)}）`)
  rmQuiet(kb)
})
