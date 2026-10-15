/**
 * motive-from-input.test.mjs — 模块变更索引摘要同源化（2026-10-15-title-label-skip）
 *
 * 病根：flow done 模块索引回写摘要裸取 --input 首行，「动机与背景：」段头行整行入摘要
 * （stages.changelog legacy-renumber 行实证）——与变更标题提取链（deriveChangeTitle，含
 * 段头行跳过/标签剥离）脱源。
 *
 * 锁定语义：motiveFromInput 段头免疫取次行、空提取回退变更名、与 deriveChangeTitle 同源。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const { motiveFromInput } = await import(pathToFileURL(join(ROOT, 'src', 'flow-parity.js')).href)
const { deriveChangeTitle } = await import(pathToFileURL(join(ROOT, 'src', 'quicklog.js')).href)

test('motiveFromInput：段头行免疫取次行（动机与背景形态）', () => {
  const input = '动机与背景：\ndecisions.md 中机器收割的 D-001 条目标题为流程内部术语\n\n成功标准：\n- x'
  assert.equal(motiveFromInput(input, 'c-x'), 'decisions.md 中机器收割的 D-001 条目标题为流程内部术语')
})

test('motiveFromInput：首行概括句直通（无段头）', () => {
  assert.equal(motiveFromInput('修复登录超时\n\n成功标准：\n- x', 'c-y'), '修复登录超时')
})

test('motiveFromInput：空提取回退变更名（空 input/纯段头无后文/成功标准引导行）', () => {
  assert.equal(motiveFromInput('', 'c-empty'), 'c-empty')
  assert.equal(motiveFromInput('动机与背景：', 'c-only-header'), 'c-only-header')
  assert.equal(motiveFromInput('成功标准：\n- x', 'c-criteria-only'), 'c-criteria-only')
  assert.equal(motiveFromInput(null, 'c-null'), 'c-null')
})

test('motiveFromInput：与 deriveChangeTitle 同源（含截断口径 ≤50）', () => {
  const long = '一'.repeat(80)
  assert.equal(motiveFromInput(long, 'c-long'), deriveChangeTitle(long), '截断行为与标题提取一致（50+…）')
})
