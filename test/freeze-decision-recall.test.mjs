/**
 * freeze-decision-recall.test.mjs — 复潮条件作为独立入选判据（2026-11-12-freeze-decision-recall）
 *
 * 锁定语义：
 *   ① 判据分流（FR-01）：无复潮条件→null；有复潮条件无否决理由→implemented；
 *      有否决理由→rejected；superseded/proposed/draft 仍排除；空 status 视同定案。
 *   ② 渲染（FR-02）：implemented 条目写入「复潮条件：」行，parseDecisionEntries 可读回。
 *   ③ 防复潮谓词（FR-03）：isRecallRelevant 无 score 门、isRecallRelevantScored 有——
 *      四处注入面共用单一源，防口径漂移。
 *   ④ full 回填（FR-04）：不按「已有基线」预筛，二次执行幂等。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const { parseDecisions, distillIntoKnowledge } = await import('../src/decision-distill.js')
const { isRecallRelevant, isRecallRelevantScored, parseDecisionEntries } = await import('../src/knowledge-match.js')
const { planBaselineReplay, applyBaselineReplay } = await import('../src/archive-baseline-replay.js')

const tmpRoots = []
function mkTmp(prefix) {
  const d = mkdtempSync(join(tmpdir(), prefix))
  tmpRoots.push(d)
  return d
}
test.after(() => { for (const d of tmpRoots) { try { rmSync(d, { recursive: true, force: true }) } catch { /* 清理失败无碍 */ } } })

function mkChange(md) {
  const root = mkTmp('fdr-')
  writeFileSync(join(root, 'decisions.md'), md)
  return root
}

const entry = (fields) => [
  '## D-001@v1 探针决策',
  ...fields,
  '- 模块域：core-engine',
  '- 答案：探针答案',
  '',
].join('\n')

const selectedOf = (fields) => parseDecisions(mkChange(entry(fields))).entries[0].selected

test('① 判据分流：复潮条件驱动三态，status 门仍生效', () => {
  // 无复潮条件 → 排除（纯范围取舍，既有行为不变）
  assert.equal(selectedOf(['- 类型：scope', '- 状态：confirmed']), null, 'scope 无复潮条件恒排除')

  // 有复潮条件、无否决理由 → implemented
  assert.equal(selectedOf(['- 类型：scope', '- 状态：implemented', '- 复潮条件：条件满足时可重启']), 'implemented', 'scope+复潮条件→implemented')

  // 有否决理由 + 复潮条件 → rejected
  assert.equal(selectedOf(['- 类型：scope', '- 状态：implemented', '- 否决理由：不值得', '- 复潮条件：需求出现时']), 'rejected', '有否决理由→rejected 通道')

  // 空 status 视同定案（存量手写条目形态）
  assert.equal(selectedOf(['- 类型：scope', '- 复潮条件：需求出现时', '- 否决理由：不值得']), 'rejected', '空 status + 否决理由→rejected')

  // status 门：已失效/未定案仍排除
  for (const s of ['superseded', 'proposed', 'draft']) {
    assert.equal(selectedOf(['- 类型：scope', '- 状态：' + s, '- 复潮条件：x']), null, `scope+${s}+复潮条件 仍排除`)
  }

  // 任何 type 带复潮条件都入选（不只 scope）
  assert.equal(selectedOf(['- 类型：boundary', '- 状态：confirmed', '- 复潮条件：x']), 'implemented', '非 scope 类型同样受益')
})

test('② 渲染：implemented 条目写出复潮条件行并可读回', () => {
  const dir = mkChange(entry(['- 类型：scope', '- 状态：implemented', '- 复潮条件：跨变更需求谱系查询成为高频动作时']))
  const knowledge = mkTmp('fdr-k-')
  const res = distillIntoKnowledge(dir, knowledge, 'deadbeef', null)
  assert.equal(res.needsWait, null)
  assert.ok((res.written || []).length > 0, '条目写盘')
  const domainFile = join(knowledge, 'decisions', 'core-engine.md')
  assert.equal(existsSync(domainFile), true, '域文件落盘')
  const text = readFileSync(domainFile, 'utf8')
  assert.match(text, /^复潮条件：跨变更需求谱系查询成为高频动作时$/m, 'implemented 条目含复潮条件行')
  // 解析侧读回（单一源契约：写入即可召回）
  // parseDecisionEntries 的入参是知识根（内部经 INDEX.md 路由发现 decisions/*.md）
  const entries = parseDecisionEntries(knowledge)
  const hit = entries.find((e) => e.title.includes('探针决策'))
  assert.ok(hit, '条目可被 parseDecisionEntries 读到')
  assert.equal(hit.revisitWhen, '跨变更需求谱系查询成为高频动作时', 'revisitWhen 读回')
  assert.equal(hit.status, 'implemented', '状态为 implemented')
})

test('③ 防复潮谓词：两档 score 门语义', () => {
  // 无 score 门版：死路 ∪ 否决 ∪ 复潮条件
  assert.equal(isRecallRelevant({ deathPath: true }), true)
  assert.equal(isRecallRelevant({ status: 'rejected', score: 0 }), true, '无门版不卡 score')
  assert.equal(isRecallRelevant({ status: 'implemented', revisitWhen: 'x', score: 0 }), true, '复潮条件无条件计入')
  assert.equal(isRecallRelevant({ status: 'implemented', score: 9 }), false, '普通 implemented 不计入')
  assert.equal(isRecallRelevant(null), false, '空值安全')

  // 带 score 门版：rejected/revisitWhen 须 score>0，deathPath 不受门约束
  assert.equal(isRecallRelevantScored({ deathPath: true, score: 0 }), true, 'deathPath 不受 score 门')
  assert.equal(isRecallRelevantScored({ status: 'rejected', score: 0 }), false, '零主题重叠的 rejected 不弹')
  assert.equal(isRecallRelevantScored({ status: 'rejected', score: 1 }), true)
  assert.equal(isRecallRelevantScored({ status: 'implemented', revisitWhen: 'x', score: 0 }), false, '零主题重叠的复潮条件不弹')
  assert.equal(isRecallRelevantScored({ status: 'implemented', revisitWhen: 'x', score: 1 }), true)
  assert.equal(isRecallRelevantScored({ status: 'implemented', score: 9 }), false, '普通 implemented 不计入')
})

test('④ full 回填：跳过「已有基线」预筛，二次执行幂等', () => {
  const spec = mkTmp('fdr-spec-')
  const archiveRoot = join(spec, 'changes', 'archive')
  const knowledgeRoot = join(spec, 'knowledge')
  mkdirSync(archiveRoot, { recursive: true })
  mkdirSync(join(knowledgeRoot, 'decisions'), { recursive: true })

  const changeDir = join(archiveRoot, '2026-01-01-probe')
  mkdirSync(changeDir, { recursive: true })
  writeFileSync(join(changeDir, 'design.md'), '# 设计文档\n\n## 做法概述\n\n探针做法。\n')
  writeFileSync(join(changeDir, 'decisions.md'), entry(['- 类型：scope', '- 状态：implemented', '- 复潮条件：条件 A 出现时']))
  // 预置该变更的基线条目 —— 模拟「有基线但缺人工条目」的目标场景
  writeFileSync(join(knowledgeRoot, 'decisions', 'core-engine.md'), [
    '## D-000@v1 基线探针',
    '原编号：D-000@v1',
    '变更：2026-01-01-probe',
    '状态：implemented',
    '',
  ].join('\n'))

  // 非 full：按已有基线预筛 → 跳过
  const legacy = planBaselineReplay(archiveRoot, knowledgeRoot, {})
  assert.equal(legacy.planned.length, 0, '非 full 模式按基线预筛跳过')
  assert.equal(legacy.skipped.already, 1, 'already 计数 1')

  // full：不预筛 → 入选
  const full = planBaselineReplay(archiveRoot, knowledgeRoot, { full: true })
  assert.equal(full.planned.length, 1, 'full 模式不预筛')

  // 首次 apply 写入人工条目
  const first = applyBaselineReplay(archiveRoot, knowledgeRoot, { full: true })
  assert.equal(first.applied, 1, '首次写入 1 个变更')
  assert.match(readFileSync(join(knowledgeRoot, 'decisions', 'core-engine.md'), 'utf8'), /探针决策/, '人工条目已入库')

  // 二次 apply 幂等（幂等键 = 号 + 变更，零新增）
  const second = applyBaselineReplay(archiveRoot, knowledgeRoot, { full: true })
  assert.equal(second.applied, 0, '二次执行零写入')
  assert.deepEqual(second.failed, [], '无失败')
})
