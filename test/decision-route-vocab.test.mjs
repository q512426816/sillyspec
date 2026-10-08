/**
 * decision-route-vocab.test.mjs — 检索词覆盖：查询侧词片回退＋蒸馏标题必填
 * （2026-09-29-decision-route-vocab）
 *
 * 覆盖验收面：
 *   ① 蒸馏标题必填：裸号条目（## D-xxx@v1 无标题）needsWait 拦下且不写盘；
 *   ② 查询侧词片回退：路由零命中时，查询词片在域文件条目文本（标题∪理由）出现次数落在
 *      「跨条目复现但非泛在」窗（[2, max(2, floor(5%·条目数))]）→ 文件级命中（entries 合成）＋
 *      条目级命中（score>0）；高频泛在词（方案/需求类）不触发；纯 ASCII 查询不回退；
 *      查询侧零写入（INDEX/域文件字节不变）；路由命中路径零变化；
 *   ③ 真实库钉子：「谓词守卫」「顿号拆分」从零命中变为命中 decisions/unmapped.md 且
 *      含该词的条目进 decisionHits；「枚举词表」路由命中不回归。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync, rmSync, readFileSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { matchKnowledge } from '../src/knowledge-match.js'
import { distillIntoKnowledge } from '../src/decision-distill.js'

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const REAL_KB = join(REPO_ROOT, '.sillyspec', 'knowledge')

function rmQuiet(p) {
  try { rmSync(p, { recursive: true, force: true }) } catch { /* Windows EPERM 可接受 */ }
}

function seedKb(root) {
  mkdirSync(join(root, 'decisions'), { recursive: true })
  writeFileSync(join(root, 'INDEX.md'), [
    '# Knowledge Index', '', '## Decisions',
    '- core|decision|决策|人工扩充词 → [decisions/core.md](decisions/core.md)', '',
  ].join('\n'))
  // 词片计数校准（小域窗口=恰好 2 次）：谓词 n=2（entry1 理由×1＋entry2 标题×1）✓、
  // 拆分 n=2（entry1 理由×2）✓、方案 n=3 超窗 ✗——正例与噪音例由计数分离
  writeFileSync(join(root, 'decisions', 'core.md'), [
    '# 决策知识 — core', '',
    '## D-001@v1 风险与死路（模板标题）',
    '状态：implemented',
    '理由：谓词词表漏词导致该拆的不拆——保守方向。放弃方案：取消斜杠拆分与复合拆分。', '',
    '## D-002@v1 谓词收窄范围',
    '状态：implemented',
    '理由：注入面收窄，方案设计的通用理由需求方案变更实施。', '',
  ].join('\n'))
}

test('② 查询侧词片回退：复现词命中文件＋条目；泛在词不触发；零写入；纯 ASCII 不回退', () => {
  const root = mkdtempSync(join(tmpdir(), 'ss-rv-'))
  seedKb(root)
  const idxBefore = readFileSync(join(root, 'INDEX.md'), 'utf8')
  const domBefore = readFileSync(join(root, 'decisions', 'core.md'), 'utf8')

  const km = matchKnowledge(root, '方案：维护一个谓词守卫')
  assert.equal(km.matched, true, '回退命中')
  assert.equal(km.json.fallback, true, 'fallback 标记')
  assert.ok(km.entries.some((e) => e.file === 'decisions/core.md'), '文件级命中')
  const hit = km.decisionHits.find((h) => (h.title || '').includes('谓词收窄') || /谓词/.test(h.reason || ''))
  assert.ok(hit && hit.score >= 1, `含谓词条目进 decisionHits（实际 top: ${km.decisionHits[0]?.title}）`)

  assert.equal(matchKnowledge(root, 'use enum keyword list').matched, false, '纯 ASCII 查询不回退')

  // 泛在词：只有 方案/需求（n≥4 超窗）的查询不触发
  const kmNoise = matchKnowledge(root, '方案设计需求变更实施清单')
  assert.notEqual(kmNoise.json && kmNoise.json.fallback, true, '泛在词查询不回退')

  assert.equal(readFileSync(join(root, 'INDEX.md'), 'utf8'), idxBefore, '查询零写入（INDEX 不变）')
  assert.equal(readFileSync(join(root, 'decisions', 'core.md'), 'utf8'), domBefore, '查询零写入（域文件不变）')

  // 路由命中路径零变化：tag 命中走路由不走回退
  const kmRoute = matchKnowledge(root, '这个决策怎么人工扩充词处理')
  assert.equal(kmRoute.json && kmRoute.json.fallback, undefined, '路由命中不带 fallback 标记')
  rmQuiet(root)
})

test('③ 真实库钉子：谓词守卫/顿号拆分 命中 unmapped 且条目可见；枚举不回归', () => {
  const kmP = matchKnowledge(REAL_KB, '方案：维护一个谓词守卫')
  assert.ok(kmP.matched, '谓词守卫 命中（回退前实测零命中）')
  assert.ok(kmP.entries.some((e) => String(e.file).includes('unmapped')), '文件级指向 unmapped')
  assert.ok(kmP.decisionHits.some((h) => /谓词/.test(`${h.title} ${h.reason || ''}`)), '含谓词条目进 decisionHits')

  // 2026-10-08-knowledge-inbox-triage 归档后 INDEX 新增关键词「拆分」（patterns.md 路由行）——
  // 含「拆分」的查询被路由层先截胡、不再落到词片回退。查询词面改用「误拆」（不含「拆分」子串），
  // 测试意图不变：回退层仍能带出误拆教训条目。
  const kmD = matchKnowledge(REAL_KB, '方案：关键词误拆的缝补策略')
  assert.ok(kmD.matched, '误拆缝补 命中')
  assert.ok(kmD.decisionHits.some((h) => /误拆/.test(`${h.title} ${h.reason || ''}`)), '含误拆条目进 decisionHits')

  const kmEnum = matchKnowledge(REAL_KB, '方案：用枚举词表扫描开放世界')
  assert.equal(kmEnum.json && kmEnum.json.fallback, undefined, '枚举词表仍走路由')
  assert.match(kmEnum.decisionHits[0].title || '', /枚举开放世界/, '既有命中不回归')
})

test('① 蒸馏标题必填：裸号条目 needsWait 拦下且不写盘', () => {
  const root = mkdtempSync(join(tmpdir(), 'ss-rv-title-'))
  const changeDir = join(root, 'changes', '2026-09-29-t')
  mkdirSync(changeDir, { recursive: true })
  writeFileSync(join(changeDir, 'decisions.md'), [
    '# 决策记录（Decisions）', '',
    '## D-001@v1',
    '- type: architecture',
    '- status: accepted',
    '- question: 裸号条目会不会入库？',
    '- answer: 会被标题必填拦下。', '',
  ].join('\n'))
  const r = distillIntoKnowledge(changeDir, join(root, 'knowledge'), 'abc123')
  assert.ok(r.needsWait && r.needsWait.includes('D-001@v1') && r.needsWait.includes('标题'), `needsWait 点名标题缺失（实际 ${r.needsWait}）`)
  assert.equal(r.written.length, 0, '不写盘')
  rmQuiet(root)
})
