/**
 * patch 冻结面提交面过滤单测（2026-09-27-tool-debt-cleanup FR-05；
 * 2026-10-12-close-trace-freeze-integrity FR-01 口径同步）。
 *
 * 锁定 filterCommittedFace 行为：非 .sillyspec 全留 / .sillyspec/docs/ 交付文档保留
 * （模块卡漏出审计 patch 的评审 P2 修复）/ .sillyspec/changes/** 全滤除——含本变更目录
 * （工件随归档目录本体入库，patch 再冻是冗余且污染 totals，对齐 execute --done
 * 沉淀资产面投影）/ 反斜杠归一。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'

import { filterCommittedFace, isToolGovernancePath } from '../src/flow-parity.js'

const OWN = '.sillyspec/changes/2026-09-27-tool-debt-cleanup/'

test('非 .sillyspec 交付全留', () => {
  const r = filterCommittedFace(['src/flow.js', 'test/x.test.mjs', 'bin/sillyspec.js'], OWN)
  assert.deepEqual(r, ['src/flow.js', 'test/x.test.mjs', 'bin/sillyspec.js'])
})

test('本变更目录治理工件不入冻结面（FR-01：对齐 execute --done 沉淀资产面）', () => {
  const r = filterCommittedFace(
    [`${OWN}design.md`, '.sillyspec/changes/2026-09-27-other/design.md', '.sillyspec/QUICKLOG.md', `${OWN}flow-state.yaml`],
    OWN,
  )
  assert.deepEqual(r, [])
})

test('.sillyspec/docs/ 交付文档保留（模块卡不再漏出审计 patch）', () => {
  const r = filterCommittedFace(
    ['.sillyspec/docs/sillyspec/modules/setup.md', '.sillyspec/docs/sillyspec/modules/_module-map.yaml'],
    OWN,
  )
  assert.deepEqual(r, ['.sillyspec/docs/sillyspec/modules/setup.md', '.sillyspec/docs/sillyspec/modules/_module-map.yaml'])
})

test('knowledge 与他侧 docs 外的 .sillyspec 面仍滤除', () => {
  const r = filterCommittedFace(['.sillyspec/knowledge/fr/setup.md', '.sillyspec/.runtime/x.log'], OWN)
  assert.deepEqual(r, [])
})

test('反斜杠路径归一后同口径判定', () => {
  const r = filterCommittedFace(['.sillyspec\\docs\\sillyspec\\modules\\setup.md'], OWN)
  assert.deepEqual(r, ['.sillyspec/docs/sillyspec/modules/setup.md'])
})

// ── 工具治理模板剔除（2026-10-19-freeze-filter-tool-scaffold）──
// .claude/.codex/.gemini/.opencode/.zcode/.cursor 与 CLAUDE.md 不入冻结面；
// AGENTS.md / INSTRUCTIONS.md 是项目级指令，保留为交付面。
test('工具治理模板剔除，项目指令文件保留', () => {
  const r = filterCommittedFace([
    '.claude/skills/x/SKILL.md',
    '.claude/commands/sillyspec/flow.md',
    '.codex/skills/sillyspec-flow/SKILL.md',
    '.gemini/settings.json',
    '.opencode/config.json',
    '.zcode/skills/a/SKILL.md',
    '.cursor/rules.md',
    'CLAUDE.md',
    'AGENTS.md',
    'INSTRUCTIONS.md',
    'src/flow.js',
  ], OWN)
  assert.deepEqual(r, ['AGENTS.md', 'INSTRUCTIONS.md', 'src/flow.js'])
})

test('反斜杠工具模板同样剔除', () => {
  const r = filterCommittedFace(['.claude\\skills\\x\\SKILL.md', 'CLAUDE.md', 'src\\flow.js'], OWN)
  assert.deepEqual(r, ['src/flow.js'])
})

test('isToolGovernancePath 只认工具注入面（AGENTS.md 返回 false）', () => {
  assert.equal(isToolGovernancePath('.claude/x'), true)
  assert.equal(isToolGovernancePath('.codex/skills/y'), true)
  assert.equal(isToolGovernancePath('CLAUDE.md'), true)
  assert.equal(isToolGovernancePath('CLAUDE.md.bak'), false)
  assert.equal(isToolGovernancePath('AGENTS.md'), false)
  assert.equal(isToolGovernancePath('src/CLAUDE.md'), false)
})
