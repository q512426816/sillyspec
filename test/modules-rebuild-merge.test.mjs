/**
 * module-map 字段分离（P2-c，noai-ir-roadmap §5）：rebuild --force 改 merge 语义——
 * existing 全字段优先（人工维护的 tags/main_symbols/depends_on/used_by/status/needs_review
 * 等不再被清空，实例 map 文件头的「勿跑 rebuild --force」警告随之退役）；卡片补缺
 * （role/doc）；骨架默认垫底。锁定：手动字段逐项保留 + 新卡模块追加 + 默认补缺。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, readFileSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { rebuildModuleMap } from '../src/modules.js'
import { parseModuleMapSimple } from '../src/modules.js'

function makeFixture() {
  const cwd = mkdtempSync(join(tmpdir(), 'mm-merge-'))
  const modulesDir = join(cwd, '.sillyspec', 'docs', 'demo', 'modules')
  mkdirSync(modulesDir, { recursive: true })
  return { cwd, modulesDir }
}

const EXISTING_MAP = `schema_version: 2
generated_at: 2026-09-01 00:00:00

modules:
  core:
    status: needs-attention
    doc: modules/core.md
    needs_review: true
    review_reasons:
      - 人工标注待复核
    role: "手工写的职责描述"
    core_files:
      - src/core.js
    tags:
      - 手工标签
    main_symbols:
      - handWrittenApi
    depends_on:
      - runtime
    used_by:
      - api
    risk_level: high
`

test('rebuild --force merge：手动字段全量保留 + 新卡追加 + 卡片补缺 + 默认垫底', async () => {
  const { cwd, modulesDir } = makeFixture()
  try {
    writeFileSync(join(modulesDir, '_module-map.yaml'), EXISTING_MAP)
    // 新卡（map 里没有的模块）+ core 的卡（role 已有手工值，不应被卡片覆盖）
    writeFileSync(join(modulesDir, 'core.md'), [
      '---', 'schema_version: 1', 'doc_type: module-card', 'module_id: core', 'author: t', 'created_at: 2026-09-11 00:00:00', '---',
      '', '# 核心（core）', '', '## 定位', '', '卡片里的职责（应被手工值压住不覆盖）', '', '## 契约摘要', '', 'x',
    ].join('\n'))
    writeFileSync(join(modulesDir, 'fresh.md'), [
      '---', 'schema_version: 1', 'doc_type: module-card', 'module_id: fresh', 'author: t', 'created_at: 2026-09-11 00:00:00', '---',
      '', '# 新模块（fresh）', '', '## 定位', '', '新卡的职责（无 existing → 卡片补缺生效）',
    ].join('\n'))

    const r = await rebuildModuleMap(cwd, { force: true })
    assert.equal(r.dryRun, false, '--force 落盘')
    const after = parseModuleMapSimple(readFileSync(join(modulesDir, '_module-map.yaml'), 'utf8'))

    // 手动字段逐项保留（旧版会清空的正是这些）
    const core = after.core || {}
    assert.equal(core.status, 'needs-attention', 'status 保留')
    assert.equal(String(core.needs_review), 'true', 'needs_review 保留（解析侧标量为字符串）')
    assert.deepEqual(core.review_reasons, ['人工标注待复核'], 'review_reasons 保留')
    assert.equal(String(core.role).includes('手工写的职责描述'), true, `role 手工值优先（实得 ${core.role}）`)
    assert.deepEqual(core.tags, ['手工标签'], 'tags 保留')
    assert.deepEqual(core.main_symbols, ['handWrittenApi'], 'main_symbols 保留')
    assert.deepEqual(core.depends_on, ['runtime'], 'depends_on 保留')
    assert.deepEqual(core.used_by, ['api'], 'used_by 保留')
    assert.equal(core.risk_level, 'high', 'risk_level 保留')
    assert.deepEqual(core.core_files, ['src/core.js'], 'core_files 保留')
    assert.equal(core.doc, 'modules/core.md', 'doc 保留')

    // 新卡追加 + 卡片补缺
    assert.ok(after.fresh, '新卡模块追加')
    assert.ok(String(after.fresh.role || '').includes('新卡的职责'), 'fresh role 卡片补缺')
    assert.equal(after.fresh.status, 'active', 'fresh 默认垫底')
    assert.equal(after.fresh.doc, 'modules/fresh.md', 'fresh doc 指向卡片')

    // 二跑幂等（merge 后再 rebuild 不丢）
    await rebuildModuleMap(cwd, { force: true })
    const after2 = parseModuleMapSimple(readFileSync(join(modulesDir, '_module-map.yaml'), 'utf8'))
    assert.equal(after2.core.status, 'needs-attention', '二跑仍保留（幂等不丢）')
  } finally {
    try { rmSync(cwd, { recursive: true, force: true }) } catch {}
  }
})

test('默认仍 dry-run 预览不写（预览保护保留，措辞改 merge 语义）', async () => {
  const { cwd, modulesDir } = makeFixture()
  try {
    writeFileSync(join(modulesDir, '_module-map.yaml'), EXISTING_MAP)
    const before = readFileSync(join(modulesDir, '_module-map.yaml'), 'utf8')
    const r = await rebuildModuleMap(cwd, { force: false })
    assert.equal(r.dryRun, true, '默认 dry-run')
    assert.equal(readFileSync(join(modulesDir, '_module-map.yaml'), 'utf8'), before, '文件未被写')
  } finally {
    try { rmSync(cwd, { recursive: true, force: true }) } catch {}
  }
})
