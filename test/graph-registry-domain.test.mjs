/**
 * 图簇登记仓归属分流（2026-10-15-graph-registry-domain-split）
 *
 * 真图 2183 未挂模块文件节点实证 1220 为跨仓前缀、421 为本仓 test 面——_unmapped 大簇是
 * 「本 spec 树管理多仓、模块卡单仓」拓扑的伪信号。graphNodeDomain 增两级归属：
 *   ① 登记仓前缀（projects/*.yaml name: 字段，最长前缀、大小写不敏感）→ 登记仓名
 *   ② 本仓 test/tests/ 前缀 → _tests
 * 残余 _unmapped = module-map 覆盖真缺口（可行动信号，不消音）。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { buildKnowledgeGraph, graphSummary } from '../src/knowledge-graph.js'

function seedRepo() {
  const root = mkdtempSync(join(tmpdir(), 'kg-reg-'))
  const spec = join(root, '.sillyspec')
  mkdirSync(join(spec, 'knowledge', 'decisions'), { recursive: true })
  mkdirSync(join(spec, 'projects'), { recursive: true })
  writeFileSync(join(spec, 'knowledge', 'INDEX.md'), [
    '# Knowledge Index', '', '## Decisions',
    '- demo|decision|决策 → [decisions/demo.md](decisions/demo.md)', '',
  ].join('\n'))
  // 四类路径：登记仓名精确（frontend/）、登记名大小写异形（SillyHub 登记vs sillyhub/ 路径）、
  // 本仓测试面（test/）、真无归属（orphan/）
  writeFileSync(join(spec, 'knowledge', 'decisions', 'demo.md'), [
    '# 决策知识 — demo', '',
    '## D-001@v1 前端改卡片',
    '状态：implemented',
    '锚点：frontend/src/components/card.tsx', '',
    '## D-002@v1 hub 守护',
    '状态：implemented',
    '锚点：sillyhub-daemon/src/daemon.ts', '',
    '## D-003@v1 大小写异形仓路径',
    '状态：implemented',
    '锚点：sillyhub/backend/app/x.py', '',
    '## D-004@v1 测试面引用',
    '状态：implemented',
    '锚点：test/regression-foo.test.mjs', '',
    '## D-005@v1 真无归属',
    '状态：implemented',
    '锚点：orphan/deep/path.rs', '',
  ].join('\n'))
  writeFileSync(join(spec, 'projects', 'frontend.yaml'), 'name: frontend\npath: ../multi-agent-platform/frontend\nstatus: active\n')
  writeFileSync(join(spec, 'projects', 'sillyhub-daemon.yaml'), 'name: sillyhub-daemon\npath: ../multi-agent-platform/sillyhub-daemon\nstatus: active\n')
  writeFileSync(join(spec, 'projects', 'SillyHub.yaml'), 'name: SillyHub\npath: ../multi-agent-platform/sillyhub\nstatus: active\n')
  return root
}

test('登记仓前缀/大小写不敏感/_tests/真无归属 四态归簇', () => {
  const root = seedRepo()
  try {
    const g = buildKnowledgeGraph(join(root, '.sillyspec'))
    const s = graphSummary(g)
    const byKey = new Map(s.clusters.map((c) => [c.key, c.count]))
    assert.equal(byKey.get('file:frontend'), 1, '① 登记仓名精确归属 frontend')
    assert.equal(byKey.get('file:sillyhub-daemon'), 1, '① 登记仓名 sillyhub-daemon')
    assert.equal(byKey.get('file:SillyHub'), 1, '② 大小写不敏感（sillyhub/ 路径归 SillyHub 登记）')
    assert.equal(byKey.get('file:_tests'), 1, '③ 本仓测试面归 _tests')
    const unmapped = byKey.get('file:_unmapped') || 0
    assert.equal(unmapped, 1, '④ 真无归属残留 _unmapped（不消音——可行动信号）')
  } finally { rmSync(root, { recursive: true, force: true }) }
})

test('无 projects 目录 fail-soft：全落 _unmapped 行为不变', () => {
  const root = mkdtempSync(join(tmpdir(), 'kg-noreg-'))
  try {
    const spec = join(root, '.sillyspec')
    mkdirSync(join(spec, 'knowledge', 'decisions'), { recursive: true })
    writeFileSync(join(spec, 'knowledge', 'INDEX.md'), [
      '# Knowledge Index', '', '## Decisions',
      '- demo|decision|决策 → [decisions/demo.md](decisions/demo.md)', '',
    ].join('\n'))
    writeFileSync(join(spec, 'knowledge', 'decisions', 'demo.md'), [
      '# 决策知识 — demo', '',
      '## D-001@v1 无登记仓引用',
      '状态：implemented',
      '锚点：orphan/path.ts', '',
    ].join('\n'))
    const g = buildKnowledgeGraph(join(root, '.sillyspec'))
    const s = graphSummary(g)
    const byKey = new Map(s.clusters.map((c) => [c.key, c.count]))
    assert.equal(byKey.get('file:_unmapped'), 1, '无登记=原行为（_unmapped）')
  } finally { rmSync(root, { recursive: true, force: true }) }
})
