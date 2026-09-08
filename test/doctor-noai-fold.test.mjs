/**
 * doctor 折叠（2026-09-09-doctor-noai task-01）：三 detector + renderDoctorSummary。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { execSync } from 'child_process'
import { detectWorktreeHealth, detectBuildEnv, detectMcpEndpoints, renderDoctorSummary } from '../src/doctor-diagnostics.js'

test('detectBuildEnv：engines 不匹配 → warning；匹配/无 pkg → 通过/skipped', () => {
  const d1 = mkdtempSync(join(tmpdir(), 'be-'))
  try {
    writeFileSync(join(d1, 'package.json'), JSON.stringify({ engines: { node: '^50.0.0' } }))
    const r1 = detectBuildEnv(d1)
    assert.equal(r1.pass, false, '高版本要求不满足 → fail 维度')
    assert.ok(r1.findings.some(f => f.includes('不满足')))
    writeFileSync(join(d1, 'package.json'), JSON.stringify({ engines: { node: '>=18' } }))
    assert.equal(detectBuildEnv(d1).pass, true, '宽松要求满足')
  } finally { rmSync(d1, { recursive: true, force: true }) }
  const d2 = mkdtempSync(join(tmpdir(), 'be2-'))
  try {
    const r2 = detectBuildEnv(d2)
    assert.equal(r2.skipped, true, '无 package.json → skipped 带内降级')
    assert.equal(r2.pass, true)
  } finally { rmSync(d2, { recursive: true, force: true }) }
})

test('detectMcpEndpoints：无配置 → skipped；有 context7 → 已配置', () => {
  const d = mkdtempSync(join(tmpdir(), 'mcp-'))
  try {
    assert.equal(detectMcpEndpoints(d).skipped, true)
    writeFileSync(join(d, '.mcp.json'), JSON.stringify({ mcpServers: { context7: { url: 'x' } } }))
    const r = detectMcpEndpoints(d)
    assert.equal(r.skipped, undefined)
    assert.ok(r.findings.some(f => f.includes('context7')))
  } finally { rmSync(d, { recursive: true, force: true }) }
})

test('detectWorktreeHealth：残留 sillyspec/* 分支 → findings 点名', () => {
  const d = mkdtempSync(join(tmpdir(), 'wt-'))
  try {
    execSync('git init -q', { cwd: d })
    execSync('git config user.email t@t && git config user.name t', { cwd: d })
    execSync('git checkout -q -b sillyspec/dead-change', { cwd: d })
    execSync('git commit -q --allow-empty -m x', { cwd: d })
    const r = detectWorktreeHealth(d)
    assert.equal(r.pass, false)
    assert.ok(r.findings.some(f => f.includes('dead-change')), `点名残留分支（实际：${r.findings.join('|')}）`)
  } finally { rmSync(d, { recursive: true, force: true }) }
})

test('renderDoctorSummary：逐维图标行 + findings 首行', () => {
  const out = renderDoctorSummary({ dimensions: [
    { name: 'a', label: '维度A', pass: true, severity: null, findings: ['ok'] },
    { name: 'b', label: '维度B', pass: false, severity: 'warning', findings: ['w1', 'w2'], safe_actions: [{ action: 'fix', next_step: 'run x' }] },
  ]})
  assert.ok(out.includes('✅ 维度A') && out.includes('⚠️ 维度B'))
  assert.ok(out.includes('· w1'))
  assert.ok(out.includes('🔧 fix：run x'))
})

// ══ task-02/03：折叠结构与渲染契约 ══
import { definition as doctorDef } from '../src/stages/doctor.js'
import { READONLY_AUXILIARY_STAGES } from '../src/constants.js'

test('doctor 阶段折叠：3 步 + step1 noAI doctorRunDiagnostics + bash 教学退场', () => {
  assert.equal(doctorDef.steps.length, 3, `3 步（实际 ${doctorDef.steps.length}）`)
  const s1 = doctorDef.steps[0]
  assert.equal(s1.noAI, true)
  assert.equal(s1._cliAction, 'doctorRunDiagnostics')
  const allPrompt = doctorDef.steps.map(x => x.prompt || '').join('\n')
  assert.ok(!allPrompt.includes('for d in'), 'bash for 循环教学退场')
  assert.ok(!allPrompt.includes('--input-type=module'), 'node 内联探测教学退场')
})

test('doctor 移出 READONLY_AUXILIARY_STAGES（阶段形态可达状态机）', () => {
  assert.ok(!READONLY_AUXILIARY_STAGES.includes('doctor'))
})

test('renderDoctorSummary 契约：三新维度并入渲染', () => {
  const out = renderDoctorSummary({ dimensions: [
    detectBuildEnv(process.cwd()), detectMcpEndpoints(process.cwd()), detectWorktreeHealth(process.cwd()),
  ]})
  assert.ok(out.includes('构建环境') && out.includes('MCP 端点配置'))
})
