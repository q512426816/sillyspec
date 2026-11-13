/**
 * brainstorm-solution-constraint-gate.test.mjs — 头脑风暴方案硬约束准入（2026-11-13-brainstorm-solution-constraint-gate）
 *
 * 锁住「提出 2-3 种方案」步骤的方案质量规则：
 *   FR-01 硬约束清单 C1..Cn 与准入门槛（不满足者不得作为候选列入对比表）
 *   FR-02 仅 1 个合格方案时如实上报，禁止凑数补到 2-3 个
 *   FR-03 约束真实互斥时先提冲突取舍，禁止构造故意违约的假选项
 *   FR-04 提交前自检表（逐方案×逐约束打勾 + 取舍轴差异检查）
 *   FR-05 源码 / _extracted.json / docs/prompt/brainstorm.md 三面逐字一致
 *   FR-06 既有方案步锁点（等待选择铁律 / 机制词检索 / rejected 条目）不被冲销
 *
 * 读法：直接读源文件文本按步骤定义切段断言——不 import stages/index.js（其顶层
 * stageRegistry 对本文件 definition 求值，测试入口直 import 会触发路径无关的初始化面）。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SRC = readFileSync(join(REPO_ROOT, 'src', 'stages', 'brainstorm.js'), 'utf8')
const EXTRACTED = JSON.parse(readFileSync(join(REPO_ROOT, 'docs', 'prompt', '_extracted.json'), 'utf8'))
const MIRROR = readFileSync(join(REPO_ROOT, 'docs', 'prompt', 'brainstorm.md'), 'utf8')

const STEP_NAME = '提出 2-3 种方案'

/** 按步骤定义起点（`name: 'X',`）切段：返回从该步定义到下一步定义前的文本。 */
function seg(stepName) {
  const start = SRC.indexOf(`name: '${stepName}',`)
  assert.ok(start >= 0, `步骤「${stepName}」定义在场`)
  const nextIdx = SRC.indexOf("\n      name: '", start + 1)
  return SRC.slice(start, nextIdx === -1 ? SRC.length : nextIdx)
}

/** 从步骤定义里取回 prompt 模板字面量的运行时原文（还原 \` 转义）。 */
function sourcePrompt(stepName) {
  const segText = seg(stepName)
  const startTok = 'prompt: `'
  const start = segText.indexOf(startTok)
  assert.ok(start >= 0, `步骤「${stepName}」含 prompt 模板`)
  const from = start + startTok.length
  const end = segText.indexOf('`,\n', from)
  assert.ok(end >= 0, `步骤「${stepName}」prompt 模板闭合在场`)
  return segText.slice(from, end).replace(/\\`/g, '`')
}

const SOLUTIONS = seg(STEP_NAME)

test('FR-01 硬约束准入门槛：编号清单 C1..Cn + 来源三面 + 不满足者不得列入对比表', () => {
  assert.match(SOLUTIONS, /硬约束清单/, '硬约束清单在场')
  assert.match(SOLUTIONS, /C1\.\.Cn/, '约束编号形态在场')
  assert.match(SOLUTIONS, /\[用户\]/, '来源之一：用户确认需求点')
  assert.match(SOLUTIONS, /status: accepted/, '来源之二：accepted 决策')
  assert.match(SOLUTIONS, /normalized_requirement/, '来源之二的字段锚在场')
  assert.match(SOLUTIONS, /硬边界/, '来源之三：用户硬边界')
  assert.match(SOLUTIONS, /不得作为候选列入对比表/, '不满足约束者不得作为候选')
})

test('FR-02 单方案如实上报：只报 1 个 + 淘汰方案违反编号 + 禁止凑数', () => {
  assert.match(SOLUTIONS, /只有 1 个/, '单方案边界在场')
  assert.match(SOLUTIONS, /如实只报这 1 个/, '如实上报唯一合格方案')
  assert.match(SOLUTIONS, /违反的约束编号/, '淘汰方案须列违反编号')
  assert.match(SOLUTIONS, /禁止为凑足/, '禁止凑数文案在场')
})

test('FR-03 约束冲突：先提冲突取舍，禁止构造故意违约的假选项', () => {
  assert.match(SOLUTIONS, /真实互斥/, '约束互斥情形在场')
  assert.match(SOLUTIONS, /先停下提冲突/, '冲突须先停下提出')
  assert.match(SOLUTIONS, /故意违反.*假选项/, '禁止构造故意违约的假选项')
})

test('FR-04 提交前自检表：逐方案×逐约束打勾 + 取舍轴差异检查', () => {
  assert.match(SOLUTIONS, /自检/, '自检表在场')
  assert.match(SOLUTIONS, /全部打 ✓/, '逐方案×逐约束打勾')
  assert.match(SOLUTIONS, /取舍轴/, '取舍轴差异检查在场')
  assert.match(SOLUTIONS, /合并/, '同位置方案必须合并')
})

test('FR-05 三面一致：源码 prompt == _extracted.json == docs/prompt/brainstorm.md', () => {
  const step = EXTRACTED.brainstorm?.steps?.find((s) => s.name === STEP_NAME)
  assert.ok(step, '_extracted.json 含该步骤')
  const expected = sourcePrompt(STEP_NAME)
  assert.equal(step.prompt, expected, '源码与提取产物逐字一致（漏跑 _extract.mjs 即红）')
  assert.ok(MIRROR.includes(expected), 'docs/prompt/brainstorm.md 镜像逐字包含该 prompt')
})

test('FR-06 回归保护：既有方案步锁点不被冲销', () => {
  assert.match(SOLUTIONS, /必须等待用户选择方案/, '等待选择铁律保留')
  assert.match(SOLUTIONS, /knowledge search/, '机制词检索固定动作保留')
  assert.match(SOLUTIONS, /status 用 rejected/, '落选方案 rejected 条目规则保留')
  assert.match(SOLUTIONS, /方案差异要实质性的/, '差异性要求保留')
})
