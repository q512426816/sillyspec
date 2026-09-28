/**
 * knowledge-inject-ranking.test.mjs — decisionHits 相关度排序＋死路注记识别
 * （2026-09-28-knowledge-inject-ranking）
 *
 * 覆盖验收面：
 *   ① 教训型死路条目（status=implemented＋理由含「死路：」）进防复潮优先组——不再被状态压制；
 *   ② 组内按 查询×(id+标题) bigram 重叠率降序——相关条目置顶、空标题无关条目沉底；
 *   ③ 精度不回归：无关查询不触发 decisionHits；
 *   ④ 真实库钉子：本仓 knowledge 下「枚举词表/开放世界」查询必须让 D-001@v1 枚举开放世界
 *      进 decisionHits 前 5（2026-09-28 实测它曾排 148/188 位——本测试防该回归）；
 *   ⑤ 真实库 digest 钉子：flowKnowledgeDigest 注入段渲染该条目与死路短句。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { matchKnowledge, deathPathNote } from '../src/knowledge-match.js'
import { flowKnowledgeDigest } from '../src/flow.js'

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const REAL_KB = join(REPO_ROOT, '.sillyspec', 'knowledge')

function rmQuiet(p) {
  try { rmSync(p, { recursive: true, force: true }) } catch { /* Windows EPERM 可接受 */ }
}

/** 造迷你知识库：枚举路由行 → decisions/unmapped.md（无关 rejected 空标题×2 + 教训型死路条目）。 */
function seedKb(root) {
  mkdirSync(join(root, 'decisions'), { recursive: true })
  writeFileSync(join(root, 'INDEX.md'), [
    '# 知识索引', '',
    '## Decisions',
    '- 枚举|词表|开放世界 → [决策](decisions/unmapped.md)', '',
  ].join('\n'))
  writeFileSync(join(root, 'decisions', 'unmapped.md'), [
    '# unmapped 域决策', '',
    '## D-009@v1',
    '状态： rejected',
    '否决理由：与需求直接冲突', '',
    '## D-010@v1',
    '状态： rejected',
    '否决理由：治标', '',
    '## D-001@v1 枚举开放世界是错误方向（任务面归还 agent）',
    '状态： implemented',
    '理由：决策记录：用枚举/关键词表穷举开放世界是错误方向。正确模式：开放世界的分类归 agent，机器只锚定可枚举的封闭面。死路：枚举更多桶/更多关键词——穷举错误不因规模变小而变对，弃。', '',
  ].join('\n'))
}

test('① 死路注记条目（implemented）进防复潮优先组，不受状态压制', () => {
  const kb = mkdtempSync(join(tmpdir(), 'ss-rank-1-'))
  seedKb(kb)
  const km = matchKnowledge(kb, '方案：用枚举词表扫描开放世界的模糊需求')
  const idx = km.decisionHits.findIndex((h) => h.title.includes('枚举开放世界'))
  assert.ok(idx >= 0, '死路条目在 decisionHits')
  assert.ok(km.decisionHits[idx].deathPath === true, 'deathPath 标记在场')
  assert.ok(idx < 5, `应进前 5（实际第 ${idx + 1} 位）`)
  rmQuiet(kb)
})

test('② 相关度排序：相关死路条目排无关 rejected 空标题条目之前', () => {
  const kb = mkdtempSync(join(tmpdir(), 'ss-rank-2-'))
  seedKb(kb)
  const km = matchKnowledge(kb, '方案：用枚举词表扫描开放世界的模糊需求')
  assert.ok(km.decisionHits.length >= 3, '三条件目全进')
  assert.match(km.decisionHits[0].title, /枚举开放世界/, '相关条目置顶（重叠率最高）')
  assert.equal(km.decisionHits[1].title, '', '空标题无关 rejected 沉底其后')
  rmQuiet(kb)
})

test('③ 精度不回归：无关查询不触发 decisionHits', () => {
  const kb = mkdtempSync(join(tmpdir(), 'ss-rank-3-'))
  seedKb(kb)
  const km = matchKnowledge(kb, '更新 README 安装命令为 pnpm 形态')
  assert.equal(km.decisionHits.length, 0, '路由行未命中 → 零 decisionHits')
  rmQuiet(kb)
})

test('④ 真实库钉子：枚举词表查询 → D-001@v1 枚举开放世界进前 5（防 148/188 位回归）', () => {
  const km = matchKnowledge(REAL_KB, '2026-09-28-inject-test\n方案：用枚举关键词表扫描开放世界的模糊需求')
  const idx = km.decisionHits.findIndex((h) => /枚举.*开放世界|开放世界.*枚举/.test(h.title || ''))
  assert.ok(idx >= 0, `真实库应含枚举开放世界条目（decisionHits 共 ${km.decisionHits.length} 条）`)
  assert.ok(idx < 5, `必须进前 5（实际第 ${idx + 1} 位）`)
  assert.ok(km.decisionHits[idx].status === 'rejected' || km.decisionHits[idx].deathPath === true,
    '以 rejected 或死路注记身份进防复潮面')
})

test('⑤ 真实库 digest 钉子：flowKnowledgeDigest 注入段渲染该条目与死路短句', async () => {
  const cd = mkdtempSync(join(tmpdir(), 'ss-rank-5-'))
  const r = await flowKnowledgeDigest({
    specBase: join(REPO_ROOT, '.sillyspec'),
    change: '2026-09-28-knowledge-inject-ranking',
    changeDir: cd,
    input: '方案探索：用枚举词表扫描开放世界形态的需求并自动分类',
  })
  const line = r.lines.find((l) => /枚举.*开放世界/.test(l))
  assert.ok(line, `注入段应含枚举开放世界条目（实际行：${r.lines.join(' | ').slice(0, 300)}）`)
  assert.match(line, /死路|否决理由/, '带死路短句或否决理由渲染')
  assert.ok(r.summary.rejectedDecisions >= 1, 'summary 计数含死路面')
  rmQuiet(cd)
})

test('⑥ deathPathNote：死路句提取与无标记回退', () => {
  assert.equal(deathPathNote('正确模式：机器只锚封闭面。死路：枚举更多桶——穷举错误不因规模变小而变对，弃。'),
    '枚举更多桶——穷举错误不因规模变小而变对')
  assert.equal(deathPathNote(''), '')
  assert.equal(deathPathNote('普通理由前六十字' + 'x'.repeat(80)).length, 60, '无标记截前 60 字')
})
