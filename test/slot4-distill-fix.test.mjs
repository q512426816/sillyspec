/**
 * slot4-distill-fix.test.mjs — 槽4 收割→决策蒸馏断链修复（2026-09-26-slot4-distill-fix）
 *
 * 病根：harvestSlot4Decision 产出条目无「状态：」字段，distillIntoKnowledge 只入选
 * confirmed|accepted|rejected → 收割条目永不入选（宣称「随蒸馏链进 knowledge」断链，
 * thin-agent-tasks 枚举教训留档归档而 knowledge 零落地的实证）。
 *
 * 覆盖验收面：
 *   ① 收割条目含「状态：confirmed」且经 distillIntoKnowledge 实测入选落盘；
 *   ② 无状态旧格式仍不入选（蒸馏既有行为回归——非收割来源的裸条目不该混入）。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync, existsSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const { harvestSlot4Decision } = await import(pathToFileURL(join(ROOT, 'src', 'flow-parity.js')).href)
const { distillIntoKnowledge } = await import(pathToFileURL(join(ROOT, 'src', 'decision-distill.js')).href)

function mkChangeDir(tmp, slot4Answer) {
  const changeDir = join(tmp, 'changes', 'c-s4')
  mkdirSync(changeDir, { recursive: true })
  writeFileSync(join(changeDir, 'design.md'), [
    '# 设计记录', '',
    '<!--AGENT:槽4 风险与死路作答 -->',
    slot4Answer, '',
  ].join('\n'))
  return changeDir
}

test('① 收割→蒸馏全链：状态字段补齐后入选并落 knowledge/decisions', () => {
  const tmp = mkdtempSync(join(tmpdir(), 's4f-'))
  try {
    const changeDir = mkChangeDir(tmp, '枚举开放世界是错误方向——开放分类归 agent，机器只锚定封闭面。')
    const h = harvestSlot4Decision({ changeDir, change: 'c-s4' })
    assert.ok(h.harvested, `应收割（${h.reason}）`)
    const decText = readFileSync(join(changeDir, 'decisions.md'), 'utf8')
    assert.ok(/状态：confirmed/.test(decText), '收割条目应含状态字段')
    const kr = join(tmp, 'knowledge'); mkdirSync(kr, { recursive: true })
    const r = distillIntoKnowledge(changeDir, kr, 'abc123', null)
    assert.ok(r.written.length > 0, `蒸馏应入选（实际 skipped=${r.skipped}）`)
    const files = readdirSync(join(kr, 'decisions'))
    const body = readFileSync(join(kr, 'decisions', files[0]), 'utf8')
    assert.ok(body.includes('枚举开放世界'), '教训文本应落 knowledge')
  } finally { rmSync(tmp, { recursive: true, force: true }) }
})

test('② 无状态旧格式不入选（蒸馏既有行为回归）', () => {
  const tmp = mkdtempSync(join(tmpdir(), 's4f2-'))
  try {
    const changeDir = join(tmp, 'changes', 'c-old')
    mkdirSync(changeDir, { recursive: true })
    writeFileSync(join(changeDir, 'decisions.md'), [
      '---', 'author: x', '---', '# 决策', '',
      '## D-001@v1: 无状态裸条目', '- 决策：不该入选', '',
    ].join('\n'))
    const kr = join(tmp, 'knowledge'); mkdirSync(kr, { recursive: true })
    const r = distillIntoKnowledge(changeDir, kr, 'abc', null)
    assert.equal(r.written.length, 0, '无状态条目不应入选（回归）')
    assert.ok(!existsSync(join(kr, 'decisions')), '零输出不落盘')
  } finally { rmSync(tmp, { recursive: true, force: true }) }
})
