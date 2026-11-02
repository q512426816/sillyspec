/**
 * slot4-distill-fix.test.mjs — 槽4 收割已下线（2026-11-02-slot4-harvest-retire）
 *
 * 历史（2026-09-26-slot4-distill-fix）：收割条目补状态字段使蒸馏入选。2026-11-02 根治：
 * 收割不再写盘（4A 实证产物全是模板底稿），测试改为验证 no-op 行为；② 蒸馏无状态
 * 回归保留（非收割来源的裸条目不该混入——distill 行为不变）。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const { harvestSlot4Decision } = await import(pathToFileURL(join(ROOT, 'src', 'flow-parity.js')).href)
const { distillIntoKnowledge } = await import(pathToFileURL(join(ROOT, 'src', 'decision-distill.js')).href)

test('① 收割已下线：不写 decisions.md（恒 harvested:false）', () => {
  const tmp = mkdtempSync(join(tmpdir(), 's4f-'))
  try {
    const changeDir = join(tmp, 'changes', 'c-s4')
    mkdirSync(changeDir, { recursive: true })
    writeFileSync(join(changeDir, 'design.md'), [
      '# 设计记录', '',
      '<!--AGENT:槽4 风险与死路作答 -->',
      '枚举开放世界是错误方向——开放分类归 agent。', '',
    ].join('\n'))
    const h = harvestSlot4Decision({ changeDir, change: 'c-s4' })
    assert.ok(!h.harvested, '收割已下线——恒 harvested:false')
    assert.ok(String(h.reason).includes('下线'), 'reason 含下线说明')
    assert.ok(!existsSync(join(changeDir, 'decisions.md')), 'decisions.md 不被创建')
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

test('③ 已有 decisions.md 时幂等跳过（不覆盖）', () => {
  const tmp = mkdtempSync(join(tmpdir(), 's4f3-'))
  try {
    const changeDir = join(tmp, 'changes', 'c-idem')
    mkdirSync(changeDir, { recursive: true })
    writeFileSync(join(changeDir, 'design.md'), '# 设计\n风险段内容\n')
    writeFileSync(join(changeDir, 'decisions.md'), '# 决策\n## D-001@v1 已有决策\n')
    const h = harvestSlot4Decision({ changeDir, change: 'c-idem' })
    assert.ok(!h.harvested, '已有 decisions.md → 不覆盖')
    assert.ok(String(h.reason).includes('已在场'), 'reason 含已在场')
  } finally { rmSync(tmp, { recursive: true, force: true }) }
})
