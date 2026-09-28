/**
 * knowledge-gate-denoise.test.mjs — 门回显去重降噪：零分不弹＋已回应不重弹
 * （2026-09-28-knowledge-gate-denoise）
 *
 * 覆盖验收面：
 *   ① decisionHits 条目带 score（加法字段）；真实库枚举查询下 D-001@v1 置顶且可弹，
 *      空标题零分 rejected（D-009/010/011）不再满足回显资格；
 *   ② flowKnowledgeDigest 注入段同口径过滤——D-001 在场、空标题噪音三件套消失；
 *   ③ 门已回应静默：decisions.md 正文含「命中 id＋域文件名」共现 → 该命中不再回显；
 *      未回应时照常回显。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync, rmSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ProgressManager } from '../src/progress.js'
import { completeStep } from '../src/run/complete.js'
import { makeRepo, seedStage, runCapturing, cleanup } from './_complete-step-harness.mjs'
import { matchKnowledge } from '../src/knowledge-match.js'
import { flowKnowledgeDigest } from '../src/flow.js'

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const REAL_KB = join(REPO_ROOT, '.sillyspec', 'knowledge')
const CN = '2026-09-01-kgd'

function rmQuiet(p) {
  try { rmSync(p, { recursive: true, force: true }) } catch { /* Windows EPERM 可接受 */ }
}

/** 造知识库：枚举路由行 → rejected 具名条目 + rejected 空标题条目。 */
function seedKnowledge(specBase) {
  const k = join(specBase, 'knowledge')
  mkdirSync(join(k, 'decisions'), { recursive: true })
  writeFileSync(join(k, 'INDEX.md'), [
    '# 知识索引', '',
    '## Decisions',
    '- unmapped|枚举|词表 → [决策](decisions/unmapped.md)', '',
  ].join('\n'))
  writeFileSync(join(k, 'decisions', 'unmapped.md'), [
    '# unmapped 域决策', '',
    '## D-001@v1 枚举开放世界是错误方向',
    '状态： rejected',
    '否决理由：不要用枚举定义这个开放世界——机器只锚封闭面', '',
    '## D-009@v1',
    '状态： rejected',
    '否决理由：与需求直接冲突', '',
  ].join('\n'))
}

async function seedPlanStep(cwd, specBase) {
  const pm = new ProgressManager({ specDir: specBase })
  await pm.init(cwd)
  await pm.initChange(cwd, CN)
  const all = ['进度确认', '加载项目上下文', '对话式探索与需求澄清', '提出 2-3 种方案', '分段展示设计', '写设计文档并自审', 'Design Grill 交叉审查', '生成规范文件']
  const progress = await seedStage(pm, cwd, CN, 'brainstorm',
    all.map((name, i) => i < 3
      ? { name, status: 'completed', completedAt: '2026/09/28 10:00:00' }
      : { name, status: 'pending' }))
  return { pm, progress }
}

test('① 真实库：score 字段在场；D-001 置顶可弹，空标题零分 rejected 无回显资格', () => {
  const km = matchKnowledge(REAL_KB, '方案：用枚举词表扫描开放世界的模糊需求')
  assert.ok(typeof km.decisionHits[0].score === 'number', 'score 字段在场（加法）')
  assert.match(km.decisionHits[0].title, /枚举开放世界/, 'D-001 置顶')
  const echoable = (h) => h.deathPath || (h.status === 'rejected' && h.score > 0)
  const noise = km.decisionHits.filter((h) => h.id === 'D-009@v1' || h.id === 'D-010@v1' || h.id === 'D-011@v1')
  assert.ok(noise.length > 0, '空标题噪音条目仍在 API 列表（过滤在消费方）')
  for (const h of noise) assert.ok(!echoable(h), `${h.id} 零分非死路 → 无回显资格`)
})

test('② 真实库 digest：D-001 在场、空标题噪音三件套消失', async () => {
  const cd = mkdtempSync(join(tmpdir(), 'ss-kgd-'))
  const r = await flowKnowledgeDigest({
    specBase: join(REPO_ROOT, '.sillyspec'),
    change: '2026-09-28-kgd', changeDir: cd,
    input: '方案探索：用枚举词表扫描开放世界形态的需求并自动分类',
  })
  const text = r.lines.join('\n')
  assert.match(text, /D-001@v1 枚举开放世界/, 'D-001 死路注记注入')
  assert.ok(!/D-009@v1/.test(text) && !/D-010@v1/.test(text) && !/D-011@v1/.test(text),
    `空标题噪音三件套不应注入（实际：${r.lines.filter(l => /D-0\d+@v1/.test(l)).join(' | ')}）`)
  rmQuiet(cd)
})

test('③ 门已回应静默：decisions 正文含 id＋域共现 → 不再回显；未回应照常回显', async () => {
  // 未回应：D-001 照常弹
  {
    const { cwd, specBase } = makeRepo('kgd-echo-')
    seedKnowledge(specBase)
    const { pm, progress } = await seedPlanStep(cwd, specBase)
    writeFileSync(join(specBase, 'changes', CN, 'decisions.md'), [
      '# 决策记录（Decisions）', '',
      '## D-001@v1: 方案引入枚举词表机制',
      '- question: 需求形态要不要用词表枚举判定？', '',
    ].join('\n'))
    const r = await runCapturing(() =>
      completeStep(pm, progress, 'brainstorm', cwd, '方案：用枚举词表分类', null, {
        changeName: CN, doneAnswer: '代答', printNext: false,
      }))
    assert.match(r.stdout, /D-001@v1 枚举开放世界是错误方向/, '未回应 → 照常回显')
    rmQuiet(cwd)
  }
  // 已回应：正文含 unmapped.md D-001@v1 共现 → 静默
  {
    const { cwd, specBase } = makeRepo('kgd-mute-')
    seedKnowledge(specBase)
    const { pm, progress } = await seedPlanStep(cwd, specBase)
    writeFileSync(join(specBase, 'changes', CN, 'decisions.md'), [
      '# 决策记录（Decisions）', '',
      '## D-001@v1: 方案引入枚举词表机制',
      '- question: 需求形态要不要用词表枚举判定？',
      '- answer: knowledge-gate 回应——unmapped.md D-001@v1 已甄别：本方案为零枚举面，不复潮。', '',
    ].join('\n'))
    const r = await runCapturing(() =>
      completeStep(pm, progress, 'brainstorm', cwd, '方案：用枚举词表分类', null, {
        changeName: CN, doneAnswer: '代答', printNext: false,
      }))
    assert.ok(!r.stdout.includes('D-001@v1 枚举开放世界'), `已回应 → 静默（实际：${r.stdout.slice(-300)}）`)
    rmQuiet(cwd)
  }
})

process.on('exit', cleanup)
