/**
 * 决策锚点触碰提示单测（change: 2026-08-24-decision-touch-cli-drift task-01，W-A）
 *
 * 覆盖：anchorFilePath 导出契约（:行号/:行号-行号/:符号 剥离 + POSIX 化）、
 * computeDecisionTouches（精确/子路径前缀/后缀剥离/仅 implemented/rejected 不提示/
 * 未记录跳过/R-03 前缀粒度/空库 empty/零触碰/入口 POSIX 化）、renderDecisionTouchFacts
 * （零输出/单条/≤5 截断+「…另有 N 条」）、collectExecuteChangedFiles 公共口径
 * （porcelain ∪ baseline..HEAD 同源）、双渲染点实测（execute.js buildWavePrompt 主渲染点
 * + run/prompt.js {DOCS_DEBT} 次渲染点：有触碰出事实行、无触碰零输出）、
 * computeDocsDebt 既有行为不变（只增导出零回归）。
 *
 * fixture 全 tmp git 仓，不污染真仓库。
 */
import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { execSync } from 'node:child_process'
import {
  computeDecisionTouches,
  renderDecisionTouchFacts,
  collectExecuteChangedFiles,
  computeDocsDebt,
  DECISION_TOUCH_RENDER_LIMIT,
} from '../src/docs-debt.js'
import { anchorFilePath } from '../src/docs-check.js'
import { buildWavePrompt } from '../src/stages/execute.js'
import { outputStep } from '../src/run/prompt.js'

let root
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'dtouch-'))
})
afterEach(() => { try { rmSync(root, { recursive: true, force: true }) } catch {} })

/** 决策库 fixture：精确锚点/子路径:行号区间/单 :行号/:符号/rejected/未记录 六形态 */
const DECISIONS_MD = `---
author: t
created_at: 2026-08-24T00:00:00+08:00
---

# 决策知识 — demo

## D-901@v1 精确锚点决策
状态：implemented
锚点：src/exact.js
最近确认：1111111
理由：demo。

## D-902@v1 子路径锚点决策
状态：implemented
锚点：src/sub:120-130
理由：demo。

## D-903@v1 行号锚点决策
状态：implemented
锚点：src/lineno.js:42
理由：demo。

## D-904@v1 符号锚点决策
状态：implemented
锚点：src/symbol.js:doSomething
理由：demo。

## D-905@v1 rejected 决策
状态：rejected
锚点：src/exact.js
理由：demo。

## D-906@v1 未记录锚点决策
状态：implemented
锚点：未记录
理由：demo。
`

/** 建知识库：knowledge/decisions/demo.md（内容可覆盖）→ knowledgeRoot */
function mkKnowledge(md = DECISIONS_MD) {
  const knowledgeRoot = join(root, 'knowledge')
  mkdirSync(join(knowledgeRoot, 'decisions'), { recursive: true })
  if (md !== null) writeFileSync(join(knowledgeRoot, 'decisions', 'demo.md'), md)
  return knowledgeRoot
}

describe('anchorFilePath（docs-check 导出，剥离口径单一真相）', () => {
  it('剥 :行号 / :行号-行号 / :符号 后缀 + 反斜杠 POSIX 化；未记录/空 → null', () => {
    assert.equal(anchorFilePath('src/a.js:12'), 'src/a.js')
    assert.equal(anchorFilePath('src/a.js:12-34'), 'src/a.js')
    assert.equal(anchorFilePath('src/a.js:someSymbol'), 'src/a.js')
    assert.equal(anchorFilePath('src/a.js'), 'src/a.js')
    assert.equal(anchorFilePath('src\\a.js:5'), 'src/a.js')
    assert.equal(anchorFilePath('未记录'), null)
    assert.equal(anchorFilePath(''), null)
    assert.equal(anchorFilePath(null), null)
  })
})

describe('computeDecisionTouches（触碰事实计算）', () => {
  it('精确触碰：变更文件 === 锚点文件 → touch 含 id/title/anchorFile/touchedFile/file', () => {
    const kr = mkKnowledge()
    const { touches, empty } = computeDecisionTouches(['src/exact.js'], kr)
    assert.equal(empty, false)
    assert.equal(touches.length, 1, `仅 D-901 命中（实际 ${JSON.stringify(touches)}）`)
    const t = touches[0]
    assert.equal(t.id, 'D-901@v1')
    assert.equal(t.title, '精确锚点决策')
    assert.equal(t.anchorFile, 'src/exact.js')
    assert.equal(t.touchedFile, 'src/exact.js')
    assert.equal(t.file, 'knowledge/decisions/demo.md')
  })

  it('rejected 不提示：同文件锚点的 rejected 条目（D-905）不出现在 touches', () => {
    const kr = mkKnowledge()
    const { touches } = computeDecisionTouches(['src/exact.js'], kr)
    assert.ok(!touches.some(t => t.id.startsWith('D-905')), 'rejected 条目不参与')
  })

  it('子路径触碰：变更文件在锚点目录下（锚点 :行号-行号 剥离后前缀命中）', () => {
    const kr = mkKnowledge()
    const { touches } = computeDecisionTouches(['src/sub/deep/mod.js'], kr)
    assert.equal(touches.length, 1)
    assert.equal(touches[0].id, 'D-902@v1')
    assert.equal(touches[0].anchorFile, 'src/sub')
    assert.equal(touches[0].touchedFile, 'src/sub/deep/mod.js')
  })

  it(':行号 与 :符号 后缀剥离后命中', () => {
    const kr = mkKnowledge()
    for (const [file, id] of [['src/lineno.js', 'D-903@v1'], ['src/symbol.js', 'D-904@v1']]) {
      const { touches } = computeDecisionTouches([file], kr)
      assert.equal(touches.length, 1, `${file} 应命中 ${id}`)
      assert.equal(touches[0].id, id)
      assert.equal(touches[0].anchorFile, file, '锚点剥离后缀')
    }
  })

  it('R-03 前缀粒度：同前缀不同文件（src/substr.js）不算触碰 src/sub', () => {
    const kr = mkKnowledge()
    const { touches, empty } = computeDecisionTouches(['src/substr.js'], kr)
    assert.deepEqual(touches, [])
    assert.equal(empty, false)
  })

  it('锚点未记录跳过：D-906 任何文件都不命中', () => {
    const kr = mkKnowledge()
    const { touches } = computeDecisionTouches(['src/exact.js', 'src/sub/a.js', 'src/lineno.js', 'src/symbol.js', 'anything.go'], kr)
    assert.ok(!touches.some(t => t.id.startsWith('D-906')), '未记录锚点条目跳过')
    assert.equal(touches.length, 4)
  })

  it('空库：knowledge/decisions 不存在 → { touches: [], empty: true }', () => {
    const kr = mkKnowledge(null) // 建了 knowledge/ 但无 decisions/ → 删除演示
    rmSync(join(kr, 'decisions'), { recursive: true, force: true })
    assert.deepEqual(computeDecisionTouches(['src/exact.js'], kr), { touches: [], empty: true })
    // 整个 knowledgeRoot 不存在同样冷启动语义
    assert.deepEqual(computeDecisionTouches(['src/exact.js'], join(root, 'nope')), { touches: [], empty: true })
    assert.deepEqual(computeDecisionTouches(['src/exact.js'], null), { touches: [], empty: true })
  })

  it('零触碰：decisions 库存在但变更文件无关 → touches=[] 且 empty=false', () => {
    const kr = mkKnowledge()
    assert.deepEqual(computeDecisionTouches(['src/unrelated.js'], kr), { touches: [], empty: false })
    assert.deepEqual(computeDecisionTouches([], kr), { touches: [], empty: false })
  })

  it('入口 POSIX 化：changedFiles 反斜杠路径归一后命中', () => {
    const kr = mkKnowledge()
    const { touches } = computeDecisionTouches(['src\\exact.js'], kr)
    assert.equal(touches.length, 1)
    assert.equal(touches[0].touchedFile, 'src/exact.js')
  })

  it('同一决策被多个变更文件触碰 → 逐文件多条 touch', () => {
    const kr = mkKnowledge()
    const { touches } = computeDecisionTouches(['src/sub/a.js', 'src/sub/b.js'], kr)
    assert.equal(touches.length, 2)
    assert.deepEqual(touches.map(t => t.touchedFile).sort(), ['src/sub/a.js', 'src/sub/b.js'])
  })
})

describe('renderDecisionTouchFacts（事实行渲染）', () => {
  it('无触碰 → 空串零输出', () => {
    assert.equal(renderDecisionTouchFacts([]), '')
    assert.equal(renderDecisionTouchFacts(null), '')
    assert.equal(renderDecisionTouchFacts(undefined), '')
  })

  it('单条：含 [decision-touch] 头/决策 id/标题/锚点文件/触碰文件/需复核提示', () => {
    const out = renderDecisionTouchFacts([{ id: 'D-905@v1', title: 'quicklog 标签切段', anchorFile: 'src/quicklog.js', touchedFile: 'src/quicklog.js', file: 'knowledge/decisions/core-engine.md' }])
    assert.ok(out.startsWith('[decision-touch] 本次变更触碰 1 条决策锚点'), out)
    assert.ok(out.includes('需复核'), out)
    assert.ok(out.includes('D-905@v1'), out)
    assert.ok(out.includes('quicklog 标签切段'), out)
    assert.ok(out.includes('锚点 src/quicklog.js'), out)
    assert.ok(out.includes('触碰文件 src/quicklog.js'), out)
  })

  it(`≤${DECISION_TOUCH_RENDER_LIMIT} 条截断 + 「…另有 N 条」（R-05）`, () => {
    assert.equal(DECISION_TOUCH_RENDER_LIMIT, 5, '设计定 5 条上限')
    const touches = Array.from({ length: 7 }, (_, i) => ({
      id: `D-9${10 + i}@v1`, title: `决策${i}`, anchorFile: `src/a${i}.js`, touchedFile: `src/a${i}.js`, file: 'knowledge/decisions/demo.md',
    }))
    const out = renderDecisionTouchFacts(touches)
    assert.ok(out.includes('本次变更触碰 7 条决策锚点'), out)
    assert.ok(out.includes('D-910@v1') && out.includes('D-914@v1'), '前 5 条呈现')
    assert.ok(!out.includes('D-915@v1') && !out.includes('D-916@v1'), '第 6/7 条截断')
    assert.ok(out.includes('…另有 2 条'), out)
  })
})

/** 建 execute worktree fixture：wtRoot 真实 git 仓 + meta.json(baselineCommit) + 知识库。
 *  c0 提交 anchorFile，c1 再改并提交（committed 进 baseline..HEAD）；extraDirty 额外未提交文件。 */
function mkExecuteFixture({ anchor = 'src/exact.js', changed = 'src/exact.js', knowledge = true } = {}) {
  const specBase = join(root, '.sillyspec')
  const changeName = 'demo-chg'
  const wtRoot = join(specBase, '.runtime', 'worktrees', changeName)
  const changeDir = join(specBase, 'changes', changeName)
  mkdirSync(wtRoot, { recursive: true })
  mkdirSync(changeDir, { recursive: true })
  for (const d of [wtRoot]) {
    execSync('git init -q', { cwd: d, stdio: 'pipe' })
    execSync('git config user.email t@t.com', { cwd: d, stdio: 'pipe' })
    execSync('git config user.name t', { cwd: d, stdio: 'pipe' })
  }
  mkdirSync(join(wtRoot, 'src'), { recursive: true })
  writeFileSync(join(wtRoot, changed), 'v0\n')
  execSync(`git add -A && git commit -q -m c0`, { cwd: wtRoot, stdio: 'pipe' })
  const baseline = execSync('git rev-parse HEAD', { cwd: wtRoot, encoding: 'utf8' }).trim()
  writeFileSync(join(wtRoot, 'meta.json'), JSON.stringify({ baselineCommit: baseline, branch: `sillyspec/${changeName}` }, null, 2) + '\n')
  writeFileSync(join(wtRoot, changed), 'v1\n')
  execSync(`git add -A && git commit -q -m c1`, { cwd: wtRoot, stdio: 'pipe' })
  if (knowledge) {
    const knowledgeRoot = join(specBase, 'knowledge')
    mkdirSync(join(knowledgeRoot, 'decisions'), { recursive: true })
    writeFileSync(join(knowledgeRoot, 'decisions', 'demo.md'),
      `## D-901@v1 演示决策\n状态：implemented\n锚点：${anchor}\n最近确认：1111111\n理由：demo。\n`)
  }
  return { specBase, changeName, wtRoot, changeDir }
}

describe('collectExecuteChangedFiles（changedFiles 公共口径，双渲染点同源）', () => {
  it('porcelain 未提交 ∪ baseline..HEAD 已提交；.sillyspec/ 前缀剔除；root=worktree', () => {
    const { specBase, changeName, wtRoot } = mkExecuteFixture()
    // 未提交腿：改已提交文件 + 新增 untracked
    writeFileSync(join(wtRoot, 'src/exact.js'), 'v2-dirty\n')
    writeFileSync(join(wtRoot, 'src/untracked.js'), 'new\n')
    mkdirSync(join(wtRoot, '.sillyspec'), { recursive: true })
    writeFileSync(join(wtRoot, '.sillyspec', 'local.yaml'), 'x: 1\n') // 应被剔除
    const { root: gotRoot, changedFiles } = collectExecuteChangedFiles({ specBase, changeName, cwd: root })
    assert.equal(gotRoot, wtRoot, 'worktree 根解析：specBase/.runtime/worktrees/<change> 存在即锚')
    assert.ok(changedFiles.includes('src/exact.js'), `committed(baseline..HEAD) 腿命中（实际 ${JSON.stringify(changedFiles)}）`)
    assert.ok(changedFiles.includes('src/untracked.js'), 'porcelain 未提交腿命中')
    assert.ok(!changedFiles.some(f => f.startsWith('.sillyspec/')), '.sillyspec/ 前缀剔除')
  })

  it('无 worktree → root 回退 cwd（in-place 场景不抛）', () => {
    const { specBase } = mkExecuteFixture({ knowledge: false })
    const { root: gotRoot, changedFiles } = collectExecuteChangedFiles({ specBase, changeName: 'no-such-change', cwd: root })
    assert.equal(gotRoot, root)
    assert.ok(Array.isArray(changedFiles))
  })
})

describe('渲染点①execute.js buildWavePrompt（主渲染点，Wave 步 prompt）', () => {
  const wave = { index: 1, tasks: [{ index: 1, name: '触碰演示任务', file: 'src/exact.js' }] }

  it('有触碰：Wave prompt 追加决策触碰事实段（committed 变更经 baseline..HEAD 命中）', () => {
    const { changeDir, wtRoot } = mkExecuteFixture()
    const prompt = buildWavePrompt(wave, 1, changeDir, wtRoot, {})
    assert.ok(prompt.includes('[decision-touch]'), '事实行存在')
    assert.ok(prompt.includes('本次变更触碰 1 条决策锚点'), prompt.slice(prompt.indexOf('[decision-touch]'), prompt.indexOf('[decision-touch]') + 200))
    assert.ok(prompt.includes('D-901@v1') && prompt.includes('锚点 src/exact.js') && prompt.includes('触碰文件 src/exact.js'), 'id/锚点/触碰文件齐全')
    assert.ok(prompt.includes('需复核'), '需复核提示')
  })

  it('无触碰：零输出（prompt 不含 [decision-touch] 段）', () => {
    const { changeDir, wtRoot } = mkExecuteFixture({ anchor: 'src/other.js' }) // 锚点不在变更文件上
    const prompt = buildWavePrompt(wave, 1, changeDir, wtRoot, {})
    assert.ok(!prompt.includes('[decision-touch]'), 'advisory 无触碰零输出')
    assert.ok(!prompt.includes('决策锚点触碰'), '无触碰不出现段落标题')
  })

  it('无 decisions 库：零输出（冷启动不产噪声）', () => {
    const { changeDir, wtRoot } = mkExecuteFixture({ knowledge: false })
    const prompt = buildWavePrompt(wave, 1, changeDir, wtRoot, {})
    assert.ok(!prompt.includes('[decision-touch]'))
  })
})

describe('渲染点②run/prompt.js {DOCS_DEBT} 注入（次渲染点，重入/reset 场景）', () => {
  /** 捕获 console.log 跑一次 outputStep（execute step0），返回拼接输出 */
  async function renderOutputStep(setup) {
    const steps = [{ name: 'Wave 1 执行', prompt: 'PROMPT\n{DOCS_DEBT}' }]
    const origLog = console.log
    const buf = []
    console.log = (...args) => { buf.push(args.join(' ')) }
    try {
      await outputStep('execute', 0, steps, root, setup.changeName, 'demo', {}, null)
    } finally {
      console.log = origLog
    }
    return buf.join('\n')
  }

  it('有触碰：{DOCS_DEBT} 注入处追加触碰事实行（与欠账 facts 并存）', async () => {
    const setup = mkExecuteFixture()
    const out = await renderOutputStep(setup)
    assert.ok(out.includes('[decision-touch]'), '触碰事实行存在')
    assert.ok(out.includes('D-901@v1') && out.includes('触碰文件 src/exact.js'), '事实行内容')
    assert.ok(out.includes('[docs-debt]'), '既有欠账 facts 注入不变（无 map → ok:false 单行）')
    assert.ok(!out.includes('{DOCS_DEBT}'), '占位符无残留')
  })

  it('无触碰：零输出（仅欠账 facts，无 [decision-touch]）', async () => {
    const setup = mkExecuteFixture({ anchor: 'src/other.js' })
    const out = await renderOutputStep(setup)
    assert.ok(!out.includes('[decision-touch]'), 'advisory 无触碰零输出')
    assert.ok(out.includes('[docs-debt]'), '欠账注入不受影响')
    assert.ok(!out.includes('{DOCS_DEBT}'), '占位符无残留')
  })
})

describe('computeDocsDebt 既有行为不变（AC-5 只增导出零回归）', () => {
  it('无 _module-map.yaml → ok:false 单行事实（既有文案逐字锁定）', () => {
    const { specBase } = mkExecuteFixture({ knowledge: false })
    const r = computeDocsDebt({ projectRoot: root, specBase, projectName: 'demo', changedFiles: ['src/exact.js'] })
    assert.equal(r.ok, false)
    assert.equal(r.facts, '[docs-debt] 无 _module-map.yaml，模块归属数据缺失（跑 sillyspec modules rebuild 生成）')
    assert.deepEqual(r.unmapped, ['src/exact.js'])
  })
})
