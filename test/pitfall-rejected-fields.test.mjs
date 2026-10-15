/**
 * 2026-10-15-pitfall-batch-clearance FR-09 — rejected 决策两字段前置到模板 + distill 补丁样例
 *
 * 坑 distill-rejected-field-late-hint（消费仓 archive step1 实证）：brainstorm 注入的决策模板
 * 九字段不含 否决理由/复潮条件——rejected 条目把否决理由写 answer 散文完全合规，到 distill
 * 才 needsWait；没留意直接 --confirm 则该条目静默不入库（防复潮通道漏一条）。
 * 锁死契约：注入模板与四件套模板骨架含两字段行（标注 status=rejected 时必填）；distill
 * needsWait 报错附可复制补丁样例。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { BRAINSTORM_ARTIFACT_TEMPLATES_MD } from '../src/stage-templates.js'
import { definition as brainstormDefinition } from '../src/stages/brainstorm.js'
import { executeArchiveDistill } from '../src/run/archive-distill.js'

const tmpRoots = []
function mk(p) { const d = mkdtempSync(join(tmpdir(), p)); tmpRoots.push(d); return d }
test.after(() => { for (const d of tmpRoots) { try { rmSync(d, { recursive: true, force: true }) } catch {} } })

test('FR-09：两处模板骨架含 否决理由/复潮条件 字段行（rejected 必填标注）', () => {
  for (const name of ['- 否决理由:', '- 复潮条件:']) {
    assert.ok(BRAINSTORM_ARTIFACT_TEMPLATES_MD.includes(name), `四件套模板骨架含 ${name} 字段行`)
  }
  assert.ok(BRAINSTORM_ARTIFACT_TEMPLATES_MD.includes('status=rejected 时必填'), '四件套模板带 rejected 必填标注')
  const steps = brainstormDefinition.steps || []
  const withFieldLines = steps.filter(s => String(s.prompt || '').includes('- 否决理由:') && String(s.prompt || '').includes('- 复潮条件:'))
  assert.ok(withFieldLines.length >= 1, `brainstorm 注入模板（对话式探索步等）骨架含两字段行（got ${withFieldLines.length} 步）`)
  assert.ok(String(withFieldLines[0].prompt).includes('status=rejected 时必填'), '注入模板带 rejected 必填标注')
})

test('FR-09：distill needsWait 报错附可复制补丁样例', async () => {
  const proj = mk('prf-')
  const specBase = join(proj, '.sillyspec')
  const changeName = 'prf-x'
  const changeDir = join(specBase, 'changes', changeName)
  mkdirSync(changeDir, { recursive: true })
  // rejected 条目：answer 散文写了否决理由但缺独立字段行（坑的原始形态）
  writeFileSync(join(changeDir, 'decisions.md'), [
    '---', 'author: t', 'created_at: 2026-10-15 00:00:00', '---', '',
    '# 决策记录（Decisions）', '',
    '## D-001@v1: 放弃方案B',
    '- type: architecture',
    '- priority: P1',
    '- status: rejected',
    '- source: user',
    '- question: 用方案B吗',
    '- answer: 不用，太重',
    '- normalized_requirement: 不引入方案B',
    '- impacts: []',
    '- evidence: 用户回答轮次1',
    '',
  ].join('\n'))
  const warns = []
  const origWarn = console.warn
  console.warn = (...a) => { warns.push(a.join(' ')) }
  try {
    await executeArchiveDistill({ cwd: proj, specBase, changeName })
  } finally {
    console.warn = origWarn
  }
  const text = warns.join('\n')
  assert.ok(text.includes('needsWait'), 'needsWait 提示在场')
  assert.ok(text.includes('- 否决理由:'), `报错附 否决理由 补丁样例行（got: ${text.slice(0, 400)}）`)
  assert.ok(text.includes('- 复潮条件:'), '报错附 复潮条件 补丁样例行')
})
