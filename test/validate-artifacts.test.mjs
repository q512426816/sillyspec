/**
 * validate 总命令（P2-d，noai-ir-roadmap §5）：聚合既有校验器 + 轻形状检查。
 * 锁定：全绿 fixture 全 pass；坏 facts / 坏 required-evidence / 坏 module-map 各自 fail 且
 * exit 语义正确（ok=false）；未生成产物 skip 不算失败。
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { validateChangeArtifacts, renderValidateReport } from '../src/validate-artifacts.js'

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'va-'))
  const specBase = join(root, '.sillyspec')
  const changeDir = join(specBase, 'changes', 'c1')
  mkdirSync(changeDir, { recursive: true })
  return { root, specBase, changeDir }
}

test('全绿：合法 facts + required-evidence → pass；未生成产物 skip；ok=true', async () => {
  const { root, specBase, changeDir } = fixture()
  try {
    writeFileSync(join(changeDir, 'verify-facts.json'), JSON.stringify({ schemaVersion: 2, change: 'c1', probes: {}, conclusion: 'PASS' }))
    writeFileSync(join(changeDir, 'verify-required-evidence.json'), JSON.stringify({ items: [{ task: 'task-01', verdict: 'cannot_verify', evidence: ['x.js'] }] }))
    const r = await validateChangeArtifacts({ cwd: root, specBase, changeName: 'c1' })
    const byArtifact = Object.fromEntries(r.checks.map((c) => [c.artifact.split('（')[0], c]))
    assert.equal(byArtifact['verify-facts.json'].status, 'pass')
    assert.equal(byArtifact['verify-required-evidence.json'].status, 'pass')
    assert.equal(byArtifact['task reviews'].status, 'skip', '无 marker → skip')
    assert.equal(byArtifact['stage reviews'].status, 'skip')
    assert.equal(byArtifact.endpoints.status, 'skip')
    assert.equal(byArtifact['module-map'].status, 'skip')
    assert.equal(r.ok, true, 'skip 不算失败')
    assert.ok(renderValidateReport(r).includes('✅'))
  } finally { try { rmSync(root, { recursive: true, force: true }) } catch {} }
})

test('坏产物各就各位：坏 facts schemaVersion / required-evidence 顶层缺 items / module-map 版本旧', async () => {
  const { root, specBase, changeDir } = fixture()
  try {
    writeFileSync(join(changeDir, 'verify-facts.json'), JSON.stringify({ schemaVersion: 99 }))
    writeFileSync(join(changeDir, 'verify-required-evidence.json'), JSON.stringify({ nope: true }))
    const mapDir = join(specBase, 'docs', 'p1', 'modules')
    mkdirSync(mapDir, { recursive: true })
    writeFileSync(join(mapDir, '_module-map.yaml'), 'schema_version: 1\n\nmodules:\n  a:\n    status: active\n')
    const r = await validateChangeArtifacts({ cwd: root, specBase, changeName: 'c1' })
    const byArtifact = Object.fromEntries(r.checks.map((c) => [c.artifact.split('（')[0], c]))
    assert.equal(byArtifact['verify-facts.json'].status, 'fail')
    assert.ok((byArtifact['verify-facts.json'].issues || []).some((i) => i.includes('schemaVersion')), 'facts 报 schemaVersion 问题')
    assert.equal(byArtifact['verify-required-evidence.json'].status, 'fail')
    assert.ok((byArtifact['verify-required-evidence.json'].issues || []).some((i) => i.includes('items')))
    assert.equal(byArtifact['module-map'].status, 'fail')
    assert.ok((byArtifact['module-map'].issues || []).some((i) => i.includes('schema_version')), 'map 报版本问题')
    assert.equal(r.ok, false)
    assert.ok(renderValidateReport(r).includes('❌'))
  } finally { try { rmSync(root, { recursive: true, force: true }) } catch {} }
})

test('task review 在场：marker + 合法 review pass；坏 review fail', async () => {
  const { root, specBase, changeDir } = fixture()
  try {
    const rt = join(specBase, '.runtime')
    mkdirSync(join(rt, 'execute-runs', 'exec-2026-09-11-000000-x1', 'tasks', 'task-01'), { recursive: true })
    writeFileSync(join(rt, 'current-execute-run-id-c1'), 'exec-2026-09-11-000000-x1\n')
    writeFileSync(join(rt, 'execute-runs', 'exec-2026-09-11-000000-x1', 'tasks', 'task-01', 'review.json'),
      JSON.stringify({ schemaVersion: 1, task: 'task-01', base: 'aaa', head: 'bbb', changedFiles: [], specVerdict: 'pass', qualityVerdict: 'pass' }))
    let r = await validateChangeArtifacts({ cwd: root, specBase, changeName: 'c1' })
    const tr = r.checks.find((c) => c.artifact.startsWith('task reviews'))
    assert.equal(tr.status, 'pass', `合法 review pass（${(tr.issues || []).join(';')}）`)
    writeFileSync(join(rt, 'execute-runs', 'exec-2026-09-11-000000-x1', 'tasks', 'task-01', 'review.json'), JSON.stringify({ schemaVersion: 9 }))
    r = await validateChangeArtifacts({ cwd: root, specBase, changeName: 'c1' })
    const tr2 = r.checks.find((c) => c.artifact.startsWith('task reviews'))
    assert.equal(tr2.status, 'fail')
  } finally { try { rmSync(root, { recursive: true, force: true }) } catch {} }
})
