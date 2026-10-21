/**
 * doctor-local-yaml（2026-10-21-p0-p1-hardening FR-07）
 *
 * dsh z2 实证：agent 手改 local.yaml 写成 mojibake，doctor 对坏文件零提示（等用户人工
 * 恢复 2h13m）。锁死契约（detectLocalYamlIntegrity 只读维度）：
 *   D1 无文件 → 零 finding（本地模式合法态）
 *   D2 好文件 → 零 finding
 *   D3 坏 YAML → local_yaml_unparsable finding + restore safe_action
 *   D4 含 BOM → local_yaml_bom finding
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { detectLocalYamlIntegrity } from '../src/doctor-diagnostics.js'

const roots = []
function mk(p) { const d = mkdtempSync(join(tmpdir(), p)); roots.push(d); return d }
test.after(() => { for (const d of roots) { try { rmSync(d, { recursive: true, force: true }) } catch {} } })

function withLocalYaml(content) {
  const d = mk('dly-')
  mkdirSync(join(d, '.sillyspec'), { recursive: true })
  writeFileSync(join(d, '.sillyspec', 'local.yaml'), content)
  return d
}

test('D1 无 local.yaml → 零 finding（合法态）', () => {
  const d = mk('dly-none-')
  mkdirSync(join(d, '.sillyspec'), { recursive: true })
  const dim = detectLocalYamlIntegrity(d)
  assert.equal(dim.name, 'local_yaml_integrity')
  assert.deepEqual(dim.findings, [])
})

test('D2 好文件 → 零 finding', () => {
  const d = withLocalYaml('# 配置\ncommands:\n  lint: npm run lint\n')
  const dim = detectLocalYamlIntegrity(d)
  assert.deepEqual(dim.findings, [], `好文件零 finding：${dim.findings}`)
})

test('D3 坏 YAML → unparsable finding + restore safe_action（含 known-failures 指引）', () => {
  const d = withLocalYaml('platform:\n  url: [unclosed\n??? mojibake ??\n')
  const dim = detectLocalYamlIntegrity(d)
  assert.equal(dim.findings.length, 1)
  assert.match(dim.findings[0], /local_yaml_unparsable/)
  assert.match(dim.findings[0], /known-failures/, '给 known-failures 管理指引')
  assert.ok(dim.safe_actions.some((a) => a.action === 'restore_local_yaml' && a.next_step.includes('恢复')), 'safe_action 给恢复下一步')
})

test('D4 含 BOM → bom finding（坏 YAML 同时在场则两条都报）', () => {
  const d = withLocalYaml('﻿commands:\n  lint: x\n')
  const dim = detectLocalYamlIntegrity(d)
  assert.equal(dim.findings.length, 1)
  assert.match(dim.findings[0], /local_yaml_bom/)
  const both = withLocalYaml('﻿bad: [unclosed\n')
  const dim2 = detectLocalYamlIntegrity(both)
  assert.equal(dim2.findings.length, 2, `BOM + 解析失败并报：${dim2.findings.map((f) => f.slice(0, 30))}`)
})
