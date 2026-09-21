/**
 * docs-inject 遥测埋点（2026-09-21-scan-docs-ops-panel task-04，FR-06 / D-003@v1 Wave 0）
 *
 * 模块上下文注入（run/prompt.js buildModuleContextInjection）命中时经 knowledge-hits 底座
 * （appendKnowledgeHit）向 .runtime/knowledge-hits.jsonl 追加一行 type:docs-inject：
 *   - 命中（≥1 模块、注入段渲染）：末行 type=docs-inject、change/query 透传、
 *     matchedFiles=命中模块 doc 字段原值数组（modules/<x>.md）、at 缺省自动补 ISO
 *   - 未命中（零模块、text 空）：不新增遥测行
 *   - 遥测写失败（.runtime 为同名普通文件 → mkdirSync 抛）：fail-soft，注入段照常返回
 *
 * fixture：临时 spec 目录 _module-map.yaml（2 模块）+ 模块文档（quick-step1-injection.test.mjs
 * 同款）。execute.js 无模块上下文孪生（仅有 knowledge-inject 孪生 buildWaveKnowledgeSection）
 * ——本埋点单点落 prompt.js，无孪生同步面。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

import { loadModuleContextIndex, buildModuleContextInjection } from '../src/run/prompt.js'

/** 造临时 spec 树：<tmp>/.sillyspec/docs/proj/modules/{_module-map.yaml, core.md, api.md} + .runtime */
function makeFixture() {
  const tmp = mkdtempSync(join(tmpdir(), 'docs-inject-'))
  const specBase = join(tmp, '.sillyspec')
  const modulesDir = join(specBase, 'docs', 'proj', 'modules')
  mkdirSync(modulesDir, { recursive: true })
  mkdirSync(join(specBase, '.runtime'), { recursive: true })
  writeFileSync(join(modulesDir, '_module-map.yaml'),
    'schema_version: 2\n' +
    'modules:\n' +
    '  core:\n' +
    '    status: active\n' +
    '    doc: modules/core.md\n' +
    '    paths: [src/core.js]\n' +
    '  api:\n' +
    '    status: active\n' +
    '    doc: modules/api.md\n' +
    '    paths: [src/api.js]\n', 'utf8')
  writeFileSync(join(modulesDir, 'core.md'), '# core 模块卡\n\n核心服务约定。\n', 'utf8')
  writeFileSync(join(modulesDir, 'api.md'), '# api 模块卡\n\n接口网关约定。\n', 'utf8')
  return { tmp, specBase, runtimeDir: join(specBase, '.runtime') }
}

function cleanup({ tmp }) {
  try { rmSync(tmp, { recursive: true, force: true }) } catch { /* Windows 句柄迟滞容忍 */ }
}

/** 读 hits.jsonl 末行 JSON（文件缺失 → null） */
function readLastHit(runtimeDir) {
  const file = join(runtimeDir, 'knowledge-hits.jsonl')
  if (!existsSync(file)) return null
  const lines = readFileSync(file, 'utf8').replace(/\r\n?/g, '\n').trimEnd().split('\n')
  return lines.length > 0 ? JSON.parse(lines[lines.length - 1]) : null
}

test('命中：末行 type=docs-inject，matchedFiles=2 个模块 doc 路径，行体四字段齐全', () => {
  const fx = makeFixture()
  try {
    const idx = loadModuleContextIndex(fx.specBase, 'proj')
    const query = '重构 core 并扩展 api 网关'
    const r = buildModuleContextInjection(query, idx, fx.specBase, 'proj', { change: '2026-09-21-di-test' })
    assert.ok(r.text.includes('### 📦 模块上下文'), '注入段已渲染（命中 2 模块）')
    const rec = readLastHit(fx.runtimeDir)
    assert.equal(rec.type, 'docs-inject', 'type 固定 docs-inject')
    assert.equal(rec.change, '2026-09-21-di-test', 'change=变更名透传')
    assert.equal(rec.query, query, 'query=匹配查询串（taskDescription 原文）')
    assert.deepEqual([...rec.matchedFiles].sort(), ['modules/api.md', 'modules/core.md'],
      'matchedFiles=注入命中的模块文档路径（doc 字段原值，2 个）')
    assert.ok(typeof rec.at === 'string' && Number.isFinite(Date.parse(rec.at)), 'at 缺省自动补 ISO')
    // 无 opts.change（既有调用方形态）：change 落空串，遥测照常工作
    buildModuleContextInjection(query, idx, fx.specBase, 'proj')
    const rec2 = readLastHit(fx.runtimeDir)
    assert.equal(rec2.type, 'docs-inject', '无 opts 调用仍落 docs-inject 行')
    assert.equal(rec2.change, '', 'change 取不到给空串')
  } finally { cleanup(fx) }
})

test('未命中：零模块不落遥测行', () => {
  const fx = makeFixture()
  try {
    const idx = loadModuleContextIndex(fx.specBase, 'proj')
    const r = buildModuleContextInjection('纯文案微调与样式调整', idx, fx.specBase, 'proj', { change: '2026-09-21-di-miss' })
    assert.equal(r.text, '', '未命中 text 空（零字节）')
    assert.deepEqual(r.frModules, [], 'frModules 空')
    assert.ok(!existsSync(join(fx.runtimeDir, 'knowledge-hits.jsonl')), '未命中不新增遥测行')
  } finally { cleanup(fx) }
})

test('遥测写失败：fail-soft，注入段照常返回', () => {
  const fx = makeFixture()
  try {
    // 坏 .runtime：同名普通文件占位 → appendKnowledgeHit 内 mkdirSync 抛（跨平台坏路径，无需 chmod）
    rmSync(fx.runtimeDir, { recursive: true, force: true })
    writeFileSync(fx.runtimeDir, 'not a directory', 'utf8')
    const idx = loadModuleContextIndex(fx.specBase, 'proj')
    const r = buildModuleContextInjection('重构 core 并扩展 api 网关', idx, fx.specBase, 'proj', { change: '2026-09-21-di-bad' })
    assert.ok(r.text.includes('### 📦 模块上下文'), '遥测写失败不影响注入本体（fail-soft）')
    assert.ok(r.text.includes('modules/core.md') && r.text.includes('modules/api.md'), '注入正文照常含模块文档行')
  } finally { cleanup(fx) }
})
