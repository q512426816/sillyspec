/**
 * distill-abnormal-upgrade.test.mjs — 蒸馏异态升厚触发器修复（2026-10-20-distill-abnormal-upgrade-fix）
 *
 * 缺陷：flow done distill 子步升厚判定 `res && (res.rejected > 0 || res.needsWait > 0)` 两分支
 * 恒 false——distillIntoKnowledge 返回值只有 written/skipped/needsWait 三键（rejected 幽灵引用
 * 恒 undefined），needsWait 是字符串（非空串 > 0 恒 false）。「distill 异态自动升厚留人工裁决」
 * （flow.js 头注声明）从未生效，决策质量异态被静默吞。
 *
 * 修复契约：isDistillAbnormal(res) = Boolean(res && res.needsWait)——needsWait 非空字符串是唯一
 * 异态信号；判定提取到产出方 decision-distill.js 单一源同处；flow.js 调用导出函数。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const { isDistillAbnormal, distillIntoKnowledge, parseDecisions } = await import('../src/decision-distill.js')

const tmpRoots = []
test.after(() => { for (const d of tmpRoots) { try { rmSync(d, { recursive: true, force: true }) } catch {} } })
function mkChange(md) {
  const root = mkdtempSync(join(tmpdir(), 'dau-')); tmpRoots.push(root)
  mkdirSync(root, { recursive: true })
  writeFileSync(join(root, 'decisions.md'), md)
  return root
}

test('① needsWait 非空判真：rejected 缺字段蒸馏返回 needsWait → isDistillAbnormal 真', () => {
  // 真实产出路径：rejected 条目缺否决理由/复潮条件 → distillIntoKnowledge needsWait 非空
  const dir = mkChange([
    '# 决策记录',
    '',
    '## D-001@v1 缺字段的否决',
    '- 状态：rejected',
    '- 类型：architecture',
    '- 模块域：core-engine',
    '- 答案：某方案被否',
    '',
  ].join('\n') + '\n')
  const knowledge = mkdtempSync(join(tmpdir(), 'dau-k1-')); tmpRoots.push(knowledge)
  const res = distillIntoKnowledge(dir, knowledge, 'deadbeef', null)
  assert.ok(typeof res.needsWait === 'string' && res.needsWait.length > 0, `needsWait 非空（实际 ${JSON.stringify(res.needsWait)}）`)
  assert.equal(isDistillAbnormal(res), true, 'needsWait 非空 → 判真（修复前恒 false）')
  assert.equal(res.rejected, undefined, '返回值无 rejected 字段（幽灵引用实证）')
})

test('② 正常路径判假零副作用：null / skipped 形态 / res 空参全判假', () => {
  assert.equal(isDistillAbnormal({ written: [], skipped: 'x', needsWait: null }), false, 'needsWait=null 判假')
  assert.equal(isDistillAbnormal({ written: ['d'], skipped: null, needsWait: null }), false, '正常写盘判假')
  assert.equal(isDistillAbnormal(null), false, 'res=null 判假不抛错')
  assert.equal(isDistillAbnormal(undefined), false, 'res=undefined 判假不抛错')
  assert.equal(isDistillAbnormal({}), false, '空对象判假')
})

test('③ 幽灵引用清除与调用点钉：flow.js 调用导出函数、内联表达式不在场、reason 文案无 rejected', () => {
  const flowSrc = readFileSync(join(ROOT, 'src', 'flow.js'), 'utf8')
  assert.ok(flowSrc.includes('isDistillAbnormal(res)'), 'flow.js 调用 isDistillAbnormal(res)')
  assert.ok(!/res\.rejected > 0/.test(flowSrc), '内联幽灵表达式已删除')
  assert.ok(!/res\.needsWait > 0/.test(flowSrc), '字符串与 >0 比较已删除')
  const distillSrc = readFileSync(join(ROOT, 'src', 'decision-distill.js'), 'utf8')
  assert.match(distillSrc, /export function isDistillAbnormal/, 'isDistillAbnormal 由 decision-distill.js 导出（与 needsWait 产出单一源同处）')
  // 解析契约旁证：正常 rejected（字段齐备）走防复潮通道正常入库，不触发异态
  const okDir = mkChange([
    '# 决策记录',
    '',
    '## D-001@v1 字段齐备的否决',
    '- 状态：rejected',
    '- 类型：architecture',
    '- 模块域：core-engine',
    '- 答案：某方案被否',
    '- 否决理由：成本高',
    '- 复潮条件：成本降低',
    '',
  ].join('\n') + '\n')
  const knowledge = mkdtempSync(join(tmpdir(), 'dau-k2-')); tmpRoots.push(knowledge)
  const res = distillIntoKnowledge(okDir, knowledge, 'deadbeef', null)
  assert.equal(res.needsWait, null, '字段齐备 rejected 正常入库零异态')
  assert.equal(isDistillAbnormal(res), false)
})

test('④ 既有套件零回归：decision-distill-flat-list / decision-caliber-unify 全绿', () => {
  const env = { ...process.env }
  delete env.NODE_TEST_CONTEXT
  const s = spawnSync(process.execPath, [
    '--test',
    'test/decision-distill-flat-list.test.mjs',
    'test/decision-caliber-unify.test.mjs',
  ], { cwd: ROOT, encoding: 'utf8', timeout: 300_000, env })
  assert.equal(s.status, 0, `两套件全绿（实际 exit ${s.status}）\n${(s.stdout + s.stderr).slice(-1500)}`)
  const failMatch = /ℹ fail (\d+)/.exec(s.stdout)
  assert.ok(failMatch, 'TAP 摘要在场')
  assert.equal(failMatch[1], '0', 'fail 计数为 0')
})
