/**
 * proto-reuse-register.test.mjs — 原型「免生成·登记复用」档（2026-10-13-proto-reuse-register）
 *
 * fire-equipment 实证：用户已提供可复跑 HTML 原型时，分级无复用档 → agent 按精神走「跳过」
 * 且不登记 → execute 注入（按 prototype-*.html 命名扫描）不生效。本测试锁三层契约：
 *   ① brainstorm 分级含登记复用档：prototype-<名称>.html 命名硬要求 + 来源/覆盖面声明 + 静态稿排除；
 *   ② 三选一口径落在分级步操作/铁律/输出三处；
 *   ③ 周边指引（explore / gates 软提醒 / design-facts 自审清单）同步口径。
 *     brainstorm-auto 断言随自动道删除退役（2026-10-14-brainstorm-auto-retire）。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { definition as brainstormDef } from '../src/stages/brainstorm.js'
import { definition as exploreDef } from '../src/stages/explore.js'
import { warnMissingUiPrototype } from '../src/run/gates.js'
import { generateDesignSkeleton } from '../src/design-facts.js'

// ── 定位「展示设计方案」步 ──
const showStep = brainstormDef.steps.find(s => (s.prompt || '').includes('HTML 原型分级'))
assert.ok(showStep, 'brainstorm 应有含「HTML 原型分级」的展示设计方案步骤')
const prompt = showStep.prompt || ''
// 分级表内登记复用档文本（登记复用档排在必须生成档之前）
const reuseIdx = prompt.indexOf('登记复用')
const mustGenIdx = prompt.indexOf('必须生成')
const reuseTier = reuseIdx >= 0 && mustGenIdx > reuseIdx ? prompt.slice(reuseIdx, mustGenIdx) : ''

test('① 分级含登记复用档：命名硬要求 + 来源/覆盖面声明', () => {
  assert.ok(reuseIdx > 0, '分级表必须含「登记复用」档')
  assert.ok(reuseTier.includes('prototype-<名称>.html'), '登记复用必须写明 prototype-<名称>.html 命名（execute 注入契约）')
  assert.ok(/复制/.test(reuseTier), '登记复用是复制落盘，不是口头引用')
  assert.ok(/来源/.test(reuseTier) && /覆盖面/.test(reuseTier), '复用声明必须含来源与覆盖面')
  assert.ok(/多个|共存/.test(reuseTier), '部分覆盖时允许多个 prototype-*.html 共存增量生成')
})

test('① 排除项：截图/静态设计稿不适用复用档', () => {
  assert.ok(reuseTier.length > 0, '前置：登记复用档文本已提取')
  assert.ok(/截图|静态/.test(reuseTier), '登记复用档内必须显式排除截图/静态设计稿（不可复跑）')
})

test('② 三选一口径落在操作/铁律/输出三处', () => {
  assert.ok(/三选一/.test(prompt), '分级步操作须声明三选一（生成/登记复用/跳过原因）')
  assert.ok(/跳过原因/.test(prompt) && /必须生成/.test(prompt), '三选项（生成/登记复用/跳过原因）全部在场')
  const ironIdx = prompt.indexOf('铁律')
  assert.ok(ironIdx > 0, '铁律段在场')
  assert.ok(/复用登记|登记复用/.test(prompt.slice(ironIdx)), '铁律的暂停前落定清单须含复用登记')
  assert.ok(/复用声明/.test(prompt), '输出契约须含复用声明（来源+覆盖面）')
})

test('③ explore 复制复用行保留命名要求', () => {
  const p = JSON.stringify(exploreDef)
  assert.ok(/prototype-<名称>\.html/.test(p) && /保留/.test(p),
    'explore 复用指引须注明保留 prototype-<名称>.html 命名（execute 按此注入）')
})

test('③ gates 软提醒文案含登记复用出路（行为锁）', () => {
  const base = mkdtempSync(join(tmpdir(), 'prr-gates-'))
  const changeDir = join(base, 'changes', 'c1')
  mkdirSync(changeDir, { recursive: true })
  writeFileSync(join(changeDir, 'design.md'), '# 设计\n| 修改 | src/App.tsx | 新增列 |\n')
  const capture = []
  const origWarn = console.warn
  console.warn = (...a) => capture.push(a.join(' '))
  try {
    warnMissingUiPrototype('brainstorm', 'c1', '生成规范文件', base)
  } finally {
    console.warn = origWarn
  }
  assert.equal(capture.length, 1, '命中前端文件且无原型 → warn 一行')
  assert.ok(/登记复用/.test(capture[0]), '提醒文案须含登记复用出路')
  assert.ok(/prototype-<名称>\.html/.test(capture[0]), '提醒文案须点名 prototype-<名称>.html 命名')
})

test('③ design-facts 自审清单项含复用登记与命名要求', () => {
  const skeleton = generateDesignSkeleton({ changeName: '2026-10-13-x' })
  assert.ok(/登记复用/.test(skeleton), '自审清单 UI 原型项须含登记复用')
  assert.ok(/prototype-\*\.html/.test(skeleton), '自审清单须保留 prototype-*.html 命名锚')
})
