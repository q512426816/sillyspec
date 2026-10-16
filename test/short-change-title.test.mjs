/**
 * 短标题提炼测试 —— 2026-10-16-short-change-title（变更中心标题治理·工具侧）。
 *
 * 病根实证（平台变更中心两类烂标题）：① 完整变更恒变更名兜底——brainstorm 模板 H1 即纯
 * 「# 提案书（Proposal）」，deriveTitleFromLinkedChange 剥前缀为空直接放弃，proposal「## 动机」
 * 首句无人取；② 轻量变更 50 字硬切残句——deriveChangeTitle 对超长首行硬切加 …（本地 20 条
 * 实证 7 兜底 + 8 硬切）。本文件锁定提炼口径：目标 20 / 上限 30 / 自然标点截断 / 硬切兜底 +
 * hardCut 标记，样本用本次实证坏标题（可回放）。
 *
 * 口径分治（防牵连）：deriveChangeTitle ≤50 硬切契约逐字节不变（motiveFromInput 模块摘要
 * 同源依赖，motive-from-input.test.mjs 锁定）；标题面走 deriveShortChangeTitle 新入口。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const ROOT = join(import.meta.dirname, '..')
const { distillShortTitle, distillShortTitleEx, deriveChangeTitle, deriveShortChangeTitle, deriveShortChangeTitleEx, deriveTitleFromLinkedChange } =
  await import(pathToFileURL(join(ROOT, 'src', 'quicklog.js')).href)

// 实证样本（2026-10-16 排查会话从平台变更中心取回的两类坏标题）
const SAMPLE_50CUT = 'change 文件树「刷新」同步链路三层静默失败——后端 RPC 预算 3s 短于实测 6~13.5s 触发整树重拉'
const SAMPLE_MOTIVE = '用户报告登录的账户有时候莫名其妙被退出登录。'

// ── FR-01：distillShortTitle 提炼口径 ──

test('FR-01 实证样本①：50 字硬切残句在全角破折号处自然截断', () => {
  const got = distillShortTitleEx(SAMPLE_50CUT)
  assert.equal(got.title, 'change 文件树「刷新」同步链路三层静默失败', '破折号前截断、无 — 残留')
  assert.ok(got.title.length <= 30, `≤30 字（实际 ${got.title.length}）`)
  assert.equal(got.hardCut, false, '自然截点命中 → 非 hardCut')
})

test('FR-01 实证样本②：动机首句 ≤30 字原样返回（仅剥尾句号）', () => {
  const got = distillShortTitleEx(SAMPLE_MOTIVE)
  assert.equal(got.title, '用户报告登录的账户有时候莫名其妙被退出登录')
  assert.equal(got.hardCut, false)
})

test('FR-01 截点取距目标 20 最近、同距取更短', () => {
  // 两截点：15 字与 25 字，距 20 等距 → 取更短（15）
  const got = distillShortTitle('修复用户登录会话随机失效的问题，同时优化了性能表现，并补充了回归测试覆盖')
  assert.equal(got, '修复用户登录会话随机失效的问题')
})

test('FR-01 无自然截点 → 硬切 30+… 并标 hardCut', () => {
  const long = '多标签页并发操作同一会话存储键时后写者覆盖先写者的活动状态导致随机登出需要重新设计键空间隔离与合并策略'
  const got = distillShortTitleEx(long)
  assert.equal(got.title, long.slice(0, 30) + '…')
  assert.equal(got.hardCut, true)
})

test('FR-01 ASCII 小数点/千分位不误切（3.5 / 1,000）', () => {
  // '.'（前缀 13 字）与 ','（前缀 29 字）若无后随守卫都会成为候选；保护后无截点 → hardCut
  const s = '将 RPC 重试间隔从 3.5s 提升到 7s 并引入 1,000 上限保护以及若干后续的详细说明文字继续延长'
  const got = distillShortTitleEx(s)
  assert.equal(got.hardCut, true, '小数点/千分位不算截点 → 无可用截点硬切')
  assert.equal(got.title, s.slice(0, 30) + '…', '未在 3. 处截出 13 字残句')
})

test('FR-01 边界：空输入返回空串；短句剥尾标点不硬切', () => {
  assert.deepEqual(distillShortTitleEx(''), { title: '', hardCut: false })
  assert.deepEqual(distillShortTitleEx(null), { title: '', hardCut: false })
  assert.equal(distillShortTitle('加登录限流。'), '加登录限流')
  assert.equal(distillShortTitle('  多   空  格  折  '), '多 空 格 折')
})

// ── FR-02：标题入口提炼、motiveFromInput ≤50 口径分治 ──

test('FR-02 deriveShortChangeTitle：标签剥离 + 首行 + 提炼', () => {
  const input = `需求：${SAMPLE_50CUT}\n\n成功标准：\n- 标题 ≤30 字`
  assert.equal(deriveShortChangeTitle(input), 'change 文件树「刷新」同步链路三层静默失败')
  assert.equal(deriveShortChangeTitle('成功标准：\n- x'), '', '首行即成功标准引导行 → 空（调用方兜底）')
})

test('FR-02 deriveChangeTitle ≤50 既有契约逐字节不变（motiveFromInput 同源）', () => {
  assert.equal(deriveChangeTitle('知识页治理卡显示「暂无推荐去向」体验优化\n\n成功标准：\n- x'), '知识页治理卡显示「暂无推荐去向」体验优化')
  const long = '多标签页并发操作同一会话存储键时后写者覆盖先写者的活动状态导致随机登出需要重新设计键空间隔离与合并策略'
  assert.equal(deriveChangeTitle(long), long.slice(0, 50) + '…', '仍是 50 字硬切（非 30 提炼）——摘要口径不牵连')
  assert.equal(deriveChangeTitle(SAMPLE_50CUT), SAMPLE_50CUT.slice(0, 50) + '…', '实证样本走旧口径仍为 50 硬切')
})

test('FR-02/FR-04 deriveShortChangeTitleEx：hardCut 判定（flow 软提示触发面）', () => {
  assert.equal(deriveShortChangeTitleEx(SAMPLE_50CUT).hardCut, false, '自然截点 → 不提示')
  assert.equal(deriveShortChangeTitleEx('加登录限流').hardCut, false, '短句 → 不提示')
  const long = '多标签页并发操作同一会话存储键时后写者覆盖先写者的活动状态导致随机登出'
  assert.equal(deriveShortChangeTitleEx(long).hardCut, true, '硬切 → 提示')
  assert.deepEqual(deriveShortChangeTitleEx(''), { title: '', hardCut: false }, '空输入不触发提示')
})

// ── FR-03：deriveTitleFromLinkedChange 动机回退 ──

const tmpDirs = []
function mkProposal(change, text) {
  const specBase = mkdtempSync(join(tmpdir(), `sst-${change}-`))
  tmpDirs.push(specBase)
  const dir = join(specBase, 'changes', change)
  mkdirSync(dir, { recursive: true })
  if (text !== null) writeFileSync(join(dir, 'proposal.md'), text)
  return specBase
}

test('FR-03 纯模板 H1 → 回退读「## 动机」首句过提炼', () => {
  const specBase = mkProposal('2026-10-16-auth', [
    '# 提案书（Proposal）',
    '',
    '## 动机',
    '用户报告登录的账户有时候莫名其妙被退出登录，怀疑会话过期策略误伤',
    '',
    '## 关键问题',
    '会话过期策略缺乏多标签页视角',
  ].join('\n'))
  const got = deriveTitleFromLinkedChange(specBase, '2026-10-16-auth')
  assert.equal(got, '用户报告登录的账户有时候莫名其妙被退出登录', '动机首句截点提炼，非变更名兜底')
})

test('FR-03 无 H1 无动机节 → 仍返回空串（既有契约，complete.js 空串不刷新）', () => {
  const specBase = mkProposal('2026-10-16-noh1', '无一级标题的 proposal\n\n正文\n')
  assert.equal(deriveTitleFromLinkedChange(specBase, '2026-10-16-noh1'), '')
})

test('FR-03 动机节模板占位/AGENT 槽注释跳过 → 空串（防占位标题换皮）', () => {
  const specBase = mkProposal('2026-10-16-placeholder', [
    '# 提案书（Proposal）',
    '',
    '## 动机',
    '为什么做、解决什么核心问题',
    '<!--AGENT:槽1 动机例外裁决——例外裁决书写面（机器段之外合法） -->',
  ].join('\n'))
  assert.equal(deriveTitleFromLinkedChange(specBase, '2026-10-16-placeholder'), '')
})

test('FR-03 动机首行 bullet/任务原话转写前缀剥除', () => {
  const bullet = mkProposal('2026-10-16-bullet', '# 提案书（Proposal）\n\n## 动机\n- 用户反馈导出按钮无效且无任何错误提示\n')
  assert.equal(deriveTitleFromLinkedChange(bullet, '2026-10-16-bullet'), '用户反馈导出按钮无效且无任何错误提示')
  const raw = mkProposal('2026-10-16-rawinput', '# 提案书（Proposal）\n\n## 动机\n任务原话转写：修复导出按钮无效的问题\n')
  assert.equal(deriveTitleFromLinkedChange(raw, '2026-10-16-rawinput'), '修复导出按钮无效的问题')
})

test('FR-03 flow-draft 机器稿形态（MACHINE-DRAFT 包裹标记跳过，取正文首行）', () => {
  const specBase = mkProposal('2026-10-16-machinedraft', [
    '---',
    'author: flow-machine-draft',
    '---',
    '# 提案书（Proposal）',
    '',
    '## 动机',
    '<!-- MACHINE-DRAFT:proposal-motivation:a0166d9d:begin 机器预填段 -->',
    '任务原话转写：用户报告导出按钮点了没有任何反应也无报错提示，怀疑是权限校验前置拦截了请求',
    '<!-- MACHINE-DRAFT:proposal-motivation:end -->',
    '',
    '<!--AGENT:槽1 动机例外裁决——例外裁决书写面（机器段之外合法） -->',
  ].join('\n'))
  assert.equal(deriveTitleFromLinkedChange(specBase, '2026-10-16-machinedraft'), '用户报告导出按钮点了没有任何反应也无报错提示')
})

test('FR-03 H1 语义标题超长 dash-desc 过提炼封顶 ≤30', () => {
  const specBase = mkProposal('2026-10-16-longdash', '# 提案书（Proposal）— 滑块验证码人机校验在弱网环境下频繁误伤真实用户，导致转化率下滑\n')
  const got = deriveTitleFromLinkedChange(specBase, '2026-10-16-longdash')
  assert.equal(got, '滑块验证码人机校验在弱网环境下频繁误伤真实用户')
  assert.ok(got.length <= 30)
})

test('FR-03 proposal 缺失/读失败 → 空串（best-effort 不抛）', () => {
  const specBase = mkProposal('2026-10-16-missing', null)
  assert.equal(deriveTitleFromLinkedChange(specBase, '2026-10-16-missing'), '')
  assert.equal(deriveTitleFromLinkedChange(specBase, ''), '')
})

test('cleanup', () => {
  for (const d of tmpDirs) { try { rmSync(d, { recursive: true, force: true }) } catch {} }
})
