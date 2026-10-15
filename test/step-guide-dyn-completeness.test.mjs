/**
 * step-guide-dyn-completeness.test.mjs — 复入附录漏收面根治（2026-10-16-step-guide-dyn-completeness）
 *
 * 背景（消费仓 2026-10-15 实证）：复入短输出的「动态注入段」附录只收集走
 * substitute()/substituteSplitJoin() 的值；评审六值等 9 站点曾用裸 split/join——
 * 值不进附录、guide 掩码后无回读通道，主代理被迫读引擎源码逆推档位/手建材料包。
 *
 * 本文件钉死修复后的契约：
 *   D1 首见渲染：评审六值全部替换为真值（无裸占位符残留）
 *   D2 复入短输出的动态附录必须包含 tier 行原文 + review run id 值 + JSON 契约值（修复前必红）
 *   D3 guide 静态文件：三个补登 token 已被掩码（不再残留裸占位符）
 *   D4 stage-review 路径警告双向覆盖（漏前缀/多前缀）+ 直接复制指引
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { outputStep } from '../src/run/prompt.js'

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const roots = []
function mk(p) { const d = mkdtempSync(join(tmpdir(), p)); roots.push(d); return d }
test.after(() => { for (const d of roots) { try { rmSync(d, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }) } catch {} } })

const NL = String.fromCharCode(10)
// 评审六值全量在模板：tier/菜单、reason、run-id、JSON 契约、前序事实、材料包
const STEP = {
  name: 'Grill',
  prompt: '交叉审查步骤。' + NL +
    'tier: {REVIEW_TIER}（{REVIEW_TIER_REASON}）' + NL +
    '材料包：' + NL + '{REVIEW_MATERIALS}' + NL +
    '契约：' + NL + '{REVIEW_JSON_CONTRACT}' + NL +
    'runid: {STAGE_REVIEW_RUN_ID}' + NL +
    '前序：' + NL + '{PRIOR_REVIEW_FACTS}' + NL +
    '静态尾句。',
}
const run = (cwd) => outputStep('brainstorm', 0, [STEP], cwd, null, null, {}, null, null, null)

async function capture(fn) {
  const lines = []
  const orig = console.log
  console.log = (...a) => lines.push(a.map(String).join(' '))
  try { await fn() } finally { console.log = orig }
  return lines
}

function withGuideEnv(val, fn) {
  const prev = process.env.SILLYSPEC_STEP_GUIDE
  if (val === undefined) delete process.env.SILLYSPEC_STEP_GUIDE
  else process.env.SILLYSPEC_STEP_GUIDE = val
  return fn().finally(() => {
    if (prev === undefined) delete process.env.SILLYSPEC_STEP_GUIDE
    else process.env.SILLYSPEC_STEP_GUIDE = prev
  })
}

/** 一次渲染对：首见 s1（全量）+ 复入 s2（短输出+附录）。 */
async function renderPair() {
  const cwd = mk('sg-dyn-')
  mkdirSync(join(cwd, '.sillyspec'), { recursive: true })
  return withGuideEnv(undefined, async () => {
    const s1 = await capture(() => run(cwd))
    const s2 = await capture(() => run(cwd))
    return { cwd, s1, s1text: s1.join(NL), s2text: s2.join(NL) }
  })
}

test('D1 首见渲染：评审六值全部替换为真值，无裸占位符残留', async () => {
  const { s1text } = await renderPair()
  for (const token of ['{REVIEW_TIER}', '{REVIEW_TIER_REASON}', '{STAGE_REVIEW_RUN_ID}', '{REVIEW_JSON_CONTRACT}', '{PRIOR_REVIEW_FACTS}', '{REVIEW_MATERIALS}']) {
    assert.ok(!s1text.includes(token), `首见输出无裸占位符 ${token}`)
  }
  const tierLine = s1text.split(NL).find((l) => l.startsWith('tier:'))
  assert.ok(tierLine && tierLine.trim().length > 'tier:'.length, `首见 tier 行含真值：${tierLine}`)
})

test('D2 复入短输出的动态附录含评审六值（tier 菜单值 / run-id / JSON 契约——修复前必红）', async () => {
  const { s2text } = await renderPair()
  assert.ok(s2text.includes('动态注入段'), '复入含动态附录标题')
  // 附录打印的是「注入值」本身（静态前缀如 'tier: ' 不在值内）——按值形态断言：
  // tier 值 = tierValue + 档位菜单（首行 = independent/self 档位词，含 ceremony_tier 菜单行）
  assert.ok(s2text.split(NL).some((l) => l.startsWith('independent')), '附录含 tier 注入值（含档位菜单块）')
  assert.ok(s2text.includes('ceremony_tier: S2'), '附录含档位菜单的 ceremony_tier 行')
  assert.ok(/review-\d{4}-\d{2}-\d{2}-\d{6}/.test(s2text), '附录含 STAGE_REVIEW_RUN_ID 值')
  assert.ok(s2text.includes('schemaVersion'), '附录含 REVIEW_JSON_CONTRACT 值（契约文本特征词）')
})

test('D3 guide 静态文件：三个补登 token 已掩码（⟦dyn⟧），静态面无裸占位符', async () => {
  const { s2text } = await renderPair()
  const candidates = s2text.split(NL)
    .map((l) => l.trim())
    .filter((l) => l.includes('step-guides') && l.endsWith('.md'))
  assert.ok(candidates.length > 0, `复入输出含 guide 路径：${s2text.slice(0, 300)}`)
  const guide = readFileSync(candidates[0], 'utf8')
  assert.ok(guide.includes('tier: ⟦dyn⟧'), `guide 中 tier 行已掩码：${guide.split(NL).slice(0, 8).join(' | ')}`)
  for (const token of ['{REVIEW_TIER}', '{REVIEW_TIER_REASON}', '{REVIEW_JSON_CONTRACT}']) {
    assert.ok(!guide.includes(token), `guide 无裸占位符 ${token}`)
  }
})

test('D4 stage-review 路径警告双向覆盖 + 直接复制指引', () => {
  const src = readFileSync(join(REPO_ROOT, 'src', 'stage-review.js'), 'utf8')
  assert.ok(src.includes('漏「<stage>-」前缀即错位'), '覆盖漏前缀错法（2026-10-10 实证）')
  assert.ok(src.includes('多加一层「review-」前缀同样错位'), '覆盖多前缀错法（2026-10-15 复发实证）')
  assert.ok(src.includes('勿手拼、勿增删任何前缀'), '直接复制指引在场')
})
